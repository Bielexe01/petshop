# Deploy: como o app roda 100% no Vercel (Supabase)

Este app é um **servidor Express único** que agora persiste tudo no **Supabase**
(Postgres + Storage). Isso o torna **100% compatível com a Vercel**: não existe
mais arquivo local, banco em disco ou rate limiting em memória que dependa de
uma instância única. O mesmo código roda em `localhost` (dev) e como
**Vercel Function**.

## Arquitetura atual

| O que o app usa | Onde fica | Por que funciona no Vercel |
|---|---|---|
| Banco de dados | **Supabase Postgres** (`DATABASE_URL`) | banco hospedado, compartilhado entre as Functions |
| Sessões | tabela `sessions` no Postgres | persistem entre requests |
| Rate limiting de login | tabela `login_attempts` no Postgres | compartilhado entre instâncias (não é memória) |
| Uploads de documentos | bucket **`docs`** (privado) | object storage, fora do filesystem efêmero |
| Fotos de pets | bucket **`petphotos`** (privado) | idem |
| Fotos do site (admin) | `site_settings` no Postgres (base64) | banco, não disco |
| Frontend | build estático em `dist/` | servido pelo filesystem da Vercel |

## Como rodar localmente

1. **Crie o projeto Supabase** e rode o schema:
   - Abra o SQL Editor do Supabase e cole o conteúdo de `supabase/schema.sql`
     (é idempotente — `create table if not exists`).
   - Opcionalmente, crie os buckets `docs` e `petphotos` (privados) no
     painel → Storage. (O código cria por upload, mas criar antes evita
     confusão de permissões.)

2. **Configure o `.env`** (copie `.env.example`):
   ```bash
   DATABASE_URL=postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role_key_do_supabase>
   ```
   - `DATABASE_URL`: Project Settings → Database → Connection string → URI.
   - `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`: Project Settings → API.
     A service role key é **segredo** — nunca exponha ao frontend.

3. **Seed (dados demo)**:
   ```bash
   npm run seed
   ```
   Cria `cliente@demo.com` / `Demo@1234` e `admin@clinica.com` / `Admin@1234`
   com pets e histórico. O seed **não migra** o `data/clinica.db` local
   (decisão "começar limpo").

4. **Rodar em dev**:
   ```bash
   npm run dev
   ```

## Deploy na Vercel

1. **Conecte o repositório** na Vercel (framework: detectado via `vercel.json`).
2. **Adicione as env vars** no painel (Settings → Environment Variables):
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NODE_ENV=production` (garante o cookie de sessão `Secure`)
3. **Deploy**. O `vercel.json`:
   - compila o frontend (`npm run build`) e publica `dist/`;
   - o entry da Vercel Function é `api/index.ts` (reexporta o `app` do
     Express de `server/index.ts`);
   - roteia `/api/*` → `/api` (a Function) e as rotas do SPA → `/index.html`;
   - assets estáticos (`/assets/*`, `/photos/*`) são servidos nativamente
     pela Vercel (têm precedência sobre as rewrites).

## Notas importantes

- **A integração do Supabase no painel da Vercel** (conectar o projeto como
  integration) **não é suficiente sozinha**: ela só expõe env vars e permite
  rodar SQL. O que faz o app funcionar é o código já migrado para Postgres +
  Storage — que é exatamente o que este refactor entregou.
- **Service role key**: o app a usa no servidor (uploads/Storage). Ela deve
  estar **apenas** nas env vars do Vercel / `.env`, nunca no frontend.
- **Limite de 10 MB** por documento e **2 MB** por foto continuam valendo.
- O arquivo `server/schema.sql` (SQLite) ficou como referência histórica —
  o schema ativo é o `supabase/schema.sql`.
- **Pós-deploy**: se quiser que os buckets e RLS do Supabase fiquem 100% no
  automático, você pode usar a interface do Supabase (Storage → New bucket)
  ou manter a criação manual. O código não depende de permissões de RLS
  porque usa a service role key (bypass).
