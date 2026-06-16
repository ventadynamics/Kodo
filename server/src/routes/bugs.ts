import { Router } from 'express'
import { db } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const { project_id, status } = req.query
  const conditions: string[] = []
  const params: unknown[] = []

  if (project_id) { conditions.push('b.project_id = ?'); params.push(project_id) }
  if (status)     { conditions.push('b.status = ?');     params.push(status) }

  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''
  res.json(db.prepare(
    `SELECT b.*, p.slug as project_slug, t.title as task_title, t.number as task_number FROM bugs b
     LEFT JOIN projects p ON p.id = b.project_id
     LEFT JOIN tasks t ON t.id = b.task_id` + where +
    " ORDER BY CASE b.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, b.created_at DESC"
  ).all(...params))
})

router.post('/', (req, res) => {
  const { title, description = null, status = 'open', priority = 'medium', severity = 'minor', assignee = null, project_id = null, task_id = null } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })

  const nextNum = project_id
    ? ((db.prepare('SELECT COALESCE(MAX(number),0)+1 as n FROM bugs WHERE project_id=?').get(project_id) as { n: number }).n)
    : 0

  const r = db.prepare(`
    INSERT INTO bugs (title, description, status, priority, severity, assignee, project_id, task_id, number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
  `).get(title, description, status, priority, severity, assignee, project_id, task_id, nextNum) as Record<string, unknown>

  const proj = project_id ? db.prepare('SELECT slug FROM projects WHERE id=?').get(project_id) as { slug: string } | null : null
  const task = task_id ? db.prepare('SELECT title, number FROM tasks WHERE id=?').get(task_id) as { title: string; number: number } | null : null
  res.status(201).json({ ...r, project_slug: proj?.slug ?? null, task_title: task?.title ?? null, task_number: task?.number ?? null })
})

router.put('/:id', (req, res) => {
  const { title, description, status, priority, severity, assignee, project_id, task_id } = req.body
  const r = db.prepare(`
    UPDATE bugs SET title=?, description=?, status=?, priority=?, severity=?, assignee=?, project_id=?, task_id=?,
    updated_at=datetime('now') WHERE id=? RETURNING *
  `).get(title, description ?? null, status, priority, severity, assignee ?? null, project_id ?? null, task_id ?? null, req.params.id) as Record<string, unknown> | null
  if (!r) return res.status(404).json({ error: 'Not found' })
  const proj = r.project_id ? db.prepare('SELECT slug FROM projects WHERE id=?').get(r.project_id) as { slug: string } | null : null
  const task = r.task_id ? db.prepare('SELECT title, number FROM tasks WHERE id=?').get(r.task_id) as { title: string; number: number } | null : null
  res.json({ ...r, project_slug: proj?.slug ?? null, task_title: task?.title ?? null, task_number: task?.number ?? null })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM bugs WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
