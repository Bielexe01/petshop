import { type ButtonHTMLAttributes, type AnchorHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'dark' | 'turquoise' | 'white' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg' | 'xl'

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-display font-bold tracking-tight transition-all duration-300 select-none whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-turquesa disabled:opacity-50 disabled:pointer-events-none'

const variants: Record<Variant, string> = {
  primary:
    'bg-magenta text-white hover:bg-rosa hover:shadow-glow hover:-translate-y-0.5 active:translate-y-0',
  dark: 'bg-dark text-white hover:bg-ink hover:-translate-y-0.5',
  turquoise: 'bg-turquesa text-white hover:bg-azul hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-10px_rgb(25_183_200/0.6)]',
  white: 'bg-white text-magenta hover:bg-cream hover:-translate-y-0.5 shadow-soft',
  outline: 'border border-dark/20 text-dark hover:border-magenta hover:text-magenta hover:-translate-y-0.5',
  ghost: 'text-dark hover:bg-dark/5',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-6 text-sm',
  lg: 'h-13 px-8 text-[15px]',
  xl: 'h-15 px-10 text-base',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
})

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant
  size?: Size
}

export const ButtonLink = forwardRef<HTMLAnchorElement, ButtonLinkProps>(function ButtonLink(
  { variant = 'primary', size = 'md', className, ...props },
  ref,
) {
  return <a ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
})
