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
 * GET /[slug]/api/agent/settings
 * Fetch all tenant settings.
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const supabase = getSupabase(request);

  const [{ data: settings }, { data: locked }] = await Promise.all([
    supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .single(),
    supabase
      .from('tenant_locked_settings')
      .select('setting_key')
      .eq('tenant_id', user.tenantId),
  ]);

  const lockedKeys = new Set(locked?.map(l => l.setting_key) ?? []);

  return NextResponse.json({
    settings: settings ?? {},
    locked_keys: Array.from(lockedKeys),
  });
}

/**
 * PATCH /[slug]/api/agent/settings
 * Update tenant settings (respecting locked fields).
 * Body: { [key]: value, ... }
 */
export async function PATCH(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const body = await request.json();
  const supabase = getSupabase(request);

  // Check locked settings
  const { data: locked } = await supabase
    .from('tenant_locked_settings')
    .select('setting_key')
    .eq('tenant_id', user.tenantId);

  const lockedKeys = new Set(locked?.map(l => l.setting_key) ?? []);

  // Filter out locked fields
  const updates: Record<string, unknown> = {};
  const blockedFields: string[] = [];

  for (const [key, value] of Object.entries(body)) {
    if (lockedKeys.has(key)) {
      blockedFields.push(key);
    } else {
      updates[key] = value;
    }
  }

  if (blockedFields.length > 0 && Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: `These settings are locked: ${blockedFields.join(', ')}. Contact support to change.` },
      { status: 403 }
    );
  }

  if (Object.keys(updates).length > 0) {
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('tenant_settings')
      .update(updates)
      .eq('tenant_id', user.tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    success: true,
    updated: Object.keys(updates).filter(k => k !== 'updated_at'),
    blocked: blockedFields,
  });
}
