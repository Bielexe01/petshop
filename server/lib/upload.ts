import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Fora de server/ para não disparar restart do --watch quando arquivos são
// salvos no upload (server/storage ficaria dentro da pasta observada).
export const STORAGE_DIR = process.env.STORAGE_DIR ?? join(__dirname, '..', '..', 'storage')

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIME: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'text/plain': ['.txt'],
}

/**
 * Persiste um arquivo enviado (base64 via JSON) no storage privado.
 * Retorna o caminho relativo ao storage (ex.: `docs/uuid.pdf`).
 * Nunca exposto publicamente — servido apenas pela rota autenticada.
 */
export function saveUploadedFile(dataBase64: string, fileName: string, mime: string): string {
  const allowedExts = ALLOWED_MIME[mime]
  if (!allowedExts) {
    throw new Error(`Tipo de arquivo não permitido (${mime}).`)
  }
  const ext = extname(fileName.toLowerCase())
  if (!ext || !allowedExts.includes(ext)) {
    throw new Error(`Extensão do arquivo incompatível com ${mime}.`)
  }

  const buffer = Buffer.from(dataBase64, 'base64')
  if (buffer.length === 0) throw new Error('Arquivo vazio.')
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error('Arquivo maior que 10 MB.')
  }

  const dir = join(STORAGE_DIR, 'docs')
  mkdirSync(dir, { recursive: true })
  const safeName = `${randomUUID()}${ext}`
  const rel = `docs/${safeName}`
  writeFileSync(join(STORAGE_DIR, rel), buffer)

  return rel
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2 MB

const ALLOWED_IMG_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

/**
 * Persiste uma imagem (base64) no storage privado (pasta `petphotos/`).
 * Retorna o caminho relativo ao storage — nunca público, servido apenas
 * pela rota autenticada. Usado para fotos de pets.
 */
export function saveImage(dataBase64: string, mime: string): string {
  const ext = ALLOWED_IMG_MIME[mime]
  if (!ext) {
    throw new Error('Formato de imagem não suportado (use JPG, PNG ou WebP).')
  }
  const buffer = Buffer.from(dataBase64, 'base64')
  if (buffer.length === 0) throw new Error('Imagem vazia.')
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('A imagem deve ter no máximo 2 MB.')
  }

  const dir = join(STORAGE_DIR, 'petphotos')
  mkdirSync(dir, { recursive: true })
  const safeName = `${randomUUID()}${ext}`
  const rel = `petphotos/${safeName}`
  writeFileSync(join(STORAGE_DIR, rel), buffer)

  return rel
}

/** Caminho absoluto de um arquivo do storage (validado contra path traversal). */
export function resolveStoragePath(relPath: string): string {
  const abs = join(STORAGE_DIR, relPath)
  const root = join(STORAGE_DIR) + (process.platform === 'win32' ? '\\' : '/')
  if (!abs.startsWith(root)) throw new Error('Caminho inválido.')
  return abs
}
