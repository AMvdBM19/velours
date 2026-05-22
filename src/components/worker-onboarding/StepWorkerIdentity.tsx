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

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Other', 'Prefer not to say'];

const COMMON_LANGUAGES = [
  'Dutch', 'English', 'German', 'French', 'Spanish', 'Portuguese',
  'Italian', 'Polish', 'Romanian', 'Turkish', 'Arabic', 'Russian',
  'Thai', 'Chinese', 'Japanese', 'Korean', 'Hungarian', 'Czech',
];

interface Props {
  profile: WorkerProfile;
  setProfile: React.Dispatch<React.SetStateAction<WorkerProfile>>;
  onNext: () => void;
}

export default function StepWorkerIdentity({ profile, setProfile, onNext }: Props) {
  const [langInput, setLangInput] = useState('');

  function update(field: keyof WorkerProfile, value: unknown) {
    setProfile(prev => ({ ...prev, [field]: value }));
  }

  function addLanguage(lang: string) {
    if (!lang.trim()) return;
    const cleaned = lang.trim();
    if (profile.languages.includes(cleaned)) return;
    update('languages', [...profile.languages, cleaned]);
    setLangInput('');
  }

  function removeLanguage(lang: string) {
    update('languages', profile.languages.filter(l => l !== lang));
  }

  const canProceed = profile.pseudonym.trim().length >= 2;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Your Identity</h2>
        <p className="text-sm text-gray-500 mt-1">
          Set your display name and details. This is how clients will see you.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Display Name (pseudonym) *
        </label>
        <input
          type="text"
          value={profile.pseudonym}
          onChange={e => update('pseudonym', e.target.value)}
          placeholder="e.g. Luna"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
          <input
            type="number"
            value={profile.age ?? ''}
            onChange={e => update('age', e.target.value ? Number(e.target.value) : null)}
            min={18}
            placeholder="18+"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
          <input
            type="text"
            value={profile.nationality}
            onChange={e => update('nationality', e.target.value)}
            placeholder="e.g. Dutch"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
        <div className="flex flex-wrap gap-2">
          {GENDER_OPTIONS.map(g => (
            <button
              key={g}
              type="button"
              onClick={() => update('gender', g)}
              className={`px-3 py-1.5 rounded-lg text-sm border-2 transition-colors ${
                profile.gender === g
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Languages</label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {COMMON_LANGUAGES.filter(l => !profile.languages.includes(l)).slice(0, 8).map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => addLanguage(lang)}
              className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors"
            >
              + {lang}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={langInput}
            onChange={e => setLangInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLanguage(langInput))}
            placeholder="Add custom language"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={() => addLanguage(langInput)}
            disabled={!langInput.trim()}
            className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {profile.languages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {profile.languages.map(lang => (
              <span
                key={lang}
                className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1"
              >
                {lang}
                <button
                  type="button"
                  onClick={() => removeLanguage(lang)}
                  className="text-emerald-400 hover:text-red-500"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea
          value={profile.bio}
          onChange={e => update('bio', e.target.value)}
          rows={3}
          placeholder="Tell clients about yourself..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <p className="text-xs text-gray-400 mt-1">{profile.bio.length}/500 characters</p>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onNext}
          disabled={!canProceed}
          className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  );
}
