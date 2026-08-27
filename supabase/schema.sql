-- Schema do banco — Clínica Veterinária Dr.ª Cássia Carvalho
-- PostgreSQL (Supabase). Executar no SQL Editor do Supabase (ou `psql`).
-- Começar limpo: nada é migrado do SQLite local (data/clinica.db).

-- Extensão útil para busca case-insensitive em e-mails.
create extension if not exists citext;

-- Clientes (usuários finais do portal)
create table if not exists users (
  id            bigint generated always as identity primary key,
  email         citext not null unique,
  password_hash text not null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Perfis de clientes
create table if not exists profiles (
  user_id     bigint primary key references users(id) on delete cascade,
  full_name   text not null,
  cpf         text,
  phone       text,
  birth_date  text,
  address     text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Administradores da clínica (login separado)
create table if not exists admin_users (
  id            bigint generated always as identity primary key,
  name          text not null,
  email         citext not null unique,
  password_hash text not null,
  role          text not null default 'admin' check (role in ('admin', 'superadmin')),
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Pets (um cliente possui vários)
create table if not exists pets (
  id          bigint generated always as identity primary key,
  owner_id    bigint not null references users(id) on delete cascade,
  name        text not null,
  species     text not null default 'cachorro',
  breed       text,
  sex         text check (sex in ('macho', 'femea', 'nao-informado')),
  birth_date  text,
  weight_kg   double precision,
  microchip   text,
  photo_url   text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Consultas
create table if not exists appointments (
  id               bigint generated always as identity primary key,
  pet_id           bigint not null references pets(id) on delete cascade,
  client_id        bigint not null references users(id) on delete cascade,
  vet_name         text,
  type             text not null default 'consulta',
  scheduled_at     text,
  status           text not null default 'realizada' check (status in ('agendada', 'realizada', 'cancelada')),
  summary          text,
  diagnosis        text,
  notes            text,
  is_demo          boolean not null default false,
  created_by_admin boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Registros médicos (base da timeline do pet)
create table if not exists medical_records (
  id             bigint generated always as identity primary key,
  pet_id         bigint not null references pets(id) on delete cascade,
  appointment_id bigint references appointments(id) on delete set null,
  vet_name       text,
  record_type    text not null default 'consulta',
  title          text not null,
  description    text,
  is_demo        boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Receitas
create table if not exists prescriptions (
  id               bigint generated always as identity primary key,
  pet_id           bigint not null references pets(id) on delete cascade,
  client_id        bigint not null references users(id) on delete cascade,
  appointment_id   bigint references appointments(id) on delete set null,
  vet_name         text,
  -- issued_at em TEXT no formato 'YYYY-MM-DD HH:MM:SS'. Default now() para o
  -- caso de a rota de criação omitir (admin deixa 'Emitida em' em branco).
  issued_at        text not null default to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
  valid_until      text,
  instructions     text,
  is_demo          boolean not null default false,
  created_by_admin boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists prescription_items (
  id               bigint generated always as identity primary key,
  prescription_id  bigint not null references prescriptions(id) on delete cascade,
  medication_name  text not null,
  dosage           text,
  frequency        text,
  duration         text,
  notes            text
);

-- Exames
create table if not exists exams (
  id               bigint generated always as identity primary key,
  pet_id           bigint not null references pets(id) on delete cascade,
  client_id        bigint not null references users(id) on delete cascade,
  appointment_id   bigint references appointments(id) on delete set null,
  name             text not null,
  category         text not null default 'laboratorial' check (category in ('laboratorial', 'imagem', 'outros')),
  status           text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluido')),
  result_date      text,
  vet_name         text,
  notes            text,
  is_demo          boolean not null default false,
  created_by_admin boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Vacinas
create table if not exists vaccinations (
  id               bigint generated always as identity primary key,
  pet_id           bigint not null references pets(id) on delete cascade,
  client_id        bigint not null references users(id) on delete cascade,
  name             text not null,
  applied_at       text,
  next_dose_at     text,
  lot              text,
  clinic_name      text,
  vet_name         text,
  is_demo          boolean not null default false,
  created_by_admin boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Documentos (arquivos privados; is_available controla acesso ao cliente)
create table if not exists documents (
  id               bigint generated always as identity primary key,
  client_id        bigint references users(id) on delete cascade,
  pet_id           bigint references pets(id) on delete set null,
  appointment_id   bigint references appointments(id) on delete set null,
  title            text not null,
  type             text not null default 'veterinario' check (type in ('receita', 'exame', 'atestado', 'comprovante', 'veterinario')),
  file_name        text not null,
  file_path        text not null,
  mime             text not null default 'application/pdf',
  is_available     boolean not null default true,
  uploaded_by_admin boolean not null default false,
  is_demo          boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Notificações do cliente
create table if not exists notifications (
  id         bigint generated always as identity primary key,
  user_id    bigint not null references users(id) on delete cascade,
  title      text not null,
  body       text,
  type       text not null default 'info',
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);

-- Sessões (somente hash do token)
create table if not exists sessions (
  id         bigint generated always as identity primary key,
  token_hash text not null unique,
  user_id    bigint not null,
  user_role  text not null check (user_role in ('client', 'admin')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

-- Tokens de recuperação de senha (somente hash)
create table if not exists password_reset_tokens (
  id         bigint generated always as identity primary key,
  user_id    bigint not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used       boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auditoria de ações administrativas
create table if not exists auth_logs (
  id            bigint generated always as identity primary key,
  admin_user_id bigint references admin_users(id) on delete set null,
  action        text not null,
  target_type   text,
  target_id     bigint,
  details       text,
  created_at    timestamptz not null default now()
);

-- Configurações do site (ex.: fotos enviadas pelo admin)
create table if not exists site_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);

-- Rate limiting de login (janela por e-mail + IP — compartilhado entre
-- as Vercel Functions, ao contrário do Map em memória do SQLite)
create table if not exists login_attempts (
  id           bigint generated always as identity primary key,
  key          text not null,
  failed_at    timestamptz not null default now(),
  locked_until timestamptz
);
create index if not exists idx_login_attempts_key on login_attempts(key);

-- Índices de consulta frequentes
create index if not exists idx_pets_owner on pets(owner_id);
create index if not exists idx_appointments_client on appointments(client_id);
create index if not exists idx_appointments_pet on appointments(pet_id);
create index if not exists idx_medical_records_pet on medical_records(pet_id);
create index if not exists idx_prescriptions_client on prescriptions(client_id);
create index if not exists idx_prescriptions_pet on prescriptions(pet_id);
create index if not exists idx_exams_client on exams(client_id);
create index if not exists idx_exams_pet on exams(pet_id);
create index if not exists idx_vaccinations_client on vaccinations(client_id);
create index if not exists idx_vaccinations_pet on vaccinations(pet_id);
create index if not exists idx_documents_client on documents(client_id);
create index if not exists idx_notifications_user on notifications(user_id);
