import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { getOne, run } from './db.ts'

/* ────────────────────────────────────────────────────────────────────────
   Hashing de senha — scrypt (lib nativa, memoria-hard, sem deps externas).
   Formato armazenado: scrypt$N$r$p$salthex$hashhex
   ──────────────────────────────────────────────────────────────────────── */

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEYLEN = 64

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$')
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false
    const [, n, r, p, saltHex, hashHex] = parts
    const salt = Buffer.from(saltHex, 'hex')
    const expected = Buffer.from(hashHex, 'hex')
    const actual = scryptSync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    })
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}

/* ────────────────────────────────────────────────────────────────────────
   Sessões — token aleatório de 256 bits; somente o SHA-256 é gravado.
   Cookie httpOnly, SameSite=Lax, Secure em produção.
   ──────────────────────────────────────────────────────────────────────── */

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

export interface SessionUser {
  id: number
  email: string
  role: 'client' | 'admin'
  name: string
  /**
   * Apenas UI-gating (mostrar/esconder telas). Nunca autoriza nada —
   * o backend relê o papel em admin_users via requireSuperAdmin.
   */
  isSuperAdmin?: boolean
}

export interface Session {
  token: string
  user: SessionUser
}

export async function createSession(
  userId: number,
  role: 'client' | 'admin',
  name: string,
  email: string,
  isSuperAdmin?: boolean,
): Promise<Session> {
  const token = generateToken()
  const tokenHash = sha256(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await run(
    `INSERT INTO sessions (token_hash, user_id, user_role, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [tokenHash, userId, role, expiresAt.toISOString()],
  )

  return { token, user: { id: userId, email, role, name, isSuperAdmin } }
}

export async function destroySession(token: string | undefined) {
  if (!token) return
  await run('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)])
}

async function resolveSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null
  const row = await getOne<{
    token_hash: string
    user_id: number
    user_role: 'client' | 'admin'
    expires_at: string
  }>('SELECT * FROM sessions WHERE token_hash = $1', [sha256(token)])

  if (!row) return null
  if (new Date(row.expires_at.replace(' ', 'T')) < new Date()) {
    await run('DELETE FROM sessions WHERE token_hash = $1', [row.token_hash])
    return null
  }

  if (row.user_role === 'client') {
    const u = await getOne<{ id: number; email: string; is_active: boolean }>(
      'SELECT id, email, is_active FROM users WHERE id = $1',
      [row.user_id],
    )
    if (!u || !u.is_active) return null
    const p = await getOne<{ full_name: string }>('SELECT full_name FROM profiles WHERE user_id = $1', [u.id])
    return { id: u.id, email: u.email, role: 'client', name: p?.full_name ?? 'Cliente' }
  }

  const a = await getOne<{ id: number; email: string; name: string; role: string; is_active: boolean }>(
    'SELECT id, email, name, role, is_active FROM admin_users WHERE id = $1',
    [row.user_id],
  )
  if (!a || !a.is_active) return null
  return { id: a.id, email: a.email, role: 'admin', name: a.name, isSuperAdmin: a.role === 'superadmin' }
}

/* ────────────────────────────────────────────────────────────────────────
   Helpers para cookies / headers de sessão
   ──────────────────────────────────────────────────────────────────────── */

export function setSessionCookie(res: Response, token: string) {
  const secure = process.env.NODE_ENV === 'production'
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_MS,
  })
}

export function clearSessionCookie(res: Response) {
  res.clearCookie('session', { httpOnly: true, sameSite: 'lax', path: '/' })
}

/* ────────────────────────────────────────────────────────────────────────
   Middlewares de autenticação
   ──────────────────────────────────────────────────────────────────────── */

declare module 'express-serve-static-core' {
  interface Request {
    sessionUser?: SessionUser
  }
}

export async function attachSessionUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = parseCookies(req).session
    if (token) {
      const user = await resolveSession(token)
      if (user) req.sessionUser = user
    }
    next()
  } catch (err) {
    next(err)
  }
}

/** Exige sessão (cliente OU admin). */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.sessionUser) {
    res.status(401).json({ message: 'Faça login para continuar.' })
    return
  }
  next()
}

/** Exige papel de cliente. */
export function requireClient(req: Request, res: Response, next: NextFunction) {
  if (!req.sessionUser) {
    res.status(401).json({ message: 'Faça login para continuar.' })
    return
  }
  if (req.sessionUser.role !== 'client') {
    res.status(403).json({ message: 'Acesso negado.' })
    return
  }
  next()
}

/** Exige papel de administrador. */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.sessionUser) {
    res.status(401).json({ message: 'Faça login para continuar.' })
    return
  }
  if (req.sessionUser.role !== 'admin') {
    res.status(403).json({ message: 'Acesso restrito à equipe da clínica.' })
    return
  }
  next()
}

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  requireAdmin(req, res, async () => {
    const a = await getOne<{ role: string }>('SELECT role FROM admin_users WHERE id = $1', [req.sessionUser!.id])
    if (a?.role !== 'superadmin') {
      res.status(403).json({ message: 'Ação restrita ao superadministrador.' })
      return
    }
    next()
  })
}

/* ────────────────────────────────────────────────────────────────────────
   Rate limiting de login — janela deslizante por e-mail + IP.
   Baseado em tabela (login_attempts) para compartilhar o estado entre as
   Vercel Functions — o Map em memória não funcionaria em serverless.
   ──────────────────────────────────────────────────────────────────────── */

const WINDOW_MS = 5 * 60 * 1000 // 5 min — janela deslizante
const MAX_FAILS = 5
const LOCK_MS = 30 * 1000 // 30s após atingir o limite

export function rateLimitKey(email: string, ip: string): string {
  return `${email.toLowerCase()}::${ip}`
}

function pgIso(ms: number): string {
  return new Date(ms).toISOString()
}

/**
 * Bloqueio auto-regenerativo: só bloqueia enquanto `locked_until` não
 * expirou. A janela de 5 min limpa o histórico — nunca trava uma conta em
 * definitivo (importante para as credenciais de demonstração).
 */
export async function isRateLimited(key: string): Promise<boolean> {
  const row = await getOne<{ locked_until: string | null }>(
    `SELECT MAX(locked_until) AS locked_until
     FROM login_attempts
     WHERE key = $1 AND failed_at > $2`,
    [key, pgIso(Date.now() - WINDOW_MS)],
  )
  const lock = row?.locked_until
  if (!lock) return false
  return new Date(lock.replace(' ', 'T')) > new Date()
}

export async function recordFailedLogin(key: string) {
  const now = Date.now()
  // Conta falhas na janela deslizante de 5 min
  const recent = await getOne<{ n: number }>(
    `SELECT COUNT(*) AS n FROM login_attempts
     WHERE key = $1 AND failed_at > $2`,
    [key, pgIso(now - WINDOW_MS)],
  )
  const lockUntil = (recent?.n ?? 0) + 1 >= MAX_FAILS ? now + LOCK_MS : 0
  await run(
    `INSERT INTO login_attempts (key, failed_at, locked_until) VALUES ($1, $2, $3)`,
    [key, pgIso(now), lockUntil ? pgIso(lockUntil) : null],
  )
}

export async function resetRateLimit(key: string) {
  await run('DELETE FROM login_attempts WHERE key = $1', [key])
}

/* ────────────────────────────────────────────────────────────────────────
   Auditoria administrativa
   ──────────────────────────────────────────────────────────────────────── */

export async function audit(
  adminUserId: number | null,
  action: string,
  targetType?: string,
  targetId?: number,
  details?: string,
) {
  try {
    await run(
      `INSERT INTO auth_logs (admin_user_id, action, target_type, target_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminUserId, action, targetType ?? null, targetId ?? null, details ?? null],
    )
  } catch {
    /* auditoria não deve quebrar o fluxo */
  }
}

