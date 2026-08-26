import { useMemo, useState } from 'react'

/**
 * Busca client-side instantânea (sem refetch no servidor).
 * Útil para listas pequenas/médias já carregadas na memória.
 * Retorna o texto da busca, um setter e a lista filtrada por um ou mais
 * campos. A busca ignora acentos e caixa.
 */
export function useSearchFilter<T>(
  items: T[],
  getFields: (item: T) => string[],
): { query: string; setQuery: (q: string) => void; filtered: T[]; hasQuery: boolean } {
  const [query, setQuery] = useState('')

  const normalized = query.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

  const filtered = useMemo(() => {
    if (!normalized) return items
    return items.filter((item) =>
      getFields(item).some((field) =>
        (field ?? '')
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .toLowerCase()
          .includes(normalized),
      ),
    )
  }, [items, normalized, getFields])

  return { query, setQuery, filtered, hasQuery: normalized.length > 0 }
}
