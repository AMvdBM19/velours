import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { AuthenticatedUser, UserRole } from '@/lib/types/auth';

/**
 * API route guard — validates JWT, extracts tenant_id + role from claims.
 * Use in API route handlers: const user = await apiGuard(request, ['agent']);
 */
export async function apiGuard(
  request: NextRequest,
  allowedRoles?: UserRole[]
): Promise<{ user: AuthenticatedUser } | { error: NextResponse }> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // API routes don't set cookies
        },
      },
    }
  );

  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
  if (authError || !authUser) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  // Get session to access JWT claims
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return {
      error: NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      ),
    };
  }

  // Decode JWT claims
  const payload = decodeJWTPayload(session.access_token);
  if (!payload?.tenant_id || !payload?.role) {
    return {
      error: NextResponse.json(
        { error: 'Invalid token claims. Missing tenant_id or role.' },
        { status: 403 }
      ),
    };
  }

  const role = payload.role as UserRole;

  // Check role if specified
  if (allowedRoles && !allowedRoles.includes(role)) {
    return {
      error: NextResponse.json(
        { error: `Access denied. Required role: ${allowedRoles.join(' or ')}` },
        { status: 403 }
      ),
    };
  }

  // Extract tenant slug from URL path: /[slug]/api/...
  const pathSegments = new URL(request.url).pathname.split('/').filter(Boolean);
  const urlSlug = pathSegments[0];

  // Verify the tenant_id in JWT matches the slug in the URL
  // This prevents someone from using a valid token for tenant A to access tenant B's API
  if (urlSlug) {
    const tenantCheck = await verifyTenantSlugMatch(payload.tenant_id, urlSlug);
    if (!tenantCheck) {
      return {
        error: NextResponse.json(
          { error: 'Tenant mismatch. Your token does not match this agency.' },
          { status: 403 }
        ),
      };
    }
  }

  return {
    user: {
      id: authUser.id,
      email: authUser.email ?? '',
      role,
      tenantId: payload.tenant_id,
      workerId: payload.worker_id,
      clientId: payload.client_id,
    },
  };
}

/**
 * Super Admin API guard — validates API key from header.
 */
export function superAdminGuard(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  const expectedKey = process.env.SUPER_ADMIN_API_KEY;

  if (!expectedKey || !apiKey || apiKey !== expectedKey) {
    return false;
  }
  return true;
}

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

async function verifyTenantSlugMatch(tenantId: string, slug: string): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return false;

    const url = `${supabaseUrl}/rest/v1/tenants?id=eq.${tenantId}&slug=eq.${slug}&select=id&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) return false;
    const data = await res.json();
    return data.length > 0;
  } catch {
    return false;
  }
}
