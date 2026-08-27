import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'

export const notificationsRouter = Router()

notificationsRouter.get('/mine', requireClient, async (req, res) => {
  const notifications = await getAll(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 60',
    [req.sessionUser!.id],
  )
  const unread = (await getOne<{ n: number }>('SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND is_read = false', [
    req.sessionUser!.id,
  ]))?.n ?? 0
  res.json({ notifications, unread })
})

notificationsRouter.post('/:id/read', requireClient, async (req, res) => {
  const id = Number(req.params.id)
  await run('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [id, req.sessionUser!.id])
  res.json({ ok: true })
})

notificationsRouter.post('/read-all', requireClient, async (req, res) => {
  await run('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.sessionUser!.id])
  res.json({ ok: true })
})

/* Admin: cria notificação para um cliente */
notificationsRouter.post('/', requireAdmin, async (req, res) => {
  const userId = Number(req.body.userId)
  const title = String(req.body.title ?? '').trim().slice(0, 120)
  const body = String(req.body.body ?? '').slice(0, 2000)
  const type = String(req.body.type ?? 'info').slice(0, 30)
  if (!userId || !title) {
    res.status(400).json({ message: 'Informe o cliente e o título.' })
    return
  }
  const { lastInsertRowid } = await run(
    'INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4) RETURNING id',
    [userId, title, body || null, type],
  )
  await audit(req.sessionUser!.id, 'criar_notificacao', 'notification', lastInsertRowid, title)
  res.status(201).json({ notification: { id: lastInsertRowid } })
})
