import { useState, useEffect, useRef, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Plus, Pencil, Trash2, FileText, Check, X,
         Bold, Italic, Code, List, Heading1, Heading2, Heading3, Underline as UnderlineIcon,
         Minus, Quote, Search, LayoutList, Bug,
         AlignLeft, AlignCenter, AlignRight, AlignJustify,
         ListOrdered } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/api'
import type { KnowledgePage, Task, Bug as BugType } from '@/types'
import { TaskDetailModal } from '@/components/tasks/TaskDetailModal'
import { BugDetailModal }  from '@/components/bugs/BugDetailModal'

interface Props {
  pages: KnowledgePage[]
  queryKey: unknown[]
  projectId: number
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

// ── Inline reference chips ─────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  todo: '#868e96', in_progress: '#1971c2', done: '#2f9e44',
  open: '#e03131', resolved: '#2f9e44', closed: '#868e96',
}
const DONE_STATUSES = new Set(['done', 'resolved', 'closed'])


// ── Reference picker ──────────────────────────────────────────────────────────
interface PickerProps {
  items: { id: number; label: string }[]
  onSelect: (id: number) => void
  onClose: () => void
  placeholder: string
}
function RefPicker({ items, onSelect, onClose, placeholder }: PickerProps) {
  const [q, setQ] = useState('')
  const filtered = items.filter(i => i.label.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  return (
    <div className="w-72 bg-card border border-border/60 rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40">
        <Search size={13} className="text-muted-foreground" />
        <input className="flex-1 text-sm outline-none bg-transparent"
          placeholder={placeholder} value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => e.key === 'Escape' && onClose()} />
      </div>
      {filtered.length === 0
        ? <p className="text-xs text-muted-foreground px-3 py-3">Ничего не найдено</p>
        : filtered.map(i => (
          <button key={i.id}
            onMouseDown={e => { e.preventDefault(); onSelect(i.id); onClose() }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-muted/40 transition-colors truncate">
            {i.label}
          </button>
        ))
      }
    </div>
  )
}

// ── Read-only page viewer ──────────────────────────────────────────────────────
interface ViewerProps {
  content: string
  tasks: Task[]
  bugs: BugType[]
  onOpenTask: (t: Task) => void
  onOpenBug: (b: BugType) => void
}

function PageViewer({ content, tasks, bugs, onOpenTask, onOpenBug }: ViewerProps) {
  const ref = useRef<HTMLDivElement>(null)

  const html = useMemo(() =>
    content.replace(/<code>(task|bug):(\d+)<\/code>/gi, (_, kind, id) => {
      const k = kind.toLowerCase()
      if (k === 'task') {
        const t = tasks.find(x => x.id === +id)
        if (!t) return `<code data-chip="task" data-id="${id}" class="kodo-chip kodo-chip-deleted">↗ Задача · недоступно</code>`
        const label = t.project_slug && t.number ? `${t.project_slug}-${t.number}` : t.title
        const color = STATUS_COLOR[t.status]
        const extra = DONE_STATUSES.has(t.status) ? ' kodo-chip-done' : ''
        return `<code data-chip="task" data-id="${id}" class="kodo-chip${extra}" style="color:${color};border-color:${color}40;background:${color}14">↗ ${label}</code>`
      } else {
        const b = bugs.find(x => x.id === +id)
        if (!b) return `<code data-chip="bug" data-id="${id}" class="kodo-chip kodo-chip-deleted">⚑ Проблема · недоступно</code>`
        const label = b.project_slug && b.number ? `${b.project_slug}-${b.number}` : b.title
        const color = STATUS_COLOR[b.status]
        const extra = DONE_STATUSES.has(b.status) ? ' kodo-chip-done' : ''
        return `<code data-chip="bug" data-id="${id}" class="kodo-chip${extra}" style="color:${color};border-color:${color}40;background:${color}14">⚑ ${label}</code>`
      }
    }), [content, tasks, bugs])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handler = (e: MouseEvent) => {
      const chip = (e.target as HTMLElement).closest<HTMLElement>('[data-chip]')
      if (!chip || chip.classList.contains('kodo-chip-deleted')) return
      const kind = chip.dataset.chip
      const id   = parseInt(chip.dataset.id ?? '0')
      if (kind === 'task') { const t = tasks.find(x => x.id === id); if (t) onOpenTask(t) }
      else                 { const b = bugs.find(x => x.id === id);  if (b) onOpenBug(b) }
    }
    el.addEventListener('click', handler)
    return () => el.removeEventListener('click', handler)
  }, [tasks, bugs, onOpenTask, onOpenBug])

  return (
    <div ref={ref} className="md-body px-5 py-4"
      dangerouslySetInnerHTML={{ __html: html }} />
  )
}

