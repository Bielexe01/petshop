import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'

export const recordsRouter = Router()

function assertClientPet(petId: number, clientId: number): boolean {
  return !!getOne<{ id: number }>('SELECT id FROM pets WHERE id = ? AND owner_id = ?', [petId, clientId])
}

/* ── Cliente: timeline médica do pet ──────────────────────────────────── */

recordsRouter.get('/pet/:petId', requireClient, (req, res) => {
  const petId = Number(req.params.petId)
  if (!assertClientPet(petId, req.sessionUser!.id)) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  const records = getAll(
    `SELECT * FROM medical_records WHERE pet_id = ? ORDER BY created_at DESC`,
    [petId],
  )
  res.json({ records })
})

/* ── Admin ────────────────────────────────────────────────────────────── */

recordsRouter.get('/', requireAdmin, (req, res) => {
  const { petId } = req.query
  if (petId) {
    const records = getAll(
      `SELECT r.*, p.name AS pet_name FROM medical_records r JOIN pets p ON p.id = r.pet_id
       WHERE r.pet_id = ? ORDER BY r.created_at DESC LIMIT 200`,
      [Number(petId)],
    )
    res.json({ records })
    return
  }
  res.json({ records: getAll('SELECT * FROM medical_records ORDER BY created_at DESC LIMIT 300') })
})

recordsRouter.post('/', requireAdmin, (req, res) => {
  const petId = Number(req.body.petId)
  const pet = getOne<{ owner_id: number; name: string }>('SELECT owner_id, name FROM pets WHERE id = ?', [petId])
  if (!pet) {
    res.status(400).json({ message: 'Pet inválido.' })
    return
  }
  const title = String(req.body.title ?? '').trim().slice(0, 200)
  if (!title) {
    res.status(400).json({ message: 'Informe o título do registro.' })
    return
  }
  const { lastInsertRowid } = run(
    `INSERT INTO medical_records (pet_id, appointment_id, vet_name, record_type, title, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [petId, req.body.appointmentId ? Number(req.body.appointmentId) : null, String(req.body.vetName ?? '').slice(0, 120) || null, String(req.body.recordType ?? 'consulta').slice(0, 40), title, String(req.body.description ?? '').slice(0, 5000) || null],
  )
  audit(req.sessionUser!.id, 'criar_registro', 'medical_record', Number(lastInsertRowid), title)
  res.status(201).json({ record: { id: Number(lastInsertRowid) } })
})

recordsRouter.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  run('DELETE FROM medical_records WHERE id = ?', [id])
  audit(req.sessionUser!.id, 'remover_registro', 'medical_record', id)
  res.json({ ok: true })
})
