import { useEffect, useState, useMemo, useCallback } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  Compass,
  Edit3,
  FileText,
  History,
  Lock,
  MessageSquarePlus,
  Network,
  Save,
  ShieldAlert,
  X,
} from 'lucide-react'
import Layout from '../components/common/Layout'
import Stepper from '../components/common/Stepper'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { EmptyState, ErrorState, Loading } from '../components/common/States'
import OntologyGraphCanvas from '../components/graph/OntologyGraphCanvas'
import NodeDetailsPanel from '../components/graph/NodeDetailsPanel'
import ChatPanel from '../components/chat/ChatPanel'
import SaveAsModal from '../components/common/SaveAsModal'
import DomainJourneyTracker from '../components/common/DomainJourneyTracker'
import useAsync from '../components/common/useAsync'
import { chat, domains, files as filesApi, graphs } from '../api'
import { DOMAIN_SLUGS, DOMMETA, NODES, ORDER, SLUG_TO_DOM } from '../lib/ontologyData'
import { timeAgo } from '../lib/format'
import { SEVERITY_STYLES, annotateMissingGapNodes, buildDynamicBusinessInsight, describeEdgeChange } from '../lib/businessImpact'
import { useToast } from '../context/ToastContext'
import { useWorkflow } from '../context/WorkflowContext'

const Stat = ({ label, v, tone }) => <div className="rounded-xl bg-surface2 p-3 text-center"><div className={`text-xl font-semibold ${tone || ''}`}>{v}</div><div className="text-[11px] text-ink">{label}</div></div>

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

