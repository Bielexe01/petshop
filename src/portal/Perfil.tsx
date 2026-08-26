import { useEffect, useState, type FormEvent } from 'react'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/clinic'
import { PageHeader, Card, Badge } from '@/portal/ui'
import { PasswordField, Field } from '@/auth/fields'
import { CheckIcon, EditIcon } from '@/portal/icons'

interface Profile {
  full_name: string
  cpf: string | null
  phone: string | null
  birth_date: string | null
  address: string | null
  email: string
  created_at: string
}

export default function Perfil() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState({ fullName: '', cpf: '', phone: '', birthDate: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState('')

  const load = () => {
    api
      .get<{ profile: Profile }>('/api/profile')
      .then((r) => {
        setProfile(r.profile)
        setForm({
          fullName: r.profile.full_name ?? '',
          cpf: r.profile.cpf ?? '',
          phone: r.profile.phone ?? '',
          birthDate: r.profile.birth_date ?? '',
          address: r.profile.address ?? '',
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setPw = (k: keyof typeof pwForm) => (e: { target: { value: string } }) => setPwForm((f) => ({ ...f, [k]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await api.put('/api/profile', {
        fullName: form.fullName,
        cpf: form.cpf || null,
        phone: form.phone || null,
        birthDate: form.birthDate || null,
        address: form.address || null,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  const onSubmitPassword = async (e: FormEvent) => {
    e.preventDefault()
    setPwError('')
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError('As senhas não coincidem.')
      return
    }
    setPwSaving(true)
    try {
      await api.post('/api/profile/password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      })
      setPwSaved(true)
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Não foi possível alterar a senha.')
    } finally {
      setPwSaving(false)
    }
  }

  return (
    <div>
      <PageHeader title="Perfil" subtitle="Seus dados de cadastro na clínica." />

      {loading ? (
        <div className="h-96 animate-pulse rounded-2xl bg-dark/5" />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          {/* Dados pessoais */}
          <Card>
            <div className="mb-5 flex items-center justify-between">
              <p className="font-display text-base font-black text-dark">Dados pessoais</p>
              <span className="text-xs text-dark/45">E-mail: {profile?.email}</span>
            </div>
            <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
              <Field label="Nome completo" name="fullName" required value={form.fullName} onChange={set('fullName')} className="sm:col-span-2" />
              <Field label="CPF" name="cpf" value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" />
              <Field label="Telefone" name="phone" value={form.phone} onChange={set('phone')} placeholder="(16) 00000-0000" />
              <Field label="Data de nascimento" name="birthDate" type="date" value={form.birthDate} onChange={set('birthDate')} />
              <Field label="Endereço" name="address" value={form.address} onChange={set('address')} placeholder="Rua, número, bairro" />
              {error && <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta sm:col-span-2">{error}</p>}
              <div className="flex items-center gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-12 items-center gap-2 rounded-full bg-turquesa px-8 font-display text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-azul disabled:opacity-60"
                >
                  {saving ? 'Salvando…' : <><EditIcon className="h-4 w-4" /> Salvar alterações</>}
                </button>
                {saved && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-verde">
                    <CheckIcon className="h-4 w-4" /> Salvo!
                  </span>
                )}
              </div>
            </form>
          </Card>

          {/* Segurança */}
          <div className="space-y-6">
            <Card>
              <p className="mb-5 font-display text-base font-black text-dark">Alterar senha</p>
              <form onSubmit={onSubmitPassword} className="flex flex-col gap-4" noValidate>
                <PasswordField
                  label="Senha atual"
                  name="current"
                  autoComplete="current-password"
                  value={pwForm.currentPassword}
                  onChange={setPw('currentPassword')}
                  placeholder="••••••••"
                />
                <PasswordField
                  label="Nova senha"
                  name="new"
                  autoComplete="new-password"
                  value={pwForm.newPassword}
                  onChange={setPw('newPassword')}
                  placeholder="Mínimo 8 caracteres"
                  hint="Use letras, números e símbolos."
                />
                <PasswordField
                  label="Confirmar nova senha"
                  name="confirm"
                  autoComplete="new-password"
                  value={pwForm.confirmPassword}
                  onChange={setPw('confirmPassword')}
                  placeholder="Repita a nova senha"
                />
                {pwError && <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta">{pwError}</p>}
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="h-12 w-full rounded-full bg-dark font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-ink disabled:opacity-60"
                >
                  {pwSaving ? 'Alterando…' : 'Alterar senha'}
                </button>
                {pwSaved && (
                  <p className="inline-flex items-center gap-1.5 text-sm font-medium text-verde">
                    <CheckIcon className="h-4 w-4" /> Senha alterada com sucesso!
                  </p>
                )}
              </form>
            </Card>

            <Card className="flex items-start gap-3">
              <Badge tone="gray">Conta</Badge>
              <div className="text-sm text-dark/60">
                <p>Cliente desde {profile?.created_at ? formatDate(profile.created_at) : '—'}.</p>
                <p className="mt-1 text-xs text-dark/45">Seus dados médicos e dos seus pets são protegidos e só podem ser alterados pela clínica.</p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
