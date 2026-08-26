import { useEffect, useState } from 'react'

const QUERY = '(max-width: 767px)'

/**
 * Verdadeiro em viewports de celular/tablet estreito. Usado para desligar
 * efeitos pesados e trocar composições (ex.: lista editorial → cards).
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}
