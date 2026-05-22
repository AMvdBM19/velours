import type { WizardData } from '@/app/[slug]/setup/page';

export interface StepProps {
  data: WizardData;
  updateData: (section: 'tenant' | 'settings' | 'tags' | 'templates', values: unknown) => void;
  onNext: (stepData: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
  slug: string;
}
