import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * CORS helper for public-facing API routes used by the embed widget.
 * Validates the Origin header against the tenant's registered domain.
 * Falls back to allowing all origins for the standalone booking page.
 */

const ALWAYS_ALLOWED = [
  // Allow same-origin requests (standalone booking page)
  process.env.NEXT_PUBLIC_APP_URL || '',
].filter(Boolean);

/**
 * Add CORS headers to a response.
 * If origin is not provided or not verified, allows the request but without
 * credentials — the widget works but can't share cookies cross-origin.
 */
export function withCors(response: NextResponse, origin: string | null, allowedOrigin?: string): NextResponse {
  const effectiveOrigin = allowedOrigin || origin || '*';

  response.headers.set('Access-Control-Allow-Origin', effectiveOrigin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Max-Age', '86400');

  return response;
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 */
export function handlePreflight(request: NextRequest): NextResponse {
  const origin = request.headers.get('origin');
  const response = new NextResponse(null, { status: 204 });
  return withCors(response, origin);
}

/**
 * Verify that the request origin matches the tenant's registered domain.
 * Returns the allowed origin if verified, or null if not.
 */
export async function verifyOrigin(tenantId: string, origin: string | null): Promise<string | null> {
  if (!origin) return null;

  // Always allow same-origin
  if (ALWAYS_ALLOWED.some(allowed => origin.startsWith(allowed))) {
    return origin;
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: tenant } = await supabase
      .from('tenants')
      .select('domain')
      .eq('id', tenantId)
      .single();

    if (tenant?.domain) {
      const registeredDomain = tenant.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const originDomain = new URL(origin).hostname;

      if (originDomain === registeredDomain || originDomain.endsWith('.' + registeredDomain)) {
        return origin;
      }
    }
  } catch {
    // Fall through — allow without credentials
  }

  return null;
}
