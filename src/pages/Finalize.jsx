import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, History, Lock, XCircle } from 'lucide-react'
import Layout from '../components/common/Layout'
import Stepper from '../components/common/Stepper'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { EmptyState, ErrorState, Loading } from '../components/common/States'
import GraphCanvas from '../components/graph/GraphCanvas'
import useAsync from '../components/common/useAsync'
import { domains, graphs } from '../api'
import { timeAgo } from '../lib/format'
import { useToast } from '../context/ToastContext'

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
  const [range, setRange] = useState({ from: 0, to: null })
  const [cmp, setCmp] = useState(null)
  const [dlg, setDlg] = useState(null)
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (wf.data?.steps?.[3]?.status === 'completed') fin.reload().catch(() => {}) }, [wf.data]) // eslint-disable-line react-hooks/exhaustive-deps
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
    try { await graphs.finalize(slug, { confirm: true, acknowledge_warnings: ack }); toast.success('Ontology finalised. Telemetry upload is now unlocked.'); setDlg(null); await Promise.all([wf.reload(), fin.reload()]) }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  const doReopen = async () => {
    setBusy(true)
    try { await graphs.reopen(slug); toast.success('Ontology re-opened.'); setDlg(null); await Promise.all([wf.reload(), fin.reload()]) }
    catch (e) { toast.error(e.message); setDlg(null) } finally { setBusy(false) }
  }

  return (
    <Layout wide>
      <Link to={`/finance/${slug}/customize`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> Back to the chatbot</Link>
      <Stepper slug={slug} steps={wf.data.steps} current={5} />
      <h1 className="mt-4 text-xl font-semibold">Finalise your ontology</h1>
      {!hasKg1 && <div className="card mt-3"><EmptyState title="Nothing to finalise yet" hint="Answer the chatbot's questions and approve at least one set of changes to create KG1."><Link className="btn-primary mt-2" to={`/finance/${slug}/customize`}>Go to the chatbot</Link></EmptyState></div>}
      {hasKg1 && fin.loading && !d && <Loading />}
      {fin.error && <ErrorState error={fin.error} onRetry={fin.reload} />}
      {d && (
        <div className="mt-3 space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-line p-3"><h2 className="font-semibold">Graph preview · {d.version.label}</h2><span className="text-xs text-muted">{d.graph.nodes.length} entities · {d.graph.edges.length} relationships</span></div>
              <div className="h-[48vh] min-h-[340px]"><GraphCanvas nodes={d.graph.nodes} edges={d.graph.edges} selectedKey={null} onSelect={() => {}} minimap={false} /></div></section>
            <section className="card p-4">
              <h2 className="font-semibold">Validation</h2>
              {d.validation.errors.length === 0 && d.validation.warnings.length === 0 && <p className="mt-2 flex items-center gap-2 text-sm text-ok"><CheckCircle2 size={16} /> No issues found.</p>}
              <ul className="mt-2 space-y-1.5">
                {d.validation.errors.map((e, i) => <li key={i} className="flex gap-2 text-sm text-bad"><XCircle size={16} className="mt-0.5 shrink-0" />{e.message}</li>)}
                {d.validation.warnings.map((w, i) => <li key={i} className="flex gap-2 text-sm text-warn"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{w.message}</li>)}
              </ul>
              <p className="mt-3 text-xs text-muted">Errors block finalisation. Warnings can be acknowledged.</p>
              <div className="mt-4 border-t border-line pt-4">
                {finalized ? (
                  <div className="space-y-2"><p className="flex items-center gap-2 text-sm text-ok"><Lock size={15} /> Finalised as KG{wf.data.finalized_version_number}</p>
                    <div className="flex flex-wrap gap-2"><Link to={`/finance/${slug}/telemetry`} className="btn-primary">Continue to telemetry <ArrowRight size={16} /></Link><button className="btn-ghost" onClick={() => setDlg('reopen')}>Re-open ontology</button></div></div>
                ) : <button className="btn-primary w-full" disabled={d.validation.errors.length > 0} onClick={() => { setAck(false); setDlg('finalize') }}>Finalise ontology…</button>}
              </div>
            </section>
          </div>

          <section className="card p-4">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">Compare versions</h2>
              <select className="input !w-auto text-sm" value={range.from} onChange={(e) => setRange({ ...range, from: Number(e.target.value) })} aria-label="From version"><option value={0}>KG0 reference (selected blocks)</option>{d.versions.map((v) => <option key={v.number} value={v.number}>{v.label}</option>)}</select>
              <ArrowRight size={14} className="text-muted" />
              <select className="input !w-auto text-sm" value={range.to ?? ''} onChange={(e) => setRange({ ...range, to: Number(e.target.value) })} aria-label="To version">{d.versions.map((v) => <option key={v.number} value={v.number}>{v.label}</option>)}</select></div>
            {cmp ? <>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6"><Stat label="entities added" v={cmp.counts.nodes_added} tone="text-ok" /><Stat label="entities modified" v={cmp.counts.nodes_modified} tone="text-warn" /><Stat label="entities removed" v={cmp.counts.nodes_removed} tone="text-bad" />
                <Stat label="links added" v={cmp.counts.edges_added} tone="text-ok" /><Stat label="links relabelled" v={cmp.counts.edges_modified} /><Stat label="links removed" v={cmp.counts.edges_removed} tone="text-bad" /></div>
              <DiffLists d={cmp} /></> : <Loading className="!p-4" />}
          </section>

          <section className="card p-4">
            <h2 className="flex items-center gap-2 font-semibold"><History size={16} /> Change history</h2>
            {d.history.length === 0 && <p className="mt-2 text-sm text-muted">No proposals yet.</p>}
            <ul className="mt-3 space-y-3">{d.history.map((p) => (
              <li key={p.id} className="rounded-xl border border-line p-3">
                <div className="flex flex-wrap items-center gap-2"><b className="text-sm">{p.title}</b>
                  <span className={`badge ${p.status === 'approved' ? 'bg-ok/15 text-ok' : p.status === 'pending' ? 'bg-warn/15 text-warn' : 'bg-surface2 text-muted'}`}>{p.status}{p.result_version ? ` → KG${p.result_version}` : ''}</span>
                  <span className="text-xs text-muted">{p.source} · {timeAgo(p.created_at)}</span></div>
                <ul className="mt-1.5 space-y-0.5 text-xs text-muted">{p.items.map((i, k) => <li key={k} className={i.status === 'rejected' ? 'line-through' : ''}>{i.status === 'approved' ? '✓' : i.status === 'rejected' ? '✗' : '•'} {i.description}</li>)}</ul>
              </li>))}</ul>
          </section>
        </div>
      )}
      <ConfirmDialog open={dlg === 'finalize'} title="Finalise this ontology?" confirmLabel="Finalise" busy={busy} onCancel={() => setDlg(null)} onConfirm={doFinalize}>
        <p>This locks {d?.version.label} as your ontology and unlocks telemetry upload. The chatbot session will be locked until you re-open it.</p>
        {d?.validation.warnings.length > 0 && <label className="mt-3 flex items-start gap-2 text-ink"><input type="checkbox" className="mt-1 accent-[rgb(var(--brand))]" checked={ack} onChange={(e) => setAck(e.target.checked)} /> I have reviewed the {d.validation.warnings.length} warning(s) and want to finalise anyway.</label>}
      </ConfirmDialog>
      <ConfirmDialog open={dlg === 'reopen'} title="Re-open the ontology?" confirmLabel="Re-open" busy={busy} onCancel={() => setDlg(null)} onConfirm={doReopen}>Possible only while no telemetry has been uploaded. Uploads will be locked again until you re-finalise.</ConfirmDialog>
    </Layout>
  )
}
