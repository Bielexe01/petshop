import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { PageHeader, Card, Badge, Table, Th, Td, RowAction, EmptyState, EditableModal, Toast, FormField } from '@/admin/ui'

/**
 * Keys das telas que um papel pode incluir.
 * `funcionarios` e `papeis` ficam de fora: gestão de equipe e de papéis é
 * exclusiva do superadministrador (requireSuperAdmin no backend).
 */
const ROLE_SCREENS = [
  ['dashboard', 'Dashboard'],
  ['clientes', 'Clientes'],
  ['pets', 'Pets'],
  ['consultas', 'Consultas'],
  ['receitas', 'Receitas'],
  ['exames', 'Exames'],
  ['vacinas', 'Vacinas'],
  ['documentos', 'Documentos'],
  ['fotos', 'Fotos do site'],
  ['auditoria', 'Auditoria'],
] as const

/** Papéis pré-criados que não podem ser removidos (só editados). */
const SEEDED = new Set(['Recepcionista', 'Veterinário', 'Financeiro'])

interface Role {
  id: number
  name: string
  description: string | null
  screens: string[]
  is_active: boolean
  created_at: string
  members_count: number
}

const EMPTY_FORM = { name: '', description: '', screens: ['dashboard'] as string[] }

/**
 * Gestão de papéis customizados (RBAC por tela) — exclusivo do superadmin.
 *
 * A autorização real é no backend (requireSuperAdmin em todos os endpoints
 * /api/admin/roles); a flag isSuperAdmin aqui só decide o que a UI mostra.
 */
