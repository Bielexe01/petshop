import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { vaccinationSchema } from '../lib/validation.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'

export const vaccinationsRouter = Router()

function assertClientPet(petId: number, clientId: number): boolean {
  return !!getOne<{ id: number }>('SELECT id FROM pets WHERE id = ? AND owner_id = ?', [petId, clientId])
}

/* ── Cliente ──────────────────────────────────────────────────────────── */

vaccinationsRouter.get('/mine', requireClient, (req, res) => {
  const vaccinations = getAll(
    `SELECT v.*, pet.name AS pet_name
     FROM vaccinations v JOIN pets pet ON pet.id = v.pet_id
     WHERE v.client_id = ?
     ORDER BY v.applied_at DESC LIMIT 100`,
    [req.sessionUser!.id],
  )
  res.json({ vaccinations })
})

vaccinationsRouter.get('/pet/:petId', requireClient, (req, res) => {
  const petId = Number(req.params.petId)
  if (!assertClientPet(petId, req.sessionUser!.id)) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  const vaccinations = getAll(
    'SELECT * FROM vaccinations WHERE pet_id = ? ORDER BY applied_at DESC',
    [petId],
  )
  res.json({ vaccinations })
})

/* ── Admin ────────────────────────────────────────────────────────────── */

vaccinationsRouter.get('/', requireAdmin, (_req, res) => {
  const vaccinations = getAll(
    `SELECT v.*, pet.name AS pet_name, pr.full_name AS client_name
     FROM vaccinations v
     JOIN pets pet ON pet.id = v.pet_id
     LEFT JOIN profiles pr ON pr.user_id = v.client_id
     ORDER BY v.applied_at DESC LIMIT 300`,
  )
  res.json({ vaccinations })
})

vaccinationsRouter.get('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const vaccination = getOne<Record<string, unknown>>(
    `SELECT v.*, pet.name AS pet_name
     FROM vaccinations v JOIN pets pet ON pet.id = v.pet_id
     WHERE v.id = ?`,
    [id],
  )
  if (!vaccination) {
    res.status(404).json({ message: 'Vacina não encontrada.' })
    return
  }
  res.json({ vaccination })
})

vaccinationsRouter.post('/', requireAdmin, (req, res) => {
  const parsed = vaccinationSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  const pet = getOne<{ owner_id: number; name: string }>('SELECT owner_id, name FROM pets WHERE id = ?', [d.petId])
  if (!pet) {
    res.status(400).json({ message: 'Pet inválido.' })
    return
  }
  const { lastInsertRowid } = run(
    `INSERT INTO vaccinations (pet_id, client_id, name, applied_at, next_dose_at, lot, clinic_name, vet_name, created_by_admin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [d.petId, pet.owner_id, d.name, d.appliedAt ?? null, d.nextDoseAt ?? null, d.lot ?? null, d.clinicName ?? null, d.vetName ?? null],
  )
  audit(req.sessionUser!.id, 'criar_vacina', 'vaccination', Number(lastInsertRowid), d.name)
  res.status(201).json({ vaccination: { id: Number(lastInsertRowid) } })
})

vaccinationsRouter.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const parsed = vaccinationSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data
  const pet = getOne<{ owner_id: number }>('SELECT owner_id FROM pets WHERE id = ?', [d.petId])
  if (!pet) {
    res.status(400).json({ message: 'Pet inválido.' })
    return
  }
  run(
    `UPDATE vaccinations SET pet_id = ?, client_id = ?, name = ?, applied_at = ?, next_dose_at = ?, lot = ?, clinic_name = ?, vet_name = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [d.petId, pet.owner_id, d.name, d.appliedAt ?? null, d.nextDoseAt ?? null, d.lot ?? null, d.clinicName ?? null, d.vetName ?? null, id],
  )
  audit(req.sessionUser!.id, 'editar_vacina', 'vaccination', id, d.name)
  res.json({ ok: true })
})

vaccinationsRouter.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  run('DELETE FROM vaccinations WHERE id = ?', [id])
  audit(req.sessionUser!.id, 'remover_vacina', 'vaccination', id)
  res.json({ ok: true })
})
