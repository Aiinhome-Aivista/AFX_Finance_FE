import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Database, Menu, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react'
import Layout from '../components/common/Layout'
import Chart from '../components/analyst/MiniCharts'
import AnalystChatDock from '../components/analyst/AnalystChatDock'
import AnalystSidebar from '../components/analyst/AnalystSidebar'
import CommandCenterView from '../components/analyst/CommandCenterView'
import ReceivablesView from '../components/analyst/ReceivablesView'
import AssumptionsView from '../components/analyst/AssumptionsView'
import { analyst } from '../api'
import { useAuth } from '../context/AuthContext'
import useAsync from '../components/common/useAsync'
import workingCapitalData from '../data/workingCapitalAnalystData.json'

function SummaryCard({ summary }) {
  const [open, setOpen] = useState(false)
  const long = summary.text.length > 380

  return (
    <section className="card relative overflow-hidden p-5 pl-6 border border-line/70 shadow-xs" aria-label="Data summary">
      <span className="absolute inset-y-0 left-0 w-1.5 bg-brand" />
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
          <Sparkles size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{summary.title}</h2>
          <p className={`mt-2 whitespace-pre-line text-sm leading-relaxed text-muted ${open || !long ? '' : 'line-clamp-3'}`}>
            {summary.text}
          </p>
          {long && (
            <button
              className="mt-2 text-xs font-semibold text-brand hover:underline cursor-pointer"
              onClick={() => setOpen((o) => !o)}
            >
              {open ? 'Show less' : 'Read More'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function KpiCard({ kpi }) {
  return (
    <div
      className="card p-3.5 border border-line/60 bg-surface hover:border-brand/50 transition-all shadow-xs"
      title={kpi.definition}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted truncate">
        {kpi.label}
      </p>
      <p className="mt-1 font-extrabold text-ink text-xl tracking-tight">
        {kpi.display}
      </p>
      {kpi.subtitle && (
        <p className="mt-0.5 text-[11px] text-muted truncate">
          {kpi.subtitle}
        </p>
      )}
    </div>
  )
}

function ChartCard({ chart }) {
  const isLarge = chart.size === 'full'

  return (
    <section
      className={`card p-5 border border-line/70 bg-surface hover:border-brand/40 transition-all shadow-xs flex flex-col justify-between ${
        isLarge ? 'md:col-span-2' : 'col-span-1'
      }`}
      aria-label={chart.title}
    >
      {/* Aligned Card Header */}
      <div className="flex items-center justify-between gap-3 pb-3 mb-2 border-b border-line/50 w-full">
        <div className="min-w-0">
          <h3 className={`font-bold text-ink truncate ${isLarge ? 'text-base' : 'text-sm'}`}>{chart.title}</h3>
          <p className="text-[11px] text-muted truncate mt-0.5">{chart.subtitle}</p>
        </div>
        {chart.filters && chart.filters.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            {chart.filters.map((f, idx) => (
              <span
                key={idx}
                className="rounded-md border border-line/60 bg-surface2 px-2 py-0.5 text-[10px] font-medium text-muted shadow-2xs"
              >
                {f}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Aligned Edge-to-Edge Chart Canvas */}
      <div className={`w-full flex-1 min-h-0 flex flex-col justify-center ${isLarge ? 'h-[330px]' : 'h-[270px]'}`}>
        <Chart chart={chart} />
      </div>
    </section>
  )
}

export default function AnalystDashboard() {
  const { slug } = useParams()
  const [sp] = useSearchParams()
  const wf = sp.get('wf')
  const { isAnalyst } = useAuth()
  const q = useAsync(() => (wf ? analyst.dashboard(wf) : Promise.resolve(null)), [wf])
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('command_center')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  const apiData = q.data

  const refresh = async () => {
    if (!wf) return
    setRefreshing(true)
    try {
      q.setData(await analyst.dashboard(wf, true))
    } finally {
      setRefreshing(false)
    }
  }

  // Model header details: prefer apiData if available, fallback to defaults
  const modelInfo = {
    name: apiData?.model?.name || 'Planning, Budgeting and Forecasting',
    published_at: apiData?.model?.published_at || '2026-11-21',
    version: apiData?.model?.version || 1,
  }
  const dateRange = apiData?.date_range || { from: '2017-01-01', to: '2021-12-31' }

  // Use the 17 metrics and rich diverse charts from workingCapitalData
  const summary = workingCapitalData.summary
  const kpis = workingCapitalData.kpis || []
  const charts = workingCapitalData.charts || []
  const dataSources = workingCapitalData.data_sources || []

  return (
    <Layout fullBleed hideWorkflowBar hideNext>
      {/* Horizontal Flex Container: Collapsible Sidebar + Dynamic Main Content */}
      <div className="flex w-full h-full min-h-0 flex-1 overflow-hidden bg-bg">
        {/* Sleek Collapsible Left Sidebar */}
        <AnalystSidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'digital_twin' && !isAnalyst) {
              // Can also navigate directly if preferred
            }
            setActiveTab(tab)
          }}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
          modelName={modelInfo.name}
        />

        {/* Dynamic Main Workspace Column */}
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden px-6 pt-4 pb-0 relative">
          {/* Top Header Bar matching Working Capital Command Center (Image 2) */}
          <div className="shrink-0 mb-3 flex items-center justify-between border-b border-line/60 pb-2.5 pt-0.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted">
                WORKING CAPITAL
              </span>
              <span className="text-muted/60 font-mono">/</span>
              <span className="font-semibold text-ink">
                {activeTab === 'command_center'
                  ? 'Command center'
                  : activeTab === 'receivables'
                  ? 'Receivables'
                  : 'Assumptions'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Scenario saved
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('assumptions')}
                className="btn-ghost btn-sm inline-flex items-center gap-1.5 border border-line bg-surface hover:bg-surface2 text-xs font-semibold cursor-pointer py-1 px-2.5 rounded-lg shadow-2xs text-ink"
              >
                <SlidersHorizontal size={13} /> Assumptions <ArrowUpRight size={13} />
              </button>
            </div>
          </div>

          {/* Tab 1: Command Center Main View (Matching Working Capital Command Center Design) */}
          {activeTab === 'command_center' && (
            <CommandCenterView onNavigateTab={(tab) => setActiveTab(tab)} />
          )}

          {/* Tab 2: Receivables View */}
          {activeTab === 'receivables' && <ReceivablesView />}

          {/* Tab 3: Planning Assumptions View */}
          {activeTab === 'assumptions' && <AssumptionsView />}

          {/* Tab 4: Digital Twin View */}
          {activeTab === 'digital_twin' && (
            <div className="h-full flex-1 flex flex-col items-center justify-center border border-line/60 rounded-2xl bg-surface p-8 text-center shadow-xs">
              <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 border border-emerald-500/20">
                <Sparkles size={28} />
              </div>
              <h3 className="text-lg font-bold text-ink">Domain Digital Twin Topology</h3>
              <p className="text-xs text-muted max-w-md mt-1 mb-4">
                Explore the live ontology nodes, formulas, and working capital cash drivers configured for this model.
              </p>
              <Link
                to={`/finance/${slug || 'planning-budgeting-forecasting'}/twin?wf=${wf || ''}`}
                className="btn-primary text-xs px-4 py-2"
              >
                Open Full Digital Twin Canvas
              </Link>
            </div>
          )}

          {/* Floating Analyst Chat Dock */}
          <AnalystChatDock wf={wf} modelName={modelInfo.name} version={modelInfo.version} />
        </div>
      </div>
    </Layout>
  )
}
