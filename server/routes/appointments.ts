import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { appointmentSchema } from '../lib/validation.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'

export const appointmentsRouter = Router()

function assertClientPet(petId: number, clientId: number): boolean {
  return !!getOne<{ id: number }>('SELECT id FROM pets WHERE id = ? AND owner_id = ?', [petId, clientId])
}

/* ── Cliente: consultas do meu pet ────────────────────────────────────── */

appointmentsRouter.get('/mine', requireClient, (req, res) => {
  const appointments = getAll(
    `SELECT a.*, p.name AS pet_name
     FROM appointments a JOIN pets p ON p.id = a.pet_id
     WHERE a.client_id = ?
     ORDER BY a.scheduled_at DESC, a.created_at DESC
     LIMIT 100`,
    [req.sessionUser!.id],
  )
  res.json({ appointments })
})

appointmentsRouter.get('/mine/:id', requireClient, (req, res) => {
  const id = Number(req.params.id)
  const appointment = getOne<Record<string, unknown>>(
    `SELECT a.*, p.name AS pet_name
     FROM appointments a JOIN pets p ON p.id = a.pet_id
     WHERE a.id = ? AND a.client_id = ?`,
    [id, req.sessionUser!.id],
  )
  if (!appointment) {
    res.status(404).json({ message: 'Consulta não encontrada.' })
    return
  }
  res.json({ appointment })
})

/* ── Cliente: pedido de agendamento ───────────────────────────────────── */

appointmentsRouter.post('/request', requireClient, (req, res) => {
  const petId = Number(req.body.petId)
  if (!assertClientPet(petId, req.sessionUser!.id)) {
    res.status(400).json({ message: 'Pet inválido.' })
    return
  }
  const type = String(req.body.type ?? 'consulta').slice(0, 40)
  const preferredDate = String(req.body.preferredDate ?? '').slice(0, 20)
  const notes = String(req.body.notes ?? '').slice(0, 2000)

  const { lastInsertRowid } = run(
    `INSERT INTO appointments (pet_id, client_id, type, scheduled_at, status, notes, created_by_admin)
     VALUES (?, ?, ?, ?, 'agendada', ?, 0)`,
    [petId, req.sessionUser!.id, type, preferredDate || null, notes || null],
  )
  run(
    `INSERT INTO notifications (user_id, title, body, type)
     VALUES (?, 'Pedido de agendamento enviado', 'Solicitamos ${type} para ${preferredDate || 'a data informada'}. A clínica confirmará em breve.', 'agendamento')`,
    [req.sessionUser!.id],
  )
  res.status(201).json({ appointment: { id: Number(lastInsertRowid) } })
})

/* ── Admin: CRUD completo ─────────────────────────────────────────────── */

appointmentsRouter.get('/', requireAdmin, (req, res) => {
  const { search } = req.query
  let sql = `SELECT a.*, p.name AS pet_name, pr.full_name AS client_name
             FROM appointments a
             JOIN pets p ON p.id = a.pet_id
             LEFT JOIN profiles pr ON pr.user_id = a.client_id`
  const params: Array<string | number | bigint | null | Uint8Array> = []
  if (search && String(search).trim()) {
    sql += ` WHERE p.name LIKE ? OR pr.full_name LIKE ?`
    const like = `%${String(search).trim()}%`
    params.push(like, like)
  }
  sql += ` ORDER BY a.scheduled_at DESC LIMIT 300`
  res.json({ appointments: getAll(sql, params) })
})

appointmentsRouter.get('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const appointment = getOne<Record<string, unknown>>(
    `SELECT a.*, p.name AS pet_name, pr.full_name AS client_name
     FROM appointments a
     JOIN pets p ON p.id = a.pet_id
     LEFT JOIN profiles pr ON pr.user_id = a.client_id
     WHERE a.id = ?`,
    [id],
  )
  if (!appointment) {
    res.status(404).json({ message: 'Consulta não encontrada.' })
    return
  }
  res.json({ appointment })
})

appointmentsRouter.post('/', requireAdmin, (req, res) => {
  const parsed = appointmentSchema.safeParse(req.body)
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
    `INSERT INTO appointments (pet_id, client_id, vet_name, type, scheduled_at, status, summary, diagnosis, notes, created_by_admin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [d.petId, pet.owner_id, d.vetName ?? null, d.type, d.scheduledAt ?? null, d.status, d.summary ?? null, d.diagnosis ?? null, d.notes ?? null],
  )
  run(
    `INSERT INTO medical_records (pet_id, appointment_id, vet_name, record_type, title, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [d.petId, Number(lastInsertRowid), d.vetName ?? null, d.type, `Consulta: ${d.type}`, d.summary ?? null],
  )
  audit(req.sessionUser!.id, 'criar_consulta', 'appointment', Number(lastInsertRowid), `${pet.name} — ${d.type}`)
  res.status(201).json({ appointment: { id: Number(lastInsertRowid) } })
})

appointmentsRouter.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const parsed = appointmentSchema.safeParse(req.body)
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
    `UPDATE appointments SET pet_id = ?, client_id = ?, vet_name = ?, type = ?, scheduled_at = ?, status = ?, summary = ?, diagnosis = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [d.petId, pet.owner_id, d.vetName ?? null, d.type, d.scheduledAt ?? null, d.status, d.summary ?? null, d.diagnosis ?? null, d.notes ?? null, id],
  )
  audit(req.sessionUser!.id, 'editar_consulta', 'appointment', id, `${d.type}`)
  res.json({ ok: true })
})

appointmentsRouter.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  run('DELETE FROM appointments WHERE id = ?', [id])
  audit(req.sessionUser!.id, 'remover_consulta', 'appointment', id)
  res.json({ ok: true })
})
