'use client';

import { useState } from 'react';

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

interface Props {
  profile: WorkerProfile;
  setProfile: React.Dispatch<React.SetStateAction<WorkerProfile>>;
  onBack: () => void;
  onNext: () => void;
}

export default function StepWorkerPhotos({ profile, setProfile, onBack, onNext }: Props) {
  const [urlInput, setUrlInput] = useState('');
  const hasConsent = !!profile.consent_photo_signed_at;

  function addPhotoUrl(url: string) {
    if (!url.trim()) return;
    setProfile(prev => ({
      ...prev,
      photo_urls: [...prev.photo_urls, url.trim()],
    }));
    setUrlInput('');
  }

  function removePhoto(index: number) {
    setProfile(prev => ({
      ...prev,
      photo_urls: prev.photo_urls.filter((_, i) => i !== index),
    }));
  }

  function toggleConsent() {
    setProfile(prev => ({
      ...prev,
      consent_photo_signed_at: prev.consent_photo_signed_at
        ? null
        : new Date().toISOString(),
    }));
  }

  // Photos are optional but if provided, consent is required
  const canProceed = profile.photo_urls.length === 0 || hasConsent;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
        <p className="text-sm text-gray-500 mt-1">
          Add photos to your listing. Photos are optional but recommended.
          You can add them later from your profile.
        </p>
      </div>

      {/* Photo URL input — in production this would be a file upload to Supabase Storage */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Photo URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPhotoUrl(urlInput))}
            placeholder="https://example.com/photo.jpg"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => addPhotoUrl(urlInput)}
            disabled={!urlInput.trim()}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            Add
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          File upload will be available in a future update. For now, paste image URLs.
        </p>
      </div>

      {/* Photo list */}
      {profile.photo_urls.length > 0 ? (
        <div className="grid grid-cols-3 gap-3">
          {profile.photo_urls.map((url, i) => (
            <div key={i} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={e => {
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).alt = 'Failed to load';
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => removePhoto(i)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
          No photos added yet
        </div>
      )}

      {/* GDPR consent */}
      {profile.photo_urls.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hasConsent}
              onChange={toggleConsent}
              className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-sm font-medium text-amber-800">
                GDPR Photo Consent *
              </p>
              <p className="text-xs text-amber-700 mt-1">
                I consent to the use of my photos for the purpose of displaying my listing
                on this platform. I understand that I can withdraw consent and remove my
                photos at any time from my profile settings. My photos will only be used
                for the stated purpose and will not be shared with third parties.
              </p>
            </div>
          </label>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {profile.photo_urls.length === 0 ? 'Skip' : 'Next'}
        </button>
      </div>
    </div>
  );
}
