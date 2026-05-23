import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { TenantContext } from '@/lib/types/auth';

// Uses service role key to bypass RLS — for tenant resolution only
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Resolve a tenant by slug. Uses service role to bypass RLS
 * since the user may not be authenticated yet.
 * Wrapped in React cache() to deduplicate within a single request/render.
 */
export const resolveTenant = cache(async (slug: string): Promise<TenantContext | null> => {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, name, is_active, wizard_completed')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  return {
    tenantId: data.id,
    slug: data.slug,
    name: data.name,
    isActive: data.is_active,
    wizardCompleted: data.wizard_completed,
  };
});
