import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { Field } from './fields'

/**
 * Recuperação de senha. Em produção o link vai por e-mail (integração SMTP);
 * em dev o token aparece no console do servidor (sem e-mail real).
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await api.post('/api/auth/forgot', { email })
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível processar.')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div>
        <h1 className="font-display text-3xl font-black tracking-tight text-dark lg:text-4xl">
          Verifique seu <span className="text-turquesa">e-mail.</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-dark/60">
          Se o e-mail <b className="text-dark">{email}</b> estiver cadastrado, você receberá um link
          de recuperação.
        </p>
        <p className="mt-4 rounded-xl border border-turquesa/25 bg-turquesa-claro/50 px-4 py-3 text-xs leading-relaxed text-dark/60">
          <b>Modo de demonstração:</b> o link (token) é exibido no console do servidor. Em produção,
          o envio será feito por e-mail.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-magenta px-8 font-display text-sm font-bold uppercase tracking-[0.12em] text-white"
        >
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-black tracking-tight text-dark lg:text-4xl">
        Recuperar <span className="text-magenta">senha.</span>
      </h1>
      <p className="mt-2 text-sm text-dark/55">
        Informe seu e-mail cadastrado e enviaremos as instruções para redefinir a senha.
      </p>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        <Field
          label="E-mail"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
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
          {busy ? 'Enviando…' : 'Enviar instruções'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-dark/55">
        Lembrou a senha?{' '}
        <Link to="/login" className="font-medium text-turquesa hover:text-azul">
          Fazer login
        </Link>
      </p>
    </div>
  )
}
