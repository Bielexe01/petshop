import { Router } from 'express'
import { getOne, getAll, run } from '../db.ts'
import { requireClient, requireAdmin, audit } from '../auth.ts'
import { saveUploadedFile, resolveStoragePath } from '../lib/upload.ts'
import { readFileSync } from 'node:fs'

export const documentsRouter = Router()

/* ── Cliente: meus documentos (somente os disponibilizados) ───────────── */

documentsRouter.get('/mine', requireClient, (req, res) => {
  const clientId = req.sessionUser!.id
  const documents = getAll(
    `SELECT d.*, pet.name AS pet_name
     FROM documents d
     LEFT JOIN pets pet ON pet.id = d.pet_id
     WHERE (d.client_id = ? OR d.pet_id IN (SELECT id FROM pets WHERE owner_id = ?))
       AND d.is_available = 1
     ORDER BY d.created_at DESC LIMIT 100`,
    [clientId, clientId],
  )
  res.json({ documents })
})

/* ── Cliente: download/visualização — sempre verificado server-side ───── */

documentsRouter.get('/mine/:id/file', requireClient, (req, res) => {
  const id = Number(req.params.id)
  const doc = getOne<Record<string, unknown>>(
    `SELECT d.* FROM documents d
     WHERE d.id = ?
       AND d.is_available = 1
       AND (d.client_id = ? OR d.pet_id IN (SELECT id FROM pets WHERE owner_id = ?))`,
    [id, req.sessionUser!.id, req.sessionUser!.id],
  )
  if (!doc) {
    res.status(404).json({ message: 'Documento não encontrado.' })
    return
  }
  const abs = resolveStoragePath(String(doc.file_path))
  const buffer = readFileSync(abs)
  res.setHeader('Content-Type', String(doc.mime || 'application/pdf'))
  res.setHeader('Content-Disposition', `inline; filename="${String(doc.file_name).replace(/"/g, '')}"`)
  res.send(buffer)
})

documentsRouter.get('/mine/:id/download', requireClient, (req, res) => {
  const id = Number(req.params.id)
  const doc = getOne<Record<string, unknown>>(
    `SELECT d.* FROM documents d
     WHERE d.id = ?
       AND d.is_available = 1
       AND (d.client_id = ? OR d.pet_id IN (SELECT id FROM pets WHERE owner_id = ?))`,
    [id, req.sessionUser!.id, req.sessionUser!.id],
  )
  if (!doc) {
    res.status(404).json({ message: 'Documento não encontrado.' })
    return
  }
  const abs = resolveStoragePath(String(doc.file_path))
  const buffer = readFileSync(abs)
  res.setHeader('Content-Type', String(doc.mime || 'application/pdf'))
  res.setHeader('Content-Disposition', `attachment; filename="${String(doc.file_name).replace(/"/g, '')}"`)
  res.send(buffer)
})

/* ── Admin: CRUD ──────────────────────────────────────────────────────── */

documentsRouter.get('/', requireAdmin, (_req, res) => {
  const documents = getAll(
    `SELECT d.*, pet.name AS pet_name, pr.full_name AS client_name
     FROM documents d
     LEFT JOIN pets pet ON pet.id = d.pet_id
     LEFT JOIN profiles pr ON pr.user_id = d.client_id
     ORDER BY d.created_at DESC LIMIT 300`,
  )
  res.json({ documents })
})

documentsRouter.get('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const doc = getOne<Record<string, unknown>>(
    `SELECT d.*, pet.name AS pet_name
     FROM documents d LEFT JOIN pets pet ON pet.id = d.pet_id
     WHERE d.id = ?`,
    [id],
  )
  if (!doc) {
    res.status(404).json({ message: 'Documento não encontrado.' })
    return
  }
  res.json({ document: doc })
})

/* Upload: base64 + título + vínculo + disponibilidade */
documentsRouter.post('/', requireAdmin, (req, res) => {
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
    filePath = saveUploadedFile(data, fileName, mime)
  } catch (err) {
    res.status(400).json({ message: err instanceof Error ? err.message : 'Arquivo inválido.' })
    return
  }

  const { lastInsertRowid } = run(
    `INSERT INTO documents (client_id, pet_id, appointment_id, title, type, file_name, file_path, mime, is_available, uploaded_by_admin)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [clientId, petId, appointmentId, title, type, fileName, filePath, mime, isAvailable ? 1 : 0],
  )

  if (clientId) {
    run(
      `INSERT INTO notifications (user_id, title, body, type)
       VALUES (?, 'Novo documento disponível', '${title.replace(/'/g, "''")} já está disponível na sua área do cliente.', 'documento')`,
      [clientId],
    )
  }

  audit(req.sessionUser!.id, 'criar_documento', 'document', Number(lastInsertRowid), title)
  res.status(201).json({ document: { id: Number(lastInsertRowid) } })
})

documentsRouter.put('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const title = String(req.body.title ?? '').trim().slice(0, 200)
  if (!title) {
    res.status(400).json({ message: 'Informe o título do documento.' })
    return
  }
  run(
    `UPDATE documents SET title = ?, type = ?, client_id = ?, pet_id = ?, appointment_id = ?, is_available = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [
      title,
      String(req.body.type ?? 'veterinario').slice(0, 30),
      req.body.clientId ? Number(req.body.clientId) : null,
      req.body.petId ? Number(req.body.petId) : null,
      req.body.appointmentId ? Number(req.body.appointmentId) : null,
      req.body.isAvailable !== false ? 1 : 0,
      id,
    ],
  )
  audit(req.sessionUser!.id, 'editar_documento', 'document', id, title)
  res.json({ ok: true })
})

documentsRouter.delete('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const doc = getOne<{ title: string; file_path: string }>('SELECT title, file_path FROM documents WHERE id = ?', [id])
  if (doc) {
    try {
      const abs = resolveStoragePath(doc.file_path)
      // remove arquivo (soft-delete: não quebrar se o arquivo já não existe)
      const { rmSync } = require('node:fs') as typeof import('node:fs')
      rmSync(abs, { force: true })
    } catch {
      /* arquivo pode já ter sido removido */
    }
  }
  run('DELETE FROM documents WHERE id = ?', [id])
  audit(req.sessionUser!.id, 'remover_documento', 'document', id, doc?.title)
  res.json({ ok: true })
})

/* Usado pelo admin para abrir qualquer documento (auditado) */
documentsRouter.get('/admin/:id/file', requireAdmin, (req, res) => {
  const id = Number(req.params.id)
  const doc = getOne<Record<string, unknown>>('SELECT * FROM documents WHERE id = ?', [id])
  if (!doc) {
    res.status(404).json({ message: 'Documento não encontrado.' })
    return
  }
  audit(req.sessionUser!.id, 'visualizar_documento', 'document', id, String(doc.title))
  const abs = resolveStoragePath(String(doc.file_path))
  const buffer = readFileSync(abs)
  res.setHeader('Content-Type', String(doc.mime || 'application/pdf'))
  res.setHeader('Content-Disposition', `inline; filename="${String(doc.file_name).replace(/"/g, '')}"`)
  res.send(buffer)
})
