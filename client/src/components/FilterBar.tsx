import { Search, X } from 'lucide-react'
import type { Category, Filters, TransactionType } from '../types'

const TYPE_OPTIONS: { value: TransactionType | ''; label: string }[] = [
  { value: '', label: 'Все типы' },
  { value: 'income', label: 'Доходы' },
  { value: 'expense', label: 'Расходы' },
  { value: 'milestone', label: 'Майлстоуны' },
]

interface Props {
  filters: Filters
  categories: Category[]
  onChange: (f: Filters) => void
}

export function FilterBar({ filters, categories, onChange }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const hasActive = filters.type || filters.category_id || filters.search

  return (
    <div className="card p-3 flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-tertiary]" />
        <input
          type="text"
          placeholder="Поиск..."
          value={filters.search}
          onChange={e => set({ search: e.target.value })}
          style={{ paddingLeft: '32px' }}
        />
      </div>

      {/* Type filter */}
      <select
        value={filters.type ?? ''}
        onChange={e => set({ type: (e.target.value as TransactionType) || null })}
        style={{ width: 'auto' }}
      >
        {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Category filter */}
      <select
        value={filters.category_id ?? ''}
        onChange={e => set({ category_id: e.target.value ? Number(e.target.value) : null })}
        style={{ width: 'auto' }}
      >
        <option value="">Все категории</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {hasActive && (
        <button
          className="btn btn-ghost text-[--text-secondary] gap-1"
          onClick={() => set({ type: null, category_id: null, search: '' })}
        >
          <X size={14} /> Сбросить
        </button>
      )}
    </div>
  )
}
