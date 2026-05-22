import { NextResponse, type NextRequest } from 'next/server';

/**
 * Server-to-server auth guard for /api/super-admin/ routes.
 * Validates Bearer token against SUPER_ADMIN_API_KEY env var.
 * No Supabase auth — purely API key based.
 */
export function superAdminGuard(request: NextRequest): NextResponse | null {
  const apiKey = process.env.SUPER_ADMIN_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'Super admin API not configured' },
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7);
  if (token !== apiKey) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 403 }
    );
  }

  return null; // Auth passed
}
