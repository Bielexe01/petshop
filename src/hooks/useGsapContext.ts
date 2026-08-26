import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

gsap.registerPlugin(ScrollTrigger)

/**
 * Cria um gsap.context escopado ao componente com cleanup automático:
 * reverte tweens e mata os ScrollTriggers criados dentro dele ao desmontar.
 * Retorna { scopeRef, contextRef, reduced }.
 */
export function useGsapContext<T extends HTMLElement = HTMLElement>() {
  const scopeRef = useRef<T>(null)
  const contextRef = useRef<gsap.Context | null>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const scope = scopeRef.current
    if (!scope) return

    const ctx = gsap.context(() => {
      // corpo vazio — os componentes chamam contextRef.current.add() ou
      // gsap.context(func, scope) internamente; este hook só garante o cleanup.
    }, scope)
    contextRef.current = ctx

    return () => {
      ctx.revert()
      contextRef.current = null
    }
  }, [])

  return { scopeRef, contextRef, reduced }
}
