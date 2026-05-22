# ERP Reference

## Navigation

The Velours ERP has the following modules accessible from the sidebar:

### Agent Modules
- **Dashboard** (`/`) — Overview with today's bookings, pending requests, pending clients, notifications count, active workers, and monthly revenue.
- **Workers** (`/workers`) — Worker table with create form, status toggles (activate/deactivate), photo thumbnails. Shows X/max active workers count.
- **Clients** (`/clients`) — Client table with All/Pending/Approved/Rejected tabs. Inline approve/reject/suspend actions. Bulk approve for pending tab.
- **Bookings** (`/bookings`) — All bookings across all workers. Tabs: All, Pending, Upcoming, Completed. Agent can mark bookings as completed, no-show, or cancelled.
- **Notifications** (`/notifications`) — Action inbox with type badges (client signup, worker offline, blacklist flag, booking no-show, worker profile edit). Mark read/actioned.
- **Finances** (`/finances`) — Revenue dashboard with date range filters (month/quarter/year/custom). Per-worker breakdown. CSV export.
- **Settings** (`/settings`) — Sub-sections: Identity, Financial, Booking Rules, Client Settings, Branding, Integrations. Locked fields shown with badge.

### Worker Modules
- **Bookings** (`/bookings`) — Personal booking inbox with accept/reject for pending, upcoming view, past with rating option.
- **Availability** (`/availability`) — Weekly schedule editor and time-off calendar.
- **My Profile** (`/profile`) — Edit bio, photos, tags, languages.
- **My KPIs** (`/kpis`) — Personal performance stats.

## Multi-tenancy
Every operation is scoped to the current tenant. Data from other agencies is never visible. This is enforced at both the application and database level.
