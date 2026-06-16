import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Category, Transaction, TransactionType } from '../types'
import { api } from '../api'
import { format } from 'date-fns'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  categories: Category[]
  editing?: Transaction | null
}

const TYPES: { value: TransactionType; label: string }[] = [
  { value: 'income', label: 'Доход' },
  { value: 'expense', label: 'Расход' },
  { value: 'milestone', label: 'Майлстоун' },
]

export function TransactionModal({ open, onClose, onSaved, categories, editing }: Props) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState<number | ''>('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editing) {
      setType(editing.type)
      setAmount(String(editing.amount))
      setDescription(editing.description)
      setCategoryId(editing.category_id ?? '')
      setDate(editing.date.slice(0, 10))
      setNote(editing.note ?? '')
    } else {
      setType('expense')
      setAmount('')
      setDescription('')
      setCategoryId('')
      setDate(format(new Date(), 'yyyy-MM-dd'))
      setNote('')
    }
  }, [editing, open])

  if (!open) return null

  const filteredCategories = categories.filter(c => c.type === type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !description) return
    setSaving(true)
    try {
      const payload = {
        type,
        amount: parseFloat(amount),
        description,
        category_id: categoryId === '' ? null : categoryId,
        date,
        note: note || null,
      }
      if (editing) {
        await api.updateTransaction(editing.id, payload)
      } else {
        await api.createTransaction(payload as Transaction)
      }
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="card w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-[--border]">
          <h2 className="font-semibold text-base">{editing ? 'Редактировать' : 'Новая запись'}</h2>
          <button className="btn btn-ghost p-1.5" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Type toggle */}
          <div>
            <label>Тип</label>
            <div className="flex gap-2">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setType(t.value); setCategoryId('') }}
                  className={`flex-1 py-2 rounded-[--radius] text-sm font-medium border transition-all ${
                    type === t.value
                      ? t.value === 'income' ? 'bg-[--income-light] border-[--income] text-[--income]'
                        : t.value === 'expense' ? 'bg-[--expense-light] border-[--expense] text-[--expense]'
                        : 'bg-[--milestone-light] border-[--milestone] text-[--milestone]'
                      : 'border-[--border-strong] text-[--text-secondary]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount + Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label>Сумма ₽</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label>Дата</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
          </div>

          <div>
            <label>Описание</label>
            <input type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="Краткое название" />
          </div>

          <div>
            <label>Категория</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">— без категории —</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Заметка</label>
            <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Дополнительно..." style={{ resize: 'vertical' }} />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" className="btn btn-ghost flex-1" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary flex-1" disabled={saving}>
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
