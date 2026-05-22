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
 * GET /[slug]/api/worker/exceptions
 * Fetch exceptions (time off) for a worker.
 * Query: ?worker_id=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['worker', 'agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const url = new URL(request.url);
  const workerId = user.role === 'agent'
    ? (url.searchParams.get('worker_id') || user.workerId)
    : user.workerId;
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  if (!workerId) {
    return NextResponse.json({ error: 'Worker ID required' }, { status: 400 });
  }

  const supabase = getSupabase(request);
  let query = supabase
    .from('worker_exceptions')
    .select('id, exception_date, reason, created_by, created_at')
    .eq('worker_id', workerId)
    .eq('tenant_id', user.tenantId)
    .order('exception_date');

  if (from) query = query.gte('exception_date', from);
  if (to) query = query.lte('exception_date', to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exceptions: data });
}

/**
 * POST /[slug]/api/worker/exceptions
 * Add exception date(s).
 * Body: { dates: ['YYYY-MM-DD', ...], reason?: string }
 * or { worker_id: '...', dates: [...], reason?: string } (agent)
 */
export async function POST(request: NextRequest) {
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

  const { dates, reason } = body as { dates: string[]; reason?: string };

  if (!Array.isArray(dates) || dates.length === 0) {
    return NextResponse.json({ error: 'dates array required' }, { status: 400 });
  }

  const supabase = getSupabase(request);
  const rows = dates.map(d => ({
    tenant_id: user.tenantId,
    worker_id: workerId,
    exception_date: d,
    reason: reason || null,
    created_by: user.role,
  }));

  const { data, error } = await supabase
    .from('worker_exceptions')
    .upsert(rows, { onConflict: 'worker_id,exception_date', ignoreDuplicates: true })
    .select('id, exception_date, reason, created_by');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ exceptions: data });
}

/**
 * DELETE /[slug]/api/worker/exceptions
 * Remove an exception by ID.
 * Body: { id: '...' }
 */
export async function DELETE(request: NextRequest) {
  const guard = await apiGuard(request, ['worker', 'agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const { id } = body as { id: string };

  if (!id) {
    return NextResponse.json({ error: 'Exception ID required' }, { status: 400 });
  }

  const supabase = getSupabase(request);
  const { error } = await supabase
    .from('worker_exceptions')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
