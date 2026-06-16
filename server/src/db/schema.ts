import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH ?? path.join(__dir, '../../kodo.db')
export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  -- Finance categories
  CREATE TABLE IF NOT EXISTS categories (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    name      TEXT NOT NULL,
    type      TEXT NOT NULL CHECK(type IN ('income','expense','milestone')),
    color     TEXT NOT NULL DEFAULT '#6c757d',
    icon      TEXT NOT NULL DEFAULT 'tag',
    workspace TEXT NOT NULL DEFAULT 'both' CHECK(workspace IN ('business','home','both'))
  );

  -- Transactions — workspace splits business vs home finance
  CREATE TABLE IF NOT EXISTS transactions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace   TEXT NOT NULL DEFAULT 'business' CHECK(workspace IN ('business','home')),
    type        TEXT NOT NULL CHECK(type IN ('income','expense','milestone')),
    amount      REAL NOT NULL CHECK(amount > 0),
    description TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    date        TEXT NOT NULL,
    note        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Projects — business only
  CREATE TABLE IF NOT EXISTS projects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#4263eb',
    icon       TEXT NOT NULL DEFAULT 'folder',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Tasks — workspace='business' requires project_id, workspace='home' has project_id=null
  CREATE TABLE IF NOT EXISTS tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace   TEXT NOT NULL DEFAULT 'business' CHECK(workspace IN ('business','home')),
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','in_progress','done')),
    priority    TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
    project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    due_date    TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Bugs — business only, always tied to a project
  CREATE TABLE IF NOT EXISTS bugs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed')),
    priority    TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','critical')),
    severity    TEXT NOT NULL DEFAULT 'minor' CHECK(severity IN ('trivial','minor','major','critical','blocker')),
    assignee    TEXT,
    project_id  INTEGER REFERENCES projects(id) ON DELETE SET NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_tx_workspace  ON transactions(workspace);
  CREATE INDEX IF NOT EXISTS idx_tx_date       ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_tasks_ws      ON tasks(workspace);
  CREATE INDEX IF NOT EXISTS idx_tasks_proj    ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_bugs_proj     ON bugs(project_id);

  CREATE TABLE IF NOT EXISTS time_logs (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    task_id     INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    minutes     INTEGER NOT NULL CHECK(minutes > 0),
    date        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_time_proj ON time_logs(project_id);
  CREATE INDEX IF NOT EXISTS idx_time_date ON time_logs(date);

  CREATE TABLE IF NOT EXISTS knowledge_pages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    content    TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_wiki_proj ON knowledge_pages(project_id);

  CREATE TABLE IF NOT EXISTS clients (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    company    TEXT,
    email      TEXT,
    phone      TEXT,
    notes      TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

  CREATE TABLE IF NOT EXISTS workspace_settings (
    workspace       TEXT PRIMARY KEY CHECK(workspace IN ('business','home')),
    starting_balance REAL NOT NULL DEFAULT 0,
    balance_date    TEXT NOT NULL DEFAULT (date('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

// ── Migrate existing tables ──────────────────────────────
;[
  "ALTER TABLE projects ADD COLUMN slug TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE projects ADD COLUMN client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL",
  "ALTER TABLE bugs ADD COLUMN number INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE tasks ADD COLUMN number INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE tasks ADD COLUMN assignee TEXT",
  "ALTER TABLE categories ADD COLUMN workspace TEXT NOT NULL DEFAULT 'both' CHECK(workspace IN ('business','home','both'))",
  "ALTER TABLE time_logs ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL",
  "ALTER TABLE transactions ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL",
  "ALTER TABLE users ADD COLUMN name TEXT",
].forEach(sql => { try { db.exec(sql) } catch { /* column already exists */ } })

// ── Seed categories ───────────────────────────────────────
const catCount = (db.prepare('SELECT COUNT(*) as n FROM categories').get() as { n: number }).n
if (catCount === 0) {
  const c = db.prepare('INSERT INTO categories (name, type, color, workspace) VALUES (?, ?, ?, ?)')
  db.transaction(() => {
    // Бизнес: доходы
    c.run('Фриланс / проекты',    'income',    '#1971c2', 'business')
    c.run('Продажа продукта',     'income',    '#0ca678', 'business')
    c.run('Реклама / спонсорство','income',    '#7048e8', 'business')
    c.run('Консультации',         'income',    '#1864ab', 'business')
    // Бизнес: расходы
    c.run('Подписки / SaaS',      'expense',   '#e03131', 'business')
    c.run('Инфраструктура',       'expense',   '#d9480f', 'business')
    c.run('Реклама',              'expense',   '#c2255c', 'business')
    c.run('Обучение',             'expense',   '#862e9c', 'business')
    c.run('Налоги',               'expense',   '#5c7cfa', 'business')
    c.run('Оборудование',         'expense',   '#495057', 'business')
    // Бизнес: майлстоуны
    c.run('Финансовая цель',      'milestone', '#2f9e44', 'business')
    c.run('Запуск продукта',      'milestone', '#f08c00', 'business')
    c.run('Первый клиент',        'milestone', '#1971c2', 'business')
    // Личные: доходы
    c.run('Зарплата',             'income',    '#2f9e44', 'home')
    c.run('Инвестиции',           'income',    '#0ca678', 'home')
    c.run('Подработка',           'income',    '#1971c2', 'home')
    c.run('Возврат средств',      'income',    '#868e96', 'home')
    // Личные: расходы
    c.run('Продукты',             'expense',   '#e03131', 'home')
    c.run('Кафе и рестораны',     'expense',   '#f03e3e', 'home')
    c.run('Транспорт',            'expense',   '#d9480f', 'home')
    c.run('ЖКХ',                  'expense',   '#862e9c', 'home')
    c.run('Связь',                'expense',   '#5c7cfa', 'home')
    c.run('Здоровье',             'expense',   '#f08c00', 'home')
    c.run('Спорт',                'expense',   '#0ca678', 'home')
    c.run('Развлечения',          'expense',   '#c2255c', 'home')
    c.run('Одежда',               'expense',   '#7048e8', 'home')
    c.run('Подписки',             'expense',   '#495057', 'home')
    // Личные: майлстоуны
    c.run('Накопления',           'milestone', '#2f9e44', 'home')
    c.run('Крупная покупка',      'milestone', '#f08c00', 'home')
  })()
}

// ── Seed projects ─────────────────────────────────────────
const projCount = (db.prepare('SELECT COUNT(*) as n FROM projects').get() as { n: number }).n
if (projCount === 0) {
  const p = db.prepare('INSERT INTO projects (name, color, icon) VALUES (?, ?, ?)')
  db.transaction(() => {
    p.run('Основной',  '#1971c2', 'briefcase')
    p.run('Сайдпроект', '#7048e8', 'code-2')
  })()
}
