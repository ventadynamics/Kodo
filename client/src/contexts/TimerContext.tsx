import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'

interface TimerState {
  isRunning: boolean
  projectId: number | null
  projectName: string | null
  description: string
  startedAt: number | null  // timestamp ms
  elapsed: number           // seconds
}

interface TimerContext extends TimerState {
  start: (projectId: number, projectName: string, description: string) => void
  stop: () => Promise<void>
  cancel: () => void
}

const Ctx = createContext<TimerContext | null>(null)

const LS_KEY = 'kodo_timer'

function load(): Omit<TimerState, 'elapsed'> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { isRunning: false, projectId: null, projectName: null, description: '', startedAt: null }
}

function save(s: Omit<TimerState, 'elapsed'>) {
  localStorage.setItem(LS_KEY, JSON.stringify(s))
}

function clear() {
  localStorage.removeItem(LS_KEY)
}

function calcElapsed(startedAt: number | null) {
  if (!startedAt) return 0
  return Math.floor((Date.now() - startedAt) / 1000)
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient()
  const persisted = load()

  const [isRunning, setIsRunning] = useState(persisted.isRunning)
  const [projectId, setProjectId] = useState<number | null>(persisted.projectId)
  const [projectName, setProjectName] = useState<string | null>(persisted.projectName)
  const [description, setDescription] = useState(persisted.description)
  const [startedAt, setStartedAt] = useState<number | null>(persisted.startedAt)
  const [elapsed, setElapsed] = useState(calcElapsed(persisted.startedAt))

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (isRunning && startedAt) {
      setElapsed(calcElapsed(startedAt))
      intervalRef.current = setInterval(() => {
        setElapsed(calcElapsed(startedAt))
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, startedAt])

  const start = useCallback((pid: number, pname: string, desc: string) => {
    const now = Date.now()
    setIsRunning(true)
    setProjectId(pid)
    setProjectName(pname)
    setDescription(desc)
    setStartedAt(now)
    setElapsed(0)
    save({ isRunning: true, projectId: pid, projectName: pname, description: desc, startedAt: now })
  }, [])

  const stop = useCallback(async () => {
    if (!projectId || !startedAt) return
    const now = Date.now()
    const startDate = new Date(startedAt).toISOString().slice(0, 10)
    const stopDate  = new Date(now).toISOString().slice(0, 10)
    setIsRunning(false)
    setStartedAt(null)
    setElapsed(0)
    clear()

    const desc = description || 'Работа'
    const pid = projectId

    if (startDate === stopDate) {
      // Same day — single entry
      const minutes = Math.max(1, Math.round((now - startedAt) / 60_000))
      const saved = await api.createTimeLog({ project_id: pid, description: desc, minutes, date: stopDate, task_id: null })
      client.setQueryData<typeof saved[]>(['time', pid], old => old ? [saved, ...old] : [saved])
    } else {
      // Crossed midnight — split at each day boundary
      const entries: { date: string; ms: number }[] = []
      // Walk day by day from startDate to stopDate
      let cursor = new Date(startedAt)
      cursor.setHours(0, 0, 0, 0)
      cursor.setDate(cursor.getDate() + 1) // first midnight after start

      let prevMs = startedAt
      while (cursor.getTime() <= now) {
        entries.push({ date: new Date(prevMs).toISOString().slice(0, 10), ms: cursor.getTime() - prevMs })
        prevMs = cursor.getTime()
        cursor.setDate(cursor.getDate() + 1)
      }
      entries.push({ date: stopDate, ms: now - prevMs })

      const saved = await Promise.all(
        entries
          .map(e => ({ date: e.date, minutes: Math.round(e.ms / 60_000) }))
          .filter(e => e.minutes >= 1)
          .map(e => api.createTimeLog({ project_id: pid, description: desc, minutes: e.minutes, date: e.date, task_id: null }))
      )
      client.setQueryData<(typeof saved)[number][]>(['time', pid], old => old ? [...saved, ...old] : saved)
    }

    client.invalidateQueries({ queryKey: ['time', pid] })
  }, [projectId, startedAt, description, client])

  const cancel = useCallback(() => {
    setIsRunning(false)
    setStartedAt(null)
    setElapsed(0)
    clear()
  }, [])

  return (
    <Ctx.Provider value={{ isRunning, projectId, projectName, description, startedAt, elapsed, start, stop, cancel }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTimer() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTimer must be used within TimerProvider')
  return ctx
}

export function fmtElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
