'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface WorkerRow {
  id: string;
  pseudonym: string;
  real_name: string | null;
  age: number | null;
  nationality: string | null;
  languages: string[] | null;
  photo_urls: string[] | null;
  status: string;
  offline_reason: string | null;
  wizard_completed: boolean;
  btw_exempt: boolean;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-gray-100 text-gray-600',
  offline: 'bg-amber-100 text-amber-700',
};

export default function WorkersPage() {
  const { slug } = useParams<{ slug: string }>();
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [maxWorkers, setMaxWorkers] = useState(15);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create form
  const [newEmail, setNewEmail] = useState('');
  const [newPseudonym, setNewPseudonym] = useState('');
  const [newRealName, setNewRealName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);

  const loadWorkers = useCallback(async () => {
    try {
      const res = await fetch(`/${slug}/api/agent/workers`);
      if (res.ok) {
        const data = await res.json();
        setWorkers(data.workers);
        setMaxWorkers(data.max_workers);
        setActiveCount(data.active_count);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadWorkers(); }, [loadWorkers]);

  async function createWorker() {
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch(`/${slug}/api/agent/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          temp_password: newPassword,
          pseudonym: newPseudonym,
          real_name: newRealName || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }

      setMessage({ type: 'success', text: 'Worker created! They will receive login credentials.' });
      setShowCreate(false);
      setNewEmail(''); setNewPseudonym(''); setNewRealName(''); setNewPassword('');
      loadWorkers();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setCreating(false);
    }
  }

  async function toggleWorkerStatus(workerId: string, currentStatus: string) {
    const action = currentStatus === 'active' || currentStatus === 'offline' ? 'deactivate' : 'reactivate';
    try {
      const res = await fetch(`/${slug}/api/agent/workers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worker_id: workerId, action }),
      });
      if (res.ok) loadWorkers();
    } catch {
      // fail
    }
  }

  if (loading) return <div className="text-gray-500">Loading workers...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Workers</h1>
          <p className="text-sm text-gray-500">{activeCount} / {maxWorkers} active workers</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          disabled={activeCount >= maxWorkers}
          className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {activeCount >= maxWorkers ? 'Limit Reached' : '+ Add Worker'}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Create Worker Account</h3>
          <div className="grid grid-cols-2 gap-3">
            <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email *" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Temp password *" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input type="text" value={newPseudonym} onChange={e => setNewPseudonym(e.target.value)} placeholder="Pseudonym *" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input type="text" value={newRealName} onChange={e => setNewRealName(e.target.value)} placeholder="Real name (agent-only)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            <button
              type="button"
              onClick={createWorker}
              disabled={!newEmail || !newPassword || !newPseudonym || creating}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Worker table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Worker</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Details</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">BTW Exempt</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workers.map(w => (
              <tr key={w.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {w.photo_urls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.photo_urls[0]} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                        {w.pseudonym[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{w.pseudonym}</p>
                      {w.real_name && <p className="text-xs text-gray-400">{w.real_name}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[w.status] || 'bg-gray-100'}`}>
                    {w.status}
                  </span>
                  {w.offline_reason && (
                    <p className="text-xs text-gray-400 mt-0.5" title={w.offline_reason}>
                      {w.offline_reason.slice(0, 30)}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {[w.age && `${w.age}`, w.nationality, ...(w.languages?.slice(0, 2) || [])].filter(Boolean).join(' • ')}
                </td>
                <td className="px-4 py-3">
                  {w.btw_exempt && <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Exempt</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => toggleWorkerStatus(w.id, w.status)}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    {w.status === 'inactive' ? 'Reactivate' : 'Deactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
