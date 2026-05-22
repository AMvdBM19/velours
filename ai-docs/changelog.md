# Velours ERP — AI Docs Changelog

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
