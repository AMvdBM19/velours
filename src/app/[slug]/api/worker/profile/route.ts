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
 * GET /[slug]/api/worker/profile
 * Worker fetches own profile + service tags.
 * Agent can fetch any worker's profile via ?worker_id=xxx
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['worker', 'agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const supabase = getSupabase(request);
  const url = new URL(request.url);
  const targetWorkerId = user.role === 'agent'
    ? url.searchParams.get('worker_id')
    : user.workerId;

  if (!targetWorkerId) {
    return NextResponse.json({ error: 'Worker ID required' }, { status: 400 });
  }

  const { data: worker, error } = await supabase
    .from('workers')
    .select('id, pseudonym, age, nationality, gender, languages, bio, photo_urls, status, offline_reason, consent_photo_signed_at, wizard_completed, btw_exempt, created_at')
    .eq('id', targetWorkerId)
    .eq('tenant_id', user.tenantId)
    .single();

  if (error || !worker) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
  }

  // Also fetch worker's service tags
  const { data: tags } = await supabase
    .from('worker_service_tags')
    .select('tag_id, service_tags(id, name, description, extra_price)')
    .eq('worker_id', targetWorkerId)
    .eq('tenant_id', user.tenantId);

  return NextResponse.json({
    worker,
    tags: tags?.map(t => t.service_tags) ?? [],
  });
}

/**
 * PATCH /[slug]/api/worker/profile
 * Worker updates own profile (bio, photos, languages, etc.)
 * Agent can update any worker's profile via body.worker_id
 */
export async function PATCH(request: NextRequest) {
  const guard = await apiGuard(request, ['worker', 'agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const targetWorkerId = user.role === 'agent'
    ? (body.worker_id || user.workerId)
    : user.workerId;

  if (!targetWorkerId) {
    return NextResponse.json({ error: 'Worker ID required' }, { status: 400 });
  }

  // Fields workers can freely edit (no agent approval needed)
  const allowedFields = ['pseudonym', 'age', 'nationality', 'gender', 'languages', 'bio', 'photo_urls'];
  // Agent can also update these
  const agentOnlyFields = ['real_name', 'bsn', 'kvk_number', 'btw_exempt', 'status'];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }
  if (user.role === 'agent') {
    for (const field of agentOnlyFields) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
  }

  if (body.consent_photo_signed_at !== undefined) {
    updates.consent_photo_signed_at = body.consent_photo_signed_at;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const supabase = getSupabase(request);
  const { data, error } = await supabase
    .from('workers')
    .update(updates)
    .eq('id', targetWorkerId)
    .eq('tenant_id', user.tenantId)
    .select('id, pseudonym, age, nationality, gender, languages, bio, photo_urls, status, wizard_completed')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ worker: data });
}
