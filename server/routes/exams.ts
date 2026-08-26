import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { examSchema } from '../lib/validation.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'

export const examsRouter = Router()

function assertClientPet(petId: number, clientId: number): boolean {
  return !!getOne<{ id: number }>('SELECT id FROM pets WHERE id = ? AND owner_id = ?', [petId, clientId])
}

/* ── Cliente: meus exames ─────────────────────────────────────────────── */

examsRouter.get('/mine', requireClient, (req, res) => {
  const exams = getAll(
    `SELECT e.*, pet.name AS pet_name
     FROM exams e JOIN pets pet ON pet.id = e.pet_id
     WHERE e.client_id = ?
     ORDER BY e.created_at DESC LIMIT 100`,
    [req.sessionUser!.id],
  )
  res.json({ exams })
})

examsRouter.get('/pet/:petId', requireClient, (req, res) => {
  const petId = Number(req.params.petId)
  if (!assertClientPet(petId, req.sessionUser!.id)) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  const exams = getAll(
    'SELECT * FROM exams WHERE pet_id = ? ORDER BY created_at DESC',
    [petId],
  )
  res.json({ exams })
})

/* ── Admin: CRUD ──────────────────────────────────────────────────────── */

examsRouter.get('/', requireAdmin, (_req, res) => {
  const exams = getAll(
    `SELECT e.*, pet.name AS pet_name, pr.full_name AS client_name
     FROM exams e
     JOIN pets pet ON pet.id = e.pet_id
     LEFT JOIN profiles pr ON pr.user_id = e.client_id
     ORDER BY e.created_at DESC LIMIT 300`,
  )
  res.json({ exams })
})

examsRouter.get('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const exam = getOne<Record<string, unknown>>(
    `SELECT e.*, pet.name AS pet_name
     FROM exams e JOIN pets pet ON pet.id = e.pet_id
     WHERE e.id = ?`,
    [id],
  )
  if (!exam) {
    res.status(404).json({ message: 'Exame não encontrado.' })
    return
  }
  res.json({ exam })
})

examsRouter.post('/', requireAdmin, (req, res) => {
  const parsed = examSchema.safeParse(req.body)
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
    `INSERT INTO exams (pet_id, client_id, appointment_id, name, category, status, result_date, vet_name, notes, created_by_admin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [d.petId, pet.owner_id, d.appointmentId ? Number(d.appointmentId) : null, d.name, d.category, d.status, d.resultDate ?? null, d.vetName ?? null, d.notes ?? null],
  )
  audit(req.sessionUser!.id, 'criar_exame', 'exam', Number(lastInsertRowid), d.name)
  res.status(201).json({ exam: { id: Number(lastInsertRowid) } })
})

examsRouter.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const parsed = examSchema.safeParse(req.body)
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
    `UPDATE exams SET pet_id = ?, client_id = ?, appointment_id = ?, name = ?, category = ?, status = ?, result_date = ?, vet_name = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [d.petId, pet.owner_id, d.appointmentId ? Number(d.appointmentId) : null, d.name, d.category, d.status, d.resultDate ?? null, d.vetName ?? null, d.notes ?? null, id],
  )
  audit(req.sessionUser!.id, 'editar_exame', 'exam', id, d.name)
  res.json({ ok: true })
})

examsRouter.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  run('DELETE FROM exams WHERE id = ?', [id])
  audit(req.sessionUser!.id, 'remover_exame', 'exam', id)
  res.json({ ok: true })
})
