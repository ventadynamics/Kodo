import { Router } from 'express'
import { db } from '../db/schema.js'

const router = Router()

router.get('/', (req, res) => {
  const { project_id } = req.query
  if (!project_id) return res.status(400).json({ error: 'project_id required' })
  res.json(db.prepare(
    `SELECT tl.*, t.title as task_title, t.number as task_number
     FROM time_logs tl
     LEFT JOIN tasks t ON t.id = tl.task_id
     WHERE tl.project_id = ? ORDER BY tl.date DESC, tl.id DESC`
  ).all(project_id))
})

router.post('/', (req, res) => {
  const { project_id, task_id = null, description, minutes, date } = req.body
  if (!project_id || !description || !minutes || !date)
    return res.status(400).json({ error: 'project_id, description, minutes, date required' })
  const r = db.prepare(
    'INSERT INTO time_logs (project_id, task_id, description, minutes, date) VALUES (?, ?, ?, ?, ?) RETURNING *'
  ).get(project_id, task_id, description, minutes, date) as Record<string, unknown>
  const task = task_id ? db.prepare('SELECT title, number FROM tasks WHERE id=?').get(task_id) as { title: string; number: number } | null : null
  res.status(201).json({ ...r, task_title: task?.title ?? null, task_number: task?.number ?? null })
})

router.put('/:id', (req, res) => {
  const { task_id, description, minutes, date } = req.body
  const r = db.prepare(
    'UPDATE time_logs SET task_id=?, description=?, minutes=?, date=? WHERE id=? RETURNING *'
  ).get(task_id ?? null, description, minutes, date, req.params.id) as Record<string, unknown> | null
  if (!r) return res.status(404).json({ error: 'not found' })
  const task = r.task_id ? db.prepare('SELECT title, number FROM tasks WHERE id=?').get(r.task_id) as { title: string; number: number } | null : null
  res.json({ ...r, task_title: task?.title ?? null, task_number: task?.number ?? null })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM time_logs WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
