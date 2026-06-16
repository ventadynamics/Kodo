# Kodo

Personal project and finance management for indie developers.

> **Early stage** — Kodo is currently in deep testing and active development. APIs, UI, and data structures may change. Not recommended for production use yet.

Kodo is a self-hosted, open-source workspace built for solo developers and small indie teams who want one place to manage projects, tasks, finances, and time — without subscriptions or third-party data storage.

---

## Features

### Business workspace
- **Projects** — track multiple projects with color labels, slugs, and partner assignments
- **Tasks** — task list with priorities, due dates, and assignees
- **Bugs** — bug tracker linked to tasks and projects
- **Time tracking** — log hours manually or via a live timer; splits across midnight automatically
- **Finance** — income/expense/milestone tracking with categories, monthly summaries, and per-project breakdown
- **Partners** — manage clients and partners, link them to projects
- **Knowledge base** — per-project wiki pages

### Personal workspace
- **Home finance** — separate ledger for personal income and expenses
- **Home tasks** — personal to-do list independent of projects

### General
- **Starting balance** — set a balance anchor date so current balance stays accurate even with historical entries
- **Dark / light theme**
- **Self-hosted** — your data stays on your server in a single SQLite file
- **Single-command deploy** via Docker

---

## Self-hosting

### Docker

```bash
docker run -d \
  -p 3000:3000 \
  -v kodo_data:/data \
  -e JWT_SECRET=your_secret_here \
  -e DB_PATH=/data/kodo.db \
  ghcr.io/ventadynamics/kodo:latest
```

Open `http://localhost:3000` and register your account.

### Docker Compose

```yaml
services:
  kodo:
    image: ghcr.io/ventadynamics/kodo:latest
    ports:
      - "3000:3000"
    volumes:
      - kodo_data:/data
    environment:
      JWT_SECRET: change_this_secret
      DB_PATH: /data/kodo.db

volumes:
  kodo_data:
```

### Coolify / Railway / Render

Point to this repo, set `JWT_SECRET` env variable, add a persistent volume at `/data`.

---

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v3, shadcn/ui |
| Backend | Node.js, Express, better-sqlite3 |
| Database | SQLite (WAL mode) |
| Auth | JWT + bcrypt |
| Deploy | Docker multi-stage build |

---

## Local development

```bash
git clone https://github.com/ventadynamics/Kodo.git
cd Kodo

cd server && npm install
cd ../client && npm install

# Terminal 1
cd server && npm run dev   # runs on :3001

# Terminal 2
cd client && npm run dev   # runs on :5173
```

---

## Roadmap

- [ ] Multi-user support with roles
- [ ] Recurring transactions
- [ ] Invoice generation
- [ ] Mobile-friendly layout
- [ ] Public demo instance
- [ ] Screenshots and video walkthrough

---

## License

MIT — free to use, fork, and self-host.

