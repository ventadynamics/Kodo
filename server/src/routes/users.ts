import { Router } from 'express'
import { db } from '../db/schema.js'

const router = Router()

router.get('/', (_req, res) => {
  const users = db.prepare('SELECT id, email, name FROM users ORDER BY id').all() as
    { id: number; email: string; name: string | null }[]
  res.json(users.map(u => ({ ...u, name: u.name ?? u.email.split('@')[0] })))
})

router.put('/me', (req: any, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Имя обязательно' })
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), req.user.id)
  res.json({ id: req.user.id, email: req.user.email, name: name.trim() })
})

export default router