/* ────────────────────────────────────────────────────────────────────────
   Recuperação de senha
   ──────────────────────────────────────────────────────────────────────── */

export async function createPasswordResetToken(userId: number, _email?: string): Promise<string> {
  const raw = randomUUID() + randomBytes(12).toString('hex')
  const tokenHash = sha256(raw)
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1h
  await run('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId])
  await run(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt.toISOString()],
  )
  // Em produção, enviar por e-mail (integração futura com provedor SMTP).
  // Em dev, o token retorna ao caller para ser exibido no console do servidor.
  return raw
}

export async function consumePasswordResetToken(token: string): Promise<number | null> {
  const row = await getOne<{ user_id: number; expires_at: string; used: boolean }>(
    'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token_hash = $1',
    [sha256(token)],
  )
  if (!row || row.used) return null
  if (new Date(row.expires_at.replace(' ', 'T')) < new Date()) return null
  await run('UPDATE password_reset_tokens SET used = true WHERE token_hash = $1', [sha256(token)])
  return row.user_id
}

/** Helper para o express: lê cookies sem lib extra (cookie-parser). */
export function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map((pair) => {
      const idx = pair.indexOf('=')
      if (idx === -1) return [pair.trim(), '']
      return [pair.slice(0, idx).trim(), decodeURIComponent(pair.slice(idx + 1).trim())]
    }),
  )
}
