'use client';

import { useState } from 'react';
import type { StepProps } from './types';
import WizardNav from './WizardNav';

export default function StepClientApproval({ data, updateData, onNext, onBack }: StepProps) {
  const s = data.settings;

  const [approvalMode, setApprovalMode] = useState((s.client_approval_mode as string) || 'manual');
  const [requireAge, setRequireAge] = useState(s.require_age_confirm !== false);
  const [requireId, setRequireId] = useState(s.require_id_upload === true);
  const [requirePhone, setRequirePhone] = useState(s.require_phone_verify === true);
  const [offlineBehaviour, setOfflineBehaviour] = useState(
    (s.offline_behaviour as string) || 'auto_approve'
  );

  function handleNext() {
    const stepData = {
      client_approval_mode: approvalMode,
      require_age_confirm: requireAge,
      require_id_upload: requireId,
      require_phone_verify: requirePhone,
      offline_behaviour: offlineBehaviour,
    };
    updateData('settings', stepData);
    onNext(stepData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Client Approval & Worker Config</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure how client signups are handled and worker offline behaviour.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Client Approval Mode
          </label>
          <div className="space-y-2">
            {[
              { value: 'manual', label: 'Manual', desc: 'You review and approve each client signup' },
              { value: 'auto', label: 'Auto-approve', desc: 'Clients are approved immediately after signup' },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                  approvalMode === opt.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="approval"
                  checked={approvalMode === opt.value}
                  onChange={() => setApprovalMode(opt.value)}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Required Signup Fields
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requireAge}
                onChange={(e) => setRequireAge(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">Age confirmation</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requireId}
                onChange={(e) => setRequireId(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">ID upload</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={requirePhone}
                onChange={(e) => setRequirePhone(e.target.checked)}
                className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-gray-700">Phone verification</span>
            </label>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Worker Offline Behaviour
          </label>
          <p className="text-xs text-gray-500 mb-2">
            What happens when a worker requests to go offline (hide their listing)?
          </p>
          <div className="space-y-2">
            {[
              { value: 'auto_approve', label: 'Auto-approve', desc: 'Worker goes offline immediately' },
              { value: 'require_acknowledgement', label: 'Require acknowledgement', desc: 'You must acknowledge before listing is hidden' },
              { value: 'blocked', label: 'Blocked', desc: 'Workers cannot go offline without your action' },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border-2 transition-colors ${
                  offlineBehaviour === opt.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="offline"
                  checked={offlineBehaviour === opt.value}
                  onChange={() => setOfflineBehaviour(opt.value)}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <WizardNav onBack={onBack} onNext={handleNext} />
    </div>
  );
}
