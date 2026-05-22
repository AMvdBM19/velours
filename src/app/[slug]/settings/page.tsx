'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface TenantSettings {
  // Identity
  agency_name?: string;
  agency_tagline?: string;
  agency_email?: string;
  agency_phone?: string;
  // Financial
  base_rate_per_30min?: number;
  worker_payout_pct?: number;
  agency_share_pct?: number;
  currency?: string;
  tax_rate_pct?: number;
  tax_label?: string;
  // Booking rules
  default_slot_minutes?: number;
  min_lead_time_hours?: number;
  max_advance_booking_days?: number;
  allowed_location_types?: string[];
  offline_behaviour?: string;
  no_show_revenue_policy?: string;
  // Client settings
  client_approval_mode?: string;
  // Branding
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  widget_layout?: string;
  // WhatsApp
  wa_api_key?: string;
  wa_phone_number_id?: string;
  wa_business_account_id?: string;
  // Integrations
  maps_api_key?: string;
  llm_api_key?: string;
  [key: string]: unknown;
}

type Section = 'identity' | 'financial' | 'booking' | 'clients' | 'branding' | 'integrations';

const SECTION_LABELS: Record<Section, string> = {
  identity: 'Agency Identity',
  financial: 'Financial Settings',
  booking: 'Booking Rules',
  clients: 'Client Settings',
  branding: 'Branding',
  integrations: 'Integrations',
};

export default function SettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [settings, setSettings] = useState<TenantSettings>({});
  const [lockedKeys, setLockedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [section, setSection] = useState<Section>('identity');
  const [dirty, setDirty] = useState<Record<string, unknown>>({});

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`/${slug}/api/agent/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings || {});
        setLockedKeys(new Set(data.locked_keys || []));
      }
    } catch {
      // fail
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  function updateField(key: string, value: unknown) {
    setDirty(prev => ({ ...prev, [key]: value }));
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function saveChanges() {
    if (Object.keys(dirty).length === 0) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/${slug}/api/agent/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dirty),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      const msg = data.blocked?.length
        ? `Saved ${data.updated?.length || 0} setting(s). Locked: ${data.blocked.join(', ')}`
        : `Saved ${data.updated?.length || 0} setting(s)`;

      setMessage({ type: 'success', text: msg });
      setDirty({});
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-gray-500">Loading settings...</div>;

  function isLocked(key: string) {
    return lockedKeys.has(key);
  }

  function renderField(key: string, label: string, type: 'text' | 'number' | 'select' | 'color' = 'text', options?: { value: string; label: string }[]) {
    const locked = isLocked(key);
    const value = settings[key] ?? '';

    if (type === 'select' && options) {
      return (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {locked && <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Locked</span>}
          </label>
          <select
            value={String(value)}
            onChange={e => updateField(key, e.target.value)}
            disabled={locked}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
          >
            {options.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      );
    }

    if (type === 'color') {
      return (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {locked && <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Locked</span>}
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={String(value || '#000000')}
              onChange={e => updateField(key, e.target.value)}
              disabled={locked}
              className="w-10 h-10 rounded border border-gray-300 cursor-pointer disabled:opacity-50"
            />
            <input
              type="text"
              value={String(value || '')}
              onChange={e => updateField(key, e.target.value)}
              disabled={locked}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
              placeholder="#000000"
            />
          </div>
        </div>
      );
    }

    return (
      <div key={key}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {locked && <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Locked</span>}
        </label>
        <input
          type={type}
          value={String(value)}
          onChange={e => updateField(key, type === 'number' ? Number(e.target.value) : e.target.value)}
          disabled={locked}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
        />
      </div>
    );
  }

  const sections: Record<Section, React.ReactNode> = {
    identity: (
      <div className="space-y-4">
        {renderField('agency_name', 'Agency Name')}
        {renderField('agency_tagline', 'Tagline')}
        {renderField('agency_email', 'Contact Email')}
        {renderField('agency_phone', 'Contact Phone')}
      </div>
    ),
    financial: (
      <div className="space-y-4">
        {renderField('base_rate_per_30min', 'Base Rate per 30 min', 'number')}
        {renderField('worker_payout_pct', 'Worker Payout %', 'number')}
        {renderField('agency_share_pct', 'Agency Share %', 'number')}
        {renderField('currency', 'Currency', 'select', [
          { value: 'EUR', label: 'EUR (€)' },
          { value: 'USD', label: 'USD ($)' },
          { value: 'GBP', label: 'GBP (£)' },
        ])}
        {renderField('tax_rate_pct', 'Tax Rate %', 'number')}
        {renderField('tax_label', 'Tax Label (e.g. BTW)')}
      </div>
    ),
    booking: (
      <div className="space-y-4">
        {renderField('default_slot_minutes', 'Default Slot (minutes)', 'number')}
        {renderField('min_lead_time_hours', 'Min Lead Time (hours)', 'number')}
        {renderField('max_advance_booking_days', 'Max Advance Booking (days)', 'number')}
        {renderField('offline_behaviour', 'Offline Behaviour', 'select', [
          { value: 'hide_worker', label: 'Hide worker from catalog' },
          { value: 'show_unavailable', label: 'Show as unavailable' },
        ])}
        {renderField('no_show_revenue_policy', 'No-Show Revenue Policy', 'select', [
          { value: 'full', label: 'Full charge' },
          { value: 'partial', label: 'Partial charge' },
          { value: 'none', label: 'No charge' },
        ])}
      </div>
    ),
    clients: (
      <div className="space-y-4">
        {renderField('client_approval_mode', 'Client Approval Mode', 'select', [
          { value: 'auto', label: 'Auto-approve' },
          { value: 'manual', label: 'Manual approval required' },
        ])}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">
            When set to <strong>auto</strong>, new client registrations are immediately approved.
            With <strong>manual</strong>, agents must review and approve each client before they can book.
          </p>
        </div>
      </div>
    ),
    branding: (
      <div className="space-y-4">
        {renderField('primary_color', 'Primary Color', 'color')}
        {renderField('secondary_color', 'Secondary Color', 'color')}
        {renderField('logo_url', 'Logo URL')}
        {renderField('widget_layout', 'Widget Layout', 'select', [
          { value: 'grid', label: 'Grid' },
          { value: 'list', label: 'List' },
          { value: 'minimal', label: 'Minimal' },
        ])}
      </div>
    ),
    integrations: (
      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">WhatsApp Business API</h3>
          <div className="space-y-3">
            {renderField('wa_api_key', 'API Key')}
            {renderField('wa_phone_number_id', 'Phone Number ID')}
            {renderField('wa_business_account_id', 'Business Account ID')}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Leave empty to disable WhatsApp notifications. Clients will still receive in-platform notifications.
          </p>
        </div>
        <hr className="border-gray-200" />
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Other Integrations</h3>
          <div className="space-y-3">
            {renderField('maps_api_key', 'Maps API Key')}
            {renderField('llm_api_key', 'LLM API Key (AI features)')}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Integrations degrade gracefully. Without API keys, the platform uses basic fallbacks.
          </p>
        </div>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        {Object.keys(dirty).length > 0 && (
          <button
            type="button"
            onClick={saveChanges}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : `Save Changes (${Object.keys(dirty).length})`}
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="flex gap-6">
        {/* Section nav */}
        <nav className="w-48 flex-shrink-0">
          <ul className="space-y-1">
            {(Object.keys(SECTION_LABELS) as Section[]).map(s => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => setSection(s)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    section === s
                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {SECTION_LABELS[s]}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Section content */}
        <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{SECTION_LABELS[section]}</h2>
          {sections[section]}
        </div>
      </div>
    </div>
  );
}
