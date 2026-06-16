import { Router } from 'express'
import { db } from '../db/schema.js'

const router = Router()

type Row = { workspace: string; starting_balance: number; balance_date: string }

function getSettings(workspace: string): Row {
  const row = db.prepare('SELECT * FROM workspace_settings WHERE workspace = ?').get(workspace) as Row | undefined
  return row ?? { workspace, starting_balance: 0, balance_date: new Date().toISOString().slice(0, 10) }
}

function currentBalance(workspace: string, starting_balance: number, balance_date: string): number {
  const row = db.prepare(`
    SELECT SUM(CASE WHEN type='income' THEN amount ELSE -amount END) AS delta
    FROM transactions WHERE workspace = ? AND date >= ?
  `).get(workspace, balance_date) as { delta: number | null }
  return starting_balance + (row.delta ?? 0)
}

router.get('/:workspace', (req, res) => {
  const { workspace } = req.params
  const s = getSettings(workspace)
  res.json({ ...s, current_balance: currentBalance(workspace, s.starting_balance, s.balance_date) })
})

router.put('/:workspace', (req, res) => {
  const { workspace } = req.params
  const { starting_balance, balance_date } = req.body
  db.prepare(`
    INSERT INTO workspace_settings (workspace, starting_balance, balance_date)
    VALUES (?, ?, ?)
    ON CONFLICT(workspace) DO UPDATE SET starting_balance = excluded.starting_balance, balance_date = excluded.balance_date
  `).run(workspace, starting_balance, balance_date)
  const s = getSettings(workspace)
  res.json({ ...s, current_balance: currentBalance(workspace, s.starting_balance, s.balance_date) })
})

export default router
