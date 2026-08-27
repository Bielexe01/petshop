import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { requireAdmin, requireClient, audit, hashPassword } from '../auth.ts'
import { clientCreateSchema, clientUpdateSchema } from '../lib/validation.ts'

export const clientsRouter = Router()

/* ── Cliente: meus dados ──────────────────────────────────────────────── */

clientsRouter.get('/me', requireClient, async (req, res) => {
  const profile = await getOne<Record<string, unknown>>(
    `SELECT p.full_name, p.cpf, p.phone, p.birth_date, p.address, p.avatar_url, u.email, u.created_at
     FROM profiles p JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1`,
    [req.sessionUser!.id],
  )
  res.json({ profile })
})

/* ── Admin: CRUD de clientes ──────────────────────────────────────────── */

clientsRouter.get('/', requireAdmin, async (req, res) => {
  const { search } = req.query
  let sql = `SELECT u.id, u.email, u.is_active, u.created_at, p.full_name, p.cpf, p.phone,
                    (SELECT COUNT(*) FROM pets pt WHERE pt.owner_id = u.id) AS pets_count
             FROM users u
             LEFT JOIN profiles p ON p.user_id = u.id`
  const params: Array<string | number | boolean | null> = []
  if (search && String(search).trim()) {
    sql += ` WHERE u.email ILIKE $1 OR p.full_name ILIKE $1 OR p.cpf ILIKE $1`
    params.push(`%${String(search).trim()}%`)
  }
  sql += ` ORDER BY u.created_at DESC LIMIT 300`
  res.json({ clients: await getAll(sql, params) })
})

clientsRouter.get('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const client = await getOne<Record<string, unknown>>(
    `SELECT u.id, u.email, u.is_active, u.created_at, p.full_name, p.cpf, p.phone, p.birth_date, p.address
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = $1`,
    [id],
  )
  if (!client) {
    res.status(404).json({ message: 'Cliente não encontrado.' })
    return
  }
  const pets = await getAll('SELECT * FROM pets WHERE owner_id = $1 ORDER BY created_at DESC', [id])
  res.json({ client, pets })
})

clientsRouter.post('/', requireAdmin, async (req, res) => {
  const parsed = clientCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data

  const existing = await getOne<{ id: number }>('SELECT id FROM users WHERE email = $1', [d.email])
  if (existing) {
    res.status(409).json({ message: 'E-mail já cadastrado.' })
    return
  }

  const passwordHash = d.password ? hashPassword(d.password) : hashPassword(`${d.email}:temporaria`)
  const { lastInsertRowid } = await run('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id', [d.email, passwordHash])
  await run('INSERT INTO profiles (user_id, full_name, cpf, phone) VALUES ($1, $2, $3, $4)', [lastInsertRowid, d.fullName, d.cpf ?? null, d.phone ?? null])
  await audit(req.sessionUser!.id, 'criar_cliente', 'user', lastInsertRowid, d.fullName)
  res.status(201).json({ client: { id: lastInsertRowid } })
})

clientsRouter.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const parsed = clientUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  if (d.isActive !== undefined) {
    await run('UPDATE users SET is_active = $1, updated_at = now() WHERE id = $2', [d.isActive, id])
  }
  await run(
    `UPDATE profiles SET full_name = COALESCE($1, full_name), cpf = COALESCE($2, cpf), phone = COALESCE($3, phone), updated_at = now()
     WHERE user_id = $4`,
    [d.fullName ?? null, d.cpf ?? null, d.phone ?? null, id],
  )
  await audit(req.sessionUser!.id, 'editar_cliente', 'user', id, d.fullName ?? undefined)
  res.json({ ok: true })
})

clientsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const client = await getOne<{ full_name: string }>(
    `SELECT p.full_name FROM profiles p WHERE p.user_id = $1`,
    [id],
  )
  await run('DELETE FROM users WHERE id = $1', [id])
  await audit(req.sessionUser!.id, 'remover_cliente', 'user', id, client?.full_name ?? undefined)
  res.json({ ok: true })
})
