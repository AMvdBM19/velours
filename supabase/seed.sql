-- Velours ERP — Seed Data
-- Two test tenants with full settings and default notification templates

-- ============================================================================
-- TENANT 1: Velours Amsterdam
-- ============================================================================
INSERT INTO tenants (id, name, slug, kvk_number, license_number, registered_domain, domain_verified, is_active, wizard_completed)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Velours Amsterdam',
  'velours-amsterdam',
  '12345678',
  'AMS-2024-001',
  'velours-amsterdam.nl',
  TRUE,
  TRUE,
  TRUE
);

INSERT INTO tenant_settings (
  tenant_id, agency_display_name, brand_color, erp_theme,
  base_rate_per_30min, worker_payout_pct, agency_share_pct,
  currency, tax_rate_pct, tax_label,
  default_slot_minutes, min_lead_time_hours, max_booking_days_ahead,
  offline_behaviour, client_approval_mode,
  widget_layout, widget_primary_color, widget_accent_color
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Velours Amsterdam',
  '#2BB673',
  'light',
  60.00, 70.00, 30.00,
  'EUR', 21.00, 'BTW',
  30, 2, 30,
  'auto_approve', 'manual',
  'grid', '#2BB673', '#1D9E75'
);

-- Agent for Tenant 1
INSERT INTO agents (id, tenant_id, email, name, phone)
VALUES (
  'aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'agent@velours-amsterdam.nl',
  'Sophie de Vries',
  '+31612345678'
);

-- ============================================================================
-- TENANT 2: Rouge Rotterdam
-- ============================================================================
INSERT INTO tenants (id, name, slug, kvk_number, license_number, registered_domain, domain_verified, is_active, wizard_completed)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Rouge Rotterdam',
  'rouge-rotterdam',
  '87654321',
  'RTD-2024-002',
  'rouge-rotterdam.nl',
  TRUE,
  TRUE,
  TRUE
);

INSERT INTO tenant_settings (
  tenant_id, agency_display_name, brand_color, erp_theme,
  base_rate_per_30min, worker_payout_pct, agency_share_pct,
  currency, tax_rate_pct, tax_label,
  default_slot_minutes, min_lead_time_hours, max_booking_days_ahead,
  offline_behaviour, client_approval_mode,
  widget_layout, widget_primary_color, widget_accent_color
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'Rouge Rotterdam',
  '#E63946',
  'dark',
  75.00, 65.00, 35.00,
  'EUR', 21.00, 'BTW',
  60, 3, 14,
  'require_acknowledgement', 'manual',
  'list', '#E63946', '#C1121F'
);

-- Agent for Tenant 2
INSERT INTO agents (id, tenant_id, email, name, phone)
VALUES (
  'bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'agent@rouge-rotterdam.nl',
  'Emma Bakker',
  '+31698765432'
);

-- ============================================================================
-- DEFAULT NOTIFICATION TEMPLATES — Tenant 1
-- ============================================================================
INSERT INTO notification_templates (tenant_id, event_type, channel, subject, body) VALUES
  ('11111111-1111-1111-1111-111111111111', 'booking_confirmed', 'whatsapp', NULL,
   'Hi [client_name], your booking with [worker_name] on [date] at [time] ([duration] min) is confirmed. [agency_name]'),
  ('11111111-1111-1111-1111-111111111111', 'booking_confirmed', 'email', 'Booking Confirmed — [agency_name]',
   'Dear [client_name],\n\nYour booking with [worker_name] on [date] at [time] ([duration] min) has been confirmed.\n\nTotal: [price]\n\nRegards,\n[agency_name]'),
  ('11111111-1111-1111-1111-111111111111', 'booking_declined', 'whatsapp', NULL,
   'Hi [client_name], unfortunately [worker_name] is not available for your requested time. Visit [website_link] to schedule another worker. [agency_name]'),
  ('11111111-1111-1111-1111-111111111111', 'reminder', 'whatsapp', NULL,
   'Reminder: Your booking with [worker_name] is in 1 hour ([time]). [agency_name]'),
  ('11111111-1111-1111-1111-111111111111', 'account_approved', 'whatsapp', NULL,
   'Hi [client_name], your account at [agency_name] has been approved! Visit [website_link] to browse and book. [agency_name]'),
  ('11111111-1111-1111-1111-111111111111', 'account_approved', 'email', 'Account Approved — [agency_name]',
   'Dear [client_name],\n\nYour account has been approved. You can now browse workers and make bookings at [website_link].\n\nWelcome!\n[agency_name]'),
  ('11111111-1111-1111-1111-111111111111', 'account_rejected', 'email', 'Account Update — [agency_name]',
   'Dear [client_name],\n\nWe were unable to approve your account at this time.\n\nReason: [reason]\n\nIf you believe this is an error, please reply to this email.\n\n[agency_name]'),
  ('11111111-1111-1111-1111-111111111111', 'account_suspended', 'email', 'Account Suspended — [agency_name]',
   'Dear [client_name],\n\nYour account has been suspended.\n\nReason: [reason]\n\nIf you wish to appeal, please reply to this email.\n\n[agency_name]');

