
-- Buckets privados usados pelo backend para documentos e fotos de pets.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('petphotos', 'petphotos', false),
  ('docs', 'docs', false)
ON CONFLICT (id) DO UPDATE SET public = false;

--  CREDENCIAIS DEMO (senhas com hash scrypt — o formato exato que o app
--  valida em server/auth.ts):
--    Cliente:  cliente@demo.com  /  Demo@1234
--    Admin:    admin@clinica.com /  Admin@1234
--
--  OBS: os buckets `petphotos` e `docs` (Storage) precisam existir para
--  upload de foto de pet / documentos. Criar pelo SQL Editor:
--    insert into storage.buckets (id, name, public) values
--      ('petphotos', 'petphotos', false),
--      ('docs', 'docs', false);
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CLIENTE DEMO + ADMIN DEMO
-- ---------------------------------------------------------------------

-- Cliente (usuário + perfil)
INSERT INTO users (email, password_hash)
SELECT 'cliente@demo.com',
       'scrypt$16384$8$1$4ca289576d83976eda952c20eb29813e$c100aba01749b1416fb23e0fdd54571821111ddf737d96bf72baf77522d8bd0a254c0c743f2339fa9b248cd3804a46f9ec32e6fcabf48a4360d92a58887579e4'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'cliente@demo.com');

INSERT INTO profiles (user_id, full_name, cpf, phone, birth_date, address)
SELECT u.id, 'Cliente Demonstração', '123.456.789-00', '(16) 98888-7777', '1990-05-14', 'Rua Exemplo, 100 — Guariba-SP'
FROM users u WHERE u.email = 'cliente@demo.com'
  AND NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = u.id);

-- Admin (superadmin)
INSERT INTO admin_users (name, email, password_hash, role)
SELECT 'Cássia Carvalho',
       'admin@clinica.com',
       'scrypt$16384$8$1$104725a85148929b8668fc3f902f6af2$b9258a78bf1ad113761de16f3fe47b07ce0b3d9619e99b2f8b2df9591f3f62ce4f7c426273d8f7961f1592eef2ae5086846c58c81f11de3018c4af4c2ca06f55',
       'superadmin'
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE email = 'admin@clinica.com');

    -- Garante que as credenciais demo continuam utilizáveis após reexecuções.
    -- Estas contas são públicas por definição e devem ser trocadas em produção.
    UPDATE users
    SET password_hash = 'scrypt$16384$8$1$4ca289576d83976eda952c20eb29813e$c100aba01749b1416fb23e0fdd54571821111ddf737d96bf72baf77522d8bd0a254c0c743f2339fa9b248cd3804a46f9ec32e6fcabf48a4360d92a58887579e4',
      is_active = true,
      updated_at = now()
    WHERE email = 'cliente@demo.com';

    UPDATE admin_users
    SET password_hash = 'scrypt$16384$8$1$104725a85148929b8668fc3f902f6af2$b9258a78bf1ad113761de16f3fe47b07ce0b3d9619e99b2f8b2df9591f3f62ce4f7c426273d8f7961f1592eef2ae5086846c58c81f11de3018c4af4c2ca06f55',
      role = 'superadmin',
      is_active = true,
      updated_at = now()
    WHERE email = 'admin@clinica.com';

-- ---------------------------------------------------------------------
-- 2. PETS
-- ---------------------------------------------------------------------

INSERT INTO pets (owner_id, name, species, breed, sex, birth_date, weight_kg, microchip, notes)
SELECT u.id, 'Thor', 'cachorro', 'Golden Retriever', 'macho', '2021-03-12', 31.5, '982-0004-12345', 'Pet de demonstração. Adora correr.'
FROM users u WHERE u.email = 'cliente@demo.com'
  AND NOT EXISTS (SELECT 1 FROM pets WHERE owner_id = u.id AND name = 'Thor');

