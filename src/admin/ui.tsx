import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Animações do toast (fade/slide-in) — reutilizadas via classe animate-toast-in. */
export const TOAST_ANIMATION_CLASS = 'animate-toast-in'

/** Ícone base SVG consistente (stroke, sem fill). */
function IconBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  )
}

export function CheckIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M20 6 9 17l-5-5" />
    </IconBase>
  )
}

export function SpinnerIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <IconBase className={cn('animate-spin', className)}>
      <path d="M21 12a9 9 0 1 1-6.2-8.56" />
    </IconBase>
  )
}

/** Cabeçalho de página do admin. */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-black tracking-tight text-dark lg:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-dark/55">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/** Card básico do admin. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-w-0 rounded-2xl border border-dark/8 bg-white p-5 shadow-soft', className)}>{children}</div>
}

/** Rótulo de seção dentro de um card (ex.: "Medicamentos", "Vínculo"). */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/45', className)}>
      {children}
    </p>
  )
}

/** Divider horizontal sutil entre blocos de um formulário/card. */
export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px bg-dark/8', className)} />
}

/** Modal simples e acessível para detalhes/formulários. */
export function Modal({
  onClose,
  children,
  label,
  className,
}: {
  onClose: () => void
  children: ReactNode
  label: string
  className?: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={label}>
      <div className="absolute inset-0 bg-dark/50" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-soft sm:rounded-3xl lg:p-8',
          className,
        )}
      >
        <button
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-dark/5 text-dark transition-colors hover:bg-dark/10"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

/** Badge de status/tipo. */
export type AdminBadgeTone = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'magenta' | 'turquesa' | 'azul' | 'verde'

export function Badge({ tone, children }: { tone: AdminBadgeTone; children: ReactNode }) {
  const tones: Record<AdminBadgeTone, string> = {
    green: 'bg-verde-claro text-verde',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-rosa-claro text-magenta',
    blue: 'bg-azul-claro text-azul',
    gray: 'bg-dark/8 text-dark/60',
    magenta: 'bg-magenta/10 text-magenta',
    turquesa: 'bg-turquesa-claro text-turquesa',
    azul: 'bg-azul-claro text-azul',
    verde: 'bg-verde-claro text-verde',
  }
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold', tones[tone])}>{children}</span>
}

/**
 * Tabela responsiva do admin.
 *
 * No desktop (≥ `lg`) renderiza a tabela clássica com rolagem horizontal
 * quando necessário. Em telas estreitas, cada linha se transforma em um
 * card empilhado: o cabeçalho some e cada célula vira uma linha "rótulo:
 * valor" (o rótulo vem do `th` correspondente, propagado via `data-label`
 * logo após a montagem). A semântica de tabela é preservada para leitores
 * de tela.
 */
export function Table({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLTableElement>(null)

  // Propaga o texto do <th> para cada célula da coluna como data-label.
  // Roda uma vez na montagem (e depois que os dados carregam a lista é
  // re-renderizada pela página; o useEffect abaixo cobre essa mudança).
  useLayoutEffect(() => {
    const table = ref.current
    if (!table) return
    const headCells = Array.from(table.querySelectorAll('thead th'))
    const bodyRows = Array.from(table.querySelectorAll('tbody tr'))
    for (const row of bodyRows) {
      const cells = Array.from(row.children as HTMLCollectionOf<HTMLElement>)
      cells.forEach((cell, i) => {
        const label = headCells[i]?.textContent?.trim()
        if (label) cell.setAttribute('data-label', label)
      })
    }
  })

  return (
    <div className="admin-table-scroll max-w-full overflow-x-auto">
      <table ref={ref} className="admin-table w-full border-collapse text-left">
        {children}
      </table>
    </div>
  )
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <th className={cn('border-b border-dark/8 px-4 py-3 font-display text-[11px] font-bold uppercase tracking-[0.14em] text-dark/45', className)}>
      {children}
    </th>
  )
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('border-b border-dark/5 px-4 py-3.5 text-sm text-dark/75', className)}>{children}</td>
}

/** Botão de ação compacto (linha de tabela). */
export function RowAction({ children, onClick, tone = 'dark', className }: { children: ReactNode; onClick?: () => void; tone?: 'dark' | 'magenta' | 'turquesa' | 'ghost'; className?: string }) {
  const tones = {
    dark: 'bg-dark text-white hover:bg-ink',
    magenta: 'bg-magenta text-white hover:bg-rosa',
    turquesa: 'bg-turquesa text-white hover:bg-azul',
    ghost: 'border border-dark/15 text-dark/70 hover:border-magenta hover:text-magenta',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('inline-flex h-9 items-center gap-1.5 rounded-full px-4 font-display text-[11px] font-bold uppercase tracking-wider transition-colors', tones[tone], className)}
    >
      {children}
    </button>
  )
}

/** Campo de busca inline (funciona bem em mobile e desktop). */
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

