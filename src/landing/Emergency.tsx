import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { Magnetic } from '@/components/ui/Magnetic'
import { CLINIC } from '@/lib/clinic'

gsap.registerPlugin(ScrollTrigger)

/**
 * Seção de emergência 24h: fundo magenta, "QUANDO CADA SEGUNDO IMPORTA.",
 * "24H" gigante em background com entrada em escala, botão magnético
 * "CHAMAR AGORA" (WhatsApp). Transição de cor branco → magenta.
 */
export function Emergency() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    const el = sectionRef.current
    if (!el) return

    // "24H" entra em escala (2→4→H)
    gsap.fromTo(
      el.querySelector('.emergency-24h'),
      { scale: 2.4, opacity: 0 },
      {
        scale: 1,
        opacity: 0.16,
        duration: 1.6,
        ease: 'power4.out',
        scrollTrigger: { trigger: el, start: 'top 70%', once: true },
      },
    )

    // conteúdo com stagger
    gsap.fromTo(
      el.querySelectorAll('.emergency-fade'),
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 62%', once: true },
      },
    )

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill()
      })
    }
  }, [reduced])

  return (
    <section
      ref={sectionRef}
      id="emergencia"
      className="relative flex min-h-[92vh] items-center justify-center overflow-hidden bg-magenta px-5 py-24"
      aria-label="Emergência 24 horas"
    >
      {/* "24H" gigante em background */}
      <span
        className="emergency-24h pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-display text-[46vw] font-black leading-none text-white lg:text-[34vw]"
        aria-hidden="true"
        style={{ opacity: 0.16 }}
      >
        24H
      </span>

      {/* anéis pulsantes */}
      <span className="absolute right-[8%] top-[12%] h-20 w-20 animate-pulse-ring rounded-full bg-white/30" aria-hidden="true" />
      <span className="absolute bottom-[14%] left-[6%] h-12 w-12 rounded-full bg-turquesa/50 blur-[2px]" aria-hidden="true" />

      <div className="relative z-10 max-w-3xl text-center">
        <p className="emergency-fade font-display text-[11px] font-bold uppercase tracking-[0.34em] text-white/80">
          Emergência · 24 horas
        </p>
        <h2 className="emergency-fade mt-5 font-display text-4xl font-black uppercase leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
          Quando cada segundo importa.
        </h2>
        <p className="emergency-fade mx-auto mt-6 max-w-xl text-balance text-base leading-relaxed text-white/85 sm:text-lg">
          Acidentes, dores agudas, partos e mal-estar não marcam hora. Nossa
          equipe está de prontidão para atender seu pet a qualquer momento.
        </p>

        <div className="emergency-fade mt-10 flex flex-col items-center gap-4">
          <Magnetic>
            <a
              href={CLINIC.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex h-16 items-center justify-center gap-3 rounded-full bg-white px-10 font-display text-base font-black uppercase tracking-[0.12em] text-magenta shadow-soft transition-transform hover:scale-[1.02]"
            >
              <span className="relative flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-magenta opacity-75" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-magenta" />
              </span>
              Chamar agora
            </a>
          </Magnetic>
          <a
            href={`tel:+55${CLINIC.phoneRaw}`}
            className="font-display text-sm font-bold text-white/85 underline-offset-4 hover:underline"
          >
            {CLINIC.phone}
          </a>
        </div>
      </div>
    </section>
  )
}
