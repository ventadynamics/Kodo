import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Bug, BugPriority, BugStatus } from '@/types'
import { api } from '@/api'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (b: Bug) => void
  editing?: Bug | null
  projectId?: number | null
}

export function BugModal({ open, onClose, onSaved, editing, projectId = null }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<BugStatus>('open')
  const [priority, setPriority] = useState<BugPriority>('medium')
  const [assignee, setAssignee] = useState('')
  const [taskId, setTaskId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: api.getUsers })
  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'business', projectId],
    queryFn: () => api.getTasks({ workspace: 'business', project_id: projectId ?? undefined }),
    enabled: open && projectId != null,
  })

  useEffect(() => {
    if (open) {
      if (editing) {
        setTitle(editing.title); setDescription(editing.description ?? '')
        setStatus(editing.status); setPriority(editing.priority)
        setAssignee(editing.assignee ?? ''); setTaskId(editing.task_id ?? null)
      } else {
        setTitle(''); setDescription(''); setStatus('open')
        setPriority('medium'); setAssignee(''); setTaskId(null)
      }
    }
  }, [editing, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload = { title, description: description || null, status, priority, severity: 'minor' as const, assignee: assignee || null, project_id: projectId, task_id: taskId }
      const saved = editing
        ? await api.updateBug(editing.id, payload)
        : await api.createBug(payload as Bug)
      onSaved(saved); onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Редактировать проблему' : 'Новая проблема'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label>Заголовок</Label>
            <Input required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Краткое описание проблемы" className="h-9" autoFocus />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Описание <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
            <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Шаги для воспроизведения, ожидаемое vs фактическое поведение..." className="resize-none text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Статус</Label>
              <Select value={status} onValueChange={v => setStatus(v as BugStatus)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Открыто</SelectItem>
                  <SelectItem value="in_progress">В работе</SelectItem>
                  <SelectItem value="resolved">Исправлено</SelectItem>
                  <SelectItem value="closed">Закрыто</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={v => setPriority(v as BugPriority)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Низкий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="critical">Критический</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Исполнитель <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
            <Select value={assignee || 'none'} onValueChange={v => setAssignee(v === 'none' ? '' : v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Не назначен" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Не назначен —</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {tasks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Вызвана задачей <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
              <Select value={taskId ? String(taskId) : 'none'} onValueChange={v => setTaskId(v === 'none' ? null : Number(v))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Не выбрана" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Не выбрана —</SelectItem>
                  {tasks.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      <span className="truncate block max-w-[320px]">
                        {t.project_slug && t.number > 0 ? `${t.project_slug}-${t.number} · ` : ''}{t.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Сохраняем...' : 'Сохранить'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