/** Estado vazio. */
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-dark/15 bg-cream px-6 py-14 text-center">
      <p className="font-display text-base font-bold text-dark">{title}</p>
      {description && <p className="max-w-sm text-sm text-dark/55">{description}</p>}
    </div>
  )
}

/** Toast de feedback (sucesso/erro) fixo no canto superior direito. */
export function Toast({ kind, message }: { kind: 'success' | 'error'; message: string }) {
  const styles =
    kind === 'success'
      ? 'border-verde/30 bg-verde-claro text-verde'
      : 'border-magenta/30 bg-rosa-claro text-magenta'
  return (
    <div className={cn('fixed right-4 top-4 z-[60] flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-soft animate-toast-in', styles)}>
      {kind === 'success' ? (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-verde text-white">
          <CheckIcon className="h-3.5 w-3.5" />
        </span>
      ) : (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-magenta text-white text-xs font-black">!</span>
      )}
      {message}
    </div>
  )
}

/** Campo de formulário reutilizável (input/select/textarea) para os modais de edição. */
export function FormField({
  label,
  className,
  textarea,
  options,
  hint,
  ...props
}: {
  label: string
  className?: string
  textarea?: boolean
  options?: Array<[string, string]>
  hint?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, 'className'>) {
  const id = props.id ?? props.name ?? label
  const base =
    'h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none placeholder:text-dark/30 focus:border-turquesa focus:ring-2 focus:ring-turquesa/15'
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">
        {label}
      </label>
      {textarea ? (
        <textarea id={id} rows={2} className={cn(base, 'h-auto py-3 leading-relaxed')} {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : options ? (
        <select id={id} className={base} {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}>
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      ) : (
        <input id={id} className={base} {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {hint && <p className="text-[11px] text-dark/45">{hint}</p>}
    </div>
  )
}

/**
 * Modal de detalhe + edição de um registro.
 * - `title` / `subtitle` / `avatar`: cabeçalho.
 * - `children`: campos de formulário (use `FormField`).
 * - `onSave`: chamado com o form; mostra loading; em sucesso toca `onSaved`.
 * - `onRemove`: opcional; mostra confirm antes.
 */
export function EditableModal({
  open,
  onClose,
  onSave,
  onSaved,
  onRemove,
  label,
  title,
  subtitle,
  avatar,
  children,
  saveLabel = 'Salvar',
}: {
  open: boolean
  onClose: () => void
  onSave: () => Promise<void>
  onSaved?: () => void
  onRemove?: () => Promise<void>
  label: string
  title: ReactNode
  subtitle?: ReactNode
  avatar?: ReactNode
  children: ReactNode
  saveLabel?: string
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [removing, setRemoving] = useState(false)

  const save = async () => {
    if (saving || done) return
    setError('')
    setSaving(true)
    try {
      await onSave()
      setDone(true)
      onSaved?.()
      setTimeout(() => {
        setDone(false)
        onClose()
      }, 900)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
      setSaving(false)
    }
  }

  const remove = async () => {
    if (removing || done) return
    setError('')
    if (!window.confirm('Excluir este registro? Essa ação não pode ser desfeita.')) return
    setRemoving(true)
    try {
      await onRemove?.()
      setDone(true)
      setTimeout(() => {
        setRemoving(false)
        onClose()
      }, 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir.')
      setRemoving(false)
    }
  }

  if (!open) return null

  return (
    <Modal onClose={onClose} label={label} className="max-w-2xl">
      {/* Cabeçalho */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {avatar}
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-black text-dark">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-sm text-dark/55">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1">{children}</div>

      {/* Erro */}
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta">
          {error}
        </p>
      )}

      {/* Ações */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-dark/8 pt-4">
        <div className="flex items-center gap-2">
          {onRemove && (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={removing || saving || done}
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-magenta/25 px-4 font-display text-[11px] font-bold uppercase tracking-wider text-magenta transition-colors hover:bg-magenta/5 disabled:opacity-50"
            >
              {removing ? <SpinnerIcon className="h-4 w-4" /> : <TrashIcon className="h-4 w-4" />}
              Remover
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || done}
            className="h-11 rounded-full border border-dark/15 px-5 font-display text-[11px] font-bold uppercase tracking-wider text-dark/70 transition-colors hover:border-dark/30 hover:text-dark disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || done}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-turquesa px-6 font-display text-[11px] font-bold uppercase tracking-wider text-white shadow-soft transition-colors hover:bg-azul disabled:opacity-60"
          >
            {done ? (
              <>
                <CheckIcon className="h-4 w-4" /> Salvo
              </>
            ) : saving ? (
              <>
                <SpinnerIcon className="h-4 w-4" /> Salvando…
              </>
            ) : (
              saveLabel
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
    </IconBase>
  )
}

/** Aviso de dados de demonstração. */
export function DemoHint() {
  return (
    <p className="rounded-xl border border-turquesa/30 bg-turquesa-claro/50 px-4 py-2.5 text-xs text-dark/60">
      <span className="font-bold text-turquesa">Dados de demonstração:</span> exemplo para visualização — a versão final será alimentada pela clínica.
    </p>
  )
}
