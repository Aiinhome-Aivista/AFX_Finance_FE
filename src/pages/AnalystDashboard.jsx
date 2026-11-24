import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Database, RefreshCw, Sparkles } from 'lucide-react'
import Layout from '../components/common/Layout'
import Chart from '../components/analyst/MiniCharts'
import AnalystChatDock from '../components/analyst/AnalystChatDock'
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
    <Layout wide hideWorkflowBar hideNext>
      {/* Fixed static viewport container - pb-20 leaves plenty of clearance for bottom dock */}
      <div className="h-[calc(100vh-84px)] pb-20 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="shrink-0 mb-3 flex flex-wrap items-center gap-3">
          <Link to="/finance/models" className="btn-ghost btn-sm inline-flex items-center gap-1.5">
            <ArrowLeft size={14} /> Models
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-ink">{modelInfo.name}</h1>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              {modelInfo.published_at && (
                <span>{new Date(modelInfo.published_at).toLocaleDateString()}</span>
              )}
              {dateRange && (
                <span>
                  {modelInfo.published_at ? '· ' : ''}Data {dateRange.from} → {dateRange.to}
                </span>
              )}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!isAnalyst && (
              <Link
                to={`/finance/${slug || 'planning-budgeting-forecasting'}/twin?wf=${wf || ''}`}
                className="btn-ghost btn-sm"
              >
                Digital Twin
              </Link>
            )}
            {!isAnalyst && (
              <button
                className="btn-ghost btn-sm inline-flex items-center gap-1.5"
                onClick={refresh}
                disabled={refreshing}
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Recompute
              </button>
            )}
          </div>
        </div>

        {/* Dual Independent Scrollable Columns */}
        <div className="flex-1 min-h-0 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* 1. Left/Main Dashboard Column (Analysis Card + Responsive Sized Charts) with its own Scrollbar */}
          <div className="h-full overflow-y-auto pr-2 space-y-4 [scrollbar-gutter:stable] pb-24">
            {/* Analysis Performance Insight Card */}
            {summary && <SummaryCard summary={summary} />}

            {/* Responsive Charts Grid (Large Full-Width + Compact Side-by-Side) */}
            <div className="grid gap-4 md:grid-cols-2 pb-6">
              {charts.map((c) => (
                <ChartCard key={c.id} chart={c} />
              ))}
            </div>
          </div>

          {/* 2. Right Sidebar Column (Key Metrics) with its own Scrollbar and bottom clearance */}
          <aside className="h-full overflow-y-auto pr-1 flex flex-col [scrollbar-gutter:stable] pb-24" aria-label="Key metrics">
            {/* Clean Sticky Header without date filter or synced time */}
            <div className="sticky top-0 bg-surface/95 backdrop-blur-sm z-10 pb-2.5 border-b border-line/40 mb-3 pt-0.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink">KEY METRICS</span>
            </div>

            {/* 11 KPI Cards */}
            <div className="space-y-2.5 pb-3">
              {kpis.map((k) => (
                <KpiCard key={k.id} kpi={k} />
              ))}
            </div>

            {/* Data Sources Card */}
            <div className="card p-3 text-xs text-muted mb-6 border border-line/60 bg-surface">
              <p className="mb-1.5 font-semibold text-ink">Data sources</p>
              <ul className="space-y-1">
                {dataSources.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0">
                      {s.document
                        ? `${s.ext.toUpperCase()} · reference`
                        : s.rows != null
                        ? `${s.rows.toLocaleString()} rows`
                        : s.ext.toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {/* Floating Analyst Chat Dock */}
        <AnalystChatDock wf={wf} modelName={modelInfo.name} version={modelInfo.version} />
      </div>
    </Layout>
  )
}
