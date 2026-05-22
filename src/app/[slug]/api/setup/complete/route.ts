import { NextResponse, type NextRequest } from 'next/server';
import { apiGuard } from '@/lib/auth/api-guard';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/** Fields locked after wizard completion */
const LOCKED_FIELDS = [
  'slug',
  'registered_domain',
  'kvk_number',
  'license_number',
  'currency',
  'worker_payout_pct',
  'agency_share_pct',
  'tax_rate_pct',
  'tax_label',
  'age_gate_minimum',
  'gdpr_retention_years',
  'erp_theme',
  'widget_layout',
];

/** Default notification templates seeded on completion */
const DEFAULT_TEMPLATES = [
  {
    event_type: 'booking_confirmed',
    channel: 'whatsapp',
    body: 'Hi [client_name], your booking with [worker_name] on [date] at [time] ([duration] min) is confirmed. [agency_name]',
  },
  {
    event_type: 'booking_confirmed',
    channel: 'email',
    subject: 'Booking Confirmed — [agency_name]',
    body: 'Dear [client_name],\n\nYour booking with [worker_name] on [date] at [time] ([duration] min) has been confirmed.\n\nTotal: [price]\n\nRegards,\n[agency_name]',
  },
  {
    event_type: 'booking_declined',
    channel: 'whatsapp',
    body: 'Hi [client_name], unfortunately [worker_name] is not available for your requested time. Visit [website_link] to schedule another worker. [agency_name]',
  },
  {
    event_type: 'reminder',
    channel: 'whatsapp',
    body: 'Reminder: Your booking with [worker_name] is in 1 hour ([time]). [agency_name]',
  },
  {
    event_type: 'account_approved',
    channel: 'whatsapp',
    body: 'Hi [client_name], your account at [agency_name] has been approved! Visit [website_link] to browse and book. [agency_name]',
  },
  {
    event_type: 'account_approved',
    channel: 'email',
    subject: 'Account Approved — [agency_name]',
    body: 'Dear [client_name],\n\nYour account has been approved. You can now browse workers and make bookings at [website_link].\n\nWelcome!\n[agency_name]',
  },
  {
    event_type: 'account_rejected',
    channel: 'email',
    subject: 'Account Update — [agency_name]',
    body: 'Dear [client_name],\n\nWe were unable to approve your account at this time.\n\nReason: [reason]\n\nIf you believe this is an error, please reply to this email.\n\n[agency_name]',
  },
  {
    event_type: 'account_suspended',
    channel: 'email',
    subject: 'Account Suspended — [agency_name]',
    body: 'Dear [client_name],\n\nYour account has been suspended.\n\nReason: [reason]\n\nIf you wish to appeal, please reply to this email.\n\n[agency_name]',
  },
];

/**
 * Complete the onboarding wizard.
 * - Sets wizard_completed = true
 * - Populates tenant_locked_settings
 * - Seeds default notification templates (if not already present)
 */
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;

  const { user } = guard;
  const supabase = supabaseAdmin();

  // Validate: at least 1 service tag exists
  const { count: tagCount } = await supabase
    .from('service_tags')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId)
    .eq('is_active', true);

  if (!tagCount || tagCount < 1) {
    return NextResponse.json(
      { error: 'At least one service tag is required to launch.' },
      { status: 400 }
    );
  }

  // Mark wizard as completed
  const { error: tenantError } = await supabase
    .from('tenants')
    .update({ wizard_completed: true, wizard_step: 8 })
    .eq('id', user.tenantId);

  if (tenantError) {
    return NextResponse.json({ error: tenantError.message }, { status: 500 });
  }

  // Lock settings
  const lockRows = LOCKED_FIELDS.map((field) => ({
    tenant_id: user.tenantId,
    field_name: field,
    locked_by: 'wizard',
  }));

  await supabase
    .from('tenant_locked_settings')
    .upsert(lockRows, { onConflict: 'tenant_id,field_name' });

  // Seed default notification templates (upsert — don't overwrite if edited during wizard)
  for (const tpl of DEFAULT_TEMPLATES) {
    await supabase
      .from('notification_templates')
      .upsert(
        {
          tenant_id: user.tenantId,
          event_type: tpl.event_type,
          channel: tpl.channel,
          subject: 'subject' in tpl ? tpl.subject : null,
          body: tpl.body,
        },
        { onConflict: 'tenant_id,event_type,channel' }
      );
  }

  return NextResponse.json({ success: true, redirectTo: `/${user.tenantId}` });
}
