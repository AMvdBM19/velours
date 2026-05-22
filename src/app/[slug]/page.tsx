'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface DashboardStats {
  pendingClients: number;
  activeWorkers: number;
  maxWorkers: number;
  todayBookings: number;
  pendingBookings: number;
  monthRevenue: number;
  unreadNotifications: number;
}

export default function DashboardPage() {
  const { slug } = useParams<{ slug: string }>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = today.slice(0, 7) + '-01';

      const [clientsRes, workersRes, bookingsRes, notifRes] = await Promise.all([
        fetch(`/${slug}/api/client/status?status=pending`),
        fetch(`/${slug}/api/agent/workers`),
        fetch(`/${slug}/api/booking?from=${monthStart}`),
        fetch(`/${slug}/api/agent/notifications?status=unread`),
      ]);

      const clients = clientsRes.ok ? await clientsRes.json() : { clients: [] };
      const workers = workersRes.ok ? await workersRes.json() : { workers: [], active_count: 0, max_workers: 15 };
      const bookings = bookingsRes.ok ? await bookingsRes.json() : { bookings: [] };
      const notifs = notifRes.ok ? await notifRes.json() : { notifications: [] };

      const todayBookings = (bookings.bookings || []).filter(
        (b: { slot_date: string; status: string }) => b.slot_date === today && b.status === 'confirmed'
      ).length;
      const pendingBookings = (bookings.bookings || []).filter(
        (b: { status: string }) => b.status === 'pending_worker'
      ).length;
      const monthRevenue = (bookings.bookings || [])
        .filter((b: { status: string }) => b.status === 'completed')
        .reduce((sum: number, b: { total_price: number }) => sum + (Number(b.total_price) || 0), 0);

      setStats({
        pendingClients: (clients.clients || []).length,
        activeWorkers: workers.active_count || 0,
        maxWorkers: workers.max_workers || 15,
        todayBookings,
        pendingBookings,
        monthRevenue,
        unreadNotifications: (notifs.notifications || []).length,
      });
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) return <div className="text-gray-500">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today&apos;s Bookings" value={stats?.todayBookings ?? 0} color="emerald" />
        <StatCard label="Pending Requests" value={stats?.pendingBookings ?? 0} color={stats?.pendingBookings ? 'amber' : 'gray'} />
        <StatCard label="Pending Clients" value={stats?.pendingClients ?? 0} color={stats?.pendingClients ? 'amber' : 'gray'} />
        <StatCard label="Notifications" value={stats?.unreadNotifications ?? 0} color={stats?.unreadNotifications ? 'red' : 'gray'} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Active Workers</p>
          <p className="text-2xl font-bold text-gray-900">
            {stats?.activeWorkers ?? 0}
            <span className="text-sm font-normal text-gray-400"> / {stats?.maxWorkers ?? 15}</span>
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Revenue This Month</p>
          <p className="text-2xl font-bold text-emerald-600">
            €{(stats?.monthRevenue ?? 0).toFixed(0)}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] || colorClasses.gray}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}
