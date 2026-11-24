import React, { useState, useMemo } from 'react'
import { Search, CheckCircle2, AlertCircle, ShieldAlert, Clock, ArrowUpRight } from 'lucide-react'

const INITIAL_ACCOUNTS = [
  {
    id: 14,
    code: 'C-014',
    name: 'Apex Distribution Corp',
    exposure: 432000,
    pastDueDays: 46,
    dso: 62,
    risk: 'High',
    nextAction: 'D+45 escalation',
    reviewed: false
  },
  {
    id: 21,
    code: 'C-021',
    name: 'Metro Retail Logistics',
    exposure: 416000,
    pastDueDays: 31,
    dso: 52,
    risk: 'High',
    nextAction: 'Analyst review',
    reviewed: false
  },
  {
    id: 30,
    code: 'C-030',
    name: 'Summit Automotive Supply',
    exposure: 388000,
    pastDueDays: 18,
    dso: 48,
    risk: 'Medium',
    nextAction: 'Promise-to-pay check',
    reviewed: false
  },
  {
    id: 33,
    code: 'C-033',
    name: 'Vanguard Industrial Hub',
    exposure: 352000,
    pastDueDays: 12,
    dso: 46,
    risk: 'Medium',
    nextAction: 'Dunning · D+14',
    reviewed: false
  },
  {
    id: 48,
    code: 'C-048',
    name: 'Pacific Freight Partners',
    exposure: 310000,
    pastDueDays: 4,
    dso: 38,
    risk: 'Low',
    nextAction: 'Automated reminder',
    reviewed: false
  },
  {
    id: 52,
    code: 'C-052',
    name: 'Continental Fleet Lines',
    exposure: 262000,
    pastDueDays: 0,
    dso: 32,
    risk: 'Low',
    nextAction: 'Standard terms active',
    reviewed: false
  }
]

export default function ReceivablesView() {
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS)
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState('All')

  const toggleReview = (id) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, reviewed: !acc.reviewed } : acc))
    )
  }

  const reviewedCount = accounts.filter((a) => a.reviewed).length

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      const matchSearch =
        acc.code.toLowerCase().includes(search.toLowerCase()) ||
        acc.name.toLowerCase().includes(search.toLowerCase()) ||
        String(acc.id).includes(search)
      const matchRisk = filterRisk === 'All' || acc.risk.toLowerCase() === filterRisk.toLowerCase()
      return matchSearch && matchRisk
    })
  }, [accounts, search, filterRisk])

  const riskCounts = useMemo(() => {
    return {
      high: accounts.filter((a) => a.risk === 'High').length,
      medium: accounts.filter((a) => a.risk === 'Medium').length,
      low: accounts.filter((a) => a.risk === 'Low').length
    }
  }, [accounts])

  return (
    <div className="h-full overflow-y-auto pr-2 space-y-5 pb-24 [scrollbar-gutter:stable]">
      {/* Top Banner / Heading */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line/60 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 font-mono">
            02 / RECEIVABLES
          </span>
          <h2 className="text-2xl font-black text-ink tracking-tight mt-1">
            Every account. Every promise.
          </h2>
          <p className="text-xs text-muted mt-1">
            A prioritized view of the sample ledger, with risk bands and the next human checkpoint.
          </p>
        </div>
        <div className="rounded-md border border-line/70 bg-surface2 px-2.5 py-1 text-[11px] font-semibold text-muted shadow-2xs">
          6 SAMPLE ACCOUNTS SHOWN
        </div>
      </div>

      {/* 3 Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4 border border-line/70 bg-surface shadow-xs">
          <p className="text-2xl font-black text-ink">$2.16M</p>
          <p className="text-[11px] text-muted mt-1">sample book · 6 representative accounts</p>
        </div>
        <div className="card p-4 border border-line/70 bg-surface shadow-xs">
          <p className="text-2xl font-black text-emerald-500">
            {reviewedCount} <span className="text-sm font-normal text-muted">/ 6</span>
          </p>
          <p className="text-[11px] text-muted mt-1">accounts reviewed in this session</p>
        </div>
        <div className="card p-4 border border-line/70 bg-surface shadow-xs">
          <p className="text-2xl font-black text-amber-500">8</p>
          <p className="text-[11px] text-muted mt-1">customers downgraded · 5 month pilot</p>
        </div>
      </div>

      {/* Account Action Queue Table Section */}
      <div className="card border border-line/70 bg-surface p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-ink">Account action queue</h3>
            <p className="text-[11px] text-muted">Prioritized collections, dunning, and review status</p>
          </div>
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted">
            SAMPLE VALUES · USD
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px] max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find customer ID or name..."
              className="w-full rounded-xl border border-line/80 bg-surface2 pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {[
              { id: 'All', label: `All ${accounts.length}` },
              { id: 'High', label: `High ${riskCounts.high}` },
              { id: 'Medium', label: `Medium ${riskCounts.medium}` },
              { id: 'Low', label: `Low ${riskCounts.low}` }
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterRisk(f.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  filterRisk.toLowerCase() === f.id.toLowerCase()
                    ? 'bg-ink text-surface font-bold shadow-xs'
                    : 'bg-surface2 text-muted hover:text-ink border border-line/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-line/60">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line/60 bg-surface2 text-[10px] font-bold uppercase tracking-wider text-muted">
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Exposure</th>
                <th className="py-2.5 px-3">Past Due</th>
                <th className="py-2.5 px-3">DSO</th>
                <th className="py-2.5 px-3">Risk Band</th>
                <th className="py-2.5 px-3">Next Action</th>
                <th className="py-2.5 px-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40 text-ink">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-muted">
                    No accounts matching "{search}"
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    className={`hover:bg-surface2/60 transition-colors ${
                      acc.reviewed ? 'bg-emerald-500/5' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface2 border border-line/60 text-[10px] font-bold text-muted">
                          {acc.id}
                        </span>
                        <div>
                          <p className="font-extrabold text-ink">{acc.code}</p>
                          <p className="text-[11px] text-muted truncate max-w-[150px]">{acc.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold font-mono">
                      ${acc.exposure.toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span className={acc.pastDueDays > 30 ? 'text-red-500 font-semibold' : ''}>
                        {acc.pastDueDays} days
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono">{acc.dso} days</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          acc.risk === 'High'
                            ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                            : acc.risk === 'Medium'
                            ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}
                      >
                        {acc.risk}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-muted">{acc.nextAction}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleReview(acc.id)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                          acc.reviewed
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                            : 'btn-ghost border border-line/80 hover:border-brand hover:text-brand'
                        }`}
                      >
                        {acc.reviewed ? '✓ Reviewed' : 'Mark reviewed'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

