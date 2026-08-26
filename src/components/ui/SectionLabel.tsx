import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Label micro-tipográfico de seção (ex.: "01 — SERVIÇOS"). */
export function SectionLabel({
  index,
  children,
  className,
  light = false,
}: {
  index?: string
  children: ReactNode
  className?: string
  light?: boolean
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-3 font-display text-[11px] font-bold uppercase tracking-[0.28em]',
        light ? 'text-white/70' : 'text-dark/50',
        className,
      )}
    >
      {index && <span className={light ? 'text-white/60' : 'text-magenta'}>{index}</span>}
      {index && <span className={cn('h-px w-8', light ? 'bg-white/40' : 'bg-magenta/40')} />}
      <span>{children}</span>
    </p>
  )
}
