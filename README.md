# Velours ERP

> B2B SaaS scheduling and shift management platform for licensed adult services agencies in the Netherlands.

---

## What is Velours?

Velours is a multi-tenant ERP built for agency operators in the licensed adult services industry. It replaces phone-and-WhatsApp-based booking workflows with a structured digital platform — reducing shift management time for agents while giving workers autonomy over their own schedules.

The platform serves three roles:

| Role | What they do |
|---|---|
| **Agent** | Manages workers, approves clients, oversees bookings and finances |
| **Worker** | Manages availability, accepts or rejects bookings, rates clients |
| **Client** | Browses worker catalog, submits booking requests, receives confirmations |

Each agency is an isolated tenant. No data crosses tenant boundaries.

---

## Key Features

- **Hybrid booking flow** — client selects worker and slot, worker confirms or rejects, agent has full calendar oversight
- **Worker availability** — 3-layer model: weekly schedule, exception calendar, auto-blocked confirmed slots
- **Client management** — approval workflow, status lifecycle, blacklist with agent review
- **Finance tracking** — revenue dashboard, worker KPIs, payout splits, BTW/VAT tax tools
- **WhatsApp notifications** — booking confirmations, reminders, declines via Twilio
- **Embeddable booking widget** — drop a script tag onto any existing website
- **Multi-tenant isolation** — Row-Level Security enforced at DB level; each agency owns its own data
- **Onboarding wizard** — guided setup for new agencies with locked compliance settings
- **AI assistant** (Phase 9) — context-aware ERP assistant with live data access and action tools
- **Integrations** — Google Maps address autocomplete, multi-LLM AI (Anthropic / OpenAI), extensible

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS |
| Backend | Next.js API routes |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT with tenant + role claims) |
| WhatsApp | Twilio WhatsApp API |
| Storage | Supabase Storage |
| Hosting | Docker + nginx-proxy-manager on VPS |
| Scheduled jobs | node-cron |

---

## Project Structure

```
/app/[slug]/              — Tenant ERP (agent + worker, role-routed)
/app/[slug]/setup/        — Onboarding wizard
/app/book/[slug]/         — Client-facing booking widget
/components/              — Shared UI components
/lib/supabase/            — DB client + server helpers
/lib/twilio/              — WhatsApp dispatch
/lib/availability/        — 3-layer availability query
/lib/pricing/             — Revenue + payout calculation
/lib/maps/                — Google Maps helpers (graceful degradation)
/lib/calendar/            — Google Calendar URL builder
/lib/ai/                  — AI assistant adapter, tools, docs loader
/ai-docs/                 — Markdown knowledge base for AI assistant
/supabase/migrations/     — All schema migrations
/supabase/seed.sql        — Test data + default templates
```

---

## Local Development

### Prerequisites

- Node.js 20+
- Docker Desktop
- Supabase CLI: `npm install -g supabase`

### Setup

```bash
git clone https://github.com/AMvdBM19/velours
cd velours
npm install
cp .env.example .env.local   # fill in your keys
supabase start
supabase db push
npm run dev
```

Local app: `http://localhost:3000`
Supabase Studio: `http://localhost:54323`

### Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
SUPER_ADMIN_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Deployment

Deployed via Docker on a self-managed VPS behind nginx-proxy-manager.

```bash
# On VPS
cd /opt/docker/velours
git pull origin main
docker compose build --no-cache
docker compose up -d
```

Production URL: `https://app.velours.nl/[agency-slug]`

See [VPS Deployment spec](https://www.notion.so/366895086b0d81d68716dd5d06e83a53) for full Docker and nginx configuration.

---

## Build Phases

| Phase | Description | Status |
|---|---|---|
| 1 | Supabase setup + DB migrations | ⏳ |
| 2 | Auth + tenant middleware | ⏳ |
| 3 | Onboarding wizard | ⏳ |
| 4 | Worker flow | ⏳ |
| 5 | Client flow + booking engine | ⏳ |
| 6 | Agent ERP modules | ⏳ |
| 7 | Super Admin API | ⏳ |
| 8 | Embed widget + DNS verification | ⏳ |
| 9 | AI assistant | ⏳ |

---

## Documentation

Full product specification, architecture decisions, DB schema, and developer reference are maintained in Notion:

| Document | Link |
|---|---|
| Project overview | [notion.so/…](https://www.notion.so/365895086b0d8101b044d3f566a8c0d0) |
| Architecture | [notion.so/…](https://www.notion.so/365895086b0d812c954df43f1b266557) |
| DB schema | [notion.so/…](https://www.notion.so/366895086b0d814985c6fca4a158bd59) |
| Agent ERP reference | [notion.so/…](https://www.notion.so/366895086b0d810f8152dfe85e4c0f59) |
| Worker flow | [notion.so/…](https://www.notion.so/366895086b0d8164a1a0d7cf218c81ef) |
| Onboarding wizard | [notion.so/…](https://www.notion.so/366895086b0d81d1a993ecabd30f4da4) |
| Additional features | [notion.so/…](https://www.notion.so/367895086b0d812ea442e017e059fcb5) |
| AI assistant spec | [notion.so/…](https://www.notion.so/367895086b0d81bfb013f04bc6a302fd) |
| VPS deployment | [notion.so/…](https://www.notion.so/366895086b0d81d68716dd5d06e83a53) |
| Claude Code guide | [notion.so/…](https://www.notion.so/366895086b0d817a863dc8eabd2f7e8c) |

---

## Legal

This platform is built for and used by licensed operators in jurisdictions where adult services are legal and regulated (Netherlands). The platform does not facilitate solicitation, process payments, or host public-facing worker profiles. All tenants are contractually required to hold valid operating licenses where required by their municipality.

---

*Built by [Monoliet](https://monoliet.cloud)*
