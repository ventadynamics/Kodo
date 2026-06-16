import { TrendingUp, TrendingDown, Wallet, Landmark } from 'lucide-react'
import type { MonthSummary, WorkspaceSettings } from '@/types'
import { fmtMoney } from '@/lib/fmt'

interface Props {
  summary: MonthSummary[]
  selectedMonth: string | null
  settings?: WorkspaceSettings
}

export function SummaryCards({ summary, selectedMonth, settings }: Props) {
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
    ...(settings && !selectedMonth ? [{
      label: 'На счету',
      value: settings.current_balance,
      icon: Landmark,
      iconColor: settings.current_balance >= 0 ? '#1971c2' : '#e03131',
      iconBg: settings.current_balance >= 0 ? '#e7f5ff' : '#fff5f5',
      valueColor: settings.current_balance >= 0 ? '#1971c2' : '#e03131',
    }] : []),
    {
      label: 'Баланс',
      value: data?.balance ?? 0,
      icon: Wallet,
      iconColor: (data?.balance ?? 0) >= 0 ? '#2f9e44' : '#e03131',
      iconBg: (data?.balance ?? 0) >= 0 ? '#ebfbee' : '#fff5f5',
      valueColor: (data?.balance ?? 0) >= 0 ? '#2f9e44' : '#e03131',
    },
    {
      label: 'Доходы',
      value: data?.income ?? 0,
      icon: TrendingUp,
      iconColor: '#2f9e44',
      iconBg: '#ebfbee',
      valueColor: '#2f9e44',
    },
    {
      label: 'Расходы',
      value: data?.expense ?? 0,
      icon: TrendingDown,
      iconColor: '#e03131',
      iconBg: '#fff5f5',
      valueColor: '#e03131',
    },
  ]

  return (
    <div className={`grid gap-3 ${cards.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
      {cards.map(({ label, value, icon: Icon, iconColor, iconBg, valueColor }) => (
        <div key={label} className="bg-card border border-border/60 rounded-lg p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg }}>
            <Icon size={16} style={{ color: iconColor }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-[15px] font-semibold truncate" style={{ color: valueColor }}>
              {fmtMoney(value)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
