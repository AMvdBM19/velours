'use client';

import { useState } from 'react';
import type { StepProps } from './types';
import WizardNav from './WizardNav';

const TAX_LABELS = ['BTW', 'VAT', 'MwSt', 'TVA'];
const TAX_PERIODS = ['quarterly', 'monthly', 'annual'];

export default function StepFinancial({ data, updateData, onNext, onBack }: StepProps) {
  const s = data.settings;

  const [currency, setCurrency] = useState((s.currency as string) || 'EUR');
  const [baseRate, setBaseRate] = useState(Number(s.base_rate_per_30min) || 60);
  const [workerPct, setWorkerPct] = useState(Number(s.worker_payout_pct) || 70);
  const [pricingEnabled, setPricingEnabled] = useState(s.pricing_enabled !== false);
  const [showPrice, setShowPrice] = useState(s.show_price_to_client !== false);
  const [taxLabel, setTaxLabel] = useState((s.tax_label as string) || 'BTW');
  const [taxRate, setTaxRate] = useState(Number(s.tax_rate_pct) || 21);
  const [taxPeriod, setTaxPeriod] = useState((s.tax_period as string) || 'quarterly');
  const [noShowPolicy, setNoShowPolicy] = useState((s.no_show_revenue_policy as string) || 'zero');
  const [noShowPct, setNoShowPct] = useState(Number(s.no_show_partial_pct) || 50);

  const agencyPct = 100 - workerPct;

  function handleNext() {
    const stepData = {
      currency,
      base_rate_per_30min: baseRate,
      worker_payout_pct: workerPct,
      agency_share_pct: agencyPct,
      pricing_enabled: pricingEnabled,
      show_price_to_client: showPrice,
      tax_label: taxLabel,
      tax_rate_pct: taxRate,
      tax_period: taxPeriod,
      no_show_revenue_policy: noShowPolicy,
      no_show_partial_pct: noShowPct,
    };
    updateData('settings', stepData);
    onNext(stepData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Financial & Legal Setup</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure pricing, payout splits, and tax settings. Fields marked 🔒 are locked after launch.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency 🔒</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Rate per 30 min</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-400 text-sm">€</span>
              <input
                type="number"
                value={baseRate}
                onChange={(e) => setBaseRate(Number(e.target.value))}
                min={0}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            {baseRate === 0 && pricingEnabled && (
              <p className="text-xs text-amber-600 mt-1">⚠ Base rate is 0 with pricing enabled</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payout Split 🔒
          </label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Worker</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={workerPct}
                  onChange={(e) => setWorkerPct(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium w-12 text-right">{workerPct}%</span>
              </div>
            </div>
            <div className="text-center text-gray-400">/</div>
            <div className="w-20 text-right">
              <label className="text-xs text-gray-500">Agency</label>
              <p className="text-sm font-medium">{agencyPct}%</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pricingEnabled}
              onChange={(e) => setPricingEnabled(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Enable pricing module</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showPrice}
              onChange={(e) => setShowPrice(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-700">Show price to clients</span>
          </label>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Tax Configuration 🔒</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tax Label</label>
              <select
                value={taxLabel}
                onChange={(e) => setTaxLabel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {TAX_LABELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tax Rate %</label>
              <input
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Math.max(0, Math.min(100, Number(e.target.value))))}
                min={0}
                max={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Period</label>
              <select
                value={taxPeriod}
                onChange={(e) => setTaxPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {TAX_PERIODS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">No-Show Policy</h3>
          <div className="flex gap-4">
            {(['zero', 'partial', 'full'] as const).map((policy) => (
              <label key={policy} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="no_show"
                  checked={noShowPolicy === policy}
                  onChange={() => setNoShowPolicy(policy)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700 capitalize">{policy === 'zero' ? 'No revenue' : policy}</span>
              </label>
            ))}
          </div>
          {noShowPolicy === 'partial' && (
            <div className="mt-2">
              <label className="text-xs text-gray-500">Partial percentage</label>
              <input
                type="number"
                value={noShowPct}
                onChange={(e) => setNoShowPct(Number(e.target.value))}
                min={1}
                max={99}
                className="ml-2 w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              />
              <span className="text-sm text-gray-500 ml-1">%</span>
            </div>
          )}
        </div>
      </div>

      <WizardNav onBack={onBack} onNext={handleNext} />
    </div>
  );
}
