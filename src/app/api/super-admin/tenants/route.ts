import { NextResponse, type NextRequest } from 'next/server';
import { superAdminGuard } from '@/lib/auth/super-admin-guard';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/super-admin/tenants
 * List all tenants with basic stats.
 */
export async function GET(request: NextRequest) {
  const authError = superAdminGuard(request);
  if (authError) return authError;

  const supabase = getServiceClient();

  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, slug, domain, kvk_number, is_active, wizard_completed, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch per-tenant stats
  const enriched = await Promise.all(
    (tenants ?? []).map(async (tenant) => {
      const [workersRes, clientsRes, bookingsRes] = await Promise.all([
        supabase
          .from('workers')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .eq('status', 'active'),
        supabase
          .from('clients')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id),
        supabase
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .gte('slot_date', new Date().toISOString().slice(0, 7) + '-01'),
      ]);

      return {
        ...tenant,
        worker_count: workersRes.count ?? 0,
        client_count: clientsRes.count ?? 0,
        bookings_this_month: bookingsRes.count ?? 0,
      };
    })
  );

  return NextResponse.json({ tenants: enriched });
}

/**
 * POST /api/super-admin/tenants
 * Create a new tenant with default settings and notification templates.
 * Body: { name, slug, kvk_number?, contact_email, subscription_tier? }
 */
export async function POST(request: NextRequest) {
  const authError = superAdminGuard(request);
  if (authError) return authError;

  const body = await request.json();
  const { name, slug, kvk_number, contact_email, subscription_tier } = body as {
    name: string;
    slug: string;
    kvk_number?: string;
    contact_email: string;
    subscription_tier?: string;
  };

  if (!name || !slug || !contact_email) {
    return NextResponse.json(
      { error: 'name, slug, and contact_email are required' },
      { status: 400 }
    );
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json(
      { error: 'Slug must be lowercase alphanumeric with hyphens only' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Slug already in use' }, { status: 409 });
  }

  // Create tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      name,
      slug,
      kvk_number: kvk_number || null,
      is_active: true,
      wizard_completed: false,
    })
    .select('id, name, slug')
    .single();

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 500 });
  }

  // Seed default tenant_settings
  const { error: settingsError } = await supabase
    .from('tenant_settings')
    .insert({
      tenant_id: tenant.id,
      agency_name: name,
      agency_email: contact_email,
      base_rate_per_30min: 60,
      worker_payout_pct: 70,
      agency_share_pct: 30,
      currency: 'EUR',
      tax_rate_pct: 21,
      tax_label: 'BTW',
      default_slot_minutes: 60,
      min_lead_time_hours: 2,
      max_advance_booking_days: 30,
      allowed_location_types: ['incall', 'outcall'],
      offline_behaviour: 'hide_worker',
      no_show_revenue_policy: 'full',
      client_approval_mode: 'manual',
      primary_color: '#10b981',
      secondary_color: '#064e3b',
      widget_layout: 'grid',
      max_workers: subscription_tier === 'enterprise' ? 50 : subscription_tier === 'pro' ? 30 : 15,
    });

  if (settingsError) {
    // Cleanup: delete orphan tenant
    await supabase.from('tenants').delete().eq('id', tenant.id);
    return NextResponse.json({ error: `Settings creation failed: ${settingsError.message}` }, { status: 500 });
  }

  // Seed default notification templates
  const defaultTemplates = [
    { type: 'booking_confirmed', channel: 'whatsapp', template_body: 'Your booking on {{date}} at {{time}} is confirmed.', is_active: true },
    { type: 'booking_cancelled', channel: 'whatsapp', template_body: 'Your booking on {{date}} has been cancelled.', is_active: true },
    { type: 'booking_reminder', channel: 'whatsapp', template_body: 'Reminder: You have a booking tomorrow at {{time}}.', is_active: true },
    { type: 'client_approved', channel: 'whatsapp', template_body: 'Welcome! Your account has been approved. You can now make bookings.', is_active: true },
    { type: 'worker_offline', channel: 'platform', template_body: '{{worker}} has gone offline: {{reason}}', is_active: true },
  ];

  await supabase.from('notification_templates').insert(
    defaultTemplates.map(t => ({
      tenant_id: tenant.id,
      ...t,
    }))
  );

  return NextResponse.json({
    tenant,
    message: 'Tenant created with default settings and notification templates.',
  }, { status: 201 });
}
