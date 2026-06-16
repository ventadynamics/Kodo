import { TrendingUp, TrendingDown, Star, Wallet } from 'lucide-react'
import type { MonthSummary } from '../types'

function fmt(n: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
}

interface Props {
  summary: MonthSummary[]
  selectedMonth: string | null
}

export function SummaryCards({ summary, selectedMonth }: Props) {
  const data = selectedMonth
    ? summary.find(s => s.month === selectedMonth)
    : summary.reduce(
        (acc, s) => ({
          month: 'all',
          income: acc.income + s.income,
          expense: acc.expense + s.expense,
          milestone: acc.milestone + s.milestone,
          balance: acc.balance + s.balance,
        }),
        { month: 'all', income: 0, expense: 0, milestone: 0, balance: 0 }
      )

  const cards = [
    { label: 'Баланс', value: data?.balance ?? 0, icon: Wallet, colorClass: 'text-[--accent]', bgClass: 'bg-[--accent-light]' },
    { label: 'Доходы', value: data?.income ?? 0, icon: TrendingUp, colorClass: 'text-[--income]', bgClass: 'bg-[--income-light]' },
    { label: 'Расходы', value: data?.expense ?? 0, icon: TrendingDown, colorClass: 'text-[--expense]', bgClass: 'bg-[--expense-light]' },
    { label: 'Майлстоуны', value: data?.milestone ?? 0, icon: Star, colorClass: 'text-[--milestone]', bgClass: 'bg-[--milestone-light]' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, colorClass, bgClass }) => (
        <div key={label} className="card p-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[--radius] flex items-center justify-center flex-shrink-0 ${bgClass}`}>
            <Icon size={18} className={colorClass} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[--text-secondary] mb-0.5">{label}</p>
            <p className="font-semibold text-base truncate" style={{ color: label === 'Баланс' ? (value >= 0 ? 'var(--income)' : 'var(--expense)') : undefined }}>
              {fmt(value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
