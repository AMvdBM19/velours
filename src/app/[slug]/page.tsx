import { getAuthenticatedUser } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

interface DashboardPageProps {
  params: { slug: string };
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect(`/${params.slug}/login`);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      <p className="text-gray-500 mt-2">
        Welcome back. You are signed in as <span className="font-medium">{user.role}</span>.
      </p>

      {/* Placeholder — Phase 6 will build the full dashboard */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Role</p>
          <p className="text-lg font-semibold text-gray-900 capitalize">{user.role}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Tenant ID</p>
          <p className="text-lg font-semibold text-gray-900 font-mono text-xs">{user.tenantId}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Email</p>
          <p className="text-lg font-semibold text-gray-900">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
