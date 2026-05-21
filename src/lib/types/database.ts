// Database row types — generated from schema
// These will be replaced by Supabase-generated types in production

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  kvk_number: string | null;
  license_number: string | null;
  registered_domain: string | null;
  domain_verified: boolean;
  domain_txt_token: string | null;
  subscription_tier: string;
  is_active: boolean;
  wizard_completed: boolean;
  wizard_step: number;
  created_at: string;
}

export interface Agent {
  id: string;
  tenant_id: string;
  email: string;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface Worker {
  id: string;
  tenant_id: string;
  real_name: string | null;
  bsn: string | null;
  kvk_number: string | null;
  pseudonym: string;
  age: number | null;
  nationality: string | null;
  gender: string | null;
  languages: string[] | null;
  bio: string | null;
  photo_urls: string[] | null;
  status: 'active' | 'inactive' | 'offline';
  offline_reason: string | null;
  consent_photo_signed_at: string | null;
  tos_signed_at: string | null;
  btw_exempt: boolean;
  wizard_completed: boolean;
  first_login: boolean;
  created_at: string;
  created_by_agent_id: string | null;
}

export interface Client {
  id: string;
  tenant_id: string;
  real_name: string | null;
  email: string;
  phone: string | null;
  display_name: string;
  status: 'unverified' | 'pending' | 'approved' | 'rejected' | 'suspended';
  status_reason: string | null;
  status_changed_at: string | null;
  status_changed_by: string | null;
  wa_opt_in: boolean;
  wa_opt_in_at: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface TenantSettings {
  tenant_id: string;
  default_slot_minutes: number;
  min_lead_time_hours: number;
  max_booking_days_ahead: number;
  allow_back_to_back: boolean;
  cancellation_window_hours: number;
  pricing_enabled: boolean;
  base_rate_per_30min: number;
  worker_payout_pct: number;
  agency_share_pct: number;
  currency: string;
  show_price_to_client: boolean;
  no_show_revenue_policy: 'full' | 'partial' | 'zero';
  no_show_partial_pct: number;
  tax_rate_pct: number;
  tax_label: string;
  tax_period: string;
  client_approval_mode: 'auto' | 'manual';
  age_gate_minimum: number;
  require_age_confirm: boolean;
  require_id_upload: boolean;
  require_phone_verify: boolean;
  offline_behaviour: 'auto_approve' | 'require_acknowledgement' | 'blocked';
  reminder_lead_time_minutes: number;
  wa_sender_name: string | null;
  email_sender_name: string | null;
  worker_kpi_visible: boolean;
  notification_log_months: number;
  brand_color: string;
  logo_url: string | null;
  agency_display_name: string | null;
  erp_theme: 'light' | 'dark';
  widget_layout: 'grid' | 'list' | 'minimal';
  widget_primary_color: string;
  widget_accent_color: string;
  widget_bg: 'white' | 'off-white' | 'light-gray' | 'dark';
  widget_logo_url: string | null;
  widget_font_pair: string;
  max_workers: number;
  integrations_enabled: boolean;
  ai_assistant_enabled: boolean;
  ai_provider: 'anthropic' | 'openai' | 'mistral' | null;
  gdpr_retention_years: number;
  updated_at: string;
}
