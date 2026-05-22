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
 * GET /[slug]/api/client/profile
 * Client fetches own profile. Agent can fetch any client via ?client_id=xxx
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['client', 'agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const url = new URL(request.url);
  const clientId = user.role === 'agent'
    ? (url.searchParams.get('client_id') || user.clientId)
    : user.clientId;

  if (!clientId) {
    return NextResponse.json({ error: 'Client ID required' }, { status: 400 });
  }

  const supabase = getSupabase(request);

  // Agent sees full profile, client sees limited
  const select = user.role === 'agent'
    ? 'id, display_name, real_name, email, phone, status, status_reason, wa_opt_in, created_at, approved_at'
    : 'id, display_name, email, phone, status, wa_opt_in, created_at';

  const { data, error } = await supabase
    .from('clients')
    .select(select)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  // If agent, also fetch ratings and status log
  if (user.role === 'agent') {
    const [{ data: ratings }, { data: statusLog }] = await Promise.all([
      supabase
        .from('client_ratings')
        .select('id, score, note, created_at, workers(pseudonym)')
        .eq('client_id', clientId)
        .eq('tenant_id', user.tenantId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('client_status_log')
        .select('old_status, new_status, reason, changed_by, created_at')
        .eq('client_id', clientId)
        .eq('tenant_id', user.tenantId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    return NextResponse.json({
      client: data,
      ratings: ratings ?? [],
      status_log: statusLog ?? [],
    });
  }

  return NextResponse.json({ client: data });
}
