import { Pencil, Trash2, TrendingUp, TrendingDown, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Transaction } from '@/types'
import { fmtMoney } from '@/lib/fmt'

const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('be-BY', { weekday: 'long', day: 'numeric', month: 'long' })

const fmtShort = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('be-BY', { day: 'numeric', month: 'short' })

const TYPE_META = {
  income:    { Icon: TrendingUp,  color: '#2f9e44', bg: '#ebfbee', sign: '+' },
  expense:   { Icon: TrendingDown, color: '#e03131', bg: '#fff5f5', sign: '−' },
  milestone: { Icon: Star,        color: '#7048e8', bg: '#f3f0ff', sign: '−' },
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

interface Props {
  transactions: Transaction[]
  onEdit: (t: Transaction) => void
  onDelete: (id: number) => void
}

export function TransactionList({ transactions, onEdit, onDelete }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="bg-card border border-border/60 rounded-lg p-16 text-center text-muted-foreground text-sm">
        Нет записей за выбранный период
      </div>
    )
  }

  const groups = groupByDate(transactions)

  return (
    <div className="flex flex-col gap-4">
      {groups.map(([date, txs]) => (
        <div key={date}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-0.5 capitalize">
            {fmtDate(date)}
          </p>
          <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
            {txs.map((t, i) => {
              const meta = TYPE_META[t.type]
              const { Icon } = meta
              return (
                <div
                  key={t.id}
                  className={`flex items-stretch group hover:bg-muted/20 transition-colors ${
                    i > 0 ? 'border-t border-border/50' : ''
                  }`}
                >
                  {/* Left: main info */}
                  <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                      <Icon size={16} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground truncate">{t.description}</span>
                        {t.category_name && (
                          <Badge variant="outline" className="text-[11px] h-5 px-1.5 font-normal border rounded-full"
                            style={{ color: t.category_color ?? meta.color, borderColor: `${t.category_color ?? meta.color}40`, background: `${t.category_color ?? meta.color}10` }}>
                            {t.category_name}
                          </Badge>
                        )}
                        {t.project_name && (
                          <Badge variant="outline" className="text-[11px] h-5 px-1.5 font-normal border rounded-full text-muted-foreground border-border/60">
                            {t.project_name}
                          </Badge>
                        )}
                      </div>
                      {t.note && <p className="text-xs text-muted-foreground truncate mt-0.5">{t.note}</p>}
                    </div>
                  </div>

                  {/* Right: amount card */}
                  <div className="flex items-center border-l border-border/50 bg-muted/30 group-hover:bg-muted/50 transition-colors flex-shrink-0 w-[160px]">
                    {/* Buttons — visible on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col border-r border-border/40 self-stretch">
                      <button onClick={() => onEdit(t)} className="flex-1 px-2.5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border-b border-border/40">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => onDelete(t.id)} className="flex-1 px-2.5 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {/* Amount */}
                    <div className="text-right px-4 py-3 flex-1">
                      <p className="font-semibold text-sm" style={{ color: t.type === 'income' ? '#2f9e44' : undefined }}>
                        {meta.sign}{fmtMoney(t.amount)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{fmtShort(t.date)}</p>
                    </div>
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
