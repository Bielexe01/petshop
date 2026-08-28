import { Router } from 'express'
import { getAll } from '../db.ts'
import { requireScreen } from '../auth.ts'

export const auditRouter = Router()

auditRouter.get('/', requireScreen('auditoria'), async (req, res) => {
  const { limit } = req.query
  const rows = await getAll<Record<string, unknown>>(
    `SELECT a.*, ad.name AS admin_name
     FROM auth_logs a
     LEFT JOIN admin_users ad ON ad.id = a.admin_user_id
     ORDER BY a.created_at DESC
     LIMIT ${Number.isNaN(Number(limit)) ? 100 : Math.min(Number(limit), 500)}`,
  )
  res.json({ logs: rows })
})
