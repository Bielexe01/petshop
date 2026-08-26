import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { useIsMobile } from '@/hooks/useIsMobile'

/**
 * Cursor customizado (desktop apenas). Um ponto + um anel que segue o mouse
 * com atraso; sobre imagens exibe "VER"; sobre links/botões cresce.
 * Desativado em touch / reduced-motion.
 */
export function CursorFX() {
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const labelRef = useRef<HTMLSpanElement>(null)
  const reduced = usePrefersReducedMotion()
  const isMobile = useIsMobile()
  const active = !reduced && !isMobile

  useEffect(() => {
    if (!active) return
    const dot = dotRef.current
    const ring = ringRef.current
    const label = labelRef.current
    if (!dot || !ring || !label) return

    let raf = 0
    let x = window.innerWidth / 2
    let y = window.innerHeight / 2
    let ringX = x
    let ringY = y
    let hovering = false

    const onMove = (e: MouseEvent) => {
      x = e.clientX
      y = e.clientY
      gsap.to(dot, { x: x, y: y, duration: 0.08, ease: 'power2.out', overwrite: 'auto' })
      const target = (e.target as HTMLElement)?.closest('a, button, [data-cursor], [role="button"]')
      const isImage = !!(e.target as HTMLElement)?.closest('[data-cursor="view"]')
      if (target && !isImage) {
        if (!hovering) {
          hovering = true
          gsap.to(ring, { scale: 1.9, opacity: 0.35, duration: 0.3, ease: 'power3.out' })
          label.style.opacity = '0'
        }
      } else if (isImage) {
        if (!hovering || label.style.opacity !== '1') {
          hovering = true
          gsap.to(ring, { scale: 2.6, opacity: 0.9, duration: 0.3, ease: 'power3.out' })
          label.style.opacity = '1'
        }
      } else if (hovering) {
        hovering = false
        gsap.to(ring, { scale: 1, opacity: 0.6, duration: 0.3, ease: 'power3.out' })
        label.style.opacity = '0'
      }
    }

    const loop = () => {
      ringX += (x - ringX) * 0.14
      ringY += (y - ringY) * 0.14
      gsap.set(ring, { x: ringX, y: ringY })
      raf = requestAnimationFrame(loop)
    }

    document.body.style.cursor = 'none'
    const interactive = document.querySelectorAll<HTMLElement>('a, button')
    interactive.forEach((el) => (el.style.cursor = 'none'))

    window.addEventListener('mousemove', onMove, { passive: true })
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      document.body.style.cursor = ''
      interactive.forEach((el) => (el.style.cursor = ''))
    }
  }, [active])

  if (!active) return null

  return (
    <>
      <div
        ref={dotRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[200] hidden h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-magenta md:block"
        style={{ transform: 'translate(-50%, -50%)' }}
      />
      <div
        ref={ringRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[200] hidden h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-magenta/50 opacity-60 md:flex"
        style={{ transform: 'translate(-50%, -50%)' }}
      >
        <span ref={labelRef} className="text-[10px] font-black uppercase tracking-[0.2em] text-white" style={{ opacity: 0 }}>
          VER
        </span>
      </div>
    </>
  )
}
