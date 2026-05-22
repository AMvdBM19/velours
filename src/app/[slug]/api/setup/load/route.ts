import { NextResponse, type NextRequest } from 'next/server';
import { apiGuard } from '@/lib/auth/api-guard';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/**
 * Load all wizard data for resume — tenant + settings + tags + templates.
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;

  const { user } = guard;
  const supabase = supabaseAdmin();

  const [tenantRes, settingsRes, tagsRes, templatesRes] = await Promise.all([
    supabase
      .from('tenants')
      .select('*')
      .eq('id', user.tenantId)
      .single(),
    supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .single(),
    supabase
      .from('service_tags')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .eq('is_active', true)
      .order('display_order'),
    supabase
      .from('notification_templates')
      .select('*')
      .eq('tenant_id', user.tenantId),
  ]);

  return NextResponse.json({
    tenant: tenantRes.data,
    settings: settingsRes.data,
    tags: tagsRes.data ?? [],
    templates: templatesRes.data ?? [],
    currentStep: tenantRes.data?.wizard_step ?? 1,
  });
}
