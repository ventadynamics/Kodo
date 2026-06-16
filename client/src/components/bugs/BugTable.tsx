import { useState } from 'react'
import { Minus, ChevronUp, ChevronsUp, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Bug, BugStatus, BugPriority } from '@/types'
import { api } from '@/api'
import { useQueryClient } from '@tanstack/react-query'
import { BugDetailModal } from './BugDetailModal'

const STATUS_META: Record<BugStatus, { label: string; color: string; border: string }> = {
  open:        { label: 'Открыто',    color: '#c92a2a', border: '#ffa8a8' },
  in_progress: { label: 'В работе',   color: '#1864ab', border: '#74c0fc' },
  resolved:    { label: 'Исправлено', color: '#2b8a3e', border: '#8ce99a' },
  closed:      { label: 'Закрыто',    color: '#868e96', border: '#ced4da' },
}

const PRIORITY_META: Record<BugPriority, { Icon: typeof Minus; color: string }> = {
  low:      { Icon: Minus,       color: '#868e96' },
  medium:   { Icon: ChevronUp,   color: '#f08c00' },
  high:     { Icon: ChevronsUp,  color: '#e03131' },
  critical: { Icon: AlertCircle, color: '#c92a2a' },
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

interface Props {
  bugs: Bug[]
  onEdit: (b: Bug) => void
  queryKey: unknown[]
}

export function BugTable({ bugs, onEdit, queryKey }: Props) {
  const client = useQueryClient()
  const [detail, setDetail] = useState<Bug | null>(null)

  if (bugs.length === 0) {
    return (
      <div className="bg-card border border-border/60 rounded-lg p-16 text-center text-muted-foreground text-sm">
        Нет проблем — хорошая работа
      </div>
    )
  }

  const deleteBug = (id: number) => {
    if (!confirm('Удалить проблему?')) return
    client.setQueryData<Bug[]>(queryKey, old => old?.filter(b => b.id !== id))
    api.deleteBug(id).then(() => client.invalidateQueries({ queryKey }))
  }

  return (
    <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
      {bugs.map((bug, i) => {
        const sm = STATUS_META[bug.status]
        const pm = PRIORITY_META[bug.priority]
        const { Icon } = pm
        const closed = bug.status === 'closed'

        return (
          <div
            key={bug.id}
            onClick={() => setDetail(bug)}
            className={cn(
              'flex items-center gap-3 px-4 h-[52px] cursor-pointer hover:bg-muted/20 transition-colors',
              i > 0 && 'border-t border-border/50'
            )}
          >
            {/* Title */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <p className={cn(
                'min-w-0 text-sm font-medium truncate',
                closed && 'line-through text-muted-foreground'
              )}>
                {bug.title}
              </p>
            </div>

            {/* Right cluster */}
            <div className="flex items-center gap-2.5 flex-shrink-0">
              {/* Issue key (Jira-style) */}
              {bug.project_slug && bug.number > 0 && (
                <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-transparent text-blue-600 border border-blue-400 dark:text-blue-400 dark:border-blue-600 flex-shrink-0">
                  {bug.project_slug}-{bug.number}
                </span>
              )}

              {/* Status + priority icon */}
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border-[0.5px] whitespace-nowrap bg-transparent"
                  style={{ color: sm.color, borderColor: sm.border }}
                >
                  {sm.label}
                </span>
                <Icon size={13} style={{ color: pm.color }} strokeWidth={2.5} />
              </div>

              <div className="w-px h-4 bg-border/50" />

              {/* Assignee */}
              <span className="text-xs text-muted-foreground w-[150px] truncate">
                {bug.assignee ?? <span className="text-border">—</span>}
              </span>

              {/* Date */}
              <span className="text-[11px] text-muted-foreground/70 w-[44px] text-right whitespace-nowrap">
                {fmtDate(bug.created_at)}
              </span>
            </div>
          </div>
        )
      })}

      <BugDetailModal
        bug={detail}
        open={!!detail}
        onClose={() => setDetail(null)}
        onEdit={b => { setDetail(null); onEdit(b) }}
        onDelete={id => { setDetail(null); deleteBug(id) }}
      />
    </div>
  )
}
