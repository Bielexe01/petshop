import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { Photo } from '@/components/ui/Photo'
import { SectionLabel } from '@/components/ui/SectionLabel'

gsap.registerPlugin(ScrollTrigger)

const LABELS = [
  { text: 'ACOLHIMENTO', top: '18%', left: '4%', className: 'text-magenta' },
  { text: 'ESTRUTURA', top: '62%', left: '10%', className: 'text-azul' },
  { text: 'CUIDADO', top: '30%', right: '6%', className: 'text-turquesa' },
  { text: '24 HORAS', top: '70%', right: '12%', className: 'text-verde' },
]

/**
 * "Um lugar para eles": parallax profundo com a foto da estrutura,
 * etiquetas flutuantes e formas geométricas em movimento.
 */
export function Place() {
  const sectionRef = useRef<HTMLElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const shapesRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    const section = sectionRef.current
    const media = mediaRef.current
    const shapes = shapesRef.current
    if (!section || !media || !shapes) return

    // parallax profundo da foto
    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        gsap.set(media, { yPercent: self.progress * -22 + 11 })
      },
    })

    // formas geométricas derivam lentamente
    const floats = shapes.querySelectorAll('[data-float]')
    gsap.to(floats, {
      y: () => gsap.utils.random(-16, 16),
      x: () => gsap.utils.random(-10, 10),
      rotation: () => gsap.utils.random(-12, 12),
      duration: 4,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    })

    return () => {
      st.kill()
      gsap.killTweensOf(floats)
    }
  }, [reduced])

  return (
    <section
      ref={sectionRef}
      id="estrutura"
      className="relative flex min-h-[120vh] items-center overflow-hidden bg-cream py-24"
      aria-label="Estrutura"
    >
      <div className="mx-auto w-full max-w-7xl px-5 lg:px-8">
        <SectionLabel index="02">Estrutura</SectionLabel>
        <h2 className="mt-5 max-w-2xl font-display text-4xl font-black uppercase leading-[1.02] tracking-tight text-dark sm:text-5xl lg:text-6xl">
          Um lugar <span className="text-turquesa">para eles.</span>
        </h2>

        <div className="relative mt-14 overflow-hidden rounded-3xl">
          <div ref={mediaRef} className="h-[70vh] will-transform lg:h-[78vh]">
            <Photo photo="ambiente" className="h-full w-full" imgClassName="object-cover" />
          </div>

          {/* Etiquetas flutuantes */}
          {LABELS.map((label) => (
            <span
              key={label.text}
              className={`absolute animate-float ${label.className}`}
              style={{
                top: label.top,
                left: label.left,
                right: label.right,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              <span className="rounded-full bg-white/90 px-5 py-2.5 font-display text-xs font-black uppercase tracking-[0.22em] shadow-soft backdrop-blur-sm">
                {label.text}
              </span>
            </span>
          ))}
        </div>

        {/* Formas geométricas de fundo */}
        <div ref={shapesRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span data-float className="absolute left-[2%] top-[10%] h-24 w-24 rounded-3xl bg-magenta/10" />
          <span data-float className="absolute right-[4%] top-[28%] h-16 w-16 rounded-full bg-turquesa/15" />
          <span data-float className="absolute bottom-[12%] left-[8%] h-20 w-20 rotate-12 rounded-2xl bg-azul/10" />
          <span data-float className="absolute bottom-[6%] right-[14%] h-12 w-12 rounded-full bg-verde/15" />
        </div>
      </div>
    </section>
  )
}
