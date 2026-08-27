import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { requireAdmin, requireSuperAdmin, audit, hashPassword } from '../auth.ts'
import { adminCreateSchema } from '../lib/validation.ts'

export const adminRouter = Router()

adminRouter.use(requireAdmin)

/* ── Overview do dashboard ────────────────────────────────────────────── */

adminRouter.get('/overview', async (_req, res) => {
  const clients = (await getOne<{ n: number }>('SELECT COUNT(*) AS n FROM users'))?.n ?? 0
  const pets = (await getOne<{ n: number }>('SELECT COUNT(*) AS n FROM pets'))?.n ?? 0
  const appointments = (await getOne<{ n: number }>('SELECT COUNT(*) AS n FROM appointments'))?.n ?? 0
  const upcoming = await getAll<Record<string, unknown>>(
    `SELECT a.*, p.name AS pet_name, pr.full_name AS client_name
     FROM appointments a
     JOIN pets p ON p.id = a.pet_id
     LEFT JOIN profiles pr ON pr.user_id = a.client_id
     WHERE a.status = 'agendada' AND a.scheduled_at IS NOT NULL
     ORDER BY a.scheduled_at ASC LIMIT 5`,
  )
  const documents = (await getOne<{ n: number }>('SELECT COUNT(*) AS n FROM documents'))?.n ?? 0
  const recentClients = await getAll<Record<string, unknown>>(
    `SELECT u.id, u.email, u.created_at, p.full_name
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     ORDER BY u.created_at DESC LIMIT 5`,
  )
  const recentAudit = await getAll<Record<string, unknown>>(
    `SELECT a.*, ad.name AS admin_name
     FROM auth_logs a LEFT JOIN admin_users ad ON ad.id = a.admin_user_id
     ORDER BY a.created_at DESC LIMIT 8`,
  )
  res.json({ overview: { clients, pets, appointments, documents, upcoming, recentClients, recentAudit } })
})

/* ── Usuários admin ───────────────────────────────────────────────────── */

adminRouter.get('/users', async (_req, res) => {
  res.json({ users: await getAll<Record<string, unknown>>('SELECT id, name, email, role, is_active, created_at FROM admin_users ORDER BY created_at') })
})

adminRouter.post('/users', requireSuperAdmin, async (req, res) => {
  const parsed = adminCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  const existing = await getOne<{ id: number }>('SELECT id FROM admin_users WHERE email = $1', [d.email])
  if (existing) {
    res.status(409).json({ message: 'E-mail já cadastrado.' })
    return
  }
  const { lastInsertRowid } = await run(
    'INSERT INTO admin_users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
    [d.name, d.email, hashPassword(d.password), d.role],
  )
  await audit(req.sessionUser!.id, 'criar_admin', 'admin_user', lastInsertRowid, d.name)
  res.status(201).json({ user: { id: lastInsertRowid } })
})

adminRouter.put('/users/:id', requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.sessionUser!.id) {
    res.status(400).json({ message: 'Você não pode editar sua própria conta aqui.' })
    return
  }
  const name = String(req.body.name ?? '').trim().slice(0, 120)
  const role = String(req.body.role ?? 'admin')
  const isActive = req.body.isActive !== false
  if (!name || !['admin', 'superadmin'].includes(role)) {
    res.status(400).json({ message: 'Dados inválidos.' })
    return
  }
  await run(
    `UPDATE admin_users SET name = $1, role = $2, is_active = $3, updated_at = now() WHERE id = $4`,
    [name, role, isActive, id],
  )
  await audit(req.sessionUser!.id, 'editar_admin', 'admin_user', id, name)
  res.json({ ok: true })
})

adminRouter.delete('/users/:id', requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id)
  if (id === req.sessionUser!.id) {
    res.status(400).json({ message: 'Você não pode remover sua própria conta.' })
    return
  }
  await run('DELETE FROM admin_users WHERE id = $1', [id])
  await audit(req.sessionUser!.id, 'remover_admin', 'admin_user', id)
  res.json({ ok: true })
})

/* ── Sessões ativas (administração) ───────────────────────────────────── */

adminRouter.get('/sessions', async (_req, res) => {
  res.json({
    sessions: await getAll<Record<string, unknown>>(
      `SELECT s.id, s.user_role, s.created_at, s.expires_at, s.user_id, u.email, a.email AS admin_email
       FROM sessions s
       LEFT JOIN users u ON u.id = s.user_id AND s.user_role = 'client'
       LEFT JOIN admin_users a ON a.id = s.user_id AND s.user_role = 'admin'
       ORDER BY s.created_at DESC LIMIT 50`,
    ),
  })
})
