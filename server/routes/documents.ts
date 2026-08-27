import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'
import { saveUploadedFile, downloadStorageObject, removeStorageObject } from '../lib/upload.ts'

export const documentsRouter = Router()

/* ── Cliente: meus documentos (somente os disponibilizados) ───────────── */

documentsRouter.get('/mine', requireClient, async (req, res) => {
  const clientId = req.sessionUser!.id
  const documents = await getAll(
    `SELECT d.*, pet.name AS pet_name
     FROM documents d
     LEFT JOIN pets pet ON pet.id = d.pet_id
     WHERE (d.client_id = $1 OR d.pet_id IN (SELECT id FROM pets WHERE owner_id = $1))
       AND d.is_available = true
     ORDER BY d.created_at DESC LIMIT 100`,
    [clientId],
  )
  res.json({ documents })
})

/* ── Cliente: download/visualização — sempre verificado server-side ───── */

documentsRouter.get('/mine/:id/file', requireClient, async (req, res) => {
  const id = Number(req.params.id)
  const doc = await getOne<Record<string, unknown>>(
    `SELECT d.* FROM documents d
     WHERE d.id = $1
       AND d.is_available = true
       AND (d.client_id = $2 OR d.pet_id IN (SELECT id FROM pets WHERE owner_id = $2))`,
    [id, req.sessionUser!.id],
  )
  if (!doc) {
    res.status(404).json({ message: 'Documento não encontrado.' })
    return
  }
  const buffer = await downloadStorageObject(String(doc.file_path))
  if (!buffer) {
    res.status(404).json({ message: 'Arquivo não encontrado.' })
    return
  }
  res.setHeader('Content-Type', String(doc.mime || 'application/pdf'))
  res.setHeader('Content-Disposition', `inline; filename="${String(doc.file_name).replace(/"/g, '')}"`)
  res.send(buffer)
})

documentsRouter.get('/mine/:id/download', requireClient, async (req, res) => {
  const id = Number(req.params.id)
  const doc = await getOne<Record<string, unknown>>(
    `SELECT d.* FROM documents d
     WHERE d.id = $1
       AND d.is_available = true
       AND (d.client_id = $2 OR d.pet_id IN (SELECT id FROM pets WHERE owner_id = $2))`,
    [id, req.sessionUser!.id],
  )
  if (!doc) {
    res.status(404).json({ message: 'Documento não encontrado.' })
    return
  }
  const buffer = await downloadStorageObject(String(doc.file_path))
  if (!buffer) {
    res.status(404).json({ message: 'Arquivo não encontrado.' })
    return
  }
  res.setHeader('Content-Type', String(doc.mime || 'application/pdf'))
  res.setHeader('Content-Disposition', `attachment; filename="${String(doc.file_name).replace(/"/g, '')}"`)
  res.send(buffer)
})

/* ── Admin: CRUD ──────────────────────────────────────────────────────── */

documentsRouter.get('/', requireAdmin, async (_req, res) => {
  const documents = await getAll(
    `SELECT d.*, pet.name AS pet_name, pr.full_name AS client_name
     FROM documents d
     LEFT JOIN pets pet ON pet.id = d.pet_id
     LEFT JOIN profiles pr ON pr.user_id = d.client_id
     ORDER BY d.created_at DESC LIMIT 300`,
  )
  res.json({ documents })
})

documentsRouter.get('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const doc = await getOne<Record<string, unknown>>(
    `SELECT d.*, pet.name AS pet_name
     FROM documents d LEFT JOIN pets pet ON pet.id = d.pet_id
     WHERE d.id = $1`,
    [id],
  )
  if (!doc) {
    res.status(404).json({ message: 'Documento não encontrado.' })
    return
  }
  res.json({ document: doc })
})

