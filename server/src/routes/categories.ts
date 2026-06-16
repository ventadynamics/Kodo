import { Router } from 'express'
import { db } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const { workspace } = req.query
  const rows = workspace
    ? db.prepare("SELECT * FROM categories WHERE workspace = ? OR workspace = 'both' ORDER BY type, name").all(workspace)
    : db.prepare('SELECT * FROM categories ORDER BY type, name').all()
  res.json(rows)
})

router.post('/', (req, res) => {
  const { name, type, color = '#6c757d', icon = 'tag', workspace = 'both' } = req.body
  if (!name || !type) return res.status(400).json({ error: 'name and type required' })
  const r = db.prepare('INSERT INTO categories (name, type, color, icon, workspace) VALUES (?, ?, ?, ?, ?) RETURNING *')
    .get(name, type, color, icon, workspace)
  res.status(201).json(r)
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
