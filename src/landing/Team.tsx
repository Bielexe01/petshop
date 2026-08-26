import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { Photo } from '@/components/ui/Photo'
import { SectionLabel } from '@/components/ui/SectionLabel'
import { cn } from '@/lib/cn'

gsap.registerPlugin(ScrollTrigger)

/**
 * Equipe: composição editorial tipo revista com fotos em tamanhos
 * diferentes, entradas com clip-path/scale em velocidades distintas.
 */
export function Team() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    const el = sectionRef.current
    if (!el) return

    const items = el.querySelectorAll('[data-team-item]')
    gsap.utils.toArray<HTMLElement>(items).forEach((item, i) => {
      const dir = i % 3 === 0 ? 'left' : i % 3 === 1 ? 'right' : 'up'
      const from =
        dir === 'left'
          ? { x: -80, opacity: 0, scale: 0.94 }
          : dir === 'right'
            ? { x: 80, opacity: 0, scale: 0.94 }
            : { y: 70, opacity: 0, scale: 0.94 }
      gsap.fromTo(item, from, {
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 1.1,
        ease: 'power3.out',
        delay: (i % 3) * 0.08,
        scrollTrigger: { trigger: item, start: 'top 88%', once: true },
      })
    })

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger && st.trigger.closest('[data-team-item]')) st.kill()
      })
    }
  }, [reduced])

  return (
    <section ref={sectionRef} id="equipe" className="relative overflow-hidden bg-white py-24 lg:py-32" aria-label="Equipe">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <div className="mb-14 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div>
            <SectionLabel index="03">Equipe</SectionLabel>
            <h2 className="mt-5 max-w-2xl font-display text-4xl font-black uppercase leading-[1.02] tracking-tight text-dark sm:text-5xl lg:text-6xl">
              Experiência e <span className="text-rosa">coração</span> em cada atendimento.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-dark/55 lg:justify-self-end">
            Uma equipe que une técnica, carinho e o compromisso de cuidar do seu melhor amigo como se fosse da família.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          {/* Foto principal — doutora (destaque) */}
          <div data-team-item className="col-span-2 row-span-2">
            <div className="relative h-full min-h-[320px] overflow-hidden rounded-3xl lg:min-h-[520px]">
              <Photo photo="doutora" className="h-full w-full" imgClassName="object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-dark/85 to-transparent p-6">
                <p className="font-display text-xl font-black uppercase tracking-tight text-white">Dr.ª Cássia Carvalho</p>
                <p className="text-sm font-semibold text-white/80">Fundadora · Clínica Geral e Cirurgia</p>
              </div>
            </div>
          </div>

          <div data-team-item className={cn('col-span-1')}>
            <div className="h-44 overflow-hidden rounded-2xl lg:h-64">
              <Photo photo="equipe" className="h-full w-full" imgClassName="object-cover" />
            </div>
          </div>
          <div data-team-item>
            <div className="h-44 overflow-hidden rounded-2xl lg:h-64">
              <Photo photo="atendimento" className="h-full w-full" imgClassName="object-cover" />
            </div>
          </div>
          <div data-team-item>
            <div className="h-44 overflow-hidden rounded-2xl bg-rosa-claro lg:h-64" />
          </div>
          <div data-team-item>
            <div className="h-44 overflow-hidden rounded-2xl bg-turquesa-claro lg:h-64" />
          </div>

          {/* Etiqueta editorial */}
          <div data-team-item className="col-span-2 flex flex-col justify-center gap-3 rounded-2xl bg-dark p-6 lg:p-8">
            <span className="font-display text-xs font-black uppercase tracking-[0.24em] text-turquesa">Nosso compromisso</span>
            <p className="font-display text-lg font-black leading-snug text-white lg:text-xl">
              Tratamos cada pet como único — porque é.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
