'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import StepIdentity from '@/components/wizard/StepIdentity';
import StepFinancial from '@/components/wizard/StepFinancial';
import StepBookingRules from '@/components/wizard/StepBookingRules';
import StepClientApproval from '@/components/wizard/StepClientApproval';
import StepBranding from '@/components/wizard/StepBranding';
import StepTemplates from '@/components/wizard/StepTemplates';
import StepServiceTags from '@/components/wizard/StepServiceTags';
import StepReview from '@/components/wizard/StepReview';

export interface WizardData {
  tenant: Record<string, unknown>;
  settings: Record<string, unknown>;
  tags: Array<{ id?: string; name: string; description?: string; extra_price?: number }>;
  templates: Array<{
    event_type: string;
    channel: string;
    subject?: string;
    body: string;
  }>;
}

const STEP_LABELS = [
  'Agency Identity',
  'Financial & Legal',
  'Booking Rules',
  'Client Approval',
  'Branding & Design',
  'Notification Templates',
  'Service Tags',
  'Review & Launch',
];

const TOTAL_STEPS = 8;

export default function SetupWizardPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing wizard data (resume support)
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch(`/${slug}/api/setup/load`);
        if (!res.ok) throw new Error('Failed to load wizard data');
        const data = await res.json();
        setWizardData({
          tenant: data.tenant ?? {},
          settings: data.settings ?? {},
          tags: data.tags ?? [],
          templates: data.templates ?? [],
        });
        setCurrentStep(data.currentStep ?? 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [slug]);

  // Auto-save draft on step change
  const saveDraft = useCallback(
    async (step: number, data: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch(`/${slug}/api/setup/save-draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step, data }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Save failed');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed');
      } finally {
        setSaving(false);
      }
    },
    [slug]
  );

  // Update wizard data from step components
  const updateData = useCallback(
    (section: 'tenant' | 'settings' | 'tags' | 'templates', values: unknown) => {
      setWizardData((prev) => {
        if (!prev) return prev;
        if (section === 'tags') {
          return { ...prev, tags: values as WizardData['tags'] };
        }
        if (section === 'templates') {
          return { ...prev, templates: values as WizardData['templates'] };
        }
        return {
          ...prev,
          [section]: { ...prev[section], ...(values as Record<string, unknown>) },
        };
      });
    },
    []
  );

  async function handleNext(stepData: Record<string, unknown>) {
    await saveDraft(currentStep, stepData);
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  }

  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/${slug}/api/setup/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to complete setup');
      }
      router.push(`/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading setup wizard...</p>
      </div>
    );
  }

  if (!wizardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-600">Failed to load wizard data. Please refresh.</p>
      </div>
    );
  }

  const stepProps = {
    data: wizardData,
    updateData,
    onNext: handleNext,
    onBack: handleBack,
    slug,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-gray-900">Agency Setup</h1>
            <span className="text-sm text-gray-500">
              Step {currentStep} of {TOTAL_STEPS}
              {saving && ' • Saving...'}
            </span>
          </div>

          {/* Step indicators */}
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i + 1 <= currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <p className="text-sm text-gray-500 mt-2">{STEP_LABELS[currentStep - 1]}</p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="max-w-3xl mx-auto px-4 mt-4">
          <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {currentStep === 1 && <StepIdentity {...stepProps} />}
        {currentStep === 2 && <StepFinancial {...stepProps} />}
        {currentStep === 3 && <StepBookingRules {...stepProps} />}
        {currentStep === 4 && <StepClientApproval {...stepProps} />}
        {currentStep === 5 && <StepBranding {...stepProps} />}
        {currentStep === 6 && <StepTemplates {...stepProps} />}
        {currentStep === 7 && <StepServiceTags {...stepProps} />}
        {currentStep === 8 && (
          <StepReview
            {...stepProps}
            onComplete={handleComplete}
            completing={saving}
          />
        )}
      </div>
    </div>
  );
}
