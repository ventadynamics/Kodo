import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Pencil, Trash2, Minus, ChevronUp, ChevronsUp, AlertCircle, X, LayoutList } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Bug, BugPriority, BugStatus } from '@/types'

const STATUS_META: Record<BugStatus, { label: string; color: string; border: string }> = {
  open:        { label: 'Открыто',    color: '#c92a2a', border: '#ffa8a8' },
  in_progress: { label: 'В работе',   color: '#1864ab', border: '#74c0fc' },
  resolved:    { label: 'Исправлено', color: '#2b8a3e', border: '#8ce99a' },
  closed:      { label: 'Закрыто',    color: '#868e96', border: '#ced4da' },
}

const PRIORITY_META: Record<BugPriority, { label: string; Icon: typeof Minus; color: string }> = {
  low:      { label: 'Низкий',      Icon: Minus,       color: '#868e96' },
  medium:   { label: 'Средний',     Icon: ChevronUp,   color: '#f08c00' },
  high:     { label: 'Высокий',     Icon: ChevronsUp,  color: '#e03131' },
  critical: { label: 'Критический', Icon: AlertCircle, color: '#c92a2a' },
}


interface Props {
  bug: Bug | null
  open: boolean
  onClose: () => void
  onEdit: (b: Bug) => void
  onDelete: (id: number) => void
  readOnly?: boolean
}

export function BugDetailModal({ bug, open, onClose, onEdit, onDelete, readOnly }: Props) {
  if (!bug) return null
  const sm = STATUS_META[bug.status]
  const pm = PRIORITY_META[bug.priority]
  const { Icon } = pm
  const closed = bug.status === 'closed'

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md [&>button:last-child]:hidden">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                {bug.project_slug && bug.number > 0 && (
                  <span className="self-start text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-transparent text-blue-600 border border-blue-400 dark:text-blue-400 dark:border-blue-600">
                    {bug.project_slug}-{bug.number}
                  </span>
                )}
                <h2 className={cn('text-base font-semibold leading-snug', closed && 'line-through text-muted-foreground')}>
                  {bug.title}
                </h2>
              </div>
              <div className="flex-shrink-0 flex items-center border border-border/60 rounded-md bg-muted/30 overflow-hidden">
                {!readOnly && <>
                  <button onClick={() => { onClose(); onEdit(bug) }}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => { onClose(); onDelete(bug.id) }}
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

            {bug.description && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{bug.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border-[0.5px] bg-transparent"
              style={{ color: sm.color, borderColor: sm.border }}>
              {sm.label}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted"
              style={{ color: pm.color }}>
              <Icon size={12} strokeWidth={2.5} />
              {pm.label}
            </span>
          </div>

          {bug.assignee && (
            <div className="flex flex-col gap-0.5 text-sm">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Исполнитель</span>
              <span className="font-medium">{bug.assignee}</span>
            </div>
          )}

          {bug.task_id && bug.task_title && (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Вызвана задачей</span>
              <span className="inline-flex items-center gap-1.5 self-start px-2.5 py-1 rounded-md text-xs font-medium bg-muted text-muted-foreground">
                <LayoutList size={11} />
                {bug.project_slug && bug.task_number ? `${bug.project_slug}-${bug.task_number} · ` : ''}{bug.task_title}
              </span>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground/60 border-t border-border/40 pt-3">
            Создана: {new Date(bug.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
