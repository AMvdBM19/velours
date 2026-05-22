import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { resolveTenant } from '@/lib/auth/tenant';
import Sidebar from '@/components/layout/Sidebar';
import AssistantChat from '@/components/ai/AssistantChat';

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

  let workerStatus: string | undefined;

  // Worker checks: first_login → change password, wizard not completed → onboarding
  if (user.role === 'worker' && user.workerId) {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: worker } = await supabase
      .from('workers')
      .select('first_login, wizard_completed, status')
      .eq('id', user.workerId)
      .eq('tenant_id', user.tenantId)
      .single();

    if (worker?.first_login) {
      redirect(`/${slug}/change-password`);
    }

    if (worker && !worker.wizard_completed) {
      redirect(`/${slug}/onboarding`);
    }

    workerStatus = worker?.status as string | undefined;
  }

  // Verify tenant_id matches
  if (user.tenantId !== tenant.tenantId) {
    redirect(`/${slug}/login`);
  }

  // Wizard redirect for agents
  if (user.role === 'agent' && !tenant.wizardCompleted) {
    redirect(`/${slug}/setup`);
  }

  // Check if AI assistant is enabled (agent only)
  let aiEnabled = false;
  if (user.role === 'agent') {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('ai_assistant_enabled')
      .eq('tenant_id', user.tenantId)
      .single();
    aiEnabled = settings?.ai_assistant_enabled || false;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        slug={slug}
        role={user.role}
        agencyName={tenant.name}
        workerStatus={workerStatus}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
      {user.role === 'agent' && (
        <AssistantChat slug={slug} enabled={aiEnabled} />
      )}
    </div>
  );
}
