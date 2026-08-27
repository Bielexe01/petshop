import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'

export const recordsRouter = Router()

async function assertClientPet(petId: number, clientId: number): Promise<boolean> {
  return !!(await getOne<{ id: number }>('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [petId, clientId]))
}

/* ── Cliente: timeline médica do pet ──────────────────────────────────── */

recordsRouter.get('/pet/:petId', requireClient, async (req, res) => {
  const petId = Number(req.params.petId)
  if (!(await assertClientPet(petId, req.sessionUser!.id))) {
    res.status(404).json({ message: 'Pet não encontrado.' })
    return
  }
  const records = await getAll(
    `SELECT * FROM medical_records WHERE pet_id = $1 ORDER BY created_at DESC`,
    [petId],
  )
  res.json({ records })
})

/* ── Admin ────────────────────────────────────────────────────────────── */

recordsRouter.get('/', requireAdmin, async (req, res) => {
  const { petId } = req.query
  if (petId) {
    const records = await getAll(
      `SELECT r.*, p.name AS pet_name FROM medical_records r JOIN pets p ON p.id = r.pet_id
       WHERE r.pet_id = $1 ORDER BY r.created_at DESC LIMIT 200`,
      [Number(petId)],
    )
    res.json({ records })
    return
  }
  res.json({ records: await getAll('SELECT * FROM medical_records ORDER BY created_at DESC LIMIT 300') })
})

recordsRouter.post('/', requireAdmin, async (req, res) => {
  const petId = Number(req.body.petId)
  const pet = await getOne<{ owner_id: number; name: string }>('SELECT owner_id, name FROM pets WHERE id = $1', [petId])
  if (!pet) {
    res.status(400).json({ message: 'Pet inválido.' })
    return
  }
  const title = String(req.body.title ?? '').trim().slice(0, 200)
  if (!title) {
    res.status(400).json({ message: 'Informe o título do registro.' })
    return
  }
  const { lastInsertRowid } = await run(
    `INSERT INTO medical_records (pet_id, appointment_id, vet_name, record_type, title, description)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [petId, req.body.appointmentId ? Number(req.body.appointmentId) : null, String(req.body.vetName ?? '').slice(0, 120) || null, String(req.body.recordType ?? 'consulta').slice(0, 40), title, String(req.body.description ?? '').slice(0, 5000) || null],
  )
  await audit(req.sessionUser!.id, 'criar_registro', 'medical_record', lastInsertRowid, title)
  res.status(201).json({ record: { id: lastInsertRowid } })
})

recordsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  await run('DELETE FROM medical_records WHERE id = $1', [id])
  await audit(req.sessionUser!.id, 'remover_registro', 'medical_record', id)
  res.json({ ok: true })
})
