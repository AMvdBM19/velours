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
 * GET /[slug]/api/worker/schedule
 * Fetch weekly recurring schedule for a worker.
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['worker', 'agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const url = new URL(request.url);
  const workerId = user.role === 'agent'
    ? (url.searchParams.get('worker_id') || user.workerId)
    : user.workerId;

  if (!workerId) {
    return NextResponse.json({ error: 'Worker ID required' }, { status: 400 });
  }

  const supabase = getSupabase(request);
  const { data, error } = await supabase
    .from('worker_schedule')
    .select('id, day_of_week, start_time, end_time')
    .eq('worker_id', workerId)
    .eq('tenant_id', user.tenantId)
    .order('day_of_week')
    .order('start_time');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ schedule: data });
}

/**
 * PUT /[slug]/api/worker/schedule
 * Replace the full weekly schedule (delete all + insert new).
 * Body: { slots: [{ day_of_week, start_time, end_time }] }
 */
export async function PUT(request: NextRequest) {
  const guard = await apiGuard(request, ['worker', 'agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const workerId = user.role === 'agent'
    ? (body.worker_id || user.workerId)
    : user.workerId;

  if (!workerId) {
    return NextResponse.json({ error: 'Worker ID required' }, { status: 400 });
  }

  const { slots } = body as {
    slots: { day_of_week: number; start_time: string; end_time: string }[];
  };

  if (!Array.isArray(slots)) {
    return NextResponse.json({ error: 'slots array required' }, { status: 400 });
  }

  // Validate each slot
  for (const slot of slots) {
    if (slot.day_of_week < 0 || slot.day_of_week > 6) {
      return NextResponse.json({ error: `Invalid day_of_week: ${slot.day_of_week}` }, { status: 400 });
    }
    if (!slot.start_time || !slot.end_time) {
      return NextResponse.json({ error: 'start_time and end_time required' }, { status: 400 });
    }
    if (slot.start_time >= slot.end_time) {
      return NextResponse.json(
        { error: `end_time must be after start_time for day ${slot.day_of_week}` },
        { status: 400 }
      );
    }
  }

  const supabase = getSupabase(request);

  // Delete existing schedule
  const { error: deleteError } = await supabase
    .from('worker_schedule')
    .delete()
    .eq('worker_id', workerId)
    .eq('tenant_id', user.tenantId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Insert new schedule
  if (slots.length > 0) {
    const rows = slots.map(s => ({
      tenant_id: user.tenantId,
      worker_id: workerId,
      day_of_week: s.day_of_week,
      start_time: s.start_time,
      end_time: s.end_time,
    }));

    const { error: insertError } = await supabase
      .from('worker_schedule')
      .insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  // Return the fresh schedule
  const { data } = await supabase
    .from('worker_schedule')
    .select('id, day_of_week, start_time, end_time')
    .eq('worker_id', workerId)
    .eq('tenant_id', user.tenantId)
    .order('day_of_week')
    .order('start_time');

  return NextResponse.json({ schedule: data });
}
