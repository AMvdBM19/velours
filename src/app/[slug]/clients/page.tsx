'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface ClientRow {
  id: string;
  display_name: string;
  real_name: string | null;
  email: string;
  phone: string | null;
  status: string;
  status_reason: string | null;
  wa_opt_in: boolean;
  created_at: string;
  approved_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-red-100 text-red-700',
  unverified: 'bg-gray-100 text-gray-600',
};

type Tab = 'all' | 'pending' | 'approved' | 'rejected';

export default function ClientsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actingOn, setActingOn] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const statusMap: Record<Tab, string> = {
        all: '',
        pending: 'pending',
        approved: 'approved',
        rejected: 'rejected,suspended',
      };
      const statusParam = statusMap[tab];
      const url = `/${slug}/api/client/status${statusParam ? `?status=${statusParam}` : ''}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setClients(data.clients || []);
      }
    } catch {
      // fail
    } finally {
      setLoading(false);
    }
  }, [slug, tab]);

  useEffect(() => { loadClients(); }, [loadClients]);

  async function changeStatus(clientId: string, newStatus: string, reason: string) {
    setActingOn(clientId);
    try {
      const res = await fetch(`/${slug}/api/client/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, new_status: newStatus, reason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed');
      }

      setMessage({ type: 'success', text: `Client ${newStatus}` });
      setActionReason('');
      loadClients();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setActingOn(null);
    }
  }

  async function bulkApprove() {
    const pendingIds = clients.filter(c => c.status === 'pending').map(c => c.id);
    for (const id of pendingIds) {
      await changeStatus(id, 'approved', 'Bulk approved');
    }
    setMessage({ type: 'success', text: `${pendingIds.length} clients approved` });
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected / Suspended' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
        {tab === 'pending' && clients.length > 0 && (
          <button
            type="button"
            onClick={bulkApprove}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
          >
            Approve All ({clients.length})
          </button>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : clients.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-12">No clients in this category.</p>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Client</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Joined</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.display_name}</p>
                    {c.real_name && <p className="text-xs text-gray-400">{c.real_name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <p>{c.email}</p>
                    {c.phone && <p>{c.phone}</p>}
                    {c.wa_opt_in && <span className="text-green-500">WA</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      {c.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            onClick={() => changeStatus(c.id, 'approved', 'Approved by agent')}
                            disabled={actingOn === c.id}
                            className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const r = actionReason || prompt('Rejection reason:') || '';
                              if (r) changeStatus(c.id, 'rejected', r);
                            }}
                            disabled={actingOn === c.id}
                            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {c.status === 'approved' && (
                        <button
                          type="button"
                          onClick={() => {
                            const r = prompt('Suspension reason:') || '';
                            if (r) changeStatus(c.id, 'suspended', r);
                          }}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                        >
                          Suspend
                        </button>
                      )}
                      {(c.status === 'rejected' || c.status === 'suspended') && (
                        <button
                          type="button"
                          onClick={() => changeStatus(c.id, 'approved', 'Reinstated by agent')}
                          className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                        >
                          Reinstate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
