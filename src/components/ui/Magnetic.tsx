import { useRef, type ReactNode, type MouseEvent } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/cn'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

interface MagneticProps {
  children: ReactNode
  /** intensidade do deslocamento (px máximos) */
  strength?: number
  className?: string
  as?: 'div' | 'span' | 'a'
}

/**
 * Botão/Elemento magnético: desloca suavemente em direção ao cursor
 * usando transform (sem layout thrashing). Desativado em touch/reduced-motion.
 */
export function Magnetic({ children, strength: _strength = 24, className, as = 'div' }: MagneticProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  const onMove = (e: MouseEvent) => {
    if (reduced) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - (rect.left + rect.width / 2)
    const y = e.clientY - (rect.top + rect.height / 2)
    gsap.to(el, {
      x: x * 0.18,
      y: y * 0.22,
      duration: 0.5,
      ease: 'power3.out',
      overwrite: 'auto',
    })
  }

  const onLeave = () => {
    if (!ref.current) return
    gsap.to(ref.current, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1, 0.4)' })
  }

  const Comp = as as 'div'
  return (
    <Comp
      ref={ref as never}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={cn('inline-block will-transform', className)}
    >
      {children}
    </Comp>
  )
}
