import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Category, Filters, TransactionType } from '@/types'

interface Props {
  filters: Filters
  categories: Category[]
  onChange: (f: Filters) => void
}

export function FilterBar({ filters, categories, onChange }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch })
  const hasActive = filters.type || filters.category_id || filters.search

  return (
    <div className="bg-card border border-border/60 rounded-lg p-3 flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск по описанию..."
          value={filters.search}
          onChange={e => set({ search: e.target.value })}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <Select
        value={filters.type ?? 'all'}
        onValueChange={v => set({ type: v === 'all' ? null : (v as TransactionType) })}
      >
        <SelectTrigger className="w-[150px] h-9 text-sm">
          <SelectValue placeholder="Все типы" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все типы</SelectItem>
          <SelectItem value="income">Доходы</SelectItem>
          <SelectItem value="expense">Расходы</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.category_id ? String(filters.category_id) : 'all'}
        onValueChange={v => set({ category_id: v === 'all' ? null : Number(v) })}
      >
        <SelectTrigger className="w-[170px] h-9 text-sm">
          <SelectValue placeholder="Все категории" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все категории</SelectItem>
          {(['income', 'expense'] as const)
            .filter(type => !filters.type || filters.type === type)
            .map(type => {
              const group = categories.filter(c => c.type === type)
              if (!group.length) return null
              return (
                <SelectGroup key={type}>
                  {!filters.type && <SelectLabel>{type === 'income' ? 'Доходы' : 'Расходы'}</SelectLabel>}
                  {group.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectGroup>
              )
            })}
        </SelectContent>
      </Select>

      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-muted-foreground gap-1.5"
          onClick={() => set({ type: null, category_id: null, search: '' })}
        >
          <X size={14} />
          Сбросить
        </Button>
      )}
    </div>
  )
}
