import { useRef, useEffect, type ReactNode } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { cn } from '@/lib/cn'

gsap.registerPlugin(ScrollTrigger)

interface ImageRevealProps {
  children: ReactNode
  className?: string
  /** forma do clip-path inicial */
  clip?: 'circle' | 'sweep' | 'reveal'
  /** parallax interno da imagem (em %) */
  parallax?: number
  /** classe aplicada no elemento interno que sofre parallax */
  innerClassName?: string
}

/**
 * Container de imagem com revelação por clip-path quando entra na viewport,
 * mais parallax interno opcional. Ex.: "circle" anima de um círculo
 * fechado (clip 0) para o retângulo completo.
 */
export function ImageReveal({
  children,
  className,
  clip = 'circle',
  parallax = 12,
  innerClassName,
}: ImageRevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const el = ref.current
    const inner = innerRef.current
    if (!el || reduced) return

    const clipFrom =
      clip === 'circle'
        ? 'circle(0% at 50% 50%)'
        : clip === 'sweep'
          ? 'inset(0 100% 0 0)'
          : 'inset(0 0 100% 0)'

    gsap.set(el, { clipPath: clipFrom })

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        once: true,
      },
    })

    tl.to(el, {
      clipPath: clip === 'circle' ? 'circle(75% at 50% 50%)' : 'inset(0% 0% 0% 0%)',
      duration: 1.1,
      ease: 'power3.inOut',
    })

    if (inner && parallax) {
      const st = ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          const y = (0.5 - self.progress) * parallax * 2
          gsap.set(inner, { yPercent: y })
        },
      })
      // devolve o cleanup
      tl.eventCallback('onComplete', () => {})
      return () => {
        st.kill()
        tl.kill()
        gsap.set(el, { clearProps: 'clipPath' })
      }
    }

    return () => {
      tl.kill()
      gsap.set(el, { clearProps: 'clipPath' })
    }
  }, [clip, parallax, reduced])

  return (
    <div ref={ref} className={cn('relative overflow-hidden', className)}>
      <div ref={innerRef} className={cn('h-full w-full will-transform', innerClassName)}>
        {children}
      </div>
    </div>
  )
}
