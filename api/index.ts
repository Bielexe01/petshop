/* ────────────────────────────────────────────────────────────────────────
   Vercel Function — entry do servidor Express.
   A Vercel só detecta Serverless Functions dentro do diretório `api/`
   (zero-config). Este arquivo reexporta o `app` do Express; o `vercel.json`
   roteia `/api/*` e as rotas do SPA para cá. O `listen()` é chamado apenas
   fora do ambiente Vercel (ver server/index.ts).
   ──────────────────────────────────────────────────────────────────────── */
import { app } from '../server/index.ts'

export default app
