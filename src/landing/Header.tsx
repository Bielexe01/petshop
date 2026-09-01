import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { CLINIC, NAV_ITEMS } from '@/lib/clinic'
import { PawIcon } from '@/components/ui/icons'
import { scrollToTarget } from '@/hooks/useLenis'

/**
 * Cabeçalho fixo: transparente sobre o Hero → barra com blur após rolar.
 * Navegação suave (Lenis) para as âncoras; mobile vira drawer.
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const go = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setOpen(false)
    scrollToTarget(href, -90)
  }

  return (
    <>
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled ? 'bg-white/85 shadow-soft backdrop-blur-md' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:h-20 lg:px-8">
        <a href="/" className="flex items-center gap-2.5">
          <span
            className={cn(
              'grid h-10 w-10 place-items-center rounded-xl transition-colors',
              scrolled ? 'bg-magenta text-white' : 'bg-white/15 text-white backdrop-blur-sm',
            )}
          >
            <PawIcon className="h-5 w-5" />
          </span>
          <span className="hidden leading-tight sm:block">
            <span className={cn('block font-display text-[15px] font-black tracking-tight', scrolled ? 'text-dark' : 'text-white')}>
              Sua CLinica
            </span>
            <span className={cn('block text-[10px] font-semibold uppercase tracking-[0.22em]', scrolled ? 'text-magenta' : 'text-white/80')}>
              Veterinária · 24h
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegação principal">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => go(e, item.href)}
              className={cn(
                'relative font-display text-[13px] font-semibold uppercase tracking-[0.14em] transition-colors',
                scrolled ? 'text-dark/70 hover:text-magenta' : 'text-white/85 hover:text-white',
              )}
            >
              {item.label}
            </a>
          ))}
          <Link
            to="/login"
            className="ml-2 rounded-full bg-magenta px-5 py-2.5 font-display text-[13px] font-bold uppercase tracking-[0.14em] text-white transition-all hover:-translate-y-0.5 hover:bg-rosa hover:shadow-glow"
          >
            Área do Cliente
          </Link>
        </nav>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={open}
          className={cn(
            'relative z-50 grid h-11 w-11 place-items-center rounded-full lg:hidden',
            scrolled ? 'bg-white text-dark shadow-soft' : 'bg-white/15 text-white backdrop-blur-sm',
          )}
        >
          <span className="flex flex-col gap-1.5">
            <span className={cn('h-0.5 w-5 rounded-full bg-current transition-transform', open && 'translate-y-2 rotate-45')} />
            <span className={cn('h-0.5 w-5 rounded-full bg-current transition-opacity', open && 'opacity-0')} />
            <span className={cn('h-0.5 w-5 rounded-full bg-current transition-transform', open && '-translate-y-2 -rotate-45')} />
          </span>
        </button>
      </div>
    </header>

    {/* Drawer mobile — fora do <header> para o `fixed inset-0` abraçar a
        viewport mesmo quando o header ganha backdrop-blur ao rolar
        (backdrop-filter vira containing block do fixed). */}
    <div
      className={cn(
        'fixed inset-0 z-40 flex flex-col justify-between bg-cream px-6 pb-10 pt-28 transition-all duration-500 lg:hidden overscroll-contain',
        open ? 'visible opacity-100' : 'invisible opacity-0',
      )}
      aria-hidden={!open}
    >
        <nav className="flex flex-col gap-1" aria-label="Navegação mobile">
          {NAV_ITEMS.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => go(e, item.href)}
              className="flex items-center gap-4 border-b border-dark/8 py-4"
            >
              <span className="font-display text-xs font-black text-magenta/60">0{i + 1}</span>
              <span className="font-display text-2xl font-black uppercase tracking-tight text-dark">{item.label}</span>
            </a>
          ))}
          <Link
            to="/login"
            onClick={() => setOpen(false)}
            className="mt-6 inline-flex h-13 items-center justify-center rounded-full bg-magenta px-8 font-display text-sm font-bold uppercase tracking-[0.14em] text-white"
          >
            Área do Cliente
          </Link>
          <a
            href={CLINIC.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex h-13 items-center justify-center rounded-full border-2 border-turquesa px-8 font-display text-sm font-bold uppercase tracking-[0.14em] text-turquesa"
          >
            Emergência 24h
          </a>
        </nav>
        <p className="text-center text-xs text-dark/50">{CLINIC.phone} · {CLINIC.cityLine}</p>
      </div>
    </>
  )
}
