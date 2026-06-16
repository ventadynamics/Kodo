import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useState } from 'react'
import { Pencil, Trash2, Calendar, Flag, Circle, Loader, CheckCircle2, X, User, Bug, Clock, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Bug as BugType, BugStatus, Task, TaskStatus, TimeLog } from '@/types'

function fmtDuration(m: number) {
  const h = Math.floor(m / 60); const min = m % 60
  if (h === 0) return `${min}м`
  if (min === 0) return `${h}ч`
  return `${h}ч ${min}м`
}

const BUG_STATUS_COLOR: Record<BugStatus, { color: string; border: string; label: string }> = {
  open:        { color: '#c92a2a', border: '#ffa8a8', label: 'Открыто' },
  in_progress: { color: '#1864ab', border: '#74c0fc', label: 'В работе' },
  resolved:    { color: '#2b8a3e', border: '#8ce99a', label: 'Исправлено' },
  closed:      { color: '#868e96', border: '#ced4da', label: 'Закрыто' },
}

const STATUS_META: Record<TaskStatus, { label: string; Icon: typeof Circle; color: string; border: string }> = {
  todo:        { label: 'К выполнению', Icon: Circle,       color: '#6c757d', border: '#ced4da' },
  in_progress: { label: 'В работе',     Icon: Loader,       color: '#1971c2', border: '#74c0fc' },
  done:        { label: 'Готово',        Icon: CheckCircle2, color: '#2f9e44', border: '#8ce99a' },
}

const PRIORITY_META = {
  low:    { label: 'Низкий',  color: '#6c757d' },
  medium: { label: 'Средний', color: '#f08c00' },
  high:   { label: 'Высокий', color: '#e03131' },
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

function isOverdue(d: string | null, status: TaskStatus) {
  if (!d || status === 'done') return false
  return new Date(d) < new Date(new Date().toDateString())
}

interface Props {
  task: Task | null
  open: boolean
  onClose: () => void
  onEdit: (t: Task) => void
  onDelete: (id: number) => void
  readOnly?: boolean
  bugs?: BugType[]
  timeLogs?: TimeLog[]
}

export function TaskDetailModal({ task, open, onClose, onEdit, onDelete, readOnly, bugs = [], timeLogs = [] }: Props) {
  const [timeExpanded, setTimeExpanded] = useState(false)
  if (!task) return null
  const sm = STATUS_META[task.status]
  const pm = PRIORITY_META[task.priority]
  const { Icon } = sm
  const overdue = isOverdue(task.due_date, task.status)
  const linkedBugs = bugs.filter(b => b.task_id === task.id)
  const linkedLogs = timeLogs.filter(l => l.task_id === task.id)
  const totalMinutes = linkedLogs.reduce((s, l) => s + l.minutes, 0)

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md [&>button:last-child]:hidden">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                {task.project_slug && task.number > 0 && (
                  <span className="self-start text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-transparent text-blue-600 border border-blue-400 dark:text-blue-400 dark:border-blue-600">
                    {task.project_slug}-{task.number}
                  </span>
                )}
                <h2 className="text-base font-semibold leading-snug">{task.title}</h2>
              </div>
              <div className="flex-shrink-0 flex items-center border border-border/60 rounded-md bg-muted/30 overflow-hidden">
                {!readOnly && <>
                  <button onClick={() => { onClose(); onEdit(task) }}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => { onClose(); onDelete(task.id) }}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted/60 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </>}
                <DialogPrimitive.Close
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                  <X size={13} />
                </DialogPrimitive.Close>
              </div>
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border-[0.5px] bg-transparent"
              style={{ color: sm.color, borderColor: sm.border }}>
              <Icon size={12} />
              {sm.label}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted"
              style={{ color: pm.color }}>
              <Flag size={12} />
              {pm.label}
            </span>
            {task.assignee && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                <User size={12} />
                {task.assignee}
              </span>
            )}
            {task.due_date && (
              <span className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium',
                overdue ? 'bg-red-50 text-destructive' : 'bg-muted text-muted-foreground'
              )}>
                <Calendar size={12} />
                {fmtDate(task.due_date)}
                {overdue && ' — просрочено'}
              </span>
            )}
          </div>

          {totalMinutes > 0 && (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => setTimeExpanded(e => !e)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors w-fit"
              >
                {timeExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                <Clock size={11} />
                Затрачено: {fmtDuration(totalMinutes)}
              </button>
              {timeExpanded && (
                <div className="flex flex-col gap-0.5 pl-4 border-l border-border/40 mt-0.5">
                  {linkedLogs.map(l => (
                    <div key={l.id} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate">{l.description}</span>
                      <span className="font-medium text-foreground ml-3 flex-shrink-0">{fmtDuration(l.minutes)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {linkedBugs.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">
                Связанные проблемы ({linkedBugs.length})
              </span>
              <div className="flex flex-col gap-1">
                {linkedBugs.map(b => {
                  const { color, border } = BUG_STATUS_COLOR[b.status]
                  return (
                    <span key={b.id} className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-md text-xs font-medium border-[0.5px]"
                      style={{ color, borderColor: border, background: `${color}10` }}>
                      <Bug size={11} />
                      {b.project_slug && b.number > 0 ? `${b.project_slug}-${b.number} · ` : ''}{b.title}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/60 border-t border-border/40 pt-3">
            Создано: {new Date(task.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
