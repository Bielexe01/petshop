import { useEffect, useRef, useState } from 'react'
import { PHOTO_MANIFEST, resolvePhoto, type PhotoKey } from '@/lib/photos'
import { PawIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

interface PhotoProps {
  photo: PhotoKey
  /** classe da moldura */
  className?: string
  /** classe da própria imagem */
  imgClassName?: string
  eager?: boolean
  /** tratamento da imagem */
  fit?: 'cover' | 'contain'
  /** legenda exibida no placeholder quando a foto ainda não existe */
  label?: string
}

/**
 * Renderiza a foto da clínica quando o arquivo existe em /public/photos;
 * caso contrário, um placeholder de marca com as cores e formas da
 * identidade + a legenda. Quando o usuário adicionar o arquivo, a foto
 * entra automaticamente (o manifest é recarregado ao montar).
 */
export function Photo({ photo, className, imgClassName, eager = false, fit = 'cover', label }: PhotoProps) {
  const [url, setUrl] = useState<string | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    let cancelled = false
    resolvePhoto(photo).then((u) => {
      if (!cancelled && mounted.current) setUrl(u)
    })
    return () => {
      cancelled = true
      mounted.current = false
    }
  }, [photo])

  const spec = PHOTO_MANIFEST[photo]
  const alt = spec?.alt ?? ''
  const caption = label ?? spec?.label ?? 'Foto da clínica'

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {url ? (
        <img
          src={url}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          className={cn('h-full w-full object-cover', fit === 'contain' && 'object-contain', imgClassName)}
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className={cn(
            'photo-fallback relative flex h-full w-full items-end justify-start overflow-hidden',
            imgClassName,
          )}
        >
          {/* formas geométricas do placeholder — remetem à fachada colorida */}
          <span className="absolute -right-6 -top-8 h-36 w-36 rotate-12 rounded-3xl bg-magenta/80" />
          <span className="absolute right-16 top-10 h-20 w-20 rounded-full bg-turquesa/80" />
          <span className="absolute bottom-8 right-8 h-14 w-14 rounded-2xl bg-azul/80" />
          <span className="absolute left-6 top-6 text-white/80">
            <PawIcon className="h-8 w-8" />
          </span>
          <span className="relative z-10 m-4 max-w-[70%] rounded-full bg-dark/55 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            {caption}
          </span>
        </div>
      )}
    </div>
  )
}
