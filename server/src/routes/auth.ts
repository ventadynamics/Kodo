import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '../db/schema.js'

export const JWT_SECRET = process.env.JWT_SECRET ?? 'kodo_dev_secret_change_in_prod'

const router = Router()

router.post('/register', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' })
  if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' })

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())
  if (existing) return res.status(409).json({ error: 'Пользователь уже существует' })

  const hash = await bcrypt.hash(password, 10)
  const r = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email, created_at')
    .get(email.toLowerCase(), hash) as { id: number; email: string; created_at: string }

  const token = jwt.sign({ id: r.id, email: r.email }, JWT_SECRET, { expiresIn: '30d' })
  res.status(201).json({ token, user: { id: r.id, email: r.email } })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email и пароль обязательны' })

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as
    { id: number; email: string; password_hash: string } | undefined

  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'Неверный email или пароль' })

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
  res.json({ token, user: { id: user.id, email: user.email } })
})

router.get('/me', (req, res) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { id: number; email: string }
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.id) as
      { id: number; email: string; name: string | null } | undefined
    if (!user) return res.status(401).json({ error: 'User not found' })
    res.json({ id: user.id, email: user.email, name: user.name ?? user.email.split('@')[0] })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

export default router
