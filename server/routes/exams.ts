import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { examSchema } from '../lib/validation.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'

export const examsRouter = Router()

async function assertClientPet(petId: number, clientId: number): Promise<boolean> {
  return !!(await getOne<{ id: number }>('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [petId, clientId]))
}

/* ── Cliente: meus exames ─────────────────────────────────────────────── */

examsRouter.get('/mine', requireClient, async (req, res) => {
  const exams = await getAll(
    `SELECT e.*, pet.name AS pet_name
     FROM exams e JOIN pets pet ON pet.id = e.pet_id
     WHERE e.client_id = $1
     ORDER BY e.created_at DESC LIMIT 100`,
    [req.sessionUser!.id],
  )
  res.json({ exams })
})

examsRouter.get('/pet/:petId', requireClient, async (req, res) => {
  const petId = Number(req.params.petId)
  if (!(await assertClientPet(petId, req.sessionUser!.id))) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  const exams = await getAll(
    'SELECT * FROM exams WHERE pet_id = $1 ORDER BY created_at DESC',
    [petId],
  )
  res.json({ exams })
})

/* ── Admin: CRUD ──────────────────────────────────────────────────────── */

examsRouter.get('/', requireAdmin, async (_req, res) => {
  const exams = await getAll(
    `SELECT e.*, pet.name AS pet_name, pr.full_name AS client_name
     FROM exams e
     JOIN pets pet ON pet.id = e.pet_id
     LEFT JOIN profiles pr ON pr.user_id = e.client_id
     ORDER BY e.created_at DESC LIMIT 300`,
  )
  res.json({ exams })
})

examsRouter.get('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const exam = await getOne<Record<string, unknown>>(
    `SELECT e.*, pet.name AS pet_name
     FROM exams e JOIN pets pet ON pet.id = e.pet_id
     WHERE e.id = $1`,
    [id],
  )
  if (!exam) {
    res.status(404).json({ message: 'Exame não encontrado.' })
    return
  }
  res.json({ exam })
})

examsRouter.post('/', requireAdmin, async (req, res) => {
  const parsed = examSchema.safeParse(req.body)
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
    `INSERT INTO exams (pet_id, client_id, appointment_id, name, category, status, result_date, vet_name, notes, created_by_admin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING id`,
    [d.petId, pet.owner_id, d.appointmentId ? Number(d.appointmentId) : null, d.name, d.category, d.status, d.resultDate ?? null, d.vetName ?? null, d.notes ?? null],
  )
  await audit(req.sessionUser!.id, 'criar_exame', 'exam', lastInsertRowid, d.name)
  res.status(201).json({ exam: { id: lastInsertRowid } })
})

examsRouter.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const parsed = examSchema.safeParse(req.body)
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
    `UPDATE exams SET pet_id = $1, client_id = $2, appointment_id = $3, name = $4, category = $5, status = $6, result_date = $7, vet_name = $8, notes = $9, updated_at = now()
     WHERE id = $10`,
    [d.petId, pet.owner_id, d.appointmentId ? Number(d.appointmentId) : null, d.name, d.category, d.status, d.resultDate ?? null, d.vetName ?? null, d.notes ?? null, id],
  )
  await audit(req.sessionUser!.id, 'editar_exame', 'exam', id, d.name)
  res.json({ ok: true })
})

examsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  await run('DELETE FROM exams WHERE id = $1', [id])
  await audit(req.sessionUser!.id, 'remover_exame', 'exam', id)
  res.json({ ok: true })
})