INSERT INTO pets (owner_id, name, species, breed, sex, birth_date, weight_kg, microchip, notes)
SELECT u.id, 'Luna', 'gato', 'Siamês', 'femea', '2023-07-02', 4.2, NULL, 'Pet de demonstração. Gata tranquila.'
FROM users u WHERE u.email = 'cliente@demo.com'
  AND NOT EXISTS (SELECT 1 FROM pets WHERE owner_id = u.id AND name = 'Luna');

-- ---------------------------------------------------------------------
-- 3. CONSULTAS (appointments)
-- ---------------------------------------------------------------------

-- Thor: check-up anual (realizada, com diagnóstico + prescrição vinculada)
INSERT INTO appointments (pet_id, client_id, vet_name, type, scheduled_at, status, summary, diagnosis, notes, is_demo, created_by_admin)
SELECT p.id, u.id, 'Dr.ª Cássia Carvalho', 'consulta', '2026-07-15 09:30:00', 'realizada',
       'Check-up anual completo. Exame físico, pesagem e avaliação de mobilidade.',
       'Paciente saudável, dentro do peso ideal.',
       'Manter rotina de exercícios e dieta atual.',
       true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM appointments WHERE pet_id = p.id AND scheduled_at = '2026-07-15 09:30:00');

-- Thor: urgência (realizada)
INSERT INTO appointments (pet_id, client_id, vet_name, type, scheduled_at, status, summary, diagnosis, notes, is_demo, created_by_admin)
SELECT p.id, u.id, 'Dr.ª Cássia Carvalho', 'urgencia', '2026-08-02 14:10:00', 'realizada',
       'Atendimento de urgência após episódio de vômito.',
       'Gastrite leve — reação alimentar.',
       'Prescrita dieta leve por 3 dias.',
       true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM appointments WHERE pet_id = p.id AND scheduled_at = '2026-08-02 14:10:00');

-- Thor: retorno agendado (futuro)
INSERT INTO appointments (pet_id, client_id, vet_name, type, scheduled_at, status, is_demo, created_by_admin)
SELECT p.id, u.id, 'Dr.ª Cássia Carvalho', 'retorno', '2026-09-08 10:00:00', 'agendada', true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM appointments WHERE pet_id = p.id AND scheduled_at = '2026-09-08 10:00:00');

-- Luna: consulta de rotina (realizada)
INSERT INTO appointments (pet_id, client_id, vet_name, type, scheduled_at, status, summary, diagnosis, notes, is_demo, created_by_admin)
SELECT p.id, u.id, 'Dr.ª Cássia Carvalho', 'consulta', '2026-07-20 16:00:00', 'realizada',
       'Consulta de rotina. Avaliação geral, vacinação em dia.',
       'Saudável.',
       'Manter prevenção contra vermes.',
       true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Luna'
  AND NOT EXISTS (SELECT 1 FROM appointments WHERE pet_id = p.id AND scheduled_at = '2026-07-20 16:00:00');

-- ---------------------------------------------------------------------
-- 4. REGISTROS MÉDICOS (timeline do pet)
-- ---------------------------------------------------------------------

-- Thor: registros
INSERT INTO medical_records (pet_id, vet_name, record_type, title, description, is_demo)
SELECT p.id, 'Dr.ª Cássia Carvalho', 'consulta', 'Check-up anual', 'Exame físico completo. Físico geral normal.', true
FROM pets p WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM medical_records WHERE pet_id = p.id AND title = 'Check-up anual');

INSERT INTO medical_records (pet_id, vet_name, record_type, title, description, is_demo)
SELECT p.id, 'Dr.ª Cássia Carvalho', 'vacina', 'V10 (anual)', 'Aplicada dose de reforço da vacina V10.', true
FROM pets p WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM medical_records WHERE pet_id = p.id AND title = 'V10 (anual)');

