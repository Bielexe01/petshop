import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'data')

export function dbPath(): string {
  return process.env.DB_PATH ?? join(DATA_DIR, 'clinica.db')
}

let db: DatabaseSync | null = null

/**
 * Abre (e inicializa) o banco SQLite. Chamado sob demanda e cacheado.
 * Todas as consultas usam prepared statements (anti SQL injection).
 */
export function getDb(): DatabaseSync {
  if (db) return db

  mkdirSync(dirname(dbPath()), { recursive: true })
  const instance = new DatabaseSync(dbPath())
  instance.exec('PRAGMA journal_mode = WAL;')
  instance.exec('PRAGMA foreign_keys = ON;')

  // Migrations simples por versão de schema
  migrate(instance)

  db = instance
  return db
}

const MIGRATIONS: Array<{ version: number; name: string; run: (db: DatabaseSync) => void }> = [
  {
    version: 1,
    name: 'schema-inicial',
    run: (d) => {
      d.exec(readFileSync(join(__dirname, 'schema.sql'), 'utf8'))
    },
  },
  {
    version: 2,
    name: 'colunas-updated_at',
    // Adiciona updated_at às tabelas que passaram a usar o campo no código,
    // mantendo bancos existentes alinhados com o schema.sql atual.
    run: (d) => {
      const target = ['prescriptions', 'exams', 'vaccinations', 'documents']
      for (const table of target) {
        const has = d
          .prepare(`SELECT 1 FROM pragma_table_info(?) WHERE name = 'updated_at'`)
          .all(table)
        if (has.length === 0) {
          // SQLite exige default CONSTANTE no ADD COLUMN; usamos '' e
          // corrigimos as linhas existentes com datetime('now').
          d.exec(`ALTER TABLE ${table} ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`)
          d.exec(`UPDATE ${table} SET updated_at = datetime('now') WHERE updated_at = ''`)
        }
      }
    },
  },
  {
    version: 3,
    name: 'fotos-administráveis',
    // Permite que o admin troque as fotos do site via upload (armazenadas
    // como base64 em site_settings — texto pequeno, ~150–400 KB por foto).
    run: (d) => {
      d.exec(`
        CREATE TABLE IF NOT EXISTS site_settings (
          key        TEXT PRIMARY KEY,
          value      TEXT,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)
    },
  },
]

function migrate(instance: DatabaseSync) {
  instance.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  const applied = new Set(
    (instance.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>).map(
      (r) => r.version,
    ),
  )

  for (const m of MIGRATIONS) {
    if (applied.has(m.version)) continue
    const tx = instance.prepare('BEGIN')
    const commit = instance.prepare('COMMIT')
    tx.run()
    try {
      m.run(instance)
      instance.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(m.version, m.name)
      commit.run()
    } catch (err) {
      instance.prepare('ROLLBACK').run()
      throw err
    }
  }
}

/** Fecha o banco (usado em testes/restart). */
export function closeDb() {
  db?.close()
  db = null
}

export interface Row {
  [key: string]: unknown
}

type SqlValue = string | number | bigint | null | Uint8Array

/** Busca a primeira linha ou null. */
export function getOne<T = Row>(sql: string, params: Array<string | number | bigint | null | Uint8Array> = []): T | null {
  const stmt = getDb().prepare(sql)
  return (stmt.get(...(params as SqlValue[])) as T | undefined) ?? null
}

/** Busca todas as linhas. */
export function getAll<T = Row>(sql: string, params: Array<string | number | bigint | null | Uint8Array> = []): T[] {
  const stmt = getDb().prepare(sql)
  return stmt.all(...(params as SqlValue[])) as T[]
}

/** Executa insert/update/delete e retorna o lastInsertRowid. */
export function run(sql: string, params: Array<string | number | bigint | null | Uint8Array> = []): { lastInsertRowid: number; changes: number } {
  const stmt = getDb().prepare(sql)
  const result = stmt.run(...(params as SqlValue[]))
  return { lastInsertRowid: Number(result.lastInsertRowid), changes: Number(result.changes) }
}

/** Serializa uma data ISO para formato SQLite datetime. */
export function toDbIso(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

export { existsSync }
