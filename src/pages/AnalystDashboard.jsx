import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Database, Info, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react'
import Layout from '../components/common/Layout'
import { EmptyState, ErrorState, Loading } from '../components/common/States'
import useAsync from '../components/common/useAsync'
import Chart from '../components/analyst/MiniCharts'
import AnalystChatDock from '../components/analyst/AnalystChatDock'
import { analyst } from '../api'
import { useAuth } from '../context/AuthContext'

function SummaryCard({ summary }) {
  const [open, setOpen] = useState(false)
  const long = summary.text.length > 380
  return (
    <section className="card relative overflow-hidden p-5 pl-6" aria-label="Data summary">
      <span className="absolute inset-y-0 left-0 w-1 bg-brand" />
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Sparkles size={18} /></span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{summary.title}</h2>
          <p className={`mt-2 whitespace-pre-line text-sm leading-relaxed text-muted ${open || !long ? '' : 'line-clamp-4'}`}>{summary.text}</p>
          {long && (
            <button className="mt-2 text-xs font-semibold text-brand hover:underline" onClick={() => setOpen((o) => !o)}>
              {open ? 'Show less' : 'Read More'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function KpiCard({ kpi }) {
  const isText = typeof kpi.value === 'string'
  return (
    <div className="card p-4" title={kpi.definition}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{kpi.label}</p>
      <p className={`mt-1.5 break-words font-extrabold text-ink ${isText ? 'text-lg leading-snug' : 'text-2xl'}`}>{kpi.display}</p>
    </div>
  )
}

function ChartCard({ chart }) {
  return (
    <section className="card p-4" aria-label={chart.title}>
      <h3 className="text-sm font-bold text-ink">{chart.title}</h3>
      <p className="mb-2 text-xs text-muted">{chart.subtitle}</p>
      <Chart chart={chart} />
    </section>
  )
}

export default function AnalystDashboard() {
  const { slug } = useParams()
  const [sp] = useSearchParams()
  const wf = sp.get('wf')
  const { isAnalyst } = useAuth()
  const q = useAsync(() => (wf ? analyst.dashboard(wf) : Promise.reject(new Error('No published model was selected.'))), [wf])
  const [refreshing, setRefreshing] = useState(false)
  const d = q.data

  const refresh = async () => {
    setRefreshing(true)
    try {
      q.setData(await analyst.dashboard(wf, true))
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Layout wide hideWorkflowBar hideNext>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link to="/finance" className="btn-ghost btn-sm inline-flex items-center gap-1.5"><ArrowLeft size={14} /> Models</Link>
        {d?.model && (
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-ink">{d.model.name}</h1>
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span className="inline-flex items-center gap-1 text-brand"><ShieldCheck size={12} /> Published {d.model.version}</span>
              <span>by {d.model.owner_name}</span>
              {d.model.published_at && <span>· {new Date(d.model.published_at).toLocaleDateString()}</span>}
              {d.date_range && <span>· Data {d.date_range.from} → {d.date_range.to}</span>}
            </p>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Link to={`/finance/${slug}/twin?wf=${wf}`} className="btn-ghost btn-sm">Digital Twin</Link>
          {!isAnalyst && d?.status === 'ready' && (
            <button className="btn-ghost btn-sm inline-flex items-center gap-1.5" onClick={refresh} disabled={refreshing}>
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} /> Recompute
            </button>
          )}
        </div>
      </div>

      {q.loading && !d && <Loading label="Analysing the published data…" className="min-h-[40vh]" />}
      {q.error && !d && <ErrorState error={q.error} onRetry={q.reload} />}

      {d && d.status === 'no_data' && (
        <div className="space-y-3">
          <EmptyState icon={Database} title="No data to analyse yet" hint={d.message} className="card min-h-[30vh] justify-center" />
          {d.warnings?.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-warn/30 bg-warn/5 p-3 text-xs text-warn" role="status">
              {d.warnings.map((w) => <li key={w} className="flex gap-2"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{w}</li>)}
            </ul>
          )}
        </div>
      )}

      {d && d.status === 'ready' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-5">
            {d.summary && <SummaryCard summary={d.summary} />}
            {d.charts.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2">{d.charts.map((c) => <ChartCard key={c.id} chart={c} />)}</div>
            ) : (
              <EmptyState icon={Info} title="No charts could be built" hint="The data has no numeric, date or category columns that chart cleanly." className="card" />
            )}
            {d.warnings?.length > 0 && (
              <ul className="space-y-1 rounded-xl border border-warn/30 bg-warn/5 p-3 text-xs text-warn" role="status">
                {d.warnings.map((w) => <li key={w} className="flex gap-2"><AlertTriangle size={13} className="mt-0.5 shrink-0" />{w}</li>)}
              </ul>
            )}
          </div>

          <aside className="space-y-3" aria-label="Key metrics">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">Key metrics</h2>
            {d.kpis.map((k) => <KpiCard key={k.id} kpi={k} />)}
            <div className="card p-3 text-xs text-muted">
              <p className="mb-1.5 font-semibold text-ink">Data sources</p>
              <ul className="space-y-1">
                {d.data_sources.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span className="truncate">{s.name}</span>
                    <span className="shrink-0" title={s.document ? 'Document: not used for metrics or chat' : undefined}>
                      {s.document ? `${s.ext.toUpperCase()} · reference` : s.rows != null ? `${s.rows.toLocaleString()} rows` : s.ext.toUpperCase()}
                    </span>
                  </li>
                ))}
              </ul>
              {d.excluded_files > 0 && <p className="mt-2 text-warn">{d.excluded_files} file(s) from an earlier graph version are not included.</p>}
            </div>
          </aside>
        </div>
      )}
      {d && d.status === 'ready' && (
        <>
          <div className="h-24" aria-hidden="true" />
          <AnalystChatDock wf={wf} modelName={d.model.name} version={d.model.version} />
        </>
      )}
    </Layout>
  )
}
