import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'

const MAX_IMG = 2 * 1024 * 1024 // 2 MB

/**
 * Seletor de foto do pet.
 *
 * - Modo edição (`petId > 0`): lê o arquivo, valida e envia (base64) ao
 *   endpoint autenticado do pet. O `photo_url` atualizado volta via
 *   `onUploaded`.
 * - Modo criação (`petId === 0`): ainda não existe pet no banco — guarda o
 *   arquivo localmente e o devolve via `onPendingFile` para o formulário
 *   enviar logo após criar o pet.
 */
export function PetPhotoPicker({
  petId,
  photoUrl,
  onUploaded,
  onPendingFile,
  className,
}: {
  petId: number
  photoUrl: string | null | undefined
  onUploaded: (url: string | null) => void
  onPendingFile?: (file: File | null) => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const creating = petId === 0

  // Sincroniza quando o pet muda (abre outro formulário)
  useEffect(() => {
    setPreview(null)
  }, [petId])

  const clear = () => {
    setPreview(null)
    onUploaded(null)
    if (onPendingFile) onPendingFile(null)
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMG) {
      setError('A imagem deve ter no máximo 2 MB.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError('Formato não suportado. Use JPG, PNG ou WebP.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }

    setError('')
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = String(reader.result ?? '')
      setPreview(dataUrl)

      if (creating) {
        // Pet ainda não existe: guarda o arquivo para upload após a criação.
        if (onPendingFile) onPendingFile(file)
        if (inputRef.current) inputRef.current.value = ''
        return
      }

      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
      setBusy(true)
      try {
        const r = await api.post<{ ok: boolean; url: string }>(`/api/pets/mine/${petId}/photo`, {
          mime: file.type,
          data: base64,
        })
        setPreview(null)
        onUploaded(r.url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível enviar a foto.')
      } finally {
        setBusy(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    }
    reader.onerror = () => {
      setError('Não foi possível ler o arquivo.')
      setBusy(false)
    }
    reader.readAsDataURL(file)
  }

  const current = preview ?? photoUrl

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Escolher foto do pet"
        className="group relative grid h-24 w-24 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-dark/15 bg-white text-magenta transition-colors hover:border-magenta/50 disabled:opacity-60"
      >
        {current ? (
          <img
            key={current}
            src={current.startsWith('petphotos/') ? `/api/pets/mine/${petId}/photo` : current}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <CameraIcon />
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-bold text-magenta">
            Enviando…
          </span>
        )}
      </button>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="font-display text-sm font-bold text-turquesa hover:text-azul disabled:opacity-60"
        >
          {current ? 'Trocar foto' : 'Escolher foto'}
        </button>
        {current && (
          <button
            type="button"
            onClick={clear}
            className="mt-0.5 block text-xs font-semibold text-dark/45 hover:text-magenta"
          >
            Remover foto
          </button>
        )}
        <p className="mt-1 text-[11px] text-dark/40">JPG, PNG ou WebP · máx. 2 MB</p>
        {error && <p className="mt-1 text-xs font-medium text-magenta">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={onFile}
        disabled={busy}
        className="sr-only"
      />
    </div>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
      <path d="M4 8h2l2-3h8l2 3h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}
