import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import { useSession } from '@/lib/session'
import { VetCrossIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'

type NavItem = { to: string; label: string; icon: (p: { className?: string }) => React.ReactNode; end?: boolean; superOnly?: boolean }

const NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: GridIcon, end: true },
  { to: '/admin/clientes', label: 'Clientes', icon: UsersIcon },
  { to: '/admin/pets', label: 'Pets', icon: PawAdminIcon },
  { to: '/admin/consultas', label: 'Consultas', icon: StethIcon },
  { to: '/admin/receitas', label: 'Receitas', icon: RxIcon },
  { to: '/admin/exames', label: 'Exames', icon: FlaskIcon },
  { to: '/admin/vacinas', label: 'Vacinas', icon: ShieldIcon },
  { to: '/admin/documentos', label: 'Documentos', icon: DocIcon },
  { to: '/admin/fotos', label: 'Fotos do site', icon: ImageIcon },
  { to: '/admin/logs', label: 'Auditoria', icon: LogsIcon },
  { to: '/admin/funcionarios', label: 'Funcionários', icon: StaffIcon, superOnly: true },
]

/**
 * Layout do painel administrativo. Sidebar desktop + drawer mobile,
 * com guard de papel admin no router (RequireAdmin).
 */
export default function AdminLayout() {
  const { user, logout } = useSession()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/admin/login', { replace: true })
    }
  }, [user, navigate])

  // Trava o scroll do corpo enquanto o drawer mobile está aberto.
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
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-dark">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-dark lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-white/10 px-5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-magenta text-white">
            <VetCrossIcon className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-[13px] font-black text-white">Painel Admin</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-turquesa">Dr.ª Cássia</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu administrativo">
          {NAV.filter((item) => !item.superOnly || user?.isSuperAdmin).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'mb-1 flex items-center gap-3 rounded-xl px-3.5 py-2.5 font-display text-[13px] font-semibold transition-colors',
                  isActive ? 'bg-magenta/20 text-white' : 'text-white/55 hover:bg-white/8 hover:text-white',
                )
              }
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-white/6 px-3 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-turquesa text-sm font-black text-white">
              {user?.name?.charAt(0).toUpperCase() ?? 'A'}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-bold text-white">{user?.name}</p>
              <p className="truncate text-[11px] text-white/45">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={doLogout}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-white/50 transition-colors hover:bg-white/8 hover:text-white"
          >
            <LogoutIcon className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      {/* Header mobile */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between bg-dark px-4 lg:hidden">
        <Link to="/admin" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-magenta text-white">
            <VetCrossIcon className="h-4 w-4" />
          </span>
          <span className="font-display text-sm font-black text-white">Painel Admin</span>
        </Link>
        <button
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label="Abrir menu"
          aria-expanded={mobileNavOpen}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white"
        >
          <MenuIcon />
        </button>
      </header>

      {/* Drawer mobile */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 overscroll-contain lg:hidden" role="dialog" aria-modal="true">
          {/* Fundo quase opaco + blur: nada do conteúdo vaza por baixo */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setMobileNavOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-80 max-w-[88vw] flex-col bg-dark">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-magenta text-white">
                  <VetCrossIcon className="h-4.5 w-4.5" />
                </span>
                <div className="leading-tight">
                  <p className="font-display text-[13px] font-black text-white">Painel Admin</p>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-turquesa">Dr.ª Cássia</p>
                </div>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                aria-label="Fechar menu"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                ✕
              </button>
            </div>
            {/* Navegação */}
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu administrativo">
              <p className="px-3 pb-2 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Menu</p>
              <div className="flex flex-col gap-1">
                {NAV.filter((item) => !item.superOnly || user?.isSuperAdmin).map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3.5 py-3 font-display text-sm font-semibold transition-colors',
                        isActive ? 'bg-magenta/20 text-white' : 'text-white/60 hover:bg-white/8 hover:text-white',
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
            <div className="border-t border-white/10 p-3">
              <div className="flex items-center gap-3 rounded-xl bg-white/6 px-3 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-turquesa text-sm font-black text-white">
                  {user?.name?.charAt(0).toUpperCase() ?? 'A'}
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[13px] font-bold text-white">{user?.name}</p>
                  <p className="truncate text-[11px] text-white/45">{user?.email}</p>
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
        <main className="min-h-screen overflow-x-clip bg-cream px-4 pb-16 pt-24 lg:px-8 lg:pt-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function GridIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
}
function UsersIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}
function PawAdminIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="4" r="2" /><circle cx="18" cy="8" r="2" /><circle cx="20" cy="16" r="2" /><path d="M9 10a5 5 0 0 1 5 5c0 2.5-2 5-5.5 5H8.5C5 20 3 17.5 3 15c0-2.5 2-5 5-5h1z" /></svg>
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
function ImageIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
}
function LogsIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
}
function StaffIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /><path d="M15 11.5 17 13l3.5-3.5" /></svg>
}
function MenuIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}><path d="M4 6h16M4 12h16M4 18h16" /></svg>
}
function LogoutIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
}
