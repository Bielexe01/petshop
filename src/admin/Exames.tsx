import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { api } from '@/lib/api'
import { formatDate, formatVetName } from '@/lib/clinic'
import { PageHeader, Card, Badge, Table, Th, Td, RowAction, SearchInput, EmptyState, FormField, EditableModal, Toast } from '@/admin/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'

interface Exam {
  id: number
  pet_id: number
  pet_name: string
  client_name: string | null
  name: string
  category: string
  status: string
  result_date: string | null
  vet_name: string | null
  notes: string | null
}

interface PetOption {
  id: number
  name: string
  owner_name: string | null
}

const EMPTY_FORM = { petId: '', name: '', category: 'laboratorial', status: 'pendente', resultDate: '', vetName: '', notes: '' }

const statusBadge: Record<string, { tone: 'gray' | 'yellow' | 'green'; label: string }> = {
  pendente: { tone: 'gray', label: 'Pendente' },
  em_andamento: { tone: 'yellow', label: 'Em andamento' },
  concluido: { tone: 'green', label: 'Concluído' },
}

const catLabel: Record<string, string> = { laboratorial: 'Laboratorial', imagem: 'Imagem', outros: 'Outros' }

export default function Exames() {
  const [exams, setExams] = useState<Exam[]>([])
  const [pets, setPets] = useState<PetOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [toastMsg, setToastMsg] = useState('')
  const toastTimer = useRef<number | undefined>(undefined)
  const { query, setQuery, filtered: filteredExams } = useSearchFilter(exams, (x) => [x.name, x.pet_name, x.client_name ?? '', x.vet_name ?? '', catLabel[x.category] ?? x.category, x.status])

  const load = () => {
    api.get<{ exams: Exam[] }>('/api/exams').then((r) => setExams(r.exams)).catch(() => {}).finally(() => setLoading(false))
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
      await api.post('/api/exams', {
        petId: Number(form.petId),
        name: form.name,
        category: form.category,
        status: form.status,
        resultDate: form.resultDate || null,
        vetName: form.vetName || null,
        notes: form.notes || null,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o exame.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (x: Exam) => {
    if (!window.confirm(`Remover o exame "${x.name}"?`)) return
    await api.del(`/api/exams/${x.id}`).catch(() => {})
    load()
  }

  const showToast = (msg: string) => {
    setToastMsg(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2500)
  }

  const setEdit = (k: keyof typeof editForm) => (e: { target: { value: string } }) => setEditForm((f) => ({ ...f, [k]: e.target.value }))

  const openEdit = (x: Exam) => {
    setEditForm({
      petId: String(x.pet_id),
      name: x.name,
      category: x.category,
      status: x.status,
      resultDate: x.result_date ? x.result_date.slice(0, 10) : '',
      vetName: x.vet_name ?? '',
      notes: x.notes ?? '',
    })
    setEditingId(x.id)
  }

  const onSave = async () => {
    if (editingId === null) return
    if (!editForm.petId) throw new Error('Selecione o pet.')
    await api.put(`/api/exams/${editingId}`, {
      petId: Number(editForm.petId),
      name: editForm.name,
      category: editForm.category,
      status: editForm.status,
      resultDate: editForm.resultDate || null,
      vetName: editForm.vetName || null,
      notes: editForm.notes || null,
    })
  }

  const onSaved = () => {
    if (editingId === null) return
    const pet = pets.find((p) => p.id === Number(editForm.petId))
    const edited: Exam = {
      id: editingId,
      pet_id: pet?.id ?? 0,
      pet_name: pet?.name ?? '',
      client_name: pet?.owner_name ?? null,
      name: editForm.name,
      category: editForm.category,
      status: editForm.status,
      result_date: editForm.resultDate || null,
      vet_name: editForm.vetName || null,
      notes: editForm.notes || null,
    }
    setExams((prev) => prev.map((e) => (e.id === edited.id ? edited : e)))
    showToast('Exame atualizado.')
  }

  const onRemove = async () => {
    if (editingId === null) return
    await api.del(`/api/exams/${editingId}`)
    setExams((prev) => prev.filter((e) => e.id !== editingId))
    showToast('Exame removido.')
  }

  const editPet = pets.find((p) => p.id === Number(editForm.petId))
  const editSubtitle = [editPet?.name, editForm.vetName ? formatVetName(editForm.vetName) : ''].filter(Boolean).join(' · ')

  return (
    <div>
      <PageHeader
        title="Exames"
        subtitle="Registro de exames laboratoriais, de imagem e outros."
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
          >
            {showForm ? 'Cancelar' : 'Novo exame'}
          </button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <p className="mb-4 font-display text-base font-black text-dark">Registrar exame</p>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="pet" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Pet *</label>
              <select id="pet" value={form.petId} onChange={set('petId')} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa">
                <option value="">Selecione um pet…</option>
                {pets.map((p) => <option key={p.id} value={p.id}>{p.name}{p.owner_name ? ` · ${p.owner_name}` : ''}</option>)}
              </select>
            </div>
            <FormInput label="Nome do exame *" required value={form.name} onChange={set('name')} placeholder="Ex.: Hemograma completo" />
            <FormInput label="Médica responsável" value={form.vetName} onChange={set('vetName')} placeholder="Dr.ª Cássia Carvalho" />
            <Select label="Categoria" value={form.category} onChange={set('category')} options={[['laboratorial', 'Laboratorial'], ['imagem', 'Imagem'], ['outros', 'Outros']]} />
            <Select label="Status" value={form.status} onChange={set('status')} options={[['pendente', 'Pendente'], ['em_andamento', 'Em andamento'], ['concluido', 'Concluído']]} />
            <FormInput label="Data do resultado" type="date" value={form.resultDate} onChange={set('resultDate')} />
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Observações</label>
              <textarea rows={2} value={form.notes} onChange={set('notes')} className="w-full rounded-xl border border-dark/15 bg-white px-4 py-3 text-[15px] text-dark outline-none focus:border-turquesa" />
            </div>
            {error && <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="h-12 rounded-full bg-turquesa px-8 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-azul disabled:opacity-60">
                {saving ? 'Salvando…' : 'Salvar exame'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por exame, pet, cliente ou status…" />
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
      ) : exams.length === 0 ? (
        <EmptyState title="Nenhum exame registrado" description="Registre o primeiro exame." />
      ) : filteredExams.length === 0 ? (
        <EmptyState title="Nenhum exame encontrado" description="Ajuste a busca." />
      ) : (
        <Card className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Exame</Th>
                <Th>Pet / Cliente</Th>
                <Th>Categoria</Th>
                <Th>Status</Th>
                <Th>Resultado</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {filteredExams.map((x) => {
                const st = statusBadge[x.status] ?? statusBadge.pendente
                return (
                  <tr key={x.id} className="hover:bg-cream/60">
                    <Td>
                      <p className="font-semibold text-dark">{x.name}</p>
                      {x.vet_name && <p className="text-xs text-dark/45">{formatVetName(x.vet_name)}</p>}
                    </Td>
                    <Td>
                      {x.pet_name}
                      <p className="text-xs text-dark/45">{x.client_name ?? '—'}</p>
                    </Td>
                    <Td className="capitalize">{catLabel[x.category] ?? x.category}</Td>
                    <Td><Badge tone={st.tone}>{st.label}</Badge></Td>
                    <Td>{x.result_date ? formatDate(x.result_date) : '—'}</Td>
                    <Td className="text-right">
                      <div className="inline-flex gap-1.5">
                        <RowAction tone="ghost" onClick={() => openEdit(x)}>Ver</RowAction>
                        <RowAction tone="ghost" onClick={() => void remove(x)}>Remover</RowAction>
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
        label="Editar exame"
        title={editForm.name || 'Exame'}
        subtitle={editSubtitle || undefined}
        avatar={
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-magenta/12 text-base font-black text-magenta">
            {(editForm.name || 'E').charAt(0).toUpperCase()}
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
            hint="Dono do exame."
          />
          <FormField label="Nome do exame *" name="name" value={editForm.name} onChange={setEdit('name')} placeholder="Ex.: Hemograma completo" />
          <FormField label="Médica responsável" name="vetName" value={editForm.vetName} onChange={setEdit('vetName')} placeholder="Dr.ª Cássia Carvalho" hint="Nome do profissional responsável." />
          <FormField
            label="Categoria"
            name="category"
            value={editForm.category}
            onChange={setEdit('category')}
            options={[['laboratorial', 'Laboratorial'], ['imagem', 'Imagem'], ['outros', 'Outros']]}
          />
          <FormField
            label="Status"
            name="status"
            value={editForm.status}
            onChange={setEdit('status')}
            options={[['pendente', 'Pendente'], ['em_andamento', 'Em andamento'], ['concluido', 'Concluído']]}
          />
          <FormField label="Data do resultado" name="resultDate" type="date" value={editForm.resultDate} onChange={setEdit('resultDate')} className="sm:col-span-2" hint="Data em que o resultado ficou disponível." />
          <FormField label="Observações" name="notes" textarea value={editForm.notes} onChange={setEdit('notes')} className="sm:col-span-2" />
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
