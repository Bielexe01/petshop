import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { useSession } from '@/lib/session'
import {
  PageHeader,
  Card,
  Badge,
  Table,
  Th,
  Td,
  RowAction,
  SearchInput,
  EmptyState,
  EditableModal,
  FormField,
  Toast,
} from '@/admin/ui'

interface StaffMember {
  id: number
  name: string
  email: string
  role: 'admin' | 'superadmin'
  is_active: boolean
  created_at: string
}

interface EditForm {
  name: string
  email: string
  role: string
  isActive: string
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'admin' }

const EMPTY_EDIT: EditForm = { name: '', email: '', role: 'admin', isActive: '1' }

/**
 * Gestão de funcionários (contas admin) — exclusivo do superadministrador.
 *
 * A autorização real é no backend (requireSuperAdmin em todos os endpoints
 * /api/admin/users); a flag isSuperAdmin aqui só decide o que a UI mostra.
 */
export default function Funcionarios() {
  const { user } = useSession()
  const [staff, setStaff] = useState<StaffMember[]>([])
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

  const load = () => {
    api
      .get<{ users: StaffMember[] }>('/api/admin/users')
      .then((r) => setStaff(r.users))
      .catch(() => setStaff([]))
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
      await api.post('/api/admin/users', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o funcionário.')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (m: StaffMember) => {
    setEdit({
      name: m.name,
      email: m.email,
      role: m.role,
      isActive: m.is_active ? '1' : '0',
    })
    setEditingId(m.id)
  }

  const closeEdit = () => setEditingId(null)

  const setEditField = (k: keyof EditForm) => (e: { target: { value: string } }) => setEdit((f) => ({ ...f, [k]: e.target.value }))

  const saveEdit = async () => {
    if (editingId === null) return
    await api.put(`/api/admin/users/${editingId}`, {
      name: edit.name,
      role: edit.role,
      isActive: edit.isActive === '1',
    })
  }

  const onSavedEdit = () => {
    if (editingId === null) return
    setStaff((list) =>
      list.map((m) =>
        m.id === editingId
          ? {
              ...m,
              name: edit.name,
              role: edit.role as StaffMember['role'],
              is_active: edit.isActive === '1',
            }
          : m,
      ),
    )
    showToast('Funcionário atualizado.')
  }

  const onRemoveEdit = async () => {
    if (editingId === null) return
    await api.del(`/api/admin/users/${editingId}`)
    setStaff((list) => list.filter((m) => m.id !== editingId))
    showToast('Funcionário removido.')
  }

  const toggleActive = async (m: StaffMember) => {
    await api.put(`/api/admin/users/${m.id}`, { name: m.name, role: m.role, isActive: m.is_active === false }).catch(() => {})
    load()
  }

  const remove = async (m: StaffMember) => {
    if (!window.confirm(`Remover o funcionário ${m.name} (${m.email})? Essa ação não pode ser desfeita.`)) return
    await api.del(`/api/admin/users/${m.id}`).catch(() => {})
    load()
  }

  // Só o superadmin gerencia a equipe. O backend é a autoridade; este guard
  // só evita mostrar uma tela que devolveria 403.
  if (user?.isSuperAdmin !== true) {
    return (
      <div>
        <PageHeader title="Funcionários" subtitle="Gestão das contas da equipe." />
        <EmptyState
          title="Acesso restrito ao superadministrador"
          description="Somente o superadministrador pode cadastrar e administrar as contas de funcionários."
        />
      </div>
    )
  }

  const query = search.trim().toLowerCase()
  const filtered = query ? staff.filter((m) => m.name.toLowerCase().includes(query) || m.email.toLowerCase().includes(query)) : staff

  return (
    <div>
      <PageHeader
        title="Funcionários"
        subtitle="Contas da equipe com acesso ao painel da clínica."
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
          >
            {showForm ? 'Cancelar' : 'Novo funcionário'}
          </button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <p className="mb-4 font-display text-base font-black text-dark">Cadastrar funcionário</p>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <FormField label="Nome completo" required value={form.name} onChange={set('name')} className="sm:col-span-2" placeholder="Nome do funcionário" />
            <FormField label="E-mail" type="email" required value={form.email} onChange={set('email')} placeholder="funcionario@clinica.com" />
            <FormField label="Senha" type="password" required value={form.password} onChange={set('password')} placeholder="Mínimo 8 caracteres" />
            <FormField
              label="Papel"
              options={[
                ['admin', 'Administrador (acesso total)'],
                ['superadmin', 'Superadministrador (gerencia funcionários)'],
              ]}
              value={form.role}
              onChange={set('role')}
              className="sm:col-span-2"
              hint="Superadministrador também pode criar e administrar outros funcionários."
            />
            {error && <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className="h-12 rounded-full bg-turquesa px-8 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-azul disabled:opacity-60">
                {saving ? 'Salvando…' : 'Salvar funcionário'}
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nome ou e-mail…" />
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nenhum funcionário encontrado" description="Ajuste a busca ou cadastre um novo funcionário." />
      ) : (
        <Card className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Funcionário</Th>
                <Th>Papel</Th>
                <Th>Status</Th>
                <Th>Criado em</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const isSelf = user?.id === m.id
                return (
                  <tr key={m.id} className="hover:bg-cream/60">
                    <Td>
                      <p className="font-semibold text-dark">{m.name}</p>
                      <p className="text-xs text-dark/45">{m.email}</p>
                    </Td>
                    <Td>
                      <Badge tone={m.role === 'superadmin' ? 'magenta' : 'turquesa'}>
                        {m.role === 'superadmin' ? 'Superadmin' : 'Administrador'}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge tone={m.is_active ? 'green' : 'red'}>{m.is_active ? 'Ativo' : 'Inativo'}</Badge>
                    </Td>
                    <Td>
                      <p className="text-sm text-dark/60">{new Date(m.created_at).toLocaleDateString('pt-BR')}</p>
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex gap-1.5">
                        {isSelf ? (
                          <Badge tone="gray">Você</Badge>
                        ) : (
                          <>
                            <RowAction tone="ghost" onClick={() => openEdit(m)}>Ver</RowAction>
                            <RowAction tone="ghost" onClick={() => void toggleActive(m)}>{m.is_active ? 'Inativar' : 'Ativar'}</RowAction>
                            <RowAction tone="ghost" onClick={() => void remove(m)}>Remover</RowAction>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                )
              })}
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
        label="Editar funcionário"
        title={edit.name || 'Funcionário'}
        subtitle={edit.email}
        avatar={
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-magenta font-display text-lg font-black text-white shadow-glow">
            {initialsOf(edit.name, edit.email)}
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Nome completo" required value={edit.name} onChange={setEditField('name')} className="sm:col-span-2" />
          <FormField label="E-mail" value={edit.email} readOnly className="sm:col-span-2" hint="O e-mail não pode ser alterado pela clínica." />
          <FormField
            label="Papel"
            options={[
              ['admin', 'Administrador (acesso total)'],
              ['superadmin', 'Superadministrador (gerencia funcionários)'],
            ]}
            value={edit.role}
            onChange={setEditField('role')}
            className="sm:col-span-2"
          />
          <FormField label="Status" options={[['1', 'Ativo'], ['0', 'Inativo']]} value={edit.isActive} onChange={setEditField('isActive')} />
        </div>
      </EditableModal>

      {toast && <Toast kind={toast.kind} message={toast.message} />}
    </div>
  )
}

/** Iniciais do funcionário para o avatar do cabeçalho. */
function initialsOf(name: string, email: string): string {
  const clean = name.trim()
  if (!clean) {
    const first = email.trim().charAt(0)
    return first ? first.toUpperCase() : '?'
  }
  const parts = clean.split(/\s+/)
  const first = parts[0]?.charAt(0) ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? '') : ''
  return (first + last).toUpperCase() || '?'
}