INSERT INTO medical_records (pet_id, vet_name, record_type, title, description, is_demo)
SELECT p.id, 'Dr.ª Cássia Carvalho', 'exame', 'Hemograma completo', 'Resultados dentro do padrão de referência.', true
FROM pets p WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM medical_records WHERE pet_id = p.id AND title = 'Hemograma completo');

-- Luna: registros
INSERT INTO medical_records (pet_id, vet_name, record_type, title, description, is_demo)
SELECT p.id, 'Dr.ª Cássia Carvalho', 'consulta', 'Consulta de rotina', 'Avaliação geral sem alterações.', true
FROM pets p WHERE p.name = 'Luna'
  AND NOT EXISTS (SELECT 1 FROM medical_records WHERE pet_id = p.id AND title = 'Consulta de rotina');

INSERT INTO medical_records (pet_id, vet_name, record_type, title, description, is_demo)
SELECT p.id, 'Dr.ª Cássia Carvalho', 'vacina', 'V4 (felina)', 'Aplicada dose de reforço da vacina V4.', true
FROM pets p WHERE p.name = 'Luna'
  AND NOT EXISTS (SELECT 1 FROM medical_records WHERE pet_id = p.id AND title = 'V4 (felina)');

-- ---------------------------------------------------------------------
-- 5. RECEITAS (prescriptions) + ITENS
-- ---------------------------------------------------------------------

-- Thor: receita de Omeprazol (da urgência) + item
INSERT INTO prescriptions (pet_id, client_id, vet_name, issued_at, valid_until, instructions, is_demo, created_by_admin)
SELECT p.id, u.id, 'Dr.ª Cássia Carvalho', '2026-08-02 14:30:00', '2026-09-02', 'Administrar conforme orientação. Em caso de dúvida, contatar a clínica.', true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM prescriptions WHERE pet_id = p.id AND issued_at = '2026-08-02 14:30:00');

INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, notes)
SELECT pr.id, 'Omeprazol 20mg', '1 comprimido', '1x ao dia', '3 dias', 'Antes da alimentação.'
FROM prescriptions pr WHERE pr.issued_at = '2026-08-02 14:30:00'
  AND NOT EXISTS (SELECT 1 FROM prescription_items WHERE prescription_id = pr.id AND medication_name = 'Omeprazol 20mg');

INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, notes)
SELECT pr.id, 'Probiotico pet', '1 sachê', '2x ao dia', '5 dias', 'Misturar à ração.'
FROM prescriptions pr WHERE pr.issued_at = '2026-08-02 14:30:00'
  AND NOT EXISTS (SELECT 1 FROM prescription_items WHERE prescription_id = pr.id AND medication_name = 'Probiotico pet');

-- Thor: receita de vermífugo (check-up) + item
INSERT INTO prescriptions (pet_id, client_id, vet_name, issued_at, valid_until, instructions, is_demo, created_by_admin)
SELECT p.id, u.id, 'Dr.ª Cássia Carvalho', '2026-07-15 10:00:00', '2026-09-15', 'Repetir após 30 dias.', true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM prescriptions WHERE pet_id = p.id AND issued_at = '2026-07-15 10:00:00');

INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, notes)
SELECT pr.id, 'Vermífugo (praziquantel)', '1 comprimido', 'dose única', '1 dia', 'Repetir em 30 dias.'
FROM prescriptions pr WHERE pr.issued_at = '2026-07-15 10:00:00'
  AND NOT EXISTS (SELECT 1 FROM prescription_items WHERE prescription_id = pr.id AND medication_name = 'Vermífugo (praziquantel)');

-- Luna: receita de suplemento + item
INSERT INTO prescriptions (pet_id, client_id, vet_name, issued_at, valid_until, instructions, is_demo, created_by_admin)
SELECT p.id, u.id, 'Dr.ª Cássia Carvalho', '2026-07-20 16:30:00', '2026-09-20', 'Acompanhar com ração premium.', true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Luna'
  AND NOT EXISTS (SELECT 1 FROM prescriptions WHERE pet_id = p.id AND issued_at = '2026-07-20 16:30:00');

INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, notes)
SELECT pr.id, 'Suplemento vitamínico felino', '1/2 comprimido', '1x ao dia', '30 dias', 'Misturar à ração.'
FROM prescriptions pr WHERE pr.issued_at = '2026-07-20 16:30:00'
  AND NOT EXISTS (SELECT 1 FROM prescription_items WHERE prescription_id = pr.id AND medication_name = 'Suplemento vitamínico felino');

-- ---------------------------------------------------------------------
-- 6. EXAMES
-- ---------------------------------------------------------------------

INSERT INTO exams (pet_id, client_id, name, category, status, result_date, vet_name, notes, is_demo, created_by_admin)
SELECT p.id, u.id, 'Hemograma completo', 'laboratorial', 'concluido', '2026-07-15', 'Dr.ª Cássia Carvalho', 'Sem alterações relevantes.', true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM exams WHERE pet_id = p.id AND name = 'Hemograma completo');

INSERT INTO exams (pet_id, client_id, name, category, status, result_date, vet_name, notes, is_demo, created_by_admin)
SELECT p.id, u.id, 'Bioquímico (renal)', 'laboratorial', 'concluido', '2026-07-15', 'Dr.ª Cássia Carvalho', 'Função renal normal.', true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM exams WHERE pet_id = p.id AND name = 'Bioquímico (renal)');

INSERT INTO exams (pet_id, client_id, name, category, status, result_date, vet_name, notes, is_demo, created_by_admin)
SELECT p.id, u.id, 'Ultrassonografia abdominal', 'imagem', 'concluido', '2026-08-02', 'Dr.ª Cássia Carvalho', 'Sem alterações de órgãos abdominais.', true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM exams WHERE pet_id = p.id AND name = 'Ultrassonografia abdominal');

INSERT INTO exams (pet_id, client_id, name, category, status, result_date, vet_name, notes, is_demo, created_by_admin)
SELECT p.id, u.id, 'Hemograma felino', 'laboratorial', 'pendente', NULL, 'Dr.ª Cássia Carvalho', 'Aguardando resultado do laboratório.', true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Luna'
  AND NOT EXISTS (SELECT 1 FROM exams WHERE pet_id = p.id AND name = 'Hemograma felino');

-- ---------------------------------------------------------------------
-- 7. VACINAS
-- ---------------------------------------------------------------------

INSERT INTO vaccinations (pet_id, client_id, name, applied_at, next_dose_at, lot, clinic_name, vet_name, is_demo, created_by_admin)
SELECT p.id, u.id, 'V10 (anual)', '2025-08-10', '2026-08-10', 'LOT-A100', 'Clínica Dr.ª Cássia Carvalho', 'Dr.ª Cássia Carvalho', true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM vaccinations WHERE pet_id = p.id AND name = 'V10 (anual)');

INSERT INTO vaccinations (pet_id, client_id, name, applied_at, next_dose_at, lot, clinic_name, vet_name, is_demo, created_by_admin)
SELECT p.id, u.id, 'Antirrábica', '2025-08-10', '2026-08-10', 'LOT-R45', 'Clínica Dr.ª Cássia Carvalho', 'Dr.ª Cássia Carvalho', true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM vaccinations WHERE pet_id = p.id AND name = 'Antirrábica');

INSERT INTO vaccinations (pet_id, client_id, name, applied_at, next_dose_at, lot, clinic_name, vet_name, is_demo, created_by_admin)
SELECT p.id, u.id, 'V4 (felina)', '2025-09-20', '2026-09-20', 'LOT-F77', 'Clínica Dr.ª Cássia Carvalho', 'Dr.ª Cássia Carvalho', true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Luna'
  AND NOT EXISTS (SELECT 1 FROM vaccinations WHERE pet_id = p.id AND name = 'V4 (felina)');

