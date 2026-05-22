import { NextResponse, type NextRequest } from 'next/server';
import { apiGuard } from '@/lib/auth/api-guard';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

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
 * GET /[slug]/api/agent/workers
 * Agent fetches all workers with stats.
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const supabase = getSupabase(request);

  const { data: workers, error } = await supabase
    .from('workers')
    .select(`
      id, pseudonym, real_name, age, nationality, gender, languages,
      photo_urls, status, offline_reason, wizard_completed, btw_exempt,
      created_at, created_by_agent_id
    `)
    .eq('tenant_id', user.tenantId)
    .order('pseudonym');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch max_workers limit
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('max_workers')
    .eq('tenant_id', user.tenantId)
    .single();

  const activeCount = workers?.filter(w => w.status === 'active').length || 0;

  return NextResponse.json({
    workers: workers ?? [],
    max_workers: settings?.max_workers || 15,
    active_count: activeCount,
  });
}

/**
 * POST /[slug]/api/agent/workers
 * Agent creates a new worker account.
 * Body: { email, temp_password, pseudonym, real_name? }
 *
 * Enforces max_workers limit.
 */
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const { email, temp_password, pseudonym, real_name } = body as {
    email: string;
    temp_password: string;
    pseudonym: string;
    real_name?: string;
  };

  if (!email || !temp_password || !pseudonym) {
    return NextResponse.json({ error: 'email, temp_password, and pseudonym required' }, { status: 400 });
  }

  const supabase = getSupabase(request);

  // Check worker limit
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('max_workers')
    .eq('tenant_id', user.tenantId)
    .single();

  const maxWorkers = settings?.max_workers || 15;

  const { count } = await supabase
    .from('workers')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId)
    .in('status', ['active', 'inactive']);

  if ((count || 0) >= maxWorkers) {
    return NextResponse.json(
      { error: `Worker limit reached (${maxWorkers}). Contact support to upgrade.` },
      { status: 403 }
    );
  }

  // Create auth user with service role
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
    email,
    password: temp_password,
    email_confirm: true,
    user_metadata: {
      tenant_id: user.tenantId,
      role: 'worker',
      pseudonym,
    },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }

  // Get agent ID
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('tenant_id', user.tenantId)
    .single();

  // Create worker record
  const { data: worker, error: workerError } = await supabase
    .from('workers')
    .insert({
      id: authData.user.id,
      tenant_id: user.tenantId,
      pseudonym,
      real_name: real_name || null,
      status: 'inactive',
      first_login: true,
      wizard_completed: false,
      created_by_agent_id: agent?.id || null,
    })
    .select('id, pseudonym, status')
    .single();

  if (workerError) {
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: workerError.message }, { status: 500 });
  }

  // TODO: Send email with login credentials to worker

  return NextResponse.json({ worker }, { status: 201 });
}

/**
 * PATCH /[slug]/api/agent/workers
 * Agent updates worker status (deactivate/reactivate).
 * Body: { worker_id, action: 'deactivate' | 'reactivate', reason? }
 */
export async function PATCH(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const { worker_id, action, reason } = body as {
    worker_id: string;
    action: 'deactivate' | 'reactivate';
    reason?: string;
  };

  if (!worker_id || !action) {
    return NextResponse.json({ error: 'worker_id and action required' }, { status: 400 });
  }

  const supabase = getSupabase(request);
  const newStatus = action === 'deactivate' ? 'inactive' : 'active';

  const { error } = await supabase
    .from('workers')
    .update({
      status: newStatus,
      offline_reason: action === 'deactivate' ? (reason || 'Deactivated by agent') : null,
    })
    .eq('id', worker_id)
    .eq('tenant_id', user.tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ worker_id, status: newStatus });
}
