'use client';

import { useState } from 'react';

interface ScheduleSlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface Props {
  schedule: ScheduleSlot[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleSlot[]>>;
  onBack: () => void;
  onComplete: () => void;
  completing: boolean;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
  }
}

export default function StepWorkerSchedule({ schedule, setSchedule, onBack, onComplete, completing }: Props) {
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [newStart, setNewStart] = useState('19:00');
  const [newEnd, setNewEnd] = useState('23:00');

  function addSlot(dayOfWeek: number) {
    if (newStart >= newEnd) return;
    setSchedule(prev => [
      ...prev,
      { day_of_week: dayOfWeek, start_time: newStart + ':00', end_time: newEnd + ':00' },
    ]);
    setAddingDay(null);
  }

  function removeSlot(index: number) {
    setSchedule(prev => prev.filter((_, i) => i !== index));
  }

  // Group schedule by day
  const byDay = new Map<number, { slot: ScheduleSlot; index: number }[]>();
  schedule.forEach((slot, index) => {
    const existing = byDay.get(slot.day_of_week) ?? [];
    existing.push({ slot, index });
    byDay.set(slot.day_of_week, existing);
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Weekly Schedule</h2>
        <p className="text-sm text-gray-500 mt-1">
          Set your recurring weekly availability. This repeats every week automatically.
          You can mark specific dates unavailable later via the calendar.
        </p>
      </div>

      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 0].map(day => {
          const daySlots = byDay.get(day) ?? [];
          const isAdding = addingDay === day;

          return (
            <div key={day} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50">
                <span className="text-sm font-medium text-gray-900">{DAY_NAMES[day]}</span>
                <div className="flex items-center gap-2">
                  {daySlots.length > 0 && (
                    <span className="text-xs text-emerald-600">
                      {daySlots.length} slot{daySlots.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setAddingDay(isAdding ? null : day)}
                    className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition-colors"
                  >
                    {isAdding ? 'Cancel' : '+ Add'}
                  </button>
                </div>
              </div>

              {/* Existing slots for this day */}
              {daySlots.length > 0 && (
                <div className="divide-y divide-gray-100">
                  {daySlots.map(({ slot, index }) => (
                    <div key={index} className="flex items-center justify-between px-4 py-2">
                      <span className="text-sm text-gray-700">
                        {slot.start_time.slice(0, 5)} — {slot.end_time.slice(0, 5)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSlot(index)}
                        className="text-gray-400 hover:text-red-500 text-sm transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add slot form */}
              {isAdding && (
                <div className="px-4 py-3 bg-emerald-50 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <select
                      value={newStart}
                      onChange={e => setNewStart(e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <span className="text-gray-400">to</span>
                    <select
                      value={newEnd}
                      onChange={e => setNewEnd(e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => addSlot(day)}
                      disabled={newStart >= newEnd}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {newStart >= newEnd && (
                    <p className="text-xs text-red-500 mt-1">End time must be after start time</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Schedule summary */}
      <div className="bg-gray-50 rounded-lg p-3">
        <p className="text-xs text-gray-500 mb-2">Schedule Summary</p>
        {schedule.length === 0 ? (
          <p className="text-sm text-gray-400">No availability set. You can set this later.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 0].map(day => {
              const daySlots = byDay.get(day) ?? [];
              if (daySlots.length === 0) return null;
              return (
                <span key={day} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                  {DAY_SHORT[day]}: {daySlots.map(s => `${s.slot.start_time.slice(0, 5)}-${s.slot.end_time.slice(0, 5)}`).join(', ')}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={completing}
          className="px-8 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {completing ? 'Activating...' : 'Complete & Go Live'}
        </button>
      </div>
    </div>
  );
}
