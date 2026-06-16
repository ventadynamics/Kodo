import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DatePicker } from '@/components/ui/date-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TimeLog } from '@/types'
import { api } from '@/api'

interface Props {
  open: boolean
  onClose: () => void
  onSaved: (t: TimeLog) => void
  editing?: TimeLog | null
  projectId: number
}

function today() { return new Date().toISOString().slice(0, 10) }

function toHM(minutes: number) {
  return { h: String(Math.floor(minutes / 60)), m: String(minutes % 60).padStart(2, '0') }
}

export function TimeLogModal({ open, onClose, onSaved, editing, projectId }: Props) {
  const [description, setDescription] = useState('')
  const [hours, setHours] = useState('0')
  const [minutes, setMinutes] = useState('00')
  const [date, setDate] = useState(today())
  const [taskId, setTaskId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'business', projectId],
    queryFn: () => api.getTasks({ workspace: 'business', project_id: projectId }),
    enabled: open,
  })

  useEffect(() => {
    if (open) {
      if (editing) {
        setDescription(editing.description)
        const hm = toHM(editing.minutes)
        setHours(hm.h); setMinutes(hm.m)
        setDate(editing.date)
        setTaskId(editing.task_id ?? null)
      } else {
        setDescription(''); setHours('0'); setMinutes('00'); setDate(today()); setTaskId(null)
      }
    }
  }, [editing, open])

  const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim() || totalMinutes <= 0) return
    setSaving(true)
    try {
      const payload = { project_id: projectId, task_id: taskId, description, minutes: totalMinutes, date }
      const saved = editing
        ? await api.updateTimeLog(editing.id, payload)
        : await api.createTimeLog(payload as TimeLog)
      onSaved(saved); onClose()
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? 'Редактировать запись' : 'Новая запись времени'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          {tasks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Задача <span className="text-muted-foreground font-normal">(необязательно)</span></Label>
              <Select value={taskId ? String(taskId) : 'none'} onValueChange={v => setTaskId(v === 'none' ? null : Number(v))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Без задачи" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Без задачи —</SelectItem>
                  {tasks.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      <span className="truncate block max-w-[260px]">
                        {t.project_slug && t.number > 0 ? `${t.project_slug}-${t.number} · ` : ''}{t.title}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Описание</Label>
            <Input required value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Что делал..." className="h-9" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Время</Label>
              <div className="flex items-center gap-1.5">
                <Input type="number" min="0" max="23" value={hours}
                  onChange={e => setHours(e.target.value)}
                  className="h-9 text-center" placeholder="0" />
                <span className="text-muted-foreground text-sm">ч</span>
                <Input type="number" min="0" max="59" value={minutes}
                  onChange={e => setMinutes(e.target.value)}
                  className="h-9 text-center w-16" placeholder="00" />
                <span className="text-muted-foreground text-sm">м</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Дата</Label>
              <DatePicker value={date} onChange={setDate} />
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Отмена</Button>
            <Button type="submit" className="flex-1" disabled={saving || totalMinutes <= 0}>
              {saving ? 'Сохраняем...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
