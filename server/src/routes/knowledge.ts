import { Router } from 'express'
import { db } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const { project_id } = req.query
  if (!project_id) return res.status(400).json({ error: 'project_id required' })
  const rows = db.prepare('SELECT * FROM knowledge_pages WHERE project_id = ? ORDER BY updated_at DESC').all(Number(project_id))
  res.json(rows)
})

router.post('/', (req, res) => {
  const { project_id, title, content = '' } = req.body
  if (!project_id || !title) return res.status(400).json({ error: 'project_id and title required' })
  const r = db.prepare(
    'INSERT INTO knowledge_pages (project_id, title, content) VALUES (?, ?, ?) RETURNING *'
  ).get(project_id, title, content)
  res.json(r)
})

router.put('/:id', (req, res) => {
  const { title, content } = req.body
  const r = db.prepare(
    `UPDATE knowledge_pages SET
      title      = COALESCE(?, title),
      content    = COALESCE(?, content),
      updated_at = datetime('now')
     WHERE id = ? RETURNING *`
  ).get(title ?? null, content ?? null, Number(req.params.id))
  if (!r) return res.status(404).json({ error: 'not found' })
  res.json(r)
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM knowledge_pages WHERE id = ?').run(Number(req.params.id))
  res.status(204).end()
})

export default router
