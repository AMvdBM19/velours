# Client Guide

## Client Registration
Clients self-register through the booking widget. Required: email, display name, password. Optional: real name, phone, WhatsApp opt-in.

## Approval Flow
Two modes (configured in Settings > Client Settings):
- **Auto-approve** — Client account is immediately approved on registration
- **Manual** — Client goes to `pending` status; agent must review and approve

## Client Statuses
- `pending` — Awaiting agent approval
- `approved` — Can browse catalog and create bookings
- `rejected` — Registration denied (reason logged)
- `suspended` — Previously approved, now blocked (reason logged)

## Agent Actions
- **Approve** — Pending client becomes approved. WhatsApp notification sent if opted in.
- **Reject** — Pending client is rejected with reason.
- **Suspend** — Approved client is blocked with reason.
- **Reinstate** — Rejected/suspended client is re-approved.
- **Bulk Approve** — All pending clients approved at once.

## Status Log
Every status change is logged in `client_status_log` with timestamp, old/new status, reason, and who made the change.

## Where to Find Clients
- Clients page (`/clients`) — Tabs: All, Pending, Approved, Rejected/Suspended
- Client profile details visible to agent include ratings from workers and full status history
