import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /[slug]/api/client/register
 * Public endpoint — client self-registration.
 * Body: { email, password, display_name, phone?, real_name?, wa_opt_in? }
 *
 * Flow:
 * 1. Resolve tenant from slug
 * 2. Create Supabase auth user with client role
 * 3. Insert client record
 * 4. Status: 'pending' (manual approval) or 'approved' (auto approval)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Resolve tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, is_active')
    .eq('slug', slug)
    .single();

  if (tenantError || !tenant) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  }

  if (!tenant.is_active) {
    return NextResponse.json({ error: 'This agency is not active' }, { status: 403 });
  }

  const body = await request.json();
  const { email, password, display_name, phone, real_name, wa_opt_in } = body as {
    email: string;
    password: string;
    display_name: string;
    phone?: string;
    real_name?: string;
    wa_opt_in?: boolean;
  };

  if (!email || !password || !display_name) {
    return NextResponse.json({ error: 'email, password, and display_name required' }, { status: 400 });
  }

  // Get tenant settings for approval mode
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('client_approval_mode, require_age_confirm, require_id_upload, require_phone_verify, age_gate_minimum')
    .eq('tenant_id', tenant.id)
    .single();

  const approvalMode = settings?.client_approval_mode || 'manual';
  const initialStatus = approvalMode === 'auto' ? 'approved' : 'pending';

  // Create auth user with client role
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      tenant_id: tenant.id,
      role: 'client',
      display_name,
    },
  });

  if (authError) {
    if (authError.message.includes('already been registered')) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (!authData.user) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }

  // Insert client record
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      id: authData.user.id,
      tenant_id: tenant.id,
      email,
      display_name,
      real_name: real_name || null,
      phone: phone || null,
      status: initialStatus,
      wa_opt_in: wa_opt_in || false,
      wa_opt_in_at: wa_opt_in ? new Date().toISOString() : null,
      approved_at: initialStatus === 'approved' ? new Date().toISOString() : null,
    })
    .select('id, display_name, status')
    .single();

  if (clientError) {
    // Rollback auth user on client insert failure
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: 'Failed to create client: ' + clientError.message }, { status: 500 });
  }

  // Log initial status
  await supabase.from('client_status_log').insert({
    tenant_id: tenant.id,
    client_id: client.id,
    old_status: null,
    new_status: initialStatus,
    reason: initialStatus === 'approved' ? 'Auto-approved per agency settings' : 'Pending agent review',
    changed_by: 'system',
  });

  // Notify agent of new signup
  const { notifyClientSignup, notifyClientApproved } = await import('@/lib/notifications/dispatch');
  await notifyClientSignup(tenant.id, client.id, display_name);

  // If auto-approved and WA opted in, send confirmation
  if (initialStatus === 'approved' && wa_opt_in && phone) {
    await notifyClientApproved(tenant.id, phone, true, display_name);
  }

  return NextResponse.json({
    client: {
      id: client.id,
      display_name: client.display_name,
      status: client.status,
    },
    message: initialStatus === 'approved'
      ? 'Account created and approved! You can now browse and book.'
      : 'Account created. Your application is pending review by the agency.',
  }, { status: 201 });
}
