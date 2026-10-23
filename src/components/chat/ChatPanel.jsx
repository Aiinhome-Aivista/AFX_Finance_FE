import { useEffect, useRef, useState } from 'react'
import { Bot, ChevronRight, HelpCircle, MessageSquare, Send, SkipForward, Sparkles, User, Zap } from 'lucide-react'
import { Spinner } from '../common/States'
import { chat } from '../../api'
import { useToast } from '../../context/ToastContext'

const KIND_LABEL = {
  question: 'Question',
  ack: 'Acknowledgment',
  proposal: 'Change Proposal',
  node_qa: 'Entity Analysis',
  intro: 'Welcome',
  system: 'System',
}

export default function ChatPanel({
  slug,
  domainName,
  snap,
  setSnap,
  askNode,
  nodeName,
  onProposal,
  onGraphUpdate,
  onAnsweringChange,
  locked,
  disabledReason,
  onSwitchToDetails,
}) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('answer')
  const end = useRef(null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [snap?.messages?.length])

  useEffect(() => {
    if (askNode) {
      setMode('ask')
    }
  }, [askNode])

  const merge = (r) => {
    setSnap((s) => ({ ...r, messages: [...(s?.messages || []), ...r.messages] }))
    if (r?.graph_updated || r?.graph) {
      onGraphUpdate?.(r)
    }
  }

  const run = async (fn, after) => {
    setBusy(true)
    try {
      const r = await fn()
      after?.(r)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const start = () => run(() => chat.start(slug), (r) => {
    setSnap(r)
    if (r?.graph_updated || r?.graph) onGraphUpdate?.(r)
  })

  const send = (e) => {
    e?.preventDefault()
    const msg = text.trim()
    if (!msg) return
    setText('')
    const isAnsweringQuestion = mode === 'answer' && !!activeSnap?.open_question
    if (isAnsweringQuestion) {
      onAnsweringChange?.(true)
    }
    if (mode === 'ask' && askNode) {
      run(() => chat.askNode(slug, askNode, msg), merge)
    } else if (isAnsweringQuestion) {
      run(
        () => chat.answer(slug, msg),
        (r) => {
          merge(r)
          onAnsweringChange?.(false)
        }
      ).catch(() => onAnsweringChange?.(false))
    } else {
      run(() => chat.message(slug, msg, askNode), merge)
    }
  }

  const skip = () => {
    onAnsweringChange?.(true)
    run(
      () => chat.answer(slug, 'skip'),
      (r) => {
        merge(r)
        onAnsweringChange?.(false)
      }
    ).catch(() => onAnsweringChange?.(false))
  }

  const propose = () =>
    run(
      () => chat.propose(slug),
      (r) => {
        merge(r)
        if (r.proposal) {
          onProposal?.(r.proposal)
          toast.success('Generated proposed changes. Ready for review!')
        } else {
          toast.success('Your answers align with the reference graph — no structural changes needed.')
        }
      }
    )

  const activeSnap = snap || {
    conversation_id: null,
    messages: [],
    open_question: null,
    progress: { answered: 0, planned: 0, plan_complete: false },
    pending_change_count: 0,
    engine: 'Assistant',
    llm_enabled: false,
  }

  // Welcome state when conversation hasn't started yet
  if (!activeSnap.conversation_id) {
    return (
      <div className="relative flex h-full flex-col items-center justify-center overflow-hidden p-6 sm:p-8 text-center bg-gradient-to-b from-surface via-surface to-surface2">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-brand/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-indigo-500/10 blur-2xl" />

        <div className="relative z-10 max-w-sm flex flex-col items-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-tr from-brand via-indigo-600 to-purple-600 text-white shadow-lg shadow-brand/30">
            <Bot size={28} />
          </div>

          <h3 className="mt-4 text-lg font-bold tracking-tight text-ink">
            {domainName ? `${domainName} Assistant` : 'Domain Assistant'}
          </h3>

          <p className="mt-2 text-xs leading-relaxed text-muted">
            Explore entity definitions, governance rules, and calculate formulas. Grounded strictly in the FMCG reference ontology.
          </p>

          <div className="mt-6 flex flex-col gap-2 w-full text-left">
            <button
              onClick={start}
              disabled={busy || locked}
              className="group flex items-center justify-between rounded-xl border border-brand/30 bg-brand/10 p-3 text-xs font-semibold text-brand transition hover:bg-brand hover:text-white shadow-2xs cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={16} />
                <span>Start Conversation</span>
              </div>
              <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </button>

            {askNode && (
              <button
                onClick={() => {
                  start()
                }}
                className="group flex items-center justify-between rounded-xl border border-line bg-surface p-3 text-xs text-ink transition hover:border-brand/40 hover:bg-surface2 cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate">
                  <HelpCircle size={15} className="text-muted shrink-0" />
                  <span className="truncate">Ask about “{nodeName || askNode}”</span>
                </div>
                <ChevronRight size={14} className="text-muted shrink-0" />
              </button>
            )}
          </div>

          {disabledReason && <p className="mt-4 text-xs text-warn">{disabledReason}</p>}
        </div>
      </div>
    )
  }

  const q = activeSnap.open_question
  const isComplete = Boolean(activeSnap.progress?.plan_complete && !q)
  const answeredCount = activeSnap.progress?.answered || 0

  return (
    <div className="flex h-full flex-col bg-surface/90 text-ink">
      {/* Sub-Header: Progress and status */}
      <div className="border-b border-line/70 px-4 py-2.5 bg-surface2/30">
        <div className="flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles size={13} className={isComplete ? 'text-emerald-500' : 'text-brand'} />
            {isComplete ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Domain Discovery Complete
                <span className="ml-1 text-muted font-normal text-[11px]">
                  ({answeredCount} {answeredCount === 1 ? 'question' : 'questions'} explored)
                </span>
              </span>
            ) : q ? (
              <>
                <span className="text-ink">Domain Discovery:</span>
                <span className="text-brand font-semibold">
                  Question #{answeredCount + 1}
                </span>
                <span className="text-muted text-[11px] font-normal">
                  (Context-driven)
                </span>
              </>
            ) : (
              <span className="text-ink font-semibold">Graph Copilot Active</span>
            )}
          </div>

          {activeSnap.pending_change_count > 0 && (
            <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-bold text-warn border border-warn/30">
              {activeSnap.pending_change_count} change(s) proposed
            </span>
          )}
        </div>

        {/* Micro progress bar */}
        <div className="mt-2 h-1.5 w-full rounded-full bg-surface2 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isComplete
                ? 'w-full bg-emerald-500'
                : 'bg-gradient-to-r from-brand to-indigo-500'
            }`}
            style={{ width: isComplete ? '100%' : `${Math.min(95, Math.max(20, (answeredCount + 1) * 20))}%` }}
          />
        </div>
      </div>

      {/* Messages Thread */}
      <div className="scroll-thin flex-1 space-y-3.5 overflow-y-auto p-4" role="log" aria-live="polite">
        {activeSnap.messages.map((m) => {
          const isUser = m.role === 'user'

          return (
            <div key={m.id} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-semibold shadow-2xs ${isUser
                  ? 'bg-brand text-white shadow-brand/20'
                  : 'bg-surface2 text-brand border border-line'
                  }`}
              >
                {isUser ? <User size={14} /> : <Bot size={14} />}
              </span>

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-2xs ${isUser
                  ? 'bg-brand text-white rounded-tr-sm'
                  : m.kind === 'question'
                    ? 'border border-brand/40 bg-brand/5 rounded-tl-sm text-ink'
                    : 'border border-line/70 bg-surface2/70 text-ink rounded-tl-sm'
                  }`}
              >
                {KIND_LABEL[m.kind] && !isUser && (
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-brand">
                    {KIND_LABEL[m.kind]}
                    {m.meta?.followup ? ' · Follow-up' : ''}
                  </span>
                )}
                <span className="whitespace-pre-wrap">{m.content}</span>
              </div>
            </div>
          )
        })}

        {busy && (
          <div className="flex items-center gap-2 text-xs text-muted pl-9">
            <Spinner size={14} />
            <span>Analyzing ontology & phrasing response…</span>
          </div>
        )}

        <div ref={end} />
      </div>

      {/* Bottom Controls & Input */}
      <div className="border-t border-line/70 p-3 bg-surface/95">
        {locked ? (
          <p className="text-center text-xs text-muted py-2">{disabledReason}</p>
        ) : (
          <div className="space-y-2">
            {/* Context chip if a node is selected */}
            {askNode && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-brand/10 border border-brand/25 px-2.5 py-1.5 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Zap size={13} className="text-brand shrink-0" />
                  <span className="text-muted">Target:</span>
                  <span className="font-semibold text-brand truncate">{nodeName || askNode}</span>
                </div>
                {onSwitchToDetails && (
                  <button
                    onClick={onSwitchToDetails}
                    className="text-[11px] font-semibold text-brand hover:underline shrink-0 cursor-pointer"
                  >
                    View specs →
                  </button>
                )}
              </div>
            )}

            {/* Mode selection chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* <button
                type="button"
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer border ${
                  mode === 'chat' || (!q && mode !== 'ask')
                    ? 'bg-brand text-white border-brand shadow-2xs font-semibold'
                    : 'border-line bg-surface2 text-muted hover:text-ink'
                }`}
                onClick={() => setMode('chat')}
              >
                Graph Copilot
              </button> */}

              {q && (
                <button
                  type="button"
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer border ${mode === 'answer'
                    ? 'bg-brand text-white border-brand shadow-2xs font-semibold'
                    : 'border-line bg-surface2 text-muted hover:text-ink'
                    }`}
                  onClick={() => setMode('answer')}
                >
                  Answer
                </button>
              )}

              {/* <button
                type="button"
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition cursor-pointer border ${mode === 'ask'
                    ? 'bg-brand text-white border-brand shadow-2xs font-semibold'
                    : 'border-line bg-surface2 text-muted hover:text-ink'
                  }`}
                onClick={() => setMode('ask')}
                disabled={!askNode}
                title={askNode ? '' : 'Click an entity on the graph first'}
              >
                {askNode ? `Ask about “${nodeName || askNode}”` : 'Ask selected node'}
              </button> */}

              {q && (
                <button
                  type="button"
                  className="ml-auto inline-flex items-center gap-1 rounded-lg border border-line bg-surface2 px-2.5 py-1 text-[11px] font-medium text-muted hover:text-ink cursor-pointer disabled:opacity-40"
                  onClick={skip}
                  disabled={busy || !q}
                  title="Skip this question"
                >
                  <SkipForward size={11} /> Skip
                </button>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={send} className="relative flex items-end gap-2">
              <textarea
                className="input min-h-[46px] max-h-32 flex-1 resize-none rounded-xl border border-line bg-surface px-3 py-2 text-xs sm:text-[13px] text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-2xs"
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={4000}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    send(e)
                  }
                }}
                placeholder={
                  mode === 'ask'
                    ? `Ask about ${nodeName || 'this entity'}…`
                    : mode === 'answer' && q
                      ? 'Type your answer…'
                      : 'Ask a question or describe your process…'
                }
                disabled={busy}
                aria-label="Message the assistant"
              />

              <button
                type="submit"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-sm transition hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
                disabled={busy || !text.trim()}
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>

            {/* Propose changes button */}
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface2/60 px-3 py-2 text-xs font-semibold text-ink transition hover:border-brand/40 hover:bg-surface2 hover:text-brand cursor-pointer disabled:opacity-40"
              onClick={propose}
              disabled={busy || (activeSnap.pending_change_count === 0 && activeSnap.progress.answered === 0)}
            >
              <Sparkles size={14} className="text-brand" />
              <span>Review proposed graph changes</span>
              {activeSnap.pending_change_count > 0 && (
                <span className="rounded-full bg-brand px-1.5 py-0.2 text-[10px] text-white">
                  {activeSnap.pending_change_count}
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
