'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface KPIData {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalEarnings: number;
  avgRating: number | null;
  ratingCount: number;
}

export default function WorkerKPIsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadKPIs = useCallback(async () => {
    try {
      // Fetch all bookings for this worker
      const res = await fetch(`/${slug}/api/worker/bookings?status=completed,cancelled,confirmed,pending_worker,no_show`);
      if (!res.ok) throw new Error('Failed');

      const result = await res.json();
      const bookings = result.bookings || [];

      const completed = bookings.filter((b: { status: string }) => b.status === 'completed');
      const cancelled = bookings.filter((b: { status: string }) => b.status === 'cancelled');
      const totalEarnings = completed.reduce((sum: number, b: { worker_payout: number | null }) =>
        sum + (b.worker_payout || 0), 0);

      // Fetch rating stats
      let avgRating: number | null = null;
      let ratingCount = 0;
      try {
        const ratingRes = await fetch(`/${slug}/api/worker/rating`);
        if (ratingRes.ok) {
          const ratingData = await ratingRes.json();
          avgRating = ratingData.avgRating;
          ratingCount = ratingData.ratingCount;
        }
      } catch { /* ratings fetch optional */ }

      setData({
        totalBookings: bookings.length,
        completedBookings: completed.length,
        cancelledBookings: cancelled.length,
        totalEarnings,
        avgRating,
        ratingCount,
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadKPIs(); }, [loadKPIs]);

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">My KPIs</h1>
        <p className="text-sm text-gray-500">Your performance overview.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{data?.totalBookings ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-emerald-600">{data?.completedBookings ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Cancelled</p>
          <p className="text-2xl font-bold text-red-500">{data?.cancelledBookings ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Earnings</p>
          <p className="text-2xl font-bold text-gray-900">€{(data?.totalEarnings ?? 0).toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Avg Rating Given</p>
          <p className="text-2xl font-bold text-amber-500">
            {data?.avgRating != null ? `${data.avgRating} ★` : '—'}
          </p>
          <p className="text-xs text-gray-400">{data?.ratingCount ?? 0} ratings</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">No-Show Rate</p>
          <p className="text-2xl font-bold text-orange-500">
            {data && data.completedBookings > 0
              ? `${((data.cancelledBookings / (data.completedBookings + data.cancelledBookings)) * 100).toFixed(1)}%`
              : '0%'}
          </p>
        </div>
      </div>
    </div>
  );
}
