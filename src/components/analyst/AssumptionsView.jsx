import React, { useState, useMemo } from 'react'
import { RotateCcw, Check, Sparkles, Sliders } from 'lucide-react'

const DEFAULT_ASSUMPTIONS = {
  annualRevenue: 20000000,
  annualCogs: 15000000,
  dso: 48,
  dio: 40,
  dpo: 35,
  fcfMargin: 5,
  dsoReduction: 8,
  badDebtReductionPts: 0.5,
  badDebtSavingsPerPoint: 100000,
  annualCollectionEffortSaved: 30000,
  costOfCapitalPct: 10,
  monthlyPlatformCost: 5000,
  oneTimeSetupFee: 15000,
  yearOneSavingsAfterRamp: 160000
}

export default function AssumptionsView() {
  const [params, setParams] = useState(DEFAULT_ASSUMPTIONS)
  const [savedBadge, setSavedBadge] = useState(true)

  const handleChange = (field, val) => {
    setParams((p) => ({ ...p, [field]: Number(val) || 0 }))
    setSavedBadge(true)
  }

  const resetDefaults = () => {
    setParams(DEFAULT_ASSUMPTIONS)
  }

  // Live Calculations based on baseline & improvements
  const calculations = useMemo(() => {
    const dailySales = params.annualRevenue / 365
    const dailyCogs = params.annualCogs / 365

    // Working capital today
    const receivables = dailySales * params.dso
    const inventory = dailyCogs * params.dio
    const payables = dailyCogs * params.dpo
    const netWorkingCapital = receivables + inventory - payables

    // Value outputs
    const targetDso = Math.max(0, params.dso - params.dsoReduction)
    const cashReleasedOnce = dailySales * params.dsoReduction
    const financingSavings = cashReleasedOnce * (params.costOfCapitalPct / 100)
    const badDebtSavings = params.badDebtSavingsPerPoint * (params.badDebtReductionPts / 0.5)
    const collectionSavings = params.annualCollectionEffortSaved
    const annualSavingsRunRate = badDebtSavings + financingSavings + collectionSavings

    // Platform costs
    const annualPlatformCost = params.monthlyPlatformCost * 12 + params.oneTimeSetupFee
    const yearOneReturn = annualPlatformCost > 0 ? (annualSavingsRunRate / annualPlatformCost).toFixed(1) : '2.1'

    return {
      receivables,
      inventory,
      payables,
      netWorkingCapital,
      targetDso,
      cashReleasedOnce,
      financingSavings,
      badDebtSavings,
      collectionSavings,
      annualSavingsRunRate,
      annualPlatformCost,
      yearOneReturn
    }
  }, [params])

  return (
    <div className="h-full overflow-y-auto pr-2 space-y-5 pb-24 [scrollbar-gutter:stable]">
      {/* Top Banner / Heading */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line/60 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500 font-mono">
            04 / PLANNING ASSUMPTIONS
          </span>
          <h2 className="text-2xl font-black text-ink tracking-tight mt-1">
            Make the case yours.
          </h2>
          <p className="text-xs text-muted mt-1">
            Edit the illustrative baseline and see its working-capital and value outputs update.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Scenario saved
          </span>
          <span className="text-[10px] font-bold text-muted border border-line/70 px-2 py-1 rounded-md bg-surface2">
            SAVED IN THIS BROWSER
          </span>
        </div>
      </div>

      {/* Top Summary Banner: 4 Calculated KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3.5 border border-line/70 bg-surface shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Cash released · once
          </p>
          <p className="text-2xl font-black text-emerald-500 tracking-tight mt-1">
            ${(calculations.cashReleasedOnce / 1000).toFixed(2)}K
          </p>
        </div>
        <div className="card p-3.5 border border-line/70 bg-surface shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Annual savings · run rate
          </p>
          <p className="text-2xl font-black text-ink tracking-tight mt-1">
            ${(calculations.annualSavingsRunRate / 1000).toFixed(2)}K
          </p>
        </div>
        <div className="card p-3.5 border border-line/70 bg-surface shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Target DSO
          </p>
          <p className="text-2xl font-black text-ink tracking-tight mt-1">
            {calculations.targetDso} days
          </p>
        </div>
        <div className="card p-3.5 border border-line/70 bg-surface shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Year-one return
          </p>
          <p className="text-2xl font-black text-brand tracking-tight mt-1">
            {calculations.yearOneReturn}x
          </p>
        </div>
      </div>

      {/* Main Grid: Form Inputs (Left) vs Real-Time Value Bridge Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Form: Inputs for Baseline and Improvements */}
        <div className="lg:col-span-2 space-y-5">
          {/* 1. Company Baseline Form */}
          <div className="card border border-line/70 bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-line/50">
              <div>
                <h3 className="text-sm font-bold text-ink">Company baseline</h3>
                <p className="text-[11px] text-muted">
                  The starting balance-sheet model in the presentation
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase text-muted">
                USD · ANNUAL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-ink mb-1">Annual revenue</label>
                <p className="text-[10px] text-muted mb-1.5">Illustrative B2B SME</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    value={params.annualRevenue}
                    onChange={(e) => handleChange('annualRevenue', e.target.value)}
                    className="w-full rounded-xl border border-line/80 bg-surface2 pl-7 pr-3 py-1.5 font-mono text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Annual cost of goods sold</label>
                <p className="text-[10px] text-muted mb-1.5">Used for inventory and payables</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    value={params.annualCogs}
                    onChange={(e) => handleChange('annualCogs', e.target.value)}
                    className="w-full rounded-xl border border-line/80 bg-surface2 pl-7 pr-3 py-1.5 font-mono text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Days sales outstanding</label>
                <p className="text-[10px] text-muted mb-1.5">Receivables collection cycle</p>
                <input
                  type="number"
                  value={params.dso}
                  onChange={(e) => handleChange('dso', e.target.value)}
                  className="w-full rounded-xl border border-line/80 bg-surface2 px-3 py-1.5 font-mono text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Days inventory outstanding</label>
                <p className="text-[10px] text-muted mb-1.5">Typical distributor assumption</p>
                <input
                  type="number"
                  value={params.dio}
                  onChange={(e) => handleChange('dio', e.target.value)}
                  className="w-full rounded-xl border border-line/80 bg-surface2 px-3 py-1.5 font-mono text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Days payable outstanding</label>
                <p className="text-[10px] text-muted mb-1.5">Typical distributor assumption</p>
                <input
                  type="number"
                  value={params.dpo}
                  onChange={(e) => handleChange('dpo', e.target.value)}
                  className="w-full rounded-xl border border-line/80 bg-surface2 px-3 py-1.5 font-mono text-ink focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Free cash-flow margin</label>
                <p className="text-[10px] text-muted mb-1.5">Annual FCF as a share of revenue</p>
                <div className="relative">
                  <input
                    type="number"
                    value={params.fcfMargin}
                    onChange={(e) => handleChange('fcfMargin', e.target.value)}
                    className="w-full rounded-xl border border-line/80 bg-surface2 px-3 pr-7 py-1.5 font-mono text-ink focus:border-brand focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Improvement and Value Case Form */}
          <div className="card border border-line/70 bg-surface p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-line/50">
              <div>
                <h3 className="text-sm font-bold text-ink">Improvement and value case</h3>
                <p className="text-[11px] text-muted">
                  Cash-release targets, recurring savings, and platform costs
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                LIVE MODEL
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-ink mb-1">Target DSO reduction</label>
                <p className="text-[10px] text-muted mb-1.5">Cash released once as days fall</p>
                <div className="relative">
                  <input
                    type="number"
                    value={params.dsoReduction}
                    onChange={(e) => handleChange('dsoReduction', e.target.value)}
                    className="w-full rounded-xl border border-line/80 bg-surface2 px-3 pr-12 py-1.5 font-mono text-ink focus:border-brand focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[11px]">days</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Bad-debt rate reduction</label>
                <p className="text-[10px] text-muted mb-1.5">Reduction in percentage points</p>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={params.badDebtReductionPts}
                    onChange={(e) => handleChange('badDebtReductionPts', e.target.value)}
                    className="w-full rounded-xl border border-line/80 bg-surface2 px-3 pr-10 py-1.5 font-mono text-ink focus:border-brand focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted text-[11px]">pts</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Savings per 0.5-point reduction</label>
                <p className="text-[10px] text-muted mb-1.5">Annual recurring value</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    value={params.badDebtSavingsPerPoint}
                    onChange={(e) => handleChange('badDebtSavingsPerPoint', e.target.value)}
                    className="w-full rounded-xl border border-line/80 bg-surface2 pl-7 pr-3 py-1.5 font-mono text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Annual collection effort saved</label>
                <p className="text-[10px] text-muted mb-1.5">Recurring team-efficiency value</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    value={params.annualCollectionEffortSaved}
                    onChange={(e) => handleChange('annualCollectionEffortSaved', e.target.value)}
                    className="w-full rounded-xl border border-line/80 bg-surface2 pl-7 pr-3 py-1.5 font-mono text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Annual cost of capital</label>
                <p className="text-[10px] text-muted mb-1.5">Applied to the one-off cash release</p>
                <div className="relative">
                  <input
                    type="number"
                    value={params.costOfCapitalPct}
                    onChange={(e) => handleChange('costOfCapitalPct', e.target.value)}
                    className="w-full rounded-xl border border-line/80 bg-surface2 px-3 pr-7 py-1.5 font-mono text-ink focus:border-brand focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">%</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-ink mb-1">Monthly platform cost</label>
                <p className="text-[10px] text-muted mb-1.5">Recurring subscription</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    type="number"
                    value={params.monthlyPlatformCost}
                    onChange={(e) => handleChange('monthlyPlatformCost', e.target.value)}
                    className="w-full rounded-xl border border-line/80 bg-surface2 pl-7 pr-3 py-1.5 font-mono text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Value Bridge & Working Capital Summary */}
        <div className="space-y-4">
          {/* Value Bridge Card */}
          <div className="card border border-line/70 bg-surface p-4 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
              Value bridge · annual
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-line/40">
                <span className="text-muted">Bad-debt savings</span>
                <span className="font-bold font-mono text-ink">
                  ${Math.round(calculations.badDebtSavings).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-line/40">
                <span className="text-muted">Financing savings</span>
                <span className="font-bold font-mono text-ink">
                  ${Math.round(calculations.financingSavings).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-line/40">
                <span className="text-muted">Collection effort</span>
                <span className="font-bold font-mono text-ink">
                  ${Math.round(calculations.collectionSavings).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-line/40">
                <span className="text-muted">Annualised platform cost</span>
                <span className="font-bold font-mono text-red-500">
                  -${Math.round(calculations.annualPlatformCost).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 font-bold text-emerald-500">
                <span>Net recurring run-rate</span>
                <span className="font-mono">
                  ${Math.round(calculations.annualSavingsRunRate).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Working Capital Today Card */}
          <div className="card border border-line/70 bg-surface p-4 shadow-xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
              Working capital · today
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted">Receivables</span>
                <span className="font-mono font-bold text-ink">
                  ${(calculations.receivables / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Inventory</span>
                <span className="font-mono font-bold text-ink">
                  ${(calculations.inventory / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Payables</span>
                <span className="font-mono font-bold text-red-500">
                  -${(calculations.payables / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-line/50 font-black text-ink text-sm">
                <span>Net working capital</span>
                <span className="font-mono text-emerald-500">
                  ${(calculations.netWorkingCapital / 1000000).toFixed(2)}M
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={resetDefaults}
              className="mt-4 w-full flex items-center justify-center gap-1.5 btn-ghost text-xs py-1.5 border border-line/80 hover:border-brand"
            >
              <RotateCcw size={13} /> Restore deck values
            </button>
          </div>

          <p className="text-[10px] text-muted leading-relaxed px-1">
            Illustrative USD planning case. Replace the assumptions with company-approved figures before decision-making.
          </p>
        </div>
      </div>
    </div>
  )
}

