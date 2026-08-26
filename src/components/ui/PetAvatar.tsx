import { cn } from '@/lib/cn'
import { PawIcon } from './icons'
import { petPhotoUrl } from '@/lib/clinic'

/**
 * Avatar de pet: mostra a foto enviada pelo cliente quando existe; caso
 * contrário, um placeholder com a pata da marca. Usado nos cards de pets
 * do portal e no perfil.
 */
export function PetAvatar({
  petId,
  photoUrl,
  className,
  imgClassName,
}: {
  petId: number
  photoUrl: string | null | undefined
  className?: string
  imgClassName?: string
}) {
  const url = petPhotoUrl(petId, photoUrl)
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-magenta/15 to-turquesa/15 text-magenta',
        className,
      )}
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn('h-full w-full object-cover', imgClassName)}
        />
      ) : (
        <PawIcon className={cn('h-1/2 w-1/2', imgClassName)} />
      )}
    </span>
  )
}
