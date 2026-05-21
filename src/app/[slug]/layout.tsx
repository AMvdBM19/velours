import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { resolveTenant } from '@/lib/auth/tenant';
import Sidebar from '@/components/layout/Sidebar';

interface TenantLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

export default async function TenantLayout({ children, params }: TenantLayoutProps) {
  const { slug } = params;

  // Resolve tenant
  const tenant = await resolveTenant(slug);
  if (!tenant) {
    redirect('/');
  }

  // Try to get authenticated user — may be null on public routes
  const user = await getAuthenticatedUser();

  // If no user, render children without layout (login page, etc.)
  if (!user) {
    return <>{children}</>;
  }

  // Worker with first_login = true → redirect to change password
  if (user.role === 'worker') {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: worker } = await supabase
      .from('workers')
      .select('first_login')
      .eq('id', user.workerId)
      .eq('tenant_id', user.tenantId)
      .single();

    if (worker?.first_login) {
      redirect(`/${slug}/change-password`);
    }
  }

  // Verify tenant_id matches
  if (user.tenantId !== tenant.tenantId) {
    redirect(`/${slug}/login`);
  }

  // Wizard redirect for agents
  if (user.role === 'agent' && !tenant.wizardCompleted) {
    redirect(`/${slug}/setup`);
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        slug={slug}
        role={user.role}
        agencyName={tenant.name}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
