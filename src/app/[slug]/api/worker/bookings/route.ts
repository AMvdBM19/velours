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
 * GET /[slug]/api/worker/bookings
 * Worker fetches own bookings. Agent can fetch any worker's bookings.
 * Query: ?status=pending_worker,confirmed&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['worker', 'agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const url = new URL(request.url);
  const workerId = user.role === 'agent'
    ? (url.searchParams.get('worker_id') || user.workerId)
    : user.workerId;
  const statusFilter = url.searchParams.get('status');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  if (!workerId) {
    return NextResponse.json({ error: 'Worker ID required' }, { status: 400 });
  }

  const supabase = getSupabase(request);

  // Worker sees limited client info (display_name only, no real_name/email)
  const clientSelect = user.role === 'worker'
    ? 'clients(display_name, phone)'
    : 'clients(display_name, real_name, email, phone)';

  let query = supabase
    .from('bookings')
    .select(`
      id, slot_date, slot_start, slot_end, duration_minutes,
      location_type, location_notes, status,
      base_rate_per_30, tag_extras_total, total_price, worker_payout,
      requested_at, confirmed_at,
      ${clientSelect},
      booking_service_tags(tag_name, extra_price)
    `)
    .eq('worker_id', workerId)
    .eq('tenant_id', user.tenantId)
    .order('slot_date', { ascending: true })
    .order('slot_start', { ascending: true });

  if (statusFilter) {
    const statuses = statusFilter.split(',');
    query = query.in('status', statuses);
  }
  if (from) query = query.gte('slot_date', from);
  if (to) query = query.lte('slot_date', to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // For pending bookings with outcall, worker only sees city (not full address)
  const sanitized = data?.map(b => {
    if (user.role === 'worker' && b.status === 'pending_worker' && b.location_type === 'outcall') {
      return { ...b, location_address: undefined };
    }
    return b;
  });

  return NextResponse.json({ bookings: sanitized });
}

/**
 * PATCH /[slug]/api/worker/bookings
 * Worker accepts or rejects a booking.
 * Body: { booking_id, action: 'accept' | 'reject', reason?: string }
 */
export async function PATCH(request: NextRequest) {
  const guard = await apiGuard(request, ['worker', 'agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const { booking_id, action, reason } = body as {
    booking_id: string;
    action: 'accept' | 'reject';
    reason?: string;
  };

  if (!booking_id || !action) {
    return NextResponse.json({ error: 'booking_id and action required' }, { status: 400 });
  }

  if (!['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be accept or reject' }, { status: 400 });
  }

  const supabase = getSupabase(request);

  // Verify booking belongs to this worker and is pending
  const workerId = user.role === 'agent' ? (body.worker_id || user.workerId) : user.workerId;

  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, status, worker_id, client_id')
    .eq('id', booking_id)
    .eq('tenant_id', user.tenantId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.worker_id !== workerId) {
    return NextResponse.json({ error: 'This booking is not assigned to you' }, { status: 403 });
  }

  if (booking.status !== 'pending_worker') {
    return NextResponse.json(
      { error: `Booking is ${booking.status}, not pending_worker` },
      { status: 400 }
    );
  }

  if (action === 'accept') {
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .eq('tenant_id', user.tenantId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // TODO: Phase 5/6 — trigger WA confirmation to client via notification_log
    return NextResponse.json({ status: 'confirmed', booking_id });
  }

  // Reject
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'worker',
      cancellation_reason: reason || 'Worker declined',
    })
    .eq('id', booking_id)
    .eq('tenant_id', user.tenantId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // TODO: Phase 5/6 — trigger WA decline notification to client
  return NextResponse.json({ status: 'cancelled', booking_id });
}
