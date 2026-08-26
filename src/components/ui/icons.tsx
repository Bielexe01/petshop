import { cn } from '@/lib/cn'

/**
 * Ícone de pata (SVG próprio — Lucide não possui um).
 * Usado em toda a identidade no lugar de emojis de pata.
 */
export function PawIcon({
  className,
  strokeWidth = 1.8,
  filled = false,
}: {
  className?: string
  strokeWidth?: number
  filled?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
      aria-hidden="true"
    >
      <circle cx="11" cy="4" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="20" cy="16" r="2" />
      <path d="M9 10a5 5 0 0 1 5 5c0 2.5-2 5-5.5 5H8.5C5 20 3 17.5 3 15c0-2.5 2-5 5-5h1z" />
    </svg>
  )
}

/** Coração simples para microelementos flutuantes. */
export function HeartIcon({
  className,
  filled = false,
}: {
  className?: string
  filled?: boolean
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
      aria-hidden="true"
    >
      <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z" />
    </svg>
  )
}

/** Cruz veterinária (cruz com um V). */
export function VetCrossIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-6 w-6', className)}
      aria-hidden="true"
    >
      <path d="M12 3v18M3 12h18" />
      <path d="M9.5 8.5 12 12l2.5-3.5M9.5 15.5 12 12l2.5 3.5" />
    </svg>
  )
}
