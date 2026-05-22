'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  body: string | null;
  status: string;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  created_at: string;
  actioned_at: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  client_signup: 'New Client Signup',
  worker_offline: 'Worker Offline Request',
  blacklist_flag: 'Blacklist Flag',
  booking_no_show: 'Booking No-Show',
  worker_profile_edit: 'Worker Profile Edit',
};

const TYPE_COLORS: Record<string, string> = {
  client_signup: 'bg-blue-100 text-blue-700',
  worker_offline: 'bg-amber-100 text-amber-700',
  blacklist_flag: 'bg-red-100 text-red-700',
  booking_no_show: 'bg-orange-100 text-orange-700',
  worker_profile_edit: 'bg-gray-100 text-gray-600',
};

export default function NotificationsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('unread');

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = filter === 'unread' ? '?status=unread' : '';
      const res = await fetch(`/${slug}/api/agent/notifications${statusParam}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {
      // fail
    } finally {
      setLoading(false);
    }
  }, [slug, filter]);

  useEffect(() => { loadNotifications(); }, [loadNotifications]);

  async function markAs(ids: string[], status: 'read' | 'actioned') {
    try {
      await fetch(`/${slug}/api/agent/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status }),
      });
      loadNotifications();
    } catch {
      // fail
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`text-sm px-3 py-1.5 rounded-lg ${filter === 'unread' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            Unread
          </button>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`text-sm px-3 py-1.5 rounded-lg ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            All
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400">No {filter === 'unread' ? 'unread ' : ''}notifications.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`bg-white rounded-lg border p-4 ${
                n.status === 'unread' ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${TYPE_COLORS[n.notification_type] || 'bg-gray-100'}`}>
                    {TYPE_LABELS[n.notification_type] || n.notification_type}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{n.title}</p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleString('en-GB', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {n.status === 'unread' && (
                    <button
                      type="button"
                      onClick={() => markAs([n.id], 'read')}
                      className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                    >
                      Mark read
                    </button>
                  )}
                  {n.status !== 'actioned' && (
                    <button
                      type="button"
                      onClick={() => markAs([n.id], 'actioned')}
                      className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
