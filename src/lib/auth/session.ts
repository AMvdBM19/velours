import { createClient } from '@/lib/supabase/server';
import type { AuthenticatedUser, UserRole } from '@/lib/types/auth';

/**
 * Get the authenticated user with JWT custom claims.
 * Returns null if no valid session exists.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Extract custom claims from the JWT
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  // Decode JWT to get custom claims from app_metadata (tenant_id, user_role, worker_id, client_id)
  const payload = decodeJWTPayload(session.access_token);
  const appMeta = payload?.app_metadata as Record<string, string> | undefined;
  if (!appMeta?.tenant_id || !appMeta?.user_role) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    role: appMeta.user_role as UserRole,
    tenantId: appMeta.tenant_id,
    workerId: appMeta.worker_id,
    clientId: appMeta.client_id,
  };
}

/**
 * Decode JWT payload without verification (verification is done by Supabase).
 * We only need the custom claims here.
 */
function decodeJWTPayload(token: string): Record<string, string> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Require authentication. Throws if no valid session.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

/**
 * Require a specific role. Throws if user doesn't have the role.
 */
export async function requireRole(...allowedRoles: UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Access denied. Required role: ${allowedRoles.join(' or ')}`);
  }
  return user;
}

/**
 * Verify the authenticated user belongs to the specified tenant.
 */
export async function requireTenantAccess(tenantId: string): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (user.tenantId !== tenantId) {
    throw new Error('Access denied. Tenant mismatch.');
  }
  return user;
}
