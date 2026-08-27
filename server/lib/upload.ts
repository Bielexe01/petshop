import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { extname } from 'node:path'
import { randomUUID } from 'node:crypto'

/* ────────────────────────────────────────────────────────────────────────
   Storage — Supabase Storage (object storage).
   Buckets: `docs` (privado) e `petphotos` (privado). Os arquivos nunca são
   servidos por URL pública direta: passam por rotas autenticadas que fazem
   a verificação de ownership no servidor.
   ──────────────────────────────────────────────────────────────────────── */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_MIME: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'text/plain': ['.txt'],
}

let client: SupabaseClient | null = null

/** Cliente do Supabase (Storage) — usa a service role key. */
function storage(): SupabaseClient {
  if (client) return client
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Faltando SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Configure no .env e nas env vars do Vercel.',
    )
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return client
}

/**
 * Persiste um arquivo enviado (base64 via JSON) no bucket `docs`.
 * Retorna a chave do objeto (ex.: `docs/uuid.pdf`), que é o que fica
 * gravado em `documents.file_path`. Nunca exposto publicamente — servido
 * apenas pela rota autenticada.
 */
export async function saveUploadedFile(dataBase64: string, fileName: string, mime: string): Promise<string> {
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

  const safeName = `${randomUUID()}${ext}`
  const rel = `docs/${safeName}`
  const { error } = await storage().storage.from('docs').upload(safeName, buffer, {
    contentType: mime,
    cacheControl: '3600',
  })
  if (error) {
    throw new Error(`Falha ao enviar arquivo (${error.message}).`)
  }
  return rel
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2 MB

const ALLOWED_IMG_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

/**
 * Persiste uma imagem (base64) no bucket `petphotos`.
 * Retorna a chave do objeto (`petphotos/<nome>`). Privado — servido apenas
 * pela rota autenticada. Usado para fotos de pets.
 */
export async function saveImage(dataBase64: string, mime: string): Promise<string> {
  const ext = ALLOWED_IMG_MIME[mime]
  if (!ext) {
    throw new Error('Formato de imagem não suportado (use JPG, PNG ou WebP).')
  }
  const buffer = Buffer.from(dataBase64, 'base64')
  if (buffer.length === 0) throw new Error('Imagem vazia.')
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('A imagem deve ter no máximo 2 MB.')
  }

  const safeName = `${randomUUID()}${ext}`
  const rel = `petphotos/${safeName}`
  const { error } = await storage().storage.from('petphotos').upload(safeName, buffer, {
    contentType: mime,
    cacheControl: '3600',
  })
  if (error) {
    throw new Error(`Falha ao enviar imagem (${error.message}).`)
  }
  return rel
}

/** Remove um objeto do storage. Não lança se já não existir. */
export async function removeStorageObject(relPath: string): Promise<void> {
  const [bucket, ...rest] = relPath.split('/')
  const path = rest.join('/')
  if (!bucket || !path) return
  const { error } = await storage().storage.from(bucket).remove([path])
  if (error && error.message !== 'The resource was not found') {
    // Arquivo pode já ter sido removido — não quebrar o fluxo.
  }
}

/** Baixa o conteúdo de um objeto do storage (Buffer). */
export async function downloadStorageObject(relPath: string): Promise<Buffer | null> {
  const [bucket, ...rest] = relPath.split('/')
  const path = rest.join('/')
  if (!bucket || !path) return null
  const { data, error } = await storage().storage.from(bucket).download(path)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

/**
 * Gera uma URL assinada temporária para um objeto do storage.
 * Usado só como fallback/imagem em navegador quando não há rota própria.
 */
export async function signStorageUrl(relPath: string, expiresIn = 60): Promise<string | null> {
  const [bucket, ...rest] = relPath.split('/')
  const path = rest.join('/')
  if (!bucket || !path) return null
  const { data, error } = await storage().storage.from(bucket).createSignedUrl(path, expiresIn)
  if (error || !data) return null
  return data.signedUrl
}

/** Mantém compatibilidade: era o caminho absoluto no disco local. */
export function resolveStoragePath(relPath: string): string {
  return relPath
}
