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
 * POST /[slug]/api/worker/offline
 * Toggle worker online/offline.
 * Body: { action: 'go_offline' | 'go_online', reason?: string }
 *
 * Offline behaviour is configurable per tenant:
 * - auto_approve: listing hidden immediately
 * - require_acknowledgement: agent must acknowledge
 * - blocked: workers cannot go offline without agent action
 */
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, ['worker', 'agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const { action, reason, worker_id } = body as {
    action: 'go_offline' | 'go_online';
    reason?: string;
    worker_id?: string;
  };

  if (!action || !['go_offline', 'go_online'].includes(action)) {
    return NextResponse.json({ error: 'action must be go_offline or go_online' }, { status: 400 });
  }

  const workerId = user.role === 'agent' ? (worker_id || user.workerId) : user.workerId;
  if (!workerId) {
    return NextResponse.json({ error: 'Worker ID required' }, { status: 400 });
  }

  const supabase = getSupabase(request);

  // Fetch current worker status
  const { data: worker, error: workerError } = await supabase
    .from('workers')
    .select('id, status')
    .eq('id', workerId)
    .eq('tenant_id', user.tenantId)
    .single();

  if (workerError || !worker) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
  }

  if (action === 'go_online') {
    if (worker.status !== 'offline') {
      return NextResponse.json({ error: 'Worker is not offline' }, { status: 400 });
    }
    const { error } = await supabase
      .from('workers')
      .update({ status: 'active', offline_reason: null })
      .eq('id', workerId)
      .eq('tenant_id', user.tenantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ status: 'active' });
  }

  // Going offline
  if (worker.status === 'offline') {
    return NextResponse.json({ error: 'Worker is already offline' }, { status: 400 });
  }

  if (!reason && user.role === 'worker') {
    return NextResponse.json({ error: 'Reason is required to go offline' }, { status: 400 });
  }

  // Check tenant's offline_behaviour setting
  if (user.role === 'worker') {
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('offline_behaviour')
      .eq('tenant_id', user.tenantId)
      .single();

    const behaviour = settings?.offline_behaviour || 'auto_approve';

    if (behaviour === 'blocked') {
      return NextResponse.json(
        { error: 'Your agency does not allow workers to go offline independently. Contact your agent.' },
        { status: 403 }
      );
    }

    if (behaviour === 'require_acknowledgement') {
      // Set status to offline but flag for agent acknowledgement
      // For now, set offline immediately but log for agent review
      // TODO: Phase 6 — add agent_notifications entry for acknowledgement
      const { error } = await supabase
        .from('workers')
        .update({ status: 'offline', offline_reason: reason })
        .eq('id', workerId)
        .eq('tenant_id', user.tenantId);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ status: 'offline', requires_acknowledgement: true });
    }
  }

  // auto_approve or agent action
  const { error } = await supabase
    .from('workers')
    .update({ status: 'offline', offline_reason: reason || null })
    .eq('id', workerId)
    .eq('tenant_id', user.tenantId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ status: 'offline' });
}
