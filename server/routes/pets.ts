import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { petSchema } from '../lib/validation.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'
import { saveImage, downloadStorageObject, removeStorageObject } from '../lib/upload.ts'

export const petsRouter = Router()

/** Garante que o pet pertence ao cliente da sessão. */
async function assertPetOwner(petId: number, clientId: number): Promise<boolean> {
  return !!(await getOne<{ id: number }>('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [petId, clientId]))
}

/* ── Cliente: meus pets ───────────────────────────────────────────────── */

petsRouter.get('/mine', requireClient, async (req, res) => {
  const pets = await getAll(
    `SELECT p.*, COUNT(a.id) AS consultas
     FROM pets p
     LEFT JOIN appointments a ON a.pet_id = p.id
     WHERE p.owner_id = $1
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [req.sessionUser!.id],
  )
  res.json({ pets })
})

petsRouter.get('/mine/:id', requireClient, async (req, res) => {
  const id = Number(req.params.id)
  const pet = await getOne<Record<string, unknown>>('SELECT * FROM pets WHERE id = $1 AND owner_id = $2', [id, req.sessionUser!.id])
  if (!pet) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  res.json({ pet })
})

petsRouter.post('/', requireClient, async (req, res) => {
  const parsed = petSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  const { lastInsertRowid } = await run(
    `INSERT INTO pets (owner_id, name, species, breed, sex, birth_date, weight_kg, microchip, photo_url, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [req.sessionUser!.id, d.name, d.species, d.breed ?? null, d.sex, d.birthDate ?? null, d.weightKg ?? null, d.microchip ?? null, d.photoUrl ?? null, d.notes ?? null],
  )
  res.status(201).json({ pet: { id: lastInsertRowid } })
})

petsRouter.put('/mine/:id', requireClient, async (req, res) => {
  const id = Number(req.params.id)
  if (!(await assertPetOwner(id, req.sessionUser!.id))) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  const parsed = petSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  await run(
    `UPDATE pets SET name = $1, species = $2, breed = $3, sex = $4, birth_date = $5, weight_kg = $6, microchip = $7, photo_url = $8, notes = $9, updated_at = now()
     WHERE id = $10 AND owner_id = $11`,
    [d.name, d.species, d.breed ?? null, d.sex, d.birthDate ?? null, d.weightKg ?? null, d.microchip ?? null, d.photoUrl ?? null, d.notes ?? null, id, req.sessionUser!.id],
  )
  res.json({ ok: true })
})

/* ── Cliente: foto do pet (upload + servir) ───────────────────────────── */

petsRouter.post('/mine/:id/photo', requireClient, async (req, res) => {
  const id = Number(req.params.id)
  if (!(await assertPetOwner(id, req.sessionUser!.id))) {
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
    rel = await saveImage(base64, mime)
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : 'Imagem inválida.' })
    return
  }

  // Remove a foto anterior do storage antes de apontar para a nova.
  const prev = (await getOne<{ photo_url: string | null }>('SELECT photo_url FROM pets WHERE id = $1', [id]))?.photo_url
  await run("UPDATE pets SET photo_url = $1, updated_at = now() WHERE id = $2", [rel, id])
  if (prev && prev.startsWith('petphotos/')) {
    await removeStorageObject(prev)
  }
  res.json({ ok: true, url: rel })
})

petsRouter.get('/mine/:id/photo', requireClient, async (req, res) => {
  const id = Number(req.params.id)
  const pet = await getOne<{ photo_url: string | null }>('SELECT photo_url FROM pets WHERE id = $1 AND owner_id = $2', [id, req.sessionUser!.id])
  if (!pet) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  if (!pet.photo_url || !pet.photo_url.startsWith('petphotos/')) {
    res.status(404).json({ message: 'Sem foto.' })
    return
  }
  const buf = await downloadStorageObject(pet.photo_url)
  if (!buf) {
    res.status(404).json({ message: 'Foto não encontrada.' })
    return
  }
  const ext = pet.photo_url.slice(pet.photo_url.lastIndexOf('.') + 1).toLowerCase()
  const types: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
  res.setHeader('Content-Type', types[ext] ?? 'application/octet-stream')
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.send(buf)
})

/* ── Admin: CRUD completo ─────────────────────────────────────────────── */

petsRouter.get('/', requireAdmin, async (req, res) => {
  const { search } = req.query
  let sql = `SELECT p.*, u.email AS owner_email, pr.full_name AS owner_name
             FROM pets p
             JOIN users u ON u.id = p.owner_id
             LEFT JOIN profiles pr ON pr.user_id = p.owner_id`
  const params: Array<string | number | boolean | null> = []
  if (search && String(search).trim()) {
    sql += ` WHERE p.name ILIKE $1 OR pr.full_name ILIKE $1`
    params.push(`%${String(search).trim()}%`)
  }
  sql += ` ORDER BY p.created_at DESC LIMIT 200`
  res.json({ pets: await getAll(sql, params) })
})

petsRouter.get('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const pet = await getOne<Record<string, unknown>>(
    `SELECT p.*, u.email AS owner_email, pr.full_name AS owner_name
     FROM pets p
     JOIN users u ON u.id = p.owner_id
     LEFT JOIN profiles pr ON pr.user_id = p.owner_id
     WHERE p.id = $1`,
    [id],
  )
  if (!pet) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  res.json({ pet })
})

