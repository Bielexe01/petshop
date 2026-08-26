import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/clinic'
import { PageHeader, Card, Badge, Table, Th, Td, RowAction, SearchInput, EmptyState, Modal, Divider, SectionLabel, type AdminBadgeTone } from '@/admin/ui'
import { cn } from '@/lib/cn'

interface Client {
  id: number
  email: string
  full_name: string | null
  cpf: string | null
  phone: string | null
  is_active: number
  created_at: string
  pets_count: number
}

interface ClientDetail {
  client: {
    id: number
    email: string
    full_name: string | null
    cpf: string | null
    phone: string | null
    birth_date: string | null
    address: string | null
    is_active: number
  }
  pets: Array<{ id: number; name: string; species: string; breed: string | null }>
}

const EMPTY_FORM = { fullName: '', email: '', password: '', cpf: '', phone: '' }

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState<ClientDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const load = (q?: string) => {
    const query = q === undefined ? search : q
    api
      .get<{ clients: Client[] }>(`/api/clients${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`)
      .then((r) => setClients(r.clients))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/clients', {
        fullName: form.fullName,
        email: form.email,
        password: form.password || undefined,
        cpf: form.cpf || null,
        phone: form.phone || null,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o cliente.')
    } finally {
      setSaving(false)
    }
  }

  const openDetail = async (id: number) => {
    setDetailLoading(true)
    setDetail(null)
    try {
      const data = await api.get<ClientDetail>(`/api/clients/${id}`)
      setDetail(data)
    } catch {
      /* 404 */
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => setDetail(null)

  const toggleActive = async (c: Client) => {
    await api.put(`/api/clients/${c.id}`, { isActive: c.is_active === 0 }).catch(() => {})
    load()
  }

  const remove = async (c: Client) => {
    if (!window.confirm(`Remover o cliente ${c.full_name ?? c.email}? Essa ação não pode ser desfeita.`)) return
    await api.del(`/api/clients/${c.id}`).catch(() => {})
    load()
  }

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle="Cadastro e gestão dos tutores."
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
          >
            {showForm ? 'Cancelar' : 'Novo cliente'}
          </button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <p className="mb-4 font-display text-base font-black text-dark">Cadastrar cliente</p>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <FormInput label="Nome completo" required value={form.fullName} onChange={set('fullName')} className="sm:col-span-2" />
            <FormInput label="E-mail" type="email" required value={form.email} onChange={set('email')} />
            <FormInput label="Senha" type="password" value={form.password} onChange={set('password')} placeholder="Opcional (senha temporária)" />
            <FormInput label="CPF" value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" />
            <FormInput label="Telefone" value={form.phone} onChange={set('phone')} placeholder="(16) 00000-0000" />
            {error && <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="h-12 rounded-full bg-turquesa px-8 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-azul disabled:opacity-60">
                {saving ? 'Salvando…' : 'Salvar cliente'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); load(v) }} placeholder="Buscar por nome, e-mail ou CPF…" />
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
      ) : clients.length === 0 ? (
        <EmptyState title="Nenhum cliente encontrado" description="Ajuste a busca ou cadastre um novo cliente." />
      ) : (
        <Card className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Cliente</Th>
                <Th>Contato</Th>
                <Th>Pets</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="hover:bg-cream/60">
                  <Td>
                    <p className="font-semibold text-dark">{c.full_name ?? '—'}</p>
                    <p className="text-xs text-dark/45">{c.email}</p>
                  </Td>
                  <Td>
                    {c.phone || '—'}
                    {c.cpf && <p className="text-xs text-dark/40">{c.cpf}</p>}
                  </Td>
                  <Td>
                    <Badge tone={c.pets_count > 0 ? 'turquesa' : 'gray'}>{c.pets_count} pet{c.pets_count === 1 ? '' : 's'}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={c.is_active ? 'green' : 'red'}>{c.is_active ? 'Ativo' : 'Inativo'}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-1.5">
                      <RowAction tone="ghost" onClick={() => void openDetail(c.id)}>Ver</RowAction>
                      <RowAction tone="ghost" onClick={() => void toggleActive(c)}>{c.is_active ? 'Inativar' : 'Ativar'}</RowAction>
                      <RowAction tone="ghost" onClick={() => void remove(c)}>Remover</RowAction>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Modal de detalhes */}
      {detail && (
        <Modal onClose={closeDetail} label={`Detalhes de ${detail.client.full_name ?? 'cliente'}`}>
          {/* Barra de cabeçalho */}
          <div className="-mx-6 -mt-6 mb-6 border-b border-dark/8 bg-gradient-to-br from-rosa-claro/60 via-cream to-turquesa-claro/50 px-6 pb-5 pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-7">
            <div className="flex min-w-0 items-center gap-4 pr-14">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-magenta font-display text-lg font-black text-white shadow-glow">
                {initialsOf(detail.client.full_name, detail.client.email)}
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-display text-xl font-black text-dark">{detail.client.full_name ?? 'Sem nome'}</h2>
                <p className="mt-0.5 truncate text-sm text-dark/55">{detail.client.email}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={detail.client.is_active ? 'green' : 'red'}>{detail.client.is_active ? 'Ativo' : 'Inativo'}</Badge>
              <Badge tone="gray">{detail.pets.length} pet{detail.pets.length === 1 ? '' : 's'}</Badge>
            </div>
          </div>

          <SectionLabel>Contato</SectionLabel>
          <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            <ContactRow icon={<UserIcon className="h-4 w-4" />} tone="magenta" label="CPF" value={detail.client.cpf ?? '—'} />
            <ContactRow icon={<PhoneIcon className="h-4 w-4" />} tone="verde" label="Telefone" value={detail.client.phone ?? '—'} />
            <ContactRow icon={<CalendarIcon className="h-4 w-4" />} tone="azul" label="Nascimento" value={detail.client.birth_date ? formatDate(detail.client.birth_date) : '—'} />
            <ContactRow icon={<PinIcon className="h-4 w-4" />} tone="turquesa" label="Endereço" value={detail.client.address ?? '—'} span />
          </dl>

          <Divider className="my-6" />

          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionLabel>Pets vinculados</SectionLabel>
            {detail.pets.length > 0 && <Badge tone="turquesa">{detail.pets.length} pet{detail.pets.length === 1 ? '' : 's'}</Badge>}
          </div>
          {detail.pets.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-dark/12 bg-cream px-4 py-4">
              <PawIcon className="h-5 w-5 shrink-0 text-dark/30" />
              <p className="text-sm text-dark/55">Nenhum pet vinculado.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {detail.pets.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border border-dark/8 bg-cream px-4 py-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-turquesa-claro text-turquesa">
                    <PawIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-dark">{p.name}</p>
                    {p.breed && <p className="truncate text-xs text-dark/45">{p.breed}</p>}
                  </div>
                  <Badge tone={speciesTone(p.species)}>{capitalize(p.species)}</Badge>
                </li>
              ))}
            </ul>
          )}

          {/* Nota de rodapé */}
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-dark/8 bg-cream px-4 py-3.5">
            <PencilIcon className="mt-0.5 h-4 w-4 shrink-0 text-turquesa" />
            <p className="text-xs leading-relaxed text-dark/55">
              Esses dados podem ser <span className="font-semibold text-dark/80">editados pela clínica</span>. Alterações ficam
              registradas no sistema e valem para os próximos atendimentos.
            </p>
          </div>
        </Modal>
      )}
      {detailLoading && <div className="fixed inset-0 z-40 flex items-center justify-center bg-dark/30"><div className="h-10 w-10 animate-spin rounded-full border-2 border-white border-t-transparent" /></div>}
    </div>
  )
}

