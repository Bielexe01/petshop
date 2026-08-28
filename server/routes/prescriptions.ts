import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { prescriptionSchema } from '../lib/validation.ts'
import { requireClient, requireScreen, requireAdmin, audit } from '../auth.ts'
import { renderPdf, type PdfBlock } from '../lib/pdf.ts'

export const prescriptionsRouter = Router()

async function fetchPrescription(id: number) {
  return getOne<Record<string, unknown>>(
    `SELECT p.*, pet.name AS pet_name, pet.species AS pet_species, pr.full_name AS client_name,
            pet.owner_id AS pet_owner_id
     FROM prescriptions p
     JOIN pets pet ON pet.id = p.pet_id
     LEFT JOIN profiles pr ON pr.user_id = p.client_id
     WHERE p.id = $1`,
    [id],
  )
}

async function fetchItems(id: number) {
  return getAll<Record<string, unknown>>(
    'SELECT * FROM prescription_items WHERE prescription_id = $1 ORDER BY id',
    [id],
  )
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('pt-BR')
}

function buildPrescriptionPdf(prescription: Record<string, unknown>, items: Record<string, unknown>[]): Buffer {
  const petName = String(prescription.pet_name ?? 'Pet')
  const clientName = String(prescription.client_name ?? 'Cliente')
  const vetName = String(prescription.vet_name ?? 'Dr.ª Cássia Carvalho')

  const blocks: PdfBlock[] = [
    { type: 'text', value: '<b>Paciente:</b>', size: 10.5, color: '#17202A', gap: 0 },
    { type: 'text', value: `<b>${petName}</b> — ${formatDate(prescription.birth_date as string)} · Cliente: ${clientName}`, size: 10.5, color: '#17202A', spaceAfter: 10 },
    { type: 'text', value: `<b>Médica responsável:</b> ${vetName}`, size: 10.5, color: '#17202A', spaceAfter: 14 },
    { type: 'rect', x: 48, y: 0, w: 499, h: 2, color: '#E83E8C' },
    { type: 'text', value: 'PRESCRIÇÃO', size: 15, color: '#E83E8C', spaceBefore: 16, spaceAfter: 12 },
  ]

  items.forEach((item, idx) => {
    blocks.push({
      type: 'text',
      value: `${idx + 1}. <b>${item.medication_name}</b>`,
      size: 11.5,
      color: '#17202A',
      spaceAfter: 4,
    })
    const details = [
      item.dosage ? `<i>Dosagem:</i> ${item.dosage}` : '',
      item.frequency ? `<i>Frequência:</i> ${item.frequency}` : '',
      item.duration ? `<i>Duração:</i> ${item.duration}` : '',
      item.notes ? `<i>Observações:</i> ${item.notes}` : '',
    ]
      .filter(Boolean)
      .join('  ·  ')
    if (details) blocks.push({ type: 'text', value: details, size: 10, color: '#2c3e50', spaceAfter: 12 })
  })

  if (prescription.instructions) {
    blocks.push({ type: 'text', value: '<b>Instruções:</b>', size: 10.5, color: '#17202A', spaceBefore: 10, spaceAfter: 4 })
    blocks.push({ type: 'text', value: String(prescription.instructions), size: 10.5, color: '#17202A', spaceAfter: 12 })
  }

  blocks.push(
    { type: 'text', value: `<b>Validade:</b> ${formatDate(prescription.valid_until as string)}`, size: 10, color: '#2c3e50', spaceAfter: 20 },
    { type: 'rect', x: 48, y: 0, w: 200, h: 2, color: '#19B7C8' },
  )

  return renderPdf(blocks, {
    title: 'RECEITA',
    subtitle: `Emitida em ${formatDate(prescription.issued_at as string)}`,
  })
}

/* ── Cliente: minhas receitas ─────────────────────────────────────────── */

prescriptionsRouter.get('/mine', requireClient, async (req, res) => {
  const prescriptions = await getAll(
    `SELECT p.*, pet.name AS pet_name
     FROM prescriptions p JOIN pets pet ON pet.id = p.pet_id
     WHERE p.client_id = $1
     ORDER BY p.issued_at DESC LIMIT 100`,
    [req.sessionUser!.id],
  )
  res.json({ prescriptions })
})

prescriptionsRouter.get('/mine/:id', requireClient, async (req, res) => {
  const id = Number(req.params.id)
  const prescription = await fetchPrescription(id)
  if (!prescription || prescription.pet_owner_id !== req.sessionUser!.id) {
    res.status(404).json({ message: 'Receita não encontrada.' })
    return
  }
  const items = await fetchItems(id)
  res.json({ prescription, items })
})

