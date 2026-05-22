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
 * PATCH /[slug]/api/client/status
 * Agent changes client status (approve, reject, suspend, reinstate).
 * Body: { client_id, new_status, reason }
 *
 * Every status change logs to client_status_log.
 */
export async function PATCH(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const { client_id, new_status, reason } = body as {
    client_id: string;
    new_status: 'approved' | 'rejected' | 'suspended' | 'pending';
    reason: string;
  };

  if (!client_id || !new_status) {
    return NextResponse.json({ error: 'client_id and new_status required' }, { status: 400 });
  }

  const validStatuses = ['approved', 'rejected', 'suspended', 'pending'];
  if (!validStatuses.includes(new_status)) {
    return NextResponse.json({ error: `Invalid status. Must be: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  // Reason required for reject/suspend
  if (['rejected', 'suspended'].includes(new_status) && !reason) {
    return NextResponse.json({ error: 'Reason required for rejection or suspension' }, { status: 400 });
  }

  const supabase = getSupabase(request);

  // Fetch current client
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id, status')
    .eq('id', client_id)
    .eq('tenant_id', user.tenantId)
    .single();

  if (fetchError || !client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const oldStatus = client.status;

  // Update client status
  const updates: Record<string, unknown> = {
    status: new_status,
    status_reason: reason || null,
    status_changed_at: new Date().toISOString(),
    status_changed_by: user.id,
  };

  if (new_status === 'approved') {
    updates.approved_at = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', client_id)
    .eq('tenant_id', user.tenantId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Log status change
  await supabase.from('client_status_log').insert({
    tenant_id: user.tenantId,
    client_id,
    old_status: oldStatus,
    new_status,
    reason: reason || null,
    changed_by: user.id,
  });

  // TODO: Send notification to client (email for reject/suspend, WA for approve)

  return NextResponse.json({
    client_id,
    old_status: oldStatus,
    new_status,
  });
}

/**
 * GET /[slug]/api/client/status
 * Agent fetches clients by status.
 * Query: ?status=pending,approved&search=name
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');
  const search = url.searchParams.get('search');

  const supabase = getSupabase(request);
  let query = supabase
    .from('clients')
    .select('id, display_name, real_name, email, phone, status, status_reason, wa_opt_in, created_at, approved_at')
    .eq('tenant_id', user.tenantId)
    .order('created_at', { ascending: false });

  if (statusFilter) {
    const statuses = statusFilter.split(',');
    query = query.in('status', statuses);
  }

  if (search) {
    query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%,real_name.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clients: data });
}
