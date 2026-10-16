import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, MessageSquareText, Target } from 'lucide-react'
import Layout from '../components/common/Layout'
import Stepper from '../components/common/Stepper'
import { ErrorState, Loading } from '../components/common/States'
import GraphCanvas from '../components/graph/GraphCanvas'
import NodeDetailsPanel, { DetailsShell } from '../components/graph/NodeDetailsPanel'
import ChatPanel from '../components/chat/ChatPanel'
import ProposalReview from '../components/chat/ProposalReview'
import useAsync from '../components/common/useAsync'
import { chat, domains, graphs } from '../api'
import { useToast } from '../context/ToastContext'

export default function Customize() {
  const { slug } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [snap, setSnap] = useState(null)
  const [proposal, setProposal] = useState(null)
  const [selected, setSelected] = useState(null)
  const [askNode, setAskNode] = useState(null)
  const [viewVersion, setViewVersion] = useState(null) // null = working graph
  const [deciding, setDeciding] = useState(false)

  const wf = useAsync(() => domains.workflow(slug), [slug])
  const dom = useAsync(() => domains.get(slug), [slug])
  const vers = useAsync(() => graphs.versions(slug), [slug], { immediate: false })
  const graph = useAsync(() => (viewVersion === null ? graphs.working(slug) : graphs.versionGraph(slug, viewVersion)), [slug, viewVersion], { immediate: false })
  const ready = wf.data?.steps?.[2]?.status === 'completed'

  useEffect(() => { if (ready) { graph.reload().catch(() => {}); vers.reload().catch(() => {}) } }, [ready, viewVersion]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!ready) return
    chat.get(slug).then(setSnap, (e) => toast.error(e.message))
    graphs.proposals(slug).then((r) => setProposal(r.proposals.find((p) => p.status === 'pending' && p.source === 'chat') || null), () => {})
  }, [ready, slug]) // eslint-disable-line react-hooks/exhaustive-deps

  const finalized = !!wf.data?.finalized_version_number
  const g = graph.data
  const node = g?.nodes.find((n) => n.key === selected)
  const select = useCallback((k) => { setSelected(k); setAskNode(k) }, [])

  const decide = async (mode, ids) => {
    setDeciding(true)
    try {
      const r = await graphs.decide(slug, proposal.id, { mode, approved_item_ids: ids })
      setProposal(null)
      if (r.version) { toast.success(`${r.version.label} created. New and changed items are highlighted.`); setViewVersion(null); await Promise.all([graph.reload(), vers.reload(), wf.reload()]) }
      else toast.success('Proposal rejected. Your graph is unchanged.')
      chat.get(slug).then(setSnap).catch(() => {})
    } catch (e) {
      toast.error(e.details?.length ? `${e.message} (${e.details.map((d) => d.errors?.[0]).filter(Boolean)[0] || 'dependency'})` : e.message)
      if (e.code === 'proposal_stale') setProposal(null)
    } finally { setDeciding(false) }
  }
  const focus = async (k) => {
    try { const r = await chat.focus(slug, k); setSnap((s) => ({ ...r, messages: [...(s?.messages || []), ...r.messages] })); toast.success('The chatbot will now ask about this entity.') } catch (e) { toast.error(e.message) }
  }
  const latest = vers.data?.versions?.slice(-1)[0]
  const counts = useMemo(() => ({ added: g?.nodes.filter((n) => n.change_state === 'added').length || 0, mod: g?.nodes.filter((n) => n.change_state === 'modified').length || 0 }), [g])

  if (wf.data && !wf.data.started) return <Navigate to={`/finance/${slug}`} replace />
  if (wf.loading && !wf.data) return <Layout wide><Loading /></Layout>
  if (wf.error) return <Layout wide><ErrorState error={wf.error} onRetry={wf.reload} /></Layout>
  if (!ready) return <Navigate to={`/finance/${slug}/graph`} replace />

  return (
    <Layout wide>
      <Link to={`/finance/${slug}/graph`} className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ArrowLeft size={14} /> Reference graph</Link>
      <Stepper slug={slug} steps={wf.data.steps} current={4} />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-semibold">Tell us how your business really works</h1><p className="text-sm text-muted">{dom.data?.name} · answers become proposed changes; you approve them to create KG1, KG2…</p></div>
        {latest && <Link to={`/finance/${slug}/finalize`} className="btn-ghost">{finalized ? 'View finalisation' : 'Review & finalise'} <ArrowRight size={16} /></Link>}
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="h-[72vh] min-h-[460px]">
          <ChatPanel slug={slug} snap={snap} setSnap={setSnap} askNode={askNode} nodeName={g?.nodes.find((n) => n.key === askNode)?.name}
            onProposal={setProposal} locked={finalized} disabledReason={finalized ? 'The ontology is finalised. Re-open it on the finalisation page to continue.' : undefined} />
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-muted" htmlFor="ver">Showing</label>
            <select id="ver" className="input !w-auto text-sm" value={viewVersion ?? 'work'} onChange={(e) => setViewVersion(e.target.value === 'work' ? null : Number(e.target.value))}>
              <option value="work">{latest ? `Current: ${latest.label}` : 'Current: KG0 baseline (selected blocks)'}</option>
              <option value={0}>KG0 baseline (selected blocks)</option>
              {vers.data?.versions.map((v) => <option key={v.number} value={v.number}>{v.label} · {v.kind}</option>)}
            </select>
            {g && <span className="text-xs text-muted">{counts.added} new · {counts.mod} modified · {g.nodes.length} entities · {g.edges.length} relationships</span>}
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="card relative h-[56vh] min-h-[380px] overflow-hidden">
              {graph.loading && !g && <Loading className="h-full" />}
              {graph.error && <ErrorState error={graph.error} onRetry={graph.reload} />}
              {g && <GraphCanvas nodes={g.nodes} edges={g.edges} selectedKey={selected} onSelect={select} minimap={false} />}
            </div>
            <DetailsShell open={!!selected} onClose={() => setSelected(null)}>
              <div className="h-full lg:max-h-[56vh] lg:min-h-[380px]">
                <NodeDetailsPanel nodeKey={selected} graphNode={node} graphNodes={g?.nodes} graphEdges={g?.edges} onSelect={select} onClose={() => setSelected(null)} mode="custom">
                  {node && !finalized && (
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-3">
                      <button className="btn-ghost btn-sm" onClick={() => setAskNode(node.key)}><MessageSquareText size={14} /> Ask the chatbot</button>
                      <button className="btn-ghost btn-sm" onClick={() => focus(node.key)}><Target size={14} /> Ask questions about this</button>
                    </div>
                  )}
                </NodeDetailsPanel>
              </div>
            </DetailsShell>
          </div>
          <p className="text-xs text-muted">Green = added, amber = modified (relative to the previous version). The reference graph KG0 is never changed.</p>
          {proposal && <ProposalReview proposal={proposal} busy={deciding} onDecide={decide} />}
        </div>
      </div>
    </Layout>
  )
}
