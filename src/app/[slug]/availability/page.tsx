'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface ScheduleSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface Exception {
  id: string;
  exception_date: string;
  reason: string | null;
  created_by: string;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

export default function AvailabilityPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<'schedule' | 'exceptions'>('schedule');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Schedule state
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [newStart, setNewStart] = useState('19:00');
  const [newEnd, setNewEnd] = useState('23:00');

  // Exceptions state
  const [exceptions, setExceptions] = useState<Exception[]>([]);
  const [newExDate, setNewExDate] = useState('');
  const [newExReason, setNewExReason] = useState('');
  const [addingException, setAddingException] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      const toDate = threeMonths.toISOString().split('T')[0];

      const [schedRes, exRes] = await Promise.all([
        fetch(`/${slug}/api/worker/schedule`),
        fetch(`/${slug}/api/worker/exceptions?from=${today}&to=${toDate}`),
      ]);

      if (schedRes.ok) {
        const data = await schedRes.json();
        setSchedule(data.schedule);
      }
      if (exRes.ok) {
        const data = await exRes.json();
        setExceptions(data.exceptions);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load availability data' });
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadData(); }, [loadData]);

  // Schedule management
  function addLocalSlot(dayOfWeek: number) {
    if (newStart >= newEnd) return;
    setSchedule(prev => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        day_of_week: dayOfWeek,
        start_time: newStart + ':00',
        end_time: newEnd + ':00',
      },
    ]);
    setAddingDay(null);
  }

  function removeLocalSlot(id: string) {
    setSchedule(prev => prev.filter(s => s.id !== id));
  }

  async function saveSchedule() {
    setSaving(true);
    setMessage(null);
    try {
      const slots = schedule.map(s => ({
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
      }));

      const res = await fetch(`/${slug}/api/worker/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      });

      if (!res.ok) throw new Error('Failed to save schedule');

      const data = await res.json();
      setSchedule(data.schedule);
      setMessage({ type: 'success', text: 'Weekly schedule saved!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setSaving(false);
    }
  }

  // Exception management
  async function addException() {
    if (!newExDate) return;
    setAddingException(true);
    setMessage(null);
    try {
      const res = await fetch(`/${slug}/api/worker/exceptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: [newExDate],
          reason: newExReason || undefined,
        }),
      });

      if (!res.ok) throw new Error('Failed to add exception');

      // Reload exceptions
      const today = new Date().toISOString().split('T')[0];
      const threeMonths = new Date();
      threeMonths.setMonth(threeMonths.getMonth() + 3);
      const toDate = threeMonths.toISOString().split('T')[0];

      const exRes = await fetch(`/${slug}/api/worker/exceptions?from=${today}&to=${toDate}`);
      if (exRes.ok) {
        const data = await exRes.json();
        setExceptions(data.exceptions);
      }

      setNewExDate('');
      setNewExReason('');
      setMessage({ type: 'success', text: 'Time off added!' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setAddingException(false);
    }
  }

  async function removeException(id: string) {
    try {
      const res = await fetch(`/${slug}/api/worker/exceptions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error('Failed to remove');
      setExceptions(prev => prev.filter(e => e.id !== id));
      setMessage({ type: 'success', text: 'Time off removed' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to remove time off' });
    }
  }

  // Group schedule by day
  const byDay = new Map<number, ScheduleSlot[]>();
  schedule.forEach(slot => {
    const existing = byDay.get(slot.day_of_week) ?? [];
    existing.push(slot);
    byDay.set(slot.day_of_week, existing);
  });

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Availability</h1>
        <p className="text-sm text-gray-500">
          Manage your weekly schedule and time off.
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {(['schedule', 'exceptions'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'schedule' ? 'Weekly Schedule' : 'Time Off'}
          </button>
        ))}
      </div>

      {/* Weekly Schedule Tab */}
      {tab === 'schedule' && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 0].map(day => {
            const daySlots = byDay.get(day) ?? [];
            const isAdding = addingDay === day;

            return (
              <div key={day} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                  <span className="text-sm font-medium text-gray-900">{DAY_NAMES[day]}</span>
                  <button
                    type="button"
                    onClick={() => setAddingDay(isAdding ? null : day)}
                    className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                  >
                    {isAdding ? 'Cancel' : '+ Add'}
                  </button>
                </div>

                {daySlots.length > 0 && (
                  <div className="divide-y divide-gray-100">
                    {daySlots.map(slot => (
                      <div key={slot.id} className="flex items-center justify-between px-4 py-2">
                        <span className="text-sm text-gray-700">
                          {slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeLocalSlot(slot.id)}
                          className="text-gray-400 hover:text-red-500 text-xs transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {isAdding && (
                  <div className="px-4 py-3 bg-emerald-50 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <select value={newStart} onChange={e => setNewStart(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-sm">
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <span className="text-gray-400">to</span>
                      <select value={newEnd} onChange={e => setNewEnd(e.target.value)} className="px-2 py-1.5 border border-gray-300 rounded text-sm">
                        {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button
                        type="button"
                        onClick={() => addLocalSlot(day)}
                        disabled={newStart >= newEnd}
                        className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveSchedule}
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 text-white font-medium text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>
      )}

      {/* Exceptions Tab */}
      {tab === 'exceptions' && (
        <div className="space-y-4">
          {/* Add exception form */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700">Add Time Off</p>
            <div className="flex gap-3">
              <input
                type="date"
                value={newExDate}
                onChange={e => setNewExDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="text"
                value={newExReason}
                onChange={e => setNewExReason(e.target.value)}
                placeholder="Reason (optional)"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={addException}
                disabled={!newExDate || addingException}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {addingException ? '...' : 'Add'}
              </button>
            </div>
          </div>

          {/* Exceptions list */}
          {exceptions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No upcoming time off scheduled.</p>
          ) : (
            <div className="space-y-2">
              {exceptions.map(ex => (
                <div key={ex.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(ex.exception_date + 'T00:00:00').toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {ex.reason && (
                      <p className="text-xs text-gray-500">{ex.reason}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeException(ex.id)}
                    className="text-gray-400 hover:text-red-500 text-sm transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
