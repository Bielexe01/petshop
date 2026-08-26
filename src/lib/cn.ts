export type ClassValue = string | number | null | undefined | false

/**
 * Junta classes com espaços, ignorando falsy. Mini-impl do clsx/twMerge
 * (sem dependência) suficiente para o projeto.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
