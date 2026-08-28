import { Router } from 'express'
import { existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getOne, getAll, run } from '../db.ts'
import { requireScreen, requireAdmin, audit } from '../auth.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PHOTOS_DIR = join(__dirname, '..', '..', 'public', 'photos')

export const photosRouter = Router()

const ACCEPTED = ['.jpg', '.jpeg', '.png', '.webp']

/** Fotos enviadas pelo admin ficam em site_settings (chave `photo:<name>`). */
const photoKey = (name: string) => `photo:${name}`

/** Lê uma foto enviada pelo admin (base64) ou null. */
export async function getAdminPhoto(name: string): Promise<string | null> {
  const row = await getOne<{ value: string | null }>('SELECT value FROM site_settings WHERE key = $1', [photoKey(name)])
  return row?.value || null
}

/**
 * Lista as fotos disponíveis.
 * Prioridade: foto enviada pelo admin (site_settings) > arquivo real em /public/photos.
 * Retorna `{ files: Record<nome-base.ext, url> }` como antes, mas urls do admin
 * são servidas por rota autenticada (`/api/photos/file/:name`) em vez de estática.
 */
photosRouter.get('/', async (_req, res) => {
  const files: Record<string, string> = {}

  // 1) Fotos do admin (site_settings)
  const adminPhotos = await getAll<{ key: string; value: string | null }>(
    `SELECT key, value FROM site_settings WHERE key LIKE 'photo:%'`,
  )
  for (const row of adminPhotos) {
    if (!row.value) continue
    const name = row.key.slice('photo:'.length)
    files[`admin:${name}`] = `/api/photos/file/${encodeURIComponent(name)}`
  }

  // 2) Arquivos reais em /public/photos (estáticos, embarcados no deploy)
  try {
    if (existsSync(PHOTOS_DIR)) {
      for (const f of readdirSync(PHOTOS_DIR)) {
        const ext = f.toLowerCase().slice(f.lastIndexOf('.'))
        if (ACCEPTED.includes(ext)) {
          files[f] = `/photos/${f}`
        }
      }
    }
  } catch {
    /* sem fotos públicas */
  }

  res.json({ files, dir: PHOTOS_DIR })
})

/** Serve uma foto enviada pelo admin (base64). */
photosRouter.get('/file/:name', async (req, res) => {
  const name = String(req.params.name).replace(/\.\./g, '').slice(0, 80)
  const value = await getAdminPhoto(name)
  if (!value) {
    res.status(404).json({ message: 'Foto não encontrada.' })
    return
  }
  const match = /^data:([^;]+);base64,/.exec(value)
  const base64 = match ? value.slice(match[0].length) : value
  const mime = match ? match[1] : 'image/jpeg'
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : ''
  const types: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }
  const buf = Buffer.from(base64, 'base64')
  res.setHeader('Content-Type', types[ext] ?? mime)
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.send(buf)
})

/* ── Admin: upload / remoção de foto ────────────────────────────────── */

const MAX_IMG = 2 * 1024 * 1024 // 2 MB
const ALLOWED_IMG = ['image/jpeg', 'image/png', 'image/webp']
const VALID_NAMES = new Set([
  'fachada', 'fachada-2', 'equipe', 'equipe-2', 'atendimento', 'animais',
  'ambiente', 'doutora', 'recepcao', 'pet-thor', 'pet-luna',
])

/** Upload de foto (base64 via JSON) — substitui a atual se existir. */
photosRouter.post('/admin', requireAdmin, async (req, res) => {
  const name = String(req.body?.name ?? '').trim().slice(0, 60)
  const data = String(req.body?.data ?? '')
  const mime = String(req.body?.mime ?? '')

  if (!VALID_NAMES.has(name)) {
    res.status(400).json({ message: 'Nome de foto inválido.' })
    return
  }
  if (!ALLOWED_IMG.includes(mime)) {
    res.status(400).json({ message: 'Formato de imagem não suportado (use JPG, PNG ou WebP).' })
    return
  }
  const match = /^data:([^;]+);base64,(.+)$/.exec(data)
  const base64 = match ? match[2] : data
  const buf = Buffer.from(base64, 'base64')
  if (buf.length === 0 || buf.length > MAX_IMG) {
    res.status(400).json({ message: 'Imagem inválida ou maior que 2 MB.' })
    return
  }

  const value = `data:${mime};base64,${base64}`
  await run(
    `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [photoKey(name), value],
  )
  await audit(req.sessionUser!.id, 'editar_foto', 'site', 0, `Foto "${name}" atualizada`)
  res.json({ ok: true, name })
})

/** Remove a foto enviada pelo admin (volta ao fallback / arquivo público). */
photosRouter.delete('/admin/:name', requireAdmin, async (req, res) => {
  const name = String(req.params.name).replace(/\.\./g, '').slice(0, 60)
  if (!VALID_NAMES.has(name)) {
    res.status(400).json({ message: 'Nome de foto inválido.' })
    return
  }
  await run('DELETE FROM site_settings WHERE key = $1', [photoKey(name)])
  await audit(req.sessionUser!.id, 'remover_foto', 'site', 0, `Foto "${name}" removida`)
  res.json({ ok: true, name })
})

/** Lista as fotos que o admin pode trocar, com a atual (se houver). */
photosRouter.get('/admin', requireScreen('fotos'), async (_req, res) => {
  const rows = await getAll<{ key: string; value: string | null }>(
    `SELECT key, value FROM site_settings WHERE key LIKE 'photo:%'`,
  )
  const byName = new Map(rows.map((r) => [r.key.slice('photo:'.length), r.value]))
  const photos = [...VALID_NAMES].map((name) => ({
    name,
    uploaded: byName.get(name) != null,
    url: byName.get(name) ? `/api/photos/file/${encodeURIComponent(name)}` : null,
  }))
  res.json({ photos })
})
