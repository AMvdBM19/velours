import { NextResponse, type NextRequest } from 'next/server';
import { apiGuard } from '@/lib/auth/api-guard';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

/**
 * Auto-save wizard draft per step.
 * Writes to tenants (wizard_step) + tenant_settings (all editable fields).
 */
export async function POST(request: NextRequest) {
  const guard = await apiGuard(request, ['agent']);
  if ('error' in guard) return guard.error;

  const { user } = guard;
  const body = await request.json();
  const { step, data } = body as { step: number; data: Record<string, unknown> };

  if (!step || !data) {
    return NextResponse.json({ error: 'Missing step or data' }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  // Update wizard_step on tenants
  await supabase
    .from('tenants')
    .update({ wizard_step: step })
    .eq('id', user.tenantId);

  // Step 1 writes to tenants table (identity fields)
  if (step === 1) {
    const tenantUpdate: Record<string, unknown> = {};
    const allowedTenantFields = ['name', 'slug', 'kvk_number', 'license_number', 'registered_domain'];
    for (const key of allowedTenantFields) {
      if (key in data) tenantUpdate[key] = data[key];
    }

    if (Object.keys(tenantUpdate).length > 0) {
      const { error } = await supabase
        .from('tenants')
        .update(tenantUpdate)
        .eq('id', user.tenantId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // agency_display_name goes to tenant_settings
    if ('agency_display_name' in data) {
      await supabase
        .from('tenant_settings')
        .update({ agency_display_name: data.agency_display_name })
        .eq('tenant_id', user.tenantId);
    }
  }

  // Steps 2-7 write to tenant_settings
  if (step >= 2 && step <= 7) {
    const settingsUpdate: Record<string, unknown> = {};
    const allowedSettingsFields = [
      // Step 2 — Financial
      'currency', 'base_rate_per_30min', 'worker_payout_pct', 'agency_share_pct',
      'pricing_enabled', 'show_price_to_client', 'tax_label', 'tax_rate_pct',
      'tax_period', 'no_show_revenue_policy', 'no_show_partial_pct',
      // Step 3 — Booking rules
      'default_slot_minutes', 'min_lead_time_hours', 'max_booking_days_ahead',
      'allow_back_to_back', 'cancellation_window_hours', 'age_gate_minimum',
      // Step 4 — Client approval
      'client_approval_mode', 'require_age_confirm', 'require_id_upload',
      'require_phone_verify', 'offline_behaviour',
      // Step 5 — Branding
      'erp_theme', 'brand_color', 'logo_url', 'widget_layout',
      'widget_primary_color', 'widget_accent_color', 'widget_bg',
      'widget_logo_url', 'widget_font_pair',
      // Step 6 — Notifications
      'reminder_lead_time_minutes', 'wa_sender_name', 'email_sender_name',
    ];

    for (const key of allowedSettingsFields) {
      if (key in data) settingsUpdate[key] = data[key];
    }

    settingsUpdate.updated_at = new Date().toISOString();

    if (Object.keys(settingsUpdate).length > 1) {
      const { error } = await supabase
        .from('tenant_settings')
        .update(settingsUpdate)
        .eq('tenant_id', user.tenantId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  // Step 6 — notification templates (handled separately)
  if (step === 6 && data.templates) {
    const templates = data.templates as Array<{
      event_type: string;
      channel: string;
      subject?: string;
      body: string;
    }>;

    for (const tpl of templates) {
      await supabase
        .from('notification_templates')
        .upsert(
          {
            tenant_id: user.tenantId,
            event_type: tpl.event_type,
            channel: tpl.channel,
            subject: tpl.subject ?? null,
            body: tpl.body,
          },
          { onConflict: 'tenant_id,event_type,channel' }
        );
    }
  }

  // Step 7 — service tags
  if (step === 7 && data.tags) {
    const tags = data.tags as Array<{
      id?: string;
      name: string;
      description?: string;
      extra_price?: number;
    }>;

    for (const tag of tags) {
      if (tag.id) {
        // Update existing tag
        await supabase
          .from('service_tags')
          .update({
            name: tag.name,
            description: tag.description ?? null,
            extra_price: tag.extra_price ?? null,
          })
          .eq('id', tag.id)
          .eq('tenant_id', user.tenantId);
      } else {
        // Insert new tag
        await supabase
          .from('service_tags')
          .insert({
            tenant_id: user.tenantId,
            name: tag.name,
            description: tag.description ?? null,
            extra_price: tag.extra_price ?? null,
          });
      }
    }
  }

  return NextResponse.json({ success: true, step });
}
