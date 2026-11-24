import React from 'react'
import {
  Inbox,
  Clock,
  ArrowDownRight,
  CircleDollarSign,
  ArrowUpRight,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react'
import workingCapitalData from '../../data/workingCapitalAnalystData.json'

export default function CommandCenterView({ onNavigateTab }) {
  // Read dynamically from the dummy JSON: workingCapitalAnalystData.json
  const rawKpis = workingCapitalData.kpis || []
  const cashChart = workingCapitalData.charts?.find((c) => c.id === 'chart_operating_cash')
  const riskChart = workingCapitalData.charts?.find((c) => c.id === 'chart_customer_risk_bands')

  const getKpiDisplay = (id, fallback) => {
    const item = rawKpis.find((k) => k.id === id)
    return item?.display || fallback
  }

  const kpis = [
    {
      id: 'receivables_outstanding',
      label: 'Receivables outstanding',
      value: getKpiDisplay('receivables_outstanding', '$2.63M'),
      sub: '48 DSO · modelled from annual sales',
      icon: Inbox,
      highlight: false
    },
    {
      id: 'days_sales_outstanding',
      label: 'Days sales outstanding',
      value: getKpiDisplay('days_sales_outstanding', '48 days'),
      sub: '40 days at the selected target',
      icon: Clock,
      highlight: false
    },
    {
      id: 'cash_release',
      label: 'One-off cash release',
      value: getKpiDisplay('one_off_cash_release', '$438.36K'),
      sub: '8 days of DSO improvement',
      icon: ArrowDownRight,
      highlight: true
    },
    {
      id: 'annual_savings',
      label: 'Annual savings · run rate',
      value: getKpiDisplay('annual_savings_run_rate', '$173.84K'),
      sub: 'Bad debt, financing, and collection effort',
      icon: CircleDollarSign,
      highlight: false
    }
  ]

  // Dynamic Bar Chart from JSON (chart_operating_cash)
  const chartData = cashChart?.data || []
  const maxVal = Math.max(...chartData.map((d) => d.barValue || 0), 3000000)
  const bars = chartData.length > 0
    ? chartData.map((d) => ({
        name: d.label,
        value: d.barLabel ? d.barLabel.replace('Actual: ', '') : `$${((d.barValue || 0) / 1000000).toFixed(2)}M`,
        heightPct: Math.round(((d.barValue || 0) / maxVal) * 90),
        color:
          d.label === 'Receivables'
            ? 'bg-emerald-600'
            : d.label === 'Inventory'
            ? 'bg-violet-600'
            : d.label === 'Payables'
            ? 'bg-amber-600'
            : 'bg-slate-900 dark:bg-slate-100'
      }))
    : [
        { name: 'Receivables', value: '$2.63M', heightPct: 82, color: 'bg-emerald-600' },
        { name: 'Inventory', value: '$1.64M', heightPct: 54, color: 'bg-violet-600' },
        { name: 'Payables', value: '$1.44M', heightPct: 48, color: 'bg-amber-600' },
        { name: 'Net WC', value: '$2.84M', heightPct: 92, color: 'bg-slate-900 dark:bg-slate-100' }
      ]

  // Dynamic Customer Risk Bands from JSON (chart_customer_risk_bands)
  const riskData = riskChart?.data || []
  const riskBands = riskData.length > 0
    ? riskData.map((r) => ({
        label: r.label,
        count: r.value,
        width: r.label.toLowerCase().includes('low')
          ? '65%'
          : r.label.toLowerCase().includes('medium')
          ? '88%'
          : '60%',
        color: r.label.toLowerCase().includes('low')
          ? 'bg-emerald-600'
          : r.label.toLowerCase().includes('medium')
          ? 'bg-amber-500'
          : 'bg-rose-500'
      }))
    : [
        { label: 'Low risk', count: 16, width: '65%', color: 'bg-emerald-600' },
        { label: 'Medium risk', count: 24, width: '88%', color: 'bg-amber-500' },
        { label: 'High risk', count: 15, width: '60%', color: 'bg-rose-500' }
      ]

  const pilotSignals = [
    { label: 'Over-limit orders blocked', value: getKpiDisplay('over_limit_orders_blocked', '$328K'), alert: true },
    { label: 'Invoices reconciled', value: getKpiDisplay('invoices_reconciled', '1,501'), alert: false },
    { label: 'Dunning actions · escalated', value: '110 · 52', alert: false },
    { label: 'Expected credit loss flagged', value: getKpiDisplay('expected_credit_loss', '$35K'), alert: false }
  ]

  return (
    <div className="h-full overflow-y-auto pr-2 space-y-4 pb-24 [scrollbar-gutter:stable]">
      {/* 1. Header Banner */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line/60 pb-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
            01 / PORTFOLIO OVERVIEW
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight mt-0.5">
            Cash, in the right place.
          </h2>
          <p className="text-xs sm:text-sm text-muted mt-1">
            A live view of receivables, exposure, and the cash your team can put back to work.
          </p>
        </div>

        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted font-mono flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> ILLUSTRATIVE BOOK · NOV 2026
          </span>
        </div>
      </div>

      {/* 2. Top Row of 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.id}
              className="card p-4 border border-line/70 bg-surface shadow-xs flex flex-col justify-between hover:border-brand/40 transition"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-muted truncate">
                  {kpi.label}
                </span>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-line/60 bg-surface2 text-muted">
                  <Icon size={14} />
                </span>
              </div>
              <div>
                <p
                  className={`text-2xl font-black tracking-tight ${
                    kpi.highlight ? 'text-emerald-600 dark:text-emerald-400' : 'text-ink'
                  }`}
                >
                  {kpi.value}
                </p>
                <p className="mt-1 text-[11px] text-muted truncate">{kpi.sub}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* 3. Middle Section: 2 Columns (Bar Chart + Customer Risk Bands) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left: Where Operating Cash Sits (7 cols) */}
        <div className="lg:col-span-7 card p-5 border border-line/70 bg-surface shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 border-b border-line/50 pb-2 mb-4">
            <h3 className="text-sm font-bold text-ink">Where operating cash sits</h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
              USD · MODELLED BOOK
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="py-2">
            <div className="grid grid-cols-4 gap-3 sm:gap-6 items-end h-52 pt-6 pb-2 border-b border-line/60">
              {bars.map((bar, idx) => (
                <div key={idx} className="flex flex-col items-center h-full justify-end group">
                  <span className="text-xs font-mono font-bold text-ink mb-1.5 transition-transform group-hover:-translate-y-0.5">
                    {bar.value}
                  </span>
                  <div className="w-full max-w-[48px] bg-surface2 rounded-t-md overflow-hidden flex items-end h-36">
                    <div
                      className={`w-full ${bar.color} rounded-t-md transition-all duration-500`}
                      style={{ height: `${bar.heightPct}%` }}
                    />
                  </div>
                  <span className="mt-2 text-[11px] font-semibold text-muted text-center truncate w-full">
                    {bar.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
              <ArrowRight size={13} className="text-ink shrink-0" />
              <span>
                Net working capital tied up:{' '}
                <strong className="text-ink font-mono font-bold">$2.84M</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Customer Risk Bands (5 cols) */}
        <div className="lg:col-span-5 card p-5 border border-line/70 bg-surface shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 border-b border-line/50 pb-2 mb-4">
            <h3 className="text-sm font-bold text-ink">Customer risk bands</h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
              55 CUSTOMER SAMPLE
            </span>
          </div>

          {/* Progress Bars */}
          <div className="space-y-4 my-auto py-2">
            {riskBands.map((band, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-24 text-xs font-medium text-muted shrink-0">
                  {band.label}
                </span>
                <div className="flex-1 h-2.5 bg-surface2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${band.color} rounded-full transition-all duration-500`}
                    style={{ width: band.width }}
                  />
                </div>
                <span className="w-6 text-right text-xs font-mono font-bold text-ink shrink-0">
                  {band.count}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-line/50 flex items-center justify-between text-xs text-muted">
            <span>Re-scored on payment behaviour</span>
            <span className="font-semibold text-ink">8 downgraded</span>
          </div>
        </div>
      </div>

      {/* 4. Lower Section: Recurring Value Bridge + Pilot Signals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left: Recurring value bridge (7 cols) */}
        <div className="lg:col-span-7 card p-5 border border-line/70 bg-surface shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 border-b border-line/50 pb-2 mb-3">
            <h3 className="text-sm font-bold text-ink">Recurring value bridge</h3>
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('assumptions')}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              Edit assumptions <ArrowUpRight size={12} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 py-3">
            <div>
              <p className="text-[11px] text-muted">Bad debt reduction</p>
              <p className="text-xl font-black text-ink font-mono mt-1">$100K</p>
              <p className="text-[10px] text-muted mt-0.5">per year · 0.5 pts</p>
            </div>
            <div>
              <p className="text-[11px] text-muted">Financing avoided</p>
              <p className="text-xl font-black text-ink font-mono mt-1">$43.84K</p>
              <p className="text-[10px] text-muted mt-0.5">per year · on released cash</p>
            </div>
            <div>
              <p className="text-[11px] text-muted">Collection effort</p>
              <p className="text-xl font-black text-ink font-mono mt-1">$30K</p>
              <p className="text-[10px] text-muted mt-0.5">per year · recurring</p>
            </div>
          </div>
        </div>

        {/* Right: Pilot Signals (5 cols) */}
        <div className="lg:col-span-5 card p-5 border border-line/70 bg-surface shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 border-b border-line/50 pb-2 mb-2">
            <h3 className="text-sm font-bold text-ink">Pilot signals</h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted">
              SYNTHETIC OUTPUT
            </span>
          </div>

          <div className="space-y-2 py-1">
            {pilotSignals.map((sig, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs py-1 border-b border-line/30 last:border-0"
              >
                <span className="text-muted">{sig.label}</span>
                <span
                  className={`font-mono font-bold ${
                    sig.alert ? 'text-rose-600 dark:text-rose-400' : 'text-ink'
                  }`}
                >
                  {sig.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5. Full-width Card: Command the receivables queue */}
      <div className="card p-5 border border-line/70 bg-surface shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-line/50 pb-2 mb-3">
          <h3 className="text-sm font-bold text-ink">Command the receivables queue</h3>
          <button
            type="button"
            onClick={() => onNavigateTab && onNavigateTab('receivables')}
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            Open receivables <ArrowUpRight size={12} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <p className="text-2xl font-black text-ink font-mono">$2.16M</p>
            <p className="text-xs text-muted mt-1">sample receivables book</p>
          </div>
          <div>
            <p className="text-2xl font-black text-ink font-mono">55</p>
            <p className="text-xs text-muted mt-1">customer accounts · 5 months</p>
          </div>
          <div>
            <p className="text-2xl font-black text-ink font-mono">4 weeks</p>
            <p className="text-xs text-muted mt-1">baseline to value read-out</p>
          </div>
        </div>
      </div>
    </div>
  )
}

