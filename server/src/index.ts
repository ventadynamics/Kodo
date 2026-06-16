import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import './db/schema.js'
import authRouter        from './routes/auth.js'
import categoriesRouter  from './routes/categories.js'
import transactionsRouter from './routes/transactions.js'
import analyticsRouter   from './routes/analytics.js'
import projectsRouter    from './routes/projects.js'
import tasksRouter       from './routes/tasks.js'
import bugsRouter        from './routes/bugs.js'
import timeRouter        from './routes/time.js'
import knowledgeRouter   from './routes/knowledge.js'
import clientsRouter          from './routes/clients.js'
import workspaceSettingsRouter from './routes/workspaceSettings.js'
import usersRouter              from './routes/users.js'
import { requireAuth }   from './middleware/auth.js'

const __dir = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

// Public
app.use('/api/auth', authRouter)

// Protected
app.use('/api/categories',    requireAuth, categoriesRouter)
app.use('/api/transactions',  requireAuth, transactionsRouter)
app.use('/api/analytics',     requireAuth, analyticsRouter)
app.use('/api/projects',      requireAuth, projectsRouter)
app.use('/api/tasks',         requireAuth, tasksRouter)
app.use('/api/bugs',          requireAuth, bugsRouter)
app.use('/api/time',          requireAuth, timeRouter)
app.use('/api/knowledge',     requireAuth, knowledgeRouter)
app.use('/api/clients',            requireAuth, clientsRouter)
app.use('/api/workspace-settings', requireAuth, workspaceSettingsRouter)
app.use('/api/users',              requireAuth, usersRouter)

// Serve built client (production)
const publicDir = join(__dir, '../public')
if (existsSync(publicDir)) {
  app.use(express.static(publicDir))
  app.get('*', (_req, res) => res.sendFile(join(publicDir, 'index.html')))
}

const PORT = process.env.PORT ?? 3001
app.listen(PORT, () => console.log(`Server http://localhost:${PORT}`))
