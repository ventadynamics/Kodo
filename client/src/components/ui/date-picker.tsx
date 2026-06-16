import { useState } from 'react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isSameMonth, isToday } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from './popover'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface Props {
  value: string        // ISO date string 'YYYY-MM-DD'
  onChange: (v: string) => void
  className?: string
}

export function DatePicker({ value, onChange, className }: Props) {
  const selected = value ? new Date(value + 'T12:00:00') : new Date()
  const [viewDate, setViewDate] = useState(selected)
  const [open, setOpen] = useState(false)

  const days = eachDayOfInterval({ start: startOfMonth(viewDate), end: endOfMonth(viewDate) })
  const startPad = (getDay(startOfMonth(viewDate)) + 6) % 7 // Mon=0

  const select = (d: Date) => {
    onChange(format(d, 'yyyy-MM-dd'))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('h-9 w-full justify-start text-left font-normal', !value && 'text-muted-foreground', className)}
        >
          <CalendarIcon size={14} className="mr-2 flex-shrink-0 text-muted-foreground" />
          {value
            ? format(selected, 'd MMMM yyyy', { locale: ru })
            : 'Выберите дату'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="start">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => setViewDate(subMonths(viewDate, 1))}
            className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-medium capitalize">
            {format(viewDate, 'LLLL yyyy', { locale: ru })}
          </span>
          <button type="button" onClick={() => setViewDate(addMonths(viewDate, 1))}
            className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
            <div key={d} className="text-center text-[11px] text-muted-foreground font-medium py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map(d => {
            const sel = isSameDay(d, selected)
            const today = isToday(d)
            const inMonth = isSameMonth(d, viewDate)
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => select(d)}
                className={cn(
                  'h-8 w-full text-sm rounded transition-colors',
                  sel && 'bg-primary text-primary-foreground font-medium',
                  !sel && today && 'border border-primary text-primary font-medium',
                  !sel && !today && inMonth && 'hover:bg-muted',
                  !inMonth && 'text-muted-foreground/40'
                )}
              >
                {d.getDate()}
              </button>
            )
          })}
        </div>

        {/* Today button */}
        <div className="mt-2 pt-2 border-t border-border/50">
          <button type="button" onClick={() => { select(new Date()); setViewDate(new Date()) }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
            Сегодня
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