prescriptionsRouter.get('/mine/:id/pdf', requireClient, async (req, res) => {
  const id = Number(req.params.id)
  const prescription = await fetchPrescription(id)
  if (!prescription || prescription.pet_owner_id !== req.sessionUser!.id) {
    res.status(404).json({ message: 'Receita não encontrada.' })
    return
  }
  const items = await fetchItems(id)
  const pdf = buildPrescriptionPdf(prescription, items)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="receita-${id}.pdf"`)
  res.send(pdf)
})

prescriptionsRouter.get('/mine/:id/download', requireClient, async (req, res) => {
  const id = Number(req.params.id)
  const prescription = await fetchPrescription(id)
  if (!prescription || prescription.pet_owner_id !== req.sessionUser!.id) {
    res.status(404).json({ message: 'Receita não encontrada.' })
    return
  }
  const items = await fetchItems(id)
  const pdf = buildPrescriptionPdf(prescription, items)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="receita-${id}.pdf"`)
  res.send(pdf)
})

/* ── Admin: CRUD ──────────────────────────────────────────────────────── */

prescriptionsRouter.get('/', requireScreen('receitas'), async (_req, res) => {
  const prescriptions = await getAll(
    `SELECT p.*, pet.name AS pet_name, pr.full_name AS client_name
     FROM prescriptions p
     JOIN pets pet ON pet.id = p.pet_id
     LEFT JOIN profiles pr ON pr.user_id = p.client_id
     ORDER BY p.issued_at DESC LIMIT 300`,
  )
  res.json({ prescriptions })
})

prescriptionsRouter.get('/:id', requireAdmin, async (_req, res) => {
  const id = Number(_req.params.id)
  const prescription = await fetchPrescription(id)
  if (!prescription) {
    res.status(404).json({ message: 'Receita não encontrada.' })
    return
  }
  const items = await fetchItems(id)
  res.json({ prescription, items })
})

prescriptionsRouter.get('/:id/pdf', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const prescription = await fetchPrescription(id)
  if (!prescription) {
    res.status(404).json({ message: 'Receita não encontrada.' })
    return
  }
  const items = await fetchItems(id)
  const pdf = buildPrescriptionPdf(prescription, items)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename="receita-${id}.pdf"`)
  res.send(pdf)
})

prescriptionsRouter.post('/', requireAdmin, async (req, res) => {
  const parsed = prescriptionSchema.safeParse(req.body)
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

  // issued_at é NOT NULL no schema. Aqui, no Postgres, usamos now() como
  // default e só enviamos um valor quando informado pelo admin.
  const withIssuedAt = Boolean(d.issuedAt)
  const { lastInsertRowid } = await run(
    `INSERT INTO prescriptions (pet_id, client_id, appointment_id, vet_name, ${withIssuedAt ? 'issued_at, ' : ''}valid_until, instructions, created_by_admin)
     VALUES ($1, $2, $3, $4, ${withIssuedAt ? '$5, ' : ''}$6, $7, true) RETURNING id`,
    withIssuedAt
      ? [d.petId, pet.owner_id, d.appointmentId ? Number(d.appointmentId) : null, d.vetName ?? null, d.issuedAt!, d.validUntil ?? null, d.instructions ?? null]
      : [d.petId, pet.owner_id, d.appointmentId ? Number(d.appointmentId) : null, d.vetName ?? null, d.validUntil ?? null, d.instructions ?? null],
  )
  for (const item of d.items) {
    await run(
      `INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [lastInsertRowid, item.medicationName, item.dosage ?? null, item.frequency ?? null, item.duration ?? null, item.notes ?? null],
    )
  }
  await audit(req.sessionUser!.id, 'criar_receita', 'prescription', lastInsertRowid, pet.name)
  res.status(201).json({ prescription: { id: lastInsertRowid } })
})

prescriptionsRouter.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const parsed = prescriptionSchema.safeParse(req.body)
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
  const keepIssuedAt = d.issuedAt == null
    ? (await getOne<{ issued_at: string }>('SELECT issued_at FROM prescriptions WHERE id = $1', [id]))?.issued_at ?? null
    : d.issuedAt
  await run(
    `UPDATE prescriptions SET pet_id = $1, client_id = $2, appointment_id = $3, vet_name = $4, issued_at = $5, valid_until = $6, instructions = $7, updated_at = now()
     WHERE id = $8`,
    [d.petId, pet.owner_id, d.appointmentId ? Number(d.appointmentId) : null, d.vetName ?? null, keepIssuedAt, d.validUntil ?? null, d.instructions ?? null, id],
  )
  await run('DELETE FROM prescription_items WHERE prescription_id = $1', [id])
  for (const item of d.items) {
    await run(
      `INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, item.medicationName, item.dosage ?? null, item.frequency ?? null, item.duration ?? null, item.notes ?? null],
    )
  }
  await audit(req.sessionUser!.id, 'editar_receita', 'prescription', id)
  res.json({ ok: true })
})

prescriptionsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  await run('DELETE FROM prescriptions WHERE id = $1', [id])
  await audit(req.sessionUser!.id, 'remover_receita', 'prescription', id)
  res.json({ ok: true })
})
