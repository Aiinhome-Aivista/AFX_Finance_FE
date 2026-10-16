import { Route, X } from 'lucide-react'
import { Loading } from '../common/States'

/** Source-defined end-to-end flows. Selecting one highlights its nodes/edges on the graph and lists the ordered steps. */
export default function FlowCards({ flows, activeKey, onToggle, detail, loading, selectedKey, onStepSelect }) {
  return (
    <section className="mt-6" aria-label="End-to-end Finance flows">
      <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold"><Route size={18} /> End-to-end Finance flows</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {flows.map((f) => (
          <button key={f.key} onClick={() => onToggle(f.key)} aria-pressed={activeKey === f.key}
            className={`card p-4 text-left transition hover:border-brand ${activeKey === f.key ? 'border-brand ring-2 ring-brand' : ''}`}>
            <div className="flex items-center justify-between gap-2">
              <b className="text-sm">{f.title}</b>
              {f.relevant ? <span className="badge bg-brand/10 text-brand">this domain</span> : f.touches_domain ? <span className="badge bg-surface2 text-muted">touches</span> : null}
            </div>
            <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-muted">{f.narrative}</p>
            <p className="mt-2 text-[11px] text-muted">{f.step_count} steps</p>
          </button>
        ))}
      </div>
      {activeKey && (
        <div className="card mt-3 p-4">
          {loading || !detail ? <Loading label="Loading flow…" className="!p-2" /> : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-semibold">{detail.title}</h3><p className="mt-1 text-xs text-muted">{detail.narrative}</p></div>
                <button className="btn-ghost btn-sm shrink-0" onClick={() => onToggle(activeKey)}><X size={14} /> Clear</button>
              </div>
              <ol className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {detail.steps.map((s) => (
                  <li key={s.order}>
                    <button onClick={() => onStepSelect(s.node_key)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left hover:bg-surface2 ${selectedKey === s.node_key ? 'border-brand bg-brand/10' : 'border-line'}`}>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-brand-ink">{s.order}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{s.name}</span>
                        <span className="block text-[11px] text-muted">{s.group_name}</span>
                        {selectedKey === s.node_key && <span className="mt-1 block text-xs leading-relaxed text-muted">{s.definition}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </section>
  )
}
