'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { autoTextColor, widgetBgToHex } from '@/lib/utils/contrast';

interface CatalogWorker {
  id: string;
  pseudonym: string;
  age: number | null;
  nationality: string | null;
  gender: string | null;
  languages: string[] | null;
  bio: string | null;
  photo_urls: string[] | null;
  tags: { id: string; name: string; extra_price: number }[];
}

interface WidgetSettings {
  widget_layout: string;
  widget_primary_color: string;
  widget_accent_color: string;
  widget_bg: string;
  widget_font_pair: string;
  agency_display_name: string;
  pricing_enabled: boolean;
  show_price_to_client: boolean;
  base_rate_per_30min: number;
  default_slot_minutes: number;
  age_gate_minimum: number;
}

interface AvailableSlot {
  date: string;
  start_time: string;
  end_time: string;
}

export default function BookingWidget() {
  const { slug } = useParams<{ slug: string }>();
  const [workers, setWorkers] = useState<CatalogWorker[]>([]);
  const [widget, setWidget] = useState<WidgetSettings | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [loading, setLoading] = useState(true);
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // Booking flow state
  const [selectedWorker, setSelectedWorker] = useState<CatalogWorker | null>(null);
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [locationType, setLocationType] = useState<'incall' | 'outcall'>('incall');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationNotes, setLocationNotes] = useState('');

  const loadCatalog = useCallback(async () => {
    try {
      const res = await fetch(`/${slug}/api/catalog`);
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setWorkers(data.workers || []);
      setWidget(data.widget);
      setTenantName(data.tenant?.name || slug);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  async function loadSlots(workerId: string) {
    setLoadingSlots(true);
    try {
      const from = new Date().toISOString().split('T')[0];
      const to = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const slotMins = widget?.default_slot_minutes || 30;

      const res = await fetch(`/${slug}/api/availability?worker_id=${workerId}&from=${from}&to=${to}&slot_minutes=${slotMins}`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch {
      // fail silently
    } finally {
      setLoadingSlots(false);
    }
  }

  function selectWorker(w: CatalogWorker) {
    setSelectedWorker(w);
    setSelectedSlot(null);
    setSelectedTags([]);
    loadSlots(w.id);
  }

  // Widget styling
  const bgHex = widget ? widgetBgToHex(widget.widget_bg) : '#FFFFFF';
  const textColor = autoTextColor(bgHex);
  const primaryColor = widget?.widget_primary_color || '#2BB673';
  const accentColor = widget?.widget_accent_color || '#1D9E75';

  // Age gate
  if (!ageConfirmed && widget?.age_gate_minimum) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: bgHex, color: textColor }}>
        <div className="text-center max-w-sm">
          <h1 className="text-xl font-bold mb-4">{tenantName}</h1>
          <p className="text-sm mb-6 opacity-70">
            You must be at least {widget.age_gate_minimum} years old to access this content.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => setAgeConfirmed(true)}
              className="px-6 py-2.5 rounded-lg text-sm font-medium"
              style={{ backgroundColor: primaryColor, color: autoTextColor(primaryColor) }}
            >
              I am {widget.age_gate_minimum}+
            </button>
            <button
              type="button"
              onClick={() => window.close()}
              className="px-6 py-2.5 rounded-lg text-sm font-medium border border-current opacity-60"
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: bgHex, color: textColor }}>
        <p className="text-sm opacity-60">Loading...</p>
      </div>
    );
  }

  // Group slots by date for date picker
  const slotsByDate = new Map<string, AvailableSlot[]>();
  slots.forEach(s => {
    const existing = slotsByDate.get(s.date) ?? [];
    existing.push(s);
    slotsByDate.set(s.date, existing);
  });
  const availableDates = Array.from(slotsByDate.keys()).slice(0, 14);

  return (
    <div className="min-h-screen" style={{ backgroundColor: bgHex, color: textColor }}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{tenantName}</h1>
          {!selectedWorker && (
            <p className="text-sm opacity-60 mt-1">Browse our team and book an appointment.</p>
          )}
        </div>

        {/* Worker detail + booking */}
        {selectedWorker ? (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => { setSelectedWorker(null); setSelectedSlot(null); }}
              className="text-sm opacity-60 hover:opacity-100"
            >
              ← Back to catalog
            </button>

            <div className="flex gap-6">
              {/* Worker info */}
              <div className="flex-1">
                <div className="flex items-start gap-4 mb-4">
                  {selectedWorker.photo_urls?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedWorker.photo_urls[0]}
                      alt={selectedWorker.pseudonym}
                      className="w-20 h-20 rounded-xl object-cover"
                    />
                  )}
                  <div>
                    <h2 className="text-xl font-bold">{selectedWorker.pseudonym}</h2>
                    <p className="text-sm opacity-60">
                      {[selectedWorker.age && `${selectedWorker.age}`, selectedWorker.nationality].filter(Boolean).join(' • ')}
                    </p>
                    {selectedWorker.languages && selectedWorker.languages.length > 0 && (
                      <p className="text-xs opacity-50 mt-1">{selectedWorker.languages.join(', ')}</p>
                    )}
                  </div>
                </div>

                {selectedWorker.bio && (
                  <p className="text-sm opacity-80 mb-4">{selectedWorker.bio}</p>
                )}

                {/* Tags */}
                {selectedWorker.tags.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-medium mb-2 opacity-60">Services</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedWorker.tags.map(tag => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => setSelectedTags(prev =>
                            prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                          )}
                          className="text-xs px-2.5 py-1 rounded-full transition-colors"
                          style={{
                            backgroundColor: selectedTags.includes(tag.id) ? accentColor : 'transparent',
                            color: selectedTags.includes(tag.id) ? autoTextColor(accentColor) : 'inherit',
                            border: `1px solid ${selectedTags.includes(tag.id) ? accentColor : 'currentColor'}`,
                            opacity: selectedTags.includes(tag.id) ? 1 : 0.5,
                          }}
                        >
                          {tag.name}
                          {widget?.show_price_to_client && tag.extra_price > 0 && ` +€${tag.extra_price}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location */}
                <div className="mb-4">
                  <p className="text-xs font-medium mb-2 opacity-60">Location</p>
                  <div className="flex gap-2">
                    {(['incall', 'outcall'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLocationType(type)}
                        className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                        style={{
                          backgroundColor: locationType === type ? primaryColor : 'transparent',
                          color: locationType === type ? autoTextColor(primaryColor) : 'inherit',
                          borderColor: locationType === type ? primaryColor : 'currentColor',
                          opacity: locationType === type ? 1 : 0.5,
                        }}
                      >
                        {type === 'incall' ? 'At location' : 'At your address'}
                      </button>
                    ))}
                  </div>
                  {locationType === 'outcall' && (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={locationAddress}
                        onChange={e => setLocationAddress(e.target.value)}
                        placeholder="Your address"
                        className="w-full px-3 py-2 rounded-lg text-sm border"
                        style={{ borderColor: 'currentColor', backgroundColor: 'transparent', color: 'inherit' }}
                      />
                      <input
                        type="text"
                        value={locationNotes}
                        onChange={e => setLocationNotes(e.target.value)}
                        placeholder="Notes (e.g. ring bell 3B)"
                        className="w-full px-3 py-2 rounded-lg text-sm border"
                        style={{ borderColor: 'currentColor', backgroundColor: 'transparent', color: 'inherit' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Slot picker */}
              <div className="w-72">
                <p className="text-xs font-medium mb-2 opacity-60">Available times</p>
                {loadingSlots ? (
                  <p className="text-sm opacity-50">Loading availability...</p>
                ) : availableDates.length === 0 ? (
                  <p className="text-sm opacity-50">No available slots in the next 30 days.</p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {availableDates.map(date => {
                      const dateSlots = slotsByDate.get(date) ?? [];
                      return (
                        <div key={date}>
                          <p className="text-xs font-medium opacity-70 mb-1">
                            {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
                              weekday: 'short', day: 'numeric', month: 'short',
                            })}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {dateSlots.map(slot => {
                              const isSelected = selectedSlot?.date === slot.date && selectedSlot?.start_time === slot.start_time;
                              return (
                                <button
                                  key={`${slot.date}-${slot.start_time}`}
                                  type="button"
                                  onClick={() => setSelectedSlot(slot)}
                                  className="text-xs px-2 py-1 rounded transition-colors"
                                  style={{
                                    backgroundColor: isSelected ? primaryColor : 'transparent',
                                    color: isSelected ? autoTextColor(primaryColor) : 'inherit',
                                    border: `1px solid ${isSelected ? primaryColor : 'currentColor'}`,
                                    opacity: isSelected ? 1 : 0.6,
                                  }}
                                >
                                  {slot.start_time.slice(0, 5)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Book button */}
                {selectedSlot && (
                  <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: primaryColor + '15' }}>
                    <p className="text-sm font-medium mb-2">
                      {selectedWorker.pseudonym} — {new Date(selectedSlot.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} at {selectedSlot.start_time.slice(0, 5)}
                    </p>
                    <p className="text-xs opacity-60 mb-3">
                      You need to be logged in to complete your booking.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        // Redirect to login with booking params
                        const params = new URLSearchParams({
                          worker_id: selectedWorker.id,
                          slot_date: selectedSlot.date,
                          slot_start: selectedSlot.start_time,
                          duration: String(widget?.default_slot_minutes || 30),
                          tags: selectedTags.join(','),
                          location_type: locationType,
                          redirect: 'book',
                        });
                        window.location.href = `/${slug}/login?${params.toString()}`;
                      }}
                      className="w-full py-2.5 rounded-lg text-sm font-medium"
                      style={{ backgroundColor: primaryColor, color: autoTextColor(primaryColor) }}
                    >
                      Book Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Catalog grid/list */
          <div className={widget?.widget_layout === 'list' ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}>
            {workers.length === 0 ? (
              <p className="text-sm opacity-50 col-span-3 text-center py-12">
                No workers available at this time.
              </p>
            ) : (
              workers.map(w => (
                widget?.widget_layout === 'list' ? (
                  /* List layout */
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => selectWorker(w)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-current border-opacity-10 hover:border-opacity-30 transition-colors text-left"
                  >
                    {w.photo_urls?.[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.photo_urls[0]} alt="" className="w-14 h-14 rounded-lg object-cover" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{w.pseudonym}</p>
                      <p className="text-xs opacity-60">
                        {[w.age && `${w.age}`, w.nationality].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {w.tags.slice(0, 3).map(t => (
                        <span key={t.id} className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: accentColor, color: autoTextColor(accentColor) }}>
                          {t.name}
                        </span>
                      ))}
                    </div>
                  </button>
                ) : widget?.widget_layout === 'minimal' ? (
                  /* Minimal layout */
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => selectWorker(w)}
                    className="p-4 rounded-xl border border-current border-opacity-10 hover:border-opacity-30 transition-colors text-left"
                  >
                    <p className="font-medium">{w.pseudonym}</p>
                    <p className="text-xs opacity-60 mt-0.5">
                      {[w.age && `${w.age}`, w.nationality, ...(w.languages?.slice(0, 2) || [])].filter(Boolean).join(' • ')}
                    </p>
                    <div className="flex gap-1 mt-2">
                      {w.tags.slice(0, 4).map(t => (
                        <span key={t.id} className="text-xs opacity-50">{t.name}</span>
                      ))}
                    </div>
                  </button>
                ) : (
                  /* Grid layout (default) */
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => selectWorker(w)}
                    className="rounded-xl overflow-hidden border border-current border-opacity-10 hover:border-opacity-30 transition-colors text-left"
                  >
                    {w.photo_urls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={w.photo_urls[0]} alt="" className="w-full aspect-[3/4] object-cover" />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-current opacity-5" />
                    )}
                    <div className="p-3">
                      <p className="font-medium">{w.pseudonym}</p>
                      <p className="text-xs opacity-60 mt-0.5">
                        {[w.age && `${w.age}`, w.nationality].filter(Boolean).join(' • ')}
                      </p>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {w.tags.slice(0, 3).map(t => (
                          <span key={t.id} className="text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: accentColor, color: autoTextColor(accentColor) }}>
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                )
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
