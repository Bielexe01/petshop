import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { api } from '@/lib/api'
import { formatDateFull, formatVetName } from '@/lib/clinic'
import { PageHeader, Card, Badge, Table, Th, Td, RowAction, SearchInput, EmptyState, FormField, EditableModal, Toast } from '@/admin/ui'

interface Appointment {
  id: number
  pet_id: number
  pet_name: string
  client_name: string | null
  vet_name: string | null
  type: string
  scheduled_at: string | null
  status: string
  summary: string | null
  diagnosis: string | null
  notes: string | null
}

interface PetOption {
  id: number
  name: string
  owner_name: string | null
}

const EMPTY_FORM = { petId: '', type: 'consulta', vetName: '', scheduledAt: '', status: 'agendada', summary: '', diagnosis: '', notes: '' }

const statusBadge: Record<string, { tone: 'blue' | 'green' | 'red'; label: string }> = {
  agendada: { tone: 'blue', label: 'Agendada' },
  realizada: { tone: 'green', label: 'Realizada' },
  cancelada: { tone: 'red', label: 'Cancelada' },
}

const typeLabel: Record<string, string> = {
  consulta: 'Consulta', urgencia: 'Urgência', cirurgia: 'Cirurgia', retorno: 'Retorno', vacina: 'Vacinação', outros: 'Outros',
}

const typeOptions: Array<[string, string]> = [
  ['consulta', 'Consulta'], ['urgencia', 'Urgência'], ['cirurgia', 'Cirurgia'], ['retorno', 'Retorno'], ['vacina', 'Vacinação'], ['outros', 'Outros'],
]

const statusOptions: Array<[string, string]> = [
  ['agendada', 'Agendada'], ['realizada', 'Realizada'], ['cancelada', 'Cancelada'],
]