INSERT INTO vaccinations (pet_id, client_id, name, applied_at, next_dose_at, lot, clinic_name, vet_name, is_demo, created_by_admin)
SELECT p.id, u.id, 'Antirrábica felina', '2025-09-20', '2026-09-20', 'LOT-R47', 'Clínica Dr.ª Cássia Carvalho', 'Dr.ª Cássia Carvalho', true, true
FROM pets p JOIN users u ON u.email = 'cliente@demo.com' WHERE p.name = 'Luna'
  AND NOT EXISTS (SELECT 1 FROM vaccinations WHERE pet_id = p.id AND name = 'Antirrábica felina');

-- ---------------------------------------------------------------------
-- 8. DOCUMENTOS (arquivos privados)
--   ATENÇÃO: os file_path abaixo são placeholders. O arquivo real não
--   existe no Storage do Supabase — abrir causará 404. is_available=false
--   impede o cliente de ver o documento quebrado; o admin pode trocar
--   pelo upload real depois. Para gerar um link funcional, use o upload
--   do painel admin (o app envia para o bucket 'docs').
-- ---------------------------------------------------------------------

INSERT INTO documents (client_id, pet_id, title, type, file_name, file_path, mime, is_available, uploaded_by_admin, is_demo)
SELECT u.id, p.id, 'Receita Omeprazol', 'receita', 'receita-omeprazol.pdf', 'docs/seed-placeholder-receita.pdf', 'application/pdf', false, true, true
FROM users u JOIN pets p ON p.owner_id = u.id WHERE u.email = 'cliente@demo.com' AND p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM documents WHERE title = 'Receita Omeprazol');

INSERT INTO documents (client_id, pet_id, title, type, file_name, file_path, mime, is_available, uploaded_by_admin, is_demo)
SELECT u.id, p.id, 'Resultado Hemograma', 'exame', 'hemograma-thor.pdf', 'docs/seed-placeholder-hemograma.pdf', 'application/pdf', false, true, true
FROM users u JOIN pets p ON p.owner_id = u.id WHERE u.email = 'cliente@demo.com' AND p.name = 'Thor'
  AND NOT EXISTS (SELECT 1 FROM documents WHERE title = 'Resultado Hemograma');

INSERT INTO documents (client_id, pet_id, title, type, file_name, file_path, mime, is_available, uploaded_by_admin, is_demo)
SELECT u.id, p.id, 'Atestado de saúde', 'atestado', 'atestado-luna.pdf', 'docs/seed-placeholder-atestado.pdf', 'application/pdf', false, true, true
FROM users u JOIN pets p ON p.owner_id = u.id WHERE u.email = 'cliente@demo.com' AND p.name = 'Luna'
  AND NOT EXISTS (SELECT 1 FROM documents WHERE title = 'Atestado de saúde');

-- ---------------------------------------------------------------------
-- 9. NOTIFICAÇÕES
-- ---------------------------------------------------------------------

INSERT INTO notifications (user_id, title, body, type)
SELECT u.id, 'Boas-vindas', 'Bem-vindo à sua área do cliente! Aqui você acompanha tudo do seu pet.', 'info'
FROM users u WHERE u.email = 'cliente@demo.com'
  AND NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = u.id AND title = 'Boas-vindas');

INSERT INTO notifications (user_id, title, body, type)
SELECT u.id, 'Retorno agendado', 'Thor tem retorno agendado em 2026-09-08.', 'agendamento'
FROM users u WHERE u.email = 'cliente@demo.com'
  AND NOT EXISTS (SELECT 1 FROM notifications WHERE user_id = u.id AND title = 'Retorno agendado');

-- ---------------------------------------------------------------------
-- 10. AUDITORIA (auth_logs)
-- ---------------------------------------------------------------------

