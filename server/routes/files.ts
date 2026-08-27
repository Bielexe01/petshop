import { Router } from 'express'
import { requireAuth, requireAdmin } from '../auth.ts'
import { downloadStorageObject } from '../lib/upload.ts'
import { getOne } from '../db.ts'

export const filesRouter = Router()

/**
 * Download de arquivo privado do storage.
 * Acesso: admin sempre; cliente apenas se o arquivo for um documento
 * vinculado ao seu pet/usuário E estiver disponível.
 */
filesRouter.get('/private/*path', requireAuth, async (req, res) => {
  const rel = String(req.params.path)
  if (!rel || !rel.startsWith('docs/')) {
    res.status(400).json({ message: 'Caminho inválido.' })
    return
  }

  // Verificação de ownership para clientes — nunca confiar no caminho
  if (req.sessionUser!.role === 'client') {
    const doc = await getOne<{ client_id: number | null; pet_id: number | null; is_available: boolean }>(
      'SELECT client_id, pet_id, is_available FROM documents WHERE file_path = $1',
      [rel],
    )
    if (!doc || !doc.is_available) {
      res.status(404).json({ message: 'Documento não encontrado.' })
      return
    }
    const clientId = req.sessionUser!.id
    const ownsClient = doc.client_id === clientId
    const ownsPet = doc.pet_id
      ? !!(await getOne<{ id: number }>('SELECT id FROM pets WHERE id = $1 AND owner_id = $2', [doc.pet_id, clientId]))
      : false
    if (!ownsClient && !ownsPet) {
      res.status(403).json({ message: 'Acesso negado.' })
      return
    }
  }

  try {
    const buffer = await downloadStorageObject(rel)
    if (!buffer) {
      res.status(404).json({ message: 'Arquivo não encontrado.' })
      return
    }
    const isPdf = rel.toLowerCase().endsWith('.pdf')
    res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${rel.split('/').pop()}"`)
    res.send(buffer)
  } catch {
    res.status(400).json({ message: 'Caminho inválido.' })
  }
})

/* Admin: baixar qualquer arquivo (auditado) */
filesRouter.get('/admin/*path', requireAdmin, async (req, res) => {
  const rel = String(req.params.path)
  try {
    const buffer = await downloadStorageObject(rel)
    if (!buffer) {
      res.status(404).json({ message: 'Arquivo não encontrado.' })
      return
    }
    res.setHeader('Content-Type', 'application/octet-stream')
    res.setHeader('Content-Disposition', `attachment; filename="${rel.split('/').pop()}"`)
    res.send(buffer)
  } catch {
    res.status(400).json({ message: 'Caminho inválido.' })
  }
})
