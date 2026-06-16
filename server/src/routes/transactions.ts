import { Router } from 'express'
import { db } from '../db/schema.js'

const router = Router()

const SELECT = `
  SELECT t.*, c.name AS category_name, c.color AS category_color, p.name AS project_name
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN projects p ON p.id = t.project_id
`

router.get('/', (req, res) => {
  const { workspace, month, type, category_id, search, project_id } = req.query
  const conditions: string[] = []
  const params: unknown[] = []

  if (workspace)   { conditions.push("t.workspace = ?");                      params.push(workspace) }
  if (month)       { conditions.push("strftime('%Y-%m', t.date) = ?");        params.push(month) }
  if (type)        { conditions.push('t.type = ?');                           params.push(type) }
  if (category_id) { conditions.push('t.category_id = ?');                   params.push(category_id) }
  if (project_id)  { conditions.push('t.project_id = ?');                    params.push(project_id) }
  if (search)      { conditions.push('(t.description LIKE ? OR t.note LIKE ?)'); params.push(`%${search}%`, `%${search}%`) }

  const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''
  res.json(db.prepare(SELECT + where + ' ORDER BY t.date DESC, t.created_at DESC').all(...params))
})

router.post('/', (req, res) => {
  const { workspace = 'business', type, amount, description, category_id = null, project_id = null, date, note = null } = req.body
  if (!type || !amount || !description || !date) return res.status(400).json({ error: 'Missing fields' })
  const r = db.prepare(`
    INSERT INTO transactions (workspace, type, amount, description, category_id, project_id, date, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
  `).get(workspace, type, amount, description, category_id, project_id, date, note) as Record<string, unknown>
  const cat  = category_id ? db.prepare('SELECT name, color FROM categories WHERE id=?').get(category_id) as { name: string; color: string } | null : null
  const proj = project_id  ? db.prepare('SELECT name FROM projects WHERE id=?').get(project_id) as { name: string } | null : null
  res.status(201).json({ ...r, category_name: cat?.name ?? null, category_color: cat?.color ?? null, project_name: proj?.name ?? null })
})

router.put('/:id', (req, res) => {
  const { workspace, type, amount, description, category_id, project_id, date, note } = req.body
  const r = db.prepare(`
    UPDATE transactions SET workspace=?, type=?, amount=?, description=?, category_id=?, project_id=?, date=?, note=?
    WHERE id=? RETURNING *
  `).get(workspace, type, amount, description, category_id ?? null, project_id ?? null, date, note ?? null, req.params.id) as Record<string, unknown> | null
  if (!r) return res.status(404).json({ error: 'Not found' })
  const cat  = r.category_id ? db.prepare('SELECT name, color FROM categories WHERE id=?').get(r.category_id) as { name: string; color: string } | null : null
  const proj = r.project_id  ? db.prepare('SELECT name FROM projects WHERE id=?').get(r.project_id)  as { name: string } | null : null
  res.json({ ...r, category_name: cat?.name ?? null, category_color: cat?.color ?? null, project_name: proj?.name ?? null })
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id)
  res.status(204).end()
})

export default router
