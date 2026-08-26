/** Dados globais da clínica — fonte única usada em toda a landing e portal. */
export const CLINIC = {
  name: 'Clínica Veterinária Dr.ª Cássia Carvalho',
  shortName: 'Dr.ª Cássia Carvalho',
  city: 'Guariba — São Paulo',
  address: 'R. Bonfim, 1015 — Vila Garavello',
  cityLine: 'Guariba · SP',
  zip: '14845-012',
  fullAddress: 'R. Bonfim, 1015 — Vila Garavello, Guariba - SP, 14845-012',
  phone: '(16) 99781-7140',
  phoneRaw: '16997817140',
  whatsappUrl: 'https://wa.me/5516997817140',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Cl%C3%ADnica+Veterin%C3%A1ria+Dr.+C%C3%A1ssia+Carvalho+Guariba',
  mapsDirectionsUrl:
    'https://www.google.com/maps/dir/?api=1&destination=R.+Bonfim,+1015+-+Vila+Garavello,+Guariba+-+SP,+14845-012',
  mapsEmbedUrl:
    'https://www.google.com/maps?q=R.%20Bonfim%2C%201015%20-%20Vila%20Garavello%2C%20Guariba%20-%20SP%2C%2014845-012&output=embed',
  opening: 'Atendimento 24 horas',
  email: 'contato@cassiaveterinaria.com.br',
} as const

export interface NavItem {
  label: string
  href: string
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'A Clínica', href: '#a-clinica' },
  { label: 'Serviços', href: '#servicos' },
  { label: 'Estrutura', href: '#estrutura' },
  { label: 'Equipe', href: '#equipe' },
  { label: 'Depoimentos', href: '#depoimentos' },
  { label: 'Contato', href: '#contato' },
]

/** Cores da marca como utilitários hex (para estilos inline/GSAP). */
export const COLORS = {
  magenta: '#E83E8C',
  rosa: '#F45B9A',
  turquesa: '#19B7C8',
  azul: '#299BD6',
  verde: '#57C978',
  dark: '#17202A',
  ink: '#2C3E50',
  cream: '#FFF9FB',
} as const

export type AccentColor = 'magenta' | 'rosa' | 'turquesa' | 'azul' | 'verde'

export const ACCENT_HEX: Record<AccentColor, string> = {
  magenta: COLORS.magenta,
  rosa: COLORS.rosa,
  turquesa: COLORS.turquesa,
  azul: COLORS.azul,
  verde: COLORS.verde,
}

export function accentClass(color: AccentColor, kind: 'text' | 'bg' | 'border'): string {
  const map: Record<AccentColor, Record<'text' | 'bg' | 'border', string>> = {
    magenta: { text: 'text-magenta', bg: 'bg-magenta', border: 'border-magenta' },
    rosa: { text: 'text-rosa', bg: 'bg-rosa', border: 'border-rosa' },
    turquesa: { text: 'text-turquesa', bg: 'bg-turquesa', border: 'border-turquesa' },
    azul: { text: 'text-azul', bg: 'bg-azul', border: 'border-azul' },
    verde: { text: 'text-verde', bg: 'bg-verde', border: 'border-verde' },
  }
  return map[color][kind]
}

/** Formata data ISO para pt-BR. */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d)
}

/**
 * Formata o nome de um(a) profissional com o tratamento correto.
 * Evita duplicar "Dra. Dr.ª Cássia" quando o banco já guarda o título
 * (ex.: `Dr.ª Cássia Carvalho`). Se o nome já começar com Dr./Dra./Dr.ª,
 * usa como está; caso contrário prefixa "Dra.".
 */
export function formatVetName(name: string | null | undefined): string {
  if (!name) return ''
  const trimmed = name.trim()
  // Nomes que já trazem o título (Dr., Dra., Dr.ª, Dr …) são usados como estão.
  if (/^dr[a]?\.?/i.test(trimmed)) return trimmed
  return `Dra. ${trimmed}`
}

/** URL autenticada da foto de um pet, se houver (`photo_url` salvo no storage). */
export function petPhotoUrl(petId: number, photoUrl: string | null | undefined): string | null {
  if (!photoUrl || !photoUrl.startsWith('petphotos/')) return null
  return `/api/pets/mine/${petId}/photo`
}

export function formatDateFull(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}
