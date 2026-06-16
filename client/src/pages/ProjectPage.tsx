import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, LayoutList, Bug, Clock, Timer, BookOpen, TrendingUp, TrendingDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/api'
import type { Bug as BugType, Project, Task, TimeLog } from '@/types'
import { fmtMoney } from '@/lib/fmt'
import { useTimer } from '@/contexts/TimerContext'
import { KnowledgeBase } from '@/components/knowledge/KnowledgeBase'
import { TaskBoard }    from '@/components/tasks/TaskBoard'
import { TaskModal }    from '@/components/tasks/TaskModal'
import { BugTable }     from '@/components/bugs/BugTable'
import { BugModal }     from '@/components/bugs/BugModal'
import { TimeLogList }  from '@/components/time/TimeLogList'
import { TimeLogModal } from '@/components/time/TimeLogModal'

type Tab = 'tasks' | 'bugs' | 'time' | 'wiki'

export function ProjectPage({ project }: { project: Project }) {
  const client = useQueryClient()
  const timer = useTimer()
  const [tab, setTab] = useState<Tab>('tasks')
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [bugModalOpen, setBugModalOpen] = useState(false)
  const [editingBug, setEditingBug] = useState<BugType | null>(null)
  const [timeModalOpen, setTimeModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null)

  const taskKey = ['tasks', 'business', project.id]
  const bugKey  = ['bugs', project.id]
  const timeKey = ['time', project.id]
  const wikiKey = ['wiki', project.id]

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: taskKey,
    queryFn: () => api.getTasks({ workspace: 'business', project_id: project.id }),
  })
  const { data: bugs = [], isLoading: bugsLoading } = useQuery({
    queryKey: bugKey,
    queryFn: () => api.getBugs(project.id),
  })
  const { data: timeLogs = [], isLoading: timeLoading } = useQuery({
    queryKey: timeKey,
    queryFn: () => api.getTimeLogs(project.id),
  })
  const { data: wikiPages = [] } = useQuery({
    queryKey: wikiKey,
    queryFn: () => api.getKnowledgePages(project.id),
  })
  const { data: finance } = useQuery({
    queryKey: ['project-finance', project.id],
    queryFn: () => api.getProjectFinance(project.id),
  })

  const upsert = <T extends { id: number }>(key: unknown[], saved: T) =>
    client.setQueryData<T[]>(key, old => {
      if (!old) return [saved]
      const exists = old.some(x => x.id === saved.id)
      return exists ? old.map(x => x.id === saved.id ? saved : x) : [saved, ...old]
    })

  const onTaskSaved    = (saved: Task)    => upsert(taskKey, saved)
  const onBugSaved     = (saved: BugType) => upsert(bugKey,  saved)
  const onTimeLogSaved = (saved: TimeLog) => upsert(timeKey, saved)

  const TABS = [
    { id: 'tasks' as Tab, label: 'Задачи',   Icon: LayoutList, count: tasks.length },
    { id: 'bugs'  as Tab, label: 'Проблемы', Icon: Bug,       count: bugs.filter(b => b.status === 'open' || b.status === 'in_progress').length },
    { id: 'time'  as Tab, label: 'Время',    Icon: Clock,     count: timeLogs.reduce((s, l) => s + l.minutes, 0) },
    { id: 'wiki'  as Tab, label: 'База знаний', Icon: BookOpen, count: wikiPages.length },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: project.color }} />
          <h1 className="text-lg font-semibold">{project.name}</h1>
        </div>
        <div className="flex gap-2 min-h-8">
          {tab === 'tasks' && (
            <Button size="sm" className="gap-1.5 h-8 text-sm"
              onClick={() => { setEditingTask(null); setTaskModalOpen(true) }}>
              <Plus size={15} /> Задача
            </Button>
          )}
          {tab === 'bugs' && (
            <Button size="sm" className="gap-1.5 h-8 text-sm"
              onClick={() => { setEditingBug(null); setBugModalOpen(true) }}>
              <Plus size={15} /> Проблема
            </Button>
          )}
          {tab === 'time' && (
            <>
              {!timer.isRunning && (
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-sm"
                  onClick={() => timer.start(project.id, project.name, '')}>
                  <Timer size={14} /> Старт
                </Button>
              )}
              {timer.isRunning && timer.projectId === project.id && (
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-sm border-primary/40 text-primary"
                  onClick={() => timer.stop()}>
                  Идёт запись...
                </Button>
              )}
              <Button size="sm" className="gap-1.5 h-8 text-sm"
                onClick={() => { setEditingLog(null); setTimeModalOpen(true) }}>
                <Plus size={15} /> Запись
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Finance summary */}
      {finance && (finance.revenue > 0 || finance.costs > 0) && (
        <div className="flex gap-3">
          {[
            { label: 'Выручка', value: finance.revenue, Icon: TrendingUp, color: '#2f9e44' },
            { label: 'Расходы', value: finance.costs,   Icon: TrendingDown, color: '#e03131' },
            { label: 'Профит',  value: finance.net,     Icon: finance.net >= 0 ? TrendingUp : TrendingDown, color: finance.net >= 0 ? '#2f9e44' : '#e03131' },
          ].map(({ label, value, Icon, color }) => (
            <div key={label} className="flex items-center gap-3 bg-card border border-border/60 rounded-lg p-4 flex-1">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}18` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-[15px] font-semibold tabular-nums" style={{ color }}>
                  {fmtMoney(value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/60">
        {TABS.map(({ id, label, Icon, count }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon size={14} />
            {label}
            <span className={cn(
              'text-[11px] px-1.5 py-0.5 rounded-full font-medium',
              tab === id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            )}>
              {id === 'time'
                ? (() => { const h = Math.floor(count / 60); const m = count % 60; return h > 0 ? `${h}ч${m > 0 ? ` ${m}м` : ''}` : `${m}м` })()
                : count}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'tasks' && (
        tasksLoading
          ? <div className="bg-card border border-border/60 rounded-lg p-16 text-center text-muted-foreground text-sm">Загружаем...</div>
          : <TaskBoard
              tasks={tasks}
              bugs={bugs}
              timeLogs={timeLogs}
              onEdit={t => { setEditingTask(t); setTaskModalOpen(true) }}
              onNew={() => { setEditingTask(null); setTaskModalOpen(true) }}
              queryKey={taskKey}
            />
      )}

      {tab === 'bugs' && (
        bugsLoading
          ? <div className="bg-card border border-border/60 rounded-lg p-16 text-center text-muted-foreground text-sm">Загружаем...</div>
          : <>
              {/* Bug stats */}
              <div className="grid grid-cols-4 gap-3">
                {(['open','in_progress','resolved','closed'] as const).map(s => {
                  const labels = { open: 'Открыто', in_progress: 'В работе', resolved: 'Исправлено', closed: 'Закрыто' }
                  const colors = { open: '#e03131', in_progress: '#1971c2', resolved: '#2f9e44', closed: '#868e96' }
                  const bgs    = { open: '#fff5f5', in_progress: '#e7f5ff', resolved: '#ebfbee', closed: '#f1f3f5' }
                  const n = bugs.filter(b => b.status === s).length
                  return (
                    <div key={s} className="bg-card border border-border/60 rounded-lg p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ background: bgs[s], color: colors[s] }}>
                        {n}
                      </div>
                      <span className="text-sm text-muted-foreground">{labels[s]}</span>
                    </div>
                  )
                })}
              </div>
              <BugTable bugs={bugs} onEdit={b => { setEditingBug(b); setBugModalOpen(true) }} queryKey={bugKey} />
            </>
      )}

      {tab === 'time' && (
        timeLoading
          ? <div className="bg-card border border-border/60 rounded-lg p-16 text-center text-muted-foreground text-sm">Загружаем...</div>
          : <TimeLogList logs={timeLogs} queryKey={timeKey}
              onEdit={log => { setEditingLog(log); setTimeModalOpen(true) }} />
      )}

      {tab === 'wiki' && (
        <KnowledgeBase pages={wikiPages} queryKey={wikiKey} projectId={project.id} />
      )}

      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSaved={onTaskSaved}
        editing={editingTask}
        projectId={project.id}
      />
      <BugModal
        open={bugModalOpen}
        onClose={() => setBugModalOpen(false)}
        onSaved={onBugSaved}
        editing={editingBug}
        projectId={project.id}
      />
      <TimeLogModal
        open={timeModalOpen}
        onClose={() => setTimeModalOpen(false)}
        onSaved={onTimeLogSaved}
        editing={editingLog}
        projectId={project.id}
      />
    </div>
  )
}
