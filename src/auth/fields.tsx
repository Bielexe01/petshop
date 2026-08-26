import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Input com rótulo, validação visual e suporte a erro. */
export function Field({
  label,
  error,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const id = props.id ?? props.name
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">
        {label}
      </label>
      <input
        id={id}
        className={cn(
          'h-12 w-full rounded-xl border bg-white px-4 text-[15px] text-dark outline-none transition-colors',
          'placeholder:text-dark/30 focus:border-turquesa',
          error ? 'border-magenta' : 'border-dark/15',
        )}
        {...props}
      />
      {error && <p className="text-xs font-medium text-magenta">{error}</p>}
      {hint && !error && <p className="text-xs text-dark/45">{hint}</p>}
    </div>
  )
}

/** Input de senha com botão mostrar/ocultar. */
export function PasswordField({
  label,
  error,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string }) {
  const [show, setShow] = useState(false)
  const id = props.id ?? props.name
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className={cn(
            'h-12 w-full rounded-xl border bg-white px-4 pr-14 text-[15px] text-dark outline-none transition-colors',
            'placeholder:text-dark/30 focus:border-turquesa',
            error ? 'border-magenta' : 'border-dark/15',
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-3 top-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-lg text-dark/40 hover:bg-dark/5 hover:text-dark/70"
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && <p className="text-xs font-medium text-magenta">{error}</p>}
      {hint && !error && <p className="text-xs text-dark/45">{hint}</p>}
    </div>
  )
}

/** Banner de demonstração — mostra as credenciais de teste. */
export function DemoBanner({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-turquesa/30 bg-turquesa-claro/60 px-4 py-3 text-xs leading-relaxed text-dark/70">
      <p className="font-display text-[10px] font-black uppercase tracking-[0.2em] text-turquesa">
        Modo demonstração
      </p>
      {children}
    </div>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19M2 2l20 20" />
    </svg>
  )
}
