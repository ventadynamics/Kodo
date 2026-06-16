import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Task, TaskPriority, TaskStatus, Workspace } from '@/types'
import { api } from '@/api'
import { DatePicker } from '@/components/ui/date-picker'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (t: Task) => void
  editing?: Task | null
  projectId?: number | null
  workspace?: Workspace
}

export function TaskModal({ open, onClose, onSaved, editing, projectId = null, workspace = 'business' }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [assignee, setAssignee] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: api.getUsers })

  useEffect(() => {
    if (open) {
      if (editing) {
        setTitle(editing.title); setDescription(editing.description ?? '')
        setStatus(editing.status); setPriority(editing.priority)
        setDueDate(editing.due_date ?? ''); setAssignee(editing.assignee ?? '')
      } else {
        setTitle(''); setDescription(''); setStatus('todo'); setPriority('medium')
        setDueDate(''); setAssignee('')
      }
    }
  }, [editing, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload = {
        workspace,
        title,
        description: description || null,
        status,
        priority,
        project_id: projectId,
        due_date: dueDate || null,
        assignee: assignee.trim() || null,
      }
      const saved = editing
        ? await api.updateTask(editing.id, payload)
        : await api.createTask(payload as Task)
      onSaved(saved); onClose()
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Редактировать задачу' : 'Новая задача'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label>Заголовок</Label>
            <Input required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Что нужно сделать?" className="h-9" autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Описание <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
            <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Детали задачи..." className="resize-none text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Статус</Label>
              <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">К выполнению</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="done">Готово</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={v => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Исполнитель <span className="text-muted-foreground font-normal">(необяз.)</span></Label>
              <Select value={assignee || 'none'} onValueChange={v => setAssignee(v === 'none' ? '' : v)}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Не назначен" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Не назначен —</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Срок <span className="text-muted-foreground font-normal">(необяз.)</span></Label>
              <DatePicker value={dueDate} onChange={setDueDate} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Сохраняем...' : 'Сохранить'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
