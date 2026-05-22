import { NextResponse, type NextRequest } from 'next/server';
import { apiGuard } from '@/lib/auth/api-guard';
import { createServerClient } from '@supabase/ssr';

function getSupabase(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll() {},
      },
    }
  );
}

interface AvailableSlot {
  date: string;
  start_time: string;
  end_time: string;
}

/**
 * GET /[slug]/api/availability
 * Compute available slots for a worker over a date range.
 * 3-layer hybrid: schedule MINUS exceptions MINUS confirmed bookings.
 *
 * Query: ?worker_id=xxx&from=YYYY-MM-DD&to=YYYY-MM-DD&slot_minutes=30
 */
export async function GET(request: NextRequest) {
  const guard = await apiGuard(request, ['worker', 'agent', 'client']);
  if ('error' in guard) return guard.error;
  const { user } = guard;

  const url = new URL(request.url);
  const workerId = url.searchParams.get('worker_id') || user.workerId;
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const slotMinutes = parseInt(url.searchParams.get('slot_minutes') || '30', 10);

  if (!workerId) {
    return NextResponse.json({ error: 'worker_id required' }, { status: 400 });
  }
  if (!from || !to) {
    return NextResponse.json({ error: 'from and to dates required (YYYY-MM-DD)' }, { status: 400 });
  }

  const supabase = getSupabase(request);

  // 1. Fetch weekly schedule
  const { data: schedule } = await supabase
    .from('worker_schedule')
    .select('day_of_week, start_time, end_time')
    .eq('worker_id', workerId)
    .eq('tenant_id', user.tenantId);

  if (!schedule || schedule.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  // 2. Fetch exceptions in date range
  const { data: exceptions } = await supabase
    .from('worker_exceptions')
    .select('exception_date')
    .eq('worker_id', workerId)
    .eq('tenant_id', user.tenantId)
    .gte('exception_date', from)
    .lte('exception_date', to);

  const exceptionDates = new Set(exceptions?.map(e => e.exception_date) ?? []);

  // 3. Fetch confirmed/pending bookings in date range
  const { data: bookings } = await supabase
    .from('bookings')
    .select('slot_date, slot_start, slot_end')
    .eq('worker_id', workerId)
    .eq('tenant_id', user.tenantId)
    .in('status', ['pending_worker', 'confirmed'])
    .gte('slot_date', from)
    .lte('slot_date', to);

  // Build booked slots lookup: date -> [{start, end}]
  const bookedSlots = new Map<string, { start: string; end: string }[]>();
  for (const b of bookings ?? []) {
    const dateSlots = bookedSlots.get(b.slot_date) ?? [];
    dateSlots.push({ start: b.slot_start, end: b.slot_end });
    bookedSlots.set(b.slot_date, dateSlots);
  }

  // Build schedule lookup: dayOfWeek -> [{start, end}]
  const scheduleLookup = new Map<number, { start: string; end: string }[]>();
  for (const s of schedule) {
    const daySlots = scheduleLookup.get(s.day_of_week) ?? [];
    daySlots.push({ start: s.start_time, end: s.end_time });
    scheduleLookup.set(s.day_of_week, daySlots);
  }

  // 4. Iterate over each date in range
  const availableSlots: AvailableSlot[] = [];
  const startDate = new Date(from + 'T00:00:00');
  const endDate = new Date(to + 'T00:00:00');

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); // 0=Sun ... 6=Sat

    // Skip if exception date
    if (exceptionDates.has(dateStr)) continue;

    // Check if worker has schedule for this day
    const daySchedule = scheduleLookup.get(dayOfWeek);
    if (!daySchedule) continue;

    const dayBookings = bookedSlots.get(dateStr) ?? [];

    // For each scheduled block, generate available slots
    for (const block of daySchedule) {
      const blockSlots = generateSlots(block.start, block.end, slotMinutes);
      for (const slot of blockSlots) {
        // Check if slot overlaps with any booking
        const overlaps = dayBookings.some(b =>
          slot.start_time < b.end && slot.end_time > b.start
        );
        if (!overlaps) {
          availableSlots.push({
            date: dateStr,
            start_time: slot.start_time,
            end_time: slot.end_time,
          });
        }
      }
    }
  }

  return NextResponse.json({ slots: availableSlots });
}

/**
 * Generate time slots within a block.
 * E.g., 19:00-23:00 with 30min slots → 19:00-19:30, 19:30-20:00, ...
 */
function generateSlots(
  start: string,
  end: string,
  durationMinutes: number
): { start_time: string; end_time: string }[] {
  const slots: { start_time: string; end_time: string }[] = [];

  let currentMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  while (currentMinutes + durationMinutes <= endMinutes) {
    slots.push({
      start_time: minutesToTime(currentMinutes),
      end_time: minutesToTime(currentMinutes + durationMinutes),
    });
    currentMinutes += durationMinutes;
  }

  return slots;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
}
