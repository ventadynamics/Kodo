import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import type { Category, Transaction, TransactionType, Workspace } from '@/types'
import { api } from '@/api'
import { DatePicker } from '@/components/ui/date-picker'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (t: Transaction) => void
  categories: Category[]
  editing?: Transaction | null
  workspace: Workspace
}

const TYPES: { value: TransactionType; label: string; color: string; bg: string }[] = [
  { value: 'income',  label: 'Доход',  color: '#2f9e44', bg: '#ebfbee' },
  { value: 'expense', label: 'Расход', color: '#e03131', bg: '#fff5f5' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function TransactionModal({ open, onClose, onSaved, categories, editing, workspace }: Props) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<string>('none')
  const [projectId, setProjectId] = useState<string>('none')
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
    enabled: open && workspace === 'business',
  })

  useEffect(() => {
    if (open) {
      if (editing) {
        setType(editing.type === 'milestone' ? 'expense' : editing.type)
        setAmount(String(editing.amount))
        setDescription(editing.description)
        setCategoryId(editing.category_id ? String(editing.category_id) : 'none')
        setProjectId(editing.project_id ? String(editing.project_id) : 'none')
        setDate(editing.date.slice(0, 10))
        setNote(editing.note ?? '')
      } else {
        setType('expense')
        setAmount('')
        setDescription('')
        setCategoryId('none')
        setProjectId('none')
        setDate(today())
        setNote('')
      }
    }
  }, [editing, open])

  const filteredCategories = categories.filter(c => c.type === type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (!parsedAmount || !description) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        workspace,
        type,
        amount: parsedAmount,
        description,
        category_id: categoryId === 'none' ? null : Number(categoryId),
        project_id: projectId === 'none' ? null : Number(projectId),
        date,
        note: note || null,
      }
      const saved = editing
        ? await api.updateTransaction(editing.id, payload)
        : await api.createTransaction(payload as Transaction)
      onSaved(saved)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Редактировать запись' : 'Новая запись'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          {/* Type toggle */}
          <div className="flex gap-2">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setType(t.value); setCategoryId('none') }}
                className={cn(
                  'flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-all',
                  type === t.value
                    ? 'border-current'
                    : 'border-border text-muted-foreground bg-transparent hover:bg-muted/40'
                )}
                style={type === t.value ? { color: t.color, background: t.bg, borderColor: `${t.color}60` } : {}}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Сумма Br</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0"
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Дата</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Описание</Label>
            <Input
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Краткое название"
              className="h-9"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Категория</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Без категории" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— без категории —</SelectItem>
                {filteredCategories.map(c => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {workspace === 'business' && projects.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Проект <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Без проекта" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Без проекта —</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: p.color }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Заметка <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
            <Textarea
              rows={2}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Дополнительная информация..."
              className="resize-none text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
