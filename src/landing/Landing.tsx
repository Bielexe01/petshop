import { useEffect } from 'react'
import { useLenis } from '@/hooks/useLenis'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { Header } from './Header'
import { Hero } from './Hero'
import { Emergency } from './Emergency'
import { StoryScroller } from './StoryScroller'
import { Services } from './Services'
import { Place } from './Place'
import { Team } from './Team'
import { Testimonials } from './Testimonials'
import { Location } from './Location'
import { FinalCTA } from './FinalCTA'
import { Footer } from './Footer'
import { PawTrail } from './PawTrail'
import { CursorFX } from './CursorFX'
import { FloatingShapes } from './FloatingShapes'

/**
 * Landing page completa — identidade colorida da clínica, animações GSAP +
 * Lenis + WebGL sutil. Cada seção é um componente isolado com cleanup
 * próprio de ScrollTrigger.
 */
export default function Landing() {
  const reduced = usePrefersReducedMotion()
  const lenisEnabled = !reduced
  useLenis(lenisEnabled)

  // Ao montar, voltar ao topo sem animação
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="relative min-h-screen">
      <Header />
      <main>
        <Hero />
        <Emergency />
        <StoryScroller />
        <Services />
        <Place />
        <Team />
        <Testimonials />
        <Location />
        <FinalCTA />
      </main>
      <Footer />

      {/* Overlays decorativos */}
      <FloatingShapes />
      <PawTrail />
      <CursorFX />
    </div>
  )
}
