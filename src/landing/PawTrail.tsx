import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { PawIcon } from '@/components/ui/icons'

/**
 * Microinteração: uma pequena pata acompanha o scroll e deixa patinhas
 * suaves que desaparecem. Discreto, sem interferir na leitura.
 * Desativado em reduced-motion e no mobile (para não sobrecarregar).
 */
export function PawTrail() {
  const containerRef = useRef<HTMLDivElement>(null)
  const pawRef = useRef<HTMLSpanElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    const container = containerRef.current
    const paw = pawRef.current
    if (!container || !paw) return

    let lastY = 0
    let tick = 0
    let frame = 0

    const onScroll = () => {
      tick += 1
      if (tick % 4 !== 0) return
      const y = window.scrollY + window.innerHeight * 0.5
      if (Math.abs(y - lastY) < 40) return
      lastY = y

      // deixa uma patinha (SVG da identidade)
      const trail = document.createElement('span')
      trail.className = 'pointer-events-none absolute left-1.5 h-4 w-4 text-magenta/30 will-transform'
      trail.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="h-full w-full"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5c0 2.5-2 5-5.5 5H8.5C5 20 3 17.5 3 15c0-2.5 2-5 5-5h1z"/></svg>`
      container.appendChild(trail)

      trail.animate(
        [
          { opacity: 0.5, transform: 'translateY(0) scale(0.6) rotate(0deg)' },
          { opacity: 0, transform: 'translateY(26px) scale(1) rotate(20deg)' },
        ],
        { duration: 1400, easing: 'ease-out' },
      ).onfinish = () => trail.remove()

      frame += 1
      if (frame > 3) {
        container.querySelector('span')?.remove()
        frame = 0
      }
    }

    // move a pata principal junto do scroll (lerp suave)
    let targetY = window.innerHeight * 0.5
    let currentY = targetY
    const loop = () => {
      currentY += (targetY - currentY) * 0.15
      paw.style.top = `${currentY}px`
      if (Math.abs(targetY - currentY) > 0.5) requestAnimationFrame(loop)
    }

    const updateTarget = () => {
      targetY = window.scrollY + window.innerHeight * 0.5
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scroll', updateTarget, { passive: true })
    requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', updateTarget)
      container.replaceChildren()
    }
  }, [reduced])

  if (reduced) return null

  return (
    <div ref={containerRef} className="pointer-events-none fixed bottom-0 left-4 top-0 z-30 hidden w-8 lg:block" aria-hidden="true">
      <span
        ref={pawRef}
        className="absolute left-1.5 text-magenta/40 will-transform"
        style={{ top: '50%' }}
      >
        <PawIcon className="h-4 w-4" strokeWidth={2.2} />
      </span>
    </div>
  )
}
