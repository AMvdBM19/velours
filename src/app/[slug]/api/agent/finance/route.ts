import { NextResponse, type NextRequest } from 'next/server';
import { apiGuard } from '@/lib/auth/api-guard';
import { createServerClient } from '@supabase/ssr';

function getSupabase(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    }
  );
}

/**
 * GET /[slug]/api/agent/finance
 * Agent fetches financial summary.
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&group_by=worker|tag|month
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const supabase = getSupabase(request);
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const format = url.searchParams.get('format'); // 'csv' for export

  // Fetch completed bookings in range
  let query = supabase
    .from('bookings')
    .select(`
      id, slot_date, duration_minutes, booking_source,
      base_rate_per_30, tag_extras_total, total_price,
      worker_payout, agency_share, status,
      workers(pseudonym, btw_exempt),
      booking_service_tags(tag_name, extra_price)
    `)
    .eq('tenant_id', user.tenantId)
    .in('status', ['completed', 'no_show'])
    .order('slot_date');

  if (from) query = query.gte('slot_date', from);
  if (to) query = query.lte('slot_date', to);

  const { data: bookings, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch tax settings
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('tax_rate_pct, tax_label, currency')
    .eq('tenant_id', user.tenantId)
    .single();

  const taxRate = settings?.tax_rate_pct || 21;
  const taxLabel = settings?.tax_label || 'BTW';
  const currency = settings?.currency || 'EUR';

  // Calculate totals
  let totalRevenue = 0;
  let totalWorkerPayout = 0;
  let totalAgencyShare = 0;
  let completedCount = 0;
  let noShowCount = 0;

  const workerSummary = new Map<string, {
    pseudonym: string;
    btw_exempt: boolean;
    revenue: number;
    payout: number;
    bookings: number;
  }>();

  for (const b of bookings ?? []) {
    const price = Number(b.total_price) || 0;
    const payout = Number(b.worker_payout) || 0;
    const share = Number(b.agency_share) || 0;

    totalRevenue += price;
    totalWorkerPayout += payout;
    totalAgencyShare += share;

    if (b.status === 'completed') completedCount++;
    if (b.status === 'no_show') noShowCount++;

    // Worker summary
    const worker = b.workers as unknown as { pseudonym: string; btw_exempt: boolean } | null;
    const workerName = worker?.pseudonym || 'Unknown';
    const existing = workerSummary.get(workerName) || {
      pseudonym: workerName,
      btw_exempt: worker?.btw_exempt || false,
      revenue: 0,
      payout: 0,
      bookings: 0,
    };
    existing.revenue += price;
    existing.payout += payout;
    existing.bookings += 1;
    workerSummary.set(workerName, existing);
  }

  const taxAmount = totalRevenue * (taxRate / (100 + taxRate)); // VAT inclusive calculation

  // CSV export
  if (format === 'csv') {
    const rows = [
      ['Date', 'Worker', 'Duration', 'Base Rate', 'Tag Extras', 'Total', `${taxLabel} Amount`, 'Worker Payout', 'Agency Share', 'Status', 'Source'].join(','),
    ];

    for (const b of bookings ?? []) {
      const worker = b.workers as unknown as { pseudonym: string } | null;
      const price = Number(b.total_price) || 0;
      const tax = price * (taxRate / (100 + taxRate));
      rows.push([
        b.slot_date,
        worker?.pseudonym || 'Unknown',
        String(b.duration_minutes),
        String(b.base_rate_per_30),
        String(b.tag_extras_total),
        price.toFixed(2),
        tax.toFixed(2),
        String(b.worker_payout),
        String(b.agency_share),
        b.status,
        b.booking_source,
      ].join(','));
    }

    return new NextResponse(rows.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="velours-finance-${from || 'all'}-${to || 'all'}.csv"`,
      },
    });
  }

  return NextResponse.json({
    summary: {
      total_revenue: totalRevenue,
      total_worker_payout: totalWorkerPayout,
      total_agency_share: totalAgencyShare,
      tax_amount: taxAmount,
      tax_rate: taxRate,
      tax_label: taxLabel,
      currency,
      completed_bookings: completedCount,
      no_show_bookings: noShowCount,
    },
    by_worker: Array.from(workerSummary.values()),
    bookings: bookings ?? [],
  });
}
