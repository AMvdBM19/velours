# Velours ERP — AI Docs Changelog

## Phase 1 — Supabase Setup & DB Migrations (2026-05-21)
- Initial database schema created (19 tables + 1 view)
- RLS tenant isolation on all tables
- JWT custom claims function for role-based auth
- AI assistant fields added to tenant_settings (ai_assistant_enabled, ai_provider)
- LLM provider support added to tenant_integrations
- /lib/ai/ folder structure scaffolded with adapter interface
- /ai-docs/ placeholder files created
- /app/[slug]/api/assistant/route.ts reserved (501)
