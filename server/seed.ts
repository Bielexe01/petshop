/* ────────────────────────────────────────────────────────────────────────
   Seed — dados de demonstração (claramente rotulados como demo).
   Uso: npm run seed  →  cria/atualiza usuários demo.

   Cliente:  cliente@demo.com  /  Demo@1234   (Thor e Luna + histórico)
   Admin:    admin@clinica.com /  Admin@1234
   ──────────────────────────────────────────────────────────────────────── */
import { getDb, run, getOne } from './db.ts'
import { hashPassword } from './auth.ts'

const DEMO = true

function today(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function ensureClient() {
  const existing = getOne<{ id: number }>('SELECT id FROM users WHERE email = ?', ['cliente@demo.com'])
  if (existing) return existing.id

  const { lastInsertRowid } = run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [
    'cliente@demo.com',
    hashPassword('Demo@1234'),
  ])
  run(
    'INSERT INTO profiles (user_id, full_name, cpf, phone, birth_date, address) VALUES (?, ?, ?, ?, ?, ?)',
    [lastInsertRowid, 'Cliente Demonstração', '123.456.789-00', '(16) 98888-7777', '1990-05-14', 'Rua Exemplo, 100 — Guariba-SP'],
  )
  return Number(lastInsertRowid)
}

function ensureAdmin() {
  const existing = getOne<{ id: number }>('SELECT id FROM admin_users WHERE email = ?', ['admin@clinica.com'])
  if (existing) return existing.id
  const { lastInsertRowid } = run('INSERT INTO admin_users (name, email, password_hash, role) VALUES (?, ?, ?, ?)', [
    'Cássia Carvalho',
    'admin@clinica.com',
    hashPassword('Admin@1234'),
    'superadmin',
  ])
  return Number(lastInsertRowid)
}