function FormInput({ label, className, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label htmlFor={id} className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">{label}</label>
      <input id={id} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none placeholder:text-dark/30 focus:border-turquesa" {...props} />
    </div>
  )
}

function ContactRow({
  icon,
  label,
  value,
  tone = 'magenta',
  span,
}: {
  icon: ReactNode
  label: string
  value: string
  tone?: 'magenta' | 'turquesa' | 'azul' | 'verde'
  span?: boolean
}) {
  const iconTones: Record<'magenta' | 'turquesa' | 'azul' | 'verde', string> = {
    magenta: 'bg-rosa-claro/70 text-magenta',
    turquesa: 'bg-turquesa-claro/70 text-turquesa',
    azul: 'bg-azul-claro/70 text-azul',
    verde: 'bg-verde-claro/70 text-verde',
  }
  return (
    <div className={cn('flex min-w-0 items-start gap-3', span && 'sm:col-span-2')}>
      <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full', iconTones[tone])}>{icon}</span>
      <div className="min-w-0 max-w-full">
        <dt className="text-[11px] font-bold uppercase tracking-wider text-dark/45">{label}</dt>
        <dd className={cn('mt-0.5 text-sm font-medium text-dark', span ? 'break-words' : 'truncate')}>{value}</dd>
      </div>
    </div>
  )
}

/** Iniciais do tutor para o avatar do cabeçalho. */
function initialsOf(name: string | null, email: string): string {
  const clean = (name ?? '').trim()
  if (!clean) {
    const first = email.trim().charAt(0)
    return first ? first.toUpperCase() : '?'
  }
  const parts = clean.split(/\s+/)
  const first = parts[0]?.charAt(0) ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : ''
  return (first + last).toUpperCase() || '?'
}

/** Cor do chip da espécie conforme o pet. */
function speciesTone(species: string): AdminBadgeTone {
  const map: Record<string, AdminBadgeTone> = {
    cachorro: 'turquesa',
    cão: 'turquesa',
    cao: 'turquesa',
    gato: 'magenta',
    ave: 'azul',
    roedor: 'verde',
    coelho: 'verde',
    outro: 'gray',
  }
  return map[species.toLowerCase().trim()] ?? 'gray'
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function IconBase({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.5 3.5-5.5 8-5.5s8 2 8 5.5" />
    </IconBase>
  )
}

function PhoneIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M6.6 3h3l1.5 4-2 1.5a12 12 0 0 0 5.4 5.4l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.2 2 2 0 0 1 6.6 3Z" />
    </IconBase>
  )
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </IconBase>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </IconBase>
  )
}

function PawIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <circle cx="6.5" cy="8.5" r="1.5" />
      <circle cx="10" cy="6" r="1.5" />
      <circle cx="14" cy="6" r="1.5" />
      <circle cx="17.5" cy="8.5" r="1.5" />
      <path d="M12 11c-3 0-5.5 2-5.5 4.5 0 1.7 1.2 2.5 2.6 2.5 1 0 1.9-.4 2.9-.4s1.9.4 2.9.4c1.4 0 2.6-.8 2.6-2.5C17.5 13 15 11 12 11Z" />
    </IconBase>
  )
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M4 20l1-4L16 5a2.1 2.1 0 0 1 3 3L8 19l-4 1Z" />
      <path d="M13.5 6.5l4 4" />
    </IconBase>
  )
}
