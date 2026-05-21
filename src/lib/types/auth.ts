export type UserRole = 'agent' | 'worker' | 'client' | 'super_admin';

export interface JWTClaims {
  tenant_id: string;
  role: UserRole;
  worker_id?: string;   // present if role = worker
  client_id?: string;   // present if role = client
}

export interface TenantContext {
  tenantId: string;
  slug: string;
  name: string;
  isActive: boolean;
  wizardCompleted: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  workerId?: string;
  clientId?: string;
}
