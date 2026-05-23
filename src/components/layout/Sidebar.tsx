'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/types/auth';

interface NavItem {
  label: string;
  href: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',      href: '',                roles: ['agent'] },
  { label: 'Workers',        href: '/workers',        roles: ['agent'] },
  { label: 'Clients',        href: '/clients',        roles: ['agent'] },
  { label: 'Bookings',       href: '/bookings',       roles: ['agent', 'worker'] },
  { label: 'Availability',   href: '/availability',   roles: ['agent', 'worker'] },
  { label: 'Notifications',  href: '/notifications',  roles: ['agent'] },
  { label: 'Finances',       href: '/finances',       roles: ['agent'] },
  { label: 'Settings',       href: '/settings',       roles: ['agent'] },
  // Worker-specific
  { label: 'My Profile',     href: '/profile',        roles: ['worker'] },
  { label: 'My KPIs',        href: '/kpis',           roles: ['worker'] },
];

interface SidebarProps {
  slug: string;
  role: UserRole;
  agencyName: string;
  workerStatus?: string;
}

export default function Sidebar({ slug, role, agencyName, workerStatus }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [offlineModal, setOfflineModal] = useState(false);
  const [offlineReason, setOfflineReason] = useState('');
  const [toggling, setToggling] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(workerStatus || 'active');

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  async function toggleOnlineStatus() {
    if (currentStatus === 'active' && !offlineModal) {
      setOfflineModal(true);
      return;
    }

    setToggling(true);
    try {
      const action = currentStatus === 'offline' ? 'go_online' : 'go_offline';
      const res = await fetch(`/${slug}/api/worker/offline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: offlineReason || undefined }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentStatus(data.status);
        setOfflineModal(false);
        setOfflineReason('');
      }
    } catch {
      // silently fail
    } finally {
      setToggling(false);
    }
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(`/${slug}/login`);
    router.refresh();
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Agency header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900 truncate">{agencyName}</h2>
        <span className="text-xs text-gray-500 capitalize">{role}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {visibleItems.map((item) => {
            const fullHref = `/${slug}${item.href}`;
            const isActive =
              item.href === ''
                ? pathname === `/${slug}` || pathname === `/${slug}/`
                : pathname.startsWith(fullHref);

            return (
              <li key={item.href}>
                <Link
                  href={fullHref}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Worker online/offline toggle */}
      {role === 'worker' && (
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={toggleOnlineStatus}
            disabled={toggling}
            className={`w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              currentStatus === 'active'
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : currentStatus === 'offline'
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'bg-gray-50 text-gray-600'
            }`}
          >
            {toggling ? '...' : currentStatus === 'active' ? '● Online' : currentStatus === 'offline' ? '○ Offline' : '○ Inactive'}
          </button>

          {/* Offline reason modal */}
          {offlineModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-5 w-full max-w-sm space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Go Offline</h3>
                <p className="text-xs text-gray-500">Your listing will be hidden. Existing bookings are unaffected.</p>
                <textarea
                  value={offlineReason}
                  onChange={e => setOfflineReason(e.target.value)}
                  rows={2}
                  placeholder="Reason (required)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setOfflineModal(false); setOfflineReason(''); }}
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={toggleOnlineStatus}
                    disabled={!offlineReason.trim() || toggling}
                    className="flex-1 px-3 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  >
                    {toggling ? '...' : 'Go Offline'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-left"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
