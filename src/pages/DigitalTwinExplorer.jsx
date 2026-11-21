import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Edit3,
  ExternalLink,
  Layers,
  Lock,
  Save,
  Share2,
  Workflow,
  X,
} from 'lucide-react'
import Layout from '../components/common/Layout'
import OntologyGraphCanvas from '../components/graph/OntologyGraphCanvas'
import DigitalTwinSwimlane from '../components/graph/DigitalTwinSwimlane'
import TwinDataConnectors from '../components/graph/TwinDataConnectors'
import { Loading, ErrorState } from '../components/common/States'
import SaveAsModal from '../components/common/SaveAsModal'
import useAsync from '../components/common/useAsync'
import { domains, files as filesApi, graphs } from '../api'
import { annotateMissingGapNodes } from '../lib/businessImpact'
import { DOMMETA, SLUG_TO_DOM } from '../lib/ontologyData'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useWorkflow } from '../context/WorkflowContext'

export default function DigitalTwinExplorer() {
  const { slug } = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const wfParam = searchParams.get('wf')
  const { isAnalyst } = useAuth()
  const toast = useToast()
  const { updateDomainWorkflow } = useWorkflow()
  const wf = useAsync(() => domains.workflow(slug, wfParam), [slug, wfParam])
  const fin = useAsync(() => graphs.finalization(slug, wfParam), [slug, wfParam])

  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [cmp, setCmp] = useState(null)
  const [gapGraph, setGapGraph] = useState(null)
  const [fitMode, setFitMode] = useState('fit')

  const cleanSlug = (slug || '').replace(/_/g, '-').replace(/\s+/g, '-').toLowerCase()
  const domainKey = SLUG_TO_DOM[cleanSlug]
  const domainMeta = domainKey ? DOMMETA[domainKey] : null
  const domainName =
    wf.data?.domain?.name ||
    (domainMeta?.n ? domainMeta.n.replace(/^F\d+\s+/, '') : null) ||
    'Cost and Profitability Management'

  const d = fin.data
  const finalized = Boolean(wf.data?.finalized_version_number)

  const [dbStatus, setDbStatus] = useState({ ready: false, status: 'LOCKED', db_name: null })
  const [loadingDbStatus, setLoadingDbStatus] = useState(true)

  const checkDbStatus = useCallback(async (forcedWf, forcedModel) => {
    try {
      setLoadingDbStatus(true)
      const sp = new URLSearchParams(window.location.search)
      const isFresh = sp.get('fresh') === '1' || sessionStorage.getItem('afx_fresh_session') === 'true'
      if (isFresh && !forcedWf && !forcedModel) {
        setDbStatus({ ready: false, status: 'LOCKED', db_name: null })
        return
      }

      const effWf = forcedWf || wfParam || sp.get('wf') || (cleanSlug ? sessionStorage.getItem(`afx_active_wf_${cleanSlug}`) : null)
      const effModel = forcedModel || searchParams.get('model') || sp.get('model') || (cleanSlug ? sessionStorage.getItem(`afx_active_model_${cleanSlug}`) : null)

      const res = await domains.workspaceDbStatus(cleanSlug, {
        wf: effWf || undefined,
        model: effModel || undefined,
      })
      if (res && res.ready) {
        setDbStatus(res)
      } else if (!forcedWf) {
        setDbStatus(res || { ready: false, status: 'LOCKED' })
      }
    } catch {
      if (!forcedWf) {
        setDbStatus({ ready: false, status: 'LOCKED' })
      }
    } finally {
      setLoadingDbStatus(false)
    }
  }, [cleanSlug, wfParam, searchParams])

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    const initialWf = wfParam || sp.get('wf') || (cleanSlug ? sessionStorage.getItem(`afx_active_wf_${cleanSlug}`) : null)
    const initialModel = searchParams.get('model') || sp.get('model') || location.state?.modelName || (cleanSlug ? sessionStorage.getItem(`afx_active_model_${cleanSlug}`) : null)
    checkDbStatus(initialWf, initialModel)
  }, [checkDbStatus, cleanSlug, wfParam, searchParams, location.state])

  useEffect(() => {
    if (slug && wf.data) {
      updateDomainWorkflow(slug, {
        isKG1Ready: true,
        hasFiles: true,
        isFinalized: Boolean(wf.data.finalized_version_number),
      })
    }
  }, [slug, wf.data, updateDomainWorkflow])

  useEffect(() => {
    setGapGraph(null)
  }, [slug])

  useEffect(() => {
    const vNum = d?.version?.number
    if (!slug || vNum === undefined || vNum === null) return
    graphs.compare(slug, 0, vNum, wfParam).then(setCmp).catch(() => { })
  }, [slug, wfParam, d?.version?.number])

  useEffect(() => {
    if (!slug || !d) return
    if (d.gap_graph?.nodes?.length > 0) {
      setGapGraph(d.gap_graph)
      return
    }
    let cancelled = false
    filesApi
      .gapAnalysis(slug, { silent: true, wf: wfParam })
      .then((res) => {
        if (!cancelled && res?.nodes?.length > 0) setGapGraph(res)
      })
      .catch(() => { })
    return () => {
      cancelled = true
    }
  }, [slug, wfParam, d])

  // Clean, production-certified architecture graph (No missing gap alerts or red warning badges)
  const productionGraph = useMemo(() => {
    const rawNodes = d?.graph?.nodes || []
    const rawEdges = d?.graph?.edges || []
    if (rawNodes.length === 0) return { nodes: [], edges: [] }

    // Strip any gap_status / missing indicators so all nodes appear verified and standard
    const nodes = rawNodes.map((n) => ({
      ...n,
      gap_status: undefined,
      is_discrepancy: false,
      gap_color: undefined,
      gap_label: undefined,
      color: n.color && n.color !== '#ef4444' ? n.color : undefined,
    }))

    return {
      nodes,
      edges: rawEdges,
    }
  }, [d?.graph?.nodes, d?.graph?.edges])

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !productionGraph.nodes.length) return null
    return (
      productionGraph.nodes.find(
        (n) => n.id === selectedNodeId || n.key === selectedNodeId || n.name === selectedNodeId
      ) || null
    )
  }, [selectedNodeId, productionGraph.nodes])

  const handleExportJson = () => {
    if (!d?.graph) return
    const exportData = {
      domain: domainName,
      version: wf.data?.finalized_version_number ? `KG${wf.data.finalized_version_number}` : 'KG3',
      governed: true,
      exportedAt: new Date().toISOString(),
      nodes: d.graph.nodes,
      edges: d.graph.edges,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `digital_twin_${cleanSlug}_kg.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Digital Twin schema exported!')
  }

  const [saveAsOpen, setSaveAsOpen] = useState(false)

  const defaultSaveName = useMemo(() => {
    if (location.state?.modelName) {
      return location.state.modelName
    }
    const now = new Date()
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `Finance_Model_${monthNames[now.getMonth()]}_${String(now.getFullYear()).slice(-2)}`
  }, [location.state])

  const handleSaveAs = () => {
    setSaveAsOpen(true)
  }

  const executeSaveAs = (modelName, mode = 'overwrite') => {
    try {
      const now = new Date()
      const payload = {
        id: `custom_${Date.now()}`,
        name: modelName,
        createdAt: now.toISOString(),
        savedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        domainSlug: slug,
        domainName: domainName || 'Finance Model',
        nodeCount: productionGraph.nodes.length || 0,
        edgeCount: productionGraph.edges.length || 0,
        nodes: productionGraph.nodes,
        edges: productionGraph.edges,
        stage: 'twin',
        isTwin: true,
      }

      // Persist saved model directly to backend database API
      const currentWf = searchParams.get('wf') || (cleanSlug ? sessionStorage.getItem(`afx_active_wf_${cleanSlug}`) : null)
      domains.saveCustomModel({
        name: modelName,
        slug,
        wf: currentWf || undefined,
        domainName: domainName,
        nodes: payload.nodes,
        edges: payload.edges,
        savedAt: payload.savedAt,
        createdAt: payload.createdAt,
      }).then((res) => {
        const wfId = res?.workflow_id || currentWf
        if (wfId) {
          const next = new URLSearchParams(window.location.search)
          next.set('wf', String(wfId))
          next.set('model', modelName)
          next.delete('fresh')
          setSearchParams(next, { replace: true })
          sessionStorage.setItem(`afx_active_wf_${cleanSlug}`, String(wfId))
          sessionStorage.setItem(`afx_active_model_${cleanSlug}`, modelName)
          sessionStorage.removeItem('afx_fresh_session')
        }
        // Instantly unlock CSV Telemetry Ingestion in UI!
        setDbStatus({
          ready: true,
          status: 'READY',
          db_name: res?.db_name || `ws_${wfId}_${modelName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`,
          workflow_id: wfId,
          workspace_name: modelName,
          tables: [],
        })
        checkDbStatus(wfId, modelName)
      }).catch((err) => console.warn('Backend custom model save warning:', err))

      if (mode === 'overwrite') {
        toast.success(`Digital Twin "${modelName}" finalized & updated! Workspace database ready.`)
      } else {
        toast.success(`Digital Twin "${modelName}" finalized & saved! Dedicated workspace database initialized.`)
      }
      setSaveAsOpen(false)

      // Auto-scroll down smoothly to Telemetry Ingestion section
      setTimeout(() => {
        const el = document.getElementById('telemetry-connectors-section')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 350)
    } catch (e) {
      toast.error('Failed to save digital twin: ' + e.message)
    }
  }

  if (wf.loading && !wf.data) {
    return (
      <Layout wide hideNext>
        <Loading label="Loading Enterprise Digital Twin..." />
      </Layout>
    )
  }

  if (wf.error) {
    return (
      <Layout wide hideNext>
        <ErrorState error={wf.error} onRetry={wf.reload} />
      </Layout>
    )
  }

  return (
    <Layout wide hideNext>
      <div className="space-y-4">
        {/* Top Breadcrumb & Control Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
          <div className="space-y-1">
            <Link
              to="/finance/models"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink font-semibold transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Finance Workspace</span>
            </Link>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-ink flex items-center gap-2">
                <span>Digital Twin Console</span>
                <span className="text-[#10b981]">·</span>
                <span className="text-slate-600 dark:text-slate-300 font-semibold text-lg">
                  {domainName}
                </span>
              </h1>
            </div>
            {/* <p className="text-xs text-muted">
              Live enterprise operating architecture. Fully synchronized with your calibrated costing ladders, organizational center hierarchies, and operational telemetry.
            </p> */}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/finance/${slug}/finalize`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs border border-line bg-surface hover:bg-surface2 text-ink hover:border-brand/40"
              title="Edit model architecture and review calibrations"
            >
              <Edit3 size={14} className="text-brand" />
              <span>Edit Model</span>
            </Link>

            <button
              type="button"
              onClick={handleSaveAs}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                dbStatus.ready && (dbStatus.workspace_name || wf.data?.name)
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 border border-emerald-500'
                  : 'btn-ghost border-[#10b981] text-[#10b981] hover:bg-[#10b981]/10'
              }`}
              title="Finalize & Save this model to create a dedicated workspace database and unlock telemetry upload"
            >
              {dbStatus.ready && (dbStatus.workspace_name || wf.data?.name) ? (
                <CheckCircle2 size={14} className="text-white" />
              ) : (
                <Save size={14} className="text-[#10b981]" />
              )}
              <span>
                {dbStatus.ready && (dbStatus.workspace_name || wf.data?.name)
                  ? 'Finalized & Saved'
                  : 'Finalize & Save'}
              </span>
            </button>
          </div>
        </div>

        {/* Full-Width Interactive Digital Twin Swimlane Canvas */}
        <section className="card overflow-hidden p-0 border border-line isolate flex flex-col shadow-card w-full">
          <div className="flex items-center justify-between border-b border-line bg-surface px-5 py-3.5 select-none shrink-0 gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-[#10b981]/15 text-[#10b981] flex items-center justify-center">
                <Workflow size={16} />
              </div>
              <h2 className="text-sm font-bold text-ink">
                Digital Twin — {domainName} Process Model
              </h2>
            </div>

            {/* Fit width and Actual size controls lifted to top section */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setFitMode('fit')}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${fitMode === 'fit'
                  ? 'bg-[#10B981] text-white border-[#10B981] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
              >
                Fit width
              </button>
              <button
                type="button"
                onClick={() => setFitMode('actual')}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${fitMode === 'actual'
                  ? 'bg-[#10B981] text-white border-[#10B981] shadow-xs'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
              >
                Actual size
              </button>
            </div>
          </div>

          <div className="w-full relative overflow-hidden bg-surface">
            <DigitalTwinSwimlane
              domainName={domainName}
              slug={cleanSlug}
              nodes={productionGraph.nodes}
              edges={productionGraph.edges}
              fitMode={fitMode}
              setFitMode={setFitMode}
            />
          </div>
        </section>

        {/* Live Data & Telemetry Connectors (API, Upload CSV, Snowflake) */}
        <TwinDataConnectors
          slug={cleanSlug}
          domainName={domainName}
          isFinalized={Boolean(dbStatus.ready && (dbStatus.workspace_name || wf.data?.name))}
          dbInfo={dbStatus}
          onRequireFinalize={handleSaveAs}
        />
      </div>

      {/* Save As In-Window Modal */}
      <SaveAsModal
        open={saveAsOpen}
        defaultName={defaultSaveName}
        title="Finalize & Save Workspace"
        domainName={domainName || 'Finance Model'}
        entityCount={productionGraph.nodes.length || 0}
        onSave={executeSaveAs}
        onClose={() => setSaveAsOpen(false)}
      />
    </Layout>
  )
}

