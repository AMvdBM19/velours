# /lib/ai/ — AI Assistant Module

Reserved for Phase 9. This folder will contain:

- `adapter.ts` — shared LLM interface
- `providers/` — Anthropic, OpenAI, Mistral implementations
- `tools/` — tenant-scoped tool implementations (bookings, workers, clients, finances, availability)
- `docs/` — document loader and retriever for context-aware assistance
- `context/` — system prompt assembly

Tool stubs are added incrementally as ERP modules are completed (Phase 5+).
