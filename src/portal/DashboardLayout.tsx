import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useSession } from '@/lib/session'
import { CLINIC } from '@/lib/clinic'
import { PawIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

const NAV = [
  { to: '/dashboard', label: 'Visão geral', icon: HomeIcon, end: true },
  { to: '/dashboard/pets', label: 'Meus Pets', icon: PawIcon },
  { to: '/dashboard/consultas', label: 'Consultas', icon: StethIcon },
  { to: '/dashboard/receitas', label: 'Receitas', icon: RxIcon },
  { to: '/dashboard/exames', label: 'Exames', icon: FlaskIcon },
  { to: '/dashboard/vacinas', label: 'Vacinas', icon: ShieldIcon },
  { to: '/dashboard/documentos', label: 'Documentos', icon: DocIcon },
  { to: '/dashboard/agendamentos', label: 'Agendamentos', icon: CalIcon },
  { to: '/dashboard/notificacoes', label: 'Notificações', icon: BellIcon },
  { to: '/dashboard/perfil', label: 'Perfil', icon: UserIcon },
]

/**
 * Layout da área do cliente: sidebar desktop / bottom-nav mobile.
 * Design limpo e produtivo (sem efeitos cinematográficos).
 */
export default function DashboardLayout() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (user?.role !== 'client') {
      navigate('/login', { replace: true })
    }
  }, [user, navigate])

  // Enquanto o drawer mobile está aberto, trava o scroll do corpo para o
  // conteúdo não "vazar" por baixo do overlay (que é transparente).
  useEffect(() => {
    if (!mobileNavOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mobileNavOpen])

  const doLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-dark/8 bg-white lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-dark/8 px-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-magenta text-white">
            <PawIcon className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-[13px] font-black text-dark">Área do Cliente</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-magenta">Dr.ª Cássia</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu da área do cliente">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'mb-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-display text-[13px] font-semibold transition-colors',
                  isActive
                    ? 'bg-magenta/10 text-magenta'
                    : 'text-dark/65 hover:bg-dark/5 hover:text-dark',
                )
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-dark/8 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-cream px-3 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-turquesa text-sm font-black text-white">
              {user?.name?.charAt(0).toUpperCase() ?? 'C'}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-bold text-dark">{user?.name}</p>
              <p className="truncate text-[11px] text-dark/50">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={doLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-dark/55 transition-colors hover:bg-dark/5 hover:text-magenta"
          >
            <LogoutIcon className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-dark/8 bg-white px-4 lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-magenta text-white">
            <PawIcon className="h-4 w-4" />
          </span>
          <span className="font-display text-sm font-black text-dark">Área do Cliente</span>
        </Link>
        <button
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label="Abrir menu"
          aria-expanded={mobileNavOpen}
          className="grid h-10 w-10 place-items-center rounded-full border border-dark/10 text-dark"
        >
          <MenuIcon />
        </button>
      </header>

      {/* Drawer mobile */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 overscroll-contain lg:hidden" role="dialog" aria-modal="true">
          {/* Fundo quase opaco + blur: nada do conteúdo vaza por baixo */}
          <div className="absolute inset-0 bg-dark/90 backdrop-blur-md" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-80 max-w-[88vw] flex-col bg-white shadow-soft">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-dark/8 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-magenta text-white">
                  <PawIcon className="h-4.5 w-4.5" />
                </span>
                <div className="leading-tight">
                  <p className="font-display text-[13px] font-black text-dark">Área do Cliente</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-magenta">Dr.ª Cássia</p>
                </div>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Fechar menu"
                className="grid h-9 w-9 place-items-center rounded-full bg-dark/5 text-dark hover:bg-dark/10"
              >
                ✕
              </button>
            </div>
            {/* Navegação */}
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu da área do cliente">
              <p className="px-3 pb-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-dark/40">Menu</p>
              <div className="flex flex-col gap-1">
                {NAV.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3.5 py-3 font-display text-sm font-semibold transition-colors',
                        isActive ? 'bg-magenta/12 text-magenta' : 'text-dark/65 hover:bg-dark/5 hover:text-dark',
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </nav>
            {/* Rodapé com perfil + sair */}
            <div className="border-t border-dark/8 p-3">
              <div className="flex items-center gap-3 rounded-xl bg-cream px-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-turquesa text-sm font-black text-white">
                  {user?.name?.charAt(0).toUpperCase() ?? 'C'}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[13px] font-bold text-dark">{user?.name}</p>
                  <p className="truncate text-[11px] text-dark/50">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={doLogout}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-magenta px-4 py-3 font-display text-xs font-bold uppercase tracking-wider text-white"
              >
                <LogoutIcon className="h-4 w-4" /> Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="min-w-0 flex-1 lg:pl-64">
        <main className="min-h-screen overflow-x-clip px-4 pb-28 pt-24 lg:px-8 lg:pt-8 lg:pb-16">
          <Outlet />
        </main>
      </div>

      {/* CTA de emergência fixo */}
      <a
        href={CLINIC.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-4 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-magenta px-5 font-display text-xs font-black uppercase tracking-wider text-white shadow-glow lg:bottom-6"
      >
        🚨 Emergência 24h
      </a>
    </div>
  )
}

/* Ícones inline simples */
function HomeIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" /></svg>
}
function StethIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 3v6a5 5 0 0 0 10 0V3M9 14v3a4 4 0 0 0 8 0v-2" /><circle cx="19" cy="7" r="2" /></svg>
}
function RxIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 3h6a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M8 11v8l2 2 3-3 3 3 2-2v-8" /></svg>
}
function FlaskIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 3h6M10 3v5.5L4.5 18a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 8.5V3" /><path d="M7 15h10" /></svg>
}
function ShieldIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z" /><path d="m8.5 12 2.5 2.5 4.5-4.5" /></svg>
}
function DocIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M9 13h6M9 17h4" /></svg>
}
function CalIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
}
function BellIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
}
function UserIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}
function MenuIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
}
function LogoutIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
}
