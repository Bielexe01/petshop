-- ---------------------------------------------------------------------
-- Papéis customizados + acesso por tela (RBAC) — Clínica Dr.ª Cássia
-- Executar no SQL Editor do Supabase (idempotente — pode rodar de novo).
--
-- Cria a tabela `admin_roles` (papel = conjunto de telas) e adiciona a
-- coluna `role_id` em `admin_users`. Pré-cria 3 papéis de exemplo.
-- O superadmin SEMPRE tem acesso total, independente de papel.
-- ---------------------------------------------------------------------

create table if not exists admin_roles (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  description text,
  -- Lista de telas: ["dashboard","clientes","pets","consultas","receitas",
  --                  "exames","vacinas","documentos","fotos","auditoria"]
  -- Papéis NUNCA concedem 'funcionarios'/'papeis' (são superadmin-only).
  screens     jsonb not null default '[]'::jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table admin_users add column if not exists role_id bigint references admin_roles(id) on delete set null;

-- Papéis de exemplo (ajustáveis pela Dra. — nunca removíveis)
insert into admin_roles (name, description, screens) values
  ('Recepcionista', 'Atendimento e agendamento: gerencia clientes, pets e consultas.', '["dashboard","clientes","pets","consultas"]'),
  ('Veterinário', 'Clínica: consultas, receitas, exames e vacinas.', '["dashboard","consultas","receitas","exames","vacinas"]'),
  ('Financeiro', 'Financeiro: receitas e documentos.', '["dashboard","receitas","documentos"]')
on conflict (name) do nothing;
