import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'

export const notificationsRouter = Router()

notificationsRouter.get('/mine', requireClient, (req, res) => {
  const notifications = getAll(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 60',
    [req.sessionUser!.id],
  )
  const unread = getOne<{ n: number }>('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', [
    req.sessionUser!.id,
  ])?.n ?? 0
  res.json({ notifications, unread })
})

notificationsRouter.post('/:id/read', requireClient, (req, res) => {
  const id = Number(req.params.id)
  run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [id, req.sessionUser!.id])
  res.json({ ok: true })
})

notificationsRouter.post('/read-all', requireClient, (req, res) => {
  run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.sessionUser!.id])
  res.json({ ok: true })
})

/* Admin: cria notificação para um cliente */
notificationsRouter.post('/', requireAdmin, (req, res) => {
  const userId = Number(req.body.userId)
  const title = String(req.body.title ?? '').trim().slice(0, 120)
  const body = String(req.body.body ?? '').slice(0, 2000)
  const type = String(req.body.type ?? 'info').slice(0, 30)
  if (!userId || !title) {
    res.status(400).json({ message: 'Informe o cliente e o título.' })
    return
  }
  const { lastInsertRowid } = run(
    'INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)',
    [userId, title, body || null, type],
  )
  audit(req.sessionUser!.id, 'criar_notificacao', 'notification', Number(lastInsertRowid), title)
  res.status(201).json({ notification: { id: Number(lastInsertRowid) } })
})
