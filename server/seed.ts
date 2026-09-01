/* ────────────────────────────────────────────────────────────────────────
   Seed — dados de demonstração (claramente rotulados como demo).
   Uso: npm run seed  →  cria/atualiza usuários demo no Postgres (Supabase).

   Cliente:  cliente@demo.com  /  Demo@1234   (Thor e Luna + histórico)
   Admin:    admin@clinica.com /  Admin@1234

   Se existir um banco SQLite local (`data/clinica.db`), este script
   OPTOU por começar limpo: o usuário escolheu não migrar os dados locais.
   O seed cria apenas o demo no Supabase.
   ──────────────────────────────────────────────────────────────────────── */
import { getDb, getOne, run } from './db.ts'
import { hashPassword } from './auth.ts'

const DEMO = true

function today(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

async function ensureClient() {
  const existing = await getOne<{ id: number }>('SELECT id FROM users WHERE email = $1', ['cliente@demo.com'])
  if (existing) return existing.id

  const { lastInsertRowid } = await run('INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id', [
    'cliente@demo.com',
    hashPassword('Demo@1234'),
  ])
  await run(
    'INSERT INTO profiles (user_id, full_name, cpf, phone, birth_date, address) VALUES ($1, $2, $3, $4, $5, $6)',
    [lastInsertRowid, 'Cliente Demonstração', '123.456.789-00', '(16) 98888-7777', '1990-05-14', 'Rua Exemplo, 100 — Guariba-SP'],
  )
  return lastInsertRowid
}

async function ensureAdmin() {
  const existing = await getOne<{ id: number }>('SELECT id FROM admin_users WHERE email = $1', ['admin@clinica.com'])
  if (existing) return existing.id
  const { lastInsertRowid } = await run('INSERT INTO admin_users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id', [
    'Admin Sua CLinica',
    'admin@clinica.com',
    hashPassword('Admin@1234'),
    'superadmin',
  ])
  return lastInsertRowid
}

async function ensurePet(clientId: number, name: string, species: string, breed: string, birthDate: string): Promise<number> {
  const existing = await getOne<{ id: number }>('SELECT id FROM pets WHERE owner_id = $1 AND name = $2', [clientId, name])
  if (existing) return existing.id
  const { lastInsertRowid } = await run(
    `INSERT INTO pets (owner_id, name, species, breed, sex, birth_date, weight_kg, microchip, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [clientId, name, species, breed, 'macho', birthDate, null, null, DEMO ? 'Pet de demonstração.' : null],
  )
  return lastInsertRowid
}

async function runDemo() {
  await getDb().connect()
  const clientId = await ensureClient()
  await ensureAdmin()

  const thor = await ensurePet(clientId, 'Thor', 'cachorro', 'Golden Retriever', '2021-03-12')
  const luna = await ensurePet(clientId, 'Luna', 'gato', 'Siamês', '2023-07-02')

  const count = await getOne<{ n: number }>('SELECT COUNT(*) AS n FROM appointments')
  if ((count?.n ?? 0) > 0) {
    console.log('  ✓ Dados de demonstração já existem. (banco populado)')
    return
  }

  /* Consultas Thor */
  const appt1 = (
    await run(
      `INSERT INTO appointments (pet_id, client_id, vet_name, type, scheduled_at, status, summary, diagnosis, notes, is_demo, created_by_admin)
       VALUES ($1, $2, 'Sua CLinica', 'consulta', '2026-07-15 09:30:00', 'realizada',
               'Check-up anual completo. Exame físico, pesagem e avaliação de mobilidade.',
               'Paciente saudável, dentro do peso ideal.',
               'Manter rotina de exercícios.', true, true) RETURNING id`,
      [thor, clientId],
    )
  ).lastInsertRowid

  await run(
    `INSERT INTO appointments (pet_id, client_id, vet_name, type, scheduled_at, status, summary, diagnosis, notes, is_demo, created_by_admin)
     VALUES ($1, $2, 'Sua CLinica', 'urgencia', '2026-08-02 14:10:00', 'realizada',
             'Atendimento de urgência após episódio de vômito.',
             'Gastrite leve — reação alimentar.',
             'Prescrita dieta leve por 3 dias.', true, true)`,
    [thor, clientId],
  )

  await run(
    `INSERT INTO appointments (pet_id, client_id, vet_name, type, scheduled_at, status, is_demo, created_by_admin)
     VALUES ($1, $2, 'Sua CLinica', 'retorno', $3, 'agendada', true, true)`,
    [thor, clientId, `${today(12)} 10:00:00`],
  )

  /* Registros médicos */
  await run(
    `INSERT INTO medical_records (pet_id, appointment_id, vet_name, record_type, title, description, is_demo)
     VALUES ($1, $2, 'Sua CLinica', 'consulta', 'Check-up anual', 'Exame físico completo. Físico geral normal.', true)`,
    [thor, appt1],
  )
  await run(
    `INSERT INTO medical_records (pet_id, vet_name, record_type, title, description, is_demo)
     VALUES ($1, 'Sua CLinica', 'vacina', 'V10 (anual)', 'Aplicada dose de reforço da vacina V10.', true)`,
    [thor],
  )
  await run(
    `INSERT INTO medical_records (pet_id, vet_name, record_type, title, description, is_demo)
     VALUES ($1, 'Sua CLinica', 'exame', 'Hemograma completo', 'Resultados dentro do padrão de referência.', true)`,
    [luna],
  )

  /* Receitas Thor */
  const rx1 = (
    await run(
      `INSERT INTO prescriptions (pet_id, client_id, vet_name, issued_at, valid_until, instructions, is_demo, created_by_admin)
       VALUES ($1, $2, 'Sua CLinica', '2026-07-15 10:00:00', '2026-09-15', 'Administrar conforme orientação. Em caso de dúvida, contatar a clínica.', true, true) RETURNING id`,
      [thor, clientId],
    )
  ).lastInsertRowid
  await run(
    `INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, notes)
     VALUES ($1, 'Omeprazol 20mg', '1 comprimido', '1x ao dia', '3 dias', 'Antes da alimentação.')`,
    [rx1],
  )
  await run(
    `INSERT INTO prescription_items (prescription_id, medication_name, dosage, frequency, duration, notes)
     VALUES ($1, 'Probiotico pet', '1 sachê', '2x ao dia', '5 dias', 'Misturar à ração.')`,
    [rx1],
  )

  /* Exames */
  await run(
    `INSERT INTO exams (pet_id, client_id, name, category, status, result_date, vet_name, notes, is_demo, created_by_admin)
     VALUES ($1, $2, 'Hemograma completo', 'laboratorial', 'concluido', '2026-07-15', 'Sua CLinica', 'Sem alterações relevantes.', true, true)`,
    [thor, clientId],
  )
  await run(
    `INSERT INTO exams (pet_id, client_id, name, category, status, vet_name, is_demo, created_by_admin)
     VALUES ($1, $2, 'Ultrassonografia abdominal', 'imagem', 'pendente', 'Sua CLinica', true, true)`,
    [luna, clientId],
  )

  /* Vacinas */
  await run(
    `INSERT INTO vaccinations (pet_id, client_id, name, applied_at, next_dose_at, lot, clinic_name, vet_name, is_demo, created_by_admin)
     VALUES ($1, $2, 'V10 (anual)', '2025-08-10', '2026-08-10', 'LOT-A100', 'Sua CLinica', 'Sua CLinica', true, true)`,
    [thor, clientId],
  )
  await run(
    `INSERT INTO vaccinations (pet_id, client_id, name, applied_at, next_dose_at, lot, clinic_name, vet_name, is_demo, created_by_admin)
     VALUES ($1, $2, 'Antirrábica', '2025-08-10', '2026-08-10', 'LOT-R45', 'Sua CLinica', 'Sua CLinica', true, true)`,
    [thor, clientId],
  )
  await run(
    `INSERT INTO vaccinations (pet_id, client_id, name, applied_at, next_dose_at, lot, clinic_name, vet_name, is_demo, created_by_admin)
     VALUES ($1, $2, 'V4 (felina)', '2025-09-20', '2026-09-20', 'LOT-F77', 'Sua CLinica', 'Sua CLinica', true, true)`,
    [luna, clientId],
  )

  /* Notificações */
  await run(
    `INSERT INTO notifications (user_id, title, body, type) VALUES ($1, 'Boas-vindas', 'Bem-vindo à sua área do cliente! Aqui você acompanha tudo do seu pet.', 'info')`,
    [clientId],
  )
  await run(
    `INSERT INTO notifications (user_id, title, body, type) VALUES ($1, 'Retorno agendado', $2, 'agendamento')`,
    [clientId, `Thor tem retorno agendado em ${today(12)}.`],
  )

  console.log(`\n  ✅ Seed concluído (dados de demonstração)\n`)
  console.log(`  Cliente:  cliente@demo.com   /  Demo@1234`)
  console.log(`  Admin:    admin@clinica.com  /  Admin@1234\n`)
}

runDemo().catch((err) => {
  console.error('  ✗ Erro no seed:', err)
  process.exit(1)
})
