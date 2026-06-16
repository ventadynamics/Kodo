import { Router } from 'express'
import { db } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const { workspace, project_id, status } = req.query
  const conditions: string[] = []
  const params: unknown[] = []

  if (workspace)  { conditions.push('t.workspace = ?');  params.push(workspace) }
  if (project_id) { conditions.push('t.project_id = ?'); params.push(project_id) }
  if (status)     { conditions.push('t.status = ?');     params.push(status) }

  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''
  res.json(db.prepare(
    `SELECT t.*, p.slug as project_slug FROM tasks t
     LEFT JOIN projects p ON p.id = t.project_id` + where +
    " ORDER BY CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, t.created_at DESC"
  ).all(...params))
})

router.post('/', (req, res) => {
  const { workspace = 'business', title, description = null, status = 'todo', priority = 'medium', project_id = null, due_date = null, assignee = null } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })

  const nextNum = project_id
    ? ((db.prepare('SELECT COALESCE(MAX(number),0)+1 as n FROM tasks WHERE project_id=?').get(project_id) as { n: number }).n)
    : 0

  const r = db.prepare(`
    INSERT INTO tasks (workspace, title, description, status, priority, project_id, due_date, number, assignee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
  `).get(workspace, title, description, status, priority, project_id, due_date, nextNum, assignee) as Record<string, unknown>

  const proj = project_id ? db.prepare('SELECT slug FROM projects WHERE id=?').get(project_id) as { slug: string } | null : null
  res.status(201).json({ ...r, project_slug: proj?.slug ?? null })
})

router.put('/:id', (req, res) => {
  const { workspace = 'business', title, description, status, priority, project_id, due_date, assignee } = req.body
  const r = db.prepare(`
    UPDATE tasks SET workspace=?, title=?, description=?, status=?, priority=?, project_id=?, due_date=?,
    assignee=?, updated_at=datetime('now') WHERE id=? RETURNING *
  `).get(workspace, title, description ?? null, status, priority, project_id ?? null, due_date ?? null, assignee ?? null, req.params.id) as Record<string, unknown> | null
  if (!r) return res.status(404).json({ error: 'Not found' })
  const proj = r.project_id ? db.prepare('SELECT slug FROM projects WHERE id=?').get(r.project_id) as { slug: string } | null : null
  res.json({ ...r, project_slug: proj?.slug ?? null })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
