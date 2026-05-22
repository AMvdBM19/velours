import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/auth/callback'];

// Routes that bypass tenant resolution entirely
const BYPASS_ROUTES = ['/api/super-admin', '/book'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Super Admin API and public booking widget bypass tenant middleware
  for (const route of BYPASS_ROUTES) {
    if (pathname.startsWith(route)) {
      return NextResponse.next();
    }
  }

  // Extract slug from first path segment: /[slug]/...
  const segments = pathname.split('/').filter(Boolean);
  const slug = segments[0];

  if (!slug) {
    return NextResponse.next();
  }

  // Resolve tenant by slug — uses service role via REST
  const tenant = await resolveSlug(slug);

  if (!tenant) {
    // Invalid slug — redirect to home or show 404
    return NextResponse.rewrite(new URL('/not-found', request.url));
  }

  if (!tenant.is_active) {
    return new NextResponse('This agency account is inactive.', { status: 403 });
  }

  // Refresh the Supabase session (cookie-based)
  const { user, response } = await updateSession(request);

  // Determine the sub-path within the tenant (e.g., /velours-amsterdam/login → /login)
  const subPath = '/' + segments.slice(1).join('/');

  // Check if this is a public route (login, auth callback)
  const isPublicRoute = PUBLIC_ROUTES.some((route) => subPath.startsWith(route));

  if (!user && !isPublicRoute) {
    // Not authenticated — redirect to login
    const loginUrl = new URL(`/${slug}/login`, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && !isPublicRoute) {
    // Authenticated — check wizard redirect
    if (!tenant.wizard_completed && !subPath.startsWith('/setup') && !subPath.startsWith('/onboarding') && !subPath.startsWith('/change-password')) {
      return NextResponse.redirect(new URL(`/${slug}/setup`, request.url));
    }
  }

  // Set tenant context in response headers for downstream use
  response.headers.set('x-tenant-id', tenant.id);
  response.headers.set('x-tenant-slug', tenant.slug);

  return response;
}

/**
 * Resolve tenant slug via Supabase REST API (no SDK needed in middleware).
 * Uses the service role key to bypass RLS.
 */
async function resolveSlug(
  slug: string
): Promise<{
  id: string;
  slug: string;
  is_active: boolean;
  wizard_completed: boolean;
} | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) return null;

    const url = `${supabaseUrl}/rest/v1/tenants?slug=eq.${encodeURIComponent(slug)}&select=id,slug,is_active,wizard_completed&limit=1`;

    const res = await fetch(url, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      // Cache tenant resolution for 60s to avoid hitting DB on every request
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data?.[0] ?? null;
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
