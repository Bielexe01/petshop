import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/clinic'
import { PageHeader, Card, Table, Th, Td, RowAction, SearchInput, EmptyState } from '@/admin/ui'

interface Pet {
  id: number
  name: string
  species: string
  breed: string | null
  sex: string
  birth_date: string | null
  weight_kg: number | null
  owner_name: string | null
  owner_email: string | null
  owner_id: number
}

interface ClientOption {
  id: number
  full_name: string | null
  email: string
}

const EMPTY_FORM = { ownerId: '', name: '', species: 'cachorro', breed: '', sex: 'nao-informado', birthDate: '', weightKg: '', microchip: '', notes: '' }

export default function Pets() {
  const [pets, setPets] = useState<Pet[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = (q?: string) => {
    const query = q === undefined ? search : q
    api
      .get<{ pets: Pet[] }>(`/api/pets${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`)
      .then((r) => setPets(r.pets))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get<{ clients: ClientOption[] }>('/api/clients').then((r) => setClients(r.clients)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.ownerId) {
      setError('Selecione o cliente dono do pet.')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/pets/admin', {
        ownerId: Number(form.ownerId),
        name: form.name,
        species: form.species,
        breed: form.breed || null,
        sex: form.sex,
        birthDate: form.birthDate || null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        microchip: form.microchip || null,
        notes: form.notes || null,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o pet.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (p: Pet) => {
    if (!window.confirm(`Remover o pet ${p.name}?`)) return
    await api.del(`/api/pets/${p.id}`).catch(() => {})
    load()
  }

  return (
    <div>
      <PageHeader
        title="Pets"
        subtitle="Cadastro e vínculo com clientes."
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
          >
            {showForm ? 'Cancelar' : 'Novo pet'}
          </button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <p className="mb-4 font-display text-base font-black text-dark">Cadastrar pet</p>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="owner" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Cliente dono *</label>
              <select id="owner" value={form.ownerId} onChange={set('ownerId')} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa">
                <option value="">Selecione um cliente…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name ?? 'Sem nome'} · {c.email}</option>
                ))}
              </select>
            </div>
            <FormInput label="Nome do pet" required value={form.name} onChange={set('name')} placeholder="Ex.: Thor" />
            <Select label="Espécie" value={form.species} onChange={set('species')} options={[['cachorro', 'Cachorro'], ['gato', 'Gato'], ['outros', 'Outro']]} />
            <FormInput label="Raça" value={form.breed} onChange={set('breed')} placeholder="Ex.: Golden" />
            <Select label="Sexo" value={form.sex} onChange={set('sex')} options={[['macho', 'Macho'], ['femea', 'Fêmea'], ['nao-informado', 'Não informado']]} />
            <FormInput label="Nascimento" type="date" value={form.birthDate} onChange={set('birthDate')} />
            <FormInput label="Peso (kg)" type="number" step="0.1" min="0" value={form.weightKg} onChange={set('weightKg')} />
            <FormInput label="Microchip" value={form.microchip} onChange={set('microchip')} placeholder="Opcional" className="sm:col-span-2" />
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="notes" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Observações</label>
              <textarea id="notes" rows={2} value={form.notes} onChange={set('notes')} className="w-full rounded-xl border border-dark/15 bg-white px-4 py-3 text-[15px] text-dark outline-none focus:border-turquesa" placeholder="Alergias, temperamento…" />
            </div>
            {error && <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="h-12 rounded-full bg-turquesa px-8 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-azul disabled:opacity-60">
                {saving ? 'Salvando…' : 'Salvar pet'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); load(v) }} placeholder="Buscar por nome do pet ou dono…" />
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
      ) : pets.length === 0 ? (
        <EmptyState title="Nenhum pet encontrado" description="Ajuste a busca ou cadastre um novo pet." />
      ) : (
        <Card className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Pet</Th>
                <Th>Dono</Th>
                <Th>Espécie / Raça</Th>
                <Th>Nascimento</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {pets.map((p) => (
                <tr key={p.id} className="hover:bg-cream/60">
                  <Td>
                    <p className="font-semibold text-dark">{p.name}</p>
                    <p className="text-xs capitalize text-dark/45">{p.sex === 'macho' ? 'macho' : p.sex === 'femea' ? 'fêmea' : '—'}</p>
                  </Td>
                  <Td>
                    {p.owner_name ?? '—'}
                    <p className="text-xs text-dark/40">{p.owner_email}</p>
                  </Td>
                  <Td className="capitalize">{p.species}{p.breed ? ` · ${p.breed}` : ''}</Td>
                  <Td>{p.birth_date ? formatDate(p.birth_date) : '—'}</Td>
                  <Td className="text-right">
                    <RowAction tone="ghost" onClick={() => void remove(p)}>Remover</RowAction>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      )}
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

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (e: { target: { value: string } }) => void; options: Array<[string, string]> }) {
  const id = `sel-${label}`
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">{label}</label>
      <select id={id} value={value} onChange={onChange} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  )
}
