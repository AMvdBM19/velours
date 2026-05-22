'use client';

import { useState } from 'react';
import type { StepProps } from './types';
import WizardNav from './WizardNav';

interface Template {
  event_type: string;
  channel: string;
  subject?: string;
  body: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    event_type: 'booking_confirmed',
    channel: 'whatsapp',
    body: 'Hi [client_name], your booking with [worker_name] on [date] at [time] ([duration] min) is confirmed. [agency_name]',
  },
  {
    event_type: 'booking_confirmed',
    channel: 'email',
    subject: 'Booking Confirmed — [agency_name]',
    body: 'Dear [client_name],\n\nYour booking with [worker_name] on [date] at [time] ([duration] min) has been confirmed.\n\nTotal: [price]\n\nRegards,\n[agency_name]',
  },
  {
    event_type: 'booking_declined',
    channel: 'whatsapp',
    body: 'Hi [client_name], unfortunately [worker_name] is not available for your requested time. Visit [website_link] to schedule another worker. [agency_name]',
  },
  {
    event_type: 'reminder',
    channel: 'whatsapp',
    body: 'Reminder: Your booking with [worker_name] is in 1 hour ([time]). [agency_name]',
  },
  {
    event_type: 'account_approved',
    channel: 'whatsapp',
    body: 'Hi [client_name], your account at [agency_name] has been approved! Visit [website_link] to browse and book. [agency_name]',
  },
  {
    event_type: 'account_approved',
    channel: 'email',
    subject: 'Account Approved — [agency_name]',
    body: 'Dear [client_name],\n\nYour account has been approved. You can now browse workers and make bookings at [website_link].\n\nWelcome!\n[agency_name]',
  },
  {
    event_type: 'account_rejected',
    channel: 'email',
    subject: 'Account Update — [agency_name]',
    body: 'Dear [client_name],\n\nWe were unable to approve your account at this time.\n\nReason: [reason]\n\nIf you believe this is an error, please reply to this email.\n\n[agency_name]',
  },
  {
    event_type: 'account_suspended',
    channel: 'email',
    subject: 'Account Suspended — [agency_name]',
    body: 'Dear [client_name],\n\nYour account has been suspended.\n\nReason: [reason]\n\nIf you wish to appeal, please reply to this email.\n\n[agency_name]',
  },
];

const VARIABLES = [
  '[worker_name]', '[client_name]', '[date]', '[time]', '[duration]',
  '[price]', '[agency_name]', '[website_link]', '[reason]',
  '[location_address]', '[location_notes]',
];

function formatEventType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function StepTemplates({ data, updateData, onNext, onBack }: StepProps) {
  const existing = data.templates.length > 0 ? data.templates : DEFAULT_TEMPLATES;
  const [templates, setTemplates] = useState<Template[]>(existing);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function updateTemplate(index: number, field: keyof Template, value: string) {
    setTemplates((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }

  function handleNext() {
    updateData('templates', templates);
    onNext({ templates });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Notification Templates</h2>
        <p className="text-sm text-gray-500 mt-1">
          Customize the messages sent to clients. All editable later from Settings.
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {VARIABLES.map((v) => (
            <span key={v} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
              {v}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {templates.map((tpl, index) => (
          <div
            key={`${tpl.event_type}-${tpl.channel}`}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setEditingIndex(editingIndex === index ? null : index)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  tpl.channel === 'whatsapp'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {tpl.channel === 'whatsapp' ? 'WA' : 'Email'}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {formatEventType(tpl.event_type)}
                </span>
              </div>
              <span className="text-gray-400 text-sm">
                {editingIndex === index ? '▲' : '▼'}
              </span>
            </button>

            {editingIndex === index && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                {tpl.channel === 'email' && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 mt-3">Subject</label>
                    <input
                      type="text"
                      value={tpl.subject || ''}
                      onChange={(e) => updateTemplate(index, 'subject', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 mb-1 mt-2">Body</label>
                  <textarea
                    value={tpl.body}
                    onChange={(e) => updateTemplate(index, 'body', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Preview:</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {tpl.body
                      .replace(/\[client_name\]/g, 'Jan')
                      .replace(/\[worker_name\]/g, 'Luna')
                      .replace(/\[date\]/g, '25 May 2026')
                      .replace(/\[time\]/g, '20:00')
                      .replace(/\[duration\]/g, '60')
                      .replace(/\[price\]/g, '€120')
                      .replace(/\[agency_name\]/g, 'Your Agency')
                      .replace(/\[website_link\]/g, 'app.velours.nl/your-agency')
                      .replace(/\[reason\]/g, 'Policy violation')}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <WizardNav onBack={onBack} onNext={handleNext} />
    </div>
  );
}
