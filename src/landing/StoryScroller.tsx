import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { Photo } from '@/components/ui/Photo'
import type { PhotoKey } from '@/lib/photos'

gsap.registerPlugin(ScrollTrigger)

interface StorySlide {
  label: string
  title: string
  description: string
  photo: PhotoKey
  accent: string
}

const SLIDES: StorySlide[] = [
  {
    label: 'Acolher',
    title: 'Acolher',
    description: 'Cada chegada é recebida com calma, escuta e um carinho especial.',
    photo: 'recepcao',
    accent: 'text-magenta',
  },
  {
    label: 'Cuidar',
    title: 'Cuidar',
    description: 'Do check-up ao tratamento, o cuidado se traduz em atenção em cada detalhe.',
    photo: 'atendimento',
    accent: 'text-turquesa',
  },
  {
    label: 'Tratar',
    title: 'Tratar',
    description: 'Estrutura completa e equipe preparada para o que o seu pet precisar.',
    photo: 'equipe',
    accent: 'text-azul',
  },
  {
    label: 'Proteger',
    title: 'Proteger',
    description: 'Vacinação, prevenção e acompanhamento contínuo para uma vida longa e feliz.',
    photo: 'ambiente',
    accent: 'text-verde',
  },
]

/**
 * StoryScroller: seção pinned com movimento horizontal (ScrollTrigger).
 * Sequência ACOLHER → CUIDAR → TRATAR → PROTEGER + fechamento.
 * No mobile mantém o horizontal (touch drag via Lenis).
 */
export function StoryScroller() {
  const sectionRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    const section = sectionRef.current
    const track = trackRef.current
    if (!section || !track) return

    const getAmount = () => {
      return () => track.scrollWidth - window.innerWidth
    }

    const st = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: () => `+=${track.scrollWidth - window.innerWidth}`,
      pin: true,
      scrub: 1,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const max = getAmount()()
        gsap.set(track, { x: -self.progress * max })
      },
    })

    return () => {
      st.kill()
    }
  }, [reduced])

  return (
    <section ref={sectionRef} className="relative w-full overflow-hidden bg-white" aria-label="Nossa história">
      <div ref={trackRef} className="flex h-screen w-max items-center gap-10 px-6 will-transform lg:gap-16 lg:px-16">
        {/* Intro */}
        <div className="flex w-[86vw] max-w-xl flex-col justify-center lg:w-[34vw]">
          <p className="font-display text-[11px] font-bold uppercase tracking-[0.3em] text-magenta">Como cuidamos</p>
          <h2 className="mt-5 font-display text-4xl font-black leading-[1.02] tracking-tight text-dark sm:text-6xl">
            Mais do que uma <span className="text-magenta">clínica.</span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-dark/65">
            Uma história construída com dedicação, estrutura e muito amor pelos animais.
          </p>
        </div>

        {/* Slides */}
        {SLIDES.map((slide, i) => (
          <article
            key={slide.label}
            className="relative flex h-[68vh] w-[78vw] shrink-0 flex-col overflow-hidden rounded-3xl bg-cream shadow-soft sm:w-[60vw] lg:h-[74vh] lg:w-[42vw]"
          >
            <div className="relative h-[58%] overflow-hidden">
              <Photo photo={slide.photo} className="h-full w-full" imgClassName="object-cover" />
            </div>
            <div className="flex flex-1 flex-col justify-between p-6 lg:p-8">
              <div>
                <p className="font-display text-xs font-black uppercase tracking-[0.24em] text-dark/40">
                  0{i + 1} · {slide.label}
                </p>
                <h3 className={`mt-2 font-display text-3xl font-black uppercase tracking-tight lg:text-4xl ${slide.accent}`}>
                  {slide.title}
                </h3>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-dark/60 lg:text-[15px]">
                  {slide.description}
                </p>
              </div>
              <span className="h-1.5 w-14 rounded-full bg-gradient-to-r from-magenta to-turquesa" />
            </div>
          </article>
        ))}

        {/* Fechamento */}
        <div className="flex w-[86vw] max-w-xl flex-col justify-center lg:w-[34vw]">
          <h2 className="font-display text-4xl font-black uppercase leading-[1.02] tracking-tight text-dark sm:text-5xl">
            Feito com <span className="text-rosa">amor,</span> <br />
            dia e <span className="text-turquesa">noite.</span>
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-dark/65">
            Conheça de perto os cuidados que esperam pelo seu pet.
          </p>
          <div className="mt-8 flex gap-3">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-magenta text-white">24</span>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-turquesa text-white">7</span>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-azul text-white">365</span>
          </div>
        </div>
      </div>
    </section>
  )
}
