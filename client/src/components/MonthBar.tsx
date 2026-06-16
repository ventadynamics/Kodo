import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { MonthSummary } from '../types'

function label(month: string) {
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

interface Props {
  months: MonthSummary[]
  selected: string | null
  onChange: (m: string | null) => void
}

export function MonthBar({ months, selected, onChange }: Props) {
  const sorted = [...months].sort((a, b) => b.month.localeCompare(a.month))
  const idx = selected ? sorted.findIndex(m => m.month === selected) : -1

  return (
    <div className="card flex items-center gap-2 p-2 overflow-x-auto">
      <button
        className={`btn text-sm flex-shrink-0 ${!selected ? 'btn-primary' : 'btn-ghost'}`}
        onClick={() => onChange(null)}
      >
        Все время
      </button>

      <div className="w-px h-6 bg-[--border-strong] flex-shrink-0" />

      {idx > 0 && (
        <button className="btn btn-ghost p-2 flex-shrink-0" onClick={() => onChange(sorted[idx - 1].month)}>
          <ChevronLeft size={16} />
        </button>
      )}

      <div className="flex gap-1.5 overflow-x-auto">
        {sorted.map(m => (
          <button
            key={m.month}
            onClick={() => onChange(m.month)}
            className={`btn text-sm flex-shrink-0 capitalize ${selected === m.month ? 'btn-primary' : 'btn-ghost'}`}
          >
            {label(m.month)}
          </button>
        ))}
      </div>

      {idx !== -1 && idx < sorted.length - 1 && (
        <button className="btn btn-ghost p-2 flex-shrink-0" onClick={() => onChange(sorted[idx + 1].month)}>
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}
