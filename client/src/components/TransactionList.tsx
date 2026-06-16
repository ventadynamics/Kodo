import { Pencil, Trash2, TrendingUp, TrendingDown, Star } from 'lucide-react'
import type { Transaction } from '../types'

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

const TYPE_META = {
  income: { Icon: TrendingUp, color: 'var(--income)', bg: 'var(--income-light)', sign: '+', label: 'Доход' },
  expense: { Icon: TrendingDown, color: 'var(--expense)', bg: 'var(--expense-light)', sign: '−', label: 'Расход' },
  milestone: { Icon: Star, color: 'var(--milestone)', bg: 'var(--milestone-light)', sign: '−', label: 'Майлстоун' },
}

interface Props {
  transactions: Transaction[]
  onEdit: (t: Transaction) => void
  onDelete: (id: number) => void
}

function groupByDate(txs: Transaction[]) {
  const groups = new Map<string, Transaction[]>()
  for (const t of txs) {
    const key = t.date.slice(0, 10)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }
  return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

export function TransactionList({ transactions, onEdit, onDelete }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="card p-12 text-center text-[--text-tertiary]">
        <p className="text-sm">Нет записей</p>
      </div>
    )
  }

  const groups = groupByDate(transactions)

  return (
    <div className="flex flex-col gap-3">
      {groups.map(([date, txs]) => (
        <div key={date}>
          <p className="text-xs font-medium text-[--text-tertiary] uppercase tracking-wide mb-2 px-1">
            {new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className="card overflow-hidden">
            {txs.map((t, i) => {
              const meta = TYPE_META[t.type]
              const { Icon } = meta
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 px-4 py-3 group hover:bg-[--surface-1] transition-colors ${i > 0 ? 'border-t border-[--border]' : ''}`}
                >
                  <div className="w-9 h-9 rounded-[--radius] flex items-center justify-center flex-shrink-0"
                    style={{ background: meta.bg }}>
                    <Icon size={16} style={{ color: meta.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{t.description}</span>
                      {t.category_name && (
                        <span className="badge" style={{
                          background: `${t.category_color}18`,
                          color: t.category_color ?? meta.color,
                          border: `1px solid ${t.category_color}30`,
                        }}>
                          {t.category_name}
                        </span>
                      )}
                    </div>
                    {t.note && <p className="text-xs text-[--text-tertiary] truncate mt-0.5">{t.note}</p>}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm" style={{ color: t.type === 'income' ? 'var(--income)' : 'var(--text-primary)' }}>
                      {meta.sign}{fmt(t.amount)}
                    </p>
                    <p className="text-xs text-[--text-tertiary]">{fmtDate(t.date)}</p>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="btn btn-ghost p-1.5" onClick={() => onEdit(t)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost p-1.5 text-[--expense]" onClick={() => onDelete(t.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
