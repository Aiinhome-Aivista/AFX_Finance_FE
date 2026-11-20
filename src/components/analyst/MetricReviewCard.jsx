import { useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'
import useAsync from '../common/useAsync'
import { analyst } from '../../api'
import { useToast } from '../../context/ToastContext'

const BADGE = {
  proposed: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
}

/**
 * Data Architect review of the business metrics proposed from the uploaded data.
 * The formulas are checked against the data automatically, but only a person can confirm they mean what their name says,
 * so the analyst chat calculates a metric only after it is approved here.
 */
export default function MetricReviewCard({ wf }) {
  const toast = useToast()
  const q = useAsync(() => analyst.graphMetrics(wf), [wf])
  const [busy, setBusy] = useState(null)
  const d = q.data

  if (!d || !d.can_review) return null

  const act = async (payload, key) => {
    setBusy(key)
    try {
      q.setData(await analyst.reviewMetric(wf, payload))
    } catch (e) {
      toast.error(e?.message || 'Could not save the review.')
    } finally {
      setBusy(null)
    }
  }
  const pending = d.metrics.filter((m) => m.status === 'proposed').length

  return (
    <section className="card p-5" aria-label="Metric review">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand/10 text-brand"><ShieldCheck size={16} /></span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-ink">Business metrics proposed from your data</h2>
          <p className="text-xs text-muted">Analysts can ask about a metric only after you approve its definition.</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="btn-ghost btn-sm inline-flex items-center gap-1.5" onClick={() => q.reload().catch(() => {})} disabled={q.loading}>
            <RefreshCw size={13} className={q.loading ? 'animate-spin' : ''} /> Refresh
          </button>
          {pending > 0 && (
            <button className="btn-primary btn-sm" disabled={busy !== null} onClick={() => act({ all: true, decision: 'approve' }, 'all')}>
              {busy === 'all' ? <Loader2 size={13} className="animate-spin" /> : `Approve all (${pending})`}
            </button>
          )}
        </div>
      </div>

      {d.state === 'building' && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted"><Loader2 size={13} className="animate-spin" />Building metric definitions from your data… refresh in a moment.</p>
      )}
      {d.state === 'ready' && d.metrics.length === 0 && (
        <p className="mt-3 text-xs text-muted">No business metrics could be verified for this data.</p>
      )}

      <ul className="mt-3 divide-y divide-line">
        {d.metrics.map((m) => (
          <li key={m.name} className="flex flex-wrap items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                {m.name}
                <span className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${BADGE[m.status] || ''}`}>{m.status}</span>
              </p>
              <p className="break-words font-mono text-xs text-muted">= {m.formula}</p>
              {m.description && <p className="text-xs text-muted">{m.description}</p>}
              <p className="text-xs text-muted">Overall on your data: <span className="font-semibold text-ink">{m.display}</span></p>
            </div>
            <div className="flex items-center gap-1.5">
              {m.status !== 'approved' && (
                <button className="btn-ghost btn-sm inline-flex items-center gap-1" disabled={busy !== null}
                  onClick={() => act({ name: m.name, decision: 'approve' }, `a:${m.name}`)}>
                  {busy === `a:${m.name}` ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Approve
                </button>
              )}
              {m.status !== 'rejected' && (
                <button className="btn-ghost btn-sm inline-flex items-center gap-1 hover:!text-bad" disabled={busy !== null}
                  onClick={() => act({ name: m.name, decision: 'reject' }, `r:${m.name}`)}>
                  {busy === `r:${m.name}` ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} Reject
                </button>
              )}
              {m.status !== 'proposed' && (
                <button className="btn-ghost btn-sm" disabled={busy !== null} onClick={() => act({ name: m.name, decision: 'reset' }, `s:${m.name}`)}>
                  Undo
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
