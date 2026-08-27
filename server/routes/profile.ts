import { Router } from 'express'
import { getOne, run } from '../db.ts'
import { requireClient, hashPassword, verifyPassword } from '../auth.ts'

export const profileRouter = Router()

profileRouter.get('/', requireClient, async (req, res) => {
  const profile = await getOne<Record<string, unknown>>(
    `SELECT p.full_name, p.cpf, p.phone, p.birth_date, p.address, p.avatar_url, u.email, u.created_at
     FROM profiles p JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1`,
    [req.sessionUser!.id],
  )
  res.json({ profile })
})

profileRouter.put('/', requireClient, async (req, res) => {
  const fullName = String(req.body.fullName ?? '').trim().slice(0, 120)
  const cpf = String(req.body.cpf ?? '').trim().slice(0, 20) || null
  const phone = String(req.body.phone ?? '').trim().slice(0, 30) || null
  const birthDate = String(req.body.birthDate ?? '').trim().slice(0, 20) || null
  const address = String(req.body.address ?? '').trim().slice(0, 300) || null
  if (!fullName) {
    res.status(400).json({ message: 'Informe seu nome completo.' })
    return
  }
  await run(
    `UPDATE profiles SET full_name = $1, cpf = $2, phone = $3, birth_date = $4, address = $5, updated_at = now()
     WHERE user_id = $6`,
    [fullName, cpf, phone, birthDate, address, req.sessionUser!.id],
  )
  res.json({ ok: true })
})

profileRouter.post('/password', requireClient, async (req, res) => {
  const current = String(req.body.currentPassword ?? '')
  const next = String(req.body.newPassword ?? '')
  if (next.length < 8) {
    res.status(400).json({ message: 'A nova senha deve ter pelo menos 8 caracteres.' })
    return
  }
  const user = await getOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [req.sessionUser!.id])
  if (!user || !verifyPassword(current, user.password_hash)) {
    res.status(400).json({ message: 'Senha atual incorreta.' })
    return
  }
  await run('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hashPassword(next), req.sessionUser!.id])
  res.json({ ok: true })
})
