import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { vaccinationSchema } from '../lib/validation.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'

export const vaccinationsRouter = Router()

async function assertClientPet(petId: number, clientId: number): Promise<boolean> {
  return !!(await getOne<{ id: number }>('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [petId, clientId]))
}

/* ── Cliente ──────────────────────────────────────────────────────────── */

vaccinationsRouter.get('/mine', requireClient, async (req, res) => {
  const vaccinations = await getAll(
    `SELECT v.*, pet.name AS pet_name
     FROM vaccinations v JOIN pets pet ON pet.id = v.pet_id
     WHERE v.client_id = $1
     ORDER BY v.applied_at DESC LIMIT 100`,
    [req.sessionUser!.id],
  )
  res.json({ vaccinations })
})

vaccinationsRouter.get('/pet/:petId', requireClient, async (req, res) => {
  const petId = Number(req.params.petId)
  if (!(await assertClientPet(petId, req.sessionUser!.id))) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  const vaccinations = await getAll(
    'SELECT * FROM vaccinations WHERE pet_id = $1 ORDER BY applied_at DESC',
    [petId],
  )
  res.json({ vaccinations })
})

/* ── Admin ────────────────────────────────────────────────────────────── */

vaccinationsRouter.get('/', requireAdmin, async (_req, res) => {
  const vaccinations = await getAll(
    `SELECT v.*, pet.name AS pet_name, pr.full_name AS client_name
     FROM vaccinations v
     JOIN pets pet ON pet.id = v.pet_id
     LEFT JOIN profiles pr ON pr.user_id = v.client_id
     ORDER BY v.applied_at DESC LIMIT 300`,
  )
  res.json({ vaccinations })
})

vaccinationsRouter.get('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const vaccination = await getOne<Record<string, unknown>>(
    `SELECT v.*, pet.name AS pet_name
     FROM vaccinations v JOIN pets pet ON pet.id = v.pet_id
     WHERE v.id = $1`,
    [id],
  )
  if (!vaccination) {
    res.status(404).json({ message: 'Vacina não encontrada.' })
    return
  }
  res.json({ vaccination })
})

vaccinationsRouter.post('/', requireAdmin, async (req, res) => {
  const parsed = vaccinationSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  const pet = await getOne<{ owner_id: number; name: string }>('SELECT owner_id, name FROM pets WHERE id = $1', [d.petId])
  if (!pet) {
    res.status(400).json({ message: 'Pet inválido.' })
    return
  }
  const { lastInsertRowid } = await run(
    `INSERT INTO vaccinations (pet_id, client_id, name, applied_at, next_dose_at, lot, clinic_name, vet_name, created_by_admin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true) RETURNING id`,
    [d.petId, pet.owner_id, d.name, d.appliedAt ?? null, d.nextDoseAt ?? null, d.lot ?? null, d.clinicName ?? null, d.vetName ?? null],
  )
  await audit(req.sessionUser!.id, 'criar_vacina', 'vaccination', lastInsertRowid, d.name)
  res.status(201).json({ vaccination: { id: lastInsertRowid } })
})

vaccinationsRouter.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const parsed = vaccinationSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  const pet = await getOne<{ owner_id: number }>('SELECT owner_id FROM pets WHERE id = $1', [d.petId])
  if (!pet) {
    res.status(400).json({ message: 'Pet inválido.' })
    return
  }
  await run(
    `UPDATE vaccinations SET pet_id = $1, client_id = $2, name = $3, applied_at = $4, next_dose_at = $5, lot = $6, clinic_name = $7, vet_name = $8, updated_at = now()
     WHERE id = $9`,
    [d.petId, pet.owner_id, d.name, d.appliedAt ?? null, d.nextDoseAt ?? null, d.lot ?? null, d.clinicName ?? null, d.vetName ?? null, id],
  )
  await audit(req.sessionUser!.id, 'editar_vacina', 'vaccination', id, d.name)
  res.json({ ok: true })
})

vaccinationsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  await run('DELETE FROM vaccinations WHERE id = $1', [id])
  await audit(req.sessionUser!.id, 'remover_vacina', 'vaccination', id)
  res.json({ ok: true })
})
