import { Router } from 'express'
import { getOne, run, getAll } from '../db.ts'
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
  isRateLimited,
  rateLimitKey,
  recordFailedLogin,
  resetRateLimit,
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  createPasswordResetToken,
  consumePasswordResetToken,
} from '../auth.ts'
import { loginSchema, registerSchema, forgotSchema, resetSchema } from '../lib/validation.ts'

export const authRouter = Router()

/* ── Cadastro de cliente ──────────────────────────────────────────────── */

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.', issues: parsed.error.flatten() })
    return
  }
  const d = parsed.data

  const existing = getOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [d.email])
  if (existing) {
    res.status(409).json({ message: 'Este e-mail já está cadastrado.' })
    return
  }

  const passwordHash = hashPassword(d.password)
  const { lastInsertRowid: userId } = run(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)',
    [d.email, passwordHash],
  )
  run(
    `INSERT INTO profiles (user_id, full_name, cpf, phone) VALUES (?, ?, ?, ?)`,
    [userId, d.fullName, d.cpf ?? null, d.phone ?? null],
  )

  const session = await createSession(userId, 'client', d.fullName, d.email)
  setSessionCookie(res, session.token)
  res.status(201).json({ user: session.user })
})

/* ── Login (cliente OU admin) ─────────────────────────────────────────── */

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.' })
    return
  }
  const { email, password } = parsed.data
  const ip = req.ip ?? 'unknown'
  const key = rateLimitKey(email, ip)

  if (isRateLimited(key)) {
    res.status(429).json({ message: 'Muitas tentativas. Aguarde alguns segundos.' })
    return
  }

  // 1) Tenta admin
  const admin = getOne<{ id: number; email: string; password_hash: string; name: string; role: string; is_active: number }>(
    'SELECT * FROM admin_users WHERE email = ?',
    [email],
  )
  if (admin && verifyPassword(password, admin.password_hash)) {
    if (!admin.is_active) {
      res.status(403).json({ message: 'Conta administrativa desativada.' })
      return
    }
    resetRateLimit(key)
    const session = await createSession(admin.id, 'admin', admin.name, admin.email)
    setSessionCookie(res, session.token)
    // session.user já carrega role normalizado ('admin'); o papel superadmin é
    // resolvido no servidor (requireSuperAdmin) e nunca exposto ao cliente.
    res.json({ user: session.user })
    return
  }

  // 2) Tenta cliente
  const client = getOne<{ id: number; email: string; password_hash: string; is_active: number }>(
    'SELECT * FROM users WHERE email = ?',
    [email],
  )
  if (client && verifyPassword(password, client.password_hash)) {
    if (!client.is_active) {
      res.status(403).json({ message: 'Conta desativada. Fale com a clínica.' })
      return
    }
    resetRateLimit(key)
    const profile = getOne<{ full_name: string }>('SELECT full_name FROM profiles WHERE user_id = ?', [client.id])
    const session = await createSession(client.id, 'client', profile?.full_name ?? 'Cliente', client.email)
    setSessionCookie(res, session.token)
    res.json({ user: session.user })
    return
  }

  recordFailedLogin(key)
  res.status(401).json({ message: 'E-mail ou senha incorretos.' })
})

/* ── Logout ───────────────────────────────────────────────────────────── */

authRouter.post('/logout', async (req, res) => {
  const token = parseCookies(req).session
  await destroySession(token)
  clearSessionCookie(res)
  res.json({ ok: true })
})

/* ── Esqueci minha senha ──────────────────────────────────────────────── */

authRouter.post('/forgot', (req, res) => {
  const parsed = forgotSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Informe um e-mail válido.' })
    return
  }
  const { email } = parsed.data

  // Não revelar se o e-mail existe (prevenção de enumeração)
  const user = getOne<{ id: number }>('SELECT id FROM users WHERE email = ?', [email])
  const admin = getOne<{ id: number }>('SELECT id FROM admin_users WHERE email = ?', [email])

  if (user) {
    const raw = createPasswordResetToken(user.id, email)
    console.log(`\n  🔑 [recuperação] ${email} — token: ${raw}\n`)
  } else if (admin) {
    const raw = createPasswordResetToken(admin.id, email)
    console.log(`\n  🔑 [recuperação admin] ${email} — token: ${raw}\n`)
  }

  res.json({ ok: true, message: 'Se o e-mail existir, você receberá um link de recuperação.' })
})

/* ── Reset de senha ───────────────────────────────────────────────────── */

authRouter.post('/reset', (req, res) => {
  const parsed = resetSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.' })
    return
  }
  const { token, password } = parsed.data

  const userId = consumePasswordResetToken(token)
  if (!userId) {
    res.status(400).json({ message: 'Link inválido ou expirado.' })
    return
  }

  const passwordHash = hashPassword(password)
  const client = getOne<{ id: number }>('SELECT id FROM users WHERE id = ?', [userId])
  const admin = getOne<{ id: number }>('SELECT id FROM admin_users WHERE id = ?', [userId])

  if (client) {
    run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId])
  } else if (admin) {
    run('UPDATE admin_users SET password_hash = ? WHERE id = ?', [passwordHash, userId])
  } else {
    res.status(400).json({ message: 'Conta não encontrada.' })
    return
  }

  res.json({ ok: true, message: 'Senha atualizada com sucesso. Faça login.' })
})

/* ── Notificações do usuário (helpers compartilhados) ─────────────────── */

export function createNotification(userId: number, title: string, body: string, type = 'info') {
  run('INSERT INTO notifications (user_id, title, body, type) VALUES (?, ?, ?, ?)', [userId, title, body, type])
}

export { getAll }