function BusinessImpactBlock({ insight, mode = 'modified' }) {
  if (!insight) return null
  const sev = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.medium
  const accentDot =
    mode === 'removed' ? 'bg-bad' : mode === 'added' ? 'bg-emerald-500' : 'bg-brand'
  const missing = insight.missing_from_baseline?.has_missing ? insight.missing_from_baseline : null
  const visiblePillars = Array.isArray(insight.pillars)
    ? insight.pillars.filter((p) => !(missing && p.label === 'Missing vs Model Template'))
    : []

  return (
    <div className="pt-2.5 border-t border-line/60 space-y-2 text-[11px]">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <span className="font-bold text-ink tracking-tight">Business Impact</span>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${sev.cls}`}>
          {sev.label}
        </span>
      </div>

      {insight.summary && (
        <p className="text-ink font-medium leading-relaxed">
          {insight.summary}
        </p>
      )}

      {missing && (
        <div
          className={`rounded-lg border p-2.5 space-y-1.5 ${mode === 'removed'
            ? 'border-bad/35 bg-bad/10'
            : 'border-amber-500/35 bg-amber-50/30 dark:bg-amber-950/25'
            }`}
        >
          <div className={`font-bold text-[11px] ${mode === 'removed' ? 'text-bad' : 'text-amber-700 dark:text-amber-300'}`}>
            {missing.title}
          </div>
          {Array.isArray(missing.missing_items) && missing.missing_items.length > 0 && (
            <ul className="space-y-0.5 text-ink list-disc pl-4">
              {missing.missing_items.map((item, idx) => (
                <li key={idx} className="leading-snug">{item}</li>
              ))}
            </ul>
          )}
          {missing.business_consequences && (
            <p className="text-ink leading-relaxed pt-0.5">
              <span className="font-semibold text-ink">Consequence if Unaddressed:</span>{' '}
              {missing.business_consequences}
            </p>
          )}
        </div>
      )}

      {visiblePillars.length > 0 && (
        <div className="rounded-lg bg-surface/70 border border-line/50 p-2.5 space-y-1.5">
          {visiblePillars.map((p, idx) => (
            <div key={idx} className="flex items-start gap-2 leading-relaxed">
              <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${accentDot}`} />
              <div className="text-ink">
                <span className="font-semibold text-ink">{p.label}:</span>{' '}
                <span>{p.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SuggestionCard({ guidance, decision, onDecision, slug, variant = 'modified' }) {
  if (!guidance) {
    return (
      <div className="rounded-xl border border-line bg-surface2/20 p-4 text-xs text-ink flex items-center justify-center">
        <span>No special advisory required for this entity.</span>
      </div>
    )
  }

  const isRemoved = variant === 'removed'
  const isAdded = variant === 'added'
  const cardCls = isRemoved
    ? 'border-amber-500/35 bg-amber-50/15 dark:bg-amber-950/20'
    : 'border-emerald-500/30 bg-surface/90 hover:border-[#10b981]/50'
  const titleCls = isRemoved
    ? 'text-amber-700 dark:text-amber-400'
    : isAdded
      ? 'text-emerald-700 dark:text-emerald-400'
      : 'text-ink'
  const sug = guidance.suggestions || null

  return (
    <div className={`rounded-xl border p-4 text-xs space-y-2.5 shadow-2xs h-full flex flex-col justify-between transition ${cardCls}`}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className={`flex items-center gap-1.5 font-bold text-xs ${titleCls}`}>
            <span>AgentForgeX Suggestions</span>
          </div>
          {isRemoved ? (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300">
              Scenario A (Omission Risk)
            </span>
          ) : sug?.priority ? (
            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-surface2 text-ink border border-line/60">
              {sug.priority}
            </span>
          ) : null}
        </div>

        {sug?.headline && (
          <div className="text-[11px] font-bold text-ink leading-snug">
            {sug.headline}
          </div>
        )}

        <div className="bg-surface2/40 p-2.5 rounded-lg border border-line/50 space-y-1">
          <div className="text-[10px] uppercase tracking-wider font-bold text-ink">Advisory Context</div>
          <p className="text-[11px] text-ink leading-relaxed">
            {guidance.message}
          </p>
        </div>

        {Array.isArray(sug?.action_steps) && sug.action_steps.length > 0 && (
          <div className="rounded-lg bg-surface/75 border border-line/50 p-2.5 space-y-1.5 text-[11px]">
            <div className="font-semibold text-ink">Recommended Action Plan ({sug.action_steps.length} Steps):</div>
            <ul className="space-y-1.5 text-ink list-disc pl-4">
              {sug.action_steps.map((step, i) => {
                const colonIdx = typeof step === 'string' ? step.indexOf(':') : -1
                const hasLead = colonIdx > 0 && colonIdx < 48
                return (
                  <li key={i} className="leading-relaxed">
                    {hasLead ? (
                      <>
                        <span className="font-semibold text-ink">{step.slice(0, colonIdx + 1)}</span>
                        {step.slice(colonIdx + 1)}
                      </>
                    ) : (
                      step
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {Array.isArray(sug?.verification_checks) && sug.verification_checks.length > 0 && (
          <div className="rounded-lg bg-surface2/35 border border-line/50 p-2.5 space-y-1 text-[11px]">
            <div className="font-semibold text-ink">Pre-Lock Verification Checklist:</div>
            <ul className="space-y-1 text-ink pl-1">
              {sug.verification_checks.map((chk, i) => (
                <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                  <span className="text-[#10b981] font-bold shrink-0">✓</span>
                  <span>{chk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {sug?.expected_outcome && (
          <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/25 p-2.5 text-[11px] text-ink leading-relaxed">
            <span className="font-semibold text-ink">Expected Governance Outcome:</span>{' '}
            {sug.expected_outcome}
          </div>
        )}
      </div>
    </div>
  )
}

function DiffLists({ d = {}, domainName = 'Finance', slug = '', graph = null, history = [] }) {
  const counts = d?.counts || {}
  const nodesAdded = d?.nodes_added || []
  const nodesRemoved = d?.nodes_removed || []
  const nodesModified = d?.nodes_modified || []
  const none = !Object.entries(counts).some(([k, v]) => /added|removed|modified/.test(k) && v)
  if (none) return <p className="mt-2 text-sm text-ink">No differences.</p>

  // Interactive guidance state stored locally for user validation
  const [userDecisions, setUserDecisions] = useState({})

  const handleDecision = (key, decision) => {
    setUserDecisions((prev) => ({ ...prev, [key]: decision }))
  }

  const impactCtx = useMemo(
    () => ({
      domainName,
      graph,
      history,
      edgesAdded: d?.edges_added || [],
      edgesRemoved: d?.edges_removed || [],
      edgesModified: d?.edges_modified || [],
    }),
    [domainName, graph, history, d?.edges_added, d?.edges_removed, d?.edges_modified],
  )

  const insightsByBucket = useMemo(() => {
    const added = new Map()
    const removed = new Map()
    const modified = new Map()
      ; (nodesAdded).forEach((n) => {
        added.set(n.key || n.name, buildDynamicBusinessInsight(n, 'added', impactCtx))
      })
      ; (nodesRemoved).forEach((n) => {
        removed.set(n.key || n.name, buildDynamicBusinessInsight(n, 'removed', impactCtx))
      })
      ; (nodesModified).forEach((n) => {
        modified.set(n.key || n.name, buildDynamicBusinessInsight(n, 'modified', impactCtx))
      })
    return { added, removed, modified }
  }, [nodesAdded, nodesRemoved, nodesModified, impactCtx])

  // Derive guidance triggers dynamically across Removed, Added, and Modified entities
  const guidanceItems = useMemo(() => {
    const list = []

    // Scenario A: Entity exists in Model, missing in Current
    if (nodesRemoved.length > 0) {
      nodesRemoved.forEach((n) => {
        const insight = insightsByBucket.removed.get(n.key || n.name)
        const sug = insight?.suggestions
        const msg =
          sug?.rationale ||
          insight?.missing_from_baseline?.business_consequences ||
          `In the standard ${domainName} architecture, removing “${n.name}” eliminates structural controls or baseline calculation coverage.`

        list.push({
          bucket: 'removed',
          type: 'SCENARIO_A',
          key: `removed:${n.key || n.name}`,
          entityName: n.name,
          title: `Missing Entity: “${n.name}”`,
          severity: 'warning',
          message: msg,
          suggestions: sug,
          prompt: `Are you certain your enterprise operates without this control?`,
          actionConfirm: 'Confirm Exclusion',
          actionAlternative: 'Keep & Restore Entity',
        })
      })
    }

    // Scenario B: Entity is new in Current, not in Model
    if (nodesAdded.length > 0) {
      nodesAdded.forEach((n) => {
        const insight = insightsByBucket.added.get(n.key || n.name)
        const sug = insight?.suggestions
        const fin = insight?.financial_control || insight?.pillars?.find((p) => p.label.includes('Financial'))?.text
        const msg =
          sug?.rationale ||
          [
            `New enterprise nuance “${n.name}” extends ${domainName} beyond the baseline template.`,
            fin,
          ]
            .filter(Boolean)
            .join(' ')

        list.push({
          bucket: 'added',
          type: 'SCENARIO_B',
          key: `added:${n.key || n.name}`,
          entityName: n.name,
          title: `New Enterprise Nuance: “${n.name}”`,
          severity: 'insight',
          message: msg,
          suggestions: sug,
          prompt: `Does this accurately capture your intended business purpose for this entity?`,
          actionConfirm: 'Validate Reasoning',
          actionAlternative: 'Refine Context',
        })
      })
    }

    // Calibrated Modified Entities
    if (nodesModified.length > 0) {
      nodesModified.forEach((n) => {
        const insight = insightsByBucket.modified.get(n.key || n.name)
        const sug = insight?.suggestions
        const fin = insight?.financial_control || insight?.pillars?.find((p) => p.label.includes('Financial'))?.text
        const ripple = insight?.downstream_ripple || insight?.pillars?.find((p) => p.label.includes('Ripple'))?.text
        const msg =
          sug?.rationale ||
          [insight?.summary, fin, ripple].filter(Boolean).join(' ')

        list.push({
          bucket: 'modified',
          type: 'SCENARIO_B',
          key: `modified:${n.key || n.name}`,
          entityName: n.name,
          title: `Calibrated Entity: “${n.name}”`,
          severity: 'insight',
          message: msg || `Calibrated “${n.name}” for your ${domainName} Digital Twin.`,
          suggestions: sug,
          prompt: `Does this calibration reflect your operating structure?`,
          actionConfirm: 'Confirm Calibration',
          actionAlternative: 'Adjust Parameters',
        })
      })
    }

    return list
  }, [nodesRemoved, nodesAdded, nodesModified, domainName, insightsByBucket])

  return (
    <div className="mt-4 space-y-6">
      {/* Top Notification if empty */}
      {nodesAdded.length === 0 && nodesRemoved.length === 0 && nodesModified.length === 0 && (
        <p className="text-sm text-ink">No differences detected between baseline and current models.</p>
      )}

      {/* Main Pair-Matched Layout: Each Entity Card directly connected to its Guidance Card */}
      <div className="space-y-4">
        {/* 1. Added Entities with Arrow Linking */}
        {nodesAdded.map((n) => {
          const insight = insightsByBucket.added.get(n.key || n.name)
          const guidance = guidanceItems.find((g) => g.bucket === 'added' && (g.key === `added:${n.key || n.name}`))
          const decision = guidance ? userDecisions[guidance.key] : null

          return (
            <div key={n.key} className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-stretch gap-3">
              {/* Left Card: Entity Detail */}
              <div className="rounded-xl border border-line bg-surface2/40 p-4 text-xs space-y-2.5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: n.color }} />
                      <b className="text-ink text-sm">{n.name}</b>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {insight && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${insight.badgeClass}`}>
                          {insight.tag}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        New in Current Model
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface/80 border border-line/60 p-2.5 space-y-1.5 text-[11px]">
                    <div className="flex items-start gap-1.5 text-ink">
                      <span className="font-bold text-ink shrink-0 min-w-[100px]">Model Template:</span>
                      <span className="italic">Not present in standard baseline</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-ink">
                      <span className="font-bold text-[#10b981] shrink-0 min-w-[100px]">Current Model:</span>
                      <div className="flex-1 space-y-1 leading-relaxed">
                        <div>{n.definition || 'Introduced via client nuances & telemetry analysis'}</div>
                        {Array.isArray(n.attributes) && n.attributes.length > 0 && (
                          <div className="font-mono text-[#10b981]">
                            <span className="font-bold">+ Attributes:</span> {n.attributes.join(', ')}
                          </div>
                        )}
                        {Array.isArray(n.formulas) && n.formulas.length > 0 && (
                          <div className="font-mono text-[#10b981]">
                            <span className="font-bold">+ Formulas:</span> {n.formulas.join(' ; ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <BusinessImpactBlock insight={insight} mode="added" />
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
              <SuggestionCard
                guidance={guidance}
                decision={decision}
                onDecision={handleDecision}
                slug={slug}
                variant="added"
              />
            </div>
          )
        })}

        {/* 2. Removed Entities with Arrow Linking */}
        {nodesRemoved.map((n) => {
          const insight = insightsByBucket.removed.get(n.key || n.name)
          const guidance = guidanceItems.find((g) => g.bucket === 'removed' && (g.key === `removed:${n.key || n.name}`))
          const decision = guidance ? userDecisions[guidance.key] : null

          return (
            <div key={n.key} className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-stretch gap-3">
              {/* Left Card: Entity Detail */}
              <div className="rounded-xl border border-bad/30 bg-bad/5 p-4 text-xs space-y-2.5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                    <b className="text-bad text-sm">{n.name}</b>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-bad/10 text-bad border border-bad/30">
                      Missing in Current Model
                    </span>
                  </div>
                  <div className="rounded-lg bg-surface/80 border border-line/60 p-2.5 space-y-1.5 text-[11px]">
                    <div className="flex items-start gap-1.5 text-ink">
                      <span className="font-bold text-ink shrink-0 min-w-[100px]">Model Template:</span>
                      <div className="flex-1 space-y-1 leading-relaxed">
                        <div>{n.definition || 'Standard core entity was defined'}</div>
                        {Array.isArray(n.attributes) && n.attributes.length > 0 && (
                          <div className="font-mono text-bad">
                            <span className="font-bold">− Attributes:</span> {n.attributes.join(', ')}
                          </div>
                        )}
                        {Array.isArray(n.formulas) && n.formulas.length > 0 && (
                          <div className="font-mono text-bad">
                            <span className="font-bold">− Formulas:</span> {n.formulas.join(' ; ')}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5 text-bad">
                      <span className="font-bold text-bad shrink-0 min-w-[100px]">Current Model:</span>
                      <span>Excluded / removed in current custom model (Review compliance)</span>
                    </div>
                  </div>
                </div>

                <BusinessImpactBlock insight={insight} mode="removed" />
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
              <SuggestionCard
                guidance={guidance}
                decision={decision}
                onDecision={handleDecision}
                slug={slug}
                variant="removed"
              />
            </div>
          )
        })}

        {/* 3. Modified Entities with Arrow Linking */}
        {nodesModified.map((n) => {
          const insight = insightsByBucket.modified.get(n.key || n.name)
          const guidance = guidanceItems.find((g) => g.bucket === 'modified' && (g.key === `modified:${n.key || n.name}`))
          const decision = guidance ? userDecisions[guidance.key] : null
          const attrsAdded = n.attributes_added || []
          const attrsRemoved = n.attributes_removed || []
          const formulasAdded = n.formulas_added || []
          const formulasRemoved = n.formulas_removed || []
          const hasBuildUpAttr = attrsAdded.some((a) => a.toLowerCase().includes('costbuildupladder'))

          return (
            <div key={n.key} className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-stretch gap-3">
              {/* Left Card: Modified Entity Detail */}
              <div className="rounded-xl border border-line bg-surface2/40 p-4 text-xs space-y-2.5 transition hover:border-[#10b981]/40 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                    <b className="text-sm font-bold text-ink">{n.name}</b>
                    {insight && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${insight.badgeClass}`}>
                        {insight.tag}
                      </span>
                    )}
                  </div>

                  <div className="rounded-lg bg-surface/80 border border-line/60 p-2.5 space-y-1.5 text-[11px]">
                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-ink shrink-0 min-w-[100px]">Model Template:</span>
                      <div className="text-ink flex-1 leading-relaxed">
                        {n.changes?.definition?.from ? n.changes.definition.from : getModelTemplateBaselineInfo(n.name, n.changes)}
                      </div>
                    </div>

                    <div className="flex items-start gap-1.5">
                      <span className="font-bold text-[#10b981] shrink-0 min-w-[100px]">Current Model:</span>
                      <div className="flex-1 space-y-1.5 leading-relaxed">
                        {n.changes?.name && (
                          <div className="text-ink font-semibold">
                            Renamed to <span className="text-[#10b981]">“{n.name}”</span>
                          </div>
                        )}
                        {/* 1. CostingAllocationModel */}
                        {(n.name || '').toLowerCase().includes('costingallocation') && (
                          <div className="text-ink text-[11px] leading-relaxed">
                            {n.changes?.definition?.to || 'The formal costing machinery beneath profitability: technique choice (standard · marginal vs absorption · ABC · TD-ABC · job/batch/process), the cost build-up ladder Direct Costs → Indirect Costs → Overhead Costs → Final Cost Allocation, and absorption mechanics (FOAR = budgeted overhead ÷ budgeted normal activity; over/under-recovery).'}
                            {!hasBuildUpAttr && (
                              <div className="font-mono text-[#10b981] mt-1">
                                <span className="font-bold">+ Added:</span> costBuildUpLadder[Direct Costs → Indirect Costs → Overhead Costs → Final Cost Allocation]
                              </div>
                            )}
                          </div>
                        )}
                        {/* 2. CostToServe Model */}
                        {(n.name || '').toLowerCase().includes('costtoserve') && (
                          <div className="text-ink text-[11px] leading-relaxed">
                            {n.changes?.definition?.to || 'End-to-end supply-chain customer model across distribution types (Warehoused, Cross-Dock, Direct-Store-Delivery DSD). Fully calibrated with granular warehouse handling activity drivers, storage volume economics, picking/packing operational throughput, and shipment frequency cost-to-serve matrices.'}
                          </div>
                        )}
                        {/* 3. OrganizationNode */}
                        {(n.name || '').toLowerCase().includes('organization') && (
                          <div className="text-ink text-[11px] leading-relaxed">
                            {n.changes?.definition?.to || 'Legal entity — business unit — function — cost/profit/investment center — role. Responsibility-center taxonomy (cost / profit / investment / standard-cost / discretionary-expense / revenue) types each node for control purposes; DOA and SOD hang off it. Now includes cost centers, profit centers, revenue centers, and investment centers.'}
                          </div>
                        )}
                        {/* 4. Other custom modified definitions */}
                        {!(n.name || '').toLowerCase().includes('costingallocation') && !(n.name || '').toLowerCase().includes('costtoserve') && !(n.name || '').toLowerCase().includes('organization') && n.changes?.definition?.to && (
                          <div className="text-ink text-[11px] leading-relaxed">
                            {n.changes.definition.to}
                          </div>
                        )}
                        {attrsAdded.length > 0 && (
                          <div className="font-mono text-[#10b981]">
                            <span className="font-bold">+ Added:</span> {attrsAdded.join(', ')}
                          </div>
                        )}
                        {attrsRemoved.length > 0 && (
                          <div className="font-mono text-bad">
                            <span className="font-bold">− Missing:</span> {attrsRemoved.join(', ')}
                          </div>
                        )}
                        {formulasAdded.length > 0 && (
                          <div className="font-mono text-[#10b981]">
                            <span className="font-bold">+ Formula:</span> {formulasAdded.join(' ; ')}
                          </div>
                        )}
                        {formulasRemoved.length > 0 && (
                          <div className="font-mono text-bad">
                            <span className="font-bold">− Formula:</span> {formulasRemoved.join(' ; ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <BusinessImpactBlock insight={insight} mode="modified" />
              </div>

              {/* Connecting Arrow with Label */}
              <div className="hidden lg:flex flex-col items-center justify-center text-muted px-1.5 select-none">
                <span className="text-xs uppercase font-bold text-[#10b981] tracking-wider mb-1">Suggestions</span>
                <div className="flex items-center text-[#10b981]">
                  <div className="w-7 h-[2px] bg-[#10b981]/50" />
                  <ArrowRight size={17} className="-ml-1 text-[#10b981]" />
                </div>
              </div>

              {/* Right Card: AgentForgeX Suggestions directly paired */}
              <SuggestionCard
                guidance={guidance}
                decision={decision}
                onDecision={handleDecision}
                slug={slug}
                variant="modified"
              />
            </div>
          )
        })}
      </div>

      {/* Relationships section at bottom */}
      {d.edges_removed?.length > 0 && (
        <div className="pt-3 border-t border-line">
          <h4 className="h-section mb-2 text-xs font-bold uppercase tracking-wider text-bad">
            Relationships Missing from Current Model
          </h4>
          <ul className="space-y-2 text-xs">
            {d.edges_removed.map((e, i) => {
              const ed = describeEdgeChange(e, 'removed', impactCtx)
              return (
                <li key={i} className="rounded-xl border border-bad/30 bg-bad/5 p-3 space-y-1.5">
                  <div className="font-mono text-[11px]">
                    <span className="text-ink font-semibold">{ed.sourceName}</span>
                    <span className="text-bad font-bold mx-1.5">——[{e.label}]——✕</span>
                    <span className="text-ink font-semibold">{ed.targetName}</span>
                  </div>
                  <p className="text-[11px] text-ink leading-relaxed">
                    <span className="font-semibold text-bad">Business Impact:</span> {ed.impact}
                  </p>
                  {ed.suggestion && (
                    <p className="text-[11px] text-ink leading-relaxed">
                      <span className="font-semibold text-ink">Suggestion:</span> {ed.suggestion}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {d.edges_modified?.length > 0 && (
        <div className="pt-3 border-t border-line">
          <h4 className="h-section mb-2 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            Relationships Relabelled
          </h4>
          <ul className="space-y-2 text-xs">
            {d.edges_modified.map((e, i) => {
              const ed = describeEdgeChange(e, 'modified', impactCtx)
              return (
                <li key={i} className="rounded-xl border border-amber-500/30 bg-amber-50/15 dark:bg-amber-950/20 p-3 space-y-1.5">
                  <div className="font-mono text-[11px]">
                    <span className="text-ink font-semibold">{ed.sourceName}</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold mx-1.5">
                      ——[{e.from} → {e.to}]——►
                    </span>
                    <span className="text-ink font-semibold">{ed.targetName}</span>
                  </div>
                  <p className="text-[11px] text-ink leading-relaxed">
                    <span className="font-semibold text-ink">Business Impact:</span> {ed.impact}
                  </p>
                  {ed.suggestion && (
                    <p className="text-[11px] text-ink leading-relaxed">
                      <span className="font-semibold text-ink">Suggestion:</span> {ed.suggestion}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {d.edges_added?.length > 0 && (
        <div className="pt-3 border-t border-line">
          <h4 className="h-section mb-2 text-xs font-bold uppercase tracking-wider text-ink">Relationships added</h4>
          <ul className="space-y-1.5 text-xs">
            {d.edges_added.map((e, i) => (
              <li key={i} className="rounded-lg border border-line bg-surface2/30 p-2 font-mono text-[11px]">
                <span className="text-ink font-semibold">{e.source_name || e.source}</span>
                <span className="text-[#10b981] font-bold mx-1.5">——[{e.label}]——►</span>
                <span className="text-ink font-semibold">{e.target_name || e.target}</span>
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
  const location = useLocation()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const cleanSlug = (slug || '').replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
  const domainKey = SLUG_TO_DOM[cleanSlug] || 'f1'
  const domainMeta = DOMMETA[domainKey] || DOMMETA.f1

  const wfParam = searchParams.get('wf') || (slug ? sessionStorage.getItem(`afx_active_wf_${slug}`) : null)
  const modelParam = searchParams.get('model') || (slug ? sessionStorage.getItem(`afx_active_model_${slug}`) : null)

  const wsQuery = useMemo(() => {
    const qs = new URLSearchParams()
    if (wfParam) qs.set('wf', wfParam)
    if (modelParam) qs.set('model', modelParam)
    return qs.toString() ? `?${qs.toString()}` : ''
  }, [wfParam, modelParam])

  useEffect(() => {
    if (!slug) return
    if (wfParam && !searchParams.get('wf')) {
      const next = new URLSearchParams(searchParams)
      next.set('wf', wfParam)
      if (modelParam) next.set('model', modelParam)
      setSearchParams(next, { replace: true })
    }
  }, [slug, wfParam, modelParam, searchParams, setSearchParams])

  const wf = useAsync(() => domains.workflow(slug, wfParam), [slug, wfParam])
  const fin = useAsync(() => graphs.finalization(slug, wfParam), [slug, wfParam], { immediate: false })
  const g = useAsync(() => domains.graph(slug, false), [slug])

  const [wsReview, setWsReview] = useState(null)
  const [wsReviewLoading, setWsReviewLoading] = useState(true)

  const activeModelName = useMemo(() => {
    return (
      searchParams.get('model') ||
      sessionStorage.getItem('afx_current_workspace') ||
      (slug ? sessionStorage.getItem(`afx_active_model_${slug}`) : null) ||
      sessionStorage.getItem('afx_active_model_name') ||
      null
    )
  }, [searchParams, slug])

  const loadWorkspaceReview = useCallback(() => {
    setWsReviewLoading(true)
    domains
      .workspaceReview(activeModelName)
      .then((data) => {
        setWsReview(data)
        if (data?.comparison) {
          setCmp(data.comparison)
        }
      })
      .catch((err) => {
        console.warn('Workspace review fetch notice:', err)
      })
      .finally(() => {
        setWsReviewLoading(false)
      })
  }, [activeModelName])

  useEffect(() => {
    loadWorkspaceReview()
  }, [loadWorkspaceReview])

  const domainName =
    wf.data?.domain?.name ||
    (domainMeta?.n ? domainMeta.n.replace(/^F\d+\s+/, '') : null) ||
    cleanSlug
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')

  const [range, setRange] = useState({ from: 0, to: null })
  const [cmp, setCmp] = useState(null)
  const [gapGraph, setGapGraph] = useState(null)
  const [dlg, setDlg] = useState(null)
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [selectedNode, setSelectedNode] = useState(null)
  const [activeRightTab, setActiveRightTab] = useState('chat') // 'chat' | 'details'
  const [activeDomainFilter, setActiveDomainFilter] = useState(domainKey)
  const [snap, setSnap] = useState(null)
  const [proposal, setProposal] = useState(null)
  const [updatingGraph, setUpdatingGraph] = useState(false)
  const { updateDomainWorkflow } = useWorkflow()

  useEffect(() => {
    setActiveDomainFilter(domainKey)
    setGapGraph(null)
  }, [slug, domainKey])

  useEffect(() => {
    if (slug) {
      updateDomainWorkflow(slug, {
        isKG1Ready: true,
        hasFiles: true,
        isFinalized: Boolean(wf.data?.finalized_version_number),
      })
    }
  }, [slug, wf.data?.finalized_version_number, updateDomainWorkflow])

  useEffect(() => {
    if (!slug) return
    chat
      .get(slug)
      .then((s) => {
        setSnap(s)
        if (s?.workflow_id) {
          sessionStorage.setItem(`afx_active_wf_${slug}`, String(s.workflow_id))
        }
      })
      .catch(() => {
        setSnap({
          conversation_id: null,
          messages: [],
          open_question: null,
          progress: { answered: 0, planned: 0, plan_complete: false },
          pending_change_count: 0,
          engine: 'Assistant',
          llm_enabled: false,
        })
      })

    graphs
      .proposals(slug)
      .then((r) => {
        const p = r.proposals?.find((x) => x.status === 'pending' && x.source === 'chat') || null
        setProposal(p)
      })
      .catch(() => { })
  }, [slug])

  useEffect(() => {
    if (fin.data && range.to === null && fin.data.version?.number) {
      setRange({ from: 0, to: fin.data.version.number })
    }
  }, [fin.data]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (range.to !== null) {
      graphs.compare(slug, range.from, range.to).then(setCmp, (e) => toast.error(e.message))
    }
  }, [range, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const workedDomainKeys = useMemo(() => {
    if (wsReview?.worked_domain_keys && wsReview.worked_domain_keys.length > 0) {
      return wsReview.worked_domain_keys
    }
    return domainKey ? [domainKey] : ['f1']
  }, [wsReview, domainKey])

  const workedDomainsList = useMemo(() => {
    return wsReview?.worked_domains || []
  }, [wsReview])

  const finalized = Boolean(
    wf.data?.finalized_version_number ||
    snap?.finalized ||
    workedDomainsList.some((w) => w.is_finalized)
  )

  // Robust fallback to ensure Knowledge Graph is ALWAYS populated across all domains
  const effectiveBaseGraph = useMemo(() => {
    if (wsReview?.graph?.nodes?.length > 0) {
      return wsReview.graph
    }
    let sourceGraph = fin.data?.graph?.nodes?.length > 0 ? fin.data.graph : g.data?.nodes?.length > 0 ? g.data : null
    const dKey = domainKey || 'f1'
    const dm = DOMMETA[dKey] || DOMMETA.f1
    if (sourceGraph && sourceGraph.nodes) {
      // Only keep nodes belonging to the current domain and spine
      const filteredNodes = sourceGraph.nodes.filter((n) => {
        const nd = String(n.group_key || n.d || '').toLowerCase()
        return nd === dKey || nd === 'spine' || n.origin === 'custom' || n.origin === 'user' || n.role === 'client'
      })
      const nodeKeySet = new Set(filteredNodes.map((n) => String(n.key || n.id)))
      const filteredEdges = (sourceGraph.edges || []).filter(
        (e) => nodeKeySet.has(String(e.source || e.srcId)) && nodeKeySet.has(String(e.target || e.tgtId))
      )
      return {
        ...sourceGraph,
        nodes: filteredNodes.length > 0 ? filteredNodes : sourceGraph.nodes,
        edges: filteredEdges,
      }
    }
    const rawNodes = NODES.filter((n) => n.d === dKey || n.d === 'spine')
    return {
      nodes: rawNodes.map((n, idx) => ({
        ...n,
        id: String(n.id || `node-${idx}`),
        key: String(n.id || `node-${idx}`),
        name: n.n || n.id,
        group_name: DOMMETA[n.d]?.n || dm.n,
        color: DOMMETA[n.d]?.c || dm.c,
        attributes: n.a?.map((attr) => ({ name: attr })) || [],
        formulas: n.f?.map((frm) => ({ name: frm })) || [],
      })),
      edges: [],
    }
  }, [fin.data?.graph, g.data, domainKey])

  const effectiveDisplayGraph = useMemo(() => {
    const raw = wsReview?.graph?.nodes?.length > 0 ? wsReview.graph : effectiveBaseGraph
    return {
      nodes: raw?.nodes || [],
      edges: raw?.edges || [],
      flows: raw?.flows || [],
    }
  }, [wsReview, effectiveBaseGraph])

  const isGraphLoading = Boolean(
    wsReviewLoading ||
    wf.loading ||
    g.loading ||
    updatingGraph ||
    (effectiveDisplayGraph.nodes.length === 0 && !wsReview)
  )

  const d = useMemo(() => {
    if (fin.data) return fin.data
    return {
      domain: wf.data?.domain || { name: domainName, slug },
      version: { number: 1, label: 'v1.0' },
      graph: effectiveBaseGraph,
      validation: { errors: [], warnings: [] },
      history: [],
    }
  }, [fin.data, wf.data, domainName, slug, effectiveBaseGraph])

  useEffect(() => {
    if (!slug) return
    if (d.gap_graph?.nodes?.length > 0) {
      setGapGraph(d.gap_graph)
      return
    }
    let cancelled = false
    filesApi
      .gapAnalysis(slug, { silent: true })
      .then((res) => {
        if (!cancelled && res?.nodes?.length > 0) setGapGraph(res)
      })
      .catch(() => { })
    return () => {
      cancelled = true
    }
  }, [slug, d])

  const graphDataWithGaps = useMemo(
    () => annotateMissingGapNodes(effectiveBaseGraph, cmp?.nodes_removed, gapGraph || d?.gap_graph),
    [effectiveBaseGraph, cmp?.nodes_removed, gapGraph, d?.gap_graph],
  )

  const selectedGraphNode = useMemo(() => {
    if (!selectedNode) return null
    return (
      effectiveDisplayGraph.nodes.find(
        (n) => n.id === selectedNode || n.key === selectedNode || n.name === selectedNode
      ) ||
      graphDataWithGaps.nodes.find(
        (n) => n.id === selectedNode || n.key === selectedNode || n.name === selectedNode
      ) ||
      effectiveBaseGraph.nodes.find(
        (n) => n.id === selectedNode || n.key === selectedNode || n.name === selectedNode
      ) ||
      null
    )
  }, [selectedNode, effectiveDisplayGraph.nodes, graphDataWithGaps.nodes, effectiveBaseGraph.nodes])

  const [domainTooltip, setDomainTooltip] = useState(null)

  const handleSelectNode = (nodeId) => {
    setSelectedNode(nodeId)
    setDomainTooltip(null)
    if (nodeId) {
      setActiveRightTab('details')
    }
  }

  const handleDomainClick = useCallback((dKey, dMeta, coords) => {
    const slugToUse = DOMAIN_SLUGS[dKey] || dKey
    const cleanName = (dMeta?.n || DOMMETA[dKey]?.n || dKey).replace(/^F\d+\s+/, '')
    const workedInfo = workedDomainsList.find(
      (w) => w.domain_slug === slugToUse || w.domain_key === dKey
    )

    setDomainTooltip({
      domainKey: dKey,
      domainSlug: slugToUse,
      domainName: cleanName,
      fullName: dMeta?.n || DOMMETA[dKey]?.n || dKey,
      color: dMeta?.c || DOMMETA[dKey]?.c || '#10b981',
      coords,
      workflowId: workedInfo?.workflow_id || null,
      isWorked: Boolean(workedInfo),
    })
  }, [workedDomainsList])

  const handleRedirectToBusinessInput = useCallback((targetSlug, targetWf) => {
    if (!targetSlug) return

    const qs = new URLSearchParams()
    if (activeModelName) qs.set('model', activeModelName)
    if (targetWf) {
      qs.set('wf', String(targetWf))
    } else {
      const storedWf = sessionStorage.getItem(`afx_active_wf_${targetSlug}`)
      if (storedWf) qs.set('wf', storedWf)
    }

    if (activeModelName) {
      sessionStorage.setItem('afx_current_workspace', activeModelName)
      sessionStorage.setItem('afx_active_model_name', activeModelName)
      sessionStorage.setItem(`afx_active_model_${targetSlug}`, activeModelName)
    }
    if (targetWf) {
      sessionStorage.setItem(`afx_active_wf_${targetSlug}`, String(targetWf))
    }

    const qStr = qs.toString() ? `?${qs.toString()}` : ''
    navigate(`/finance/${targetSlug}${qStr}`)
  }, [activeModelName, navigate])

  const doFinalize = async () => {
    setBusy(true)
    try {
      if (activeModelName) {
        await domains.workspaceFinalize({ model: activeModelName }).catch((err) => {
          console.warn('Workspace finalize notice:', err)
        })
      }
      await graphs.finalize(slug, { confirm: true, acknowledge_warnings: ack }).catch((err) => {
        console.warn('Backend finalize notice:', err)
      })
      toast.success('Workspace Digital Twin finalized & governed! Enterprise workflow complete.')
      setDlg(null)
      updateDomainWorkflow(slug, { isFinalized: true })
      window.dispatchEvent(new CustomEvent('afx_journey_refresh'))
      navigate(`/finance/${slug}/twin${wsQuery}`)
    } catch (e) {
      toast.error(e.message)
      setDlg(null)
      navigate(`/finance/${slug}/twin${wsQuery}`)
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
      window.dispatchEvent(new CustomEvent('afx_journey_refresh'))
      await Promise.all([wf.reload(), fin.reload(), g.reload()])
      navigate(`/finance/${slug}${wsQuery}`)
    } catch (e) {
      toast.error(e.message)
      setDlg(null)
    } finally {
      setBusy(false)
    }
  }

  const defaultSaveName = useMemo(() => {
    if (location.state?.modelName) {
      return location.state.modelName
    }
    const now = new Date()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `Finance_Model_${monthNames[now.getMonth()]}_${String(now.getFullYear()).slice(-2)}`
  }, [location.state])

  const activeWorkspaceName = useMemo(() => {
    return searchParams.get('model') || (slug ? sessionStorage.getItem(`afx_active_model_${slug}`) : null) || sessionStorage.getItem('afx_current_workspace') || sessionStorage.getItem('afx_active_model_name') || ''
  }, [searchParams, slug])

  const performAutoSave = useCallback((modelNameOverride) => {
    try {
      const modelName = modelNameOverride || activeWorkspaceName || sessionStorage.getItem('afx_current_workspace') || sessionStorage.getItem('afx_active_model_name') || (d?.name ? `${d.name} Model` : 'Workspace Model')
      const now = new Date()
      const currentWf = searchParams.get('wf')
      const nodes = graphDataWithGaps.nodes || []
      const edges = graphDataWithGaps.edges || []

      if (!nodes || nodes.length === 0) return

      domains.saveCustomModel({
        name: modelName,
        slug,
        wf: currentWf || undefined,
        domainName: d?.name,
        nodes,
        edges,
        savedAt: now.toISOString(),
        createdAt: now.toISOString(),
      }).then((res) => {
        sessionStorage.removeItem('afx_fresh_session')
        sessionStorage.setItem('afx_current_workspace', modelName)
        sessionStorage.setItem('afx_active_model_name', modelName)
        if (slug) {
          sessionStorage.setItem(`afx_active_model_${slug}`, modelName)
        }
        if (res?.workflow_id && slug) {
          sessionStorage.setItem(`afx_active_wf_${slug}`, String(res.workflow_id))
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('afx_journey_refresh'))
        }
      }).catch((err) => console.warn('Finalize auto-save silent warning:', err))
    } catch (e) {
      console.warn('Finalize auto-save execution error:', e)
    }
  }, [activeWorkspaceName, d?.name, slug, graphDataWithGaps.nodes, graphDataWithGaps.edges, searchParams])

  useEffect(() => {
    if (!graphDataWithGaps.nodes?.length) return
    const timer = setTimeout(() => {
      performAutoSave()
    }, 1500)
    return () => clearTimeout(timer)
  }, [graphDataWithGaps.nodes, graphDataWithGaps.edges, performAutoSave])

  const handleSaveProgress = () => {
    performAutoSave()
  }

  const handleSaveAs = () => {
    setSaveAsOpen(true)
  }

  const handleEditModel = () => {
    // Navigate back to Step 2 Business Input so user can edit graph, prompts, and calibration parameters
    navigate(`/finance/${slug}${wsQuery}`)
  }

  const executeSaveAs = (modelName, mode = 'overwrite') => {
    try {
      const now = new Date()
      const payload = {
        name: modelName,
        savedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        slug,
        domainName: d?.name || domainName || 'Finance Model',
        version: d?.version || { number: 1, label: 'v1.0' },
        nodes: graphDataWithGaps.nodes || [],
        edges: graphDataWithGaps.edges || [],
        flows: g.data?.flows || [],
        stage: 'finalize',
        isGapMode: false,
      }

      // Persist saved model directly to backend database API
      const currentWf = searchParams.get('wf')
      domains.saveCustomModel({
        name: modelName,
        slug,
        wf: currentWf || undefined,
        domainName: d?.name,
        nodes: payload.nodes,
        edges: payload.edges,
        savedAt: payload.savedAt,
        createdAt: payload.savedAt,
      }).then((res) => {
        sessionStorage.removeItem('afx_fresh_session')
        sessionStorage.setItem('afx_current_workspace', modelName)
        sessionStorage.setItem('afx_active_model_name', modelName)
        if (slug) {
          sessionStorage.setItem(`afx_active_model_${slug}`, modelName)
        }
        if (res?.workflow_id) {
          if (slug) {
            sessionStorage.setItem(`afx_active_wf_${slug}`, String(res.workflow_id))
          }
          const next = new URLSearchParams(window.location.search)
          next.set('wf', res.workflow_id)
          next.set('model', modelName)
          next.delete('fresh')
          setSearchParams(next, { replace: true })
        }
      }).catch((err) => console.warn('Backend custom model save warning:', err))

      if (mode === 'overwrite') {
        toast.success(`Progress saved to "${modelName.replace(/_/g, ' ')}"!`)
      } else {
        toast.success(`Workspace "${modelName.replace(/_/g, ' ')}" saved successfully!`)
      }
      setSaveAsOpen(false)
    } catch (e) {
      toast.error('Failed to save model: ' + e.message)
    }
  }

  const nextConfig = useMemo(() => {
    if (finalized) {
      return {
        label: 'Next: Digital Twin',
        onNext: () => navigate(`/finance/${slug}/twin${wsQuery}`),
      }
    }
    return {
      label: 'Next: Finalize Twin',
      onNext: () => {
        setAck(false)
        setDlg('finalize')
      },
    }
  }, [finalized, slug, navigate])

  const backToBusinessUrl = useMemo(() => {
    const curModel = searchParams.get('model') || (slug ? sessionStorage.getItem(`afx_active_model_${slug}`) : null) || sessionStorage.getItem('afx_current_workspace')
    const curWf = searchParams.get('wf') || (slug ? sessionStorage.getItem(`afx_active_wf_${slug}`) : null)
    const qs = new URLSearchParams()
    if (curModel) qs.set('model', curModel)
    if (curWf) qs.set('wf', curWf)
    const qStr = qs.toString()
    return qStr ? `/finance/${slug}?${qStr}` : `/finance/${slug}`
  }, [searchParams, slug])

  return (
    <Layout
      wide
      nextLabel={nextConfig.label}
      onNext={nextConfig.onNext}
    >
      {/* Top Header Navigation with Domain Tabs */}
      <div className="mb-4 rounded-2xl border border-line bg-surface/70 p-3 sm:p-3.5 backdrop-blur shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5 select-none">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <Link
              to={backToBusinessUrl}
              className="group relative rounded-xl px-3 py-1.5 text-xs sm:text-[13px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 border border-line bg-surface/90 text-muted hover:text-ink hover:border-brand/40 hover:bg-surface2 shadow-2xs hover:-translate-y-0.5"
            >
              <ArrowLeft size={14} className="text-brand" />
              <span className="tracking-tight">Back to Business Input</span>
            </Link>

            {/* Active Workspace / Domain Pill */}
            <div className="inline-flex items-center gap-2.5 rounded-xl px-4 py-2 text-sm font-semibold border border-brand bg-brand text-white shadow-md shadow-brand/25">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 0 8px rgba(255,255,255,0.85)',
                }}
              />
              <span className="tracking-tight whitespace-nowrap">
                {activeWorkspaceName ? `Workspace: ${activeWorkspaceName.replace(/_/g, ' ')}` : (DOMMETA[domainKey]?.n || domainName || 'Finance Domain')}
              </span>
            </div>

            {/* Worked Domains Badges */}
            {workedDomainsList && workedDomainsList.length > 0 ? (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted font-bold mr-0.5 hidden md:inline">Worked Domains:</span>
                {workedDomainsList.map((wd) => (
                  <span
                    key={wd.domain_slug}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs"
                    style={{
                      backgroundColor: `${wd.domain_color || '#4f46e5'}18`,
                      color: wd.domain_color || '#4f46e5',
                      borderColor: `${wd.domain_color || '#4f46e5'}40`,
                    }}
                  >
                    <span>{wd.domain_code}</span>
                    <span className="font-medium text-[11px] opacity-90 hidden sm:inline">{wd.domain_name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setActiveDomainFilter(activeDomainFilter === 'spine' ? domainKey : 'spine')}
                className={`group relative rounded-xl px-3 py-1.5 text-xs sm:text-[13px] transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0 border ${activeDomainFilter === 'spine'
                  ? 'bg-brand text-white border-brand shadow-md shadow-brand/25 scale-[1.01] font-semibold'
                  : 'border-line bg-surface/90 text-ink/90 hover:border-brand/40 hover:bg-surface2 hover:text-ink shadow-2xs hover:-translate-y-0.5'
                  }`}
                title="Finance master-data spine"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0 transition-transform group-hover:scale-125"
                  style={{
                    backgroundColor: activeDomainFilter === 'spine' ? '#FFFFFF' : '#38BDF8',
                    boxShadow: activeDomainFilter === 'spine' ? '0 0 8px rgba(255,255,255,0.8)' : undefined,
                  }}
                />
                <span className="font-semibold text-xs sm:text-[13px] tracking-tight whitespace-nowrap">
                  Finance master-data spine
                </span>
              </button>
            )}

            {/* AgentForgeX Generated Badge */}
            <span className="rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand border border-brand/30 shrink-0">
              AgentForgeX Generated ({effectiveDisplayGraph.nodes.length} nodes)
            </span>
          </div>

          {/* Action Buttons: Edit Model & Save As buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleEditModel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border border-line bg-surface hover:bg-surface2 text-ink hover:border-brand/40"
              title="Edit model ontology and parameters in Business Input stage"
            >
              <Edit3 size={14} className="text-brand" />
              <span>Edit Model</span>
            </button>

            {/* Auto-Save Status Indicator */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface2/60 border border-line text-muted text-[11px] font-medium shrink-0">
              <CheckCircle2 size={12} className="text-[#10b981]" />
              <span>Auto-saved</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-4">
        {/* Full-Width Workspace Ontology Graph Canvas */}
        <div className="card relative h-[calc(100vh-140px)] min-h-[580px] overflow-hidden p-0 border border-line isolate flex flex-col shadow-card w-full">
          <OntologyGraphCanvas
            nodes={effectiveDisplayGraph.nodes}
            edges={effectiveDisplayGraph.edges}
            flows={effectiveDisplayGraph.flows}
            activeDomains={workedDomainKeys}
            showNeighbours={true}
            selectedNodeId={selectedNode}
            onSelectNode={handleSelectNode}
            domainLabelPosition="outside"
            onDomainClick={handleDomainClick}
            onBackgroundClick={() => setDomainTooltip(null)}
            className="w-full h-full"
          />

          {/* Centered Knowledge Graph Loader (Matches 1st Screenshot) */}
          {isGraphLoading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-surface/90 backdrop-blur-xs transition-opacity duration-300 select-none">
              <div className="relative flex items-center justify-center">
                <div className="h-14 w-14 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
                <Network className="absolute text-brand animate-pulse" size={20} />
              </div>
              <div className="text-center mt-2">
                <p className="text-sm font-semibold text-ink">Fetching Knowledge Graph...</p>
                {/* <p className="text-xs text-muted mt-1">ontology nodes, edges and governance definitions</p> */}
              </div>
            </div>
          )}

          {/* Interactive Domain Tooltip Popover */}
          {domainTooltip && (
            <div
              className="absolute z-40 transform -translate-x-1/2 -translate-y-full pointer-events-auto transition-all duration-150 animate-in fade-in zoom-in-95"
              style={{
                left: Math.max(160, Math.min(domainTooltip.coords.containerX, 1200)),
                top: Math.max(48, domainTooltip.coords.containerY - 14),
              }}
            >
              <div
                className="flex items-center gap-2 rounded-2xl bg-surface/95 border px-4 py-2.5 shadow-2xl backdrop-blur-md text-ink"
                style={{ borderColor: `${domainTooltip.color}70` }}
              >
                <button
                  type="button"
                  onClick={() => handleRedirectToBusinessInput(domainTooltip.domainSlug, domainTooltip.workflowId)}
                  className="flex items-center gap-2.5 text-xs font-bold text-ink hover:text-brand transition cursor-pointer group select-none"
                  title={`Navigate to Business Input for ${domainTooltip.domainName}`}
                >
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-lg group-hover:scale-110 transition-transform shadow-2xs"
                    style={{
                      backgroundColor: `${domainTooltip.color}20`,
                      color: domainTooltip.color,
                    }}
                  >
                    <MessageSquarePlus size={14} />
                  </span>
                  <span>
                    Share your inputs on{' '}
                    <span
                      className="underline underline-offset-2 font-black"
                      style={{ color: domainTooltip.color }}
                    >
                      {domainTooltip.domainName}
                    </span>
                  </span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" style={{ color: domainTooltip.color }} />
                </button>
                <button
                  type="button"
                  onClick={() => setDomainTooltip(null)}
                  className="ml-1 p-1 rounded-lg text-muted hover:text-ink hover:bg-surface2 transition cursor-pointer"
                  title="Close"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Chat Column (Commented out on Review page as requested) */}
        {false && (
          <div className="card flex h-[calc(100vh-120px)] min-h-[500px] flex-col overflow-hidden shadow-card">
            {/* Header Bar with Tabs */}
            <div className="flex items-center justify-between border-b border-line bg-surface2/60 px-3.5 py-2.5 select-none shrink-0">
              <div className="flex items-center gap-1.5 rounded-xl bg-surface p-1 border border-line/60">
                <button
                  type="button"
                  onClick={() => setActiveRightTab('chat')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${activeRightTab === 'chat'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-muted hover:text-ink'
                    }`}
                >
                  <Bot size={14} />
                  <span>Chatbot</span>
                  {snap?.messages?.length > 0 && (
                    <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-bold">
                      {snap.messages.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveRightTab('details')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${activeRightTab === 'details'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-muted hover:text-ink'
                    }`}
                >
                  <FileText size={14} />
                  <span>Entity Specs</span>
                  {selectedNode && <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse" />}
                </button>
              </div>

              {finalized && (
                <span className="hidden sm:inline-flex rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 text-[10.5px] font-bold border border-emerald-300/40">
                  Governed
                </span>
              )}
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {activeRightTab === 'chat' && (
                <ChatPanel
                  slug={slug}
                  domainName={domainName}
                  snap={snap}
                  setSnap={setSnap}
                  askNode={selectedNode}
                  nodeName={selectedGraphNode?.name}
                  onProposal={setProposal}
                  onSwitchToDetails={() => setActiveRightTab('details')}
                  onAnsweringChange={setUpdatingGraph}
                  onNextToUpload={() => navigate(`/finance/${slug}?mode=upload${wfParam ? `&wf=${wfParam}` : ''}${modelParam ? `&model=${encodeURIComponent(modelParam)}` : ''}`)}
                  isUploadOpen={false}
                  parsingProgress={null}
                  locked={false}
                  disabledReason={undefined}
                  onGraphUpdate={(res) => {
                    if (res?.graph) {
                      toast.success('Knowledge Graph automatically updated!')
                    }
                    Promise.allSettled([fin.reload(), wf.reload(), g.reload()]).finally(() => {
                      setUpdatingGraph(false)
                    })
                  }}
                />
              )}

              {activeRightTab === 'details' && (
                <div className="h-full overflow-y-auto p-4 scroll-thin">
                  {selectedGraphNode ? (
                    <div className="flex flex-col h-full space-y-3 text-xs">
                      <div className="flex items-center justify-between pb-2.5 border-b border-line mb-1">
                        <h2 className="text-sm font-bold text-ink">Entity Properties</h2>
                        <button
                          type="button"
                          onClick={() => setSelectedNode(null)}
                          className="px-2 py-1 rounded-lg text-xs font-semibold text-muted hover:text-ink hover:bg-surface2/80 flex items-center gap-1 border border-line transition-colors cursor-pointer"
                        >
                          <X size={12} />
                          <span>Clear Selection</span>
                        </button>
                      </div>

                      <div className="p-3 rounded-xl bg-surface2/40 border border-line space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-muted">Entity Name</span>
                          {selectedGraphNode.gap_status === 'missing' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-600 border border-red-500/30">
                              MISSING
                            </span>
                          )}
                          {selectedGraphNode.gap_status === 'new' && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/10 text-red-600 border border-red-500/30">
                              NEW TELEMETRY
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

                      {(selectedGraphNode.traversal_path || selectedGraphNode.notes?.traversal_path) && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                            <Compass size={12} /> Traversal Path (When & Why to Traverse)
                          </span>
                          <p className="text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed font-medium">
                            {selectedGraphNode.traversal_path || selectedGraphNode.notes?.traversal_path}
                          </p>
                        </div>
                      )}

                      {(selectedGraphNode.stop_criteria || selectedGraphNode.notes?.stop_criteria) && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                            <ShieldAlert size={12} /> Boundaries / Stop Criteria (Guardrails)
                          </span>
                          <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed font-medium">
                            {selectedGraphNode.stop_criteria || selectedGraphNode.notes?.stop_criteria}
                          </p>
                        </div>
                      )}

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
                              <div
                                key={idx}
                                className="p-2 rounded-lg bg-surface font-mono text-[10.5px] text-[#10b981] border border-line/70"
                              >
                                {typeof f === 'string' ? f : f?.name || f?.formula}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

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

                      <div className="pt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveRightTab('chat')}
                          className="btn-ghost btn-sm text-xs cursor-pointer w-full"
                        >
                          Back to Chatbot
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted">
                      <FileText size={32} className="mb-2 text-muted/60" />
                      <p className="text-sm font-semibold text-ink">No Entity Selected</p>
                      <p className="mt-1 text-xs text-muted max-w-xs leading-relaxed">
                        Click any entity node in the graph on the left to inspect its governed definition, attributes, formulas, and connections.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveRightTab('chat')}
                        className="btn-ghost btn-sm mt-4 text-xs cursor-pointer"
                      >
                        Back to Chatbot
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Version Comparison Section */}
        <section className="card p-4 border border-line mt-6 mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-sm text-ink">Compare Versions</h2>
            <span className="inline-flex items-center rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-2xs">
              Baseline Enterprise Ontology
            </span>
            <span className="text-xs font-semibold text-ink px-0.5">vs</span>
            <span className="inline-flex items-center rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-2xs">
              Current Workspace {activeModelName ? `(${activeModelName.replace(/_/g, ' ')})` : ''}
            </span>
          </div>
          {cmp ? (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                <Stat label="entities added" v={cmp.counts?.nodes_added ?? 0} tone="text-ok" />
                <Stat label="entities modified" v={cmp.counts?.nodes_modified ?? 0} tone="text-warn" />
                <Stat label="entities removed" v={cmp.counts?.nodes_removed ?? 0} tone="text-bad" />
                <Stat label="links added" v={cmp.counts?.edges_added ?? 0} tone="text-ok" />
                <Stat label="links relabelled" v={cmp.counts?.edges_modified ?? 0} />
                <Stat label="links removed" v={cmp.counts?.edges_removed ?? 0} tone="text-bad" />
              </div>
              <DiffLists d={cmp} domainName={domainName} slug={slug} graph={effectiveDisplayGraph} history={wsReview?.history || d?.history || []} />
            </>
          ) : <Loading className="!p-4" />}
        </section>

        {/* Change History Section */}
        <section className="card p-4 border border-line">
          <h2 className="flex items-center gap-2 font-semibold text-sm text-ink">
            <History size={16} /> Change History
          </h2>
          {(d?.history?.length || 0) === 0 && <p className="mt-2 text-xs text-muted">No proposals yet.</p>}
          <ul className="mt-3 space-y-3">
            {(d?.history || []).map((p) => (
              <li key={p.id} className="rounded-xl border border-line bg-surface2/30 p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-ink">{p.title}</b>
                  <span className={`badge text-[10px] font-semibold ${p.status === 'approved' ? 'bg-ok/15 text-ok' : p.status === 'pending' ? 'bg-warn/15 text-warn' : 'bg-surface2 text-muted'}`}>
                    {p.status}{p.result_version ? ` → KG${p.result_version}` : ''}
                  </span>
                  <span className="text-[11px] text-muted">{p.source} · {timeAgo(p.created_at)}</span>
                </div>
                <ul className="mt-2 space-y-0.5 text-[11px] text-muted">
                  {(p.items || []).map((i, k) => (
                    <li key={k} className={i.status === 'rejected' ? 'line-through' : ''}>
                      {i.status === 'approved' ? '✓' : i.status === 'rejected' ? '✗' : '•'} {i.description}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        {/* Domain Journey Tracker Section */}
        <DomainJourneyTracker className="mt-4" />
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={dlg === 'finalize'}
        title="Finalize Enterprise Digital Twin?"
        confirmLabel="Finalize as Digital Twin"
        busy={busy}
        onCancel={() => setDlg(null)}
        onConfirm={doFinalize}
      >
        <p className="text-xs leading-relaxed text-ink">
          This locks <strong>Current "{domainName}" Template</strong> as your official Enterprise Digital Twin. All discovered entities, business rules, and dimensions will be permanently governed for financial modeling.
        </p>
        {/* {(d?.validation?.warnings?.length || 0) > 0 && (
          <label className="mt-3 flex items-start gap-2 text-xs text-ink">
            <input type="checkbox" className="mt-0.5 accent-[#10b981]" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>I have reviewed the {d.validation.warnings.length} warning(s) and want to finalize anyway.</span>
          </label>
        )} */}
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

      {/* Save As In-Window Modal */}
      <SaveAsModal
        open={saveAsOpen}
        defaultName={defaultSaveName}
        domainName={domainName || 'Finance Model'}
        entityCount={graphDataWithGaps?.nodes?.length || 0}
        onSave={executeSaveAs}
        onClose={() => setSaveAsOpen(false)}
      />
    </Layout>
  )
}
