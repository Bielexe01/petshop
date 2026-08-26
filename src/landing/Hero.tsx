import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { Photo } from '@/components/ui/Photo'
import { ButtonLink } from '@/components/ui/Button'
import { CLINIC } from '@/lib/clinic'
import { WebGLBackground } from './WebGLBackground'

gsap.registerPlugin(ScrollTrigger)

/**
 * Hero cinematográfico: imagem real da clínica ocupa a viewport; título
 * "SEU PET. NOSSO CUIDADO." com word-reveal; zoom-out + parallax ao rolar;
 * partículas WebGL sutis ao fundo (desktop).
 */
export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    if (reduced) return
    const media = mediaRef.current
    const content = contentRef.current
    if (!media || !content) return

    // word reveal (stagger)
    gsap.fromTo(
      '.hero-word-inner',
      { yPercent: 120 },
      {
        yPercent: 0,
        duration: 1.2,
        ease: 'power4.out',
        stagger: 0.16,
        delay: 0.25,
      },
    )

    // sub + botões
    gsap.fromTo(
      content.querySelectorAll('.hero-fade'),
      { opacity: 0, y: 26 },
      { opacity: 1, y: 0, duration: 1, stagger: 0.14, delay: 1.1, ease: 'power3.out' },
    )

    // zoom-out + parallax no scroll
    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top top',
      end: 'bottom top',
      scrub: true,
      onUpdate: (self) => {
        const p = self.progress
        gsap.set(media, { scale: 1 + p * 0.18, yPercent: p * 12 })
        gsap.set(content, { yPercent: p * -18, opacity: 1 - p * 0.9 })
      },
    })

    return () => {
      st.kill()
      gsap.killTweensOf('.hero-word-inner')
      gsap.killTweensOf(content.querySelectorAll('.hero-fade'))
    }
  }, [reduced])

  return (
    <section
      ref={sectionRef}
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-dark"
      aria-label="Apresentação"
    >
      {/* Mídia de fundo */}
      <div ref={mediaRef} className="absolute inset-0 will-transform">
        <Photo photo="fachada" eager className="h-full w-full" imgClassName="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-dark/85 via-dark/35 to-dark/20" />
      </div>

      <WebGLBackground />

      {/* Conteúdo */}
      <div ref={contentRef} className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
        <p className="hero-fade mb-5 font-display text-[11px] font-bold uppercase tracking-[0.34em] text-white/80">
          {CLINIC.opening} · Guariba-SP
        </p>

        <h1 className="font-display text-[13vw] font-black leading-[0.95] tracking-tight text-white sm:text-[11vw] lg:text-[7.5rem]">
          <span className="hero-word block overflow-hidden">
            <span className="hero-word-inner block">SEU PET.</span>
          </span>
          <span className="hero-word block overflow-hidden">
            <span className="hero-word-inner block text-magenta">NOSSO CUIDADO.</span>
          </span>
        </h1>

        <p className="hero-fade mt-6 max-w-xl text-balance text-base leading-relaxed text-white/85 sm:text-lg">
          Mais que uma clínica: um lugar onde cada pet é recebido com acolhimento, cuidado e atenção 24 horas por dia.
        </p>

        <div className="hero-fade mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <ButtonLink href={CLINIC.whatsappUrl} target="_blank" rel="noopener noreferrer" variant="primary" size="lg">
            CHAMAR AGORA
          </ButtonLink>
          <ButtonLink
            href="#a-clinica"
            variant="white"
            size="lg"
            onClick={(e) => {
              e.preventDefault()
              document.querySelector('#a-clinica')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            Conhecer a clínica
          </ButtonLink>
        </div>
      </div>

      {/* Indicador scroll */}
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-white/60">
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.3em]">Scroll</span>
        <span className="flex h-9 w-5 items-start justify-center rounded-full border border-white/40 p-1">
          <span className="h-2 w-1 animate-bounce rounded-full bg-white/70" />
        </span>
      </div>
    </section>
  )
}
