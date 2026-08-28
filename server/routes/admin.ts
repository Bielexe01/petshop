import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { requireScreen, requireAdmin, requireSuperAdmin, audit, hashPassword, SCREENS, SEEDED_ROLE_NAMES } from '../auth.ts'
import { adminCreateSchema } from '../lib/validation.ts'

export const adminRouter = Router()

adminRouter.use(requireAdmin)

/* ── Overview do dashboard ────────────────────────────────────────────── */

adminRouter.get('/overview', requireScreen('dashboard'), async (_req, res) => {
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

adminRouter.get('/users', requireSuperAdmin, async (_req, res) => {
  res.json({
    users: await getAll<Record<string, unknown>>(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.role_id, r.name AS role_name
       FROM admin_users u LEFT JOIN admin_roles r ON r.id = u.role_id
       ORDER BY u.created_at`,
    ),
  })
})

/** Valida que o papel existe e está ativo; retorna null se inválido. */
async function resolveRoleId(roleId: unknown): Promise<number | null> {
  if (roleId === undefined || roleId === null || roleId === '') return null
  const id = Number(roleId)
  if (!Number.isInteger(id) || id <= 0) return null
  const role = await getOne<{ id: number }>('SELECT id FROM admin_roles WHERE id = $1 AND is_active = true', [id])
  return role ? id : null
}

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
  const roleId = await resolveRoleId(d.roleId)
  const { lastInsertRowid } = await run(
    'INSERT INTO admin_users (name, email, password_hash, role, role_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [d.name, d.email, hashPassword(d.password), d.role, roleId],
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
  const roleId = await resolveRoleId(req.body.roleId)
  await run(
    `UPDATE admin_users SET name = $1, role = $2, is_active = $3, role_id = $4, updated_at = now() WHERE id = $5`,
    [name, role, isActive, roleId, id],
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

/* ── Papéis (RBAC por tela) ───────────────────────────────────────────── */

/** Valida e normaliza a lista de telas de um papel (filtra keys inválidas). */
function normalizeScreens(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((s): s is string => (SCREENS as readonly string[]).includes(String(s))).map(String))]
}

/** Converte o JSONB `screens` de uma linha para array. */
function screensOf(row: Record<string, unknown>): string[] {
  if (Array.isArray(row.screens)) return row.screens as string[]
  try {
    return JSON.parse(String(row.screens ?? '[]'))
  } catch {
    return []
  }
}

adminRouter.get('/roles', requireSuperAdmin, async (_req, res) => {
  const roles = await getAll<Record<string, unknown>>(
    `SELECT r.id, r.name, r.description, r.screens, r.is_active, r.created_at,
            (SELECT COUNT(*) FROM admin_users u WHERE u.role_id = r.id) AS members_count
     FROM admin_roles r ORDER BY r.created_at`,
  )
  res.json({ roles: roles.map((r) => ({ ...r, screens: screensOf(r) })) })
})

adminRouter.post('/roles', requireSuperAdmin, async (req, res) => {
  const name = String(req.body.name ?? '').trim().slice(0, 80)
  const description = String(req.body.description ?? '').trim().slice(0, 300)
  const screens = normalizeScreens(req.body.screens)
  if (!name) {
    res.status(400).json({ message: 'Informe o nome do papel.' })
    return
  }
  const existing = await getOne<{ id: number }>('SELECT id FROM admin_roles WHERE name = $1', [name])
  if (existing) {
    res.status(409).json({ message: 'Já existe um papel com esse nome.' })
    return
  }
  const { lastInsertRowid } = await run(
    'INSERT INTO admin_roles (name, description, screens) VALUES ($1, $2, $3::jsonb) RETURNING id',
    [name, description, JSON.stringify(screens)],
  )
  await audit(req.sessionUser!.id, 'criar_papel', 'admin_role', lastInsertRowid, name)
  res.status(201).json({ role: { id: lastInsertRowid } })
})

adminRouter.put('/roles/:id', requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const name = String(req.body.name ?? '').trim().slice(0, 80)
  const description = String(req.body.description ?? '').trim().slice(0, 300)
  const screens = normalizeScreens(req.body.screens)
  const isActive = req.body.isActive !== false
  if (!name) {
    res.status(400).json({ message: 'Informe o nome do papel.' })
    return
  }
  const existing = await getOne<{ id: number }>('SELECT id FROM admin_roles WHERE name = $1 AND id <> $2', [name, id])
  if (existing) {
    res.status(409).json({ message: 'Já existe um papel com esse nome.' })
    return
  }
  await run(
    'UPDATE admin_roles SET name = $1, description = $2, screens = $3::jsonb, is_active = $4, updated_at = now() WHERE id = $5',
    [name, description, JSON.stringify(screens), isActive, id],
  )
  await audit(req.sessionUser!.id, 'editar_papel', 'admin_role', id, name)
  res.json({ ok: true })
})

adminRouter.delete('/roles/:id', requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const role = await getOne<{ name: string }>('SELECT name FROM admin_roles WHERE id = $1', [id])
  if (!role) {
    res.status(404).json({ message: 'Papel não encontrado.' })
    return
  }
  // Papéis pré-criados são a base do sistema — não podem ser removidos.
  if (SEEDED_ROLE_NAMES.includes(role.name as (typeof SEEDED_ROLE_NAMES)[number])) {
    res.status(400).json({ message: 'Este papel de exemplo não pode ser removido.' })
    return
  }
  // Remove o papel; os admin_users com role_id ficam sem papel (role_id = null).
  await run('DELETE FROM admin_roles WHERE id = $1', [id])
  await audit(req.sessionUser!.id, 'remover_papel', 'admin_role', id, role.name)
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
