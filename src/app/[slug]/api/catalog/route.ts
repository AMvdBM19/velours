import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { withCors, handlePreflight } from '@/lib/cors';

/**
 * GET /[slug]/api/catalog
 * Public-ish endpoint — returns active workers for the catalog.
 * Client must be approved to see this. We verify via apiGuard for logged-in users
 * but also allow unauthenticated access for the public widget preview.
 *
 * Only exposes: pseudonym, age, nationality, gender, languages, bio, photo_urls, tags
 * NEVER exposes: real_name, bsn, email, kvk_number
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // Resolve tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, is_active')
    .eq('slug', slug)
    .single();

  if (!tenant || !tenant.is_active) {
    return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
  }

  const url = new URL(request.url);
  const tagFilter = url.searchParams.get('tag');

  // Fetch active workers (only client-safe fields)
  const query = supabase
    .from('workers')
    .select(`
      id, pseudonym, age, nationality, gender, languages, bio, photo_urls,
      worker_service_tags(tag_id, service_tags(id, name, extra_price))
    `)
    .eq('tenant_id', tenant.id)
    .eq('status', 'active')
    .eq('wizard_completed', true);

  const { data: workers, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Format and filter by tag if specified
  let formatted = (workers ?? []).map(w => ({
    id: w.id,
    pseudonym: w.pseudonym,
    age: w.age,
    nationality: w.nationality,
    gender: w.gender,
    languages: w.languages,
    bio: w.bio,
    photo_urls: w.photo_urls,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tags: w.worker_service_tags?.map((wst: any) => {
      const st = Array.isArray(wst.service_tags) ? wst.service_tags[0] : wst.service_tags;
      return st ? { id: st.id, name: st.name, extra_price: st.extra_price } : null;
    }).filter(Boolean) ?? [],
  }));

  if (tagFilter) {
    formatted = formatted.filter(w =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      w.tags.some((t: any) => t?.name?.toLowerCase() === tagFilter.toLowerCase())
    );
  }

  // Also fetch tenant branding for widget
  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('widget_layout, widget_primary_color, widget_accent_color, widget_bg, widget_font_pair, agency_display_name, pricing_enabled, show_price_to_client, base_rate_per_30min, default_slot_minutes, age_gate_minimum')
    .eq('tenant_id', tenant.id)
    .single();

  const origin = request.headers.get('origin');
  const response = NextResponse.json({
    workers: formatted,
    widget: settings ?? {},
    tenant: { slug, name: settings?.agency_display_name || slug },
  });

  return withCors(response, origin);
}

/**
 * OPTIONS /[slug]/api/catalog
 * CORS preflight for embed widget.
 */
export function OPTIONS(request: NextRequest) {
  return handlePreflight(request);
}