/* Upload: base64 + título + vínculo + disponibilidade */
documentsRouter.post('/', requireAdmin, async (req, res) => {
  const title = String(req.body.title ?? '').trim().slice(0, 200)
  const type = String(req.body.type ?? 'veterinario').slice(0, 30)
  const clientId = req.body.clientId ? Number(req.body.clientId) : null
  const petId = req.body.petId ? Number(req.body.petId) : null
  const appointmentId = req.body.appointmentId ? Number(req.body.appointmentId) : null
  const isAvailable = req.body.isAvailable !== false
  const fileName = String(req.body.fileName ?? 'documento.pdf')
  const mime = String(req.body.mime ?? 'application/pdf')
  const data = String(req.body.data ?? '')

  if (!title) {
    res.status(400).json({ message: 'Informe o título do documento.' })
    return
  }
  if (!data) {
    res.status(400).json({ message: 'Selecione um arquivo.' })
    return
  }

  let filePath: string
  try {
    filePath = await saveUploadedFile(data, fileName, mime)
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : 'Arquivo inválido.' })
    return
  }

  const { lastInsertRowid } = await run(
    `INSERT INTO documents (client_id, pet_id, appointment_id, title, type, file_name, file_path, mime, is_available, uploaded_by_admin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true) RETURNING id`,
    [clientId, petId, appointmentId, title, type, fileName, filePath, mime, isAvailable],
  )

  if (clientId) {
    await run(
      `INSERT INTO notifications (user_id, title, body, type)
       VALUES ($1, 'Novo documento disponível', $2, 'documento')`,
      [clientId, `${title} já está disponível na sua área do cliente.`],
    )
  }

  await audit(req.sessionUser!.id, 'criar_documento', 'document', lastInsertRowid, title)
  res.status(201).json({ document: { id: lastInsertRowid } })
})

documentsRouter.put('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const title = String(req.body.title ?? '').trim().slice(0, 200)
  if (!title) {
    res.status(400).json({ message: 'Informe o título do documento.' })
    return
  }
  await run(
    `UPDATE documents SET title = $1, type = $2, client_id = $3, pet_id = $4, appointment_id = $5, is_available = $6, updated_at = now()
     WHERE id = $7`,
    [
      title,
      String(req.body.type ?? 'veterinario').slice(0, 30),
      req.body.clientId ? Number(req.body.clientId) : null,
      req.body.petId ? Number(req.body.petId) : null,
      req.body.appointmentId ? Number(req.body.appointmentId) : null,
      req.body.isAvailable !== false,
      id,
    ],
  )
  await audit(req.sessionUser!.id, 'editar_documento', 'document', id, title)
  res.json({ ok: true })
})

documentsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const doc = await getOne<{ title: string; file_path: string }>('SELECT title, file_path FROM documents WHERE id = $1', [id])
  if (doc) {
    // remove arquivo (soft-delete: não quebrar se o arquivo já não existe)
    await removeStorageObject(doc.file_path)
  }
  await run('DELETE FROM documents WHERE id = $1', [id])
  await audit(req.sessionUser!.id, 'remover_documento', 'document', id, doc?.title ?? undefined)
  res.json({ ok: true })
})

/* Usado pelo admin para abrir qualquer documento (auditado) */
documentsRouter.get('/admin/:id/file', requireAdmin, async (req, res) => {
  const id = Number(req.params.id)
  const doc = await getOne<Record<string, unknown>>('SELECT * FROM documents WHERE id = $1', [id])
  if (!doc) {
    res.status(404).json({ message: 'Documento não encontrado.' })
    return
  }
  await audit(req.sessionUser!.id, 'visualizar_documento', 'document', id, String(doc.title))
  const buffer = await downloadStorageObject(String(doc.file_path))
  if (!buffer) {
    res.status(404).json({ message: 'Arquivo não encontrado.' })
    return
  }
  res.setHeader('Content-Type', String(doc.mime || 'application/pdf'))
  res.setHeader('Content-Disposition', `inline; filename="${String(doc.file_name).replace(/"/g, '')}"`)
  res.send(buffer)
})
