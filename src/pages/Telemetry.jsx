import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, FileUp, Lock, Sparkles, Trash2, UploadCloud, X } from 'lucide-react'
import Layout from '../components/common/Layout'
import Stepper from '../components/common/Stepper'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { EmptyState, ErrorState, Loading, Spinner } from '../components/common/States'
import GraphCanvas from '../components/graph/GraphCanvas'
import ProposalReview from '../components/chat/ProposalReview'
import useAsync from '../components/common/useAsync'
import { domains, files as filesApi, graphs } from '../api'
import { bytes, timeAgo } from '../lib/format'
import { useToast } from '../context/ToastContext'

const ALLOWED = ['csv', 'xlsx', 'pdf', 'txt', 'docx', 'sql']
const MAX_MB = 25
const STATUS = { uploaded: ['Queued', 'bg-surface2 text-muted'], processing: ['Processing', 'bg-warn/15 text-warn'], processed: ['Processed', 'bg-ok/15 text-ok'], failed: ['Failed', 'bg-bad/15 text-bad'] }

function Preview({ id, onClose }) {
  const { data: f, error, loading } = useAsync(() => filesApi.get(id), [id])
  const p = f?.preview
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3" role="dialog" aria-modal="true" aria-label="File preview" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="card sheet-enter flex max-h-[90vh] w-full max-w-4xl flex-col">
        <div className="flex items-center justify-between border-b border-line p-3"><b className="truncate text-sm">{f?.name || 'Preview'}</b><button className="btn-ghost btn-sm" onClick={onClose}><X size={14} /> Close</button></div>
        <div className="scroll-thin overflow-auto p-4 text-sm">
          {loading && <Loading />}{error && <ErrorState error={error} />}
          {f && <>
            {f.status === 'failed' && <p className="mb-3 rounded-lg bg-bad/10 p-3 text-bad">{f.error}</p>}
            {f.metadata?.warning && <p className="mb-3 rounded-lg bg-warn/10 p-3 text-warn">{f.metadata.warning}</p>}
            {f.metadata?.note && <p className="mb-3 rounded-lg bg-surface2 p-3 text-xs text-muted">{f.metadata.note}</p>}
            <dl className="mb-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {[['Type', f.ext.toUpperCase()], ['Size', bytes(f.size_bytes)], ['Graph version', f.graph_version], ['Status', f.status],
                ...(f.metadata ? Object.entries(f.metadata).filter(([k, v]) => ['rows_read', 'columns', 'pages', 'paragraphs', 'tables', 'statements', 'text_chars', 'sheet_count'].includes(k) && v != null).map(([k, v]) => [k.replace('_', ' '), String(v)]) : [])]
                .map(([k, v]) => <div key={k} className="rounded-lg bg-surface2 p-2"><dt className="text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>)}
            </dl>
            {p?.type === 'table' && <div className="scroll-thin mb-4 overflow-x-auto rounded-lg border border-line"><table className="w-full text-left text-xs"><thead className="bg-surface2"><tr>{p.columns.map((c) => <th key={c} className="whitespace-nowrap p-2">{c}</th>)}</tr></thead><tbody>{p.rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="whitespace-nowrap p-2">{c}</td>)}</tr>)}</tbody></table></div>}
            {p?.type === 'text' && <pre className="mb-4 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-surface2 p-3 text-xs">{p.text}</pre>}
            {p?.type === 'sql' && <><div className="mb-3 space-y-1">{Object.entries(p.tables).map(([t, cols]) => <div key={t} className="text-xs"><b>{t}</b>: <span className="font-mono text-muted">{cols.join(', ') || '—'}</span></div>)}</div><pre className="mb-4 max-h-48 overflow-auto rounded-lg bg-surface2 p-3 text-xs">{p.text}</pre></>}
            {f.mapping && (
              <div><h4 className="h-section mb-1">Mapping to your finalised graph ({f.mapping.stats.matched_terms}/{f.mapping.stats.terms} fields matched · {f.mapping.stats.entities_touched} entities)</h4>
                {f.mapping.matches.length > 0 && <ul className="space-y-0.5 text-xs">{f.mapping.matches.slice(0, 40).map((m, i) => <li key={i}><span className="font-mono">{m.term}</span> → <b>{m.node_name}</b>{m.attribute ? <span className="text-muted"> · {m.attribute}</span> : null} <span className="text-muted">({Math.round(m.confidence * 100)}% {m.match_type})</span></li>)}</ul>}
                {f.mapping.mentions?.length > 0 && <p className="mt-2 text-xs text-muted">Entities mentioned in the text: {f.mapping.mentions.slice(0, 10).map((m) => `${m.node_name} (${m.count})`).join(', ')}</p>}
                {f.mapping.unmatched.length > 0 && <p className="mt-2 text-xs text-muted">Unmatched: {f.mapping.unmatched.slice(0, 30).join(', ')}</p>}
              </div>)}
          </>}
        </div>
      </div>
    </div>
  )
}

