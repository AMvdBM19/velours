# AI Tools Reference

## What the assistant can do

### Read Tools (execute immediately, no confirmation needed)
- **get_upcoming_bookings** — Get confirmed bookings for a date range, optionally filtered by worker
- **get_worker_availability** — Check available time slots for a worker on a specific date
- **search_workers** — Find workers by pseudonym, nationality, language, or tag
- **search_clients** — Find clients by display name or status
- **get_finance_summary** — Revenue totals, booking counts, payout summary for a date range
- **check_slot_availability** — Verify if a specific time slot is bookable

### Write Tools (require user confirmation before execution)
- **create_manual_booking** — Creates a booking preview first, then executes only after user confirms

## What the assistant cannot do
- Access other agencies' data
- Show real names, BSN numbers, or personal email addresses
- Modify settings or integrations
- Delete or suspend workers/clients
- Override locked settings
- Access billing or subscription information
- Send WhatsApp messages directly (handled by the platform automatically)

## Safety Rules
- Every query is scoped to the current agency's data only
- Write tools always show a preview and ask for confirmation first
- Sensitive fields (real_name, BSN, email) are never returned in tool results
- If unsure about something, the assistant will direct you to the relevant ERP page
