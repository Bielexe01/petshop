import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

let lenisInstance: Lenis | null = null

/**
 * Inicializa o smooth scrolling (Lenis) integrado ao GSAP ScrollTrigger e
 * disponibiliza a instância globalmente para os componentes.
 *
 * - Lenis avança via `gsap.ticker` (um único rAF).
 * - ScrollTrigger e Lenis sincronizados.
 * - cleanup total ao desmontar.
 *
 * Chamado uma única vez no App raiz da landing.
 */
export function useLenis(enabled: boolean) {
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (!enabled || reduced) return

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
      // Garante que links âncora e foco de formulários funcionem
      autoRaf: false,
    })
    lenisInstance = lenis

    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      lenisInstance = null
      ScrollTrigger.getAll().forEach((t) => t.kill())
    }
  }, [enabled, reduced])

  return lenisInstance
}

/** Acessa a instância global do Lenis (null se desativado). */
export function getLenis(): Lenis | null {
  return lenisInstance
}

/** Rola suavemente até um seletor/posição usando Lenis (fallback para scrollTo nativo). */
export function scrollToTarget(target: string | number, offset = 0) {
  const lenis = getLenis()
  if (lenis) {
    lenis.scrollTo(target as never, { offset, duration: 1.4 })
  } else if (typeof target === 'string') {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' })
  } else {
    window.scrollTo({ top: target, behavior: 'smooth' })
  }
}
