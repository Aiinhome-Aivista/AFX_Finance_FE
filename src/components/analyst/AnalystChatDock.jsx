import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Loader2, Send, Sparkles, TriangleAlert } from 'lucide-react'
import Chart from './MiniCharts'
import { analyst } from '../../api'

const pretty = (s) => String(s ?? '').replace(/_/g, ' ')
const cell = (v) => (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : v ?? '—')

// Plain-language description of the validated query that produced an answer, so the analyst can check it.
function describeSpec(spec) {
  if (!spec) return null
  const parts = [`Table: ${spec.table}`]
  parts.push(
    'Calculated: ' + spec.metrics.map((m) => `${m.fn}${m.column ? ` of ${pretty(m.column)}` : ' of rows'}`).join(', '),
  )
  if (spec.group_by?.length) parts.push('Grouped by: ' + spec.group_by.map((g) => pretty(g.column) + (g.bucket ? ` (${g.bucket})` : '')).join(', '))
  if (spec.filters?.length) parts.push('Filtered: ' + spec.filters.map((f) => `${pretty(f.column)} ${f.op} ${JSON.stringify(f.value)}`).join(' and '))
  return parts
}

function AssistantMessage({ m, onAsk }) {
  const rows = m.table?.rows || []
  const spec = describeSpec(m.spec)
  return (
    <div className="max-w-[92%] space-y-2 rounded-2xl rounded-tl-sm border border-line bg-surface2 px-4 py-3 text-sm text-ink">
      <p className={m.unanswerable ? 'text-muted' : ''}>{m.content}</p>
      {m.chart && (
        <div className="rounded-xl border border-line bg-surface p-2">
          <p className="px-1 text-xs font-semibold text-muted">{pretty(m.chart.title)}</p>
          <Chart chart={m.chart} />
        </div>
      )}
      {rows.length > 1 && (
        <details className="text-xs">
          <summary className="cursor-pointer font-semibold text-brand">View table ({rows.length} rows)</summary>
          <div className="mt-1 max-h-48 overflow-auto rounded-lg border border-line">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface2">
                <tr>{m.table.columns.map((c) => <th key={c} className="px-2 py-1 font-semibold">{pretty(c)}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-line">{r.map((v, j) => <td key={j} className="px-2 py-1">{cell(v)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {spec && (
        <details className="text-xs text-muted">
          <summary className="cursor-pointer font-semibold">How this was calculated</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {spec.map((p) => <li key={p}>{p}</li>)}
            {m.matchedRows != null && <li>{m.matchedRows.toLocaleString()} matching records</li>}
          </ul>
        </details>
      )}
      {m.notes?.length > 0 && (
        <p className="flex gap-1.5 text-xs text-warn"><TriangleAlert size={13} className="mt-0.5 shrink-0" />{m.notes.join('; ')}</p>
      )}
      {m.followUps?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {m.followUps.map((q) => (
            <button key={q} type="button" onClick={() => onAsk(q)} className="rounded-full border border-brand/40 bg-brand/5 px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand/10">
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AnalystChatDock({ wf, modelName, version }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, busy, open])

  const ask = async (text) => {
    const question = (text ?? input).trim()
    if (!question || busy) return
    setInput('')
    setOpen(true)
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }))
    setMessages((p) => [...p, { role: 'user', content: question }])
    setBusy(true)
    try {
      const r = await analyst.chat(wf, question, history)
      setMessages((p) => [...p, {
        role: 'assistant', content: r.answer, table: r.table, chart: r.chart, spec: r.spec, matchedRows: r.matched_rows,
        notes: r.notes, followUps: r.follow_ups, unanswerable: r.unanswerable,
      }])
    } catch (e) {
      setMessages((p) => [...p, { role: 'assistant', content: e.message || 'Something went wrong.', unanswerable: true, followUps: [] }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label="Speak to your data" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface shadow-[0_-6px_24px_rgb(0_0_0/0.08)]">
      <div className="mx-auto max-w-[1850px] px-3 sm:px-6">
        <div className="flex items-center gap-3 py-2">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'Collapse chat' : 'Expand chat'}
            className="grid h-7 w-7 place-items-center rounded-full border border-line text-muted hover:bg-surface2">
            {open ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
          <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-ink"><Sparkles size={14} className="text-brand" />Speak to your data</h2>
          <span className="truncate text-xs text-muted">{modelName}{version ? ` · ${version}` : ''}</span>
        </div>

        {open && (
          <div className="max-h-[48vh] min-h-[160px] space-y-3 overflow-y-auto pb-3" role="log" aria-live="polite">
            {messages.length === 0 && (
              <p className="py-6 text-center text-sm text-muted">
                Ask about the data shown above, e.g. “Which region has the highest net revenue?” or “How did gross sales trend month by month?”
              </p>
            )}
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end"><p className="max-w-[80%] rounded-2xl rounded-tr-sm bg-brand px-4 py-2 text-sm text-brand-ink">{m.content}</p></div>
              ) : (
                <AssistantMessage key={i} m={m} onAsk={ask} />
              ),
            )}
            {busy && <p className="flex items-center gap-2 text-xs text-muted"><Loader2 size={14} className="animate-spin" />Working it out from the data…</p>}
            <div ref={endRef} />
          </div>
        )}

        <form className="flex items-center gap-2 pb-3" onSubmit={(e) => { e.preventDefault(); ask() }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setOpen(true)}
            maxLength={500}
            placeholder="Ask anything about your data..."
            aria-label="Ask a question about the data"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface2 px-4 py-2.5 text-sm text-ink outline-none focus:border-brand"
          />
          <button type="submit" disabled={busy || !input.trim()} aria-label="Send question" className="btn-primary grid h-10 w-10 place-items-center rounded-xl disabled:opacity-50">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>
    </section>
  )
}
