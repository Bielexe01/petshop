import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Cabeçalho padrão de página do portal. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-black tracking-tight text-dark lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-dark/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/** Card básico do portal. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-dark/8 bg-white p-5 shadow-soft', className)}>{children}</div>
  )
}

/** Estado vazio amigável. */
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-dark/15 bg-cream px-6 py-14 text-center">
      {icon && <span className="text-magenta/50">{icon}</span>}
      <p className="font-display text-base font-bold text-dark">{title}</p>
      {description && <p className="max-w-sm text-sm text-dark/55">{description}</p>}
      {action}
    </div>
  )
}

/** Badge de status. */
export type BadgeTone = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'magenta' | 'turquesa' | 'azul' | 'verde' | 'rosa'

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  const tones: Record<BadgeTone, string> = {
    green: 'bg-verde-claro text-verde',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-rosa-claro text-magenta',
    blue: 'bg-azul-claro text-azul',
    gray: 'bg-dark/8 text-dark/60',
    magenta: 'bg-magenta/10 text-magenta',
    turquesa: 'bg-turquesa-claro text-turquesa',
    azul: 'bg-azul-claro text-azul',
    verde: 'bg-verde-claro text-verde',
    rosa: 'bg-rosa-claro text-magenta',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', tones[tone])}>
      {children}
    </span>
  )
}

/** Campo de busca inline para listas do portal (mobile-friendly). */
export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark/35" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4-4" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Buscar…'}
        aria-label={placeholder ?? 'Buscar'}
        className="h-11 w-full rounded-xl border border-dark/15 bg-white pl-10 pr-9 text-sm text-dark outline-none placeholder:text-dark/30 focus:border-turquesa focus:ring-2 focus:ring-turquesa/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-dark/40 transition-colors hover:bg-dark/8 hover:text-dark"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      )}
    </div>
  )
}

/** Carteira de vacinação: status derivado. */
export function vaccineStatus(nextDoseAt: string | null): { tone: 'green' | 'yellow' | 'red'; label: string } {
  if (!nextDoseAt) return { tone: 'green', label: 'Em dia' }
  const next = new Date(nextDoseAt)
  const now = new Date()
  const diff = next.getTime() - now.getTime()
  const days = diff / (1000 * 60 * 60 * 24)
  if (days < 0) return { tone: 'red', label: 'Atrasada' }
  if (days <= 30) return { tone: 'yellow', label: 'Próxima dose' }
  return { tone: 'green', label: 'Em dia' }
}
