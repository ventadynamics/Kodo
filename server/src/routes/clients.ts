import { Router } from 'express'
import { db } from '../db/schema.js'

const router = Router()

router.get('/', (_req, res) => {
  const clients = db.prepare(`
    SELECT c.*, COUNT(p.id) as project_count
    FROM clients c
    LEFT JOIN projects p ON p.client_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `).all()
  res.json(clients)
})

router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(Number(req.params.id))
  if (!client) return res.status(404).json({ error: 'Not found' })
  const projects = db.prepare('SELECT * FROM projects WHERE client_id = ? ORDER BY id').all(Number(req.params.id))
  res.json({ ...client as object, projects })
})

router.post('/', (req, res) => {
  const { name, company = null, email = null, phone = null, notes = null } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = db.prepare(
    'INSERT INTO clients (name, company, email, phone, notes) VALUES (?, ?, ?, ?, ?) RETURNING *'
  ).get(name, company, email, phone, notes)
  res.status(201).json(r)
})

router.put('/:id', (req, res) => {
  const { name, company, email, phone, notes } = req.body
  const r = db.prepare(`
    UPDATE clients SET name=?, company=?, email=?, phone=?, notes=? WHERE id=? RETURNING *
  `).get(name, company ?? null, email ?? null, phone ?? null, notes ?? null, Number(req.params.id))
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json(r)
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(Number(req.params.id))
  res.status(204).end()
})

export default router
