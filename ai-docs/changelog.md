# Velours ERP — AI Docs Changelog

## Phase 5 — Client Flow & Booking Engine (2026-05-22)
- Client self-registration with auto/manual approval per tenant settings
- Client status management API (approve/reject/suspend/reinstate) with status log
- Client profile API with ratings and status history (agent view)
- Booking engine: availability check (3-layer), pricing snapshot, lead time validation
- Booking creation: client_request (pending_worker) and manual (confirmed directly)
- Location types: incall/outcall with address handling (outcall: city-only pre-acceptance)
- Catalog API: public worker listing with tag filtering and widget branding
- Client-facing booking widget at /book/[slug] with age gate, catalog (grid/list/minimal), slot picker
- Widget respects tenant branding (colors, layout, background, fonts)

## Phase 4 — Worker Flow (2026-05-22)
- Worker onboarding wizard: 4-step (Identity, Photos, Services, Schedule)
- Forced password change → onboarding redirect in layout
- Worker profile management page (bio, photos, tags, languages — no approval)
- 3-layer availability: weekly schedule + exceptions/time-off + auto-block
- Availability query API: computes bookable slots from schedule minus exceptions minus bookings
- Booking inbox: pending/upcoming/past tabs, accept/reject with notification stubs
- Post-service rating: 1-5 stars + private note + blacklist flag
- Offline toggle in sidebar: respects tenant offline_behaviour (auto/acknowledge/blocked)
- Worker KPI dashboard with booking stats and earnings
- 8 API routes: profile, schedule, exceptions, bookings, offline, rating, tags, onboarding

## Phase 3 — Onboarding Wizard (2026-05-22)
- 8-step setup wizard with auto-save on step transitions
- Steps: Identity, Financial, Booking Rules, Client Approval, Branding, Templates, Service Tags, Review & Launch
- WCAG AA contrast checking with auto-fix suggestions for brand/widget colors
- Live widget preview with configurable layout (grid/list/minimal), colors, background, font pair
- 8 default notification templates (WhatsApp + email) with inline editing and live preview
- Service tags with optional extra pricing
- DNS TXT domain verification flow
- 13 settings locked after wizard completion via tenant_locked_settings
- API routes: load (resume wizard), save-draft (per-step auto-save), complete (launch), verify-domain (DNS check)

## Phase 2 — Auth & Tenant Routing (2026-05-21)
- Supabase Auth with JWT custom claims (tenant_id, role)
- Tenant resolution middleware with 60s cache
- Role-based routing: agent (full ERP), worker (restricted), client (widget)
- Login page, forced password change for workers (first_login)
- API guard middleware for protected routes
- Role-filtered sidebar navigation
- Wizard redirect for incomplete tenants

## Phase 1 — Supabase Setup & DB Migrations (2026-05-21)
- Initial database schema created (19 tables + 1 view)
- RLS tenant isolation on all tables
- JWT custom claims function for role-based auth
- AI assistant fields added to tenant_settings (ai_assistant_enabled, ai_provider)
- LLM provider support added to tenant_integrations
- /lib/ai/ folder structure scaffolded with adapter interface
- /ai-docs/ placeholder files created
- /app/[slug]/api/assistant/route.ts reserved (501)
