'use client';

import { useState } from 'react';
import type { StepProps } from './types';
import WizardNav from './WizardNav';

export default function StepIdentity({ data, updateData, onNext, slug }: StepProps) {
  const t = data.tenant;
  const s = data.settings;

  const [agencyName, setAgencyName] = useState((s.agency_display_name as string) || (t.name as string) || '');
  const [agencySlug, setAgencySlug] = useState((t.slug as string) || '');
  const [kvkNumber, setKvkNumber] = useState((t.kvk_number as string) || '');
  const [licenseNumber, setLicenseNumber] = useState((t.license_number as string) || '');
  const [registeredDomain, setRegisteredDomain] = useState((t.registered_domain as string) || '');
  const [domainVerified, setDomainVerified] = useState(t.domain_verified as boolean || false);
  const [domainToken, setDomainToken] = useState((t.domain_txt_token as string) || '');
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  function handleNameChange(name: string) {
    setAgencyName(name);
    if (!agencySlug || agencySlug === generateSlug((t.name as string) || '')) {
      setAgencySlug(generateSlug(name));
    }
  }

  async function handleVerifyDomain() {
    setVerifying(true);
    try {
      const res = await fetch(`/${slug}/api/setup/verify-domain`, { method: 'POST' });
      const result = await res.json();
      setDomainVerified(result.verified);
      setVerifyMessage(result.message);
      if (result.token) setDomainToken(result.token);
    } catch {
      setVerifyMessage('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  }

  function handleNext() {
    const stepData = {
      name: agencyName,
      slug: agencySlug,
      kvk_number: kvkNumber,
      license_number: licenseNumber,
      registered_domain: registeredDomain || null,
      agency_display_name: agencyName,
    };
    updateData('tenant', stepData);
    updateData('settings', { agency_display_name: agencyName });
    onNext(stepData);
  }

  const canProceed = agencyName.trim() && agencySlug.trim();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Agency Identity</h2>
        <p className="text-sm text-gray-500 mt-1">
          These details identify your agency. Fields marked with 🔒 cannot be changed after launch.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agency Display Name *
          </label>
          <input
            type="text"
            value={agencyName}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Velours Amsterdam"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agency Slug 🔒 *
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">app.velours.nl/</span>
            <input
              type="text"
              value={agencySlug}
              onChange={(e) => setAgencySlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="velours-amsterdam"
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">Cannot be changed after launch</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              KVK Number 🔒
            </label>
            <input
              type="text"
              value={kvkNumber}
              onChange={(e) => setKvkNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="12345678"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Municipal License 🔒
            </label>
            <input
              type="text"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="AMS-2024-001"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Registered Domain 🔒
          </label>
          <input
            type="text"
            value={registeredDomain}
            onChange={(e) => setRegisteredDomain(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="youragency.nl (leave blank if using standalone page)"
          />
          <p className="text-xs text-gray-400 mt-1">
            The website where the booking widget will be embedded
          </p>

          {registeredDomain && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              {domainVerified ? (
                <p className="text-sm text-emerald-600 font-medium">✓ Domain verified</p>
              ) : (
                <>
                  {domainToken && (
                    <div className="mb-2">
                      <p className="text-xs text-gray-600 mb-1">
                        Add this TXT record to your domain DNS:
                      </p>
                      <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 block">
                        {domainToken}
                      </code>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleVerifyDomain}
                    disabled={verifying}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:opacity-50"
                  >
                    {verifying ? 'Checking...' : 'Verify Domain'}
                  </button>
                  {verifyMessage && (
                    <p className="text-xs text-gray-500 mt-1">{verifyMessage}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Can be completed later from Settings → Compliance
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <WizardNav
        showBack={false}
        onNext={handleNext}
        disabled={!canProceed}
      />
    </div>
  );
}
