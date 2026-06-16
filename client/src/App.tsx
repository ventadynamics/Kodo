import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard, CheckSquare, Briefcase, Home, Plus, ChevronDown, ChevronRight,
  FolderOpen, Pencil, Trash2, Square, Users, Sun, Moon, LogOut, UserCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { api, auth, getToken, clearToken } from '@/api'
import { AuthPage } from '@/pages/AuthPage'
import type { Project } from '@/types'
import { FinancePage }    from '@/pages/FinancePage'
import { ProjectPage }    from '@/pages/ProjectPage'
import { HomeTasksPage }  from '@/pages/HomeTasksPage'
import { ClientsPage }    from '@/pages/ClientsPage'
import { TimerProvider, useTimer, fmtElapsed } from '@/contexts/TimerContext'
import { useTheme } from '@/hooks/useTheme'

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } })

// ── Route types ───────────────────────────────────────────────────────────────
type Route =
  | { view: 'business-finance' }
  | { view: 'business-project'; project: Project }
  | { view: 'business-clients' }
  | { view: 'home-finance' }
  | { view: 'home-tasks' }

// ── Project color swatches ────────────────────────────────────────────────────
const COLORS = ['#1971c2','#7048e8','#2f9e44','#e03131','#e67700','#0c8599','#364fc7','#9c36b5']

function autoSlug(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() ?? '').join('').slice(0, 5) || 'P'
}

