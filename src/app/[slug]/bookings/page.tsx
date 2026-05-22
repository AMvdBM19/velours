'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface Booking {
  id: string;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  duration_minutes: number;
  location_type: string | null;
  location_notes: string | null;
  status: string;
  base_rate_per_30: number | null;
  total_price: number | null;
  worker_payout: number | null;
  requested_at: string;
  confirmed_at: string | null;
  clients: { display_name: string; phone?: string } | null;
  booking_service_tags: { tag_name: string; extra_price: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  pending_worker: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
  no_show: 'bg-gray-100 text-gray-600',
};

export default function BookingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<'pending' | 'upcoming' | 'past'>('pending');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Rating modal state
  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingNote, setRatingNote] = useState('');
  const [ratingBlacklist, setRatingBlacklist] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      let url = `/${slug}/api/worker/bookings`;

      if (tab === 'pending') {
        url += '?status=pending_worker';
      } else if (tab === 'upcoming') {
        url += `?status=confirmed&from=${today}`;
      } else {
        url += `?status=completed,cancelled,no_show`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load bookings' });
    } finally {
      setLoading(false);
    }
  }, [slug, tab]);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  async function handleAction(bookingId: string, action: 'accept' | 'reject') {
    setActing(bookingId);
    setMessage(null);
    try {
      const res = await fetch(`/${slug}/api/worker/bookings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, action }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Action failed');
      }

      setMessage({
        type: 'success',
        text: action === 'accept' ? 'Booking confirmed!' : 'Booking declined.',
      });
      loadBookings();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setActing(null);
    }
  }

  async function submitRating() {
    if (!ratingBookingId) return;
    setSubmittingRating(true);
    try {
      const body: Record<string, unknown> = {
        booking_id: ratingBookingId,
        score: ratingScore,
        note: ratingNote || undefined,
      };
      if (ratingBlacklist && blacklistReason) {
        body.blacklist_flag = { reason: blacklistReason };
      }

      const res = await fetch(`/${slug}/api/worker/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit rating');
      }

      setMessage({ type: 'success', text: 'Rating submitted!' });
      setRatingBookingId(null);
      setRatingScore(5);
      setRatingNote('');
      setRatingBlacklist(false);
      setBlacklistReason('');
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSubmittingRating(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Bookings</h1>
        <p className="text-sm text-gray-500">Manage your booking requests and upcoming appointments.</p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {([
          { key: 'pending' as const, label: 'Pending' },
          { key: 'upcoming' as const, label: 'Upcoming' },
          { key: 'past' as const, label: 'Past' },
        ]).map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      {loading ? (
        <p className="text-gray-500 text-sm">Loading...</p>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No {tab} bookings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[b.status] || 'bg-gray-100'}`}>
                      {b.status.replace(/_/g, ' ')}
                    </span>
                    {b.location_type && (
                      <span className="text-xs text-gray-400">{b.location_type}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(b.slot_date + 'T00:00:00').toLocaleDateString('en-GB', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                    {' '}
                    {b.slot_start.slice(0, 5)} — {b.slot_end.slice(0, 5)}
                    <span className="text-gray-400 font-normal ml-1">({b.duration_minutes}min)</span>
                  </p>
                  {b.clients && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Client: {b.clients.display_name}
                    </p>
                  )}
                  {b.booking_service_tags?.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {b.booking_service_tags.map((tag, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {tag.tag_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {b.worker_payout != null && (
                    <p className="text-sm font-medium text-emerald-600">€{b.worker_payout}</p>
                  )}
                </div>
              </div>

              {/* Actions for pending bookings */}
              {b.status === 'pending_worker' && (
                <div className="mt-3 flex gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => handleAction(b.id, 'accept')}
                    disabled={acting === b.id}
                    className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {acting === b.id ? '...' : 'Accept'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(b.id, 'reject')}
                    disabled={acting === b.id}
                    className="flex-1 px-4 py-2 bg-white border border-red-300 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              )}

              {/* Rate button for completed bookings */}
              {b.status === 'completed' && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setRatingBookingId(b.id)}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Rate this client
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Rating modal */}
      {ratingBookingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Rate Client</h3>

            <div>
              <label className="block text-sm text-gray-700 mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRatingScore(s)}
                    className={`text-2xl ${s <= ratingScore ? 'text-amber-400' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Note (private)</label>
              <textarea
                value={ratingNote}
                onChange={e => setRatingNote(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Optional private note..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ratingBlacklist}
                  onChange={e => setRatingBlacklist(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-red-600 font-medium">Flag for blacklist review</span>
              </label>
              {ratingBlacklist && (
                <textarea
                  value={blacklistReason}
                  onChange={e => setBlacklistReason(e.target.value)}
                  rows={2}
                  className="w-full mt-2 px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Reason for blacklist flag (required)..."
                />
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRatingBookingId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitRating}
                disabled={submittingRating || (ratingBlacklist && !blacklistReason.trim())}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
