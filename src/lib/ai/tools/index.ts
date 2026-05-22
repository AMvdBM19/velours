import type { AITool } from '../adapter';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Tool Definitions ──

export const TOOL_DEFINITIONS: AITool[] = [
  {
    name: 'get_upcoming_bookings',
    description: 'Get confirmed bookings for a date range. Optionally filter by worker pseudonym.',
    parameters: {
      type: 'object',
      properties: {
        from_date: { type: 'string', description: 'Start date (YYYY-MM-DD). Defaults to today.' },
        to_date: { type: 'string', description: 'End date (YYYY-MM-DD). Defaults to 7 days from now.' },
        worker_pseudonym: { type: 'string', description: 'Filter by worker pseudonym (optional).' },
      },
    },
  },
  {
    name: 'get_worker_availability',
    description: 'Get available time slots for a specific worker on a given date.',
    parameters: {
      type: 'object',
      properties: {
        worker_pseudonym: { type: 'string', description: 'Worker pseudonym to check.' },
        date: { type: 'string', description: 'Date to check (YYYY-MM-DD).' },
      },
      required: ['worker_pseudonym', 'date'],
    },
  },
  {
    name: 'search_workers',
    description: 'Search workers by name, nationality, language, or service tag. Returns pseudonym and status only — never real names or personal details.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (pseudonym, nationality, language, or tag name).' },
        status: { type: 'string', description: 'Filter by status: active, inactive, offline.' },
      },
    },
  },
  {
    name: 'search_clients',
    description: 'Search clients by display name or status.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (display name).' },
        status: { type: 'string', description: 'Filter by status: pending, approved, rejected, suspended.' },
      },
    },
  },
  {
    name: 'get_finance_summary',
    description: 'Get revenue totals, booking counts, and payout summary for a date range.',
    parameters: {
      type: 'object',
      properties: {
        from_date: { type: 'string', description: 'Start date (YYYY-MM-DD).' },
        to_date: { type: 'string', description: 'End date (YYYY-MM-DD).' },
      },
      required: ['from_date'],
    },
  },
  {
    name: 'check_slot_availability',
    description: 'Check if a specific time slot is available for a given worker.',
    parameters: {
      type: 'object',
      properties: {
        worker_pseudonym: { type: 'string', description: 'Worker pseudonym.' },
        date: { type: 'string', description: 'Date (YYYY-MM-DD).' },
        start_time: { type: 'string', description: 'Start time (HH:MM).' },
        duration_minutes: { type: 'number', description: 'Duration in minutes.' },
      },
      required: ['worker_pseudonym', 'date', 'start_time', 'duration_minutes'],
    },
  },
  {
    name: 'create_manual_booking',
    description: 'Create a manual booking (requires user confirmation). Returns a preview first — do NOT execute without the user saying "yes" or "confirm".',
    parameters: {
      type: 'object',
      properties: {
        worker_pseudonym: { type: 'string', description: 'Worker pseudonym.' },
        client_display_name: { type: 'string', description: 'Client display name.' },
        date: { type: 'string', description: 'Booking date (YYYY-MM-DD).' },
        start_time: { type: 'string', description: 'Start time (HH:MM).' },
        duration_minutes: { type: 'number', description: 'Duration in minutes.' },
        location_type: { type: 'string', enum: ['incall', 'outcall', 'other'], description: 'Location type.' },
        location_address: { type: 'string', description: 'Address (optional).' },
        tag_names: { type: 'array', items: { type: 'string' }, description: 'Service tag names (optional).' },
      },
      required: ['worker_pseudonym', 'client_display_name', 'date', 'start_time', 'duration_minutes'],
    },
  },
];

// ── Tool Executor ──

