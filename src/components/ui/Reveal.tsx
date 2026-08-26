import { useRef, useEffect, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

gsap.registerPlugin(ScrollTrigger)

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

interface RevealProps {
  children: ReactNode
  /** direção do deslocamento inicial */
  direction?: Direction
  /** delay em segundos */
  delay?: number
  /** duração em segundos */
  duration?: number
  /** distância em px */
  distance?: number
  /** entrada com scale */
  scale?: boolean
  /** desabilita animação */
  disabled?: boolean
  className?: string
}

/**
 * Reveal genérico: elemento entra com fade + deslocamento quando entra na
 * viewport (ScrollTrigger, one-shot, start "top 88%"). Cleanup automático.
 */
export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.9,
  distance = 48,
  scale = false,
  disabled = false,
  className,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el || disabled || reduced) return

    const initial: gsap.TweenVars = { opacity: 0 }
    if (direction === 'up') initial.y = distance
    else if (direction === 'down') initial.y = -distance
    else if (direction === 'left') initial.x = distance
    else if (direction === 'right') initial.x = -distance
    if (scale) initial.scale = 0.94

    gsap.set(el, initial)

    const tween = gsap.to(el, {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration,
      delay,
      ease: 'power3.out',
      overwrite: 'auto',
      paused: true,
    })

    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top 88%',
      once: true,
      onEnter: () => tween.play(),
    })

    return () => {
      st.kill()
      tween.kill()
      gsap.set(el, { clearProps: 'opacity,transform' })
    }
  }, [direction, delay, duration, distance, scale, disabled, reduced])

  return (
    <div ref={ref} className={cn('will-transform', className)}>
      {children}
    </div>
  )
}
