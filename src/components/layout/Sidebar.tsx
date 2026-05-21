'use client';

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
}

export default function Sidebar({ slug, role, agencyName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

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
