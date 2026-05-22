# Booking Guide

## Booking Flow

### Client-Initiated Booking
1. Client browses the worker catalog (public widget or standalone page)
2. Client selects a worker, date, time slot, services, and location type
3. System checks availability (3-layer: schedule - exceptions - confirmed bookings)
4. System validates lead time (minimum hours before booking)
5. Pricing snapshot is calculated and stored (NEVER recalculated later)
6. Booking created with status `pending_worker`
7. Worker receives notification to accept or reject
8. If accepted: status becomes `confirmed`, slot blocked
9. If rejected: status becomes `cancelled`

### Manual Booking (Agent)
1. Agent creates booking via Bookings page or AI assistant
2. Specifies worker, client, date, time, duration, location, services
3. Same availability check and pricing snapshot apply
4. Status goes directly to `confirmed` (no pending step)
5. `booking_source` = `manual`

## Booking Statuses
- `pending_worker` — Waiting for worker to accept/reject
- `confirmed` — Accepted, slot blocked in worker's schedule
- `completed` — Service delivered, counts toward revenue
- `no_show` — Client did not show, revenue policy applies
- `cancelled` — Booking cancelled by any party

## Pricing
- Base rate per 30 minutes (configured in tenant settings)
- Service tag extras added on top
- Total = (base_rate x number_of_30min_slots) + tag_extras
- Worker payout = total x worker_payout_pct
- Agency share = total - worker_payout
- All prices stored as snapshot at booking creation time

## Location Types
- `incall` — Service at agency/worker location
- `outcall` — Worker travels to client. Worker sees full address only after accepting.
- `other` — Custom arrangement

## Where to Find Bookings
- Agent: Bookings page shows all bookings across all workers with management actions
- Worker: Bookings page shows only their own bookings with accept/reject
- Finance page shows completed booking revenue
