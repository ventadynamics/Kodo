import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/api'
import type { Task } from '@/types'
import { TaskBoard } from '@/components/tasks/TaskBoard'
import { TaskModal } from '@/components/tasks/TaskModal'

export function HomeTasksPage() {
  const client = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const queryKey = ['tasks', 'home']
  const { data: tasks = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => api.getTasks({ workspace: 'home' }),
  })

  const onSaved = (saved: Task) =>
    client.setQueryData<Task[]>(queryKey, old => {
      if (!old) return [saved]
      const exists = old.some(t => t.id === saved.id)
      return exists ? old.map(t => t.id === saved.id ? saved : t) : [saved, ...old]
    })

  const stats = {
    todo:        tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done:        tasks.filter(t => t.status === 'done').length,
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Задачи</h1>
        <Button size="sm" className="gap-1.5 h-8 text-sm"
          onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus size={15} /> Новая задача
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {([
          { label: 'К выполнению', count: stats.todo,        color: '#6c757d', bg: '#f8f9fa' },
          { label: 'В работе',     count: stats.in_progress, color: '#1971c2', bg: '#e7f5ff' },
          { label: 'Готово',       count: stats.done,        color: '#2f9e44', bg: '#ebfbee' },
        ]).map(({ label, count, color, bg }) => (
          <div key={label} className="bg-card border border-border/60 rounded-lg p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: bg, color }}>{count}</div>
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {isLoading
        ? <div className="bg-card border border-border/60 rounded-lg p-16 text-center text-muted-foreground text-sm">Загружаем...</div>
        : <TaskBoard
            tasks={tasks}
            onEdit={t => { setEditing(t); setModalOpen(true) }}
            onNew={() => { setEditing(null); setModalOpen(true) }}
            queryKey={queryKey}
          />
      }

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={onSaved}
        editing={editing}
        projectId={null}
        workspace="home"
      />
    </div>
  )
}
