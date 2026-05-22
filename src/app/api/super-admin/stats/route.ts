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
 * GET /api/super-admin/stats
 * Aggregate stats across all tenants.
 */
export async function GET(request: NextRequest) {
  const authError = superAdminGuard(request);
  if (authError) return authError;

  const supabase = getServiceClient();
  const monthStart = new Date().toISOString().slice(0, 7) + '-01';

  const [
    tenantsRes,
    activeTenantsRes,
    workersRes,
    clientsRes,
    bookingsRes,
    revenueRes,
  ] = await Promise.all([
    supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('workers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('clients')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .gte('slot_date', monthStart),
    supabase
      .from('bookings')
      .select('total_price')
      .eq('status', 'completed')
      .gte('slot_date', monthStart),
  ]);

  const totalRevenue = (revenueRes.data ?? []).reduce(
    (sum, b) => sum + (Number(b.total_price) || 0),
    0
  );

  return NextResponse.json({
    total_tenants: tenantsRes.count ?? 0,
    active_tenants: activeTenantsRes.count ?? 0,
    total_workers: workersRes.count ?? 0,
    total_clients: clientsRes.count ?? 0,
    total_bookings_this_month: bookingsRes.count ?? 0,
    aggregate_revenue_this_month: totalRevenue,
  });
}
