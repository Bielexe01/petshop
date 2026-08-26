import { useEffect, useState } from 'react'

/**
 * Reativo a `prefers-reduced-motion`. Usado para degradar animações
 * pesadas (WebGL, pin, horizontal scroll) quando o usuário pede menos
 * movimento.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
