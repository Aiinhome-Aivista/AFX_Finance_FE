import { useEffect, useState, useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, History, Lock, X } from 'lucide-react'
import Layout from '../components/common/Layout'
import Stepper from '../components/common/Stepper'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { EmptyState, ErrorState, Loading } from '../components/common/States'
import OntologyGraphCanvas from '../components/graph/OntologyGraphCanvas'
import NodeDetailsPanel from '../components/graph/NodeDetailsPanel'
import useAsync from '../components/common/useAsync'
import { domains, graphs } from '../api'
import { DOMMETA, SLUG_TO_DOM } from '../lib/ontologyData'
import { timeAgo } from '../lib/format'
import { useToast } from '../context/ToastContext'
import { useWorkflow } from '../context/WorkflowContext'

const Stat = ({ label, v, tone }) => <div className="rounded-xl bg-surface2 p-3 text-center"><div className={`text-xl font-semibold ${tone || ''}`}>{v}</div><div className="text-[11px] text-muted">{label}</div></div>

function getModelTemplateBaselineInfo(nodeName, changes = {}) {
  const nameLower = (nodeName || '').toLowerCase()
  if (changes.name?.from) {
    return `Original entity named “${changes.name.from}” (standard industry reference)`
  }
  if (nameLower.includes('costingallocation')) {
    return 'Technique choice (standard · marginal vs ABC · TD-ABC) and absorption FOAR mechanics'
  }
  if (nameLower.includes('costtoserve')) {
    return 'End-to-end supply-chain customer model across distribution types (Warehoused, Cross-Dock, Direct-Store-Delivery DSD) capturing baseline fulfillment rules, freight handling, and route-to-market channels.'
  }
  if (nameLower.includes('organization')) {
    return 'Legal entity — business unit — function — cost/profit/investment center — role. Responsibility-center taxonomy (cost / profit / investment / standard-cost / discretionary-expense / revenue) types each node for control purposes; DOA and SOD hang off it.'
  }
  if (nameLower.includes('budget')) {
    return 'Standard baseline budgeting calendar, cadence and variance review workflows'
  }
  if (nameLower.includes('driver')) {
    return 'Default operational volume and rate planning drivers'
  }
  if (nameLower.includes('compensation')) {
    return 'Baseline corporate targets and financial planning benchmarks'
  }
  if (nameLower.includes('scenario')) {
    return 'Standard baseline scenario parameters (Base / Upside / Downside)'
  }
  return 'Standard industry baseline entity structure & reference rules'
}

function getBusinessInsight(nodeName, attrsAdded = [], renamedFrom = '') {
  const nameLower = (nodeName || '').toLowerCase()
  const attrs = attrsAdded.join(' ').toLowerCase()

  // Costing & Allocation
  if (nameLower.includes('costingallocation') || (nameLower.includes('cost') && nameLower.includes('allocation'))) {
    return {
      tag: 'Activity-Based Costing & Allocation',
      badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
      impact: 'Defines multi-tiered cost distribution rules across shared services and production cost centers for precise unit economics.',
    }
  }
  // Cost to Serve
  if (nameLower.includes('costtoserve') || (nameLower.includes('cost') && nameLower.includes('serve')) || attrs.includes('warehouseactivitydrivers')) {
    return {
      tag: 'Customer & Channel Cost-to-Serve',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
      impact: 'Captures end-to-end logistics, order fulfillment and warehouse activity drivers to uncover true customer & channel profitability.',
    }
  }
  // Organization / Chart of Accounts / Entities
  if (nameLower.includes('organization') || nameLower.includes('costcenter') || attrs.includes('profitcenter') || attrs.includes('costcenter')) {
    return {
      tag: 'Legal Entity & Profit Center Hierarchy',
      badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
      impact: 'Structures multi-entity cost, profit, and revenue center hierarchies for consolidated group statutory and management reporting.',
    }
  }
  // Budget & Variance
  if (attrs.includes('zbb') || nameLower.includes('budget') || attrs.includes('variancethreshold')) {
    return {
      tag: 'Cost Control & Variance Governance',
      badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30',
      impact: 'Enforces Zero-Based Budgeting (ZBB) thresholds. Prevents cost leakage and uncontrolled budget overspending across business units & operating entities.',
    }
  }
  // Gross to Net & Revenue
  if (attrs.includes('discount') || attrs.includes('rebate') || nameLower.includes('driver')) {
    return {
      tag: 'Gross-to-Net Revenue Protection',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
      impact: 'Captures off-invoice rebates & promotional trade discounts. Eliminates margin discrepancies between Gross Sales and Net Revenue.',
    }
  }
  // Compensation & Incentive
  if (attrs.includes('bonus') || attrs.includes('compensation') || nameLower.includes('compensation') || (renamedFrom && renamedFrom.toLowerCase().includes('benchmark'))) {
    return {
      tag: 'Executive Incentive Alignment',
      badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30',
      impact: 'Directly anchors managerial bonus eligibility to net profit margin and cost efficiency, eliminating misaligned payouts.',
    }
  }
  // Scenario Planning
  if (nameLower.includes('scenario') || nameLower.includes('planningversion')) {
    return {
      tag: 'Dynamic Scenario Planning',
      badgeClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30',
      impact: 'Integrates real-time ZBB sensitivity simulations against volatile market conditions and raw material price spikes.',
    }
  }
  return {
    tag: 'Enterprise Operating Rule',
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30',
    impact: `Configured customized business parameters and operating constraints for ${nodeName}.`,
  }
}

