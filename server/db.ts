import pg from 'pg'
import { existsSync as fsExistsSync } from 'node:fs'

const { Pool } = pg

/* ────────────────────────────────────────────────────────────────────────
   Camada de dados — PostgreSQL via Supabase.
   Mantém a MESMA API do SQLite (getOne/getAll/run), agora assíncrona,
   para que as rotas só precisem adicionar `await`. Todas as consultas usam
   prepared statements (anti SQL injection).
   ──────────────────────────────────────────────────────────────────────── */

let pool: pg.Pool | null = null

export function getDb(): pg.Pool {
  if (pool) return pool

  const connectionString =
    process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? process.env.SUPABASE_URL
  if (!connectionString) {
    throw new Error(
      'Faltando DATABASE_URL (ou SUPABASE_DB_URL/SUPABASE_URL). Configure no .env e nas env vars do Vercel.',
    )
  }

  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })

  // `pg` converte timestamptz em Date por padrão. O frontend (e o gerador
  // de PDF) esperam strings no formato SQLite `YYYY-MM-DD HH:MM:SS`.
  // Registrar um parser próprio para timestamptz normaliza o texto do
  // Postgres para esse formato (corta fração de segundo e fuso).
  //   ex.: "2026-08-26 14:30:00.123+00" → "2026-08-26 14:30:00"
  pg.types.setTypeParser(1184, (v) => v.replace('T', ' ').replace(/\.\d+(Z|[+-]\d+(:\d+)?)?$/, ''))

  return pool
}

/** Fecha o pool (usado em testes/restart). */
export async function closeDb() {
  await pool?.end()
  pool = null
}

export interface Row {
  [key: string]: unknown
}

/** Caminho é mantido apenas por compatibilidade (era usado para SQLite local). */
export function dbPath(): string {
  return process.env.DB_PATH ?? ''
}

/** Retorna `true` se existe um arquivo no caminho (helper de compatibilidade). */
export function existsSync(path: string): boolean {
  return fsExistsSync(path)
}

/**
 * Serializa uma data para o formato armazenado no banco (string ISO).
 * O Postgres aceita ISO; o parser de timestamptz normaliza para
 * `YYYY-MM-DD HH:MM:SS` na leitura.
 */
export function toDbIso(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

type SqlValue = string | number | boolean | null

/** Busca a primeira linha ou null. */
export async function getOne<T = Row>(sql: string, params: SqlValue[] = []): Promise<T | null> {
  const result = await getDb().query(sql, params)
  return (result.rows[0] as T | undefined) ?? null
}

/** Busca todas as linhas. */
export async function getAll<T = Row>(sql: string, params: SqlValue[] = []): Promise<T[]> {
  const result = await getDb().query(sql, params)
  return result.rows as T[]
}

/**
 * Executa insert/update/delete.
 * No Postgres não existe `lastInsertRowid` — inserts devem terminar com
 * `RETURNING id` para expor o id criado (que chega em `rows[0].id`).
 */
export async function run(
  sql: string,
  params: SqlValue[] = [],
): Promise<{ lastInsertRowid: number; changes: number }> {
  const result = await getDb().query(sql, params)
  const rowCount = result.rowCount ?? 0
  const id = result.rows?.[0]?.id
  return {
    lastInsertRowid: id != null ? Number(id) : 0,
    changes: rowCount,
  }
}
