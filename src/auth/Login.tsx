import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSession } from '@/lib/session'
import { Field, PasswordField, DemoBanner } from './fields'

/**
 * Login (cliente OU admin — o backend resolve pelo e-mail). Com
 * demonstração de credenciais e redirecionamento por papel.
 */
export default function Login({ admin = false }: { admin?: boolean }) {
  const { login } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const user = await login(email, password)
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível entrar.')
    } finally {
      setBusy(false)
    }
  }

  const fillDemo = (which: 'client' | 'admin') => {
    if (which === 'client') {
      setEmail('cliente@demo.com')
      setPassword('Demo@1234')
    } else {
      setEmail('admin@clinica.com')
      setPassword('Admin@1234')
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-black tracking-tight text-dark lg:text-4xl">
        Bem-vindo de <span className="text-magenta">volta.</span>
      </h1>
      <p className="mt-2 text-sm text-dark/55">
        {admin ? 'Acesse o painel administrativo da clínica.' : 'Acesse sua área do cliente e acompanhe o cuidado do seu pet.'}
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        <Field
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
        />
        <PasswordField
          label="Senha"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />

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
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link to="/recuperar" className="font-medium text-turquesa hover:text-azul">
          Esqueci minha senha
        </Link>
        {!admin && (
          <Link to="/cadastro" className="font-medium text-dark/60 hover:text-magenta">
            Criar conta
          </Link>
        )}
      </div>

      {!admin && (
        <div className="mt-8">
          <DemoBanner>
            <p className="mt-1">
              Cliente: <button onClick={() => fillDemo('client')} className="font-semibold text-turquesa underline-offset-2 hover:underline">cliente@demo.com</button> · Senha <b>Demo@1234</b>
            </p>
            <p className="mt-0.5">
              Admin: <button onClick={() => fillDemo('admin')} className="font-semibold text-turquesa underline-offset-2 hover:underline">admin@clinica.com</button> · Senha <b>Admin@1234</b>
            </p>
          </DemoBanner>
        </div>
      )}
    </div>
  )
}
