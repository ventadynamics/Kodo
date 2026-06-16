import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import type { MonthSummary } from '@/types'

const MONTHS = ['янв.','фев.','мар.','апр.','май','июн.','июл.','авг.','сен.','окт.','ноя.','дек.']

function label(month: string) {
  const [y, m] = month.split('-')
  return `${MONTHS[Number(m) - 1]} ${y} г.`
}

interface Props {
  months: MonthSummary[]
  selected: string | null
  onChange: (m: string | null) => void
}

export function MonthBar({ months, selected, onChange }: Props) {
  const sorted = [...months].sort((a, b) => b.month.localeCompare(a.month))

  return (
    <div className="bg-card border border-border/60 rounded-lg px-3 py-2">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={!selected ? 'default' : 'ghost'}
            className="flex-shrink-0 h-8 text-xs font-medium"
            onClick={() => onChange(null)}
          >
            Все время
          </Button>

          <div className="w-px h-5 bg-border flex-shrink-0 mx-1" />

          {sorted.map(m => (
            <Button
              key={m.month}
              size="sm"
              variant={selected === m.month ? 'default' : 'ghost'}
              className="flex-shrink-0 h-8 text-xs font-medium"
              onClick={() => onChange(m.month)}
            >
              {label(m.month)}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  )
}
