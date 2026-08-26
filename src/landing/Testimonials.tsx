import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { cn } from '@/lib/cn'

gsap.registerPlugin(ScrollTrigger)

/**
 * Depoimentos — conteúdo PLACEHOLDER claramente rotulado. Quando as
 * avaliações reais chegarem (Google/Instagram/WhatsApp), é só substituir
 * o array abaixo.
 */
const TESTIMONIALS = [
  {
    name: 'Mariana S.',
    pet: 'Tutora do Thor',
    text: 'A clínica acolheu meu cachorro com um cuidado que eu não encontrava em lugar nenhum. Atendimento humano e rápido.',
  },
  {
    name: 'João P.',
    pet: 'Tutor da Luna',
    text: 'Precisei da emergência de madrugada e fui atendido na hora. Gratidão imensa pela dedicação da equipe.',
  },
  {
    name: 'Fernanda R.',
    pet: 'Tutora do Bidu',
    text: 'Vacinação, banho e consulta: tudo em um só lugar, com muito carinho e estrutura impecável.',
  },
]

/**
 * Carrossel horizontal calmo: ★★★★★ + stagger de entrada. Indicador e
 * navegação manual. Placeholder rotulado.
 */
export function Testimonials() {
  const [index, setIndex] = useState(0)
  const ref = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    const el = ref.current
    if (!el) return
    gsap.fromTo(
      el.querySelectorAll('.testimonial-fade'),
      { opacity: 0, y: 40 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 80%', once: true },
      },
    )
    return () => {
      ScrollTrigger.getAll().forEach((st) => st.trigger === el && st.kill())
    }
  }, [reduced])

  const next = () => setIndex((i) => (i + 1) % TESTIMONIALS.length)
  const prev = () => setIndex((i) => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)

  return (
    <section ref={ref} id="depoimentos" className="relative overflow-hidden bg-cream py-24 lg:py-32" aria-label="Depoimentos">
      <div className="mx-auto max-w-5xl px-5 lg:px-8">
        <div className="mb-12 flex flex-col items-center text-center">
          <SectionLabel index="04">Depoimentos</SectionLabel>
          <h2 className="mt-5 font-display text-4xl font-black uppercase tracking-tight text-dark sm:text-5xl">
            Quem confia, <span className="text-azul">recomenda.</span>
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-dark/55">
            Exemplos ilustrativos — substituir pelas avaliações reais dos nossos clientes.
          </p>
        </div>

        <div className="relative">
          {/* Card ativo */}
          <div className="overflow-hidden rounded-3xl bg-white p-8 shadow-soft lg:p-12">
            <div
              key={index}
              className="testimonial-slide mx-auto max-w-2xl text-center"
            >
              <div className="flex items-center justify-center gap-1 text-magenta" aria-label="5 estrelas">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                  </svg>
                ))}
              </div>
              <blockquote className="mt-6 font-display text-lg font-medium leading-relaxed text-dark/80 lg:text-xl">
                “{TESTIMONIALS[index].text}”
              </blockquote>
              <div className="mt-6">
                <p className="font-display text-base font-black text-dark">{TESTIMONIALS[index].name}</p>
                <p className="text-sm text-dark/50">{TESTIMONIALS[index].pet}</p>
              </div>
            </div>
          </div>

          {/* Controles */}
          <div className="mt-8 flex items-center justify-center gap-5">
            <button
              onClick={prev}
              aria-label="Depoimento anterior"
              className="grid h-11 w-11 place-items-center rounded-full border border-dark/15 text-dark/60 transition hover:border-magenta hover:text-magenta"
            >
              ←
            </button>
            <div className="flex gap-2">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Ir para depoimento ${i + 1}`}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    i === index ? 'w-8 bg-magenta' : 'w-2 bg-dark/20 hover:bg-dark/40',
                  )}
                />
              ))}
            </div>
            <button
              onClick={next}
              aria-label="Próximo depoimento"
              className="grid h-11 w-11 place-items-center rounded-full border border-dark/15 text-dark/60 transition hover:border-magenta hover:text-magenta"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