export default function Telemetry() {
  const { slug } = useParams()
  const toast = useToast()
  const wf = useAsync(() => domains.workflow(slug), [slug])
  const list = useAsync(() => filesApi.list(slug), [slug], { immediate: false })
  const [queue, setQueue] = useState([]) // client-side uploads in flight: {id,name,pct,error}
  const [drag, setDrag] = useState(false)
  const [view, setView] = useState(null)
  const [del, setDel] = useState(null)
  const [proposal, setProposal] = useState(null)
  const [gen, setGen] = useState(false)
  const [deciding, setDeciding] = useState(false)
  const [tgraph, setTgraph] = useState(null)
  const input = useRef(null)
  const unlocked = wf.data?.steps?.[4]?.status === 'completed'

  const refresh = useCallback(() => list.reload().catch(() => {}), [list.reload]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (unlocked) refresh() }, [unlocked]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // poll while the server is still processing
    if (!list.data?.files.some((f) => f.status === 'uploaded' || f.status === 'processing')) return
    const t = setInterval(refresh, 1500)
    return () => clearInterval(t)
  }, [list.data]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // show the telemetry graph when KG2+ exists
    if (wf.data?.steps?.[5]?.status === 'completed') graphs.versions(slug).then((v) => { const t = [...v.versions].reverse().find((x) => x.kind === 'telemetry'); if (t) graphs.versionGraph(slug, t.number).then(setTgraph) }).catch(() => {})
  }, [wf.data, slug])

  const upload = (fileList) => {
    Array.from(fileList).forEach(async (file) => {
      const ext = file.name.split('.').pop().toLowerCase()
      const id = Math.random().toString(36).slice(2)
      if (!ALLOWED.includes(ext)) return toast.error(`${file.name}: unsupported type. Allowed: ${ALLOWED.join(', ').toUpperCase()}`)
      if (file.size > MAX_MB * 1048576) return toast.error(`${file.name}: larger than ${MAX_MB} MB.`)
      if (file.size === 0) return toast.error(`${file.name}: the file is empty.`)
      setQueue((q) => [...q, { id, name: file.name, pct: 0 }])
      try {
        await filesApi.upload(slug, file, (pct) => setQueue((q) => q.map((x) => (x.id === id ? { ...x, pct } : x))))
        setQueue((q) => q.filter((x) => x.id !== id))
        refresh()
      } catch (e) { setQueue((q) => q.map((x) => (x.id === id ? { ...x, error: e.message } : x))) }
    })
  }
  const generate = async () => {
    setGen(true)
    try { const r = await filesApi.generate(slug); setProposal(r.proposal); if (r.files_unmapped?.length) toast.push(`${r.files_unmapped.length} file(s) had no matches and are not included.`) }
    catch (e) { toast.error(e.message) } finally { setGen(false) }
  }
  const decide = async (mode, ids) => {
    setDeciding(true)
    try { const r = await graphs.decide(slug, proposal.id, { mode, approved_item_ids: ids }); setProposal(null); if (r.version) toast.success(`${r.version.label} created from your telemetry.`); await wf.reload() }
    catch (e) { toast.error(e.message) } finally { setDeciding(false) }
  }
  const remove = async () => {
    try { await filesApi.remove(del.id); toast.success('File deleted.'); setDel(null); refresh() } catch (e) { toast.error(e.message); setDel(null) }
  }

  if (wf.data && !wf.data.started) return <Navigate to={`/finance/${slug}`} replace />
  if (wf.loading && !wf.data) return <Layout wide><Loading /></Layout>
  if (wf.error) return <Layout wide><ErrorState error={wf.error} onRetry={wf.reload} /></Layout>
  const processed = list.data?.files.filter((f) => f.status === 'processed').length || 0

  return (
    <Layout wide>
      <Link to={`/finance/${slug}/finalize`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> Finalisation</Link>
      <Stepper slug={slug} steps={wf.data.steps} current={6} />
      <h1 className="mt-4 text-xl font-semibold">Upload telemetry data</h1>
      <p className="text-sm text-muted">Files are matched to your finalised ontology (KG{wf.data.finalized_version_number || '?'}). SQL files are only parsed as text — never executed.</p>

      {!unlocked ? (
        <div className="card mt-4"><EmptyState icon={Lock} title="Uploads are locked" hint="Telemetry can only be added after you finalise the ontology (step 5)."><Link className="btn-primary mt-2" to={`/finance/${slug}/finalize`}>Go to finalisation</Link></EmptyState></div>
      ) : (
        <div className="mt-4 space-y-4">
          <div onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files) }}
            className={`card flex flex-col items-center gap-2 border-2 border-dashed p-8 text-center transition ${drag ? 'border-brand bg-brand/5' : ''}`}>
            <UploadCloud size={30} className="text-brand" />
            <p className="text-sm font-medium">Drag & drop files here</p>
            <p className="text-xs text-muted">CSV, XLSX, PDF, TXT, DOCX or SQL · up to {MAX_MB} MB each</p>
            <button className="btn-primary mt-1" onClick={() => input.current?.click()}><FileUp size={16} /> Choose files</button>
            <input ref={input} type="file" multiple hidden accept={ALLOWED.map((e) => `.${e}`).join(',')} onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
          </div>

          {queue.length > 0 && <ul className="space-y-2">{queue.map((u) => (
            <li key={u.id} className="card p-3 text-sm"><div className="flex justify-between"><span className="truncate">{u.name}</span>{u.error ? <button className="text-xs text-muted underline" onClick={() => setQueue((q) => q.filter((x) => x.id !== u.id))}>Dismiss</button> : <span className="text-xs text-muted">{u.pct}%</span>}</div>
              {u.error ? <p className="mt-1 text-xs text-bad">{u.error}</p> : <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuenow={u.pct}><div className="h-full bg-brand transition-all" style={{ width: `${u.pct}%` }} /></div>}</li>))}</ul>}

          <section className="card">
            <div className="flex items-center justify-between border-b border-line p-3"><h2 className="font-semibold">Uploaded files</h2>
              <button className="btn-primary btn-sm" disabled={processed === 0 || gen} onClick={generate}>{gen ? <Spinner /> : <Sparkles size={14} />} Generate telemetry graph</button></div>
            {list.loading && !list.data && <Loading />}
            {list.data?.files.length === 0 && <EmptyState title="No files yet" hint="Upload a data dump, a policy document or a schema to map onto your ontology." />}
            <ul className="divide-y divide-line">{list.data?.files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{f.name}</div><div className="text-xs text-muted">{f.ext.toUpperCase()} · {bytes(f.size_bytes)} · for {f.graph_version} · {timeAgo(f.created_at)}</div>
                  {f.status === 'failed' && <div className="mt-0.5 text-xs text-bad">{f.error}</div>}
                  {f.status === 'processed' && f.metadata?.warning && <div className="mt-0.5 text-xs text-warn">{f.metadata.warning}</div>}</div>
                <span className={`badge ${STATUS[f.status][1]}`}>{f.status === 'processing' && <Spinner size={11} />}&nbsp;{STATUS[f.status][0]}</span>
                <button className="btn-ghost btn-sm" onClick={() => setView(f.id)}><Eye size={14} /> Preview</button>
                <button className="btn-ghost btn-sm" onClick={() => setDel(f)} aria-label={`Delete ${f.name}`}><Trash2 size={14} /></button>
              </li>))}</ul>
          </section>

          {proposal && <ProposalReview proposal={proposal} busy={deciding} onDecide={decide} approveLabel="Approve & create telemetry graph" />}
          {tgraph && (
            <section className="card overflow-hidden"><div className="flex items-center justify-between border-b border-line p-3"><h2 className="font-semibold">Telemetry graph · {tgraph.version.label}</h2><span className="text-xs text-muted">data sources are shown in teal</span></div>
              <div className="h-[56vh] min-h-[380px]"><GraphCanvas nodes={tgraph.nodes} edges={tgraph.edges} selectedKey={null} onSelect={() => {}} /></div></section>
          )}
        </div>
      )}
      {view && <Preview id={view} onClose={() => setView(null)} />}
      <ConfirmDialog open={!!del} danger title="Delete this file?" confirmLabel="Delete" onCancel={() => setDel(null)} onConfirm={remove}>“{del?.name}” will be removed from the server. Graph versions already created from it are unaffected.</ConfirmDialog>
    </Layout>
  )
}