// ── WYSIWYG Editor ─────────────────────────────────────────────────────────────
function ToolbarBtn({ active, title, onClick, children }: {
  active?: boolean; title: string; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={cn(
        'p-1.5 rounded text-xs transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      )}
    >
      {children}
    </button>
  )
}

interface EditorProps {
  content: string
  onChange: (markdown: string) => void
  tasks: Task[]
  bugs: BugType[]
  onSave: () => void
}

function WysiwygEditor({ content, onChange, tasks, bugs, onSave }: EditorProps) {
  const [picker, setPicker] = useState<'task' | 'bug' | null>(null)
  const taskBtnRef   = useRef<HTMLDivElement>(null)
  const bugBtnRef    = useRef<HTMLDivElement>(null)
  const pickerOverlayRef = useRef<HTMLDivElement>(null)
  // Track last content we loaded so we don't re-set on every keystroke
  const loadedContent = useRef<string>('')
  // Force re-render on selection change for toolbar active state
  const [, forceUpdate] = useState(0)

  const editor = useEditor({
    extensions: [
      // No Markdown extension here — it intercepts Space after *, -, #, etc.
      // We store HTML, so markdown input rules are unwanted.
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: { class: 'outline-none min-h-[300px] px-5 py-4 text-sm leading-relaxed' },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML()
      // Keep ref in sync so useEffect doesn't re-set content and jump cursor
      loadedContent.current = html
      onChange(html)
    },
    onSelectionUpdate() {
      // Re-render toolbar so active states reflect cursor position
      forceUpdate(n => n + 1)
    },
  })

  // Load content only when the page changes (not on every keystroke)
  useEffect(() => {
    if (!editor || loadedContent.current === content) return
    loadedContent.current = content
    editor.commands.setContent(content || '')
  }, [editor, content])

  useEffect(() => {
    if (!picker) return
    const handler = (e: MouseEvent) => {
      const btnRef = picker === 'task' ? taskBtnRef : bugBtnRef
      const inBtn     = btnRef.current?.contains(e.target as Node)
      const inOverlay = pickerOverlayRef.current?.contains(e.target as Node)
      if (!inBtn && !inOverlay) setPicker(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [picker])

  const insertRef = (type: 'task' | 'bug', id: number) => {
    editor?.chain().focus().insertContent({
      type: 'text',
      text: `${type}:${id}`,
      marks: [{ type: 'code' }],
    }).run()
    setPicker(null)
  }

  if (!editor) return null

  const e = editor
  const curAlign = e.isActive({ textAlign: 'center' }) ? 'center'
    : e.isActive({ textAlign: 'right' }) ? 'right'
    : e.isActive({ textAlign: 'justify' }) ? 'justify'
    : 'left'

  return (
    <div className="flex flex-col flex-1 min-h-0 relative">
      {/* Toolbar */}
      <div className="px-3 py-1.5 border-b border-border/40 flex items-center gap-0.5 flex-wrap">
        <ToolbarBtn title="H1" active={e.isActive('heading', { level: 1 })} onClick={() => e.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={14} /></ToolbarBtn>
        <ToolbarBtn title="H2" active={e.isActive('heading', { level: 2 })} onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={14} /></ToolbarBtn>
        <ToolbarBtn title="H3" active={e.isActive('heading', { level: 3 })} onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={14} /></ToolbarBtn>

        <div className="w-px h-4 bg-border/60 mx-1 flex-shrink-0" />

        <ToolbarBtn title="Жирный"       active={e.isActive('bold')}      onClick={() => e.chain().focus().toggleBold().run()}><Bold size={14} /></ToolbarBtn>
        <ToolbarBtn title="Курсив"       active={e.isActive('italic')}    onClick={() => e.chain().focus().toggleItalic().run()}><Italic size={14} /></ToolbarBtn>
        <ToolbarBtn title="Подчёркнутый" active={e.isActive('underline')} onClick={() => e.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} /></ToolbarBtn>
        <ToolbarBtn title="Код"          active={e.isActive('code')}      onClick={() => e.chain().focus().toggleCode().run()}><Code size={14} /></ToolbarBtn>

        <div className="w-px h-4 bg-border/60 mx-1 flex-shrink-0" />

        <ToolbarBtn title="Список"       active={e.isActive('bulletList')}  onClick={() => e.chain().focus().toggleBulletList().run()}><List size={14} /></ToolbarBtn>
        <ToolbarBtn title="Нумерованный" active={e.isActive('orderedList')} onClick={() => e.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></ToolbarBtn>
        <ToolbarBtn title="Цитата"       active={e.isActive('blockquote')}  onClick={() => e.chain().focus().toggleBlockquote().run()}><Quote size={14} /></ToolbarBtn>
        <ToolbarBtn title="Разделитель"  active={false}                     onClick={() => e.chain().focus().setHorizontalRule().run()}><Minus size={14} /></ToolbarBtn>

        <div className="w-px h-4 bg-border/60 mx-1 flex-shrink-0" />

        <ToolbarBtn title="По левому краю"  active={curAlign === 'left'}    onClick={() => e.chain().focus().setTextAlign('left').run()}><AlignLeft size={14} /></ToolbarBtn>
        <ToolbarBtn title="По центру"       active={curAlign === 'center'}  onClick={() => e.chain().focus().setTextAlign('center').run()}><AlignCenter size={14} /></ToolbarBtn>
        <ToolbarBtn title="По правому краю" active={curAlign === 'right'}   onClick={() => e.chain().focus().setTextAlign('right').run()}><AlignRight size={14} /></ToolbarBtn>
        <ToolbarBtn title="По ширине"       active={curAlign === 'justify'} onClick={() => e.chain().focus().setTextAlign('justify').run()}><AlignJustify size={14} /></ToolbarBtn>

        <div className="flex-1" />

        {/* Кнопки пикеров — прижаты к правой стенке */}
        <div ref={taskBtnRef} className="flex-shrink-0">
          <button
            type="button"
            title="Ссылка на задачу"
            onMouseDown={ev => { ev.preventDefault(); setPicker(p => p === 'task' ? null : 'task') }}
            className={cn('flex items-center gap-1 px-1.5 py-1 rounded text-xs transition-colors',
              picker === 'task' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}>
            <LayoutList size={13} /> Задача
          </button>
        </div>
        <div ref={bugBtnRef} className="flex-shrink-0">
          <button
            type="button"
            title="Ссылка на проблему"
            onMouseDown={ev => { ev.preventDefault(); setPicker(p => p === 'bug' ? null : 'bug') }}
            className={cn('flex items-center gap-1 px-1.5 py-1 rounded text-xs transition-colors',
              picker === 'bug' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
            )}>
            <Bug size={13} /> Проблема
          </button>
        </div>
      </div>

      {/* Пикеры — оверлей поверх редактора, прибит к правой стенке */}
      {(picker === 'task' || picker === 'bug') && (
        <div ref={pickerOverlayRef} className="absolute top-10 right-0 z-50">
          {picker === 'task'
            ? <RefPicker placeholder="Поиск задачи..." items={tasks.map(t => ({ id: t.id, label: t.title }))}
                onClose={() => setPicker(null)} onSelect={id => insertRef('task', id)} />
            : <RefPicker placeholder="Поиск проблемы..." items={bugs.map(b => ({ id: b.id, label: b.title }))}
                onClose={() => setPicker(null)} onSelect={id => insertRef('bug', id)} />
          }
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 overflow-y-auto" onKeyDown={ev => { if (ev.key === 's' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); onSave() } }}>
        <EditorContent editor={editor} className="wysiwyg-editor h-full" />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function KnowledgeBase({ pages, queryKey, projectId }: Props) {
  const client = useQueryClient()
  const [selected, setSelected] = useState<KnowledgePage | null>(null)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [openTask, setOpenTask] = useState<Task | null>(null)
  const [openBug,  setOpenBug]  = useState<BugType | null>(null)

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'business', projectId],
    queryFn: () => api.getTasks({ workspace: 'business', project_id: projectId }),
  })
  const { data: bugs = [] } = useQuery({
    queryKey: ['bugs', projectId],
    queryFn: () => api.getBugs(projectId),
  })

  const filteredPages = search.trim()
    ? pages.filter(p =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.content.toLowerCase().includes(search.toLowerCase())
      )
    : pages

  useEffect(() => {
    setSelected(sel => {
      if (!sel) return sel
      const fresh = pages.find(p => p.id === sel.id)
      return fresh ?? sel
    })
  }, [pages])

  const upsert = (saved: KnowledgePage) => {
    client.setQueryData<KnowledgePage[]>(queryKey, old => {
      if (!old) return [saved]
      const exists = old.some(p => p.id === saved.id)
      return exists ? old.map(p => p.id === saved.id ? saved : p) : [saved, ...old]
    })
    setSelected(saved)
  }

  const createPage = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const saved = await api.createKnowledgePage({ project_id: projectId, title: newTitle.trim(), content: '' })
      upsert(saved)
      setCreating(false)
      setNewTitle('')
      startEdit(saved)
    } finally { setSaving(false) }
  }

  const startEdit = (page: KnowledgePage) => {
    setEditTitle(page.title)
    setEditContent(page.content)
    setEditing(true)
  }

  const saveEdit = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const saved = await api.updateKnowledgePage(selected.id, {
        title: editTitle.trim() || selected.title,
        content: editContent,
      })
      upsert(saved)
      setEditing(false)
    } finally { setSaving(false) }
  }

  const deletePage = async (page: KnowledgePage) => {
    if (!confirm(`Удалить страницу "${page.title}"?`)) return
    client.setQueryData<KnowledgePage[]>(queryKey, old => old?.filter(p => p.id !== page.id))
    if (selected?.id === page.id) setSelected(null)
    api.deleteKnowledgePage(page.id).then(() => client.invalidateQueries({ queryKey }))
  }

  return (
    <div className="flex bg-card border border-border/60 rounded-lg overflow-hidden" style={{ minHeight: 480 }}>
      {/* Sidebar */}
      <div className="w-60 flex-shrink-0 border-r border-border/60 flex flex-col">
        <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2">
          <Search size={13} className="text-muted-foreground flex-shrink-0" />
          <input
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-muted-foreground/50"
            placeholder="Поиск по страницам"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button
            onClick={() => { setCreating(true); setTimeout(() => document.getElementById('new-page-input')?.focus(), 50) }}
            className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <Plus size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {creating && (
            <div className="px-3 py-2 border-b border-border/40">
              <input
                id="new-page-input"
                className="w-full text-sm bg-transparent outline-none border-b border-primary pb-0.5"
                placeholder="Название страницы"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createPage()
                  if (e.key === 'Escape') { setCreating(false); setNewTitle('') }
                }}
              />
            </div>
          )}

          {filteredPages.length === 0 && !creating && (
            <div className="p-4 text-xs text-muted-foreground text-center mt-4">
              {search ? 'Ничего не найдено' : 'Нет страниц.\nНажми + чтобы создать.'}
            </div>
          )}

          {filteredPages.map(page => (
            <div
              key={page.id}
              onClick={() => { setSelected(page); setEditing(false) }}
              className={cn(
                'group flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors border-b border-border/30',
                selected?.id === page.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/30 text-foreground'
              )}
            >
              <FileText size={13} className="flex-shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm truncate">{page.title}</span>
              <button
                onClick={e => { e.stopPropagation(); deletePage(page) }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-destructive transition-all">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Выбери страницу или создай новую
          </div>
        ) : editing ? (
          <>
            {/* Edit header */}
            <div className="px-4 py-2.5 border-b border-border/60 flex items-center gap-3">
              <input
                className="flex-1 text-base font-semibold bg-transparent outline-none border-b border-primary pb-0.5"
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
              />
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1"
                  onClick={() => setEditing(false)}>
                  <X size={12} /> Отмена
                </Button>
                <Button size="sm" className="h-7 px-2.5 text-xs gap-1"
                  onClick={saveEdit} disabled={saving}>
                  <Check size={12} /> Сохранить
                </Button>
              </div>
            </div>

            <WysiwygEditor
              content={editContent}
              onChange={setEditContent}
              tasks={tasks}
              bugs={bugs}
              onSave={saveEdit}
            />
          </>
        ) : (
          <>
            {/* View header */}
            <div className="px-5 py-2.5 border-b border-border/60 flex items-center gap-3 min-h-[46px]">
              <h2 className="flex-1 text-base font-semibold truncate">{selected.title}</h2>
              <span className="text-xs text-muted-foreground flex-shrink-0">{fmtDate(selected.updated_at)}</span>
              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs gap-1 flex-shrink-0"
                onClick={() => startEdit(selected)}>
                <Pencil size={12} /> Редактировать
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selected.content ? (
                <PageViewer
                  content={selected.content}
                  tasks={tasks}
                  bugs={bugs}
                  onOpenTask={setOpenTask}
                  onOpenBug={setOpenBug}
                />
              ) : (
                <div className="px-5 py-4 text-sm text-muted-foreground">
                  Страница пустая.{' '}
                  <button className="text-primary hover:underline" onClick={() => startEdit(selected)}>
                    Начать писать
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Reference modals */}
      <TaskDetailModal task={openTask} open={!!openTask} onClose={() => setOpenTask(null)} onEdit={() => {}} onDelete={() => {}} readOnly />
      <BugDetailModal  bug={openBug}  open={!!openBug}  onClose={() => setOpenBug(null)}  onEdit={() => {}} onDelete={() => {}} readOnly />
    </div>
  )
}
