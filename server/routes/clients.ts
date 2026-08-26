import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { requireAdmin, requireClient, audit, hashPassword } from '../auth.ts'
import { clientCreateSchema, clientUpdateSchema } from '../lib/validation.ts'

export const clientsRouter = Router()

/* ── Cliente: meus dados ──────────────────────────────────────────────── */

clientsRouter.get('/me', requireClient, (req, res) => {
  const profile = getOne<Record<string, unknown>>(
    `SELECT p.full_name, p.cpf, p.phone, p.birth_date, p.address, p.avatar_url, u.email, u.created_at
     FROM profiles p JOIN users u ON u.id = p.user_id
     WHERE p.user_id = ?`,
    [req.sessionUser!.id],
  )
  res.json({ profile })
})

/* ── Admin: CRUD de clientes ──────────────────────────────────────────── */

clientsRouter.get('/', requireAdmin, (req, res) => {
  const { search } = req.query
  let sql = `SELECT u.id, u.email, u.is_active, u.created_at, p.full_name, p.cpf, p.phone,
                    (SELECT COUNT(*) FROM pets pt WHERE pt.owner_id = u.id) AS pets_count
             FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id`
  const params: Array<string | number | bigint | null | Uint8Array> = []
  if (search && String(search).trim()) {
    sql += ` WHERE u.email LIKE ? OR p.full_name LIKE ? OR p.cpf LIKE ?`
    const like = `%${String(search).trim()}%`
    params.push(like, like, like)
  }
  sql += ` ORDER BY u.created_at DESC LIMIT 300`
  res.json({ clients: getAll(sql, params) })
})

clientsRouter.get('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const client = getOne<Record<string, unknown>>(
    `SELECT u.id, u.email, u.is_active, u.created_at, p.full_name, p.cpf, p.phone, p.birth_date, p.address
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ?`,
    [id],
  )
  if (!client) {
    res.status(404).json({ message: 'Cliente não encontrado.' })
    return
  }
  const pets = getAll('SELECT * FROM pets WHERE owner_id = ? ORDER BY created_at DESC', [id])
  res.json({ client, pets })
})

clientsRouter.post('/', requireAdmin, (req, res) => {
  const parsed = clientCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data

  const existing = getOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [d.email])
  if (existing) {
    res.status(409).json({ message: 'E-mail já cadastrado.' })
    return
  }

  const passwordHash = d.password ? hashPassword(d.password) : hashPassword(`${d.email}:temporaria`)
  const { lastInsertRowid } = run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [d.email, passwordHash])
  run('INSERT INTO profiles (user_id, full_name, cpf, phone) VALUES (?, ?, ?, ?)', [lastInsertRowid, d.fullName, d.cpf ?? null, d.phone ?? null])
  audit(req.sessionUser!.id, 'criar_cliente', 'user', Number(lastInsertRowid), d.fullName)
  res.status(201).json({ client: { id: Number(lastInsertRowid) } })
})

clientsRouter.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const parsed = clientUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  if (d.isActive !== undefined) {
    run('UPDATE users SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?', [d.isActive ? 1 : 0, id])
  }
  run(
    `UPDATE profiles SET full_name = COALESCE(?, full_name), cpf = COALESCE(?, cpf), phone = COALESCE(?, phone), updated_at = datetime('now')
     WHERE user_id = ?`,
    [d.fullName ?? null, d.cpf ?? null, d.phone ?? null, id],
  )
  audit(req.sessionUser!.id, 'editar_cliente', 'user', id, d.fullName)
  res.json({ ok: true })
})

clientsRouter.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const client = getOne<{ full_name: string }>(
    `SELECT p.full_name FROM profiles p WHERE p.user_id = ?`,
    [id],
  )
  run('DELETE FROM users WHERE id = ?', [id])
  audit(req.sessionUser!.id, 'remover_cliente', 'user', id, client?.full_name)
  res.json({ ok: true })
})
