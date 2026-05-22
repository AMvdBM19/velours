# Worker Guide

## Worker Account Creation
Workers are created by the agent (never self-register). Agent provides email and temporary password. Worker must change password on first login, then complete the onboarding wizard.

## Worker Onboarding Wizard (4 steps)
1. **Identity** — Pseudonym, age, nationality, gender, languages, bio
2. **Photos** — Upload photo URLs with GDPR consent checkbox
3. **Services** — Select from agency's service tag list
4. **Schedule** — Set weekly recurring availability (day-by-day)

Worker status becomes `active` only after completing the wizard.

## Profile Management
Workers own their profile content: bio, photos, languages, service tags. No agent approval needed for edits. Agent retains full override rights.

## Availability (3 Layers)
1. **Weekly Schedule** — Recurring template (e.g., Tue/Thu/Sat 19:00-23:00)
2. **Exceptions** — Single-date overrides for time off (vacation, sick, personal)
3. **Slot Blocking** — Automatic when a booking is confirmed

A slot is bookable IF (in weekly schedule) AND (no exception on that date) AND (no confirmed booking overlapping).

## Going Offline
Workers can toggle their status to offline. A reason is required. Behavior is configurable per agency:
- `auto_approve` — Listing hidden immediately
- `require_acknowledgement` — Agent must acknowledge
- `blocked` — Workers cannot go offline independently

Existing confirmed bookings are unaffected when going offline.

## Worker Statuses
- `active` — Visible in catalog, can receive bookings
- `inactive` — Deactivated by agent
- `offline` — Self-selected offline, listing hidden

## Post-Service Rating
Workers can rate clients after a completed booking (1-5 stars). Optional private note and blacklist flag for problematic clients.
