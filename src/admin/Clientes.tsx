import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { api } from '@/lib/api'
import { PageHeader, Card, Badge, Table, Th, Td, RowAction, SearchInput, EmptyState, EditableModal, FormField, Toast } from '@/admin/ui'

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

interface EditForm {
  fullName: string
  email: string
  cpf: string
  phone: string
  isActive: string
}

const EMPTY_FORM = { fullName: '', email: '', password: '', cpf: '', phone: '' }

const EMPTY_EDIT: EditForm = { fullName: '', email: '', cpf: '', phone: '', isActive: '1' }

export default function Clientes() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [edit, setEdit] = useState<EditForm>(EMPTY_EDIT)
  const [toast, setToast] = useState<{ kind: 'success'; message: string } | null>(null)
  const toastTimer = useRef<number | null>(null)

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

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const showToast = (message: string) => {
    setToast({ kind: 'success', message })
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2500)
  }

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

  const openEdit = (c: Client) => {
    setEdit({
      fullName: c.full_name ?? '',
      email: c.email,
      cpf: c.cpf ?? '',
      phone: c.phone ?? '',
      isActive: c.is_active ? '1' : '0',
    })
    setEditingId(c.id)
  }

  const closeEdit = () => setEditingId(null)

  const setEditField = (k: keyof EditForm) => (e: { target: { value: string } }) => setEdit((f) => ({ ...f, [k]: e.target.value }))

  const saveEdit = async () => {
    if (editingId === null) return
    await api.put(`/api/clients/${editingId}`, {
      fullName: edit.fullName,
      cpf: edit.cpf || null,
      phone: edit.phone || null,
      isActive: edit.isActive === '1',
    })
  }

  const onSavedEdit = () => {
    if (editingId === null) return
    setClients((list) =>
      list.map((c) =>
        c.id === editingId
          ? {
              ...c,
              full_name: edit.fullName,
              cpf: edit.cpf || null,
              phone: edit.phone || null,
              is_active: edit.isActive === '1' ? 1 : 0,
            }
          : c,
      ),
    )
    showToast('Cliente atualizado.')
  }

  const onRemoveEdit = async () => {
    if (editingId === null) return
    await api.del(`/api/clients/${editingId}`)
    setClients((list) => list.filter((c) => c.id !== editingId))
    showToast('Cliente removido.')
  }

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
                      <RowAction tone="ghost" onClick={() => openEdit(c)}>Ver</RowAction>
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

      {/* Modal de edição */}
      <EditableModal
        open={editingId !== null}
        onClose={closeEdit}
        onSave={saveEdit}
        onSaved={onSavedEdit}
        onRemove={onRemoveEdit}
        label="Editar cliente"
        title={edit.fullName || 'Cliente'}
        subtitle={edit.email}
        avatar={
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-magenta font-display text-lg font-black text-white shadow-glow">
            {initialsOf(edit.fullName, edit.email)}
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nome completo" required value={edit.fullName} onChange={setEditField('fullName')} className="sm:col-span-2" />
          <FormField label="E-mail" value={edit.email} readOnly className="sm:col-span-2" hint="O e-mail não pode ser alterado pela clínica." />
          <FormField label="CPF" value={edit.cpf} onChange={setEditField('cpf')} placeholder="000.000.000-00" hint="Em branco mantém o valor atual." />
          <FormField label="Telefone" value={edit.phone} onChange={setEditField('phone')} placeholder="(16) 00000-0000" hint="Em branco mantém o valor atual." />
          <FormField label="Status" options={[['1', 'Ativo'], ['0', 'Inativo']]} value={edit.isActive} onChange={setEditField('isActive')} />
        </div>
      </EditableModal>

      {toast && <Toast kind={toast.kind} message={toast.message} />}
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
