import { z } from 'zod'

/** Schema comum de validação de inputs do portal/admin. */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Informe um e-mail válido.')

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres.')
  .max(100, 'A senha deve ter no máximo 100 caracteres.')

export const optionalText = (max = 5000) => z.string().trim().max(max).optional().nullable()

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Informe sua senha.'),
})

export const registerSchema = z.object({
  fullName: z.string().trim().min(3, 'Informe seu nome completo.').max(120),
  cpf: z.string().trim().optional().nullable(),
  email: emailSchema,
  phone: z.string().trim().optional().nullable(),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
})

export const forgotSchema = z.object({
  email: emailSchema,
})

export const resetSchema = z.object({
  token: z.string().min(10),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem.',
  path: ['confirmPassword'],
})

/* ── Pet ─────────────────────────────────────────────────────────────── */

export const petSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome do pet.').max(80),
  species: z.enum(['cachorro', 'gato', 'outros']).default('cachorro'),
  breed: optionalText(80),
  sex: z.enum(['macho', 'femea', 'nao-informado']).default('nao-informado'),
  birthDate: z.string().trim().optional().nullable(),
  weightKg: z.number().min(0).max(300).optional().nullable(),
  microchip: optionalText(30),
  photoUrl: optionalText(500),
  notes: optionalText(3000),
  // Admin: cliente dono do pet
  ownerId: z.number().int().positive().optional().nullable(),
})

/* ── Consulta ────────────────────────────────────────────────────────── */

export const appointmentSchema = z.object({
  petId: z.number().int().positive(),
  type: z.enum(['consulta', 'urgencia', 'cirurgia', 'retorno', 'vacina', 'outros']).default('consulta'),
  vetName: optionalText(120),
  scheduledAt: z.string().trim().optional().nullable(),
  status: z.enum(['agendada', 'realizada', 'cancelada']).default('realizada'),
  summary: optionalText(3000),
  diagnosis: optionalText(3000),
  notes: optionalText(3000),
  appointmentId: z.number().int().positive().optional().nullable(),
})

/* ── Receita ─────────────────────────────────────────────────────────── */

export const prescriptionSchema = z.object({
  petId: z.number().int().positive(),
  vetName: optionalText(120),
  issuedAt: z.string().trim().optional().nullable(),
  validUntil: z.string().trim().optional().nullable(),
  instructions: optionalText(3000),
  appointmentId: z.number().int().positive().optional().nullable(),
  items: z
    .array(
      z.object({
        medicationName: z.string().trim().min(1, 'Informe o medicamento.'),
        dosage: optionalText(120),
        frequency: optionalText(120),
        duration: optionalText(120),
        notes: optionalText(1000),
      }),
    )
    .min(1, 'Adicione ao menos um medicamento.'),
})

/* ── Exame ───────────────────────────────────────────────────────────── */

export const examSchema = z.object({
  petId: z.number().int().positive(),
  name: z.string().trim().min(1, 'Informe o nome do exame.'),
  category: z.enum(['laboratorial', 'imagem', 'outros']).default('laboratorial'),
  status: z.enum(['pendente', 'em_andamento', 'concluido']).default('pendente'),
  resultDate: z.string().trim().optional().nullable(),
  vetName: optionalText(120),
  notes: optionalText(3000),
  appointmentId: z.number().int().positive().optional().nullable(),
})

/* ── Vacina ──────────────────────────────────────────────────────────── */

export const vaccinationSchema = z.object({
  petId: z.number().int().positive(),
  name: z.string().trim().min(1, 'Informe o nome da vacina.'),
  appliedAt: z.string().trim().optional().nullable(),
  nextDoseAt: z.string().trim().optional().nullable(),
  lot: optionalText(60),
  clinicName: optionalText(120),
  vetName: optionalText(120),
})

/* ── Cliente (admin) ─────────────────────────────────────────────────── */

export const clientCreateSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: emailSchema,
  password: passwordSchema.optional(),
  cpf: optionalText(20),
  phone: optionalText(30),
})

export const clientUpdateSchema = z.object({
  fullName: z.string().trim().min(3).max(120).optional(),
  cpf: optionalText(20),
  phone: optionalText(30),
  isActive: z.boolean().optional(),
})

/* ── Admin user ──────────────────────────────────────────────────────── */

export const adminCreateSchema = z.object({
  name: z.string().trim().min(3).max(120),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(['admin', 'superadmin']).default('admin'),
})

/* ── Documento (upload) ──────────────────────────────────────────────── */

export const documentUploadSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título.').max(200),
  type: z.enum(['receita', 'exame', 'atestado', 'comprovante', 'veterinario']).default('veterinario'),
  clientId: z.number().int().positive().optional().nullable(),
  petId: z.number().int().positive().optional().nullable(),
  appointmentId: z.number().int().positive().optional().nullable(),
  isAvailable: z.boolean().default(true),
  // Arquivo em base64
  fileName: z.string().trim().min(1),
  mime: z.string().trim().min(1),
  data: z.string().min(1),
})

/* ── Agendamento (cliente) ───────────────────────────────────────────── */

export const appointmentRequestSchema = z.object({
  petId: z.number().int().positive(),
  type: z.enum(['consulta', 'urgencia', 'retorno', 'vacina', 'outros']).default('consulta'),
  preferredDate: z.string().trim().min(1),
  notes: optionalText(2000),
})