function ensurePet(clientId: number, name: string, species: string, breed: string, birthDate: string): number {
  const existing = getOne<{ id: number }>('SELECT id FROM pets WHERE owner_id = ? AND name = ?', [clientId, name])
  if (existing) return existing.id
  const { lastInsertRowid } = run(
    `INSERT INTO pets (owner_id, name, species, breed, sex, birth_date, weight_kg, microchip, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [clientId, name, species, breed, 'macho', birthDate, null, null, DEMO ? 'Pet de demonstração.' : null],
  )
  return Number(lastInsertRowid)
}

function runDemo() {
  const db = getDb()
  const clientId = ensureClient()
  ensureAdmin()

  const thor = ensurePet(clientId, 'Thor', 'cachorro', 'Golden Retriever', '2021-03-12')
  const luna = ensurePet(clientId, 'Luna', 'gato', 'Siamês', '2023-07-02')

  const count = db.prepare('SELECT COUNT(*) AS n FROM appointments').get() as { n: number }
  if (count.n > 0) {
    console.log('  ✓ Dados de demonstração já existem. (banco populado)')
    return
  }

  /* Consultas Thor */
  const appt1 = run(
    `INSERT INTO appointments (pet_id, client_id, vet_name, type, scheduled_at, status, summary, diagnosis, notes, is_demo, created_by_admin)
     VALUES (?, ?, 'Dr.ª Cássia Carvalho', 'consulta', '2026-07-15 09:30:00', 'realizada',
             'Check-up anual completo. Exame físico, pesagem e avaliação de mobilidade.',
             'Paciente saudável, dentro do peso ideal.',
             'Manter rotina de exercícios.', 1, 1)`,
    [thor, clientId],
  ).lastInsertRowid

  run(
    `INSERT INTO appointments (pet_id, client_id, vet_name, type, scheduled_at, status, summary, diagnosis, notes, is_demo, created_by_admin)
     VALUES (?, ?, 'Dr.ª Cássia Carvalho', 'urgencia', '2026-08-02 14:10:00', 'realizada',
             'Atendimento de urgência após episódio de vômito.',
             'Gastrite leve — reação alimentar.',
             'Prescrita dieta leve por 3 dias.', 1, 1)`,
    [thor, clientId],
  )

  run(
    `INSERT INTO appointments (pet_id, client_id, vet_name, type, scheduled_at, status, is_demo, created_by_admin)
     VALUES (?, ?, 'Dr.ª Cássia Carvalho', 'retorno', '${today(12)} 10:00:00', 'agendada', 1, 1)`,
    [thor, clientId],
  )

  /* Registros médicos */
  run(
    `INSERT INTO medical_records (pet_id, appointment_id, vet_name, record_type, title, description, is_demo)
     VALUES (?, ?, 'Dr.ª Cássia Carvalho', 'consulta', 'Check-up anual', 'Exame físico completo. Físico geral normal.', 1)`,
    [thor, appt1],
  )
  run(
    `INSERT INTO medical_records (pet_id, vet_name, record_type, title, description, is_demo)
     VALUES (?, 'Dr.ª Cássia Carvalho', 'vacina', 'V10 (anual)', 'Aplicada dose de reforço da vacina V10.', 1)`,
    [thor],
  )
  run(
    `INSERT INTO medical_records (pet_id, vet_name, record_type, title, description, is_demo)
     VALUES (?, 'Dr.ª Cássia Carvalho', 'exame', 'Hemograma completo', 'Resultados dentro do padrão de referência.', 1)`,
    [luna],
  )

  /* Receitas Thor */
  const rx1 = run(
    `INSERT INTO prescriptions (pet_id, client_id, vet_name, issued_at, valid_until, instructions, is_demo, created_by_admin)
     VALUES (?, ?, 'Dr.ª Cássia Carvalho', '2026-07-15 10:00:00', '2026-09-15', 'Administrar conforme orientação. Em caso de dúvida, contatar a clínica.', 1, 1)`,
    [thor, clientId],
  ).lastInsertRowid
  run(
    `INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, notes)
     VALUES (?, 'Omeprazol 20mg', '1 comprimido', '1x ao dia', '3 dias', 'Antes da alimentação.')`,
    [rx1],
  )
  run(
    `INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, notes)
     VALUES (?, 'Probiotico pet', '1 sachê', '2x ao dia', '5 dias', 'Misturar à ração.')`,
    [rx1],
  )

  /* Exames */
  run(
    `INSERT INTO exams (pet_id, client_id, name, category, status, result_date, vet_name, notes, is_demo, created_by_admin)
     VALUES (?, ?, 'Hemograma completo', 'laboratorial', 'concluido', '2026-07-15', 'Dr.ª Cássia Carvalho', 'Sem alterações relevantes.', 1, 1)`,
    [thor, clientId],
  )
  run(
    `INSERT INTO exams (pet_id, client_id, name, category, status, vet_name, is_demo, created_by_admin)
     VALUES (?, ?, 'Ultrassonografia abdominal', 'imagem', 'pendente', 'Dr.ª Cássia Carvalho', 1, 1)`,
    [luna, clientId],
  )

  /* Vacinas */
  run(
    `INSERT INTO vaccinations (pet_id, client_id, name, applied_at, next_dose_at, lot, clinic_name, vet_name, is_demo, created_by_admin)
     VALUES (?, ?, 'V10 (anual)', '2025-08-10', '2026-08-10', 'LOT-A100', 'Clínica Dr.ª Cássia Carvalho', 'Dr.ª Cássia Carvalho', 1, 1)`,
    [thor, clientId],
  )
  run(
    `INSERT INTO vaccinations (pet_id, client_id, name, applied_at, next_dose_at, lot, clinic_name, vet_name, is_demo, created_by_admin)
     VALUES (?, ?, 'Antirrábica', '2025-08-10', '2026-08-10', 'LOT-R45', 'Clínica Dr.ª Cássia Carvalho', 'Dr.ª Cássia Carvalho', 1, 1)`,
    [thor, clientId],
  )
  run(
    `INSERT INTO vaccinations (pet_id, client_id, name, applied_at, next_dose_at, lot, clinic_name, vet_name, is_demo, created_by_admin)
     VALUES (?, ?, 'V4 (felina)', '2025-09-20', '2026-09-20', 'LOT-F77', 'Clínica Dr.ª Cássia Carvalho', 'Dr.ª Cássia Carvalho', 1, 1)`,
    [luna, clientId],
  )

  /* Notificações */
  run(
    `INSERT INTO notifications (user_id, title, body, type) VALUES (?, 'Boas-vindas', 'Bem-vindo à sua área do cliente! Aqui você acompanha tudo do seu pet.', 'info')`,
    [clientId],
  )
  run(
    `INSERT INTO notifications (user_id, title, body, type) VALUES (?, 'Retorno agendado', 'Thor tem retorno agendado em ${today(12)}.', 'agendamento')`,
    [clientId],
  )

  console.log(`\n  ✅ Seed concluído (dados de demonstração)\n`)
  console.log(`  Cliente:  cliente@demo.com   /  Demo@1234`)
  console.log(`  Admin:    admin@clinica.com  /  Admin@1234\n`)
}

runDemo()
