export type Workspace = 'business' | 'home'
export type TransactionType = 'income' | 'expense' | 'milestone'
export type TaskStatus   = 'todo' | 'in_progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high'
export type BugStatus    = 'open' | 'in_progress' | 'resolved' | 'closed'
export type BugPriority  = 'low' | 'medium' | 'high' | 'critical'
export type BugSeverity  = 'trivial' | 'minor' | 'major' | 'critical' | 'blocker'

export interface Category {
  id: number; name: string; type: TransactionType; color: string; icon: string
  workspace: 'business' | 'home' | 'both'
}
export interface Transaction {
  id: number; workspace: Workspace; type: TransactionType; amount: number
  description: string; category_id: number | null; category_name: string | null
  category_color: string | null; project_id: number | null; project_name: string | null
  date: string; note: string | null; created_at: string
}

export interface WorkspaceSettings {
  workspace: string
  starting_balance: number
  balance_date: string
  current_balance: number
}

export interface ProjectFinance {
  revenue: number; costs: number; net: number
}
export interface MonthSummary {
  month: string; income: number; expense: number; milestone: number; balance: number
}
export interface Filters {
  month: string | null; type: TransactionType | null; category_id: number | null; search: string
}
export interface Client {
  id: number; name: string; company: string | null; email: string | null
  phone: string | null; notes: string | null; created_at: string
  project_count?: number; projects?: Project[]
}

export interface Project {
  id: number; name: string; color: string; icon: string; slug: string
  client_id: number | null; client_name: string | null; created_at: string
}
export interface Task {
  id: number; workspace: Workspace; title: string; description: string | null
  status: TaskStatus; priority: TaskPriority; project_id: number | null
  due_date: string | null; assignee: string | null; created_at: string; updated_at: string
  number: number; project_slug: string | null
}
export interface TimeLog {
  id: number; project_id: number; task_id: number | null
  task_title: string | null; task_number: number | null
  description: string; minutes: number; date: string; created_at: string
}

export interface KnowledgePage {
  id: number; project_id: number; title: string; content: string
  created_at: string; updated_at: string
}

export interface Bug {
  id: number; title: string; description: string | null; status: BugStatus
  priority: BugPriority; severity: BugSeverity; assignee: string | null
  project_id: number | null; task_id: number | null
  task_title: string | null; task_number: number | null
  created_at: string; updated_at: string
  number: number; project_slug: string | null
}