export default function Papeis() {
  const { user } = useSession()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [toast, setToast] = useState<{ kind: 'success'; message: string } | null>(null)
  const toastTimer = useRef<number | null>(null)

  const load = () => {
    api
      .get<{ roles: Role[] }>('/api/admin/roles')
      .then((r) => setRoles(r.roles))
      .catch(() => setRoles([]))
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

  const setFormField = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm((f) => ({ ...f, [k]: v }))

  const toggleScreen = (key: string) =>
    setForm((f) => ({
      ...f,
      screens: f.screens.includes(key) ? f.screens.filter((s) => s !== key) : [...f.screens, key],
    }))

  const onSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.post('/api/admin/roles', {
        name: form.name,
        description: form.description,
        screens: form.screens,
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar o papel.')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (r: Role) => {
    setForm({ name: r.name, description: r.description ?? '', screens: r.screens.length ? r.screens : [] })
    setEditingId(r.id)
  }

  const closeEdit = () => setEditingId(null)

  const saveEdit = async () => {
    if (editingId === null) return
    await api.put(`/api/admin/roles/${editingId}`, {
      name: form.name,
      description: form.description,
      screens: form.screens,
    })
  }

  const onSavedEdit = () => {
    if (editingId === null) return
    setRoles((list) =>
      list.map((r) =>
        r.id === editingId
          ? { ...r, name: form.name, description: form.description, screens: form.screens, is_active: true }
          : r,
      ),
    )
    showToast('Papel atualizado.')
  }

  const remove = async (r: Role) => {
    if (!window.confirm(`Remover o papel "${r.name}"? Os funcionários com esse papel ficarão sem acesso às telas.`)) return
    try {
      await api.del(`/api/admin/roles/${r.id}`)
      setRoles((list) => list.filter((x) => x.id !== r.id))
      showToast('Papel removido.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Não foi possível remover o papel.')
    }
  }

  // Só o superadmin gerencia papéis. O backend é a autoridade; este guard
  // só evita mostrar uma tela que devolveria 403.
  if (user?.isSuperAdmin !== true) {
    return (
      <div>
        <PageHeader title="Papéis" subtitle="Defina quais telas cada papel da equipe acessa." />
        <EmptyState
          title="Acesso restrito ao superadministrador"
          description="Somente o superadministrador pode criar e administrar os papéis de acesso."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Papéis"
        subtitle="Crie papéis para a equipe e defina quais telas do painel cada um acessa."
        action={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-magenta px-6 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rosa"
          >
            {showForm ? 'Cancelar' : 'Novo papel'}
          </button>
        }
      />

      {showForm && (
        <Card className="mb-6">
          <p className="mb-4 font-display text-base font-black text-dark">Criar papel</p>
          <form onSubmit={onSubmit} className="grid gap-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nome do papel" required value={form.name} onChange={(e) => setFormField('name')(e.target.value)} placeholder="Ex.: Estagiário, Auxiliar…" />
              <FormField label="Descrição" value={form.description} onChange={(e) => setFormField('description')(e.target.value)} placeholder="O que esse papel faz (opcional)" />
            </div>

            <div>
              <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Telas com acesso</p>
              <div className="grid gap-2 rounded-xl border border-dark/10 bg-cream/50 p-4 sm:grid-cols-2">
                {ROLE_SCREENS.map(([key, label]) => {
                  const checked = form.screens.includes(key)
                  return (
                    <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm text-dark/80">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleScreen(key)}
                        className="h-4 w-4 rounded border-dark/30 accent-turquesa"
                      />
                      {label}
                    </label>
                  )
                })}
              </div>
              <p className="mt-2 text-[11px] text-dark/45">
                Gestão de funcionários e de papéis fica sempre com a superadministradora.
              </p>
            </div>

            {error && <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta">{error}</p>}
            <div>
              <button type="submit" disabled={saving} className="h-12 rounded-full bg-turquesa px-8 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-azul disabled:opacity-60">
                {saving ? 'Salvando…' : 'Salvar papel'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-dark/5" />
      ) : roles.length === 0 ? (
        <EmptyState title="Nenhum papel criado" description="Crie o primeiro papel para começar a organizar os acessos da equipe." />
      ) : (
        <Card className="p-0">
          <Table>
            <thead>
              <tr>
                <Th>Papel</Th>
                <Th>Telas com acesso</Th>
                <Th>Equipe</Th>
                <Th>Status</Th>
                <Th className="text-right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id} className="hover:bg-cream/60">
                  <Td>
                    <p className="font-semibold text-dark">
                      {r.name}
                      {SEEDED.has(r.name) && (
                        <span className="ml-2 align-middle">
                          <Badge tone="gray">Exemplo</Badge>
                        </span>
                      )}
                    </p>
                    {r.description && <p className="mt-0.5 text-xs text-dark/45">{r.description}</p>}
                  </Td>
                  <Td>
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {r.screens.length === 0 ? (
                        <span className="text-xs text-dark/40">Sem telas (acesso restrito)</span>
                      ) : (
                        r.screens.map((s) => (
                          <Badge key={s} tone="turquesa">
                            {SCREEN_LABELS[s] ?? s}
                          </Badge>
                        ))
                      )}
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={r.members_count > 0 ? 'blue' : 'gray'}>{r.members_count} funcionário{r.members_count === 1 ? '' : 's'}</Badge>
                  </Td>
                  <Td>
                    <Badge tone={r.is_active ? 'green' : 'red'}>{r.is_active ? 'Ativo' : 'Inativo'}</Badge>
                  </Td>
                  <Td className="text-right">
                    <div className="inline-flex gap-1.5">
                      <RowAction tone="ghost" onClick={() => openEdit(r)}>Editar</RowAction>
                      <RowAction
                        tone="ghost"
                        onClick={() => void remove(r)}
                        className={SEEDED.has(r.name) ? 'opacity-40 hover:border-dark/15 hover:text-dark/70' : undefined}
                      >
                        Remover
                      </RowAction>
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
        label="Editar papel"
        title={form.name || 'Papel'}
        subtitle="Defina quais telas este papel acessa."
      >
        <div className="grid gap-4">
          <FormField label="Nome do papel" required value={form.name} onChange={(e) => setFormField('name')(e.target.value)} />
          <FormField
            label="Descrição"
            textarea
            value={form.description}
            onChange={(e) => setFormField('description')(e.target.value)}
            placeholder="O que esse papel faz (opcional)"
          />

          <div>
            <p className="mb-2 font-display text-[11px] font-bold uppercase tracking-[0.18em] text-dark/60">Telas com acesso</p>
            <div className="grid gap-2 rounded-xl border border-dark/10 bg-cream/50 p-4 sm:grid-cols-2">
              {ROLE_SCREENS.map(([key, label]) => {
                const checked = form.screens.includes(key)
                return (
                  <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm text-dark/80">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleScreen(key)}
                      className="h-4 w-4 rounded border-dark/30 accent-turquesa"
                    />
                    {label}
                  </label>
                )
              })}
            </div>
            <p className="mt-2 text-[11px] text-dark/45">
              Deixe todas desmarcadas para um papel sem acesso a telas (só o login).
            </p>
          </div>
        </div>
      </EditableModal>

      {toast && <Toast kind={toast.kind} message={toast.message} />}
    </div>
  )
}

/** Nome amigável de cada tela (badges). */
const SCREEN_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  pets: 'Pets',
  consultas: 'Consultas',
  receitas: 'Receitas',
  exames: 'Exames',
  vacinas: 'Vacinas',
  documentos: 'Documentos',
  fotos: 'Fotos',
  auditoria: 'Auditoria',
}
