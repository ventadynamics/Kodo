import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Mail, Phone, Building2, Pencil, Trash2, FolderOpen, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { api } from '@/api'
import type { Client, Project } from '@/types'

// ── Modal ─────────────────────────────────────────────────────────────────────
function ClientModal({ open, onClose, onSaved, editing }: {
  open: boolean; onClose: () => void
  onSaved: (c: Client) => void; editing?: Client | null
}) {
  const [name,    setName]    = useState('')
  const [company, setCompany] = useState('')
  const [email,   setEmail]   = useState('')
  const [phone,   setPhone]   = useState('')
  const [notes,   setNotes]   = useState('')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (open) {
      setName(editing?.name    ?? '')
      setCompany(editing?.company ?? '')
      setEmail(editing?.email   ?? '')
      setPhone(editing?.phone   ?? '')
      setNotes(editing?.notes   ?? '')
    }
  }, [open, editing])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload = { name: name.trim(), company: company || null, email: email || null, phone: phone || null, notes: notes || null }
      const saved = editing
        ? await api.updateClient(editing.id, payload)
        : await api.createClient(payload)
      onSaved(saved); onClose()
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? 'Редактировать партнёра' : 'Новый партнёр'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col gap-1.5">
            <Label>Имя / Название *</Label>
            <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Иван Иванов" className="h-9" autoFocus />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Компания</Label>
            <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="ООО Рога и Копыта" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="mail@example.com" className="h-9" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Телефон</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+375 29 000 00 00" className="h-9" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Заметки</Label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Дополнительная информация..."
              className="w-full h-20 px-3 py-2 text-sm border border-input rounded-md resize-none outline-none focus:ring-1 focus:ring-ring bg-transparent" />
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

// ── Detail panel ──────────────────────────────────────────────────────────────
function ClientDetail({ client, onEdit, onDelete, onClose: _onClose, onProjectClick }: {
  client: Client; onEdit: () => void; onDelete: () => void; onClose: () => void
  onProjectClick: (p: Project) => void
}) {
  const { data } = useQuery({
    queryKey: ['client', client.id],
    queryFn: () => api.getClient(client.id),
  })
  const full = data ?? client

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold">{full.name}</h2>
        <div className="flex items-center gap-1">
          <button onClick={onEdit}
            className="p-1.5 rounded-md border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors">
            <Pencil size={13} />
          </button>
          <button onClick={onDelete}
            className="p-1.5 rounded-md border border-border/60 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Contacts */}
      {(full.company || full.email || full.phone) && (
        <div className="flex flex-col gap-1.5">
          {full.company && (
            <span className="flex items-center gap-2 text-sm">
              <Building2 size={13} className="flex-shrink-0 text-muted-foreground" /> {full.company}
            </span>
          )}
          {full.email && (
            <a href={`mailto:${full.email}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
              <Mail size={13} className="flex-shrink-0 text-muted-foreground" /> {full.email}
            </a>
          )}
          {full.phone && (
            <a href={`tel:${full.phone}`} className="flex items-center gap-2 text-sm hover:underline">
              <Phone size={13} className="flex-shrink-0 text-muted-foreground" /> {full.phone}
            </a>
          )}
        </div>
      )}

      {/* Notes */}
      {full.notes && (
        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border-t border-border/40 pt-3">
          {full.notes}
        </p>
      )}

      {/* Projects */}
      <div className="border-t border-border/40 pt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Проекты</p>
        {full.projects && full.projects.length > 0 ? (
          <div className="flex flex-col gap-1">
            {full.projects.map(p => (
              <button key={p.id} onClick={() => onProjectClick(p)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-muted/40 transition-colors text-left group">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="flex-1 text-sm font-medium">{p.name}</span>
                {p.slug && <span className="text-[10px] font-mono text-muted-foreground/60">{p.slug}</span>}
                <ChevronRight size={13} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Нет привязанных проектов</p>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ClientsPage({ onOpenProject }: { onOpenProject: (p: Project) => void }) {
  const client = useQueryClient()
  const [modalOpen,    setModalOpen]    = useState(false)
  const [editing,      setEditing]      = useState<Client | null>(null)
  const [selected,     setSelected]     = useState<Client | null>(null)

  const queryKey = ['clients']
  const { data: clients = [] } = useQuery({ queryKey, queryFn: api.getClients })

  const upsert = (saved: Client) => {
    client.setQueryData<Client[]>(queryKey, old => {
      if (!old) return [saved]
      const exists = old.some(c => c.id === saved.id)
      return exists ? old.map(c => c.id === saved.id ? saved : c) : [...old, saved]
    })
    client.invalidateQueries({ queryKey: ['client', saved.id] })
    setSelected(saved)
  }

  const deleteClient = async (c: Client) => {
    if (!confirm(`Удалить партнёра "${c.name}"?`)) return
    client.setQueryData<Client[]>(queryKey, old => old?.filter(x => x.id !== c.id))
    if (selected?.id === c.id) setSelected(null)
    api.deleteClient(c.id)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Партнёры</h1>
        <Button size="sm" className="gap-1.5 h-8 text-sm"
          onClick={() => { setEditing(null); setModalOpen(true) }}>
          <Plus size={15} /> Партнёр
        </Button>
      </div>

      <div className="flex gap-4 items-start">
        {/* List */}
        <div className="w-72 flex-shrink-0 bg-card border border-border/60 rounded-lg overflow-hidden">
          {clients.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Нет партнёров.<br />Добавь первого.
            </div>
          ) : clients.map((c, i) => (
            <div key={c.id}
              onClick={() => setSelected(c)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors group',
                i > 0 && 'border-t border-border/50',
                selected?.id === c.id ? 'bg-primary/5' : 'hover:bg-muted/20'
              )}>
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-sm font-semibold text-muted-foreground">
                {c.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.name}</p>
                {c.company && <p className="text-xs text-muted-foreground truncate">{c.company}</p>}
              </div>
              {(c.project_count ?? 0) > 0 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 flex-shrink-0">
                  <FolderOpen size={10} /> {c.project_count}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Detail */}
        {selected ? (
          <div className="flex-1 bg-card border border-border/60 rounded-lg p-5">
            <ClientDetail
              client={selected}
              onEdit={() => { setEditing(selected); setModalOpen(true) }}
              onDelete={() => { deleteClient(selected); setSelected(null) }}
              onClose={() => setSelected(null)}
              onProjectClick={onOpenProject}
            />
          </div>
        ) : (
          <div className="flex-1 bg-card border border-border/60 rounded-lg p-12 text-center text-sm text-muted-foreground">
            Выбери партнёра из списка
          </div>
        )}
      </div>

      <ClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={upsert}
        editing={editing}
      />
    </div>
  )
}
