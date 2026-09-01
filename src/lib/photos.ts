/**
 * Manifesto de fotos da clínica.
 *
 * As fotos reais devem ser colocadas em /public/photos/ com os nomes abaixo
 * (extensão .jpg .jpeg .png .webp). O servidor expõe `GET /api/photos` com a
 * lista de arquivos presentes; o componente <Photo> renderiza o <img> quando o
 * arquivo existe e um placeholder de marca enquanto não existe — a página
 * nunca quebra e as fotos entram automaticamente quando forem adicionadas.
 */

export type PhotoKey =
  | 'fachada'
  | 'fachada-2'
  | 'equipe'
  | 'equipe-2'
  | 'atendimento'
  | 'animais'
  | 'ambiente'
  | 'doutora'
  | 'recepcao'
  | 'pet-thor'
  | 'pet-luna'

export interface PhotoSpec {
  key: PhotoKey
  /** legenda exibida no placeholder de marca e como alt fallback */
  label: string
  /** usado como alt semântico */
  alt: string
  /** nome-base do arquivo (extensão é detectada) */
  file: string
}

export const PHOTO_MANIFEST: Record<PhotoKey, PhotoSpec> = {
  fachada: { key: 'fachada', label: 'Fachada da clínica', alt: 'Fachada da Sua CLinica com blocos coloridos', file: 'fachada' },
  'fachada-2': { key: 'fachada-2', label: 'Fachada — detalhe', alt: 'Detalhe colorido da fachada da clínica', file: 'fachada-2' },
  equipe: { key: 'equipe', label: 'Equipe da clínica', alt: 'Equipe da clínica com uniformes rosa', file: 'equipe' },
  'equipe-2': { key: 'equipe-2', label: 'Equipe — atendimento', alt: 'Equipe da clínica em atendimento', file: 'equipe-2' },
  atendimento: { key: 'atendimento', label: 'Atendimento', alt: 'Atendimento veterinário na clínica', file: 'atendimento' },
  animais: { key: 'animais', label: 'Nossos pacientes', alt: 'Animais sendo cuidados na clínica', file: 'animais' },
  ambiente: { key: 'ambiente', label: 'Ambiente da clínica', alt: 'Ambiente interno colorido e acolhedor da clínica', file: 'ambiente' },
  doutora: { key: 'doutora', label: 'Sua CLinica', alt: 'Sua CLinica', file: 'doutora' },
  recepcao: { key: 'recepcao', label: 'Recepção', alt: 'Recepção da clínica', file: 'recepcao' },
  'pet-thor': { key: 'pet-thor', label: 'Thor', alt: 'Thor, Golden Retriever', file: 'pet-thor' },
  'pet-luna': { key: 'pet-luna', label: 'Luna', alt: 'Luna, gata SRD', file: 'pet-luna' },
}

const ACCEPTED_EXT = ['jpg', 'jpeg', 'png', 'webp']

interface ServerManifest {
  files: Record<string, string>
}

export interface Manifest {
  /** key → URL pública da foto presente em /public/photos */
  available: Partial<Record<PhotoKey, string>>
}

let manifestCache: Manifest | null = null
let manifestPromise: Promise<Manifest> | null = null

async function loadManifest(): Promise<Manifest> {
  if (manifestPromise) return manifestPromise
  manifestPromise = fetch('/api/photos', { credentials: 'include' })
    .then((r) => (r.ok ? (r.json() as Promise<ServerManifest>) : Promise.resolve({ files: {} })))
    .catch(() => ({ files: {} }))
    .then((server) => {
      // Fotos enviadas pelo admin (chave `admin:<nome>`) têm prioridade;
      // senão, procura o arquivo real em /public/photos (nome.ext).
      const files: Record<string, string> = server.files ?? {}
      const available: Manifest['available'] = {}
      for (const spec of Object.values(PHOTO_MANIFEST)) {
        const adminUrl = files[`admin:${spec.file}`]
        if (adminUrl) {
          available[spec.key] = adminUrl
          continue
        }
        for (const ext of ACCEPTED_EXT) {
          const url = files[`${spec.file}.${ext}`]
          if (url) {
            available[spec.key] = url
            break
          }
        }
      }
      manifestCache = { available }
      return manifestCache
    })
  return manifestPromise
}

/** Caminho resolvido para a foto, ou null se o arquivo ainda não foi fornecido. */
export async function resolvePhoto(key: PhotoKey): Promise<string | null> {
  const manifest = await loadManifest()
  return manifest.available[key] ?? null
}

/** Verdadeiro se o manifest já carregou e sabe que a foto existe (render síncrono). */
export function hasPhotoCached(key: PhotoKey): boolean {
  return manifestCache?.available[key] != null
}

/** Força recarga do manifest (ex.: após o usuário adicionar fotos). */
export function refreshPhotos(): Promise<Manifest> {
  manifestPromise = null
  manifestCache = null
  return loadManifest()
}
