import { Router } from 'express'
import { getOne, run, getAll } from '../db.ts'
import {
  createSession,
  destroySession,
  resolveSession,
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

  const existing = await getOne<{ id: number }>('SELECT id FROM users WHERE email = $1', [d.email])
  if (existing) {
    res.status(409).json({ message: 'Este e-mail já está cadastrado.' })
    return
  }

  const passwordHash = hashPassword(d.password)
  const { lastInsertRowid: userId } = await run(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
    [d.email, passwordHash],
  )
  await run(
    `INSERT INTO profiles (user_id, full_name, cpf, phone) VALUES ($1, $2, $3, $4)`,
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

  if (await isRateLimited(key)) {
    res.status(429).json({ message: 'Muitas tentativas. Aguarde alguns segundos.' })
    return
  }

  // 1) Tenta admin
  const admin = await getOne<{ id: number; email: string; password_hash: string; name: string; role: string; is_active: boolean }>(
    'SELECT * FROM admin_users WHERE email = $1',
    [email],
  )
  if (admin && verifyPassword(password, admin.password_hash)) {
    if (!admin.is_active) {
      res.status(403).json({ message: 'Conta administrativa desativada.' })
      return
    }
    await resetRateLimit(key)
    const session = await createSession(admin.id, 'admin', admin.name, admin.email, admin.role === 'superadmin')
    setSessionCookie(res, session.token)
    // Monta `screens` (RBAC por tela) com a mesma lógica do /api/me
    // (resolveSession), para o frontend aplicar o UI-gating já no login.
    const resolved = await resolveSession(session.token)
    res.json({ user: { ...session.user, screens: resolved?.screens } })
    return
  }

  // 2) Tenta cliente
  const client = await getOne<{ id: number; email: string; password_hash: string; is_active: boolean }>(
    'SELECT * FROM users WHERE email = $1',
    [email],
  )
  if (client && verifyPassword(password, client.password_hash)) {
    if (!client.is_active) {
      res.status(403).json({ message: 'Conta desativada. Fale com a clínica.' })
      return
    }
    await resetRateLimit(key)
    const profile = await getOne<{ full_name: string }>('SELECT full_name FROM profiles WHERE user_id = $1', [client.id])
    const session = await createSession(client.id, 'client', profile?.full_name ?? 'Cliente', client.email)
    setSessionCookie(res, session.token)
    res.json({ user: session.user })
    return
  }

  await recordFailedLogin(key)
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

authRouter.post('/forgot', async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Informe um e-mail válido.' })
    return
  }
  const { email } = parsed.data

  // Não revelar se o e-mail existe (prevenção de enumeração)
  const user = await getOne<{ id: number }>('SELECT id FROM users WHERE email = $1', [email])
  const admin = await getOne<{ id: number }>('SELECT id FROM admin_users WHERE email = $1', [email])

  if (user) {
    const raw = await createPasswordResetToken(user.id, email)
    console.log(`\n  🔑 [recuperação] ${email} — token: ${raw}\n`)
  } else if (admin) {
    const raw = await createPasswordResetToken(admin.id, email)
    console.log(`\n  🔑 [recuperação admin] ${email} — token: ${raw}\n`)
  }

  res.json({ ok: true, message: 'Se o e-mail existir, você receberá um link de recuperação.' })
})

/* ── Reset de senha ───────────────────────────────────────────────────── */

authRouter.post('/reset', async (req, res) => {
  const parsed = resetSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Dados inválidos.' })
    return
  }
  const { token, password } = parsed.data

  const userId = await consumePasswordResetToken(token)
  if (!userId) {
    res.status(400).json({ message: 'Link inválido ou expirado.' })
    return
  }

  const passwordHash = hashPassword(password)
  const client = await getOne<{ id: number }>('SELECT id FROM users WHERE id = $1', [userId])
  const admin = await getOne<{ id: number }>('SELECT id FROM admin_users WHERE id = $1', [userId])

  if (client) {
    await run('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId])
  } else if (admin) {
    await run('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [passwordHash, userId])
  } else {
    res.status(400).json({ message: 'Conta não encontrada.' })
    return
  }

  res.json({ ok: true, message: 'Senha atualizada com sucesso. Faça login.' })
})

/* ── Notificações do usuário (helpers compartilhados) ─────────────────── */

export async function createNotification(userId: number, title: string, body: string, type = 'info') {
  await run('INSERT INTO notifications (user_id, title, body, type) VALUES ($1, $2, $3, $4)', [userId, title, body, type])
}

export { getAll }
