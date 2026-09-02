import express, { type Request, type Response, type NextFunction } from 'express'
import type { ViteDevServer } from 'vite'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { closeDb } from './db.ts'
import { attachSessionUser, clearSessionCookie, destroySession, parseCookies, requireAuth } from './auth.ts'

// Carrega o .env (DATABASE_URL, SUPABASE_*) quando o servidor roda direto
// (`node server/index.ts`). A Vercel injeta as env vars no ambiente; aqui só
// carregamos se o arquivo existir e as variáveis ainda não estiverem setadas.
try {
  if (!process.env.DATABASE_URL && existsSync(join(process.cwd(), '.env'))) {
    process.loadEnvFile(join(process.cwd(), '.env'))
  }
} catch {
  /* sem .env local — a Vercel injeta as variáveis */
}

const __dirname = dirname(fileURLToPath(import.meta.url))

/* Fotos reais fornecidas pelo usuário — servidas direto do public/photos
   (funciona em dev e em prod sem rebuild; fallback de marca cobre a ausência). */
const PHOTOS_DIR = join(__dirname, '..', 'public', 'photos')

/* ────────────────────────────────────────────────────────────────────────
   Servidor Express único.
   - Dev: monta o middleware do Vite (HMR + transform).
   - Prod: serve o build estático de dist/.
   - Vercel: o `app` é exportado como Vercel Function (entry em `api/index.ts`;
     o `vercel.json` roteia `/api/*` e as rotas do SPA para lá). O
     banco/storage ficam no Supabase.
   ──────────────────────────────────────────────────────────────────────── */

const ROOT = join(__dirname, '..')
const PORT = Number(process.env.PORT ?? 5173)
const IS_PROD = process.env.NODE_ENV === 'production'
const IS_VERCEL = Boolean(process.env.VERCEL)

export const app = express()
app.disable('x-powered-by')
// Atrás do proxy da Vercel, confiar em X-Forwarded-For para que o rate
// limiter de login veja o IP real do cliente (e não o do proxy).
app.set('trust proxy', true)

app.use(express.json({ limit: '12mb' }))

/* ── Headers de segurança ────────────────────────────────────────────── */
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Content-Security-Policy', "frame-ancestors 'self'; object-src 'none'; base-uri 'self'")
  next()
})

/* ── Sessão ───────────────────────────────────────────────────────────── */
app.use(attachSessionUser)

/* ── Rotas da API ─────────────────────────────────────────────────────── */
import { authRouter } from './routes/auth.ts'
import { clientsRouter } from './routes/clients.ts'
import { petsRouter } from './routes/pets.ts'
import { appointmentsRouter } from './routes/appointments.ts'
import { recordsRouter } from './routes/records.ts'
import { prescriptionsRouter } from './routes/prescriptions.ts'
import { examsRouter } from './routes/exams.ts'
import { vaccinationsRouter } from './routes/vaccinations.ts'
import { documentsRouter } from './routes/documents.ts'
import { notificationsRouter } from './routes/notifications.ts'
import { adminRouter } from './routes/admin.ts'
import { auditRouter } from './routes/audit.ts'
import { filesRouter } from './routes/files.ts'
import { photosRouter } from './routes/photos.ts'
import { profileRouter } from './routes/profile.ts'

app.use('/api/auth', authRouter)
app.use('/api/clients', requireAuth, clientsRouter)
app.use('/api/pets', requireAuth, petsRouter)
app.use('/api/appointments', requireAuth, appointmentsRouter)
app.use('/api/records', requireAuth, recordsRouter)
app.use('/api/prescriptions', requireAuth, prescriptionsRouter)
app.use('/api/exams', requireAuth, examsRouter)
app.use('/api/vaccinations', requireAuth, vaccinationsRouter)
app.use('/api/documents', requireAuth, documentsRouter)
app.use('/api/notifications', requireAuth, notificationsRouter)
app.use('/api/admin', adminRouter)
app.use('/api/audit', requireAuth, auditRouter)
app.use('/api/files', filesRouter)
app.use('/api/photos', photosRouter)
app.use('/api/profile', requireAuth, profileRouter)

/* ── Health check ─────────────────────────────────────────────────────── */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, name: 'Clínica Veterinária Dr.ª Cássia Carvalho', build: 'supabase-rbac-2026-09-02' })
})

/* ── Sessão atual (para o front guardar estado) ───────────────────────── */
app.get('/api/me', (req: Request, res: Response) => {
  res.json({ user: req.sessionUser ?? null })
})

/* ── Logout ───────────────────────────────────────────────────────────── */
app.post('/api/auth/logout', async (req: Request, res: Response) => {
  const token = parseCookies(req).session
  await destroySession(token)
  clearSessionCookie(res)
  res.json({ ok: true })
})

/* ── Fotos estáticas (manifest dinâmico em /api/photos) ────────────────── */
app.use('/photos', express.static(PHOTOS_DIR, { maxAge: '7d' }))

/* ── Frontend ─────────────────────────────────────────────────────────── */

let vite: ViteDevServer | null = null

/** Inicializa o Vite só em dev (fora da Vercel). Import dinâmico para o Vite
 *  nunca entrar no bundle da Vercel Function — mantém o deploy leve. */
async function initVite() {
  const { createServer: createViteServer } = await import('vite')
  const server = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  })
  vite = server
  app.use(server.middlewares)
}

if (IS_PROD) {
  const dist = join(ROOT, 'dist')
  app.use(express.static(dist, { index: false, maxAge: '1y', immutable: true }))

  // SPA fallback — envia index.html para rotas não-API
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    if (req.method !== 'GET') return next()
    const indexFile = join(dist, 'index.html')
    if (existsSync(indexFile)) {
      res.type('html').sendFile(indexFile)
    } else {
      res.status(404).send('Build não encontrado. Rode `npm run build`.')
    }
  })
} else if (!IS_VERCEL) {
  void initVite()
}

/* ── Erro final ───────────────────────────────────────────────────────── */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[erro]', err)
  if (res.headersSent) return
  const errorMessage = err instanceof Error ? err.message : String(err)
  const code = errorMessage.includes('Faltando DATABASE_URL')
    ? 'DATABASE_URL_AUSENTE'
    : errorMessage.includes('getaddrinfo') || errorMessage.includes('timeout')
      ? 'BANCO_INDISPONIVEL'
      : 'ERRO_BANCO_OU_SERVIDOR'
  res.status(500).json({ message: 'Erro interno do servidor.', code })
})

/* ── Listen (só fora da Vercel) ───────────────────────────────────────── */
if (!IS_VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`\n  🐾 Sua CLinica`)
    console.log(`  ➜  http://localhost:${PORT}`)
    console.log(`  ➜  API em /api · sessão httpOnly · Postgres (Supabase)`)
  })

  async function shutdown() {
    try { await vite?.close() } catch { /* ignore */ }
    server.close()
    await closeDb()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

export default app
