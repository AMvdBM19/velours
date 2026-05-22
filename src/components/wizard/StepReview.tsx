'use client';

import type { StepProps } from './types';
import WizardNav from './WizardNav';

interface StepReviewProps extends StepProps {
  onComplete: () => Promise<void>;
  completing: boolean;
}

const LOCKED_FIELDS = new Set([
  'slug', 'registered_domain', 'kvk_number', 'license_number',
  'currency', 'worker_payout_pct', 'agency_share_pct',
  'tax_rate_pct', 'tax_label', 'age_gate_minimum',
  'gdpr_retention_years', 'erp_theme', 'widget_layout',
]);

interface ReviewItem {
  label: string;
  value: string;
  field: string;
}

export default function StepReview({ data, onBack, onComplete, completing }: StepReviewProps) {
  const t = data.tenant;
  const s = data.settings;

  const sections: { title: string; items: ReviewItem[] }[] = [
    {
      title: 'Agency Identity',
      items: [
        { label: 'Display Name', value: String(s.agency_display_name || t.name || ''), field: 'agency_display_name' },
        { label: 'Slug', value: String(t.slug || ''), field: 'slug' },
        { label: 'KVK Number', value: String(t.kvk_number || '—'), field: 'kvk_number' },
        { label: 'License', value: String(t.license_number || '—'), field: 'license_number' },
        { label: 'Domain', value: String(t.registered_domain || 'Standalone page'), field: 'registered_domain' },
      ],
    },
    {
      title: 'Financial & Legal',
      items: [
        { label: 'Currency', value: String(s.currency || 'EUR'), field: 'currency' },
        { label: 'Base Rate /30min', value: `€${s.base_rate_per_30min || 60}`, field: 'base_rate_per_30min' },
        { label: 'Worker Payout', value: `${s.worker_payout_pct || 70}%`, field: 'worker_payout_pct' },
        { label: 'Agency Share', value: `${s.agency_share_pct || 30}%`, field: 'agency_share_pct' },
        { label: 'Tax', value: `${s.tax_rate_pct || 21}% ${s.tax_label || 'BTW'}`, field: 'tax_rate_pct' },
      ],
    },
    {
      title: 'Booking Rules',
      items: [
        { label: 'Slot Duration', value: `${s.default_slot_minutes || 30} min`, field: 'default_slot_minutes' },
        { label: 'Lead Time', value: `${s.min_lead_time_hours || 2} hours`, field: 'min_lead_time_hours' },
        { label: 'Booking Window', value: `${s.max_booking_days_ahead || 30} days`, field: 'max_booking_days_ahead' },
        { label: 'Age Gate', value: `${s.age_gate_minimum || 21}+`, field: 'age_gate_minimum' },
      ],
    },
    {
      title: 'Branding',
      items: [
        { label: 'ERP Theme', value: String(s.erp_theme || 'light'), field: 'erp_theme' },
        { label: 'Brand Color', value: String(s.brand_color || '#2BB673'), field: 'brand_color' },
        { label: 'Widget Layout', value: String(s.widget_layout || 'grid'), field: 'widget_layout' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Review & Launch</h2>
        <p className="text-sm text-gray-500 mt-1">
          Review your settings before launching. 🔒 = locked after launch. ✏️ = editable in Settings.
        </p>
      </div>

      {sections.map((section) => (
        <div key={section.title} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <h3 className="text-sm font-medium text-gray-900 px-4 py-3 bg-gray-50 border-b border-gray-200">
            {section.title}
          </h3>
          <div className="divide-y divide-gray-100">
            {section.items.map((item) => (
              <div key={item.field} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs">
                    {LOCKED_FIELDS.has(item.field) ? '🔒' : '✏️'}
                  </span>
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Service tags summary */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <h3 className="text-sm font-medium text-gray-900 px-4 py-3 bg-gray-50 border-b border-gray-200">
          Service Tags ({data.tags.length})
        </h3>
        <div className="px-4 py-3 flex flex-wrap gap-2">
          {data.tags.map((tag, i) => (
            <span
              key={i}
              className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full"
            >
              {tag.name}
              {tag.extra_price != null && ` +€${tag.extra_price}`}
            </span>
          ))}
        </div>
      </div>

      {/* Templates summary */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <h3 className="text-sm font-medium text-gray-900 px-4 py-3 bg-gray-50 border-b border-gray-200">
          Notification Templates ({data.templates.length})
        </h3>
        <p className="px-4 py-3 text-sm text-gray-500">
          {data.templates.length} templates configured. All editable from Settings after launch.
        </p>
      </div>

      {/* Launch */}
      <div className="bg-emerald-50 rounded-lg p-6 text-center">
        <p className="text-sm text-emerald-800 mb-4">
          Ready to launch? Settings marked with 🔒 will be locked.
          You can request changes to locked settings via the support portal.
        </p>
        <button
          type="button"
          onClick={onComplete}
          disabled={completing}
          className="px-8 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-lg"
        >
          {completing ? 'Launching...' : '🚀 Launch Agency'}
        </button>
      </div>

      <WizardNav onBack={onBack} showBack={true} />
    </div>
  );
}
