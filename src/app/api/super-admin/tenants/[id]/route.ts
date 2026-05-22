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
 * GET /api/super-admin/tenants/[id]
 * Full tenant detail with settings snapshot and 30-day stats.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = superAdminGuard(request);
  if (authError) return authError;

  const supabase = getServiceClient();
  const tenantId = params.id;

  // Fetch tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Fetch settings, stats in parallel
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthStart = new Date().toISOString().slice(0, 7) + '-01';

  const [
    settingsRes,
    workersRes,
    activeWorkersRes,
    clientsRes,
    bookings30dRes,
    completedBookingsRes,
    revenueRes,
  ] = await Promise.all([
    supabase
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single(),
    supabase
      .from('workers')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('workers')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'active'),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('slot_date', thirtyDaysAgo),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('slot_date', monthStart),
    supabase
      .from('bookings')
      .select('total_price')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('slot_date', monthStart),
  ]);

  const monthRevenue = (revenueRes.data ?? []).reduce(
    (sum, b) => sum + (Number(b.total_price) || 0),
    0
  );

  return NextResponse.json({
    tenant,
    settings: settingsRes.data ?? {},
    stats: {
      total_workers: workersRes.count ?? 0,
      active_workers: activeWorkersRes.count ?? 0,
      total_clients: clientsRes.count ?? 0,
      bookings_last_30_days: bookings30dRes.count ?? 0,
      completed_bookings_this_month: completedBookingsRes.count ?? 0,
      revenue_this_month: monthRevenue,
    },
  });
}

/**
 * PATCH /api/super-admin/tenants/[id]
 * Update tenant status (active, suspended, trial).
 * Body: { status: 'active' | 'suspended' | 'trial' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = superAdminGuard(request);
  if (authError) return authError;

  const body = await request.json();
  const { status } = body as { status: string };

  if (!status || !['active', 'suspended', 'trial'].includes(status)) {
    return NextResponse.json(
      { error: 'status must be one of: active, suspended, trial' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const tenantId = params.id;

  // Verify tenant exists
  const { data: existing } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('id', tenantId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const isActive = status === 'active' || status === 'trial';

  const { error } = await supabase
    .from('tenants')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    tenant_id: tenantId,
    name: existing.name,
    status,
    is_active: isActive,
  });
}
