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
 * POST /[slug]/api/booking
 * Create a booking request.
 *
 * For client: status = pending_worker
 * For agent (manual): status = confirmed (agent acts on behalf of all parties)
 *
 * Body: {
 *   worker_id, slot_date, slot_start, duration_minutes,
 *   tag_ids?: string[],
 *   location_type: 'incall' | 'outcall' | 'other',
 *   location_address?, location_notes?,
 *   client_id? (agent only, for manual bookings)
 * }
 *
 * Pricing is ALWAYS calculated at creation time and stored as snapshot.
 */
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, ['client', 'agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const {
    worker_id,
    slot_date,
    slot_start,
    duration_minutes,
    tag_ids,
    location_type,
    location_address,
    location_notes,
    client_id: bodyClientId,
  } = body as {
    worker_id: string;
    slot_date: string;
    slot_start: string;
    duration_minutes: number;
    tag_ids?: string[];
    location_type: 'incall' | 'outcall' | 'other';
    location_address?: string;
    location_notes?: string;
    client_id?: string;
  };

  // Validation
  if (!worker_id || !slot_date || !slot_start || !duration_minutes) {
    return NextResponse.json(
      { error: 'worker_id, slot_date, slot_start, and duration_minutes required' },
      { status: 400 }
    );
  }

  const supabase = getSupabase(request);

  // Determine booking source and client
  const isManual = user.role === 'agent';
  const bookingSource = isManual ? 'manual' : 'client_request';
  const clientId = isManual ? bodyClientId : user.clientId;

  // If client, verify they are approved
  if (user.role === 'client') {
    const { data: client } = await supabase
      .from('clients')
      .select('status')
      .eq('id', user.clientId)
      .eq('tenant_id', user.tenantId)
      .single();

    if (!client || client.status !== 'approved') {
      return NextResponse.json({ error: 'Your account must be approved to create bookings' }, { status: 403 });
    }
  }

  // Verify worker exists and is active
  const { data: worker } = await supabase
    .from('workers')
    .select('id, status')
    .eq('id', worker_id)
    .eq('tenant_id', user.tenantId)
    .single();

  if (!worker || worker.status !== 'active') {
    return NextResponse.json({ error: 'Worker not found or not active' }, { status: 404 });
  }

  // Calculate slot_end
  const [startH, startM] = slot_start.split(':').map(Number);
  const endMinutes = startH * 60 + startM + duration_minutes;
  const endH = Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const slot_end = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00`;
  const slot_start_full = slot_start.length === 5 ? slot_start + ':00' : slot_start;

  // Check availability: no conflicting bookings
  const { data: conflicts } = await supabase
    .from('bookings')
    .select('id')
    .eq('worker_id', worker_id)
    .eq('tenant_id', user.tenantId)
    .eq('slot_date', slot_date)
    .in('status', ['pending_worker', 'confirmed'])
    .lt('slot_start', slot_end)
    .gt('slot_end', slot_start_full);

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: 'This time slot is already booked' }, { status: 409 });
  }

  // Check worker has schedule for this day
  const dayOfWeek = new Date(slot_date + 'T00:00:00').getDay();
  const { data: scheduleSlots } = await supabase
    .from('worker_schedule')
    .select('start_time, end_time')
    .eq('worker_id', worker_id)
    .eq('tenant_id', user.tenantId)
    .eq('day_of_week', dayOfWeek);

  const fitsSchedule = scheduleSlots?.some(s =>
    slot_start_full >= s.start_time && slot_end <= s.end_time
  );

  if (!fitsSchedule) {
    return NextResponse.json({ error: 'Worker is not available at this time' }, { status: 409 });
  }

  // Check exceptions
  const { data: exceptions } = await supabase
    .from('worker_exceptions')
    .select('id')
    .eq('worker_id', worker_id)
    .eq('tenant_id', user.tenantId)
    .eq('exception_date', slot_date);

  if (exceptions && exceptions.length > 0) {
    return NextResponse.json({ error: 'Worker is not available on this date' }, { status: 409 });
  }

  // Fetch tenant settings for pricing snapshot
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('base_rate_per_30min, worker_payout_pct, agency_share_pct, no_show_revenue_policy, default_slot_minutes, min_lead_time_hours')
    .eq('tenant_id', user.tenantId)
    .single();

  if (!settings) {
    return NextResponse.json({ error: 'Tenant settings not found' }, { status: 500 });
  }

  // Check lead time
  const bookingDateTime = new Date(`${slot_date}T${slot_start_full}`);
  const now = new Date();
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilBooking < (settings.min_lead_time_hours || 2)) {
    return NextResponse.json(
      { error: `Bookings require at least ${settings.min_lead_time_hours || 2} hours lead time` },
      { status: 400 }
    );
  }

  // Calculate pricing snapshot (NEVER recalculate later)
  const baseRate = settings.base_rate_per_30min || 60;
  const slots30 = duration_minutes / 30;
  const baseTotal = baseRate * slots30;

  // Calculate tag extras
  let tagExtrasTotal = 0;
  const tagRows: { tag_id: string; tag_name: string; extra_price: number }[] = [];

  if (tag_ids && tag_ids.length > 0) {
    const { data: tagData } = await supabase
      .from('service_tags')
      .select('id, name, extra_price')
      .eq('tenant_id', user.tenantId)
      .in('id', tag_ids);

    for (const tag of tagData ?? []) {
      const extra = tag.extra_price || 0;
      tagExtrasTotal += extra;
      tagRows.push({
        tag_id: tag.id,
        tag_name: tag.name,
        extra_price: extra,
      });
    }
  }

  const totalPrice = baseTotal + tagExtrasTotal;
  const workerPayout = totalPrice * ((settings.worker_payout_pct || 70) / 100);
  const agencyShare = totalPrice - workerPayout;

  // Create booking
  const bookingStatus = isManual ? 'confirmed' : 'pending_worker';

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      tenant_id: user.tenantId,
      worker_id,
      client_id: clientId || null,
      booking_source: bookingSource,
      slot_date,
      slot_start: slot_start_full,
      slot_end,
      duration_minutes,
      location_type: location_type || 'incall',
      location_address: location_address || null,
      location_notes: location_notes || null,
      base_rate_per_30: baseRate,
      tag_extras_total: tagExtrasTotal,
      total_price: totalPrice,
      worker_payout: workerPayout,
      agency_share: agencyShare,
      status: bookingStatus,
      no_show_revenue_policy: settings.no_show_revenue_policy || 'full',
      confirmed_at: isManual ? new Date().toISOString() : null,
    })
    .select('id, status, slot_date, slot_start, slot_end, total_price, worker_payout')
    .single();

  if (bookingError) {
    return NextResponse.json({ error: bookingError.message }, { status: 500 });
  }

  // Insert booking service tags
  if (tagRows.length > 0 && booking) {
    await supabase.from('booking_service_tags').insert(
      tagRows.map(t => ({
        tenant_id: user.tenantId,
        booking_id: booking.id,
        tag_id: t.tag_id,
        tag_name: t.tag_name,
        extra_price: t.extra_price,
      }))
    );
  }

  // TODO: Notifications
  // - client_request: notify worker in-platform
  // - manual + client has wa_opt_in: send WA booking confirmation

  return NextResponse.json({
    booking,
    message: isManual
      ? 'Booking created and confirmed.'
      : 'Booking request submitted. Waiting for worker confirmation.',
  }, { status: 201 });
}

/**
 * GET /[slug]/api/booking
 * Fetch bookings. Agent sees all, client sees own.
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['client', 'agent', 'worker']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const supabase = getSupabase(request);
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let query = supabase
    .from('bookings')
    .select(`
      id, slot_date, slot_start, slot_end, duration_minutes,
      location_type, status, total_price, booking_source,
      requested_at, confirmed_at, completed_at,
      workers(pseudonym),
      clients(display_name),
      booking_service_tags(tag_name, extra_price)
    `)
    .eq('tenant_id', user.tenantId)
    .order('slot_date', { ascending: true })
    .order('slot_start', { ascending: true });

  // Scope by role
  if (user.role === 'client' && user.clientId) {
    query = query.eq('client_id', user.clientId);
  } else if (user.role === 'worker' && user.workerId) {
    query = query.eq('worker_id', user.workerId);
  }

  if (statusFilter) query = query.in('status', statusFilter.split(','));
  if (from) query = query.gte('slot_date', from);
  if (to) query = query.lte('slot_date', to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ bookings: data });
}

/**
 * PATCH /[slug]/api/booking
 * Agent changes booking status (complete, no_show, cancel).
 * Body: { booking_id, status }
 */
export async function PATCH(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const { booking_id, status: newStatus } = body as {
    booking_id: string;
    status: string;
  };

  if (!booking_id || !newStatus) {
    return NextResponse.json({ error: 'booking_id and status required' }, { status: 400 });
  }

  const allowed = ['confirmed', 'completed', 'no_show', 'cancelled'];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Allowed: ${allowed.join(', ')}` },
      { status: 400 }
    );
  }

  const supabase = getSupabase(request);

  // Verify booking belongs to tenant
  const { data: existing } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', booking_id)
    .eq('tenant_id', user.tenantId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = { status: newStatus };
  if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString();
  if (newStatus === 'completed') updates.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', booking_id)
    .eq('tenant_id', user.tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, booking_id, status: newStatus });
}