function DiffLists({ d, domainName = 'Finance', slug = '' }) {
  const none = !Object.entries(d.counts).some(([k, v]) => /added|removed|modified/.test(k) && v)
  if (none) return <p className="mt-2 text-sm text-muted">No differences.</p>

  // Interactive guidance state stored locally for user validation
  const [userDecisions, setUserDecisions] = useState({})

  const handleDecision = (key, decision) => {
    setUserDecisions((prev) => ({ ...prev, [key]: decision }))
  }

  // Derive guidance triggers based on Scenario A & Scenario B
  const guidanceItems = useMemo(() => {
    const list = []

    // Scenario A: Entity exists in Model, missing in Current
    if (d.nodes_removed && d.nodes_removed.length > 0) {
      d.nodes_removed.forEach((n) => {
        list.push({
          type: 'SCENARIO_A',
          key: n.key || n.name,
          entityName: n.name,
          title: `Missing Entity: “${n.name}”`,
          severity: 'warning',
          message: `In the standard ${domainName} reference architecture, “${n.name}” provides fundamental internal controls and reconciliation integrity. Excluding this entity could create audit gaps or unmonitored operational liabilities.`,
          prompt: `Are you certain your enterprise operates without this control?`,
          actionConfirm: 'Confirm Exclusion',
          actionAlternative: 'Keep & Restore Entity',
        })
      })
    }

    // Scenario B: Entity is new in Current, not in Model
    if (d.nodes_added && d.nodes_added.length > 0) {
      d.nodes_added.forEach((n) => {
        list.push({
          type: 'SCENARIO_B',
          key: n.key || n.name,
          entityName: n.name,
          title: `New Enterprise Nuance: “${n.name}”`,
          severity: 'insight',
          message: `Identified client-specific entity “${n.name}”. In ${domainName}, this captures operational variances, ad-hoc workflows, or specialized billing flows outside the baseline template.`,
          prompt: `Does this accurately capture your intended business purpose for this entity?`,
          actionConfirm: 'Validate Reasoning',
          actionAlternative: 'Refine Context',
        })
      })
    }

    // If no additions/removals, synthesize guidance on all modified entities
    if (list.length === 0 && d.nodes_modified && d.nodes_modified.length > 0) {
      d.nodes_modified.forEach((n) => {
        const addedAttrs = n.attributes_added || []
        const isOrg = (n.name || '').toLowerCase().includes('organization')
        let msg = ''
        if (isOrg && addedAttrs.length > 0) {
          msg = `Expanded “${n.name}” hierarchy with specialized center types: [${addedAttrs.join(', ')}]. This enables automated multi-tier profitability rollups across cost, profit, and investment centers.`
        } else if (addedAttrs.length > 0) {
          msg = `Enriched “${n.name}” with [${addedAttrs.join(', ')}]. This aligns operational telemetry directly with your enterprise cost and profitability framework.`
        } else {
          msg = `Updated business definition & execution ladder for “${n.name}” to reflect direct/indirect cost allocation rules.`
        }

        list.push({
          type: 'SCENARIO_B',
          key: n.key,
          entityName: n.name,
          title: `Calibrated Entity: “${n.name}”`,
          severity: 'insight',
          message: msg,
          prompt: `Does this calibration reflect your operating structure?`,
          actionConfirm: 'Confirm Calibration',
          actionAlternative: 'Adjust Parameters',
        })
      })
    }

    return list
  }, [d, domainName])

  return (
    <div className="mt-4 space-y-6">
      {/* Top Notification if empty */}
      {d.nodes_added.length === 0 && d.nodes_removed.length === 0 && d.nodes_modified.length === 0 && (
        <p className="text-sm text-muted">No differences detected between baseline and current models.</p>
      )}

      {/* Main Pair-Matched Layout: Each Entity Card directly connected to its Guidance Card */}
      <div className="space-y-4">
        {/* 1. Added Entities with Arrow Linking */}
        {d.nodes_added.map((n) => {
          const guidance = guidanceItems.find((g) => g.key === (n.key || n.name))
          const decision = guidance ? userDecisions[guidance.key] : null

          return (
            <div key={n.key} className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-3">
              {/* Left Card: Entity Detail */}
              <div className="rounded-xl border border-line bg-surface2/40 p-3.5 text-xs space-y-1.5 shadow-2xs h-full flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: n.color }} />
                    <b className="text-ink text-sm">{n.name}</b>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    New in Current Model
                  </span>
                </div>
                <div className="rounded-lg bg-surface/80 border border-line/60 p-2.5 space-y-1 text-[11px]">
                  <div className="flex items-center gap-1 text-muted">
                    <span className="font-bold text-slate-500 min-w-[100px]">Model Template:</span>
                    <span className="italic">Not present in standard baseline</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#10b981]">
                    <span className="font-bold text-ink min-w-[100px]">Current Model:</span>
                    <span>Introduced via client nuances & telemetry analysis</span>
                  </div>
                </div>
              </div>

              {/* Connecting Arrow */}
              <div className="hidden lg:flex flex-col items-center justify-center text-muted px-1">
                <span className="text-[10px] uppercase font-bold text-brand tracking-widest mb-0.5">Advice</span>
                <div className="flex items-center text-brand">
                  <div className="w-6 h-[2px] bg-brand/40" />
                  <ArrowRight size={16} className="-ml-1 text-brand" />
                </div>
              </div>

              {/* Right Card: AgentForgeX Suggestions */}
              {guidance ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/15 dark:bg-emerald-950/20 p-3.5 text-xs space-y-2 shadow-2xs h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 text-[11px]">
                        <span>AgentForgeX Suggestions</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-ink/90 leading-relaxed mb-2">
                      {guidance.message}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-line/60">
                    <p className="text-[11px] font-semibold text-ink mb-1.5">{guidance.prompt}</p>
                    {decision ? (
                      decision === 'confirmed' ? (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-[11px] font-medium flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                          <span>✓ {guidance.actionConfirm} Recorded</span>
                          <button type="button" onClick={() => handleDecision(guidance.key, null)} className="text-[10px] text-muted hover:text-ink underline cursor-pointer">Edit</button>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <b>↺ {guidance.actionAlternative} Requested</b>
                            <button type="button" onClick={() => handleDecision(guidance.key, null)} className="text-[10px] text-muted hover:text-ink underline cursor-pointer">Edit</button>
                          </div>
                          <Link to={`/finance/${slug}`} className="inline-block text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline">
                            Open Chatbot to restore entity →
                          </Link>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleDecision(guidance.key, 'confirmed')} className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white font-bold text-[11px] transition shadow-xs cursor-pointer text-center">
                          {guidance.actionConfirm}
                        </button>
                        <button type="button" onClick={() => handleDecision(guidance.key, 'alternative')} className="py-1.5 px-2.5 rounded-lg border border-line hover:bg-surface2 text-muted hover:text-ink font-semibold text-[11px] transition cursor-pointer">
                          {guidance.actionAlternative}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : <div />}
            </div>
          )
        })}

        {/* 2. Removed Entities with Arrow Linking */}
        {d.nodes_removed.map((n) => {
          const guidance = guidanceItems.find((g) => g.key === (n.key || n.name))
          const decision = guidance ? userDecisions[guidance.key] : null

          return (
            <div key={n.key} className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-3">
              {/* Left Card: Entity Detail */}
              <div className="rounded-xl border border-bad/30 bg-bad/5 p-3.5 text-xs space-y-1.5 shadow-2xs h-full flex flex-col justify-between">
                <div className="flex items-center justify-between gap-1.5">
                  <b className="text-bad text-sm">{n.name}</b>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-bad/10 text-bad border border-bad/30">
                    Missing in Current Model
                  </span>
                </div>
                <div className="rounded-lg bg-surface/80 border border-line/60 p-2.5 space-y-1 text-[11px]">
                  <div className="flex items-center gap-1 text-muted">
                    <span className="font-bold text-slate-500 min-w-[100px]">Model Template:</span>
                    <span>Standard core entity was defined</span>
                  </div>
                  <div className="flex items-center gap-1 text-bad">
                    <span className="font-bold text-bad min-w-[100px]">Current Model:</span>
                    <span>Excluded / removed in current custom model (Review compliance)</span>
                  </div>
                </div>
              </div>

              {/* Connecting Arrow */}
              <div className="hidden lg:flex flex-col items-center justify-center text-muted px-1">
                <span className="text-[10px] uppercase font-bold text-bad tracking-widest mb-0.5">Alert</span>
                <div className="flex items-center text-bad">
                  <div className="w-6 h-[2px] bg-bad/40" />
                  <ArrowRight size={16} className="-ml-1 text-bad" />
                </div>
              </div>

              {/* Right Card: AgentForgeX Suggestions */}
              {guidance ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-50/15 dark:bg-amber-950/20 p-3.5 text-xs space-y-2 shadow-2xs h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 text-[11px]">
                        <span>AgentForgeX Suggestions</span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        Scenario A (Omission Risk)
                      </span>
                    </div>
                    <p className="text-[11px] text-ink/90 leading-relaxed mb-2">
                      {guidance.message}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-line/60">
                    <p className="text-[11px] font-semibold text-ink mb-1.5">{guidance.prompt}</p>
                    {decision ? (
                      decision === 'confirmed' ? (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-[11px] font-medium flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                          <span>✓ {guidance.actionConfirm} Recorded</span>
                          <button type="button" onClick={() => handleDecision(guidance.key, null)} className="text-[10px] text-muted hover:text-ink underline cursor-pointer">Edit</button>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <b>↺ {guidance.actionAlternative} Requested</b>
                            <button type="button" onClick={() => handleDecision(guidance.key, null)} className="text-[10px] text-muted hover:text-ink underline cursor-pointer">Edit</button>
                          </div>
                          <Link to={`/finance/${slug}`} className="inline-block text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:underline">
                            Open Chatbot to restore entity →
                          </Link>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleDecision(guidance.key, 'confirmed')} className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition shadow-xs cursor-pointer text-center">
                          {guidance.actionConfirm}
                        </button>
                        <button type="button" onClick={() => handleDecision(guidance.key, 'alternative')} className="py-1.5 px-2.5 rounded-lg border border-line hover:bg-surface2 text-muted hover:text-ink font-semibold text-[11px] transition cursor-pointer">
                          {guidance.actionAlternative}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : <div />}
            </div>
          )
        })}

        {/* 3. Modified Entities with Arrow Linking */}
        {d.nodes_modified.map((n) => {
          const insight = getBusinessInsight(n.name, n.attributes_added, n.changes.name?.from)
          const guidance = guidanceItems.find((g) => g.key === n.key || g.entityName === n.name)
          const decision = guidance ? userDecisions[guidance.key] : null

          return (
            <div key={n.key} className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-stretch gap-3">
              {/* Left Card: Modified Entity Detail */}
              <div className="rounded-xl border border-line bg-surface2/40 p-4 text-xs space-y-2.5 transition hover:border-[#10b981]/40 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                    <b className="text-sm font-bold text-ink">{n.name}</b>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${insight.badgeClass}`}>
                      {insight.tag}
                    </span>
                  </div>

                  <div className="rounded-lg bg-surface/80 border border-line/60 p-2.5 space-y-1.5 text-[11px]">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-slate-500 shrink-0 min-w-[100px]">Model Template:</span>
                      <div className="text-muted flex-1 leading-relaxed">
                        {n.changes?.definition?.from ? n.changes.definition.from : getModelTemplateBaselineInfo(n.name, n.changes)}
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-[#10b981] shrink-0 min-w-[100px]">Current Model:</span>
                      <div className="flex-1 space-y-1.5 leading-relaxed">
                        {n.changes.name && (
                          <div className="text-ink font-semibold">
                            Renamed to <span className="text-[#10b981]">“{n.name}”</span>
                          </div>
                        )}
                        {/* 1. CostingAllocationModel */}
                        {(n.name || '').toLowerCase().includes('costingallocation') && (
                          <div className="text-ink text-[11px] leading-relaxed">
                            {n.changes?.definition?.to || 'The formal costing machinery beneath profitability: technique choice (standard · marginal vs absorption · ABC · TD-ABC · job/batch/process), the cost build-up ladder Direct Costs → Indirect Costs → Overhead Costs → Final Cost Allocation, and absorption mechanics (FOAR = budgeted overhead ÷ budgeted normal activity; over/under-recovery).'}
                            <div className="font-mono text-[#10b981] mt-1">
                              <span className="font-bold">+ Added:</span> costBuildUpLadder[Direct Costs → Indirect Costs → Overhead Costs → Final Cost Allocation]
                            </div>
                          </div>
                        )}
                        {/* 2. CostToServe Model */}
                        {(n.name || '').toLowerCase().includes('costtoserve') && (
                          <div className="text-ink text-[11px] leading-relaxed">
                            End-to-end supply-chain customer model across distribution types (Warehoused, Cross-Dock, Direct-Store-Delivery DSD). Fully calibrated with granular warehouse handling activity drivers, storage volume economics, picking/packing operational throughput, and shipment frequency cost-to-serve matrices.
                          </div>
                        )}
                        {/* 3. OrganizationNode */}
                        {(n.name || '').toLowerCase().includes('organization') && (
                          <div className="text-ink text-[11px] leading-relaxed">
                            Legal entity — business unit — function — cost/profit/investment center — role. Responsibility-center taxonomy (cost / profit / investment / standard-cost / discretionary-expense / revenue) types each node for control purposes; DOA and SOD hang off it. Now includes cost centers, profit centers, revenue centers, and investment centers.
                          </div>
                        )}
                        {/* 4. Other custom modified definitions */}
                        {!(n.name || '').toLowerCase().includes('costingallocation') && !(n.name || '').toLowerCase().includes('costtoserve') && !(n.name || '').toLowerCase().includes('organization') && n.changes?.definition?.to && (
                          <div className="text-ink text-[11px] leading-relaxed">
                            {n.changes.definition.to}
                          </div>
                        )}
                        {n.attributes_added.length > 0 && (
                          <div className="font-mono text-[#10b981]">
                            <span className="font-bold">+ Added:</span> {n.attributes_added.join(', ')}
                          </div>
                        )}
                        {n.attributes_removed.length > 0 && (
                          <div className="font-mono text-bad">
                            <span className="font-bold">− Missing:</span> {n.attributes_removed.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-line/60 flex items-start gap-1.5 text-[11px] text-muted">
                  <span className="font-semibold text-ink shrink-0">Business Impact:</span>
                  <span className="leading-relaxed">{insight.impact}</span>
                </div>
              </div>

              {/* Connecting Arrow with Label */}
              <div className="hidden lg:flex flex-col items-center justify-center text-muted px-1 select-none">
                <span className="text-[9px] uppercase font-bold text-[#10b981] tracking-wider mb-0.5">Suggestions</span>
                <div className="flex items-center text-[#10b981]">
                  <div className="w-5 h-[2px] bg-[#10b981]/50" />
                  <ArrowRight size={15} className="-ml-1 text-[#10b981]" />
                </div>
              </div>

              {/* Right Card: AgentForgeX Suggestions directly paired */}
              {guidance ? (
                <div className="rounded-xl border border-emerald-500/30 bg-surface/90 p-4 text-xs space-y-2.5 shadow-2xs flex flex-col justify-between transition hover:border-[#10b981]/50">
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-ink text-xs">
                        <span>AgentForgeX Suggestions</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-ink/90 leading-relaxed mb-2 bg-surface2/40 p-2.5 rounded-lg border border-line/50">
                      {guidance.message}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-line/60">
                    <p className="text-[11px] font-semibold text-ink mb-2">
                      {guidance.prompt}
                    </p>

                    {decision ? (
                      decision === 'confirmed' ? (
                        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-[11px] font-medium flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-[#10b981]" />
                            <b>✓ Calibration Confirmed:</b> Structure validated and mapped to domain digital twin.
                          </span>
                          <button type="button" onClick={() => handleDecision(guidance.key, null)} className="text-[10px] text-muted hover:text-ink underline cursor-pointer ml-2">Edit</button>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5 text-[11px] font-medium text-amber-800 dark:text-amber-300 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold flex items-center gap-1">
                              <span>↺ Parameter Adjustment Requested</span>
                            </span>
                            <button type="button" onClick={() => handleDecision(guidance.key, null)} className="text-[10px] text-muted hover:text-ink underline cursor-pointer">Reset</button>
                          </div>
                          <p className="text-[10px] text-muted leading-relaxed">
                            Marked for fine-tuning. You can prompt the chatbot to re-weight this entity's formulas or adjust allocation drivers.
                          </p>
                          <Link
                            to={`/finance/${slug}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline"
                          >
                            <span>Refine in Chatbot →</span>
                          </Link>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecision(guidance.key, 'confirmed')}
                          className="flex-1 py-1.5 px-3 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white font-bold text-[11px] transition shadow-xs cursor-pointer text-center"
                        >
                          {guidance.actionConfirm}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecision(guidance.key, 'alternative')}
                          className="py-1.5 px-3 rounded-lg border border-line hover:bg-surface2 text-muted hover:text-ink font-semibold text-[11px] transition cursor-pointer"
                        >
                          {guidance.actionAlternative}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-line bg-surface2/20 p-4 text-xs text-muted flex items-center justify-center">
                  <span>No special advisory required for this entity.</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Relationships section at bottom */}
      {d.edges_added.length > 0 && (
        <div className="pt-3 border-t border-line">
          <h4 className="h-section mb-2 text-xs font-bold uppercase tracking-wider text-muted">Relationships added</h4>
          <ul className="space-y-1.5 text-xs">
            {d.edges_added.map((e, i) => (
              <li key={i} className="rounded-lg border border-line bg-surface2/30 p-2 font-mono text-[11px]">
                <span className="text-ink font-semibold">{e.source}</span>
                <span className="text-[#10b981] font-bold mx-1.5">——[{e.label}]——►</span>
                <span className="text-ink font-semibold">{e.target}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function Finalize() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const wf = useAsync(() => domains.workflow(slug), [slug])
  const fin = useAsync(() => graphs.finalization(slug), [slug], { immediate: false })

  const cleanSlug = (slug || '').replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
  const domainKey = SLUG_TO_DOM[cleanSlug]
  const domainMeta = domainKey ? DOMMETA[domainKey] : null
  const domainName =
    wf.data?.domain?.name ||
    (domainMeta?.n ? domainMeta.n.replace(/^F\d+\s+/, '') : null) ||
    cleanSlug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  const [range, setRange] = useState({ from: 0, to: null })
  const [cmp, setCmp] = useState(null)
  const [dlg, setDlg] = useState(null)
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const { updateDomainWorkflow } = useWorkflow()

  useEffect(() => {
    if (slug) {
      updateDomainWorkflow(slug, {
        isKG1Ready: true,
        hasFiles: true,
        isFinalized: Boolean(wf.data?.finalized_version_number),
      })
    }
  }, [slug, wf.data?.finalized_version_number, updateDomainWorkflow])

  useEffect(() => { if (wf.data?.steps?.[3]?.status === 'completed') fin.reload().catch(() => { }) }, [wf.data]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (fin.data && range.to === null) setRange({ from: 0, to: fin.data.version.number }) }, [fin.data]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (range.to !== null) graphs.compare(slug, range.from, range.to).then(setCmp, (e) => toast.error(e.message)) }, [range, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const finalized = !!wf.data?.finalized_version_number
  const d = fin.data

  // Synthesize nodes & edges with missing/discrepancy indicators to match Telemetry Gap Analysis
  const graphDataWithGaps = useMemo(() => {
    const rawNodes = d?.graph?.nodes || []
    const rawEdges = d?.graph?.edges || []
    if (rawNodes.length === 0) return { nodes: rawNodes, edges: rawEdges }

    const nodes = rawNodes.map((n) => {
      const name = n.name || n.n || n.id || ''
      const isMissingTarget =
        name.includes('TrueMargin') ||
        name.includes('StandardCosting') ||
        Boolean(cmp?.nodes_removed && Array.isArray(cmp.nodes_removed) && cmp.nodes_removed.some((rem) => rem.name === name || rem.key === n.id))

      if (isMissingTarget) {
        return {
          ...n,
          gap_status: 'missing',
          is_discrepancy: true,
          color: '#ef4444',
          gap_color: '#ef4444',
        }
      }
      return n
    })

    return {
      nodes,
      edges: rawEdges,
    }
  }, [d?.graph?.nodes, d?.graph?.edges, cmp?.nodes_removed])

  const selectedGraphNode = useMemo(() => {
    if (!selectedNode || !d?.graph?.nodes) return null
    return (
      d.graph.nodes.find((n) => n.id === selectedNode || n.key === selectedNode || n.name === selectedNode) ||
      graphDataWithGaps.nodes.find((n) => n.id === selectedNode || n.key === selectedNode || n.name === selectedNode) ||
      null
    )
  }, [selectedNode, d?.graph?.nodes, graphDataWithGaps.nodes])

  if (wf.data && !wf.data.started) return <Navigate to={`/finance/${slug}`} replace />
  if (wf.loading && !wf.data) return <Layout wide><Loading /></Layout>
  if (wf.error) return <Layout wide><ErrorState error={wf.error} onRetry={wf.reload} /></Layout>
  const hasKg1 = wf.data.steps[3].status === 'completed'

  const doFinalize = async () => {
    setBusy(true)
    try {
      await graphs.finalize(slug, { confirm: true, acknowledge_warnings: ack })
      toast.success('Digital Twin finalised & governed! Enterprise workflow complete.')
      setDlg(null)
      await Promise.all([wf.reload(), fin.reload()])
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const doReopen = async () => {
    setBusy(true)
    try {
      await graphs.reopen(slug)
      toast.success('Ontology unlocked! Your uploaded files are safely preserved.')
      setDlg(null)
      updateDomainWorkflow(slug, {
        isFinalized: false,
        isGapMode: false,
        viewMode: 'chat',
      })
      await Promise.all([wf.reload(), fin.reload()])
      navigate(`/finance/${slug}`)
    } catch (e) {
      toast.error(e.message)
      setDlg(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout wide>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div>
          <Link to={`/finance/${slug}`} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink font-semibold mb-1">
            <ArrowLeft size={14} /> Back to Knowledge Graph & Chatbot
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-ink flex items-center gap-2">
            <span>Enterprise Review & Validation Finalization</span>
            {finalized && (
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-bold border border-emerald-300/40">
                Governed
              </span>
            )}
          </h1>
        </div>
      </div>

      {!hasKg1 && (
        <div className="card mt-3">
          <EmptyState title="Nothing to finalise yet" hint="Answer the chatbot's questions and approve at least one set of changes to generate your digital twin model.">
            <Link className="btn-primary mt-2" to={`/finance/${slug}`}>Go to the chatbot</Link>
          </EmptyState>
        </div>
      )}

      {hasKg1 && fin.loading && !d && <Loading />}
      {fin.error && <ErrorState error={fin.error} onRetry={fin.reload} />}

      {d && (
        <div className="mt-2 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-stretch">
            {/* Left Column: Pixel-Perfect Ontology Graph Canvas (Same Celestial Radial Style) */}
            <section className="card overflow-hidden p-0 border border-line isolate flex flex-col">
              <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 select-none shrink-0">
                <div>
                  <h2 className="text-sm font-bold text-ink flex items-center gap-2">
                    <span>Current "{domainName}" Template</span>
                  </h2>
                  <p className="text-[11px] text-muted">
                    {d.graph.nodes.length} entities · {d.graph.edges.length} relationships
                  </p>
                </div>
              </div>

              <div className="h-[460px] min-h-[420px] w-full relative overflow-hidden bg-surface">
                <OntologyGraphCanvas
                  nodes={graphDataWithGaps.nodes}
                  edges={graphDataWithGaps.edges}
                  domainMeta={wf.data?.domain}
                  selectedNodeId={selectedNode}
                  onSelectNode={setSelectedNode}
                  className="w-full h-full"
                />
              </div>
            </section>

            {/* Right Column: Review & Validation & Actions (or Node Properties when clicked) */}
            <section className="card p-5 border border-line flex flex-col justify-between shadow-card">
              {selectedGraphNode ? (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between pb-2.5 border-b border-line mb-3">
                    <h2 className="text-sm font-bold text-ink">Entity Properties</h2>
                    <button
                      type="button"
                      onClick={() => setSelectedNode(null)}
                      className="px-2 py-1 rounded-lg text-xs font-semibold text-muted hover:text-ink hover:bg-surface2/80 flex items-center gap-1 border border-line transition-colors cursor-pointer"
                    >
                      <X size={12} />
                      <span>Back to Review</span>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-3 text-xs scroll-thin">
                    <div className="p-3 rounded-xl bg-surface2/40 border border-line space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-muted">Entity Name</span>
                        {selectedGraphNode.gap_status === 'missing' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-600 border border-red-500/30">
                            MISSING
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-ink">
                        {selectedGraphNode.name || selectedGraphNode.n || selectedGraphNode.id}
                      </h3>
                      {selectedGraphNode.description && (
                        <p className="text-[11px] text-muted leading-relaxed">
                          {selectedGraphNode.description}
                        </p>
                      )}
                    </div>

                    {selectedGraphNode.attributes && selectedGraphNode.attributes.length > 0 && (
                      <div className="p-3 rounded-xl bg-surface2/30 border border-line space-y-2">
                        <span className="text-[10px] uppercase font-bold text-muted">Attributes</span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedGraphNode.attributes.map((attr, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-surface border border-line/70 font-mono text-[10.5px] text-ink"
                            >
                              {typeof attr === 'string' ? attr : attr?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedGraphNode.formulas && selectedGraphNode.formulas.length > 0 && (
                      <div className="p-3 rounded-xl bg-surface2/30 border border-line space-y-2">
                        <span className="text-[10px] uppercase font-bold text-muted">Execution Formulas & Rules</span>
                        <div className="space-y-1">
                          {selectedGraphNode.formulas.map((f, idx) => (
                            <div key={idx} className="p-2 rounded-lg bg-surface font-mono text-[10.5px] text-[#10b981] border border-line/70">
                              {typeof f === 'string' ? f : f?.name || f?.formula}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Domain Context & Relationships */}
                    <div className="p-3 rounded-xl bg-surface2/30 border border-line space-y-2">
                      <span className="text-[10px] uppercase font-bold text-muted">Domain Context & Relationships</span>
                      <div className="text-[11px] text-muted space-y-1">
                        <div>
                          <span>Domain: </span>
                          <b className="text-ink">Finance ({domainName})</b>
                        </div>
                        <div>
                          <span>Architecture Role: </span>
                          <b className="text-[#10b981]">Governed Digital Twin Component</b>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-line">
                    <h2 className="text-sm font-bold text-ink">Review & Validation</h2>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${finalized
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300'
                      : 'bg-[#10b981]/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                      }`}>
                      {finalized ? 'Governed Digital Twin' : 'Ready to Finalize'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="rounded-xl border border-line bg-surface2/50 p-3 text-xs">
                      <div className="flex items-center justify-between text-muted mb-1">
                        <span className="font-semibold text-ink">Validation Check</span>
                        <span className="font-semibold text-ok flex items-center gap-1">
                          <CheckCircle2 size={13} />
                          <span>Zero Errors</span>
                        </span>
                      </div>
                      {d.validation.errors.length === 0 && d.validation.warnings.length === 0 ? (
                        <p className="text-[11px] text-muted leading-relaxed">
                          Ontology verified against Finance domain schema and business rules. Ready for enterprise governance.
                        </p>
                      ) : (
                        <p className="text-[11px] text-warn">{d.validation.warnings.length} warning(s) detected.</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-xl border border-line bg-surface2/30 p-2">
                        <div className="text-base font-bold text-ink">{d.graph.nodes.length}</div>
                        <div className="text-[10px] text-muted uppercase font-semibold">Entities</div>
                      </div>
                      <div className="rounded-xl border border-line bg-surface2/30 p-2">
                        <div className="text-base font-bold text-ink">{d.graph.edges.length}</div>
                        <div className="text-[10px] text-muted uppercase font-semibold">Relationships</div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-line bg-surface2/30 p-2.5 text-xs space-y-1 text-muted">
                      <div className="flex justify-between items-center gap-2">
                        <span className="shrink-0">Ontology Version:</span>
                        <b className="text-ink text-right">{domainName}</b>
                      </div>
                      <div className="flex justify-between">
                        <span>Domain:</span>
                        <b className="text-ink">Finance</b>
                      </div>
                      <div className="flex justify-between">
                        <span>Status:</span>
                        <b className={finalized ? 'text-ok' : 'text-brand'}>{finalized ? 'Governed' : 'Draft / Candidate'}</b>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-line">
                {finalized ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/30 p-3 text-xs">
                      <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                        <Lock size={14} />
                        <span>Governed Enterprise Digital Twin</span>
                      </div>
                      <p className="text-[11px] text-emerald-900/80 dark:text-emerald-400/90 mt-1">
                        This model is locked and governed. It represents your active financial operating architecture.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/finance/${slug}/twin`} className="btn bg-[#10b981] hover:bg-[#059669] text-white font-bold flex-1 text-xs py-2 rounded-xl text-center shadow-sm">
                        Explore Digital Twin →
                      </Link>
                      <button className="btn-ghost text-xs cursor-pointer py-2.5 px-4 rounded-xl flex items-center justify-center" onClick={() => setDlg('reopen')}>
                        Re-open
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn bg-[#10b981] hover:bg-[#059669] text-white font-bold w-full text-xs py-2.5 rounded-xl shadow-sm cursor-pointer"
                    onClick={() => { setAck(false); setDlg('finalize') }}
                  >
                    <span>Finalise as Digital Twin</span>
                  </button>
                )}
              </div>
            </section>
          </div>

          {/* Version Comparison Section */}
          <section className="card p-4 border border-line mt-6 mb-8">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-sm text-ink">Compare Versions</h2>
              <span className="inline-flex items-center rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-2xs">
                Model "{domainName}" Template
              </span>
              <span className="text-xs font-semibold text-muted px-0.5">vs</span>
              <span className="inline-flex items-center rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-2xs">
                Current "{domainName}" Template
              </span>
            </div>
            {cmp ? (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  <Stat label="entities added" v={cmp.counts.nodes_added} tone="text-ok" />
                  <Stat label="entities modified" v={cmp.counts.nodes_modified} tone="text-warn" />
                  <Stat label="entities removed" v={cmp.counts.nodes_removed} tone="text-bad" />
                  <Stat label="links added" v={cmp.counts.edges_added} tone="text-ok" />
                  <Stat label="links relabelled" v={cmp.counts.edges_modified} />
                  <Stat label="links removed" v={cmp.counts.edges_removed} tone="text-bad" />
                </div>
                <DiffLists d={cmp} domainName={domainName} slug={slug} />
              </>
            ) : <Loading className="!p-4" />}
          </section>

          {/* Change History Section */}
          <section className="card p-4 border border-line">
            <h2 className="flex items-center gap-2 font-semibold text-sm text-ink">
              <History size={16} /> Change History
            </h2>
            {d.history.length === 0 && <p className="mt-2 text-xs text-muted">No proposals yet.</p>}
            <ul className="mt-3 space-y-3">
              {d.history.map((p) => (
                <li key={p.id} className="rounded-xl border border-line bg-surface2/30 p-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-ink">{p.title}</b>
                    <span className={`badge text-[10px] font-semibold ${p.status === 'approved' ? 'bg-ok/15 text-ok' : p.status === 'pending' ? 'bg-warn/15 text-warn' : 'bg-surface2 text-muted'}`}>
                      {p.status}{p.result_version ? ` → KG${p.result_version}` : ''}
                    </span>
                    <span className="text-[11px] text-muted">{p.source} · {timeAgo(p.created_at)}</span>
                  </div>
                  <ul className="mt-2 space-y-0.5 text-[11px] text-muted">
                    {p.items.map((i, k) => (
                      <li key={k} className={i.status === 'rejected' ? 'line-through' : ''}>
                        {i.status === 'approved' ? '✓' : i.status === 'rejected' ? '✗' : '•'} {i.description}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={dlg === 'finalize'}
        title="Finalise Enterprise Digital Twin?"
        confirmLabel="Finalise as Digital Twin"
        busy={busy}
        onCancel={() => setDlg(null)}
        onConfirm={doFinalize}
      >
        <p className="text-xs leading-relaxed text-ink">
          This locks <strong>Current "{domainName}" Template</strong> as your official Enterprise Digital Twin. All discovered entities, business rules, and dimensions will be permanently governed for financial modeling.
        </p>
        {d?.validation.warnings.length > 0 && (
          <label className="mt-3 flex items-start gap-2 text-xs text-ink">
            <input type="checkbox" className="mt-0.5 accent-[#10b981]" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>I have reviewed the {d.validation.warnings.length} warning(s) and want to finalise anyway.</span>
          </label>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={dlg === 'reopen'}
        title="Re-open Ontology for Editing?"
        confirmLabel="Confirm Re-open"
        busy={busy}
        onCancel={() => setDlg(null)}
        onConfirm={doReopen}
      >
        <p className="text-xs text-ink leading-relaxed">
          Re-opening unlocks this ontology for chatbot customization. Your uploaded business telemetry files will be safely preserved so you can re-run gap analysis after refining your model.
        </p>
      </ConfirmDialog>
    </Layout>
  )
}
