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
 * GET /[slug]/api/agent/notifications
 * Fetch agent notifications (priority sorted).
 * Query: ?status=unread,read&type=client_signup,blacklist_flag
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const supabase = getSupabase(request);
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');

  let query = supabase
    .from('agent_notifications')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (statusFilter) {
    query = query.in('status', statusFilter.split(','));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sort by priority: pending first, then by type priority
  const priorityOrder: Record<string, number> = {
    client_signup: 1,
    worker_offline: 2,
    blacklist_flag: 3,
    booking_no_show: 4,
    worker_profile_edit: 5,
  };

  const sorted = (data ?? []).sort((a, b) => {
    // Unread first
    if (a.status === 'unread' && b.status !== 'unread') return -1;
    if (a.status !== 'unread' && b.status === 'unread') return 1;
    // Then by type priority
    const aPri = priorityOrder[a.notification_type] || 99;
    const bPri = priorityOrder[b.notification_type] || 99;
    return aPri - bPri;
  });

  return NextResponse.json({ notifications: sorted });
}

/**
 * PATCH /[slug]/api/agent/notifications
 * Mark notification(s) as read/actioned.
 * Body: { ids: string[], status: 'read' | 'actioned' }
 */
export async function PATCH(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const { ids, status } = body as { ids: string[]; status: 'read' | 'actioned' };

  if (!ids || !status) {
    return NextResponse.json({ error: 'ids and status required' }, { status: 400 });
  }

  const supabase = getSupabase(request);

  const updates: Record<string, unknown> = { status };
  if (status === 'actioned') {
    updates.actioned_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('agent_notifications')
    .update(updates)
    .in('id', ids)
    .eq('tenant_id', user.tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, count: ids.length });
}
