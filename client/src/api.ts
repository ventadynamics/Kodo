import type { Category, Transaction, MonthSummary, Filters, Task, Bug, Project, Workspace, TimeLog, KnowledgePage, Client, ProjectFinance, WorkspaceSettings } from './types'

const BASE = '/api'

export function getToken() { return localStorage.getItem('kodo_token') }
export function setToken(t: string) { localStorage.setItem('kodo_token', t) }
export function clearToken() { localStorage.removeItem('kodo_token') }

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(BASE + path, { headers, ...opts })
  if (res.status === 401) {
    clearToken()
    window.location.href = '/'
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const auth = {
  register: (email: string, password: string) =>
    req<{ token: string; user: { id: number; email: string } }>('/auth/register', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    req<{ token: string; user: { id: number; email: string } }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    }),
  me: () => req<{ id: number; email: string; name: string }>('/auth/me'),
}

export const api = {
  // Finance
  getTransactions: (workspace: Workspace, filters: Partial<Filters> = {}) => {
    const p = new URLSearchParams({ workspace })
    if (filters.month) p.set('month', filters.month)
    if (filters.type) p.set('type', filters.type)
    if (filters.category_id) p.set('category_id', String(filters.category_id))
    if (filters.search) p.set('search', filters.search)
    return req<Transaction[]>(`/transactions?${p}`)
  },
  createTransaction: (data: Omit<Transaction, 'id' | 'category_name' | 'category_color' | 'created_at'>) =>
    req<Transaction>('/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: number, data: Partial<Transaction>) =>
    req<Transaction>(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTransaction: (id: number) => req<void>(`/transactions/${id}`, { method: 'DELETE' }),
  getCategories: (workspace?: Workspace) =>
    req<Category[]>(workspace ? `/categories?workspace=${workspace}` : '/categories'),
  getSummary: (workspace: Workspace) =>
    req<MonthSummary[]>(`/analytics/summary?workspace=${workspace}`),
  getProjectFinance: (project_id: number) =>
    req<ProjectFinance>(`/analytics/project-finance?project_id=${project_id}`),
  getWorkspaceSettings: (workspace: Workspace) =>
    req<WorkspaceSettings>(`/workspace-settings/${workspace}`),
  updateWorkspaceSettings: (workspace: Workspace, data: { starting_balance: number; balance_date: string }) =>
    req<WorkspaceSettings>(`/workspace-settings/${workspace}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Projects
  getProjects: () => req<Project[]>('/projects'),
  createProject: (data: Omit<Project, 'id' | 'created_at' | 'client_name'>) =>
    req<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: number, data: Partial<Project>) =>
    req<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: number) => req<void>(`/projects/${id}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (opts: { workspace?: Workspace; project_id?: number; status?: string } = {}) => {
    const p = new URLSearchParams()
    if (opts.workspace) p.set('workspace', opts.workspace)
    if (opts.project_id) p.set('project_id', String(opts.project_id))
    if (opts.status) p.set('status', opts.status)
    return req<Task[]>(`/tasks?${p}`)
  },
  createTask: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) =>
    req<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: number, data: Partial<Task>) =>
    req<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: number) => req<void>(`/tasks/${id}`, { method: 'DELETE' }),

  // Bugs
  getBugs: (project_id?: number | string, status?: string) => {
    const p = new URLSearchParams()
    if (project_id !== undefined) p.set('project_id', String(project_id))
    if (status) p.set('status', status)
    return req<Bug[]>(`/bugs?${p}`)
  },
  createBug: (data: Omit<Bug, 'id' | 'created_at' | 'updated_at'>) =>
    req<Bug>('/bugs', { method: 'POST', body: JSON.stringify(data) }),
  updateBug: (id: number, data: Partial<Bug>) =>
    req<Bug>(`/bugs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBug: (id: number) => req<void>(`/bugs/${id}`, { method: 'DELETE' }),

  // Time logs
  getTimeLogs: (project_id: number) =>
    req<TimeLog[]>(`/time?project_id=${project_id}`),
  createTimeLog: (data: Omit<TimeLog, 'id' | 'created_at' | 'task_title' | 'task_number'>) =>
    req<TimeLog>('/time', { method: 'POST', body: JSON.stringify(data) }),
  updateTimeLog: (id: number, data: Partial<TimeLog>) =>
    req<TimeLog>(`/time/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTimeLog: (id: number) => req<void>(`/time/${id}`, { method: 'DELETE' }),

  // Knowledge base
  getKnowledgePages: (project_id: number) =>
    req<KnowledgePage[]>(`/knowledge?project_id=${project_id}`),
  createKnowledgePage: (data: Pick<KnowledgePage, 'project_id' | 'title' | 'content'>) =>
    req<KnowledgePage>('/knowledge', { method: 'POST', body: JSON.stringify(data) }),
  updateKnowledgePage: (id: number, data: Partial<Pick<KnowledgePage, 'title' | 'content'>>) =>
    req<KnowledgePage>(`/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteKnowledgePage: (id: number) => req<void>(`/knowledge/${id}`, { method: 'DELETE' }),

  // Users
  getUsers: () => req<{ id: number; email: string; name: string }[]>('/users'),
  updateMe: (name: string) => req<{ id: number; email: string; name: string }>('/users/me', { method: 'PUT', body: JSON.stringify({ name }) }),

  // Clients
  getClients: () => req<Client[]>('/clients'),
  getClient:  (id: number) => req<Client>(`/clients/${id}`),
  createClient: (data: Omit<Client, 'id' | 'created_at' | 'project_count' | 'projects'>) =>
    req<Client>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: number, data: Partial<Omit<Client, 'id' | 'created_at' | 'project_count' | 'projects'>>) =>
    req<Client>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id: number) => req<void>(`/clients/${id}`, { method: 'DELETE' }),
}
