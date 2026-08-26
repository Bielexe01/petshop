import { useEffect, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/clinic'
import { PageHeader, Card, Badge, Table, Th, Td, RowAction, SearchInput, EmptyState, DemoHint } from '@/admin/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'

interface Vaccination {
  id: number
  pet_name: string
  client_name: string | null
  name: string
  applied_at: string | null
  next_dose_at: string | null
  lot: string | null
  clinic_name: string | null
  vet_name: string | null
}

interface PetOption {
  id: number
  name: string
  owner_name: string | null
}

const EMPTY_FORM = { petId: '', name: '', appliedAt: '', nextDoseAt: '', lot: '', clinicName: 'Clínica Dr.ª Cássia Carvalho', vetName: '' }

function doseStatus(next: string | null): { tone: 'green' | 'yellow' | 'red'; label: string } {
  if (!next) return { tone: 'green', label: 'Em dia' }
  const diff = new Date(next).getTime() - Date.now()
  const days = diff / 86_400_000
  if (days < 0) return { tone: 'red', label: 'Atrasada' }
  if (days <= 30) return { tone: 'yellow', label: 'Próxima dose' }
  return { tone: 'green', label: 'Em dia' }
}

export default function Vacinas() {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [pets, setPets] = useState<PetOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { query, setQuery, filtered: filteredVaccinations } = useSearchFilter(vaccinations, (v) => [v.name, v.pet_name, v.client_name ?? '', v.vet_name ?? '', v.lot ?? '', v.clinic_name ?? '', doseStatus(v.next_dose_at).label])

  const load = () => {
    api.get<{ vaccinations: Vaccination[] }>('/api/vaccinations').then((r) => setVaccinations(r.vaccinations)).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get<{ pets: PetOption[] }>('/api/pets').then((r) => setPets(r.pets)).catch(() => {})
  }, [])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.petId) {
      setError('Selecione o pet.')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/vaccinations', {
        petId: Number(form.petId),
        name: form.name,
        appliedAt: form.appliedAt || null,
        nextDoseAt: form.nextDoseAt || null,
        lot: form.lot || null,
        clinicName: form.clinicName || null,
        vetName: form.vetName || null,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar a vacina.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (v: Vaccination) => {
    if (!window.confirm(`Remover a vacina "${v.name}" de ${v.pet_name}?`)) return
    await api.del(`/api/vaccinations/${v.id}`).catch(() => {})
    load()
  }

  return (
    <div>
      <PageHeader
        title="Vacinas"
        subtitle="Registro de vacinas e controle de doses."
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
          >
            {showForm ? 'Cancelar' : 'Registrar vacina'}
          </button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <p className="mb-4 font-display text-base font-black text-dark">Registrar vacinação</p>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="pet" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Pet *</label>
              <select id="pet" value={form.petId} onChange={set('petId')} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa">
                <option value="">Selecione um pet…</option>
                {pets.map((p) => <option key={p.id} value={p.id}>{p.name}{p.owner_name ? ` · ${p.owner_name}` : ''}</option>)}
              </select>
            </div>
            <FormInput label="Vacina *" required value={form.name} onChange={set('name')} placeholder="Ex.: V10" />
            <FormInput label="Lote" value={form.lot} onChange={set('lot')} placeholder="Ex.: B12345" />
            <FormInput label="Aplicada em" type="date" value={form.appliedAt} onChange={set('appliedAt')} />
            <FormInput label="Próxima dose" type="date" value={form.nextDoseAt} onChange={set('nextDoseAt')} />
            <FormInput label="Clínica" value={form.clinicName} onChange={set('clinicName')} />
            <FormInput label="Médica responsável" value={form.vetName} onChange={set('vetName')} placeholder="Dr.ª Cássia Carvalho" />
            {error && <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="h-12 rounded-full bg-turquesa px-8 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-azul disabled:opacity-60">
                {saving ? 'Salvando…' : 'Registrar vacina'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por vacina, pet, cliente ou lote…" />
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
      ) : vaccinations.length === 0 ? (
        <div className="space-y-6">
          <EmptyState title="Nenhuma vacina registrada" description="Registre a primeira vacina." />
          <DemoHint />
        </div>
      ) : (
        <div>
          <Card className="p-0">
            <Table>
              <thead>
                <tr>
                  <Th>Vacina</Th>
                  <Th>Pet / Cliente</Th>
                  <Th>Aplicada</Th>
                  <Th>Próxima dose</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {filteredVaccinations.map((v) => {
                  const st = doseStatus(v.next_dose_at)
                  return (
                    <tr key={v.id} className="hover:bg-cream/60">
                      <Td>
                        <p className="font-semibold text-dark">{v.name}</p>
                        {v.lot && <p className="text-xs text-dark/45">Lote {v.lot}</p>}
                      </Td>
                      <Td>
                        {v.pet_name}
                        <p className="text-xs text-dark/45">{v.client_name ?? '—'}</p>
                      </Td>
                      <Td>{v.applied_at ? formatDate(v.applied_at) : '—'}</Td>
                      <Td>{v.next_dose_at ? formatDate(v.next_dose_at) : '—'}</Td>
                      <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                      <Td className="text-right">
                        <RowAction tone="ghost" onClick={() => void remove(v)}>Remover</RowAction>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          </Card>
          <div className="mt-6">
            <DemoHint />
          </div>
        </div>
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