export async function executeTool(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: Record<string, any>,
  tenantId: string
): Promise<string> {
  const supabase = getServiceClient();

  try {
    switch (toolName) {
      case 'get_upcoming_bookings': {
        const from = input.from_date || new Date().toISOString().split('T')[0];
        const to = input.to_date || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

        let query = supabase
          .from('bookings')
          .select('slot_date, slot_start, slot_end, duration_minutes, status, location_type, total_price, workers(pseudonym), clients(display_name)')
          .eq('tenant_id', tenantId)
          .in('status', ['confirmed', 'pending_worker'])
          .gte('slot_date', from)
          .lte('slot_date', to)
          .order('slot_date')
          .order('slot_start');

        if (input.worker_pseudonym) {
          const { data: worker } = await supabase
            .from('workers')
            .select('id')
            .eq('tenant_id', tenantId)
            .ilike('pseudonym', `%${input.worker_pseudonym}%`)
            .single();
          if (worker) query = query.eq('worker_id', worker.id);
        }

        const { data } = await query;
        if (!data || data.length === 0) return 'No upcoming bookings found for this period.';

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return data.map((b: any) => {
          const w = b.workers as { pseudonym: string } | null;
          const c = b.clients as { display_name: string } | null;
          return `${b.slot_date} ${b.slot_start?.slice(0, 5)}-${b.slot_end?.slice(0, 5)} | ${w?.pseudonym || '?'} | ${c?.display_name || 'Walk-in'} | ${b.status} | €${b.total_price}`;
        }).join('\n');
      }

      case 'get_worker_availability': {
        const { data: worker } = await supabase
          .from('workers')
          .select('id')
          .eq('tenant_id', tenantId)
          .ilike('pseudonym', `%${input.worker_pseudonym}%`)
          .single();

        if (!worker) return `Worker "${input.worker_pseudonym}" not found.`;

        const dayOfWeek = new Date(input.date + 'T00:00:00').getDay();

        const [scheduleRes, exceptionsRes, bookingsRes] = await Promise.all([
          supabase.from('worker_schedule').select('start_time, end_time').eq('worker_id', worker.id).eq('tenant_id', tenantId).eq('day_of_week', dayOfWeek),
          supabase.from('worker_exceptions').select('id').eq('worker_id', worker.id).eq('tenant_id', tenantId).eq('exception_date', input.date),
          supabase.from('bookings').select('slot_start, slot_end').eq('worker_id', worker.id).eq('tenant_id', tenantId).eq('slot_date', input.date).in('status', ['confirmed', 'pending_worker']),
        ]);

        if (exceptionsRes.data?.length) return `${input.worker_pseudonym} has a day off on ${input.date}.`;
        if (!scheduleRes.data?.length) return `${input.worker_pseudonym} has no schedule on this day.`;

        const bookedSlots = bookingsRes.data || [];
        const available = scheduleRes.data.map(s =>
          `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`
        );

        let result = `Schedule for ${input.worker_pseudonym} on ${input.date}:\n${available.join('\n')}`;
        if (bookedSlots.length > 0) {
          result += `\n\nAlready booked:\n${bookedSlots.map(b => `${b.slot_start.slice(0, 5)} - ${b.slot_end.slice(0, 5)}`).join('\n')}`;
        }
        return result;
      }

      case 'search_workers': {
        let query = supabase
          .from('workers')
          .select('pseudonym, status, nationality, languages, age')
          .eq('tenant_id', tenantId);

        if (input.status) query = query.eq('status', input.status);
        if (input.query) {
          query = query.or(`pseudonym.ilike.%${input.query}%,nationality.ilike.%${input.query}%`);
        }

        const { data } = await query;
        if (!data || data.length === 0) return 'No workers found matching your criteria.';

        return data.map(w =>
          `${w.pseudonym} | ${w.status} | ${w.nationality || '?'} | Age: ${w.age || '?'} | Languages: ${(w.languages || []).join(', ')}`
        ).join('\n');
      }

      case 'search_clients': {
        let query = supabase
          .from('clients')
          .select('display_name, status, created_at')
          .eq('tenant_id', tenantId);

        if (input.status) query = query.eq('status', input.status);
        if (input.query) {
          query = query.ilike('display_name', `%${input.query}%`);
        }

        const { data } = await query;
        if (!data || data.length === 0) return 'No clients found matching your criteria.';

        return data.map(c =>
          `${c.display_name} | ${c.status} | Joined: ${new Date(c.created_at).toLocaleDateString('en-GB')}`
        ).join('\n');
      }

      case 'get_finance_summary': {
        const from = input.from_date;
        const to = input.to_date || new Date().toISOString().split('T')[0];

        const { data } = await supabase
          .from('bookings')
          .select('total_price, worker_payout, agency_share, status')
          .eq('tenant_id', tenantId)
          .in('status', ['completed', 'no_show'])
          .gte('slot_date', from)
          .lte('slot_date', to);

        if (!data || data.length === 0) return 'No completed bookings in this period.';

        let revenue = 0, payouts = 0, share = 0, completed = 0, noShows = 0;
        for (const b of data) {
          revenue += Number(b.total_price) || 0;
          payouts += Number(b.worker_payout) || 0;
          share += Number(b.agency_share) || 0;
          if (b.status === 'completed') completed++;
          if (b.status === 'no_show') noShows++;
        }

        return `Period: ${from} to ${to}\nTotal Revenue: €${revenue.toFixed(2)}\nWorker Payouts: €${payouts.toFixed(2)}\nAgency Share: €${share.toFixed(2)}\nCompleted: ${completed}\nNo-Shows: ${noShows}`;
      }

      case 'check_slot_availability': {
        const { data: worker } = await supabase
          .from('workers')
          .select('id, status')
          .eq('tenant_id', tenantId)
          .ilike('pseudonym', `%${input.worker_pseudonym}%`)
          .single();

        if (!worker) return `Worker "${input.worker_pseudonym}" not found.`;
        if (worker.status !== 'active') return `Worker is currently ${worker.status} and cannot take bookings.`;

        const [startH, startM] = input.start_time.split(':').map(Number);
        const endMinutes = startH * 60 + startM + input.duration_minutes;
        const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}:00`;
        const startTime = `${input.start_time}:00`;

        // Check schedule
        const dayOfWeek = new Date(input.date + 'T00:00:00').getDay();
        const { data: schedule } = await supabase.from('worker_schedule').select('start_time, end_time').eq('worker_id', worker.id).eq('tenant_id', tenantId).eq('day_of_week', dayOfWeek);

        const fits = schedule?.some(s => startTime >= s.start_time && endTime <= s.end_time);
        if (!fits) return 'Slot is outside the worker\'s schedule.';

        // Check exceptions
        const { data: exc } = await supabase.from('worker_exceptions').select('id').eq('worker_id', worker.id).eq('tenant_id', tenantId).eq('exception_date', input.date);
        if (exc?.length) return 'Worker has a day off on this date.';

        // Check conflicts
        const { data: conflicts } = await supabase.from('bookings').select('id').eq('worker_id', worker.id).eq('tenant_id', tenantId).eq('slot_date', input.date).in('status', ['confirmed', 'pending_worker']).lt('slot_start', endTime).gt('slot_end', startTime);

        if (conflicts?.length) return 'Slot conflicts with an existing booking.';

        return `Slot is available! ${input.date} ${input.start_time} for ${input.duration_minutes} minutes.`;
      }

      case 'create_manual_booking': {
        // This tool returns a preview. Actual booking creation happens via the booking API.
        const { data: worker } = await supabase
          .from('workers')
          .select('id, pseudonym')
          .eq('tenant_id', tenantId)
          .ilike('pseudonym', `%${input.worker_pseudonym}%`)
          .single();

        const { data: client } = await supabase
          .from('clients')
          .select('id, display_name')
          .eq('tenant_id', tenantId)
          .ilike('display_name', `%${input.client_display_name}%`)
          .single();

        if (!worker) return `Worker "${input.worker_pseudonym}" not found.`;
        if (!client) return `Client "${input.client_display_name}" not found.`;

        const { data: settings } = await supabase
          .from('tenant_settings')
          .select('base_rate_per_30min, worker_payout_pct')
          .eq('tenant_id', tenantId)
          .single();

        const rate = settings?.base_rate_per_30min || 60;
        const slots = input.duration_minutes / 30;
        const total = rate * slots;
        const payout = total * ((settings?.worker_payout_pct || 70) / 100);

        return `BOOKING PREVIEW (requires confirmation):\nWorker: ${worker.pseudonym}\nClient: ${client.display_name}\nDate: ${input.date}\nTime: ${input.start_time}\nDuration: ${input.duration_minutes} min\nLocation: ${input.location_type || 'incall'}\nEstimated total: €${total.toFixed(2)}\nWorker payout: €${payout.toFixed(2)}\n\nPlease confirm to create this booking.`;
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (err) {
    return `Tool error: ${err instanceof Error ? err.message : 'Unknown error'}`;
  }
}
