'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Step components
import StepWorkerIdentity from '@/components/worker-onboarding/StepWorkerIdentity';
import StepWorkerPhotos from '@/components/worker-onboarding/StepWorkerPhotos';
import StepWorkerServices from '@/components/worker-onboarding/StepWorkerServices';
import StepWorkerSchedule from '@/components/worker-onboarding/StepWorkerSchedule';

interface WorkerProfile {
  pseudonym: string;
  age: number | null;
  nationality: string;
  gender: string;
  languages: string[];
  bio: string;
  photo_urls: string[];
  consent_photo_signed_at: string | null;
}

interface ServiceTag {
  id: string;
  name: string;
  description?: string;
  extra_price?: number;
  selected: boolean;
}

interface ScheduleSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

const STEPS = [
  { label: 'Identity', description: 'Your display name and details' },
  { label: 'Photos', description: 'Upload photos with consent' },
  { label: 'Services', description: 'Select your service tags' },
  { label: 'Schedule', description: 'Set your weekly availability' },
];

export default function WorkerOnboardingPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State
  const [profile, setProfile] = useState<WorkerProfile>({
    pseudonym: '',
    age: null,
    nationality: '',
    gender: '',
    languages: [],
    bio: '',
    photo_urls: [],
    consent_photo_signed_at: null,
  });
  const [tags, setTags] = useState<ServiceTag[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);

  // Load existing data on mount
  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/${slug}/api/worker/onboarding`);
      if (!res.ok) throw new Error('Failed to load onboarding data');
      const data = await res.json();

      if (data.worker) {
        setProfile(prev => ({
          ...prev,
          pseudonym: data.worker.pseudonym || '',
          age: data.worker.age,
          nationality: data.worker.nationality || '',
          gender: data.worker.gender || '',
          languages: data.worker.languages || [],
          bio: data.worker.bio || '',
          photo_urls: data.worker.photo_urls || [],
          consent_photo_signed_at: data.worker.consent_photo_signed_at,
        }));

        if (data.worker.wizard_completed) {
          router.push(`/${slug}`);
          return;
        }
      }

      if (data.tags) setTags(data.tags);
      if (data.schedule) setSchedule(data.schedule);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [slug, router]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleComplete() {
    setCompleting(true);
    setError(null);

    try {
      const selectedTagIds = tags.filter(t => t.selected).map(t => t.id);

      const res = await fetch(`/${slug}/api/worker/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            pseudonym: profile.pseudonym,
            age: profile.age,
            nationality: profile.nationality,
            gender: profile.gender,
            languages: profile.languages,
            bio: profile.bio,
            photo_urls: profile.photo_urls,
            consent_photo_signed_at: profile.consent_photo_signed_at,
          },
          tag_ids: selectedTagIds,
          schedule_slots: schedule,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      router.push(`/${slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete');
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome! Set up your profile</h1>
          <p className="text-sm text-gray-500 mt-1">Complete these steps to activate your listing.</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => {
            const stepNum = i + 1;
            const isActive = stepNum === step;
            const isDone = stepNum < step;
            return (
              <div key={s.label} className="flex-1 flex items-center">
                <div className="flex flex-col items-center w-full">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isActive
                          ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-600'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isDone ? '✓' : stepNum}
                  </div>
                  <p className={`text-xs mt-1 ${isActive ? 'text-emerald-700 font-medium' : 'text-gray-400'}`}>
                    {s.label}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${isDone ? 'bg-emerald-600' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* Step content */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {step === 1 && (
            <StepWorkerIdentity
              profile={profile}
              setProfile={setProfile}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepWorkerPhotos
              profile={profile}
              setProfile={setProfile}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}
          {step === 3 && (
            <StepWorkerServices
              tags={tags}
              setTags={setTags}
              onBack={() => setStep(2)}
              onNext={() => setStep(4)}
            />
          )}
          {step === 4 && (
            <StepWorkerSchedule
              schedule={schedule}
              setSchedule={setSchedule}
              onBack={() => setStep(3)}
              onComplete={handleComplete}
              completing={completing}
            />
          )}
        </div>
      </div>
    </div>
  );
}
