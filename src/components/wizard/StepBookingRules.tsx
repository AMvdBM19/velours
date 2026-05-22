'use client';

import { useState } from 'react';
import type { StepProps } from './types';
import WizardNav from './WizardNav';

const SLOT_OPTIONS = [15, 30, 45, 60];

export default function StepBookingRules({ data, updateData, onNext, onBack }: StepProps) {
  const s = data.settings;

  const [slotMinutes, setSlotMinutes] = useState(Number(s.default_slot_minutes) || 30);
  const [leadTime, setLeadTime] = useState(Number(s.min_lead_time_hours) || 2);
  const [maxDays, setMaxDays] = useState(Number(s.max_booking_days_ahead) || 30);
  const [backToBack, setBackToBack] = useState(s.allow_back_to_back === true);
  const [cancelWindow, setCancelWindow] = useState(Number(s.cancellation_window_hours) || 24);
  const [ageGate, setAgeGate] = useState(Number(s.age_gate_minimum) || 21);

  function handleNext() {
    const stepData = {
      default_slot_minutes: slotMinutes,
      min_lead_time_hours: leadTime,
      max_booking_days_ahead: maxDays,
      allow_back_to_back: backToBack,
      cancellation_window_hours: cancelWindow,
      age_gate_minimum: ageGate,
    };
    updateData('settings', stepData);
    onNext(stepData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Booking Rules</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure how bookings work for your agency. All editable later except age gate.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Slot Duration
          </label>
          <div className="flex gap-3">
            {SLOT_OPTIONS.map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => setSlotMinutes(min)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  slotMinutes === min
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                    : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                {min} min
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Booking Lead Time
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={leadTime}
                onChange={(e) => setLeadTime(Math.max(0, Number(e.target.value)))}
                min={0}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-500">hours</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Booking Window
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={maxDays}
                onChange={(e) => setMaxDays(Math.max(1, Number(e.target.value)))}
                min={1}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-500">days ahead</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Cancellation Window
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={cancelWindow}
              onChange={(e) => setCancelWindow(Math.max(0, Number(e.target.value)))}
              min={0}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-500">hours before booking</span>
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3 bg-gray-50 rounded-lg">
          <input
            type="checkbox"
            checked={backToBack}
            onChange={(e) => setBackToBack(e.target.checked)}
            className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-700">Allow back-to-back bookings</p>
            <p className="text-xs text-gray-500">Workers can be booked in consecutive slots without a gap</p>
          </div>
        </label>

        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Age Gate Minimum 🔒
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={ageGate}
              onChange={(e) => setAgeGate(Math.max(18, Number(e.target.value)))}
              min={18}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-500">years (legal compliance)</span>
          </div>
        </div>
      </div>

      <WizardNav onBack={onBack} onNext={handleNext} />
    </div>
  );
}
