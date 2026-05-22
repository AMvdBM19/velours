'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';

interface FinanceSummary {
  total_revenue: number;
  total_worker_payout: number;
  total_agency_share: number;
  tax_amount: number;
  tax_rate: number;
  tax_label: string;
  currency: string;
  completed_bookings: number;
  no_show_bookings: number;
}

interface WorkerFinance {
  pseudonym: string;
  btw_exempt: boolean;
  revenue: number;
  payout: number;
  bookings: number;
}

export default function FinancesPage() {
  const { slug } = useParams<{ slug: string }>();
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [byWorker, setByWorker] = useState<WorkerFinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'custom'>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  function getDateRange() {
    const now = new Date();
    let from: string;
    let to: string = now.toISOString().split('T')[0];

    if (dateRange === 'month') {
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    } else if (dateRange === 'quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      from = `${now.getFullYear()}-${String(qMonth + 1).padStart(2, '0')}-01`;
    } else if (dateRange === 'year') {
      from = `${now.getFullYear()}-01-01`;
    } else {
      from = customFrom;
      to = customTo || to;
    }

    return { from, to };
  }

  const loadFinance = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = getDateRange();
      if (!from) { setLoading(false); return; }

      const res = await fetch(`/${slug}/api/agent/finance?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setByWorker(data.by_worker || []);
      }
    } catch {
      // fail
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, dateRange, customFrom, customTo]);

  useEffect(() => { loadFinance(); }, [loadFinance]);

  function exportCSV() {
    const { from, to } = getDateRange();
    window.open(`/${slug}/api/agent/finance?from=${from}&to=${to}&format=csv`, '_blank');
  }

  const currencySymbol = summary?.currency === 'EUR' ? '€' : summary?.currency || '€';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Finances</h1>
        <button
          type="button"
          onClick={exportCSV}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Date range selector */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { key: 'month' as const, label: 'This Month' },
            { key: 'quarter' as const, label: 'Quarter' },
            { key: 'year' as const, label: 'Year' },
            { key: 'custom' as const, label: 'Custom' },
          ]).map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setDateRange(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                dateRange === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading financial data...</p>
      ) : !summary ? (
        <p className="text-sm text-gray-400 text-center py-12">No data available.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Revenue"
              value={`${currencySymbol}${summary.total_revenue.toFixed(2)}`}
              color="emerald"
            />
            <SummaryCard
              label="Agency Share"
              value={`${currencySymbol}${summary.total_agency_share.toFixed(2)}`}
              color="blue"
            />
            <SummaryCard
              label="Worker Payouts"
              value={`${currencySymbol}${summary.total_worker_payout.toFixed(2)}`}
              color="amber"
            />
            <SummaryCard
              label={`${summary.tax_label} (${summary.tax_rate}%)`}
              value={`${currencySymbol}${summary.tax_amount.toFixed(2)}`}
              color="gray"
            />
          </div>

          {/* Booking counts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">Completed Bookings</p>
              <p className="text-2xl font-bold text-gray-900">{summary.completed_bookings}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-1">No-Shows</p>
              <p className="text-2xl font-bold text-gray-900">{summary.no_show_bookings}</p>
            </div>
          </div>

          {/* By-worker breakdown */}
          {byWorker.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-3">By Worker</h2>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Worker</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Bookings</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Revenue</th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Payout</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">BTW</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {byWorker
                      .sort((a, b) => b.revenue - a.revenue)
                      .map(w => (
                      <tr key={w.pseudonym} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{w.pseudonym}</td>
                        <td className="px-4 py-3 text-right text-gray-600">{w.bookings}</td>
                        <td className="px-4 py-3 text-right text-gray-900 font-medium">
                          {currencySymbol}{w.revenue.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-700">
                          {currencySymbol}{w.payout.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {w.btw_exempt && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Exempt</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-900">Total</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {byWorker.reduce((s, w) => s + w.bookings, 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {currencySymbol}{summary.total_revenue.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-amber-700">
                        {currencySymbol}{summary.total_worker_payout.toFixed(2)}
                      </td>
                      <td className="px-4 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color] || colors.gray}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
