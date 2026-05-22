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
 * GET /[slug]/api/worker/tags
 * Fetch all agency service tags + which ones this worker has selected.
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

  // Fetch all agency tags
  const { data: allTags, error: tagsError } = await supabase
    .from('service_tags')
    .select('id, name, description, extra_price')
    .eq('tenant_id', user.tenantId)
    .order('name');

  if (tagsError) {
    return NextResponse.json({ error: tagsError.message }, { status: 500 });
  }

  // Fetch worker's selected tags
  const { data: workerTags } = await supabase
    .from('worker_service_tags')
    .select('tag_id')
    .eq('worker_id', workerId)
    .eq('tenant_id', user.tenantId);

  const selectedIds = new Set(workerTags?.map(t => t.tag_id) ?? []);

  return NextResponse.json({
    tags: allTags?.map(t => ({
      ...t,
      selected: selectedIds.has(t.id),
    })) ?? [],
  });
}

/**
 * PUT /[slug]/api/worker/tags
 * Replace worker's service tag selections.
 * Body: { tag_ids: ['uuid', ...] }
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

  const { tag_ids } = body as { tag_ids: string[] };
  if (!Array.isArray(tag_ids)) {
    return NextResponse.json({ error: 'tag_ids array required' }, { status: 400 });
  }

  const supabase = getSupabase(request);

  // Delete existing
  const { error: deleteError } = await supabase
    .from('worker_service_tags')
    .delete()
    .eq('worker_id', workerId)
    .eq('tenant_id', user.tenantId);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Insert new
  if (tag_ids.length > 0) {
    const rows = tag_ids.map(tagId => ({
      worker_id: workerId,
      tag_id: tagId,
      tenant_id: user.tenantId,
    }));

    const { error: insertError } = await supabase
      .from('worker_service_tags')
      .insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, count: tag_ids.length });
}