petsRouter.post('/admin', requireAdmin, async (req, res) => {
  const parsed = petSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const ownerId = Number(req.body.ownerId)
  if (!ownerId || !(await getOne<{ id: number }>('SELECT id FROM users WHERE id = $1', [ownerId]))) {
    res.status(400).json({ message: 'Selecione um cliente válido.' })
    return
  }
  const d = parsed.data
  const { lastInsertRowid } = await run(
    `INSERT INTO pets (owner_id, name, species, breed, sex, birth_date, weight_kg, microchip, photo_url, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [ownerId, d.name, d.species, d.breed ?? null, d.sex, d.birthDate ?? null, d.weightKg ?? null, d.microchip ?? null, d.photoUrl ?? null, d.notes ?? null],
  )
  await audit(req.sessionUser!.id, 'criar_pet', 'pet', lastInsertRowid, `Pet ${d.name}`)
  res.status(201).json({ pet: { id: lastInsertRowid } })
})

petsRouter.put('/admin/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const parsed = petSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  if (d.ownerId && !(await getOne<{ id: number }>('SELECT id FROM users WHERE id = $1', [d.ownerId]))) {
    res.status(400).json({ message: 'Cliente inválido.' })
    return
  }
  await run(
    `UPDATE pets SET owner_id = $1, name = $2, species = $3, breed = $4, sex = $5, birth_date = $6, weight_kg = $7, microchip = $8, photo_url = $9, notes = $10, updated_at = now()
     WHERE id = $11`,
    [d.ownerId ?? (await getOne<{ owner_id: number }>('SELECT owner_id FROM pets WHERE id = $1', [id]))?.owner_id ?? req.sessionUser!.id, d.name, d.species, d.breed ?? null, d.sex, d.birthDate ?? null, d.weightKg ?? null, d.microchip ?? null, d.photoUrl ?? null, d.notes ?? null, id],
  )
  await audit(req.sessionUser!.id, 'editar_pet', 'pet', id, `Pet ${d.name}`)
  res.json({ ok: true })
})

petsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const pet = await getOne<{ name: string; photo_url: string | null }>('SELECT name, photo_url FROM pets WHERE id = $1', [id])
  if (pet?.photo_url?.startsWith('petphotos/')) {
    await removeStorageObject(pet.photo_url)
  }
  await run('DELETE FROM pets WHERE id = $1', [id])
  await audit(req.sessionUser!.id, 'remover_pet', 'pet', id, pet?.name ?? undefined)
  res.json({ ok: true })
})