export default function Consultas() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [pets, setPets] = useState<PetOption[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [toastMsg, setToastMsg] = useState('')
  const toastTimer = useRef<number | undefined>(undefined)

  const load = (q?: string) => {
    const query = q === undefined ? search : q
    api
      .get<{ appointments: Appointment[] }>(`/api/appointments${query.trim() ? `?search=${encodeURIComponent(query.trim())}` : ''}`)
      .then((r) => setAppointments(r.appointments))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get<{ pets: PetOption[] }>('/api/pets').then((r) => setPets(r.pets)).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      await api.post('/api/appointments', {
        petId: Number(form.petId),
        vetName: form.vetName || null,
        type: form.type,
        scheduledAt: form.scheduledAt || null,
        status: form.status,
        summary: form.summary || null,
        diagnosis: form.diagnosis || null,
        notes: form.notes || null,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a consulta.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (a: Appointment) => {
    if (!window.confirm(`Remover a consulta de ${a.pet_name}?`)) return
    await api.del(`/api/appointments/${a.id}`).catch(() => {})
    load()
  }

  const showToast = (msg: string) => {
    setToastMsg(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2500)
  }

  const setEdit = (k: keyof typeof editForm) => (e: { target: { value: string } }) => setEditForm((f) => ({ ...f, [k]: e.target.value }))

  const openEdit = (a: Appointment) => {
    setEditForm({
      petId: String(a.pet_id),
      type: a.type,
      status: a.status,
      vetName: a.vet_name ?? '',
      scheduledAt: a.scheduled_at ? a.scheduled_at.replace(' ', 'T').slice(0, 16) : '',
      summary: a.summary ?? '',
      diagnosis: a.diagnosis ?? '',
      notes: a.notes ?? '',
    })
    setEditingId(a.id)
  }

  const onSave = async () => {
    if (editingId === null) return
    if (!editForm.petId) throw new Error('Selecione o pet.')
    await api.put(`/api/appointments/${editingId}`, {
      petId: Number(editForm.petId),
      vetName: editForm.vetName || null,
      type: editForm.type,
      scheduledAt: editForm.scheduledAt || null,
      status: editForm.status,
      summary: editForm.summary || null,
      diagnosis: editForm.diagnosis || null,
      notes: editForm.notes || null,
    })
  }

  const onSaved = () => {
    if (editingId === null) return
    const pet = pets.find((p) => p.id === Number(editForm.petId))
    const edited: Appointment = {
      id: editingId,
      pet_id: pet?.id ?? 0,
      pet_name: pet?.name ?? '',
      client_name: pet?.owner_name ?? null,
      vet_name: editForm.vetName || null,
      type: editForm.type,
      scheduled_at: editForm.scheduledAt || null,
      status: editForm.status,
      summary: editForm.summary || null,
      diagnosis: editForm.diagnosis || null,
      notes: editForm.notes || null,
    }
    setAppointments((prev) => prev.map((a) => (a.id === edited.id ? edited : a)))
    showToast('Consulta atualizada.')
  }

  const onRemove = async () => {
    if (editingId === null) return
    await api.del(`/api/appointments/${editingId}`)
    setAppointments((prev) => prev.filter((a) => a.id !== editingId))
    showToast('Consulta removida.')
  }

  const editPet = pets.find((p) => p.id === Number(editForm.petId))
  const editSubtitle = [typeLabel[editForm.type] ?? editForm.type, editForm.vetName ? formatVetName(editForm.vetName) : ''].filter(Boolean).join(' · ')

  return (
    <div>
      <PageHeader
        title="Consultas"
        subtitle="Agenda e registro de atendimentos."
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
          >
            {showForm ? 'Cancelar' : 'Nova consulta'}
          </button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <p className="mb-4 font-display text-base font-black text-dark">Registrar consulta</p>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="pet" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Pet *</label>
              <select id="pet" value={form.petId} onChange={set('petId')} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa">
                <option value="">Selecione um pet…</option>
                {pets.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}{p.owner_name ? ` · ${p.owner_name}` : ''}</option>
                ))}
              </select>
            </div>
            <Select label="Tipo" value={form.type} onChange={set('type')} options={[['consulta', 'Consulta'], ['urgencia', 'Urgência'], ['cirurgia', 'Cirurgia'], ['retorno', 'Retorno'], ['vacina', 'Vacinação'], ['outros', 'Outros']]} />
            <Select label="Status" value={form.status} onChange={set('status')} options={[['agendada', 'Agendada'], ['realizada', 'Realizada'], ['cancelada', 'Cancelada']]} />
            <FormInput label="Médica responsável" value={form.vetName} onChange={set('vetName')} placeholder="Dr.ª Cássia Carvalho" />
            <FormInput label="Data e horário" type="datetime-local" value={form.scheduledAt} onChange={set('scheduledAt')} />
            <FormArea label="Resumo" value={form.summary} onChange={set('summary')} className="sm:col-span-2" />
            <FormArea label="Diagnóstico" value={form.diagnosis} onChange={set('diagnosis')} className="sm:col-span-2" />
            <FormArea label="Observações" value={form.notes} onChange={set('notes')} className="sm:col-span-2" />
            {error && <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="h-12 rounded-full bg-turquesa px-8 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-azul disabled:opacity-60">
                {saving ? 'Salvando…' : 'Salvar consulta'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4">
        <SearchInput value={search} onChange={(v) => { setSearch(v); load(v) }} placeholder="Buscar por pet ou cliente…" />
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
      ) : appointments.length === 0 ? (
        <EmptyState title="Nenhuma consulta encontrada" description="Ajuste a busca ou registre uma nova consulta." />
      ) : (
        <Card className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Pet / Cliente</Th>
                <Th>Tipo</Th>
                <Th>Data</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const st = statusBadge[a.status] ?? statusBadge.agendada
                return (
                  <tr key={a.id} className="hover:bg-cream/60">
                    <Td>
                      <p className="font-semibold text-dark">{a.pet_name}</p>
                      <p className="text-xs text-dark/45">{a.client_name ?? '—'}</p>
                    </Td>
                    <Td className="capitalize">{typeLabel[a.type] ?? a.type}</Td>
                    <Td>{a.scheduled_at ? formatDateFull(a.scheduled_at) : '—'}</Td>
                    <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                    <Td className="text-right">
                      <div className="inline-flex gap-1.5">
                        <RowAction tone="ghost" onClick={() => openEdit(a)}>Ver</RowAction>
                        <RowAction tone="ghost" onClick={() => void remove(a)}>Remover</RowAction>
                      </div>
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </Card>
      )}

      <EditableModal
        open={editingId !== null}
        onClose={() => setEditingId(null)}
        onSave={onSave}
        onSaved={onSaved}
        onRemove={onRemove}
        label="Editar consulta"
        title={editPet?.name || 'Consulta'}
        subtitle={editSubtitle || undefined}
        avatar={
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-azul/12 text-base font-black text-azul">
            {(editPet?.name || 'C').charAt(0).toUpperCase()}
          </span>
        }
        saveLabel="Salvar alterações"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Pet *"
            name="petId"
            value={editForm.petId}
            onChange={setEdit('petId')}
            options={pets.map((p) => [String(p.id), p.owner_name ? `${p.name} · ${p.owner_name}` : p.name])}
            className="sm:col-span-2"
            hint="Tutor dono do pet."
          />
          <FormField label="Tipo" name="type" value={editForm.type} onChange={setEdit('type')} options={typeOptions} hint="Tipo de atendimento." />
          <FormField label="Status" name="status" value={editForm.status} onChange={setEdit('status')} options={statusOptions} />
          <FormField label="Médica responsável" name="vetName" value={editForm.vetName} onChange={setEdit('vetName')} placeholder="Dr.ª Cássia Carvalho" hint="Nome do profissional responsável." />
          <FormField label="Data e horário" name="scheduledAt" type="datetime-local" value={editForm.scheduledAt} onChange={setEdit('scheduledAt')} hint="Deixe vazio se ainda não definida." />
          <FormField label="Resumo" name="summary" textarea value={editForm.summary} onChange={setEdit('summary')} className="sm:col-span-2" placeholder="Motivo e resumo do atendimento." />
          <FormField label="Diagnóstico" name="diagnosis" textarea value={editForm.diagnosis} onChange={setEdit('diagnosis')} className="sm:col-span-2" placeholder="Conclusão clínica." />
          <FormField label="Observações" name="notes" textarea value={editForm.notes} onChange={setEdit('notes')} className="sm:col-span-2" placeholder="Notas adicionais, orientações e recomendações." />
        </div>
      </EditableModal>

      {toastMsg && <Toast kind="success" message={toastMsg} />}
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

function FormArea({ label, value, onChange, className }: { label: string; value: string; onChange: (e: { target: { value: string } }) => void; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">{label}</label>
      <textarea rows={2} value={value} onChange={onChange} className="w-full rounded-xl border border-dark/15 bg-white px-4 py-3 text-[15px] text-dark outline-none focus:border-turquesa" />
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
