# Finance Guide

## Revenue Calculation
Revenue is calculated from completed bookings. All pricing is snapshot-based — prices stored at booking creation are never recalculated.

## Key Metrics
- **Total Revenue** — Sum of all completed booking total_price values
- **Worker Payouts** — Sum of worker_payout (worker_payout_pct of total)
- **Agency Share** — Total revenue minus worker payouts
- **Tax (BTW)** — VAT-inclusive calculation: revenue x (tax_rate / (100 + tax_rate))

## Date Ranges
Finance page supports: This Month, Quarter, Year, and Custom date ranges.

## Per-Worker Breakdown
Table showing each worker's: booking count, total revenue, payout amount, and BTW exemption status.

## CSV Export
Click "Export CSV" to download a detailed CSV file with: date, worker, duration, base rate, tag extras, total, tax amount, worker payout, agency share, status, and booking source.

## No-Show Revenue Policy
Configurable in Settings > Booking Rules:
- `full` — Full charge applies (default)
- `partial` — Partial charge
- `none` — No charge for no-shows

## BTW Exemption
Workers can be marked as BTW exempt. This is visible in the finance breakdown but does not change revenue calculation (handled by accountant externally).