-- ============================================================================
-- DEFAULT NOTIFICATION TEMPLATES — Tenant 2
-- ============================================================================
INSERT INTO notification_templates (tenant_id, event_type, channel, subject, body) VALUES
  ('22222222-2222-2222-2222-222222222222', 'booking_confirmed', 'whatsapp', NULL,
   'Hi [client_name], your booking with [worker_name] on [date] at [time] ([duration] min) is confirmed. [agency_name]'),
  ('22222222-2222-2222-2222-222222222222', 'booking_confirmed', 'email', 'Booking Confirmed — [agency_name]',
   'Dear [client_name],\n\nYour booking with [worker_name] on [date] at [time] ([duration] min) has been confirmed.\n\nTotal: [price]\n\nRegards,\n[agency_name]'),
  ('22222222-2222-2222-2222-222222222222', 'booking_declined', 'whatsapp', NULL,
   'Hi [client_name], unfortunately [worker_name] is not available for your requested time. Visit [website_link] to schedule another worker. [agency_name]'),
  ('22222222-2222-2222-2222-222222222222', 'reminder', 'whatsapp', NULL,
   'Reminder: Your booking with [worker_name] is in 1 hour ([time]). [agency_name]'),
  ('22222222-2222-2222-2222-222222222222', 'account_approved', 'whatsapp', NULL,
   'Hi [client_name], your account at [agency_name] has been approved! Visit [website_link] to browse and book. [agency_name]'),
  ('22222222-2222-2222-2222-222222222222', 'account_approved', 'email', 'Account Approved — [agency_name]',
   'Dear [client_name],\n\nYour account has been approved. You can now browse workers and make bookings at [website_link].\n\nWelcome!\n[agency_name]'),
  ('22222222-2222-2222-2222-222222222222', 'account_rejected', 'email', 'Account Update — [agency_name]',
   'Dear [client_name],\n\nWe were unable to approve your account at this time.\n\nReason: [reason]\n\nIf you believe this is an error, please reply to this email.\n\n[agency_name]'),
  ('22222222-2222-2222-2222-222222222222', 'account_suspended', 'email', 'Account Suspended — [agency_name]',
   'Dear [client_name],\n\nYour account has been suspended.\n\nReason: [reason]\n\nIf you wish to appeal, please reply to this email.\n\n[agency_name]');

-- ============================================================================
-- LOCKED SETTINGS (populated after wizard completion)
-- ============================================================================
INSERT INTO tenant_locked_settings (tenant_id, field_name, locked_by) VALUES
  ('11111111-1111-1111-1111-111111111111', 'slug', 'wizard'),
  ('11111111-1111-1111-1111-111111111111', 'registered_domain', 'wizard'),
  ('11111111-1111-1111-1111-111111111111', 'kvk_number', 'wizard'),
  ('11111111-1111-1111-1111-111111111111', 'license_number', 'wizard'),
  ('11111111-1111-1111-1111-111111111111', 'currency', 'wizard'),
  ('11111111-1111-1111-1111-111111111111', 'worker_payout_pct', 'wizard'),
  ('11111111-1111-1111-1111-111111111111', 'agency_share_pct', 'wizard'),
  ('11111111-1111-1111-1111-111111111111', 'tax_rate_pct', 'wizard'),
  ('11111111-1111-1111-1111-111111111111', 'tax_label', 'wizard'),
  ('11111111-1111-1111-1111-111111111111', 'age_gate_minimum', 'wizard'),
  ('11111111-1111-1111-1111-111111111111', 'gdpr_retention_years', 'wizard'),
  ('11111111-1111-1111-1111-111111111111', 'erp_theme', 'wizard'),
  ('11111111-1111-1111-1111-111111111111', 'widget_layout', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'slug', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'registered_domain', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'kvk_number', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'license_number', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'currency', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'worker_payout_pct', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'agency_share_pct', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'tax_rate_pct', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'tax_label', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'age_gate_minimum', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'gdpr_retention_years', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'erp_theme', 'wizard'),
  ('22222222-2222-2222-2222-222222222222', 'widget_layout', 'wizard');
