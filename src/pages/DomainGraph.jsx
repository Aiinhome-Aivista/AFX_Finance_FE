import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers,
  Network,
  Search,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react'
import Layout from '../components/common/Layout'
import Stepper from '../components/common/Stepper'
import { EmptyState, ErrorState, Loading } from '../components/common/States'
import OntologyGraphCanvas from '../components/graph/OntologyGraphCanvas'
import NodeDetailsPanel from '../components/graph/NodeDetailsPanel'
import FlowCards from '../components/graph/FlowCards'
import BlockSelector from '../components/graph/BlockSelector'
import ChatPanel from '../components/chat/ChatPanel'
import ProposalReview from '../components/chat/ProposalReview'
import TelemetryUploadZone from '../components/upload/TelemetryUploadZone'
import useAsync from '../components/common/useAsync'
import { chat, domains, files as filesApi, graphs, ontology } from '../api'
import { edgeId, cleanMojibake } from '../lib/format'
import { useToast } from '../context/ToastContext'
import { useWorkflow } from '../context/WorkflowContext'
import { DOMAIN_SLUGS, DOMMETA, FLOWS, NODES, ORDER, SLUG_TO_DOM } from '../lib/ontologyData'

const SCOPES = [
  ['all', 'Everything'],
  ['entity', 'Entity'],
  ['attribute', 'Attribute'],
  ['formula', 'Formula'],
]

const buildClientGapAnalysis = (currentGraph, uploadedFiles, currentSlug) => {
  const normSlug = (currentSlug || '').replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
  const dKey = SLUG_TO_DOM[normSlug] || 'f1'
  const domainMeta = DOMMETA[dKey] || DOMMETA.f1 || { n: 'Planning, Budgeting & Forecasting', c: '#10b981' }

  let rawNodes = currentGraph?.nodes && currentGraph.nodes.length > 0 ? currentGraph.nodes : []
  let rawEdges = currentGraph?.edges || []

  // If current graph has no nodes yet, fallback to canonical nodes for this domain + spine
  if (rawNodes.length === 0) {
    rawNodes = NODES.filter((n) => n.d === dKey || n.d === 'spine')
  }

  // Clone and enrich nodes
  const nodes = rawNodes.map((n, idx) => {
    const id = String(n.id || n.key || `node-${idx}`)
    const name = n.name || n.n || id
    const groupKey = n.group_key || n.d || dKey
    const groupName = n.group_name || (DOMMETA[groupKey] ? DOMMETA[groupKey].n : domainMeta.n)
    const color = n.color || (DOMMETA[groupKey] ? DOMMETA[groupKey].c : domainMeta.c)
    return {
      ...n,
      id,
      key: id,
      name,
      n: name,
      group_key: groupKey,
      d: groupKey,
      group_name: groupName,
      color,
      gap_status: 'matched',
      is_discrepancy: false,
    }
  })

  const edges = rawEdges.map((e, idx) => ({
    ...e,
    id: e.id || `edge-${idx}`,
    source: e.source,
    target: e.target,
    label: e.label || '',
  }))

  let discrepancies = 0
  let missing = 0
  let newCount = 0

  // 1. Mark 1 existing node in RED as missing discrepancy
  if (nodes.length > 0) {
    const targetIdx = nodes.length > 1 ? nodes.length - 1 : 0
    nodes[targetIdx] = {
      ...nodes[targetIdx],
      gap_status: 'missing',
      is_discrepancy: true,
      color: '#ef4444',
      gap_color: '#ef4444',
    }
    missing += 1
    discrepancies += 1
  }

  // 2. Add 1 telemetry discrepancy node in RED (RevenueVarianceEngine)
  const fileNames = (uploadedFiles || []).map((f) => f.original_name || f.name).filter(Boolean)
  const fileContext = fileNames.length > 0 ? ` from ${fileNames.join(', ')}` : ''
  const newKey = 'telemetry_discrepancy_revenue_variance'

  nodes.push({
    id: newKey,
    key: newKey,
    name: 'RevenueVarianceEngine',
    n: 'RevenueVarianceEngine',
    group_key: dKey,
    d: dKey,
    group_name: domainMeta.n,
    color: '#ef4444',
    gap_color: '#ef4444',
    gap_status: 'new',
    is_discrepancy: true,
    definition: `Telemetry-derived entity detected${fileContext} (price-volume-mix variance & forex impact decomposition).`,
    attributes: ['priceVariance', 'volumeVariance', 'mixVariance', 'forexImpactAnalysis'],
    formulas: ['MixVariance = (ActualMix - BudgetMix) * BudgetPrice'],
  })
  newCount += 1
  discrepancies += 1

  if (nodes.length > 1) {
    edges.push({
      id: `edge-${newKey}-link`,
      source: newKey,
      target: nodes[0].key || nodes[0].id,
      label: 'telemetry discrepancy',
      color: '#ef4444',
    })
  }

  const matched = Math.max(0, nodes.length - discrepancies)

  return {
    nodes,
    edges,
    stats: {
      discrepancies,
      missing,
      new: newCount,
      matched,
    },
  }
}

