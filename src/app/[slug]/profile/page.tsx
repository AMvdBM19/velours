'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface WorkerProfile {
  id: string;
  pseudonym: string;
  age: number | null;
  nationality: string | null;
  gender: string | null;
  languages: string[] | null;
  bio: string | null;
  photo_urls: string[] | null;
  status: string;
  offline_reason: string | null;
  wizard_completed: boolean;
  consent_photo_signed_at: string | null;
}

interface ServiceTag {
  id: string;
  name: string;
  description?: string;
  extra_price?: number;
  selected: boolean;
}

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Other', 'Prefer not to say'];

export default function WorkerProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [tags, setTags] = useState<ServiceTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit state
  const [editPseudonym, setEditPseudonym] = useState('');
  const [editAge, setEditAge] = useState<number | null>(null);
  const [editNationality, setEditNationality] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editLanguages, setEditLanguages] = useState<string[]>([]);
  const [editBio, setEditBio] = useState('');
  const [langInput, setLangInput] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      const [profileRes, tagsRes] = await Promise.all([
        fetch(`/${slug}/api/worker/profile`),
        fetch(`/${slug}/api/worker/tags`),
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.worker);
        setEditPseudonym(data.worker.pseudonym || '');
        setEditAge(data.worker.age);
        setEditNationality(data.worker.nationality || '');
        setEditGender(data.worker.gender || '');
        setEditLanguages(data.worker.languages || []);
        setEditBio(data.worker.bio || '');
      }

      if (tagsRes.ok) {
        const data = await tagsRes.json();
        setTags(data.tags);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load profile' });
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function saveProfile() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/${slug}/api/worker/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pseudonym: editPseudonym,
          age: editAge,
          nationality: editNationality,
          gender: editGender,
          languages: editLanguages,
          bio: editBio,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      const data = await res.json();
      setProfile(prev => prev ? { ...prev, ...data.worker } : prev);
      setMessage({ type: 'success', text: 'Profile updated!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  async function saveTags() {
    setSavingTags(true);
    setMessage(null);
    try {
      const selectedIds = tags.filter(t => t.selected).map(t => t.id);
      const res = await fetch(`/${slug}/api/worker/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_ids: selectedIds }),
      });

      if (!res.ok) throw new Error('Failed to save tags');
      setMessage({ type: 'success', text: 'Service tags updated!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSavingTags(false);
    }
  }

  function addLanguage(lang: string) {
    if (!lang.trim() || editLanguages.includes(lang.trim())) return;
    setEditLanguages(prev => [...prev, lang.trim()]);
    setLangInput('');
  }

  if (loading) {
    return <div className="text-gray-500">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="text-red-500">Failed to load profile.</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-500">
            Changes take effect immediately. No approval needed.
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
          profile.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
          profile.status === 'offline' ? 'bg-amber-100 text-amber-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {profile.status}
        </span>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile fields */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-900">Identity</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Display Name</label>
            <input
              type="text"
              value={editPseudonym}
              onChange={e => setEditPseudonym(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Age</label>
            <input
              type="number"
              value={editAge ?? ''}
              onChange={e => setEditAge(e.target.value ? Number(e.target.value) : null)}
              min={18}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nationality</label>
            <input
              type="text"
              value={editNationality}
              onChange={e => setEditNationality(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Gender</label>
            <select
              value={editGender}
              onChange={e => setEditGender(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select</option>
              {GENDER_OPTIONS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Languages</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {editLanguages.map(lang => (
              <span key={lang} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1">
                {lang}
                <button type="button" onClick={() => setEditLanguages(prev => prev.filter(l => l !== lang))} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={langInput}
              onChange={e => setLangInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLanguage(langInput))}
              placeholder="Add language"
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button type="button" onClick={() => addLanguage(langInput)} disabled={!langInput.trim()} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm disabled:opacity-50">Add</button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Bio</label>
          <textarea
            value={editBio}
            onChange={e => setEditBio(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveProfile}
            disabled={saving}
            className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Service tags */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-900">Service Tags</h2>
        {tags.length === 0 ? (
          <p className="text-sm text-gray-400">No service tags defined by your agency.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setTags(prev => prev.map(t => t.id === tag.id ? { ...t, selected: !t.selected } : t))}
                className={`text-sm px-3 py-1.5 rounded-lg border-2 transition-colors ${
                  tag.selected
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {tag.name}
                {tag.extra_price != null && tag.extra_price > 0 && (
                  <span className="text-xs ml-1 opacity-70">+€{tag.extra_price}</span>
                )}
              </button>
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={saveTags}
            disabled={savingTags}
            className="px-5 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {savingTags ? 'Saving...' : 'Save Tags'}
          </button>
        </div>
      </div>
    </div>
  );
}
