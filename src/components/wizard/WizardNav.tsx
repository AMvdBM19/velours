'use client';

interface WizardNavProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  showBack?: boolean;
  disabled?: boolean;
}

export default function WizardNav({
  onBack,
  onNext,
  nextLabel = 'Continue',
  showBack = true,
  disabled = false,
}: WizardNavProps) {
  return (
    <div className="flex justify-between pt-8 border-t border-gray-200 mt-8">
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← Back
        </button>
      ) : (
        <div />
      )}
      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={disabled}
          className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {nextLabel} →
        </button>
      )}
    </div>
  );
}
