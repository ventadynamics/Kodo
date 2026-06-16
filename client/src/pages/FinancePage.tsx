import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { api } from '@/api'
import type { Filters, MonthSummary, Transaction, Workspace, WorkspaceSettings } from '@/types'
import { SummaryCards }     from '@/components/finance/SummaryCards'
import { MonthBar }         from '@/components/finance/MonthBar'
import { FilterBar }        from '@/components/finance/FilterBar'
import { TransactionList }  from '@/components/finance/TransactionList'
import { TransactionModal } from '@/components/finance/TransactionModal'
import { DatePicker }       from '@/components/ui/date-picker'

function BalanceSettingsModal({ open, onClose, workspace, settings, onSaved }: {
  open: boolean; onClose: () => void; workspace: Workspace
  settings: WorkspaceSettings | undefined; onSaved: (s: WorkspaceSettings) => void
}) {
  const [balance, setBalance] = useState('')
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)

  useState(() => {
    if (open) {
      setBalance(settings ? String(settings.starting_balance) : '0')
      setDate(settings?.balance_date ?? new Date().toISOString().slice(0, 10))
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const saved = await api.updateWorkspaceSettings(workspace, {
        starting_balance: parseFloat(balance.replace(',', '.')) || 0,
        balance_date: date,
      })
      onSaved(saved)
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Стартовый баланс</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Укажи сколько у тебя было на выбранную дату. Текущий баланс = эта сумма + все транзакции после этой даты.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label>Сумма Br</Label>
            <Input
              type="number" step="0.01" min="0"
              value={balance} onChange={e => setBalance(e.target.value)}
              className="h-9" autoFocus
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Дата отсчёта</Label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function FinancePage({ workspace }: { workspace: Workspace }) {
  const client = useQueryClient()
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ month: null, type: null, category_id: null, search: '' })
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const { data: categories = [] } = useQuery({ queryKey: ['categories', workspace], queryFn: () => api.getCategories(workspace) })
  const { data: summary = [] } = useQuery({ queryKey: ['summary', workspace], queryFn: () => api.getSummary(workspace) })
  const { data: wsSettings } = useQuery({
    queryKey: ['workspace-settings', workspace],
    queryFn: () => api.getWorkspaceSettings(workspace),
  })

  const effectiveFilters = { ...filters, month: selectedMonth }
  const txKey = ['transactions', workspace, effectiveFilters]
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: txKey,
    queryFn: () => api.getTransactions(workspace, effectiveFilters),
  })

  const summaryKey = ['summary', workspace]
  const settingsKey = ['workspace-settings', workspace]

  const patchSummary = (month: string, inc: number, exp: number) => {
    client.setQueryData<MonthSummary[]>(summaryKey, old => {
      if (!old) return old
      const exists = old.some(s => s.month === month)
      const updated = exists
        ? old.map(s => s.month !== month ? s : { ...s, income: s.income + inc, expense: s.expense + exp, balance: s.balance + inc - exp })
        : [...old, { month, income: inc, expense: exp, milestone: 0, balance: inc - exp }]
          .sort((a, b) => b.month.localeCompare(a.month))
      return updated
    })
    client.invalidateQueries({ queryKey: summaryKey })
    client.invalidateQueries({ queryKey: settingsKey })
  }

  const onSaved = (saved: Transaction) => {
    client.setQueryData<Transaction[]>(txKey, old => {
      if (!old) return [saved]
      const exists = old.some(t => t.id === saved.id)
      return exists ? old.map(t => t.id === saved.id ? saved : t) : [saved, ...old]
    })
    if (saved.project_id) client.invalidateQueries({ queryKey: ['project-finance', saved.project_id] })
    if (editing?.project_id && editing.project_id !== saved.project_id)
      client.invalidateQueries({ queryKey: ['project-finance', editing.project_id] })
    const prev = editing
    const month = saved.date.slice(0, 7)
    const inc = saved.type === 'income'  ? saved.amount : 0
    const exp = saved.type === 'expense' ? saved.amount : 0
    if (prev) {
      const prevMonth = prev.date.slice(0, 7)
      const prevInc = prev.type === 'income'  ? prev.amount : 0
      const prevExp = prev.type === 'expense' ? prev.amount : 0
      if (prevMonth === month) {
        patchSummary(month, inc - prevInc, exp - prevExp)
      } else {
        patchSummary(prevMonth, -prevInc, -prevExp)
        patchSummary(month, inc, exp)
      }
    } else {
      patchSummary(month, inc, exp)
    }
  }

  const deleteTransaction = (id: number) => {
    if (!confirm('Удалить запись?')) return
    const tx = transactions.find(t => t.id === id)
    client.setQueryData<Transaction[]>(txKey, old => old?.filter(t => t.id !== id))
    if (tx) {
      patchSummary(
        tx.date.slice(0, 7),
        tx.type === 'income'  ? -tx.amount : 0,
        tx.type === 'expense' ? -tx.amount : 0,
      )
    }
    if (tx?.project_id) client.invalidateQueries({ queryKey: ['project-finance', tx.project_id] })
    api.deleteTransaction(id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Финансы</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-8 w-8 p-0"
            onClick={() => setSettingsOpen(true)} title="Стартовый баланс">
            <Settings2 size={14} />
          </Button>
          <Button size="sm" className="gap-1.5 h-8 text-sm"
            onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Plus size={15} /> Добавить
          </Button>
        </div>
      </div>

      {summary.length > 0 && (
        <MonthBar months={summary} selected={selectedMonth} onChange={setSelectedMonth} />
      )}
      <SummaryCards summary={summary} selectedMonth={selectedMonth} settings={wsSettings} />
      <FilterBar filters={filters} categories={categories} onChange={setFilters} />

      {isLoading
        ? <div className="bg-card border border-border/60 rounded-lg p-16 text-center text-muted-foreground text-sm">Загружаем...</div>
        : <TransactionList
            transactions={transactions}
            onEdit={t => { setEditing(t); setModalOpen(true) }}
            onDelete={deleteTransaction}
          />
      }

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
        categories={categories}
        editing={editing}
        workspace={workspace}
      />

      <BalanceSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        workspace={workspace}
        settings={wsSettings}
        onSaved={s => client.setQueryData(['workspace-settings', workspace], s)}
      />
    </div>
  )
}