-- (auth_logs não tem unique constraint; o guard por action+details evita
-- duplicar em re-runs. O target_id 0 + details 'Seed:...' identifica a origem.)
INSERT INTO auth_logs (admin_user_id, action, target_type, target_id, details)
SELECT a.id, 'criar_documento', 'document', 0, 'Seed: documento de demonstração criado.'
FROM admin_users a WHERE a.email = 'admin@clinica.com'
  AND NOT EXISTS (SELECT 1 FROM auth_logs WHERE action = 'criar_documento' AND details = 'Seed: documento de demonstração criado.');

INSERT INTO auth_logs (admin_user_id, action, target_type, target_id, details)
SELECT a.id, 'editar_foto', 'site', 0, 'Seed: foto do site atualizada.'
FROM admin_users a WHERE a.email = 'admin@clinica.com'
  AND NOT EXISTS (SELECT 1 FROM auth_logs WHERE action = 'editar_foto' AND details = 'Seed: foto do site atualizada.');

-- ---------------------------------------------------------------------
-- 11. (Opcional) SESSÕES PRÉ-CRIADAS
--   Por segurança, este seed NÃO cria sessões com tokens fixos. O login
--   demo é feito pela senha (cliente@demo.com / Demo@1234), que gera a
--   sessão no banco normalmente. Se quiser sessões pré-criadas para
--   demo sem senha, descomente o bloco abaixo — mas note que tokens
--   hardcoded são uma porta de entrada para quem os conhecer.
--
--   -- Cliente
--   INSERT INTO sessions (token_hash, user_id, user_role, expires_at)
--   SELECT encode(digest('demo-client-token-2026-01', 'sha256'), 'hex'),
--          u.id, 'client', now() + interval '30 days'
--   FROM users u WHERE u.email = 'cliente@demo.com'
--   ON CONFLICT (token_hash) DO NOTHING;
--
--   -- Admin
--   INSERT INTO sessions (token_hash, user_id, user_role, expires_at)
--   SELECT encode(digest('demo-admin-token-2026-01', 'sha256'), 'hex'),
--          a.id, 'admin', now() + interval '30 days'
--   FROM admin_users a WHERE a.email = 'admin@clinica.com'
--   ON CONFLICT (token_hash) DO NOTHING;
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 12. FOTOS DO SITE (site_settings)
--   Keys 'photo:<nome>' — os nomes que server/routes/photos.ts reconhece.
--   Valores: placeholder 1x1 (cor de fundo da marca). O admin pode
--   substituir pelo upload no painel (Fotos). Se deixar NULL, o app usa
--   o fallback público de /public/photos.
-- ---------------------------------------------------------------------

INSERT INTO site_settings (key, value) VALUES
  ('photo:fachada',      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  ('photo:fachada-2',    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  ('photo:equipe',       'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  ('photo:equipe-2',     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  ('photo:atendimento',  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  ('photo:animais',      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  ('photo:ambiente',     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  ('photo:doutora',      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  ('photo:recepcao',     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  ('photo:pet-thor',     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  ('photo:pet-luna',     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
ON CONFLICT (key) DO NOTHING;

-- =====================================================================
--  RESUMO (opcional)
-- =====================================================================
SELECT 'users'      AS tabela, count(*) AS linhas FROM users
UNION ALL SELECT 'admin_users', count(*) FROM admin_users
UNION ALL SELECT 'pets', count(*) FROM pets
UNION ALL SELECT 'appointments', count(*) FROM appointments
UNION ALL SELECT 'medical_records', count(*) FROM medical_records
UNION ALL SELECT 'prescriptions', count(*) FROM prescriptions
UNION ALL SELECT 'prescription_items', count(*) FROM prescription_items
UNION ALL SELECT 'exams', count(*) FROM exams
UNION ALL SELECT 'vaccinations', count(*) FROM vaccinations
UNION ALL SELECT 'documents', count(*) FROM documents
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'sessions', count(*) FROM sessions
UNION ALL SELECT 'site_settings', count(*) FROM site_settings;
