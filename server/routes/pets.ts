import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { petSchema } from '../lib/validation.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'
import { saveImage, resolveStoragePath } from '../lib/upload.ts'
import { readFileSync, rmSync } from 'node:fs'

export const petsRouter = Router()

/** Garante que o pet pertence ao cliente da sessão. */
function assertPetOwner(petId: number, clientId: number): boolean {
  return !!getOne<{ id: number }>('SELECT id FROM pets WHERE id = ? AND owner_id = ?', [petId, clientId])
}

/* ── Cliente: meus pets ───────────────────────────────────────────────── */

petsRouter.get('/mine', requireClient, (req, res) => {
  const pets = getAll(
    `SELECT p.*, COUNT(a.id) AS consultas
     FROM pets p
     LEFT JOIN appointments a ON a.pet_id = p.id
     WHERE p.owner_id = ?
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [req.sessionUser!.id],
  )
  res.json({ pets })
})

petsRouter.get('/mine/:id', requireClient, (req, res) => {
  const id = Number(req.params.id)
  const pet = getOne<Record<string, unknown>>('SELECT * FROM pets WHERE id = ? AND owner_id = ?', [id, req.sessionUser!.id])
  if (!pet) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  res.json({ pet })
})

petsRouter.post('/', requireClient, (req, res) => {
  const parsed = petSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  const { lastInsertRowid } = run(
    `INSERT INTO pets (owner_id, name, species, breed, sex, birth_date, weight_kg, microchip, photo_url, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.sessionUser!.id, d.name, d.species, d.breed ?? null, d.sex, d.birthDate ?? null, d.weightKg ?? null, d.microchip ?? null, d.photoUrl ?? null, d.notes ?? null],
  )
  res.status(201).json({ pet: { id: Number(lastInsertRowid) } })
})

petsRouter.put('/mine/:id', requireClient, (req, res) => {
  const id = Number(req.params.id)
  if (!assertPetOwner(id, req.sessionUser!.id)) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  const parsed = petSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  run(
    `UPDATE pets SET name = ?, species = ?, breed = ?, sex = ?, birth_date = ?, weight_kg = ?, microchip = ?, photo_url = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ? AND owner_id = ?`,
    [d.name, d.species, d.breed ?? null, d.sex, d.birthDate ?? null, d.weightKg ?? null, d.microchip ?? null, d.photoUrl ?? null, d.notes ?? null, id, req.sessionUser!.id],
  )
  res.json({ ok: true })
})

/* ── Cliente: foto do pet (upload + servir) ───────────────────────────── */

petsRouter.post('/mine/:id/photo', requireClient, (req, res) => {
  const id = Number(req.params.id)
  if (!assertPetOwner(id, req.sessionUser!.id)) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  const data = String(req.body?.data ?? '')
  const mime = String(req.body?.mime ?? '')
  const match = /^data:([^;]+);base64,(.+)$/.exec(data)
  const base64 = match ? match[2] : data

  if (!base64) {
    res.status(400).json({ message: 'Selecione uma imagem.' })
    return
  }

  let rel: string
  try {
    rel = saveImage(base64, mime)
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : 'Imagem inválida.' })
    return
  }

  // Remove a foto anterior do storage antes de apontar para a nova.
  const prev = getOne<{ photo_url: string | null }>('SELECT photo_url FROM pets WHERE id = ?', [id])?.photo_url
  run('UPDATE pets SET photo_url = ?, updated_at = datetime(\'now\') WHERE id = ?', [rel, id])
  if (prev && prev.startsWith('petphotos/')) {
    try {
      rmSync(resolveStoragePath(prev), { force: true })
    } catch {
      /* arquivo já removido */
    }
  }
  res.json({ ok: true, url: rel })
})

