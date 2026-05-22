'use client';

import { useState } from 'react';
import type { StepProps } from './types';
import WizardNav from './WizardNav';

interface Tag {
  id?: string;
  name: string;
  description?: string;
  extra_price?: number;
}

export default function StepServiceTags({ data, updateData, onNext, onBack }: StepProps) {
  const pricingEnabled = data.settings.pricing_enabled !== false;
  const [tags, setTags] = useState<Tag[]>(data.tags.length > 0 ? data.tags : []);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState<number | undefined>(undefined);

  function addTag() {
    if (!newName.trim()) return;
    setTags((prev) => [
      ...prev,
      {
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        extra_price: newPrice,
      },
    ]);
    setNewName('');
    setNewDesc('');
    setNewPrice(undefined);
  }

  function removeTag(index: number) {
    setTags((prev) => prev.filter((_, i) => i !== index));
  }

  function handleNext() {
    updateData('tags', tags);
    onNext({ tags });
  }

  const canProceed = tags.length >= 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Service Tags</h2>
        <p className="text-sm text-gray-500 mt-1">
          Define the services your agency offers. At least one tag is required to launch.
          You can add more later from Settings.
        </p>
      </div>

      {/* Add tag form */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Tag name (e.g. Massage)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            onKeyDown={(e) => e.key === 'Enter' && addTag()}
          />
          {pricingEnabled && (
            <div className="relative w-28">
              <span className="absolute left-3 top-2 text-gray-400 text-sm">€</span>
              <input
                type="number"
                value={newPrice ?? ''}
                onChange={(e) => setNewPrice(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Extra"
                min={0}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}
          <button
            type="button"
            onClick={addTag}
            disabled={!newName.trim()}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>
        <input
          type="text"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Optional description"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Tag list */}
      {tags.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">
          No tags added yet. Add at least one to continue.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2"
            >
              <div>
                <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                {tag.extra_price != null && pricingEnabled && (
                  <span className="text-xs text-emerald-600 ml-1">+€{tag.extra_price}</span>
                )}
                {tag.description && (
                  <p className="text-xs text-gray-500">{tag.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="text-gray-400 hover:text-red-500 text-sm transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        {tags.length} tag{tags.length !== 1 ? 's' : ''} added
        {tags.length < 1 && ' • Minimum 1 required'}
      </p>

      <WizardNav onBack={onBack} onNext={handleNext} disabled={!canProceed} />
    </div>
  );
}
