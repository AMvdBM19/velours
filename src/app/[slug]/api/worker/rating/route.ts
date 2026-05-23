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
 * GET /[slug]/api/worker/rating
 * Returns aggregate rating stats for the current worker (ratings they gave).
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['worker']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const supabase = getSupabase(request);
  const { data: ratings } = await supabase
    .from('client_ratings')
    .select('score')
    .eq('worker_id', user.workerId)
    .eq('tenant_id', user.tenantId);

  const scores = (ratings || []).map((r: { score: number }) => r.score);
  const avgRating = scores.length > 0
    ? Math.round((scores.reduce((a: number, b: number) => a + b, 0) / scores.length) * 10) / 10
    : null;

  return NextResponse.json({
    avgRating,
    ratingCount: scores.length,
  });
}

/**
 * POST /[slug]/api/worker/rating
 * Worker submits post-service rating for a client.
 * Body: { booking_id, score (1-5), note?, blacklist_flag?: { reason } }
 */
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, ['worker']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const { booking_id, score, note, blacklist_flag } = body as {
    booking_id: string;
    score: number;
    note?: string;
    blacklist_flag?: { reason: string };
  };

  if (!booking_id || !score) {
    return NextResponse.json({ error: 'booking_id and score required' }, { status: 400 });
  }

  if (score < 1 || score > 5) {
    return NextResponse.json({ error: 'Score must be between 1 and 5' }, { status: 400 });
  }

  const supabase = getSupabase(request);

  // Verify booking belongs to this worker and is completed
  const { data: booking, error: fetchError } = await supabase
    .from('bookings')
    .select('id, status, worker_id, client_id')
    .eq('id', booking_id)
    .eq('tenant_id', user.tenantId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.worker_id !== user.workerId) {
    return NextResponse.json({ error: 'This booking is not yours' }, { status: 403 });
  }

  if (booking.status !== 'completed') {
    return NextResponse.json({ error: 'Can only rate completed bookings' }, { status: 400 });
  }

  // Check for duplicate rating
  const { data: existing } = await supabase
    .from('client_ratings')
    .select('id')
    .eq('booking_id', booking_id)
    .eq('tenant_id', user.tenantId)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Already rated this booking' }, { status: 409 });
  }

  // Insert rating
  const { data: rating, error: ratingError } = await supabase
    .from('client_ratings')
    .insert({
      tenant_id: user.tenantId,
      booking_id,
      worker_id: user.workerId,
      client_id: booking.client_id,
      score,
      note: note || null,
    })
    .select('id, score, note, created_at')
    .single();

  if (ratingError) {
    return NextResponse.json({ error: ratingError.message }, { status: 500 });
  }

  // Handle blacklist flag if present
  let flagResult = null;
  if (blacklist_flag?.reason) {
    const { data: flag, error: flagError } = await supabase
      .from('blacklist_flags')
      .insert({
        tenant_id: user.tenantId,
        client_id: booking.client_id,
        flagged_by_worker_id: user.workerId,
        booking_id,
        reason: blacklist_flag.reason,
        status: 'pending',
      })
      .select('id, status')
      .single();

    if (flagError) {
      // Rating succeeded but flag failed — still return success with warning
      return NextResponse.json({
        rating,
        warning: 'Rating saved but blacklist flag failed: ' + flagError.message,
      });
    }
    flagResult = flag;

    // TODO: Phase 6 — create agent_notification for blacklist review
  }

  return NextResponse.json({ rating, blacklist_flag: flagResult });
}
