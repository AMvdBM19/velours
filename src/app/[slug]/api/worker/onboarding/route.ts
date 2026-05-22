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
 * GET /[slug]/api/worker/onboarding
 * Load worker's current onboarding state (profile + tags + schedule).
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['worker']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  if (!user.workerId) {
    return NextResponse.json({ error: 'Worker ID not found in token' }, { status: 400 });
  }

  const supabase = getSupabase(request);

  // Fetch worker profile
  const { data: worker } = await supabase
    .from('workers')
    .select('id, pseudonym, age, nationality, gender, languages, bio, photo_urls, wizard_completed, consent_photo_signed_at')
    .eq('id', user.workerId)
    .eq('tenant_id', user.tenantId)
    .single();

  // Fetch all agency tags + worker selections
  const { data: allTags } = await supabase
    .from('service_tags')
    .select('id, name, description, extra_price')
    .eq('tenant_id', user.tenantId)
    .order('name');

  const { data: workerTags } = await supabase
    .from('worker_service_tags')
    .select('tag_id')
    .eq('worker_id', user.workerId)
    .eq('tenant_id', user.tenantId);

  // Fetch schedule
  const { data: schedule } = await supabase
    .from('worker_schedule')
    .select('id, day_of_week, start_time, end_time')
    .eq('worker_id', user.workerId)
    .eq('tenant_id', user.tenantId)
    .order('day_of_week')
    .order('start_time');

  const selectedTagIds = new Set(workerTags?.map(t => t.tag_id) ?? []);

  return NextResponse.json({
    worker,
    tags: allTags?.map(t => ({ ...t, selected: selectedTagIds.has(t.id) })) ?? [],
    schedule: schedule ?? [],
  });
}

/**
 * POST /[slug]/api/worker/onboarding
 * Complete worker onboarding wizard.
 * Body: { profile, tag_ids, schedule_slots }
 */
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, ['worker']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  if (!user.workerId) {
    return NextResponse.json({ error: 'Worker ID not found in token' }, { status: 400 });
  }

  const body = await request.json();
  const { profile, tag_ids, schedule_slots } = body as {
    profile: {
      pseudonym?: string;
      age?: number;
      nationality?: string;
      gender?: string;
      languages?: string[];
      bio?: string;
      photo_urls?: string[];
      consent_photo_signed_at?: string;
    };
    tag_ids: string[];
    schedule_slots: { day_of_week: number; start_time: string; end_time: string }[];
  };

  const supabase = getSupabase(request);

  // 1. Update worker profile
  const profileUpdates: Record<string, unknown> = {
    wizard_completed: true,
    status: 'active', // Go active after wizard
  };
  if (profile) {
    const allowed = ['pseudonym', 'age', 'nationality', 'gender', 'languages', 'bio', 'photo_urls', 'consent_photo_signed_at'];
    for (const field of allowed) {
      if ((profile as Record<string, unknown>)[field] !== undefined) {
        profileUpdates[field] = (profile as Record<string, unknown>)[field];
      }
    }
  }

  const { error: profileError } = await supabase
    .from('workers')
    .update(profileUpdates)
    .eq('id', user.workerId)
    .eq('tenant_id', user.tenantId);

  if (profileError) {
    return NextResponse.json({ error: 'Failed to update profile: ' + profileError.message }, { status: 500 });
  }

  // 2. Set service tags
  if (Array.isArray(tag_ids)) {
    await supabase
      .from('worker_service_tags')
      .delete()
      .eq('worker_id', user.workerId)
      .eq('tenant_id', user.tenantId);

    if (tag_ids.length > 0) {
      await supabase
        .from('worker_service_tags')
        .insert(tag_ids.map(tagId => ({
          worker_id: user.workerId,
          tag_id: tagId,
          tenant_id: user.tenantId,
        })));
    }
  }

  // 3. Set weekly schedule
  if (Array.isArray(schedule_slots)) {
    await supabase
      .from('worker_schedule')
      .delete()
      .eq('worker_id', user.workerId)
      .eq('tenant_id', user.tenantId);

    if (schedule_slots.length > 0) {
      await supabase
        .from('worker_schedule')
        .insert(schedule_slots.map(s => ({
          tenant_id: user.tenantId,
          worker_id: user.workerId,
          day_of_week: s.day_of_week,
          start_time: s.start_time,
          end_time: s.end_time,
        })));
    }
  }

  return NextResponse.json({ success: true, status: 'active' });
}
