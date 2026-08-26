import { useRef, useState } from 'react'
import gsap from 'gsap'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { Photo } from '@/components/ui/Photo'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { cn } from '@/lib/cn'
import type { PhotoKey } from '@/lib/photos'

interface Service {
  num: string
  title: string
  description: string
  photo: PhotoKey
}

const SERVICES: Service[] = [
  {
    num: '01',
    title: 'CONSULTAS',
    description: 'Avaliação clínica completa, orientação e acompanhamento da saúde do seu pet em todas as fases da vida.',
    photo: 'atendimento',
  },
  {
    num: '02',
    title: 'URGÊNCIA E EMERGÊNCIA',
    description: 'Atendimento imediato 24 horas para acidentes, intoxicações, dores agudas e qualquer situação de risco.',
    photo: 'animais',
  },
  {
    num: '03',
    title: 'CIRURGIAS',
    description: 'Procedimentos cirúrgicos com equipe experiente, estrutura adequada e acompanhamento no pós-operatório.',
    photo: 'ambiente',
  },
  {
    num: '04',
    title: 'VACINAÇÃO',
    description: 'Protocolos de vacinação completos e atualizados, com carteirinha digital e lembretes de reforço.',
    photo: 'equipe',
  },
  {
    num: '05',
    title: 'EXAMES E DIAGNÓSTICO',
    description: 'Exames laboratoriais, imagem e apoio diagnóstico para identificar o que seu pet precisa com precisão.',
    photo: 'doutora',
  },
  {
    num: '06',
    title: 'BANHO E ESTÉTICA',
    description: 'Banho, tosa e cuidados estéticos com produtos adequados e muito carinho pelo seu melhor amigo.',
    photo: 'recepcao',
  },
]

/**
 * Serviços: lista editorial interativa. Hover muda o fundo, revela a foto
 * via máscara circular, anima o número. Mobile vira cards verticais.
 */
export function Services() {
  const [active, setActive] = useState<number | null>(0)
  const listRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  const setActiveSmooth = (i: number | null) => {
    setActive(i)
    if (reduced) return
    // animação discreta do número ativo
    const items = listRef.current?.querySelectorAll('[data-service-item]')
    items?.forEach((el, idx) => {
      gsap.to(el, { scale: idx === i ? 1.015 : 1, duration: 0.4, ease: 'power2.out' })
    })
  }

  const activeService = active != null ? SERVICES[active] : null

  return (
    <section id="servicos" className="relative bg-white py-24 lg:py-32" aria-label="Serviços">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-14 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionLabel index="01">Serviços</SectionLabel>
            <h2 className="mt-5 max-w-2xl font-display text-4xl font-black uppercase leading-[1.02] tracking-tight text-dark sm:text-5xl lg:text-6xl">
              Tudo para o seu <span className="text-magenta">pet.</span>
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-dark/55">
            Passe o cursor para explorar. Cada cuidado com a atenção que ele merece.
          </p>
        </div>

        {/* Lista */}
        <div
          ref={listRef}
          className="border-t border-dark/10"
          onMouseLeave={() => setActiveSmooth(active != null ? active : null)}
        >
          {SERVICES.map((service, i) => (
            <button
              key={service.num}
              data-service-item
              onClick={() => setActiveSmooth(i)}
              onMouseEnter={() => setActiveSmooth(i)}
              onFocus={() => setActiveSmooth(i)}
              className={cn(
                'group relative flex w-full items-center gap-5 border-b border-dark/10 py-6 text-left transition-colors duration-500 lg:gap-10 lg:py-8',
                active === i ? 'bg-cream' : 'bg-transparent hover:bg-cream/60',
              )}
            >
              {/* Foto revelada por máscara circular no hover — à direita, para
                  não cobrir o título e a descrição do serviço */}
              <span
                className={cn(
                  'pointer-events-none absolute right-24 top-1/2 hidden h-56 w-72 -translate-y-1/2 overflow-hidden rounded-2xl shadow-soft transition-all duration-500 lg:block',
                  active === i ? 'opacity-100' : 'opacity-0',
                )}
                style={{
                  clipPath: active === i ? 'circle(55% at 50% 50%)' : 'circle(0% at 50% 50%)',
                }}
                aria-hidden="true"
              >
                <Photo photo={service.photo} className="h-full w-full" imgClassName="object-cover" />
              </span>

              <span className="w-16 shrink-0 font-display text-2xl font-black text-magenta/70 transition-colors lg:w-24 lg:text-4xl">
                {service.num}
              </span>
              <span className="flex flex-1 flex-col gap-1">
                <span className="font-display text-lg font-black uppercase tracking-tight text-dark lg:text-2xl">
                  {service.title}
                </span>
                <span
                  className={cn(
                    'max-w-lg text-sm leading-relaxed text-dark/55 transition-all duration-500',
                    active === i ? 'opacity-100 lg:max-h-16' : 'opacity-0 lg:max-h-0 lg:overflow-hidden',
                  )}
                >
                  {service.description}
                </span>
              </span>
              <span
                className={cn(
                  'grid h-11 w-11 shrink-0 place-items-center rounded-full border text-lg transition-all duration-500 lg:h-14 lg:w-14',
                  active === i
                    ? 'rotate-45 border-magenta bg-magenta text-white'
                    : 'border-dark/15 text-dark/40 group-hover:border-magenta/40 group-hover:text-magenta',
                )}
                aria-hidden="true"
              >
                +
              </span>
            </button>
          ))}
        </div>

        {/* Descrição ativa (mobile) */}
        {activeService && (
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-dark/60 lg:hidden">
            <span className="font-display font-bold text-magenta">{activeService.num} · </span>
            {activeService.description}
          </p>
        )}
      </div>
    </section>
  )
}
