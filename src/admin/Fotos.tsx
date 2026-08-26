import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { refreshPhotos } from '@/lib/photos'
import { PHOTO_MANIFEST, type PhotoKey } from '@/lib/photos'
import { PageHeader, Card, Badge, SearchInput, EmptyState } from '@/admin/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'
import { PawIcon } from '@/components/ui/icons'

interface PhotoState {
  name: PhotoKey
  uploaded: boolean
  url: string | null
  label: string
}

const MAX_IMG = 2 * 1024 * 1024 // 2 MB

/**
 * Troca as fotos do site pela equipe: cada chave do manifesto vira um card
 * com visualização atual, upload (JPG/PNG/WebP ≤ 2 MB) e reset para o
 * arquivo original de /public/photos. Tudo fica gravado no banco
 * (site_settings) e passa a valer no landing em todo o site imediatamente.
 */
export default function Fotos() {
  const [photos, setPhotos] = useState<PhotoState[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const { query, setQuery, filtered: filteredPhotos } = useSearchFilter(photos, (p) => [PHOTO_MANIFEST[p.name]?.label ?? '', p.name])

  const load = () => {
    api
      .get<{ photos: PhotoState[] }>('/api/photos/admin')
      .then((r) => setPhotos(r.photos.map((p) => ({ ...p, label: PHOTO_MANIFEST[p.name]?.label ?? p.name }))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const toast = (msg: string, isError = false) => {
    if (isError) {
      setError(msg)
      setSuccess('')
    } else {
      setSuccess(msg)
      setError('')
    }
    window.setTimeout(() => {
      setError('')
      setSuccess('')
    }, 4000)
  }

  const onFile = (p: PhotoState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMG) {
      toast('A imagem deve ter no máximo 2 MB.', true)
      if (fileRefs.current[p.name]) fileRefs.current[p.name]!.value = ''
      return
    }
    setBusy(p.name)
    setError('')
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const dataUrl = String(reader.result ?? '')
        const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
        await api.post('/api/photos/admin', {
          name: p.name,
          mime: file.type || 'image/jpeg',
          data: base64,
        })
        await refreshPhotos()
        load()
        toast(`Foto "${p.label}" atualizada.`)
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Não foi possível enviar a foto.', true)
      } finally {
        setBusy(null)
        if (fileRefs.current[p.name]) fileRefs.current[p.name]!.value = ''
      }
    }
    reader.onerror = () => {
      toast('Não foi possível ler o arquivo.', true)
      setBusy(null)
    }
    reader.readAsDataURL(file)
  }

  const reset = async (p: PhotoState) => {
    if (!window.confirm(`Voltar a foto "${p.label}" ao arquivo original?`)) return
    setBusy(p.name)
    setError('')
    try {
      await api.del(`/api/photos/admin/${encodeURIComponent(p.name)}`)
      await refreshPhotos()
      load()
      toast(`Foto "${p.label}" restaurada.`)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Não foi possível restaurar a foto.', true)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Fotos do site"
        subtitle="Troque as fotos exibidas na página inicial. A troca vale imediatamente em todo o site."
      />

      {(error || success) && (
        <p
          role="alert"
          className={
            error
              ? 'mb-6 rounded-xl border border-magenta/25 bg-magenta/8 px-4 py-3 text-sm font-medium text-magenta'
              : 'mb-6 rounded-xl border border-verde/30 bg-verde-claro px-4 py-3 text-sm font-medium text-verde'
          }
        >
          {error || success}
        </p>
      )}

      <div className="mb-6 max-w-md">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por foto (ex.: fachada, doutora)…" />
      </div>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-dark/5" />
          ))}
        </div>
      ) : filteredPhotos.length === 0 ? (
        <EmptyStateForFotos query={query} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPhotos.map((p) => {
            const spec = PHOTO_MANIFEST[p.name]
            return (
              <Card key={p.name} className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-[13px] font-black uppercase tracking-tight text-dark">{spec.label}</p>
                  <Badge tone={p.uploaded ? 'magenta' : 'gray'}>{p.uploaded ? 'Personalizada' : 'Original'}</Badge>
                </div>

                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-cream">
                  {p.url ? (
                    <img
                      key={p.url}
                      src={p.url}
                      alt={spec.alt}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="relative flex h-full w-full items-end justify-start overflow-hidden">
                      <span className="absolute -right-6 -top-8 h-28 w-28 rotate-12 rounded-3xl bg-magenta/70" />
                      <span className="absolute right-14 top-10 h-16 w-16 rounded-full bg-turquesa/70" />
                      <span className="absolute bottom-6 right-6 h-11 w-11 rounded-2xl bg-azul/70" />
                      <span className="absolute left-4 top-4 text-white/70">
                        <PawIcon className="h-7 w-7" />
                      </span>
                      <span className="relative z-10 m-3 rounded-full bg-dark/55 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-white">
                        Sem foto
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-auto flex items-center gap-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-turquesa/40 px-4 py-2.5 font-display text-[11px] font-bold uppercase tracking-wider text-turquesa transition-colors hover:bg-turquesa hover:text-white">
                    <span className={busy === p.name ? 'animate-pulse' : ''}>{busy === p.name ? 'Enviando…' : 'Trocar foto'}</span>
                    <input
                      ref={(el) => {
                        fileRefs.current[p.name] = el
                      }}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      onChange={onFile(p)}
                      disabled={busy !== null}
                      className="sr-only"
                    />
                  </label>
                  {p.uploaded && (
                    <button
                      type="button"
                      onClick={() => void reset(p)}
                      disabled={busy !== null}
                      className="rounded-full border border-dark/12 px-4 py-2.5 font-display text-[11px] font-bold uppercase tracking-wider text-dark/55 transition-colors hover:border-magenta hover:text-magenta disabled:opacity-50"
                    >
                      Restaurar
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyStateForFotos({ query }: { query: string }) {
  return (
    <EmptyState title="Nenhuma foto encontrada" description={`Nenhuma foto corresponde a "${query}".`} />
  )
}
