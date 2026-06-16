import { useState } from 'react'
import { Pencil, Trash2, Plus, Circle, Loader, CheckCircle2, Calendar, Flag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Bug, Task, TaskStatus, TimeLog } from '@/types'
import { api } from '@/api'
import { useQueryClient } from '@tanstack/react-query'
import { TaskDetailModal } from './TaskDetailModal'

const COLUMNS: { status: TaskStatus; label: string; Icon: typeof Circle; color: string; bg: string; darkBg: string }[] = [
  { status: 'todo',        label: 'К выполнению', Icon: Circle,       color: '#6c757d', bg: '#f8f9fa', darkBg: 'rgba(134,142,150,.08)' },
  { status: 'in_progress', label: 'В работе',     Icon: Loader,       color: '#1971c2', bg: '#e7f5ff', darkBg: 'rgba(25,113,194,.10)' },
  { status: 'done',        label: 'Готово',        Icon: CheckCircle2, color: '#2f9e44', bg: '#ebfbee', darkBg: 'rgba(47,158,68,.10)' },
]

const PRIORITY_META = {
  low:    { label: 'Низкий',  color: '#6c757d' },
  medium: { label: 'Средний', color: '#f08c00' },
  high:   { label: 'Высокий', color: '#e03131' },
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function isOverdue(d: string | null) {
  if (!d) return false
  return new Date(d) < new Date(new Date().toDateString())
}

interface Props {
  tasks: Task[]
  bugs?: Bug[]
  timeLogs?: TimeLog[]
  onEdit: (t: Task) => void
  onNew: () => void
  queryKey: unknown[]
}

export function TaskBoard({ tasks, bugs = [], timeLogs = [], onEdit, onNew, queryKey }: Props) {
  const client = useQueryClient()
  const [dragging, setDragging] = useState<number | null>(null)
  const [detail, setDetail] = useState<Task | null>(null)

  const byStatus = (s: TaskStatus) => tasks.filter(t => t.status === s)

  const handleDrop = (status: TaskStatus, e: React.DragEvent) => {
    e.preventDefault()
    if (dragging === null) return
    const task = tasks.find(t => t.id === dragging)
    if (!task || task.status === status) return
    client.setQueryData<Task[]>(queryKey, old => old?.map(t => t.id === dragging ? { ...t, status } : t))
    api.updateTask(dragging, { ...task, status }).then(() => client.invalidateQueries({ queryKey }))
    setDragging(null)
  }

  const deleteTask = (id: number) => {
    if (!confirm('Удалить задачу?')) return
    client.setQueryData<Task[]>(queryKey, old => old?.filter(t => t.id !== id))
    api.deleteTask(id).then(() => client.invalidateQueries({ queryKey }))
  }

  return (
    <>
    <div className="grid grid-cols-3 gap-4 items-start">
      {COLUMNS.map(({ status, label, Icon, color, bg, darkBg }) => (
        <div
          key={status}
          className="rounded-lg border border-border/60 overflow-hidden dark-column"
          style={{ '--col-bg': bg, '--col-bg-dark': darkBg, background: bg } as React.CSSProperties}
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(status, e)}
        >
          {/* Column header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/60 bg-card">
            <div className="flex items-center gap-2">
              <Icon size={14} style={{ color }} />
              <span className="text-sm font-medium">{label}</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">{byStatus(status).length}</Badge>
            </div>
            {status === 'todo' && (
              <button onClick={onNew} className="text-muted-foreground hover:text-foreground transition-colors">
                <Plus size={15} />
              </button>
            )}
          </div>

          {/* Cards */}
          <div className="p-2 flex flex-col gap-2 min-h-[120px]">
            {byStatus(status).map(task => (
              <div
                key={task.id}
                draggable
                onDragStart={() => setDragging(task.id)}
                onDragEnd={() => setDragging(null)}
                onClick={() => setDetail(task)}
                className={cn(
                  'bg-card rounded-md border border-border/60 p-3 group cursor-pointer active:cursor-grabbing',
                  'hover:border-border hover:shadow-sm transition-all',
                  dragging === task.id && 'opacity-40'
                )}
              >
                <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight">{task.title}</p>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); onEdit(task) }} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Pencil size={12} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteTask(task.id) }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {task.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                )}

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Flag size={11} style={{ color: PRIORITY_META[task.priority].color }} />
                      <span className="text-[11px]" style={{ color: PRIORITY_META[task.priority].color }}>
                        {PRIORITY_META[task.priority].label}
                      </span>
                    </div>
                    {task.due_date && (
                      <div className={cn('flex items-center gap-1', isOverdue(task.due_date) && task.status !== 'done' && 'text-destructive')}>
                        <Calendar size={11} />
                        <span className="text-[11px]">{fmtDate(task.due_date)}</span>
                      </div>
                    )}
                  </div>
                  {task.project_slug && task.number > 0 && (
                    <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-transparent text-blue-600 border border-blue-400 dark:text-blue-400 dark:border-blue-600 flex-shrink-0">
                      {task.project_slug}-{task.number}
                    </span>
                  )}
                </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>

    <TaskDetailModal
      task={detail}
      open={!!detail}
      onClose={() => setDetail(null)}
      onEdit={t => { setDetail(null); onEdit(t) }}
      onDelete={id => { setDetail(null); deleteTask(id) }}
      bugs={bugs}
      timeLogs={timeLogs}
    />
    </>
  )
}
