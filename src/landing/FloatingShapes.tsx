import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { PawIcon, HeartIcon, VetCrossIcon } from '@/components/ui/icons'

const SHAPES = [
  { Icon: PawIcon, size: 28, color: 'text-magenta/40' },
  { Icon: HeartIcon, size: 22, color: 'text-rosa/35' },
  { Icon: VetCrossIcon, size: 24, color: 'text-turquesa/35' },
  { Icon: PawIcon, size: 18, color: 'text-azul/30' },
  { Icon: HeartIcon, size: 26, color: 'text-verde/30' },
]

/**
 * Formas orgânicas flutuando no fundo (patas, corações, cruzes) com
 * movimento lento independente do scroll. Decorativo e discreto.
 * Desativado em reduced-motion.
 */
export function FloatingShapes() {
  const ref = useRef<HTMLDivElement>(null)
  const shapesRef = useRef<(HTMLSpanElement | null)[]>([])
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    const shapes = shapesRef.current.filter(Boolean) as HTMLSpanElement[]
    if (shapes.length === 0) return

    shapes.forEach((el, i) => {
      gsap.to(el, {
        y: i % 2 === 0 ? -26 : 22,
        x: i % 3 === 0 ? 14 : -10,
        rotation: i % 2 === 0 ? 14 : -10,
        duration: 5 + (i % 3) * 1.4,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        delay: i * 0.35,
      })
    })

    return () => {
      gsap.killTweensOf(shapes)
    }
  }, [reduced])

  if (reduced) return null

  return (
    <div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {SHAPES.map((s, i) => (
        <span
          key={i}
          ref={(el) => {
            shapesRef.current[i] = el
          }}
          className={`absolute ${s.color} will-transform`}
          style={{
            left: `${8 + i * 19}%`,
            top: `${12 + (i % 3) * 26}%`,
            width: s.size,
            height: s.size,
            opacity: 0.9,
          }}
        >
          <s.Icon className="h-full w-full" />
        </span>
      ))}
    </div>
  )
}
