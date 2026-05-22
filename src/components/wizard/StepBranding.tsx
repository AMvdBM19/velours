'use client';

import { useState, useMemo } from 'react';
import type { StepProps } from './types';
import WizardNav from './WizardNav';
import { contrastRatio, autoTextColor, suggestAccessibleColor, widgetBgToHex } from '@/lib/utils/contrast';

const FONT_PAIRS = [
  { value: 'default', label: 'System Default' },
  { value: 'inter-merriweather', label: 'Inter + Merriweather' },
  { value: 'poppins-lora', label: 'Poppins + Lora' },
  { value: 'dm-sans-dm-serif', label: 'DM Sans + DM Serif' },
  { value: 'nunito-playfair', label: 'Nunito + Playfair Display' },
  { value: 'rubik-source-serif', label: 'Rubik + Source Serif' },
];

const WIDGET_BG_OPTIONS = [
  { value: 'white', label: 'White', hex: '#FFFFFF' },
  { value: 'off-white', label: 'Off-white', hex: '#F9FAFB' },
  { value: 'light-gray', label: 'Light Gray', hex: '#F3F4F6' },
  { value: 'dark', label: 'Dark', hex: '#1F2937' },
];

const WIDGET_LAYOUTS = [
  { value: 'grid', label: 'Grid', desc: 'Photo-led cards in a responsive grid' },
  { value: 'list', label: 'List', desc: 'Compact rows with photo thumbnails' },
  { value: 'minimal', label: 'Minimal', desc: 'Text-only, no photos' },
];

