import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react'
import Layout from '../components/common/Layout'
import Stepper from '../components/common/Stepper'
import { ErrorState, Loading, Spinner } from '../components/common/States'
import useAsync from '../components/common/useAsync'
import { domains } from '../api'
import { useToast } from '../context/ToastContext'
import { cleanMojibake } from '../lib/format'

function Block({ b }) {
  return (
    <div className="mb-4">
      {b.heading && <h4 className="mb-1.5 text-sm font-semibold">{cleanMojibake(b.heading)}</h4>}
      {b.items.length > 0 && <ul className="space-y-1.5">{b.items.map((it, i) => <li key={i} className="text-[13px] leading-relaxed"><b>{cleanMojibake(it.title)}</b>{it.title && it.text ? ' — ' : ''}<span className="text-muted">{cleanMojibake(it.text.replace(/^—\s*/, ''))}</span></li>)}</ul>}
      {b.tables.map((rows, ti) => (
        <div key={ti} className="scroll-thin mt-2 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead className="bg-surface2">{rows[0] && <tr>{rows[0].map((c, i) => <th key={i} className="p-2 font-semibold">{cleanMojibake(c)}</th>)}</tr>}</thead>
            <tbody>{rows.slice(1).map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className="p-2 align-top">{cleanMojibake(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      ))}
      {b.notes.map((n, i) => <p key={i} className="mt-2 rounded-lg bg-surface2 p-2 text-xs text-muted">{cleanMojibake(n)}</p>)}
    </div>
  )
}

export default function DomainOverview() {
  const { slug } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const { data: d, loading, error, reload } = useAsync(() => domains.get(slug), [slug])
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState({})

  const start = async () => {
    setBusy(true)
    try { await domains.select(slug); nav(`/finance/${slug}/graph`) } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  if (loading && !d) return <Layout><Loading /></Layout>
  if (error) return <Layout><ErrorState error={error} onRetry={reload} /></Layout>
  const wf = d.workflow
  return (
    <Layout>
      <Link to="/finance" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> All domains</Link>
      <div className="card mb-4 p-5 sm:p-6" style={{ borderTop: `4px solid ${d.color}` }}>
        <h1 className="mt-2 text-2xl font-semibold">{d.name}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">{d.scope}</p>
        <p className="mt-3 text-xs text-muted">Reference graph (KG0): {d.counts.core} core entities · {d.counts.shared} shared master-data entities · {d.counts.neighbour} cross-domain neighbours</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" onClick={start} disabled={busy}>{busy && <Spinner />}{wf.started ? 'Continue to reference graph' : 'Select this domain & generate KG0'} <ArrowRight size={16} /></button>
        </div>
      </div>
      <Stepper slug={slug} steps={wf.steps} current={wf.started ? wf.current_step : 2} />

      <h2 className="mb-2 mt-6 text-lg font-semibold">What the ontology says about this domain</h2>
      <div className="space-y-2">
        {Object.entries(d.knowledge).map(([layer, blocks]) => (
          <section key={layer} className="card">
            <button className="flex w-full items-center justify-between p-4 text-left" onClick={() => setOpen({ ...open, [layer]: !open[layer] })} aria-expanded={!!open[layer]}>
              <span className="font-medium">{layer}</span><ChevronDown size={18} className={`transition ${open[layer] ? 'rotate-180' : ''}`} />
            </button>
            {open[layer] && <div className="border-t border-line p-4">{blocks.map((b, i) => <Block key={i} b={b} />)}</div>}
          </section>
        ))}
      </div>
      {d.knowledge_evidence && <p className="mt-4 text-xs text-muted"><b>Evidence:</b> {cleanMojibake(d.knowledge_evidence)}</p>}
    </Layout>
  )
}
