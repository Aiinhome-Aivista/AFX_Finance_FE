import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, FunctionSquare, Link2, X } from 'lucide-react'
import { ontology } from '../../api'
import { Loading, ErrorState } from '../common/States'
import { ROLE_LABEL, cleanMojibake } from '../../lib/format'

const Section = ({ title, icon: Icon, children }) => (
  <section className="mt-4">
    <h4 className="h-section mb-1.5 flex items-center gap-1.5">{Icon && <Icon size={13} />}{title}</h4>
    {children}
  </section>
)

/**
 * Details for one entity. In KG0 the data comes from the ontology API (definition, attributes, relationships, joins,
 * formulas, evidence, canon references). For client graphs the graph node (client edits, notes, origin) is layered on top.
 */
export default function NodeDetailsPanel({ nodeKey, graphNode, graphNodes, graphEdges, onSelect, onClose, children, mode = 'kg0' }) {
  const [ref, setRef] = useState(null)
  const [state, setState] = useState({ loading: false, error: null })

  useEffect(() => {
    setRef(null)
    if (!nodeKey) return
    if (graphNode && graphNode.origin && graphNode.origin !== 'reference') return // client-created: nothing in KG0 to fetch
    let alive = true
    setState({ loading: true, error: null })
    ontology.node(nodeKey).then((r) => alive && (setRef(r), setState({ loading: false, error: null })), (e) => alive && setState({ loading: false, error: e }))
    return () => { alive = false }
  }, [nodeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!nodeKey) {
    return <div className="hidden p-6 text-center text-sm text-muted lg:block">Select an entity in the graph to see its definition, attributes, relationships, joins, formulas and evidence.</div>
  }

  const name = cleanMojibake(graphNode?.name || ref?.name || nodeKey)
  const color = graphNode?.color || ref?.color || '#94a3b8'
  const custom = mode === 'custom' && graphNode

  // relationships: client graph -> derived from the version's edges; KG0 -> ontology API (may include entities outside the current view)
  let rels = []
  if (custom) {
    const byKey = Object.fromEntries((graphNodes || []).map((n) => [n.key, n]))
    rels = (graphEdges || []).filter((e) => e.source === nodeKey || e.target === nodeKey).map((e) => {
      const out = e.source === nodeKey
      const o = byKey[out ? e.target : e.source]
      return { direction: out ? 'out' : 'in', label: cleanMojibake(e.label), node_key: o?.key, node_name: cleanMojibake(o?.name), origin: e.origin, change_state: e.change_state }
    })
  } else if (ref) {
    rels = (ref.relationships || []).map((r) => ({ ...r, label: cleanMojibake(r.label), node_name: cleanMojibake(r.node_name) }))
  }
  const present = new Set((graphNodes || []).map((n) => n.key))
  const definition = cleanMojibake(graphNode?.definition || ref?.definition)
  const rawAttrs = graphNode?.attributes || ref?.attributes || []
  const attributes = rawAttrs.map((a) => (typeof a === 'string' ? cleanMojibake(a) : typeof a?.name === 'string' ? { ...a, name: cleanMojibake(a.name) } : a))
  const rawFormulas = graphNode?.formulas?.length ? graphNode.formulas : ref?.formulas || []
  const formulas = rawFormulas.map(cleanMojibake)
  const joins = [...new Map(rels.filter((r) => r.node_key).map((r) => [r.node_key, r.node_name])).entries()]
  const role = graphNode?.role

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b border-line p-4">
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold leading-snug">{name}</h3>
          {custom && graphNode.ref_name && graphNode.ref_name !== graphNode.name && <p className="text-xs text-muted">Reference name: {graphNode.ref_name}</p>}
          <p className="mt-0.5 text-xs text-muted">{graphNode?.group_name || ref?.group_name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {role && ROLE_LABEL[role] && <span className="badge border border-line text-muted">{ROLE_LABEL[role]}</span>}
            {graphNode?.kind && graphNode.kind !== 'domain' && <span className="badge border border-line text-muted">{graphNode.kind}</span>}
            {custom && <span className="badge border border-brand/40 bg-brand/10 text-brand">origin: {graphNode.origin}</span>}
            {custom && graphNode.change_state !== 'unchanged' && <span className={`badge border ${graphNode.change_state === 'added' ? 'border-ok/40 bg-ok/10 text-ok' : 'border-warn/40 bg-warn/10 text-warn'}`}>{graphNode.change_state}{graphNode.added_in_version ? ` in KG${graphNode.added_in_version}` : ''}</span>}
          </div>
        </div>
        <button className="rounded-lg p-1 text-muted hover:bg-surface2 hover:text-ink" onClick={onClose} aria-label="Close details"><X size={18} /></button>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto p-4 pt-1 text-sm">
        {state.loading && <Loading label="Loading entity…" className="!p-4" />}
        {state.error && <ErrorState error={state.error} className="!p-4" />}
        {definition && <Section title="Definition"><p className="leading-relaxed">{definition}</p></Section>}

        {custom && graphNode.notes && <Section title="Client notes / business rules"><p className="whitespace-pre-wrap rounded-lg bg-surface2 p-2 text-[13px]">{cleanMojibake(graphNode.notes)}</p></Section>}

        {attributes.length > 0 && (
          <Section title={`Attributes (${attributes.length})`}>
            <div className="flex flex-wrap gap-1.5">{attributes.map((a) => <span key={a} className="rounded-md bg-surface2 px-2 py-0.5 font-mono text-[11px]">{a}</span>)}</div>
          </Section>
        )}
        {ref?.canon_attributes?.length > 0 && (
          <Section title={`Canonical attributes · ${ref.canon?.section || ''}`}>
            <div className="flex flex-wrap gap-1.5">{ref.canon_attributes.map((a) => <span key={a} className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px]">{a}</span>)}</div>
          </Section>
        )}

        {formulas.length > 0 && (
          <Section title="Formulas (verbatim from the ontology)" icon={FunctionSquare}>
            <ul className="space-y-1.5">{formulas.map((f) => <li key={f} className="rounded-lg bg-surface2 px-2.5 py-1.5 font-mono text-[12px] leading-snug">{f}</li>)}</ul>
          </Section>
        )}

        <Section title={`Relationships (${rels.length})`} icon={Link2}>
          {rels.length === 0 && <p className="text-xs text-muted">No relationships recorded.</p>}
          <ul className="space-y-1">
            {rels.map((r, i) => (
              <li key={i}>
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface2" onClick={() => r.node_key && onSelect?.(r.node_key)}>
                  {r.direction === 'out' ? <ArrowRight size={14} className="shrink-0 text-brand" /> : <ArrowLeft size={14} className="shrink-0 text-brand" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{r.node_name}</span>
                    <span className="block text-[11px] text-muted">{r.direction === 'out' ? 'this' : r.node_name} —{r.label}→ {r.direction === 'out' ? r.node_name : 'this'}{r.cross_domain ? ' · cross-domain' : ''}{r.node_key && graphNodes && !present.has(r.node_key) ? ' · not in current view' : ''}</span>
                  </span>
                  {r.change_state && r.change_state !== 'unchanged' && <span className="badge border border-ok/40 text-ok">{r.change_state}</span>}
                </button>
              </li>
            ))}
          </ul>
        </Section>

        {joins.length > 0 && (
          <Section title="Joins — navigate to related entities">
            <div className="flex flex-wrap gap-1.5">{joins.map(([k, n]) => <button key={k} className="chip" onClick={() => onSelect?.(k)}>{n}</button>)}</div>
          </Section>
        )}

        {ref?.canon?.joins && <Section title={`Canon joins · ${ref.canon.section}`}><p className="text-[13px] leading-relaxed text-muted">{ref.canon.joins}</p></Section>}

        {(ref?.evidence || ref?.canon || graphNode?.evidence) && (
          <Section title="Evidence & source references" icon={BookOpen}>
            {(ref?.evidence || graphNode?.evidence) && <p className="text-[13px] leading-relaxed">{ref?.evidence || graphNode?.evidence}</p>}
            {ref?.canon && (
              <p className="mt-2 rounded-lg bg-surface2 p-2 text-xs text-muted">
                <b className="text-ink">FMCG ONTOLOGY.md {ref.canon.section}</b> — {ref.canon.title}
                {ref.canon.evidence && <><br />{ref.canon.evidence}</>}
              </p>
            )}
          </Section>
        )}

        {ref?.domains?.length > 0 && (
          <Section title="Appears in sub-domains">
            <div className="flex flex-wrap gap-1.5">{ref.domains.map((d) => <span key={d.slug} className="badge border border-line text-muted">{d.code} · {d.role}</span>)}</div>
          </Section>
        )}
        {children}
      </div>
    </div>
  )
}

/** Desktop: side column. Mobile/tablet: bottom sheet with backdrop. */
export function DetailsShell({ open, onClose, children }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} />}
      <aside
        className={`${open ? 'sheet-enter fixed inset-x-0 bottom-0 z-50 max-h-[78vh]' : 'hidden'} overflow-hidden rounded-t-2xl border border-line bg-surface shadow-card
          lg:static lg:z-auto lg:block lg:max-h-none lg:rounded-2xl`}
        aria-label="Entity details"
      >
        {children}
      </aside>
    </>
  )
}
