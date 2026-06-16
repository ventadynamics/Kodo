import { Router } from 'express'
import { db } from '../db/schema.js'

const router = Router()

function autoSlug(name: string): string {
  // "My Cool Project" → "MCP"
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 5) || 'P'
}

router.get('/', (_req, res) => {
  res.json(db.prepare(`
    SELECT p.*, c.name as client_name FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    ORDER BY p.id
  `).all())
})

router.post('/', (req, res) => {
  const { name, color = '#4263eb', icon = 'folder', slug, client_id = null } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const finalSlug = (slug as string | undefined)?.trim().toUpperCase() || autoSlug(name)
  const r = db.prepare('INSERT INTO projects (name, color, icon, slug, client_id) VALUES (?, ?, ?, ?, ?) RETURNING *')
    .get(name, color, icon, finalSlug, client_id)
  res.status(201).json(r)
})

router.put('/:id', (req, res) => {
  const { name, color, icon, slug, client_id } = req.body
  const r = db.prepare('UPDATE projects SET name=?, color=?, icon=?, slug=?, client_id=? WHERE id=? RETURNING *')
    .get(name, color, icon, (slug as string | undefined)?.trim().toUpperCase() || autoSlug(name), client_id ?? null, req.params.id)
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json(r)
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
