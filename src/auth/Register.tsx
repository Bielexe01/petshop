import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '@/lib/session'
import { Field, PasswordField } from './fields'

/**
 * Cadastro de cliente: nome, CPF, e-mail, telefone, senha + confirmação.
 * NÃO cria dados médicos — o cliente cadastra apenas a conta e o perfil.
 */
export default function Register() {
  const { register } = useSession()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    cpf: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setBusy(true)
    try {
      const user = await register({
        fullName: form.fullName,
        cpf: form.cpf || undefined,
        phone: form.phone || undefined,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword,
      })
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível criar a conta.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-black tracking-tight text-dark lg:text-4xl">
        Crie sua <span className="text-magenta">conta.</span>
      </h1>
      <p className="mt-2 text-sm text-dark/55">
        Acompanhe consultas, vacinas, receitas e documentos do seu pet em um só lugar.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        <Field label="Nome completo" name="fullName" required value={form.fullName} onChange={set('fullName')} placeholder="Maria da Silva" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CPF" name="cpf" value={form.cpf} onChange={set('cpf')} placeholder="000.000.000-00" inputMode="numeric" />
          <Field label="Telefone" name="phone" value={form.phone} onChange={set('phone')} placeholder="(16) 99999-9999" inputMode="tel" />
        </div>
        <Field label="E-mail" name="email" type="email" required value={form.email} onChange={set('email')} placeholder="voce@email.com" />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField label="Senha" name="password" required value={form.password} onChange={set('password')} placeholder="mínimo 8 caracteres" />
          <PasswordField label="Confirmar senha" name="confirmPassword" required value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="repita a senha" />
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-magenta/25 bg-magenta/8 px-4 py-2.5 text-sm font-medium text-magenta">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 h-12 w-full rounded-full bg-magenta font-display text-sm font-bold uppercase tracking-[0.12em] text-white transition-all hover:-translate-y-0.5 hover:bg-rosa hover:shadow-glow disabled:opacity-60"
        >
          {busy ? 'Criando conta…' : 'Criar conta'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-dark/55">
        Já tem conta?{' '}
        <Link to="/login" className="font-medium text-turquesa hover:text-azul">
          Entrar
        </Link>
      </p>
    </div>
  )
}
