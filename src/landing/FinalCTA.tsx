import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { Magnetic } from '@/components/ui/Magnetic'
import { CLINIC } from '@/lib/clinic'
import { PawIcon } from '@/components/ui/icons'

gsap.registerPlugin(ScrollTrigger)

/**
 * CTA final: 80vh de fundo magenta, "SEU PET MERECE CUIDADO." com entrada
 * cinematográfica (começa pequeno/distante → escala 1), botões WhatsApp +
 * localização.
 */
export function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    const el = sectionRef.current
    const title = titleRef.current
    if (!el || !title) return

    const tl = gsap.timeline({
      scrollTrigger: { trigger: el, start: 'top 70%', once: true },
    })
    tl.fromTo(title, { scale: 0.82, y: 60, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 1.3, ease: 'power4.out' })
    tl.fromTo(
      el.querySelectorAll('.cta-fade'),
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out' },
      '-=0.5',
    )

    return () => {
      tl.kill()
    }
  }, [reduced])

  return (
    <section ref={sectionRef} className="relative flex min-h-[80vh] items-center justify-center overflow-hidden bg-magenta px-5 py-24" aria-label="Chamada final">
      {/* Pata gigante decorativa */}
      <PawIcon
        className="pointer-events-none absolute -bottom-16 -right-10 h-[46vw] w-[46vw] rotate-12 text-white/8 lg:h-[30vw] lg:w-[30vw]"
        filled
      />

      <div className="relative z-10 max-w-4xl text-center">
        <p className="cta-fade font-display text-[11px] font-bold uppercase tracking-[0.34em] text-white/80">
          {CLINIC.opening} · {CLINIC.cityLine}
        </p>

        <h2 ref={titleRef} className="mt-6 font-display text-5xl font-black uppercase leading-[1.0] tracking-tight text-white sm:text-7xl lg:text-8xl">
          Seu pet merece <span className="relative inline-block">
            cuidado.
            <svg viewBox="0 0 300 12" className="absolute -bottom-2 left-0 w-full text-turquesa" aria-hidden="true">
              <path d="M2 9 Q 80 2 150 8 T 298 6" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            </svg>
          </span>
        </h2>

        <p className="cta-fade mx-auto mt-8 max-w-xl text-balance text-lg leading-relaxed text-white/85">
          Agende uma consulta ou venha nos conhecer. Estamos aqui para cuidar — agora e sempre.
        </p>

        <div className="cta-fade mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Magnetic>
            <a
              href={CLINIC.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-15 items-center justify-center rounded-full bg-white px-10 font-display text-base font-black uppercase tracking-[0.1em] text-magenta shadow-soft transition-transform hover:scale-[1.03]"
            >
              Chamar no WhatsApp
            </a>
          </Magnetic>
          <a
            href={CLINIC.mapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-15 items-center justify-center rounded-full border-2 border-white/70 px-10 font-display text-base font-bold uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-magenta"
          >
            Ver localização
          </a>
        </div>

        <p className="cta-fade mt-8 font-display text-sm font-bold text-white/85">
          <a href={`tel:+55${CLINIC.phoneRaw}`} className="underline-offset-4 hover:underline">
            {CLINIC.phone}
          </a>
          {' · '}
          <span>{CLINIC.opening}</span>
        </p>
      </div>
    </section>
  )
}
