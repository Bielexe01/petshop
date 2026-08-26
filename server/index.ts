import { createServer as createViteServer } from 'vite'
import express, { type Request, type Response, type NextFunction } from 'express'
import { existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getDb, closeDb } from './db.ts'
import { attachSessionUser, clearSessionCookie, destroySession, parseCookies, requireAuth } from './auth.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

/* Fotos reais fornecidas pelo usuário — servidas direto do public/photos
   (funciona em dev e em prod sem rebuild; fallback de marca cobre a ausência). */
const PHOTOS_DIR = join(__dirname, '..', 'public', 'photos')

/* ────────────────────────────────────────────────────────────────────────
   Servidor único (porta 5173).
   - Dev: monta o middleware do Vite (HMR + transform).
   - Prod: serve o build estático de dist/.
   - API em /api/*, com validação zod, sessões httpOnly e prepared statements.
   ──────────────────────────────────────────────────────────────────────── */

const ROOT = join(__dirname, '..')
const PORT = Number(process.env.PORT ?? 5173)
const IS_PROD = process.env.NODE_ENV === 'production'

const app = express()
app.disable('x-powered-by')

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
  res.json({ ok: true, name: 'Clínica Veterinária Dr.ª Cássia Carvalho' })
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

let vite: Awaited<ReturnType<typeof createViteServer>> | null = null

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
} else {
  vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  })
  app.use(vite.middlewares)
}

/* ── Erro final ───────────────────────────────────────────────────────── */
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[erro]', err)
  if (res.headersSent) return
  res.status(500).json({ message: 'Erro interno do servidor.' })
})

const server = app.listen(PORT, () => {
  console.log(`\n  🐾 Clínica Veterinária Dr.ª Cássia Carvalho`)
  console.log(`  ➜  http://localhost:${PORT}`)
  if (!IS_PROD) console.log(`  ➜  API em /api · sessão httpOnly · SQLite ${getDb() ? 'ok' : 'erro'}`)
})

async function shutdown() {
  try { await vite?.close() } catch { /* ignore */ }
  server.close()
  closeDb()
  process.exit(0)
}
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
