import { NextResponse, type NextRequest } from 'next/server';
import { apiGuard } from '@/lib/auth/api-guard';
import { createClient } from '@supabase/supabase-js';
import dns from 'dns/promises';

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/**
 * DNS TXT verification for embed widget domain.
 * Checks if the tenant's registered domain has the expected TXT record.
 */
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;

  const { user } = guard;
  const supabase = supabaseAdmin();

  // Get tenant's domain and token
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('registered_domain, domain_txt_token, domain_verified')
    .eq('id', user.tenantId)
    .single();

  if (error || !tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  if (!tenant.registered_domain) {
    return NextResponse.json({ error: 'No domain registered' }, { status: 400 });
  }

  if (tenant.domain_verified) {
    return NextResponse.json({ verified: true, message: 'Domain already verified' });
  }

  // Generate token if not exists
  let token = tenant.domain_txt_token;
  if (!token) {
    token = `velours-verify=${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    await supabase
      .from('tenants')
      .update({ domain_txt_token: token })
      .eq('id', user.tenantId);
  }

  // Check DNS TXT records
  try {
    const records = await dns.resolveTxt(tenant.registered_domain);
    const flatRecords = records.map((r) => r.join(''));
    const found = flatRecords.some((r) => r === token);

    if (found) {
      await supabase
        .from('tenants')
        .update({ domain_verified: true })
        .eq('id', user.tenantId);

      return NextResponse.json({ verified: true, message: 'Domain verified successfully' });
    }

    return NextResponse.json({
      verified: false,
      token,
      message: `Add this TXT record to your domain DNS: ${token}`,
    });
  } catch {
    return NextResponse.json({
      verified: false,
      token,
      message: `DNS lookup failed. Add this TXT record to your domain DNS: ${token}`,
    });
  }
}
