-- Schema do banco — Clínica Veterinária Dr.ª Cássia Carvalho
-- SQLite (node:sqlite). Todos os relacionamentos e constraints de integridade.

PRAGMA foreign_keys = ON;

-- Clientes (usuários finais do portal)
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Perfis de clientes
CREATE TABLE IF NOT EXISTS profiles (
  user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  cpf         TEXT,
  phone       TEXT,
  birth_date  TEXT,
  address     TEXT,
  avatar_url  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Administradores da clínica (login separado)
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Pets (um cliente possui vários)
CREATE TABLE IF NOT EXISTS pets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  species     TEXT NOT NULL DEFAULT 'cachorro',
  breed       TEXT,
  sex         TEXT CHECK (sex IN ('macho', 'femea', 'nao-informado')),
  birth_date  TEXT,
  weight_kg   REAL,
  microchip   TEXT,
  photo_url   TEXT,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Consultas
CREATE TABLE IF NOT EXISTS appointments (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id           INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  client_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vet_name         TEXT,
  type             TEXT NOT NULL DEFAULT 'consulta',
  scheduled_at     TEXT,
  status           TEXT NOT NULL DEFAULT 'realizada' CHECK (status IN ('agendada', 'realizada', 'cancelada')),
  summary          TEXT,
  diagnosis        TEXT,
  notes            TEXT,
  is_demo          INTEGER NOT NULL DEFAULT 0,
  created_by_admin INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Registros médicos (base da timeline do pet)
CREATE TABLE IF NOT EXISTS medical_records (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id         INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  vet_name       TEXT,
  record_type    TEXT NOT NULL DEFAULT 'consulta',
  title          TEXT NOT NULL,
  description    TEXT,
  is_demo        INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Receitas
CREATE TABLE IF NOT EXISTS prescriptions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id         INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  client_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  vet_name       TEXT,
  issued_at      TEXT NOT NULL DEFAULT (datetime('now')),
  valid_until    TEXT,
  instructions   TEXT,
  is_demo        INTEGER NOT NULL DEFAULT 0,
  created_by_admin INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS prescription_items (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id  INTEGER NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_name  TEXT NOT NULL,
  dosage           TEXT,
  frequency        TEXT,
  duration         TEXT,
  notes            TEXT
);

-- Exames
CREATE TABLE IF NOT EXISTS exams (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id         INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  client_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'laboratorial' CHECK (category IN ('laboratorial', 'imagem', 'outros')),
  status         TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
  result_date    TEXT,
  vet_name       TEXT,
  notes          TEXT,
  is_demo        INTEGER NOT NULL DEFAULT 0,
  created_by_admin INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Vacinas
CREATE TABLE IF NOT EXISTS vaccinations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id           INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  client_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  applied_at       TEXT,
  next_dose_at     TEXT,
  lot              TEXT,
  clinic_name      TEXT,
  vet_name         TEXT,
  is_demo          INTEGER NOT NULL DEFAULT 0,
  created_by_admin INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Documentos (arquivos privados; is_available controla acesso ao cliente)
CREATE TABLE IF NOT EXISTS documents (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
  pet_id           INTEGER REFERENCES pets(id) ON DELETE SET NULL,
  appointment_id   INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'veterinario' CHECK (type IN ('receita', 'exame', 'atestado', 'comprovante', 'veterinario')),
  file_name        TEXT NOT NULL,
  file_path        TEXT NOT NULL,
  mime             TEXT NOT NULL DEFAULT 'application/pdf',
  is_available     INTEGER NOT NULL DEFAULT 1,
  uploaded_by_admin INTEGER NOT NULL DEFAULT 0,
  is_demo          INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Notificações do cliente
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT,
  type       TEXT NOT NULL DEFAULT 'info',
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sessões (somente hash do token)
CREATE TABLE IF NOT EXISTS sessions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id    INTEGER NOT NULL,
  user_role  TEXT NOT NULL CHECK (user_role IN ('client', 'admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, user_role);

-- Tokens de recuperação de senha (somente hash)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Auditoria de ações administrativas
CREATE TABLE IF NOT EXISTS auth_logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_user_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
  action       TEXT NOT NULL,
  target_type  TEXT,
  target_id    INTEGER,
  details      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Configurações do site (ex.: fotos enviadas pelo admin)
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índices de consulta frequentes
CREATE INDEX IF NOT EXISTS idx_pets_owner ON pets(owner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_pet ON appointments(pet_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_pet ON medical_records(pet_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_client ON prescriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_pet ON prescriptions(pet_id);
CREATE INDEX IF NOT EXISTS idx_exams_client ON exams(client_id);
CREATE INDEX IF NOT EXISTS idx_exams_pet ON exams(pet_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_client ON vaccinations(client_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_pet ON vaccinations(pet_id);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
