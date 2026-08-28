import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { appointmentSchema } from '../lib/validation.ts'
import { requireClient, requireScreen, requireAdmin, audit } from '../auth.ts'

export const appointmentsRouter = Router()

async function assertClientPet(petId: number, clientId: number): Promise<boolean> {
  return !!(await getOne<{ id: number }>('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [petId, clientId]))
}

/* ── Cliente: consultas do meu pet ────────────────────────────────────── */

appointmentsRouter.get('/mine', requireClient, async (req, res) => {
  const appointments = await getAll(
    `SELECT a.*, p.name AS pet_name
     FROM appointments a JOIN pets p ON p.id = a.pet_id
     WHERE a.client_id = $1
     ORDER BY a.scheduled_at DESC, a.created_at DESC
     LIMIT 100`,
    [req.sessionUser!.id],
  )
  res.json({ appointments })
})

appointmentsRouter.get('/mine/:id', requireClient, async (req, res) => {
  const id = Number(req.params.id)
  const appointment = await getOne<Record<string, unknown>>(
    `SELECT a.*, p.name AS pet_name
     FROM appointments a JOIN pets p ON p.id = a.pet_id
     WHERE a.id = $1 AND a.client_id = $2`,
    [id, req.sessionUser!.id],
  )
  if (!appointment) {
    res.status(404).json({ message: 'Consulta não encontrada.' })
    return
  }
  res.json({ appointment })
})

/* ── Cliente: pedido de agendamento ───────────────────────────────────── */

appointmentsRouter.post('/request', requireClient, async (req, res) => {
  const petId = Number(req.body.petId)
  if (!(await assertClientPet(petId, req.sessionUser!.id))) {
    res.status(400).json({ message: 'Pet inválido.' })
    return
  }
  const type = String(req.body.type ?? 'consulta').slice(0, 40)
  const preferredDate = String(req.body.preferredDate ?? '').slice(0, 20)
  const notes = String(req.body.notes ?? '').slice(0, 2000)

  const { lastInsertRowid } = await run(
    `INSERT INTO appointments (pet_id, client_id, type, scheduled_at, status, notes, created_by_admin)
     VALUES ($1, $2, $3, $4, 'agendada', $5, false) RETURNING id`,
    [petId, req.sessionUser!.id, type, preferredDate || null, notes || null],
  )
  await run(
    `INSERT INTO notifications (user_id, title, body, type)
     VALUES ($1, 'Pedido de agendamento enviado', $2, 'agendamento')`,
    [req.sessionUser!.id, `Solicitamos ${type} para ${preferredDate || 'a data informada'}. A clínica confirmará em breve.`],
  )
  res.status(201).json({ appointment: { id: lastInsertRowid } })
})

/* ── Admin: CRUD completo ─────────────────────────────────────────────── */

appointmentsRouter.get('/', requireScreen('consultas'), async (req, res) => {
  const { search } = req.query
  let sql = `SELECT a.*, p.name AS pet_name, pr.full_name AS client_name
             FROM appointments a
             JOIN pets p ON p.id = a.pet_id
             LEFT JOIN profiles pr ON pr.user_id = a.client_id`
  const params: Array<string | number | boolean | null> = []
  if (search && String(search).trim()) {
    sql += ` WHERE p.name ILIKE $1 OR pr.full_name ILIKE $1`
    params.push(`%${String(search).trim()}%`)
  }
  sql += ` ORDER BY a.scheduled_at DESC LIMIT 300`
  res.json({ appointments: await getAll(sql, params) })
})

appointmentsRouter.get('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const appointment = await getOne<Record<string, unknown>>(
    `SELECT a.*, p.name AS pet_name, pr.full_name AS client_name
     FROM appointments a
     JOIN pets p ON p.id = a.pet_id
     LEFT JOIN profiles pr ON pr.user_id = a.client_id
     WHERE a.id = $1`,
    [id],
  )
  if (!appointment) {
    res.status(404).json({ message: 'Consulta não encontrada.' })
    return
  }
  res.json({ appointment })
})

appointmentsRouter.post('/', requireAdmin, async (req, res) => {
  const parsed = appointmentSchema.safeParse(req.body)
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
    `INSERT INTO appointments (pet_id, client_id, vet_name, type, scheduled_at, status, summary, diagnosis, notes, created_by_admin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING id`,
    [d.petId, pet.owner_id, d.vetName ?? null, d.type, d.scheduledAt ?? null, d.status, d.summary ?? null, d.diagnosis ?? null, d.notes ?? null],
  )
  await run(
    `INSERT INTO medical_records (pet_id, appointment_id, vet_name, record_type, title, description)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [d.petId, lastInsertRowid, d.vetName ?? null, d.type, `Consulta: ${d.type}`, d.summary ?? null],
  )
  await audit(req.sessionUser!.id, 'criar_consulta', 'appointment', lastInsertRowid, `${pet.name} — ${d.type}`)
  res.status(201).json({ appointment: { id: lastInsertRowid } })
})

appointmentsRouter.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const parsed = appointmentSchema.safeParse(req.body)
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
    `UPDATE appointments SET pet_id = $1, client_id = $2, vet_name = $3, type = $4, scheduled_at = $5, status = $6, summary = $7, diagnosis = $8, notes = $9, updated_at = now()
     WHERE id = $10`,
    [d.petId, pet.owner_id, d.vetName ?? null, d.type, d.scheduledAt ?? null, d.status, d.summary ?? null, d.diagnosis ?? null, d.notes ?? null, id],
  )
  await audit(req.sessionUser!.id, 'editar_consulta', 'appointment', id, d.type)
  res.json({ ok: true })
})

appointmentsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  await run('DELETE FROM appointments WHERE id = $1', [id])
  await audit(req.sessionUser!.id, 'remover_consulta', 'appointment', id)
  res.json({ ok: true })
})
