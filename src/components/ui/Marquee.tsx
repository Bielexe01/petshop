import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface MarqueeProps {
  children: ReactNode
  className?: string
  /** duração de uma volta, em s */
  duration?: number
  /** inverte a direção */
  reverse?: boolean
}

/**
 * Faixa tipográfica em loop infinito (marquee). Dois spans idênticos
 * animados via keyframe `marquee` — puro transform, sem layout thrash.
 */
export function Marquee({ children, className, duration = 30, reverse = false }: MarqueeProps) {
  return (
    <div className={cn('relative flex overflow-hidden', className)} aria-hidden="true">
      <div
        className="flex shrink-0 animate-marquee items-center will-transform"
        style={{ animationDuration: `${duration}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
      >
        {children}
        {children}
      </div>
    </div>
  )
}
