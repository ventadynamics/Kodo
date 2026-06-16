import { Pencil, Trash2, Clock } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import type { TimeLog } from '@/types'
import { api } from '@/api'

function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}м`
  if (m === 0) return `${h}ч`
  return `${h}ч ${m}м`
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
}

function fmtShort(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function groupByDate(logs: TimeLog[]) {
  const map = new Map<string, TimeLog[]>()
  for (const log of logs) {
    const arr = map.get(log.date) ?? []
    arr.push(log)
    map.set(log.date, arr)
  }
  return [...map.entries()].sort(([a], [b]) => b.localeCompare(a))
}

interface Props {
  logs: TimeLog[]
  queryKey: unknown[]
  onEdit: (log: TimeLog) => void
}

export function TimeLogList({ logs, queryKey, onEdit }: Props) {
  const client = useQueryClient()

  const deleteLog = (id: number) => {
    if (!confirm('Удалить запись?')) return
    client.setQueryData<TimeLog[]>(queryKey, old => old?.filter(l => l.id !== id))
    api.deleteTimeLog(id).then(() => client.invalidateQueries({ queryKey }))
  }

  if (logs.length === 0) {
    return (
      <div className="bg-card border border-border/60 rounded-lg p-16 text-center text-muted-foreground text-sm">
        Нет записей — начни логировать время
      </div>
    )
  }

  const total = logs.reduce((s, l) => s + l.minutes, 0)
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const thisMonth = now.toISOString().slice(0, 7)
  const weekMins  = logs.filter(l => new Date(l.date + 'T12:00:00') >= monday).reduce((s, l) => s + l.minutes, 0)
  const monthMins = logs.filter(l => l.date.startsWith(thisMonth)).reduce((s, l) => s + l.minutes, 0)
  const groups = groupByDate(logs)

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Всего', value: fmtDuration(total) },
          { label: 'Этот месяц', value: fmtDuration(monthMins) },
          { label: 'Эта неделя', value: fmtDuration(weekMins) },
          { label: 'Записей', value: String(logs.length) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-card border border-border/60 rounded-lg px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
            <p className="text-[15px] font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Entries grouped by date */}
      <div className="flex flex-col gap-4">
        {groups.map(([date, dayLogs]) => (
          <div key={date}>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-0.5 capitalize">
              {fmtDate(date)}
            </p>
            <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
              {dayLogs.map((log, i) => (
                <div key={log.id}
                  className={`flex items-stretch group hover:bg-muted/20 transition-colors ${i > 0 ? 'border-t border-border/50' : ''}`}
                >
                  {/* Left: icon + description */}
                  <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-blue-50">
                      <Clock size={16} className="text-blue-600" />
                    </div>
                    <span className="font-medium text-sm truncate">{log.description}</span>
                  </div>

                  {/* Right: duration card */}
                  <div className="flex items-center border-l border-border/50 bg-muted/30 group-hover:bg-muted/50 transition-colors flex-shrink-0 w-[160px]">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col border-r border-border/40 self-stretch">
                      <button onClick={() => onEdit(log)}
                        className="flex-1 px-2.5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border-b border-border/40">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => deleteLog(log.id)}
                        className="flex-1 px-2.5 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="text-right px-4 py-3 flex-1">
                      <p className="font-semibold text-sm">{fmtDuration(log.minutes)}</p>
                      <p className="text-[11px] text-muted-foreground">{fmtShort(log.date)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
