import { Router } from 'express'
import { db } from '../db/schema.js'

const router = Router()

router.get('/summary', (req, res) => {
  const { workspace } = req.query
  const where = workspace ? " WHERE workspace = ?" : ""
  const params = workspace ? [workspace] : []

  const rows = db.prepare(`
    SELECT
      strftime('%Y-%m', date) AS month,
      SUM(CASE WHEN type='income'    THEN amount ELSE 0 END) AS income,
      SUM(CASE WHEN type='expense'   THEN amount ELSE 0 END) AS expense,
      SUM(CASE WHEN type='milestone' THEN amount ELSE 0 END) AS milestone,
      SUM(CASE WHEN type='income'    THEN amount ELSE -amount END) AS balance
    FROM transactions${where}
    GROUP BY month ORDER BY month DESC
  `).all(...params)
  res.json(rows)
})

router.get('/project-finance', (req, res) => {
  const { project_id } = req.query
  if (!project_id) return res.status(400).json({ error: 'project_id required' })
  const row = db.prepare(`
    SELECT
      SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS revenue,
      SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS costs
    FROM transactions WHERE project_id = ?
  `).get(project_id) as { revenue: number | null; costs: number | null }
  res.json({ revenue: row.revenue ?? 0, costs: row.costs ?? 0, net: (row.revenue ?? 0) - (row.costs ?? 0) })
})

export default router
