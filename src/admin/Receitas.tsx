import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { api, openFile } from '@/lib/api'
import { formatDate } from '@/lib/clinic'
import { PageHeader, Card, Table, Th, Td, RowAction, SearchInput, EmptyState, FormField, EditableModal, Toast } from '@/admin/ui'
import { useSearchFilter } from '@/lib/useSearchFilter'
import { DownloadIcon, FileIcon, PlusIcon, TrashIcon } from '@/portal/icons'

interface Prescription {
  id: number
  pet_id: number
  pet_name: string
  client_name: string | null
  vet_name: string | null
  issued_at: string | null
  valid_until: string | null
  instructions: string | null
}

interface PrescriptionItem {
  medication_name: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  notes: string | null
}

interface PetOption {
  id: number
  name: string
  owner_name: string | null
}

interface ItemForm {
  medicationName: string
  dosage: string
  frequency: string
  duration: string
  notes: string
}

const EMPTY_FORM = { petId: '', vetName: '', issuedAt: '', validUntil: '', instructions: '' }
const EMPTY_ITEM: ItemForm = { medicationName: '', dosage: '', frequency: '', duration: '', notes: '' }

export default function Receitas() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [pets, setPets] = useState<PetOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [items, setItems] = useState<ItemForm[]>([{ ...EMPTY_ITEM }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editItems, setEditItems] = useState<ItemForm[]>([{ ...EMPTY_ITEM }])
  const [toastMsg, setToastMsg] = useState('')
  const toastTimer = useRef<number | undefined>(undefined)
  const { query, setQuery, filtered: filteredPrescriptions } = useSearchFilter(prescriptions, (r) => [r.pet_name, r.client_name ?? '', r.vet_name ?? ''])

  const load = () => {
    api
      .get<{ prescriptions: Prescription[] }>('/api/prescriptions')
      .then((r) => setPrescriptions(r.prescriptions))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    api.get<{ pets: PetOption[] }>('/api/pets').then((r) => setPets(r.pets)).catch(() => {})
  }, [])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const setItem = (i: number) => (k: keyof ItemForm) => (e: { target: { value: string } }) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, [k]: e.target.value } : it)))

  const addItem = () => setItems((l) => [...l, { ...EMPTY_ITEM }])
  const removeItem = (i: number) => setItems((l) => l.filter((_, idx) => idx !== i))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.petId) {
      setError('Selecione o pet.')
      return
    }
    const validItems = items.filter((it) => it.medicationName.trim())
    if (validItems.length === 0) {
      setError('Adicione ao menos um medicamento.')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/prescriptions', {
        petId: Number(form.petId),
        vetName: form.vetName || null,
        issuedAt: form.issuedAt || null,
        validUntil: form.validUntil || null,
        instructions: form.instructions || null,
        items: validItems.map((it) => ({
          medicationName: it.medicationName.trim(),
          dosage: it.dosage || null,
          frequency: it.frequency || null,
          duration: it.duration || null,
          notes: it.notes || null,
        })),
      })
      setForm(EMPTY_FORM)
      setItems([{ ...EMPTY_ITEM }])
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar a receita.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (r: Prescription) => {
    if (!window.confirm(`Remover a receita de ${r.pet_name}?`)) return
    await api.del(`/api/prescriptions/${r.id}`).catch(() => {})
    load()
  }

  const viewPdf = (id: number) => void openFile(`/api/prescriptions/${id}/pdf`).catch(() => alert('Não foi possível abrir o PDF.'))

  const showToast = (msg: string) => {
    setToastMsg(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2500)
  }

  const setEdit = (k: keyof typeof editForm) => (e: { target: { value: string } }) => setEditForm((f) => ({ ...f, [k]: e.target.value }))

  const setEditItem = (i: number) => (k: keyof ItemForm) => (e: { target: { value: string } }) =>
    setEditItems((list) => list.map((it, idx) => (idx === i ? { ...it, [k]: e.target.value } : it)))

  const addEditItem = () => setEditItems((l) => [...l, { ...EMPTY_ITEM }])
  const removeEditItem = (i: number) => setEditItems((l) => l.filter((_, idx) => idx !== i))

  const openEdit = async (r: Prescription) => {
    try {
      const data = await api.get<{ prescription: Prescription; items: PrescriptionItem[] }>(`/api/prescriptions/${r.id}`)
      const p = data.prescription
      setEditForm({
        petId: String(p.pet_id),
        vetName: p.vet_name ?? '',
        issuedAt: p.issued_at ? p.issued_at.slice(0, 10) : '',
        validUntil: p.valid_until ? p.valid_until.slice(0, 10) : '',
        instructions: p.instructions ?? '',
      })
      setEditItems(
        data.items.length
          ? data.items.map((it) => ({
              medicationName: it.medication_name,
              dosage: it.dosage ?? '',
              frequency: it.frequency ?? '',
              duration: it.duration ?? '',
              notes: it.notes ?? '',
            }))
          : [{ ...EMPTY_ITEM }],
      )
      setEditingId(r.id)
    } catch {
      setEditingId(null)
    }
  }

  const onSave = async () => {
    if (editingId === null) return
    if (!editForm.petId) throw new Error('Selecione o pet.')
    const validItems = editItems.filter((it) => it.medicationName.trim())
    if (validItems.length === 0) throw new Error('Adicione ao menos um medicamento.')
    await api.put(`/api/prescriptions/${editingId}`, {
      petId: Number(editForm.petId),
      vetName: editForm.vetName || null,
      issuedAt: editForm.issuedAt || null,
      validUntil: editForm.validUntil || null,
      instructions: editForm.instructions || null,
      items: validItems.map((it) => ({
        medicationName: it.medicationName.trim(),
        dosage: it.dosage || null,
        frequency: it.frequency || null,
        duration: it.duration || null,
        notes: it.notes || null,
      })),
    })
  }

  const onSaved = () => {
    if (editingId === null) return
    const pet = pets.find((p) => p.id === Number(editForm.petId))
    const edited: Prescription = {
      id: editingId,
      pet_id: pet?.id ?? 0,
      pet_name: pet?.name ?? '',
      client_name: pet?.owner_name ?? null,
      vet_name: editForm.vetName || null,
      issued_at: editForm.issuedAt || null,
      valid_until: editForm.validUntil || null,
      instructions: editForm.instructions || null,
    }
    setPrescriptions((prev) => prev.map((r) => (r.id === edited.id ? edited : r)))
    showToast('Receita atualizada.')
  }

  const onRemove = async () => {
    if (editingId === null) return
    await api.del(`/api/prescriptions/${editingId}`)
    setPrescriptions((prev) => prev.filter((r) => r.id !== editingId))
    showToast('Receita removida.')
  }

  const editPet = pets.find((p) => p.id === Number(editForm.petId))
  const editTitle = editPet?.name || 'Receita'
  const editSubtitle = [editPet?.owner_name ?? '', editForm.vetName].filter(Boolean).join(' · ')

  return (
    <div>
      <PageHeader
        title="Receitas"
        subtitle="Emita receitas com PDF e disponibilize para o cliente."
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
          >
            {showForm ? 'Cancelar' : 'Nova receita'}
          </button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <div className="mb-5 border-b border-dark/8 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-turquesa/10 text-turquesa">
                <FileIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate font-display text-base font-black text-dark">Emitir receita</h2>
                <p className="truncate text-xs text-dark/55">Prescrição com PDF para o cliente</p>
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="pet" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Pet *</label>
              <select id="pet" value={form.petId} onChange={set('petId')} className="h-12 w-full rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none focus:border-turquesa focus:ring-2 focus:ring-turquesa/15">
                <option value="">Selecione um pet…</option>
                {pets.map((p) => <option key={p.id} value={p.id}>{p.name}{p.owner_name ? ` · ${p.owner_name}` : ''}</option>)}
              </select>
            </div>
            <FormInput label="Médica responsável" value={form.vetName} onChange={set('vetName')} placeholder="Dr.ª Cássia Carvalho" />
            <FormInput label="Emitida em" type="date" value={form.issuedAt} onChange={set('issuedAt')} />
            <FormInput label="Validade" type="date" value={form.validUntil} onChange={set('validUntil')} className="sm:col-span-2" />
            <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2">
              <label htmlFor="instructions" className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Instruções gerais</label>
              <textarea id="instructions" rows={2} value={form.instructions} onChange={set('instructions')} className="w-full max-w-full min-w-0 rounded-xl border border-dark/15 bg-white px-4 py-3 text-[15px] text-dark outline-none placeholder:text-dark/30 focus:border-turquesa focus:ring-2 focus:ring-turquesa/15" placeholder="Ex.: administrar após alimentação" />
            </div>

            {/* Medicamentos */}
            <div className="flex items-center gap-3 sm:col-span-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-turquesa/10 text-turquesa">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M10.5 20.5a4.5 4.5 0 0 1-6.36-6.36L13.5 4.79a4.5 4.5 0 0 1 6.36 6.36z" />
                  <path d="M7 17.5 17.5 7" />
                </svg>
              </span>
              <span className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-dark/60">Medicamentos</span>
              <span className="h-px min-w-0 flex-1 bg-dark/8" aria-hidden="true" />
              <button
                type="button"
                onClick={addItem}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-turquesa/25 bg-turquesa/8 px-4 text-xs font-semibold text-turquesa transition-colors hover:bg-turquesa hover:text-white"
              >
                <PlusIcon className="h-4 w-4" /> Adicionar
              </button>
            </div>

            <div className="min-w-0 space-y-3 sm:col-span-2">
              {items.map((item, i) => (
                <div key={i} className="rounded-xl border border-dark/10 bg-cream/60 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-turquesa/10 font-display text-xs font-black text-turquesa">{i + 1}</span>
                      <span className="truncate font-display text-sm font-bold text-dark">Medicamento {i + 1}</span>
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        aria-label={`Remover medicamento ${i + 1}`}
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-dark/10 text-dark/40 transition-colors hover:border-magenta/30 hover:bg-magenta/5 hover:text-magenta"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:items-start">
                    <FormInput label="Medicamento *" required value={item.medicationName} onChange={setItem(i)('medicationName')} placeholder="Ex.: Amoxicilina" />
                    <FormInput label="Dosagem" value={item.dosage} onChange={setItem(i)('dosage')} placeholder="Ex.: 50mg" />
                    <FormInput label="Frequência" value={item.frequency} onChange={setItem(i)('frequency')} placeholder="Ex.: 2x ao dia" />
                    <FormInput label="Duração" value={item.duration} onChange={setItem(i)('duration')} placeholder="Ex.: 7 dias" />
                    <FormInput label="Observações" value={item.notes} onChange={setItem(i)('notes')} className="sm:col-span-2" />
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta sm:col-span-2">{error}</p>
            )}
            <div className="sm:col-span-2">
              <div className="flex flex-col items-stretch gap-3 border-t border-dark/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="hidden text-xs text-dark/45 sm:block">O PDF da receita é gerado automaticamente.</p>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-turquesa px-8 font-display text-xs font-bold uppercase tracking-wider text-white shadow-soft transition-colors hover:bg-azul disabled:opacity-60 sm:w-auto"
                >
                  <DownloadIcon className="h-4 w-4" />
                  {saving ? 'Gerando…' : 'Emitir receita'}
                </button>
              </div>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4">
        <SearchInput value={query} onChange={setQuery} placeholder="Buscar por pet, cliente ou médica…" />
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
      ) : prescriptions.length === 0 ? (
        <EmptyState title="Nenhuma receita emitida" description="Emita a primeira receita para gerar o PDF." />
      ) : filteredPrescriptions.length === 0 ? (
        <EmptyState title="Nenhuma receita encontrada" description="Ajuste a busca." />
      ) : (
        <Card className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Pet / Cliente</Th>
                <Th>Emitida</Th>
                <Th>Validade</Th>
                <Th>Médica</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {filteredPrescriptions.map((r) => (
                <tr key={r.id} className="hover:bg-cream/60">
                  <Td>
                    <p className="font-semibold text-dark">{r.pet_name}</p>
                    <p className="text-xs text-dark/45">{r.client_name ?? '—'}</p>
                  </Td>
                  <Td>{r.issued_at ? formatDate(r.issued_at) : '—'}</Td>
                  <Td>{r.valid_until ? formatDate(r.valid_until) : '—'}</Td>
                  <Td>{r.vet_name ?? '—'}</Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-1.5">
                      <RowAction tone="ghost" onClick={() => void openEdit(r)}>Ver</RowAction>
                      <button
                        type="button"
                        onClick={() => viewPdf(r.id)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-full bg-turquesa px-4 font-display text-[11px] font-bold uppercase tracking-wider text-white shadow-sm transition-colors hover:bg-azul"
                      >
                        <DownloadIcon className="h-4 w-4" /> PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(r)}
                        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-dark/15 px-4 font-display text-[11px] font-bold uppercase tracking-wider text-dark/70 transition-colors hover:border-magenta/40 hover:text-magenta"
                      >
                        Remover
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
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
        label="Editar receita"
        title={editTitle}
        subtitle={editSubtitle || undefined}
        avatar={
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-turquesa/12 text-base font-black text-turquesa">
            {editTitle.charAt(0).toUpperCase()}
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
            options={[['', 'Selecione um pet…'], ...pets.map((p): [string, string] => [String(p.id), p.owner_name ? `${p.name} · ${p.owner_name}` : p.name])]}
            className="sm:col-span-2"
            hint="Pet a quem a receita pertence."
          />
          <FormField label="Médica responsável" name="vetName" value={editForm.vetName} onChange={setEdit('vetName')} placeholder="Dr.ª Cássia Carvalho" hint="Nome do profissional responsável." />
          <FormField label="Emitida em" name="issuedAt" type="date" value={editForm.issuedAt} onChange={setEdit('issuedAt')} hint="Data de emissão da receita." />
          <FormField label="Validade" name="validUntil" type="date" value={editForm.validUntil} onChange={setEdit('validUntil')} hint="Até quando a receita é válida." />
          <FormField label="Instruções gerais" name="instructions" textarea value={editForm.instructions} onChange={setEdit('instructions')} className="sm:col-span-2" placeholder="Ex.: administrar após alimentação" />

          <div className="flex items-center gap-3 sm:col-span-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-turquesa/10 text-turquesa">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                <path d="M10.5 20.5a4.5 4.5 0 0 1-6.36-6.36L13.5 4.79a4.5 4.5 0 0 1 6.36 6.36z" />
                <path d="M7 17.5 17.5 7" />
              </svg>
            </span>
            <span className="font-display text-[11px] font-black uppercase tracking-[0.18em] text-dark/60">Medicamentos</span>
            <span className="h-px min-w-0 flex-1 bg-dark/8" aria-hidden="true" />
            <button
              type="button"
              onClick={addEditItem}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-turquesa/25 bg-turquesa/8 px-4 text-xs font-semibold text-turquesa transition-colors hover:bg-turquesa hover:text-white"
            >
              <PlusIcon className="h-4 w-4" /> Adicionar
            </button>
          </div>

          <div className="min-w-0 space-y-3 sm:col-span-2">
            {editItems.map((item, i) => (
              <div key={i} className="rounded-xl border border-dark/10 bg-cream/60 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-turquesa/10 font-display text-xs font-black text-turquesa">{i + 1}</span>
                    <span className="truncate font-display text-sm font-bold text-dark">Medicamento {i + 1}</span>
                  </div>
                  {editItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEditItem(i)}
                      aria-label={`Remover medicamento ${i + 1}`}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-dark/10 text-dark/40 transition-colors hover:border-magenta/30 hover:bg-magenta/5 hover:text-magenta"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2 sm:items-start">
                  <FormField label="Medicamento *" name={`medicationName-${i}`} required value={item.medicationName} onChange={setEditItem(i)('medicationName')} placeholder="Ex.: Amoxicilina" />
                  <FormField label="Dosagem" name={`dosage-${i}`} value={item.dosage} onChange={setEditItem(i)('dosage')} placeholder="Ex.: 50mg" />
                  <FormField label="Frequência" name={`frequency-${i}`} value={item.frequency} onChange={setEditItem(i)('frequency')} placeholder="Ex.: 2x ao dia" />
                  <FormField label="Duração" name={`duration-${i}`} value={item.duration} onChange={setEditItem(i)('duration')} placeholder="Ex.: 7 dias" />
                  <FormField label="Observações" name={`notes-${i}`} textarea value={item.notes} onChange={setEditItem(i)('notes')} className="sm:col-span-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </EditableModal>

      {toastMsg && <Toast kind="success" message={toastMsg} />}
    </div>
  )
}

function FormInput({ label, className, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className ?? ''}`}>
      <label htmlFor={id} className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">{label}</label>
      <input id={id} className="h-12 w-full max-w-full min-w-0 rounded-xl border border-dark/15 bg-white px-4 text-[15px] text-dark outline-none placeholder:text-dark/30 focus:border-turquesa focus:ring-2 focus:ring-turquesa/15" {...props} />
    </div>
  )
}