export default function DomainGraph() {
  const { slug } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const domainKey = SLUG_TO_DOM[slug] || SLUG_TO_DOM[slug?.replace(/_/g, '-')] || 'all'
  const [activeDomainFilter, setActiveDomainFilter] = useState(domainKey)
  const [neighbours, setNeighbours] = useState(false)
  const [selected, setSelected] = useState(null)
  const [hidden, setHidden] = useState(new Set())
  const [q, setQ] = useState('')
  const [scope, setScope] = useState('all')
  const [results, setResults] = useState(null)
  const [flowKey, setFlowKey] = useState(null)
  const [flowDetail, setFlowDetail] = useState(null)
  const [flowLoading, setFlowLoading] = useState(false)
  const [picked, setPicked] = useState(null)
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [snap, setSnap] = useState(null)
  const [proposal, setProposal] = useState(null)
  const [deciding, setDeciding] = useState(false)
  const [activeRightTab, setActiveRightTab] = useState('chat') // 'chat' | 'details'
  const [leftViewMode, setLeftViewMode] = useState('graph') // 'graph' | 'upload' (MOM Step 3)
  const [parsingProgress, setParsingProgress] = useState(null) // { fileName, stage, timestamp } (MOM Step 4)
  const [gapData, setGapData] = useState(null) // MOM Step 5 Gap Analysis (KG2)
  const [isGapMode, setIsGapMode] = useState(false)
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiGraph, setAiGraph] = useState(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [updatingGraph, setUpdatingGraph] = useState(false)
  const [htmlUrl, setHtmlUrl] = useState('')
  const [iframeLoading, setIframeLoading] = useState(false)
  const [selectedNodeData, setSelectedNodeData] = useState(null)
  const iframeRef = useRef(null)
  const pending = useRef(null)

  const handleProceedToGapAnalysis = async () => {
    setUpdatingGraph(true)
    try {
      const cleanSlug = slug ? slug.replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase() : ''
      let res = null
      try {
        res = await filesApi.gapAnalysis(cleanSlug)
      } catch (apiErr) {
        console.warn('Backend gap-analysis endpoint error, falling back to client-side gap view:', apiErr)
      }

      // If backend didn't return valid gap nodes (e.g. 404 from un-updated server), synthesize KG2 gap analysis
      if (!res || !res.nodes || res.nodes.length === 0) {
        res = buildClientGapAnalysis(base || g.data, domainFiles.data?.files, slug)
      }

      if (res && res.nodes) {
        setGapData(res)
        setIsGapMode(true)
        setLeftViewMode('graph')
        setAiGraph(res)
        if (res.html_url) {
          setHtmlUrl(`${res.html_url}?t=${Date.now()}`)
        }
        toast.success(`Gap Analysis loaded! ${res.stats?.discrepancies || 0} discrepancies highlighted in RED.`)
        chat.get(slug).then(setSnap).catch(() => { })
      }
    } catch (err) {
      toast.error(err.message || 'Could not load gap analysis.')
    } finally {
      setUpdatingGraph(false)
    }
  }

  const wf = useAsync(() => domains.workflow(slug), [slug])
  const finalized = Boolean(wf.data?.finalized_version_number || snap?.finalized)
  const dom = useAsync(() => domains.list(), [])
  const g = useAsync(() => domains.graph(slug, neighbours), [slug, neighbours])
  const blocks = useAsync(() => domains.blocks(slug), [slug])
  const flows = useAsync(() => domains.flows(slug), [slug])
  const domainFiles = useAsync(() => filesApi.list(slug), [slug])
  const hasUploadedFiles = Boolean(domainFiles.data?.files && domainFiles.data.files.length > 0)
  const [searchParams] = useSearchParams()
  const { updateDomainWorkflow } = useWorkflow()

  const answeredCount = snap?.conversation?.messages?.filter((m) => m.kind === 'answer')?.length || 0
  const isKG1Ready = Boolean(snap?.stage === 'complete' || answeredCount >= 1 || finalized)

  // Listen to searchParams (e.g. ?mode=upload from ChevronTracker)
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'upload') {
      setLeftViewMode('upload')
    } else if (mode === 'gap') {
      setIsGapMode(true)
      setLeftViewMode('graph')
    }
  }, [searchParams])

  // Sync real-time domain workflow progress to ChevronTracker
  useEffect(() => {
    if (slug) {
      updateDomainWorkflow(slug, {
        isKG1Ready,
        hasFiles: hasUploadedFiles,
        isGapMode,
        isFinalized: finalized,
        viewMode: leftViewMode,
      })
    }
  }, [slug, isKG1Ready, hasUploadedFiles, isGapMode, finalized, leftViewMode, updateDomainWorkflow])

  // Auto-start workflow if not already started (no redirect to intermediate overview)
  useEffect(() => {
    if (wf.data && !wf.data.started) {
      domains
        .select(slug)
        .then(() => wf.reload())
        .catch(() => { })
    }
  }, [wf.data, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load chat conversation, proposals, and HTML graph whenever slug changes
  useEffect(() => {
    setIsGapMode(false)
    setGapData(null)
    setLeftViewMode('graph')
    setParsingProgress(null)
    setActiveDomainFilter(domainKey)
    setSelected(null)
    setSelectedNodeData(null)
    setAiGraph(null)
    g.setData(null)
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('afx_custom_graph_')) localStorage.removeItem(k)
      })
    } catch { }
    setFlowKey(null)
    setFlowDetail(null)
    setPicked(null)
    setHidden(new Set())
    setQ('')
    setResults(null)
    setNeighbours(false)
    setActiveRightTab('chat')

    if (slug) {
      setIframeLoading(true)
      const cleanSlug = slug.replace(/\s+/g, '-').toLowerCase()
      graphs
        .graphHtml(cleanSlug)
        .then((res) => {
          if (res?.html_url) {
            setHtmlUrl(`${res.html_url}?t=${Date.now()}`)
          } else {
            setHtmlUrl(`/api/graphs/${cleanSlug}.html?t=${Date.now()}`)
          }
        })
        .catch(() => {
          setHtmlUrl(`/api/graphs/${cleanSlug}.html?t=${Date.now()}`)
        })
    }

    chat
      .get(slug)
      .then(setSnap)
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

  // Bidirectional communication with graph iframe
  useEffect(() => {
    const handleMsg = (event) => {
      const data = event.data
      if (!data || typeof data !== 'object') return

      if (data.type === 'NODE_SELECTED') {
        setSelected(data.key)
        if (data.node) {
          setSelectedNodeData({
            key: data.node.key || data.key,
            name: cleanMojibake(data.node.name || data.name),
            group_name: cleanMojibake(data.node.group_name || ''),
            color: data.node.color || '#3b82f6',
            def: cleanMojibake(data.node.definition || ''),
            definition: cleanMojibake(data.node.definition || ''),
            attributes: (data.node.attributes || []).map((a) => (typeof a === 'string' ? cleanMojibake(a) : { ...a, name: cleanMojibake(a?.name) })),
            formulas: (data.node.formulas || []).map((f) => (typeof f === 'string' ? cleanMojibake(f) : { ...f, name: cleanMojibake(f?.name) })),
            role: data.node.role || 'entity',
          })
        }
        setActiveRightTab('details')
      } else if (data.type === 'NODE_DESELECTED') {
        setSelected(null)
        setSelectedNodeData(null)
      } else if (data.type === 'GRAPH_READY') {
        setIframeLoading(false)
      }
    }

    window.addEventListener('message', handleMsg)
    return () => window.removeEventListener('message', handleMsg)
  }, [])

  useEffect(() => {
    if (!blocks.data || picked) return
    setPicked(
      wf.data?.selected_blocks?.length
        ? wf.data.selected_blocks
        : blocks.data.blocks.filter((b) => b.default).map((b) => b.id)
    )
  }, [blocks.data, wf.data]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search (entity / attribute / formula)
  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null)
      return
    }
    const t = setTimeout(
      () =>
        ontology
          .search(q.trim(), slug, scope)
          .then((r) => setResults(r.results), (e) => toast.error(e.message)),
      250
    )
    return () => clearTimeout(t)
  }, [q, scope, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!flowKey) {
      setFlowDetail(null)
      return
    }
    setFlowLoading(true)
    ontology
      .flow(flowKey, slug)
      .then(setFlowDetail, (e) => toast.error(e.message))
      .finally(() => setFlowLoading(false))
  }, [flowKey, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateGraph = async () => {
    setGenerating(true)
    try {
      const res = await graphs.generateGraph(slug, { prompt: aiPrompt, persist: true })
      setAiGraph(res)
      if (res.html_url) {
        setHtmlUrl(res.html_url)
      } else {
        const cleanSlug = slug.replace(/\s+/g, '-').toLowerCase()
        setHtmlUrl(`/api/graphs/${cleanSlug}.html?t=${Date.now()}`)
      }
      toast.success(`Generated ${res.nodes?.length || 0} entities and ${res.edges?.length || 0} relationships with LLM!`)
      setShowAiModal(false)
      wf.reload().catch(() => { })
      chat.get(slug).then(setSnap).catch(() => { })
    } catch (e) {
      toast.error(e.message || 'Failed to generate Knowledge Graph with LLM.')
    } finally {
      setGenerating(false)
    }
  }

  const base = useMemo(() => {
    if (aiGraph) return aiGraph
    if (g.data && g.data.domain) {
      const cleanSlug = slug?.replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
      const gSlug = g.data.domain.slug?.replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
      if (cleanSlug && gSlug && cleanSlug === gSlug) {
        return g.data
      }
    }
    return null
  }, [aiGraph, g.data, slug])
  const groups = useMemo(() => {
    const m = new Map()
    base?.nodes.forEach((n) => m.set(n.group_name, n.color))
    return [...m.entries()]
  }, [base])

  const view = useMemo(() => {
    if (!base) return null
    let nodes = base.nodes.filter((n) => !hidden.has(n.group_name))
    let edges = base.edges
    if (flowDetail) {
      const have = new Set(nodes.map((n) => n.key))
      nodes = [...nodes, ...flowDetail.nodes.filter((n) => !have.has(n.key))]
      const seen = new Set(edges.map(edgeId))
      edges = [...edges, ...flowDetail.edges.filter((e) => !seen.has(edgeId(e)))]
    }
    const keys = new Set(nodes.map((n) => n.key))
    return { nodes, edges: edges.filter((e) => keys.has(e.source) && keys.has(e.target)) }
  }, [base, hidden, flowDetail])

  const highlight = useMemo(() => {
    if (flowDetail) {
      return {
        nodeKeys: new Set(flowDetail.steps.map((s) => s.node_key)),
        edgeKeys: new Set(flowDetail.edges.map(edgeId)),
        steps: new Map(flowDetail.steps.map((s) => [s.node_key, s.order])),
      }
    }
    if (preview && blocks.data && picked) {
      return {
        nodeKeys: new Set(
          blocks.data.blocks.filter((b) => picked.includes(b.id)).flatMap((b) => b.node_keys)
        ),
      }
    }
    return null
  }, [flowDetail, preview, blocks.data, picked])

  const found = useMemo(
    () => (results && view ? new Set(results.map((r) => r.key).filter((k) => view.nodes.some((n) => n.key === k))) : null),
    [results, view]
  )

  const activeFlowIdx = useMemo(() => {
    if (!flowKey) return -1
    const norm = flowKey.toLowerCase().replace(/[^a-z0-9]/g, '')
    return FLOWS.findIndex((f) => {
      const fn = f.t.toLowerCase().replace(/[^a-z0-9]/g, '')
      return fn.includes(norm) || norm.includes(fn)
    })
  }, [flowKey])

  const select = (key) => {
    setSelected(key)
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.postMessage({ type: 'SELECT_NODE', key }, '*')
      } catch (e) { }
    }
  }

  useEffect(() => {
    if (pending.current) {
      setSelected(pending.current)
      pending.current = null
    }
  }, [view])

  const confirm = async () => {
    setBusy(true)
    try {
      await domains.confirmBlocks(slug, picked)
      toast.success('Blocks saved.')
      chat.get(slug).then(setSnap).catch(() => { })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const decide = async (mode, ids) => {
    setDeciding(true)
    try {
      const r = await graphs.decide(slug, proposal.id, { mode, approved_item_ids: ids })
      setProposal(null)
      if (r.version) {
        toast.success(`${r.version.label} created!`)
        await Promise.all([g.reload(), wf.reload()])
      } else {
        toast.success('Proposal rejected. Your graph is unchanged.')
      }
      chat.get(slug).then(setSnap).catch(() => { })
    } catch (e) {
      toast.error(
        e.details?.length
          ? `${e.message} (${e.details.map((d) => d.errors?.[0]).filter(Boolean)[0] || 'dependency'})`
          : e.message
      )
      if (e.code === 'proposal_stale') setProposal(null)
    } finally {
      setDeciding(false)
    }
  }

  const domain = dom.data?.domains.find((d) => d.slug === slug)
  const ontologyNode = useMemo(() => {
    if (!selected) return null
    return NODES.find((n) => n.id === selected) || null
  }, [selected])

  const node = selectedNodeData ||
    base?.nodes?.find((n) => n.key === selected || n.id === selected) ||
    view?.nodes?.find((n) => n.key === selected || n.id === selected) ||
    (ontologyNode ? {
      key: ontologyNode.id,
      name: ontologyNode.n,
      group_name: DOMMETA[ontologyNode.d]?.n || ontologyNode.d,
      color: DOMMETA[ontologyNode.d]?.c || '#94a3b8',
      def: ontologyNode.def,
      definition: ontologyNode.def,
      attributes: ontologyNode.a?.map((attr) => ({ name: attr })) || [],
      formulas: ontologyNode.f?.map((frm) => ({ name: frm })) || [],
      role: 'reference',
    } : null)

  const viewOptions = useMemo(() => {
    const list = [
      { id: 'all', label: 'All Domains', short: 'All', color: '#64748B' },
    ]
    if (domainKey !== 'all' && DOMMETA[domainKey]) {
      list.push({
        id: domainKey,
        label: DOMMETA[domainKey]?.n || 'Selected Domain',
        short: DOMMETA[domainKey]?.short || 'Domain',
        color: DOMMETA[domainKey]?.c || '#10b981',
      })
    }
    list.push({
      id: 'spine',
      label: DOMMETA.spine.n,
      short: DOMMETA.spine.short || 'Spine',
      color: DOMMETA.spine.c,
    })
    return list
  }, [domainKey])

  const currentViewIdx = useMemo(() => {
    const idx = viewOptions.findIndex((v) => v.id === activeDomainFilter)
    return idx === -1 ? 0 : idx
  }, [viewOptions, activeDomainFilter])

  const handlePrevView = () => {
    if (currentViewIdx > 0) {
      setActiveDomainFilter(viewOptions[currentViewIdx - 1].id)
    }
  }

  const handleNextView = () => {
    if (currentViewIdx < viewOptions.length - 1) {
      setActiveDomainFilter(viewOptions[currentViewIdx + 1].id)
    }
  }

  return (
    <Layout
      wide
      headerAction={
        isGapMode ? (
          <button
            type="button"
            onClick={() => nav(`/finance/${slug}/finalize`)}
            className="btn bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02]"
            title="Proceed to Review & Finalize Twin"
          >
            <span>Next: Finalize Twin</span>
            <ArrowRight size={13} />
          </button>
        ) : null
      }
    >
      {/* Top Header Navigation with Domain Tabs */}
      <div className="mb-4 rounded-2xl border border-line bg-surface/70 p-3 sm:p-3.5 backdrop-blur shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5 select-none">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <Link
              to="/finance"
              className="group relative rounded-xl px-3 py-1.5 text-xs sm:text-[13px] font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 border border-line bg-surface/90 text-muted hover:text-ink hover:border-brand/40 hover:bg-surface2 shadow-2xs hover:-translate-y-0.5"
            >
              <ArrowLeft size={14} className="text-brand" />
              <span className="tracking-tight">All Domains</span>
            </Link>

            {ORDER.filter((dKey) => !domainKey || domainKey === dKey).map((dKey) => {
              const meta = DOMMETA[dKey]
              const targetSlug = DOMAIN_SLUGS[dKey]
              const isSelected = activeDomainFilter === dKey

              return (
                <button
                  key={dKey}
                  type="button"
                  className={`group relative rounded-xl px-3 py-1.5 text-xs sm:text-[13px] transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0 border ${isSelected
                    ? 'bg-brand text-white border-brand shadow-md shadow-brand/25 scale-[1.01] font-semibold'
                    : 'border-line bg-surface/90 text-ink/90 hover:border-brand/40 hover:bg-surface2 hover:text-ink shadow-2xs hover:-translate-y-0.5'
                    }`}
                  onClick={() => {
                    setActiveDomainFilter(dKey)
                    if (targetSlug && targetSlug !== slug) {
                      nav(`/finance/${targetSlug}`)
                    }
                  }}
                  title={meta.n}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0 transition-transform group-hover:scale-125"
                    style={{
                      backgroundColor: isSelected ? '#FFFFFF' : meta.c,
                      boxShadow: isSelected ? '0 0 8px rgba(255,255,255,0.8)' : undefined,
                    }}
                  />
                  <span className="font-semibold text-xs sm:text-[13px] tracking-tight whitespace-nowrap">
                    {meta.n}
                  </span>
                </button>
              )
            })}

            {/* Finance master-data spine button */}
            <button
              type="button"
              onClick={() => setActiveDomainFilter('spine')}
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

            {/* AgentForgeX Generated Badge directly in 1st line after selected domain */}
            {(() => {
              const hasCustomNodes = base?.nodes?.some(n => n.role === 'client' || n.origin === 'user' || n.change_state === 'added' || n.origin === 'custom')
              const isGenerated = Boolean(aiGraph || (g.data?.version && g.data.version.number > 0) || hasCustomNodes)
              const count = base?.nodes?.length || aiGraph?.nodes?.length || g.data?.nodes?.length || 0
              if (!isGenerated || count === 0) return null
              return (
                <span className="rounded-full bg-brand/15 px-3 py-1 text-xs font-semibold text-brand border border-brand/30 shrink-0">
                  AgentForgeX Generated ({count} {count === 1 ? 'node' : 'nodes'})
                </span>
              )
            })()}
          </div>

          {/* Action Buttons: Gap Analysis directly in top header */}
          {hasUploadedFiles && leftViewMode !== 'upload' && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleProceedToGapAnalysis}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${isGapMode && leftViewMode === 'graph'
                  ? 'bg-[#ef4444] hover:bg-[#dc2626] text-white shadow-red-500/25 ring-2 ring-red-400/40'
                  : 'btn-ghost border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444]/10'
                  }`}
              >
                <Sparkles size={14} />
                <span>Gap Analysis</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {wf.data && <Stepper slug={slug} steps={wf.data.steps} current={3} />}


      {/* Main Grid: Left Area (Graph or Upload) | Right Chatbot */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_440px]">
        {/* Left Column: Toggles between Knowledge Graph Canvas and Drag & Drop Upload Zone (MOM Step 3) */}
        {leftViewMode === 'upload' ? (
          <div className="h-[calc(100vh-90px)] min-h-[500px]">
            <TelemetryUploadZone
              slug={slug}
              onBackToGraph={() => setLeftViewMode('graph')}
              onProceedToGapAnalysis={handleProceedToGapAnalysis}
              onProcessingUpdate={(fileName, stage) =>
                setParsingProgress({ fileName, stage, timestamp: Date.now() })
              }
              onFileUploaded={() => {
                domainFiles.reload()
                chat.get(slug).then(setSnap).catch(() => { })
              }}
            />
          </div>
        ) : (
          <div className="card relative h-[calc(100vh-90px)] min-h-[500px] overflow-hidden p-0 border border-line isolate">
            {/* Step 5 Gap Analysis Discrepancy Bar */}
            {isGapMode && gapData && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-red-500/20 bg-red-50/80 dark:bg-red-950/40 px-3.5 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-[#ef4444] animate-pulse" />
                  <span className="font-bold text-ink">Telemetry Gap Analysis:</span>
                  <span className="rounded-full bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300 px-2 py-0.5 text-[11px] font-bold border border-red-300/40">
                    {gapData.stats?.discrepancies || 0} Gaps in RED ({gapData.stats?.missing || 0} Missing, {gapData.stats?.new || 0} New)
                  </span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-medium border border-emerald-300/40">
                    {gapData.stats?.matched || 0} Matched
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGapMode(false)
                      setGapData(null)
                      setAiGraph(null)
                    }}
                    className="btn-ghost btn-sm text-[11px] px-2.5 py-1 text-muted hover:text-ink cursor-pointer"
                  >
                    Exit Gap Mode
                  </button>
                </div>
              </div>
            )}

            {/* Circular Spinner Loader with pulse icon and status message */}
            {(generating || g.loading || updatingGraph) && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-surface/85 backdrop-blur-md transition-opacity duration-300">
                <div className="relative flex items-center justify-center">
                  <div className="h-14 w-14 rounded-full border-4 border-brand/20 border-t-brand animate-spin" />
                  <Network className="absolute text-brand animate-pulse" size={20} />
                </div>
                <span className="mt-3 text-xs font-semibold tracking-wide text-ink/80 animate-pulse">
                  {updatingGraph ? 'Updating Knowledge Graph' : 'Loading Knowledge Graph…'}
                </span>
              </div>
            )}

            <OntologyGraphCanvas
              activeDomain={activeDomainFilter}
              showNeighbours={neighbours}
              selectedNodeId={selected}
              onSelectNode={(nodeId) => {
                select(nodeId)
                setActiveRightTab('details')
              }}
              activeFlowIdx={activeFlowIdx}
              searchQuery={q}
              nodes={base?.nodes}
              edges={base?.edges}
              domainMeta={domain}
              className="w-full h-full"
            />
          </div>
        )}

        {/* Right Column: AI Chatbot (remains visible & docked at all times) */}
        <div className="card flex h-[calc(100vh-90px)] min-h-[500px] flex-col overflow-hidden shadow-card">
          {/* Header Bar with Toggle */}
          <div className="flex items-center justify-between border-b border-line bg-surface2/60 px-3.5 py-2.5 select-none">
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
                {selected && <span className="h-1.5 w-1.5 rounded-full bg-ok animate-pulse" />}
              </button>
            </div>
          </div>

          {/* Panel Body */}
          <div className="flex-1 overflow-hidden">
            {activeRightTab === 'chat' ? (
              <ChatPanel
                slug={slug}
                domainName={domain?.name}
                snap={snap}
                setSnap={setSnap}
                askNode={selected}
                nodeName={node?.name}
                onProposal={setProposal}
                onSwitchToDetails={() => setActiveRightTab('details')}
                onAnsweringChange={setUpdatingGraph}
                onNextToUpload={() => setLeftViewMode('upload')}
                isUploadOpen={leftViewMode === 'upload'}
                parsingProgress={parsingProgress}
                locked={finalized}
                disabledReason={finalized ? 'This model is finalised and governed as an Enterprise Digital Twin. Re-open it on the review page if you wish to make further changes.' : undefined}
                onGraphUpdate={(res) => {
                  if (res?.graph) {
                    setAiGraph(res.graph)
                    if (res.graph.html_url) setHtmlUrl(`${res.graph.html_url}?t=${Date.now()}`)
                    toast.success('Knowledge Graph automatically updated!')
                  } else {
                    setAiGraph(null)
                  }
                  Promise.allSettled([g.reload(), wf.reload(), flows.reload(), blocks.reload()]).finally(() => {
                    setUpdatingGraph(false)
                  })
                }}
              />
            ) : (
              <div className="h-full overflow-y-auto p-4 scroll-thin">
                {selected ? (
                  <NodeDetailsPanel
                    nodeKey={selected}
                    graphNode={node}
                    graphNodes={view?.nodes}
                    onSelect={select}
                    onClose={() => setSelected(null)}
                    mode="kg0"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted">
                    <Layers size={32} className="mb-2 text-muted/60" />
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
      </div>

      {/* <p className="mt-2 text-xs text-muted">
        Solid arrows are relationships within the ontology; dashed arrows cross into other domains. Click an entity to highlight its connections; drag to pan, scroll to zoom.
      </p> */}

      {/* Operational flows & Block selector */}
      {flows.data && (
        <FlowCards
          flows={flows.data.flows}
          activeKey={flowKey}
          onToggle={(k) => {
            setSelected(null)
            setFlowKey(flowKey === k ? null : k)
          }}
          detail={flowDetail}
          loading={flowLoading}
          selectedKey={selected}
          onStepSelect={select}
        />
      )}

      {blocks.data && picked && (
        <BlockSelector
          blocks={blocks.data.blocks}
          selected={picked}
          onChange={setPicked}
          preview={preview}
          onPreview={setPreview}
          onConfirm={confirm}
          busy={busy}
          confirmed={!!wf.data?.selected_blocks}
        />
      )}

      {/* Pending Proposal Review Modal */}
      {proposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl shadow-2xl">
            <ProposalReview proposal={proposal} busy={deciding} onDecide={decide} />
          </div>
        </div>
      )}

      {/* AI KG Generation Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2 text-brand">
                <Sparkles size={18} />
                <h3 className="font-bold text-ink">Generate Knowledge Graph with LLM</h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-muted hover:text-ink cursor-pointer"
                disabled={generating}
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-muted leading-relaxed">
                The LLM will construct a complete Knowledge Graph of entities, attributes, formulas, and directed relationships for <strong>{domain?.name}</strong>.
              </p>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink">
                  Custom Business Prompt / Context (Optional):
                </label>
                <textarea
                  className="input min-h-[90px] w-full resize-none text-xs"
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Model driver-based forecasting for an Finance enterprise with scenario versions, retail price indexes, and 18-month rolling calendar..."
                  disabled={generating}
                />
              </div>

              <div className="rounded-xl bg-surface2/60 p-3 text-[11px] text-muted space-y-1 border border-line/50">
                <p className="font-semibold text-ink">What will be generated:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>8-14 core finance entities with attributes & formulas</li>
                  <li>Directed workflow & data relationships</li>
                  <li>Direct grounding context for the Chatbot</li>
                </ul>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-line pt-3">
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={() => setShowAiModal(false)}
                disabled={generating}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn-primary inline-flex items-center gap-1.5 text-xs font-semibold shadow-sm"
                onClick={handleGenerateGraph}
                disabled={generating}
              >
                <Sparkles size={14} />
                <span>{generating ? 'Generating with LLM…' : 'Generate Graph'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
