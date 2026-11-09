import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, History, Lock, Sparkles, XCircle } from 'lucide-react'
import Layout from '../components/common/Layout'
import Stepper from '../components/common/Stepper'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { EmptyState, ErrorState, Loading } from '../components/common/States'
import OntologyGraphCanvas from '../components/graph/OntologyGraphCanvas'
import useAsync from '../components/common/useAsync'
import { domains, graphs } from '../api'
import { DOMMETA, SLUG_TO_DOM } from '../lib/ontologyData'
import { timeAgo } from '../lib/format'
import { useToast } from '../context/ToastContext'
import { useWorkflow } from '../context/WorkflowContext'

const Stat = ({ label, v, tone }) => <div className="rounded-xl bg-surface2 p-3 text-center"><div className={`text-xl font-semibold ${tone || ''}`}>{v}</div><div className="text-[11px] text-muted">{label}</div></div>

function DiffLists({ d }) {
  const none = !Object.entries(d.counts).some(([k, v]) => /added|removed|modified/.test(k) && v)
  if (none) return <p className="mt-2 text-sm text-muted">No differences.</p>
  return (
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <div>
        {d.nodes_added.length > 0 && <><h4 className="h-section mb-1">Entities added</h4><ul className="mb-3 space-y-1 text-sm">{d.nodes_added.map((n) => <li key={n.key}><span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: n.color }} /><b>{n.name}</b> <span className="text-xs text-muted">({n.origin})</span></li>)}</ul></>}
        {d.nodes_removed.length > 0 && <><h4 className="h-section mb-1">Entities removed</h4><ul className="mb-3 space-y-1 text-sm">{d.nodes_removed.map((n) => <li key={n.key} className="text-bad">{n.name}</li>)}</ul></>}
        {d.nodes_modified.length > 0 && <><h4 className="h-section mb-1">Entities modified</h4><ul className="space-y-1.5 text-sm">{d.nodes_modified.map((n) => (
          <li key={n.key}><b>{n.name}</b>
            {n.changes.name && <div className="text-xs text-muted">renamed from “{n.changes.name.from}”</div>}
            {n.attributes_added.length > 0 && <div className="text-xs text-ok">+ {n.attributes_added.join(', ')}</div>}
            {n.attributes_removed.length > 0 && <div className="text-xs text-bad">− {n.attributes_removed.join(', ')}</div>}
            {n.changes.notes && <div className="text-xs text-muted">business-rule note added</div>}
            {n.changes.formulas && <div className="text-xs text-muted">formulas changed</div>}</li>))}</ul></>}
      </div>
      <div>
        {d.edges_added.length > 0 && <><h4 className="h-section mb-1">Relationships added</h4><ul className="mb-3 space-y-1 text-xs">{d.edges_added.map((e, i) => <li key={i}>{e.source} —{e.label}→ {e.target}</li>)}</ul></>}
        {d.edges_removed.length > 0 && <><h4 className="h-section mb-1">Relationships removed</h4><ul className="mb-3 space-y-1 text-xs text-bad">{d.edges_removed.map((e, i) => <li key={i}>{e.source} —{e.label}→ {e.target}</li>)}</ul></>}
        {d.edges_modified.length > 0 && <><h4 className="h-section mb-1">Relabelled</h4><ul className="text-xs">{d.edges_modified.map((e, i) => <li key={i}>{e.source}→{e.target}: {e.from} ⇒ {e.to}</li>)}</ul></>}
      </div>
    </div>
  )
}

export default function Finalize() {
  const { slug } = useParams()
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

  if (wf.data && !wf.data.started) return <Navigate to={`/finance/${slug}`} replace />
  if (wf.loading && !wf.data) return <Layout wide><Loading /></Layout>
  if (wf.error) return <Layout wide><ErrorState error={wf.error} onRetry={wf.reload} /></Layout>
  const hasKg1 = wf.data.steps[3].status === 'completed'
  const finalized = !!wf.data.finalized_version_number
  const d = fin.data

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
      toast.success('Ontology re-opened for editing.')
      setDlg(null)
      await Promise.all([wf.reload(), fin.reload()])
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
            <span>Enterprise Digital Twin Finalization</span>
            {finalized && (
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-bold border border-emerald-300/40">
                Governed
              </span>
            )}
          </h1>
          <p className="text-xs text-muted mt-0.5">
            Step 6: Review, validate and finalize your customized Finance Digital Twin.
          </p>
        </div>
      </div>

      {!hasKg1 && (
        <div className="card mt-3">
          <EmptyState title="Nothing to finalise yet" hint="Answer the chatbot's questions and approve at least one set of changes to create KG1.">
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
                    <Sparkles size={16} className="text-[#10b981]" />
                    <span>Digital Twin Graph Preview · Current "{domainName}" Template</span>
                  </h2>
                  <p className="text-[11px] text-muted">
                    {d.graph.nodes.length} entities · {d.graph.edges.length} relationships
                  </p>
                </div>
              </div>

              <div className="h-[460px] min-h-[420px] w-full relative overflow-hidden bg-surface">
                <OntologyGraphCanvas
                  nodes={d.graph.nodes}
                  edges={d.graph.edges}
                  domainMeta={wf.data?.domain}
                  selectedNodeId={selectedNode}
                  onSelectNode={setSelectedNode}
                  className="w-full h-full"
                />
              </div>
            </section>

            {/* Right Column: Digital Twin Governance & Actions */}
            <section className="card p-5 border border-line flex flex-col justify-between shadow-card">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-line">
                  <h2 className="text-sm font-bold text-ink">Digital Twin Governance</h2>
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

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
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
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-line">
                {finalized ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/30 p-3 text-xs">
                      <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                        <Lock size={14} />
                        <span>Governed Enterprise Digital Twin · KG{wf.data.finalized_version_number}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted">
                        This model is locked and governed. It represents your active financial operating architecture.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/finance/${slug}`} className="btn bg-[#10b981] hover:bg-[#059669] text-white font-bold flex-1 text-xs py-2 rounded-xl text-center shadow-sm">
                        Explore Digital Twin →
                      </Link>
                      <button className="btn-ghost text-xs cursor-pointer py-2.5 px-4 rounded-xl flex items-center justify-center" onClick={() => setDlg('reopen')}>
                        Re-open
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn bg-[#10b981] hover:bg-[#059669] text-white font-bold w-full py-2.5 text-xs rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2"
                    disabled={d.validation.errors.length > 0 || busy}
                    onClick={() => { setAck(false); setDlg('finalize') }}
                  >
                    <Sparkles size={15} />
                    <span>Finalise as Digital Twin 🌟</span>
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
              <ArrowRight size={14} className="text-muted" />
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
                <DiffLists d={cmp} />
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
        confirmLabel="Finalise as Digital Twin 🌟"
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
        title="Re-open the ontology?"
        confirmLabel="Re-open"
        busy={busy}
        onCancel={() => setDlg(null)}
        onConfirm={doReopen}
      >
        <p className="text-xs text-ink">
          Possible only while no telemetry has been uploaded. Uploads will be locked again until you re-finalise.
        </p>
      </ConfirmDialog>
    </Layout>
  )
}