petsRouter.get('/mine/:id/photo', requireClient, (req, res) => {
  const id = Number(req.params.id)
  const pet = getOne<{ photo_url: string | null }>('SELECT photo_url FROM pets WHERE id = ? AND owner_id = ?', [id, req.sessionUser!.id])
  if (!pet) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  if (!pet.photo_url || !pet.photo_url.startsWith('petphotos/')) {
    res.status(404).json({ message: 'Sem foto.' })
    return
  }
  const abs = resolveStoragePath(pet.photo_url)
  const ext = pet.photo_url.slice(pet.photo_url.lastIndexOf('.') + 1).toLowerCase()
  const types: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
  res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream')
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.send(readFileSync(abs))
})

/* ── Admin: CRUD completo ─────────────────────────────────────────────── */

petsRouter.get('/', requireAdmin, (req, res) => {
  const { search } = req.query
  let sql = `SELECT p.*, u.email AS owner_email, pr.full_name AS owner_name
             FROM pets p
             JOIN users u ON u.id = p.owner_id
             LEFT JOIN profiles pr ON pr.user_id = p.owner_id`
  const params: Array<string | number | bigint | null | Uint8Array> = []
  if (search && String(search).trim()) {
    sql += ` WHERE p.name LIKE ? OR pr.full_name LIKE ?`
    const like = `%${String(search).trim()}%`
    params.push(like, like)
  }
  sql += ` ORDER BY p.created_at DESC LIMIT 200`
  res.json({ pets: getAll(sql, params) })
})

petsRouter.get('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const pet = getOne<Record<string, unknown>>(
    `SELECT p.*, u.email AS owner_email, pr.full_name AS owner_name
     FROM pets p
     JOIN users u ON u.id = p.owner_id
     LEFT JOIN profiles pr ON pr.user_id = p.owner_id
     WHERE p.id = ?`,
    [id],
  )
  if (!pet) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  res.json({ pet })
})

petsRouter.post('/admin', requireAdmin, (req, res) => {
  const parsed = petSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const ownerId = Number(req.body.ownerId)
  if (!ownerId || !getOne<{ id: number }>('SELECT id FROM users WHERE id = ?', [ownerId])) {
    res.status(400).json({ message: 'Selecione um cliente válido.' })
    return
  }
  const d = parsed.data
  const { lastInsertRowid } = run(
    `INSERT INTO pets (owner_id, name, species, breed, sex, birth_date, weight_kg, microchip, photo_url, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [ownerId, d.name, d.species, d.breed ?? null, d.sex, d.birthDate ?? null, d.weightKg ?? null, d.microchip ?? null, d.photoUrl ?? null, d.notes ?? null],
  )
  audit(req.sessionUser!.id, 'criar_pet', 'pet', Number(lastInsertRowid), `Pet ${d.name}`)
  res.status(201).json({ pet: { id: Number(lastInsertRowid) } })
})

petsRouter.put('/admin/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const parsed = petSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  if (d.ownerId && !getOne<{ id: number }>('SELECT id FROM users WHERE id = ?', [d.ownerId])) {
    res.status(400).json({ message: 'Cliente inválido.' })
    return
  }
  run(
    `UPDATE pets SET owner_id = ?, name = ?, species = ?, breed = ?, sex = ?, birth_date = ?, weight_kg = ?, microchip = ?, photo_url = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [d.ownerId ?? (getOne<{ owner_id: number }>('SELECT owner_id FROM pets WHERE id = ?', [id])?.owner_id ?? req.sessionUser!.id), d.name, d.species, d.breed ?? null, d.sex, d.birthDate ?? null, d.weightKg ?? null, d.microchip ?? null, d.photoUrl ?? null, d.notes ?? null, id],
  )
  audit(req.sessionUser!.id, 'editar_pet', 'pet', id, `Pet ${d.name}`)
  res.json({ ok: true })
})

petsRouter.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const pet = getOne<{ name: string; photo_url: string | null }>('SELECT name, photo_url FROM pets WHERE id = ?', [id])
  if (pet?.photo_url?.startsWith('petphotos/')) {
    try {
      rmSync(resolveStoragePath(pet.photo_url), { force: true })
    } catch {
      /* arquivo já removido */
    }
  }
  run('DELETE FROM pets WHERE id = ?', [id])
  audit(req.sessionUser!.id, 'remover_pet', 'pet', id, pet?.name)
  res.json({ ok: true })
})