export default function StepBranding({ data, updateData, onNext, onBack }: StepProps) {
  const s = data.settings;

  // ERP
  const [erpTheme, setErpTheme] = useState((s.erp_theme as string) || 'light');
  const [brandColor, setBrandColor] = useState((s.brand_color as string) || '#2BB673');

  // Widget
  const [widgetLayout, setWidgetLayout] = useState((s.widget_layout as string) || 'grid');
  const [widgetPrimary, setWidgetPrimary] = useState((s.widget_primary_color as string) || '#2BB673');
  const [widgetAccent, setWidgetAccent] = useState((s.widget_accent_color as string) || '#1D9E75');
  const [widgetBg, setWidgetBg] = useState((s.widget_bg as string) || 'white');
  const [fontPair, setFontPair] = useState((s.widget_font_pair as string) || 'default');

  // Compute contrast warnings
  const erpSurface = erpTheme === 'light' ? '#FFFFFF' : '#1F2937';
  const brandContrast = useMemo(() => contrastRatio(brandColor, erpSurface), [brandColor, erpSurface]);
  const brandPasses = brandContrast >= 3; // AA large text for UI elements

  const widgetBgHex = widgetBgToHex(widgetBg);
  const widgetPrimaryContrast = useMemo(
    () => contrastRatio(widgetPrimary, widgetBgHex),
    [widgetPrimary, widgetBgHex]
  );
  const widgetPrimaryPasses = widgetPrimaryContrast >= 4.5;

  const suggestedBrand = useMemo(
    () => (!brandPasses ? suggestAccessibleColor(brandColor, erpSurface) : null),
    [brandPasses, brandColor, erpSurface]
  );
  const suggestedPrimary = useMemo(
    () => (!widgetPrimaryPasses ? suggestAccessibleColor(widgetPrimary, widgetBgHex) : null),
    [widgetPrimaryPasses, widgetPrimary, widgetBgHex]
  );

  const autoText = autoTextColor(widgetBgHex);

  function handleNext() {
    const stepData = {
      erp_theme: erpTheme,
      brand_color: brandColor,
      widget_layout: widgetLayout,
      widget_primary_color: widgetPrimary,
      widget_accent_color: widgetAccent,
      widget_bg: widgetBg,
      widget_font_pair: fontPair,
    };
    updateData('settings', stepData);
    onNext(stepData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Branding & Design</h2>
        <p className="text-sm text-gray-500 mt-1">
          Customize the look of your ERP and client-facing widget.
        </p>
      </div>

      {/* ERP Theme */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">ERP Portal Theme 🔒</h3>
        <div className="flex gap-3">
          {(['light', 'dark'] as const).map((theme) => (
            <button
              key={theme}
              type="button"
              onClick={() => setErpTheme(theme)}
              className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                erpTheme === theme
                  ? 'border-emerald-500'
                  : 'border-gray-200 hover:border-gray-300'
              } ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}
            >
              <p className="text-sm font-medium capitalize">{theme}</p>
            </button>
          ))}
        </div>

        {/* Brand Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Brand Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            />
            <div
              className="h-10 px-4 rounded-lg flex items-center text-sm font-medium"
              style={{ backgroundColor: brandColor, color: autoTextColor(brandColor) }}
            >
              Preview
            </div>
          </div>
          {!brandPasses && (
            <div className="mt-2 p-2 bg-amber-50 rounded text-xs text-amber-700">
              ⚠ Low contrast ({brandContrast.toFixed(1)}:1) against {erpTheme} background.
              {suggestedBrand && (
                <button
                  type="button"
                  onClick={() => setBrandColor(suggestedBrand)}
                  className="ml-2 underline font-medium"
                >
                  Use {suggestedBrand}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Widget Layout */}
      <div className="border-t border-gray-200 pt-4 space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Client Widget 🔒 (layout)</h3>
        <div className="grid grid-cols-3 gap-3">
          {WIDGET_LAYOUTS.map((layout) => (
            <button
              key={layout.value}
              type="button"
              onClick={() => setWidgetLayout(layout.value)}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                widgetLayout === layout.value
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-medium text-gray-900">{layout.label}</p>
              <p className="text-xs text-gray-500 mt-1">{layout.desc}</p>
            </button>
          ))}
        </div>

        {/* Widget Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={widgetPrimary}
                onChange={(e) => setWidgetPrimary(e.target.value)}
                className="h-8 w-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={widgetPrimary}
                onChange={(e) => setWidgetPrimary(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
              />
            </div>
            {!widgetPrimaryPasses && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠ Low contrast ({widgetPrimaryContrast.toFixed(1)}:1)
                {suggestedPrimary && (
                  <button
                    type="button"
                    onClick={() => setWidgetPrimary(suggestedPrimary)}
                    className="ml-1 underline"
                  >
                    Fix
                  </button>
                )}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={widgetAccent}
                onChange={(e) => setWidgetAccent(e.target.value)}
                className="h-8 w-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={widgetAccent}
                onChange={(e) => setWidgetAccent(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Background</label>
          <div className="flex gap-2">
            {WIDGET_BG_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWidgetBg(opt.value)}
                className={`px-3 py-2 rounded-lg text-xs border-2 transition-colors ${
                  widgetBg === opt.value
                    ? 'border-emerald-500'
                    : 'border-gray-200'
                }`}
                style={{ backgroundColor: opt.hex, color: autoTextColor(opt.hex) }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Text color auto-computed: {autoText}
          </p>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Font Pair</label>
          <select
            value={fontPair}
            onChange={(e) => setFontPair(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {FONT_PAIRS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Live preview card */}
        <div
          className="rounded-xl p-6 border"
          style={{ backgroundColor: widgetBgHex, color: autoText }}
        >
          <p className="text-xs opacity-60 mb-2">Widget Preview</p>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-gray-300" />
            <div>
              <p className="font-medium">Worker Name</p>
              <p className="text-xs opacity-70">Amsterdam • 25</p>
            </div>
          </div>
          <button
            type="button"
            className="mt-3 px-4 py-1.5 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: widgetPrimary,
              color: autoTextColor(widgetPrimary),
            }}
          >
            Book Now
          </button>
          <span
            className="ml-2 text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: widgetAccent,
              color: autoTextColor(widgetAccent),
            }}
          >
            Available
          </span>
        </div>
      </div>

      <WizardNav onBack={onBack} onNext={handleNext} />
    </div>
  );
}