function ProjectFormModal({
  open, onClose, onSaved, editing,
}: {
  open: boolean
  onClose: () => void
  onSaved: () => void
  editing?: Project | null
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [color, setColor] = useState(COLORS[0])
  const [clientId, setClientId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const qc = useQueryClient()
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: api.getClients })

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '')
      setSlug(editing?.slug ?? '')
      setSlugTouched(!!editing)
      setColor(editing?.color ?? COLORS[0])
      setClientId(editing?.client_id ?? null)
    }
  }, [open, editing])

  const displaySlug = slugTouched ? slug : autoSlug(name)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const finalSlug = displaySlug.toUpperCase() || autoSlug(name)
      const saved = editing
        ? await api.updateProject(editing.id, { name, color, slug: finalSlug, icon: editing.icon, client_id: clientId })
        : await api.createProject({ name, color, icon: '', slug: finalSlug, client_id: clientId })
      // Immediately update projects cache so sidebar + page header reflect changes
      qc.setQueryData<Project[]>(['projects'], old =>
        old ? old.map(p => p.id === saved.id ? saved : p).concat(old.some(p => p.id === saved.id) ? [] : [saved]) : [saved]
      )
      // Invalidate for background sync
      qc.invalidateQueries({ queryKey: ['clients'] })
      if (clientId)           qc.invalidateQueries({ queryKey: ['client', clientId] })
      if (editing?.client_id) qc.invalidateQueries({ queryKey: ['client', editing.client_id] })
      if (editing) {
        qc.invalidateQueries({ queryKey: ['bugs',  editing.id] })
        qc.invalidateQueries({ queryKey: ['tasks', 'business', editing.id] })
      }
      onSaved(); onClose()
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? 'Редактировать проект' : 'Новый проект'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label>Название</Label>
              <Input required value={name} onChange={e => setName(e.target.value)}
                placeholder="Мой проект" className="h-9" autoFocus />
            </div>
            <div className="flex flex-col gap-1.5 w-24">
              <Label>Аббревиатура</Label>
              <Input
                value={displaySlug}
                onChange={e => { setSlug(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setSlugTouched(true) }}
                placeholder="PRJ"
                maxLength={5}
                className="h-9 font-mono uppercase tracking-wider"
              />
            </div>
          </div>
          {clients.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Партнёр</Label>
              <Select value={clientId ? String(clientId) : 'none'} onValueChange={v => setClientId(v === 'none' ? null : Number(v))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="— Без партнёра —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Без партнёра —</SelectItem>
                  {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}{c.company ? ` (${c.company})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Цвет</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className={cn('w-7 h-7 rounded-full transition-all border-2', color === c ? 'border-foreground scale-110' : 'border-transparent')}
                  style={{ background: c }} />
              ))}
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

// ── Timer widget (sidebar) ────────────────────────────────────────────────────
function TimerWidget() {
  const { isRunning, projectName, description, elapsed, stop, cancel } = useTimer()
  if (!isRunning) return null
  return (
    <div className="mx-3 mb-2 border border-primary/30 bg-primary/5 rounded-lg p-3 flex-shrink-0">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span className="text-xs font-semibold text-primary truncate flex-1">{projectName}</span>
        <span className="text-sm font-mono font-semibold text-foreground tabular-nums">{fmtElapsed(elapsed)}</span>
      </div>
      {description && (
        <p className="text-[11px] text-muted-foreground truncate mb-2">{description}</p>
      )}
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline"
          className="flex-1 h-7 text-xs gap-1 border-destructive/40 text-destructive hover:bg-destructive/5"
          onClick={cancel}>
          Отмена
        </Button>
        <Button size="sm"
          className="flex-1 h-7 text-xs gap-1"
          onClick={stop}>
          <Square size={11} className="fill-current" /> Стоп
        </Button>
      </div>
    </div>
  )
}

// ── Profile modal ─────────────────────────────────────────────────────────────
function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const client = useQueryClient()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: auth.me })

  useEffect(() => {
    if (open && me) setName(me.name ?? '')
  }, [open, me])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await api.updateMe(name.trim())
      client.invalidateQueries({ queryKey: ['me'] })
      client.invalidateQueries({ queryKey: ['users'] })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader><DialogTitle>Профиль</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground px-1">{me?.email}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Имя</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-9" autoFocus />
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

// ── Shell ─────────────────────────────────────────────────────────────────────
function Shell({ onLogout }: { onLogout: () => void }) {
  const client = useQueryClient()
  const { theme, toggle: toggleTheme } = useTheme()
  const [route, setRoute] = useState<Route>({ view: 'business-finance' })
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
  })

  // Keep route.project in sync when project data updates (functional updater avoids stale closure)
  useEffect(() => {
    setRoute(r => {
      if (r.view !== 'business-project') return r
      const fresh = projects.find(p => p.id === r.project.id)
      if (!fresh) return r
      return { view: 'business-project', project: fresh }
    })
  }, [projects])

  const refreshProjects = () => client.invalidateQueries({ queryKey: ['projects'] })

  const deleteProject = async (p: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Удалить проект "${p.name}"?`)) return
    client.setQueryData<Project[]>(['projects'], old => old?.filter(p2 => p2.id !== p.id) ?? [])
    api.deleteProject(p.id)
    if (route.view === 'business-project' && route.project.id === p.id) {
      setRoute({ view: 'business-finance' })
    }
  }

  const openEditProject = (p: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingProject(p)
    setProjectModalOpen(true)
  }

  const isActive = (r: Route) => {
    if (r.view !== route.view) return false
    if (r.view === 'business-project' && route.view === 'business-project')
      return r.project.id === route.project.id
    return true
  }

  const navBtn = (r: Route, label: string, Icon: React.ElementType, indent = false) => (
    <button
      onClick={() => setRoute(r)}
      className={cn(
        'kodo-item flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-left w-full group',
        indent ? 'pl-7' : '',
        isActive(r)
          ? 'nav-active'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
      )}
    >
      <Icon size={14} className="flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </button>
  )

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-card border-r border-border/60 flex flex-col sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="px-4 h-14 flex items-center gap-2.5 border-b border-border/60 flex-shrink-0">
          <div className="w-7 h-7 bg-primary rounded flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground font-bold text-sm leading-none">K</span>
          </div>
          <span className="font-semibold text-[15px] tracking-tight">Kodo</span>
        </div>

        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {/* ── БИЗНЕС ── */}
          <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
            Бизнес
          </p>

          {navBtn({ view: 'business-finance' }, 'Финансы', LayoutDashboard)}
          {navBtn({ view: 'business-clients' }, 'Партнёры', Users)}

          {/* Проекты — раскрывающийся пункт */}
          <button
            onClick={() => setProjectsOpen(o => !o)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors w-full',
              route.view === 'business-project'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}
          >
            <FolderOpen size={14} className="flex-shrink-0" />
            <span className="flex-1 text-left">Проекты</span>
            {projectsOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {projectsOpen && (
            <div className="flex flex-col gap-0.5 ml-3 pl-3 border-l border-border/40">
              {projects.map(p => (
                <div key={p.id} className={cn(
                  'kodo-item flex items-center gap-2 px-2 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer group',
                  route.view === 'business-project' && route.project.id === p.id
                    ? 'nav-active'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
                  onClick={() => setRoute({ view: 'business-project', project: p })}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <span className="flex-1 truncate">{p.name}</span>
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => openEditProject(p, e)} className="p-0.5 hover:text-foreground">
                      <Pencil size={10} />
                    </button>
                    <button onClick={e => deleteProject(p, e)} className="p-0.5 hover:text-destructive">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={() => { setEditingProject(null); setProjectModalOpen(true) }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors w-full text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/60"
              >
                <Plus size={13} />
                Новый проект
              </button>
            </div>
          )}

          <div className="border-t border-border/40 my-2" />

          {/* ── ДОМ ── */}
          <p className="px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none">
            Дом
          </p>

          {navBtn({ view: 'home-finance' }, 'Финансы', Home)}
          {navBtn({ view: 'home-tasks' }, 'Задачи', CheckSquare)}
        </nav>

        <TimerWidget />

        <div className="p-3 border-t border-border/40 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground/50 px-2">
            <Briefcase size={12} />
            <span className="flex-1">Kodo v1</span>
            <button onClick={toggleTheme}
              className="p-1 rounded hover:bg-muted/60 hover:text-muted-foreground transition-colors">
              {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <button onClick={() => setProfileOpen(true)} title="Профиль"
              className="p-1 rounded hover:bg-muted/60 hover:text-muted-foreground transition-colors">
              <UserCircle size={13} />
            </button>
            <button onClick={onLogout} title="Выйти"
              className="p-1 rounded hover:bg-muted/60 hover:text-muted-foreground transition-colors">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {route.view === 'business-finance' && <FinancePage key="business" workspace="business" />}
          {route.view === 'business-clients' && <ClientsPage onOpenProject={p => setRoute({ view: 'business-project', project: p })} />}
          {route.view === 'business-project' && <ProjectPage key={route.project.id} project={route.project} />}
          {route.view === 'home-finance'     && <FinancePage key="home" workspace="home" />}
          {route.view === 'home-tasks'       && <HomeTasksPage />}
        </div>
      </main>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Project modal */}
      <ProjectFormModal
        open={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSaved={refreshProjects}
        editing={editingProject}
      />
    </div>
  )
}

function Prefetch() {
  const client = useQueryClient()
  useEffect(() => {
    const prefetch = async () => {
      await Promise.all([
        client.prefetchQuery({ queryKey: ['categories', 'business'], queryFn: () => api.getCategories('business') }),
        client.prefetchQuery({ queryKey: ['categories', 'home'],     queryFn: () => api.getCategories('home') }),
        client.prefetchQuery({ queryKey: ['projects'],                queryFn: api.getProjects }),
        client.prefetchQuery({ queryKey: ['summary', 'business'],     queryFn: () => api.getSummary('business') }),
        client.prefetchQuery({ queryKey: ['summary', 'home'],         queryFn: () => api.getSummary('home') }),
        client.prefetchQuery({ queryKey: ['transactions', 'business', { month: null, type: null, category_id: null, search: '' }],
          queryFn: () => api.getTransactions('business', {}) }),
        client.prefetchQuery({ queryKey: ['transactions', 'home', { month: null, type: null, category_id: null, search: '' }],
          queryFn: () => api.getTransactions('home', {}) }),
        client.prefetchQuery({ queryKey: ['tasks', 'home'],           queryFn: () => api.getTasks({ workspace: 'home' }) }),
      ])
      // Prefetch bugs/tasks for each project after projects load
      const projects = client.getQueryData<{ id: number }[]>(['projects']) ?? []
      await Promise.all(projects.flatMap(p => [
        client.prefetchQuery({ queryKey: ['tasks', 'business', p.id], queryFn: () => api.getTasks({ workspace: 'business', project_id: p.id }) }),
        client.prefetchQuery({ queryKey: ['bugs', p.id],              queryFn: () => api.getBugs(p.id) }),
      ]))
    }
    prefetch()
  }, [])
  return null
}

export default function App() {
  const [authed, setAuthed] = useState(() => !!getToken())

  const handleLogout = () => {
    clearToken()
    qc.clear()
    setAuthed(false)
  }

  if (!authed) return <AuthPage onAuth={() => setAuthed(true)} />

  return (
    <QueryClientProvider client={qc}>
      <TimerProvider>
        <Prefetch />
        <Shell onLogout={handleLogout} />
      </TimerProvider>
    </QueryClientProvider>
  )
}
