import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  Layers,
  Network,
  RotateCcw,
  Search,
  Sparkles,
  Workflow,
  X,
  FileText,
  Sliders,
  Compass,
} from 'lucide-react'
import Layout from '../components/common/Layout'
import { ErrorState, Loading } from '../components/common/States'
import useAsync from '../components/common/useAsync'
import { domains } from '../api'
import ReactFlowOntologyCanvas from '../components/graph/ReactFlowOntologyCanvas'
import {
  DOMMETA,
  FLOWS,
  NODES,
  EDGES,
  ORDER,
  DOMAIN_SLUGS,
  SLUG_TO_DOM,
} from '../lib/ontologyData'

export default function FinanceLanding() {
  const nav = useNavigate()
  const canvasRef = useRef(null)

  // State
  const [selectedDomain, setSelectedDomain] = useState('all') // 'all' or 'f1'..'f8'
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [activeFlowIdx, setActiveFlowIdx] = useState(-1)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNeighbours, setShowNeighbours] = useState(true)
  const [canonModalOpen, setCanonModalOpen] = useState(false)

  // Fetch domain workflow states from backend
  const { data, loading, error, reload } = useAsync(() => domains.list(), [])
  const progress = data?.progress || {}

  // Map API domain objects by code
  const apiDomainMap = useMemo(() => {
    const m = {}
    data?.domains?.forEach((d) => {
      m[d.code.toUpperCase()] = d
    })
    return m
  }, [data])

  // Lookup node by id
  const nodesById = useMemo(() => {
    const m = {}
    NODES.forEach((n) => {
      m[n.id] = n
    })
    return m
  }, [])

  // Selected node details
  const selectedNode = selectedNodeId ? nodesById[selectedNodeId] : null

  // Relationships & Joins for selected node
  const nodeRelationships = useMemo(() => {
    if (!selectedNodeId) return { all: [], joins: [] }
    const out = []
    const inc = []
    const joins = new Set()

    EDGES.forEach(([src, tgt, label]) => {
      if (src === selectedNodeId) {
        out.push({ otherId: tgt, otherName: nodesById[tgt]?.n || tgt, label, dir: 'out' })
        joins.add(tgt)
      } else if (tgt === selectedNodeId) {
        inc.push({ otherId: src, otherName: nodesById[src]?.n || src, label, dir: 'in' })
        joins.add(src)
      }
    })

    return {
      all: [...out, ...inc],
      joins: Array.from(joins).map((id) => ({ id, name: nodesById[id]?.n || id })),
    }
  }, [selectedNodeId, nodesById])

  // Domain selection handler - directly navigate to sub-domain graph & copilot
  const handleDomainSelect = (dKey) => {
    if (dKey === 'all') {
      setSelectedDomain('all')
      setActiveFlowIdx(-1)
    } else {
      const slug = DOMAIN_SLUGS[dKey]
      if (slug) {
        nav(`/finance/${slug}`)
      }
    }
  }

  // Toggle flow highlight handler
  const handleFlowToggle = (idx) => {
    setActiveFlowIdx((prev) => (prev === idx ? -1 : idx))
    setSelectedNodeId(null)
  }

  // Node selection & camera focus
  const handleSelectNode = (nodeId) => {
    setSelectedNodeId(nodeId)
    if (nodeId && canvasRef.current) {
      canvasRef.current.focusNode(nodeId)
    }
  }

  // Workflow progress helper
  const getDomainProgress = (dKey) => {
    const slug = DOMAIN_SLUGS[dKey]
    return slug ? progress[slug] : null
  }

  const currentActiveDomain = selectedDomain !== 'all' ? apiDomainMap[selectedDomain.toUpperCase()] : null
  const currentActiveSlug = DOMAIN_SLUGS[selectedDomain]
  const currentActiveProgress = currentActiveSlug ? progress[currentActiveSlug] : null

  return (
    <Layout wide>
      {/* =========================================================================
          HERO & EXECUTIVE INTRO
         ========================================================================= */}
      <div className="relative mb-5 overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-surface via-surface to-surface2 p-6 sm:p-8 shadow-card">
        {/* Ambient subtle glow background */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative z-10 max-w-5xl">
        

          {/* Main Title with high-contrast gradient */}
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-4xl">
            <span className="text-ink">Finance </span>
            <span className="bg-gradient-to-r from-brand via-indigo-500 to-purple-600 bg-clip-text text-transparent">
              Knowledge Graph
            </span>
          </h1>

          {/* Subtext crafted to inspire and explain value clearly */}
          <p className="mt-2.5 text-xs sm:text-[14px] leading-relaxed text-muted max-w-4xl">
            An interactive multi-dimensional ontology mapping core financial planning, gross-to-net waterfalls,
            activity-based costing, working capital, and enterprise governance to a conformed master-data spine.
            Explore governed definitions, trace end-to-end operational cycles, or use the interactive assistant to
            customize your enterprise graph.
          </p>

        
        </div>
      </div>

      {/* =========================================================================
          DOMAIN TABS & TOOLBAR CONTROLS
         ========================================================================= */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line bg-surface/70 p-3 sm:p-4 backdrop-blur shadow-2xs">
        {/* Domain Tabs Navigation (Multi-row, full text, normal font size, single active color, no badges) */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 select-none">
          {/* All Sub-Domains Master Tab */}
          <button
            id="tab-all"
            type="button"
            className={`group relative rounded-xl px-3.5 py-2 text-xs sm:text-[13px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0 border ${
              selectedDomain === 'all'
                ? 'bg-brand text-white border-brand shadow-md shadow-brand/25 scale-[1.01]'
                : 'border-line bg-surface/90 text-muted hover:text-ink hover:border-brand/40 hover:bg-surface2 shadow-2xs hover:-translate-y-0.5'
            }`}
            onClick={() => handleDomainSelect('all')}
          >
            <Compass size={15} className={selectedDomain === 'all' ? 'text-white' : 'text-brand'} />
            <span className="tracking-tight">All Domains</span>
          </button>

          {/* 8 Specific Domain Tabs with Full Title, Normal Font Size, Unified Single Active Color */}
          {ORDER.map((dKey) => {
            const meta = DOMMETA[dKey]
            const isSelected = selectedDomain === dKey

            return (
              <button
                id={`tab-${dKey}`}
                key={dKey}
                type="button"
                className={`group relative rounded-xl px-3.5 py-2 text-xs sm:text-[13px] transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0 border ${
                  isSelected
                    ? 'bg-brand text-white border-brand shadow-md shadow-brand/25 scale-[1.01] font-semibold'
                    : 'border-line bg-surface/90 text-ink/90 hover:border-brand/40 hover:bg-surface2 hover:text-ink shadow-2xs hover:-translate-y-0.5'
                }`}
                onClick={() => handleDomainSelect(dKey)}
                title={meta.n}
              >
                {/* Full domain title - never truncated or shortened */}
                <span className="font-semibold text-xs sm:text-[13px] tracking-tight whitespace-nowrap">
                  {meta.n}
                </span>
              </button>
            )
          })}
        </div>

        {/* Toolbar: Search, Neighbour Toggle & View Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 ">
          {/* Active Filter Indicator */}
      

          <div className="flex flex-wrap items-center gap-3 ml-auto">
            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="search"
                placeholder="Find entity, formula or attribute…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-60 sm:w-72 rounded-xl border border-line bg-surface pl-9 pr-8 text-xs text-ink placeholder:text-muted focus:border-brand focus:outline-none shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Cross-domain neighbours toggle */}
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showNeighbours}
                onChange={(e) => setShowNeighbours(e.target.checked)}
                className="rounded border-line text-brand focus:ring-brand h-4 w-4"
              />
              <span className="font-medium">Show cross-domain links</span>
            </label>
          </div>
        </div>
      </div>


      {/* =========================================================================
          MAIN INTERACTIVE CANVAS (REACT FLOW) & DETAILS PANEL
         ========================================================================= */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch">
        {/* Left: React Flow Canvas */}
        <div className="flex-1 min-w-0">
          <ReactFlowOntologyCanvas
            ref={canvasRef}
            selectedNodeId={selectedNodeId}
            onSelectNode={handleSelectNode}
            activeDomain={selectedDomain}
            showNeighbours={showNeighbours}
            activeFlowIdx={activeFlowIdx}
            searchQuery={searchQuery}
          />
        </div>

        {/* Right: Modern Side Details Panel */}
        <aside className="w-full lg:w-[380px] lg:flex-none rounded-2xl border border-line bg-surface p-5 shadow-card h-[74vh] min-h-[550px] overflow-y-auto scroll-thin flex flex-col">
          {!selectedNode ? (
            /* Empty State: Platform Overview & Sub-Domain Directory */
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-2 text-brand font-bold text-sm">
                <Network size={16} />
                <span>Ontology Architecture Overview</span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-muted">
                Click any node on the graph to inspect its governed definition, verbatim formulas, conformed dimensions,
                and cross-domain relationships.
              </p>

              <div className="mt-4 rounded-xl border border-line bg-surface2/60 p-3 text-xs leading-relaxed text-muted">
                <b className="text-ink">Central Master-Data Spine:</b>
                <p className="mt-1">
                  The conformed core dimensions (Chart of Accounts, Legal Org Node, Fiscal Calendar, Currency FX, Product SKU, Customer Channel, Metric Dictionary, Source ERP).
                </p>
              </div>

              {/* Sub-Domains List with Direct Launch */}
              <div className="mt-5 pt-4 border-t border-line flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-3 flex items-center justify-between">
                  <span>Finance Sub-Domains</span>
                  <span className="text-[10px] text-brand">8 Domains</span>
                </div>

                <div className="space-y-2">
                  {ORDER.map((dKey) => {
                    const meta = DOMMETA[dKey]
                    const slug = DOMAIN_SLUGS[dKey]
                    const p = progress[slug]
                    const isCurrent = selectedDomain === dKey

                    return (
                      <div
                        key={dKey}
                        className={`flex items-center justify-between rounded-xl p-2.5 text-xs transition border cursor-pointer ${
                          isCurrent
                            ? 'border-brand bg-brand/5 shadow-sm'
                            : 'border-transparent hover:border-line hover:bg-surface2'
                        }`}
                        onClick={() => handleDomainSelect(dKey)}
                      >
                        <div className="flex items-center gap-2.5 truncate pr-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: meta.c }}
                          />
                          <div className="truncate">
                            <span className="font-semibold text-ink truncate block">
                              {meta.n}
                            </span>
                          </div>
                        </div>

                        <Link
                          to={`/finance/${slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-surface border border-line px-2 py-1 text-[11px] font-medium text-muted hover:text-brand hover:border-brand transition shadow-sm"
                          title="Open domain workflow"
                        >
                          <span>{p ? (p.finalized ? 'Final' : `Step ${p.current_step}`) : 'Start'}</span>
                          <ArrowRight size={11} />
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Selected Node State: Comprehensive Governed Entity Card */
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold leading-tight text-ink">
                    {selectedNode.n}
                  </h2>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${DOMMETA[selectedNode.d]?.c}18`,
                      color: DOMMETA[selectedNode.d]?.c,
                      border: `1px solid ${DOMMETA[selectedNode.d]?.c}30`,
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: DOMMETA[selectedNode.d]?.c }}
                    />
                    <span>{DOMMETA[selectedNode.d]?.n}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-muted hover:text-ink shrink-0 p-1 rounded-lg hover:bg-surface2 transition"
                  title="Close panel"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Definition */}
              <div className="mt-3.5 text-xs leading-relaxed text-ink bg-surface2/50 border border-line rounded-xl p-3">
                {selectedNode.def}
              </div>

              {/* Direct Workflow Launch Button */}
              {selectedNode.d !== 'spine' && DOMAIN_SLUGS[selectedNode.d] && (
                <div className="mt-3.5">
                  <Link
                    to={`/finance/${DOMAIN_SLUGS[selectedNode.d]}`}
                    className="btn-primary btn-sm w-full flex items-center justify-center gap-2 text-xs font-semibold shadow-sm py-2"
                  >
                    <span>
                      {getDomainProgress(selectedNode.d)
                        ? `Continue ${DOMMETA[selectedNode.d]?.code} Workflow`
                        : `Open ${DOMMETA[selectedNode.d]?.code} Knowledge Graph`}
                    </span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              )}

              {/* Governed Attributes */}
              {selectedNode.a && selectedNode.a.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2 flex items-center justify-between">
                    <span>Governed Attributes</span>
                    <span className="font-mono text-[10px] text-brand">{selectedNode.a.length} fields</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.a.map((attr, i) => (
                      <span
                        key={i}
                        className="font-mono text-[11px] bg-surface2 border border-line rounded-lg px-2 py-0.5 text-ink leading-tight shadow-2xs"
                      >
                        {attr}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Semantic Relationships */}
              {nodeRelationships.all.length > 0 && (
                <div className="mt-4 pt-3 border-t border-line">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
                    Semantic Relationships ({nodeRelationships.all.length})
                  </h3>
                  <ul className="space-y-1.5 text-xs text-muted">
                    {nodeRelationships.all.map((rel, i) => (
                      <li
                        key={i}
                        className="rounded-lg p-2 bg-surface2/50 border border-line leading-relaxed flex flex-wrap items-center gap-1.5"
                      >
                        {rel.dir === 'out' ? (
                          <>
                            <b className="text-ink font-semibold">{selectedNode.n}</b>
                            <span className="text-[11px] font-semibold text-brand bg-brand/10 px-1.5 py-0.2 rounded border border-brand/20">
                              {rel.label}
                            </span>
                            <span className="text-muted">──▶</span>
                            <button
                              onClick={() => handleSelectNode(rel.otherId)}
                              className="text-brand hover:underline font-semibold"
                            >
                              {rel.otherName}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleSelectNode(rel.otherId)}
                              className="text-brand hover:underline font-semibold"
                            >
                              {rel.otherName}
                            </button>
                            <span className="text-[11px] font-semibold text-brand bg-brand/10 px-1.5 py-0.2 rounded border border-brand/20">
                              {rel.label}
                            </span>
                            <span className="text-muted">──▶</span>
                            <b className="text-ink font-semibold">{selectedNode.n}</b>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Conformed Joins */}
              {nodeRelationships.joins.length > 0 && (
                <div className="mt-4 pt-3 border-t border-line">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2">
                    Conformed Joins ({nodeRelationships.joins.length})
                  </h3>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {nodeRelationships.joins.map((jn) => (
                      <button
                        key={jn.id}
                        onClick={() => handleSelectNode(jn.id)}
                        className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-brand hover:border-brand hover:bg-brand/5 transition shadow-2xs"
                      >
                        {jn.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence & Corpus Citations */}
              {selectedNode.ev && (
                <div className="mt-4 pt-3 border-t border-line">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                    Corpus Evidence &amp; Governance
                  </h3>
                  <p className="text-[11.5px] italic text-muted leading-relaxed bg-surface2/40 p-2.5 rounded-xl border border-line">
                    “{selectedNode.ev}”
                  </p>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* =========================================================================
          END-TO-END OPERATIONAL CYCLES (BOTTOM SECTION)
         ========================================================================= */}
      <details className="mt-5 rounded-2xl border border-line bg-surface shadow-card overflow-hidden group" open>
        <summary className="cursor-pointer px-5 py-4 text-sm sm:text-base font-bold text-ink flex items-center justify-between select-none hover:bg-surface2 transition">
          <div className="flex items-center gap-2.5">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-brand/10 text-brand text-xs font-bold transition-transform group-open:rotate-90">
              ▸
            </span>
            <span className="text-brand">End-to-End Operational Cycles</span>
            <span className="text-xs text-muted font-normal hidden sm:inline">
              — Click any cycle to trace and animate its path across the graph
            </span>
          </div>
          {activeFlowIdx >= 0 && (
            <button
              onClick={(e) => {
                e.preventDefault()
                setActiveFlowIdx(-1)
              }}
              className="text-xs text-muted hover:text-bad font-medium px-2.5 py-1 rounded-lg border border-line bg-surface hover:bg-bad/5 transition"
            >
              Clear active trace
            </button>
          )}
        </summary>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-5 pt-2 border-t border-line bg-surface2/30">
          {FLOWS.map((f, i) => {
            const isActive = activeFlowIdx === i
            return (
              <div
                key={f.t}
                onClick={() => handleFlowToggle(i)}
                className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'border-brand ring-2 ring-brand/30 bg-surface shadow-md scale-[1.01]'
                    : 'border-line bg-surface hover:border-brand/60 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <b className={`text-xs font-bold ${isActive ? 'text-brand' : 'text-ink'}`}>
                      {f.t}
                    </b>
                    {isActive ? (
                      <span className="text-[10px] uppercase font-bold text-brand bg-brand/10 px-2 py-0.5 rounded-full border border-brand/20">
                        Tracing
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted font-mono">
                        {f.ids.length} steps
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[10.5px] text-muted leading-relaxed break-words">
                    {f.x}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-line/60 flex items-center justify-between text-[11px]">
                  <span className={isActive ? 'font-semibold text-brand' : 'text-muted'}>
                    {isActive ? 'Click to deactivate' : 'Click to trace path'}
                  </span>
                  <ChevronRight size={13} className={isActive ? 'text-brand' : 'text-muted'} />
                </div>
              </div>
            )
          })}
        </div>
      </details>

      {/* =========================================================================
          REFERENCE CANON MODAL
         ========================================================================= */}
      {canonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-2xl">
            <button
              onClick={() => setCanonModalOpen(false)}
              className="absolute right-5 top-5 text-muted hover:text-ink p-1 rounded-lg hover:bg-surface2"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2.5 text-brand font-bold text-lg mb-2">
              <FileText size={22} />
              <h2>FMCG Industry Reference Canon — ONTOLOGY.md</h2>
            </div>
            <p className="text-xs text-muted mb-5 leading-relaxed">
              The Finance Knowledge Graph platform is built on Domain-07 of the FMCG Industry Canon v1.1. It models the core financial functions, dimensions, formulas, and governance structures required for enterprise financial intelligence.
            </p>

            <div className="space-y-3.5 text-xs leading-relaxed text-ink">
              <div className="rounded-2xl border border-line p-4 bg-surface2/60">
                <b className="text-brand text-sm flex items-center gap-1.5">
                  <Database size={15} />
                  <span>The Finance Master-Data Spine</span>
                </b>
                <p className="text-muted mt-1.5">
                  The central conformed dimensions that every financial entity keys on: Chart of Accounts intelligence, legal and organizational nodes, fiscal calendars, multi-currency FX variants, customer channels, product hierarchies, and metric dictionaries.
                </p>
              </div>

              <div className="rounded-2xl border border-line p-4 bg-surface2/60">
                <b className="text-brand text-sm flex items-center gap-1.5">
                  <Layers size={15} />
                  <span>Eight Specialized Sub-Domains</span>
                </b>
                <p className="text-muted mt-1.5">
                  Covering Planning &amp; Budgeting (F1), Management Reporting &amp; Gross-to-Net (F2), Costing &amp; Profitability (F3), Working Capital &amp; Treasury (F4), Consolidation &amp; Close (F5), Statement Analysis &amp; Valuation (F6), Risk &amp; Controls (F7), and EPM Platforms (F8).
                </p>
              </div>

              <div className="rounded-2xl border border-line p-4 bg-surface2/60">
                <b className="text-brand text-sm flex items-center gap-1.5">
                  <Workflow size={15} />
                  <span>Structured 6-Step Implementation Lifecycle</span>
                </b>
                <p className="text-muted mt-1.5">
                  Each sub-domain progresses from a read-only industry template (KG0) to an interactive client nuance refinement (KG1), finalization, and multi-format telemetry data ingestion (KG2).
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setCanonModalOpen(false)}
                className="btn-primary btn-sm px-5 py-2 font-semibold"
              >
                Close &amp; Return to Graph
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
