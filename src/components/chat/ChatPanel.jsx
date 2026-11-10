import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Lock,
  MessageSquare,
  Send,
  SkipForward,
  Sparkles,
  UploadCloud,
  User,
  Zap,
} from 'lucide-react'
import { Spinner } from '../common/States'
import { chat } from '../../api'
import { useToast } from '../../context/ToastContext'

const KIND_LABEL = {
  question: 'Question',
  ack: 'Acknowledgment',
  decision: 'Session Decision',
  proposal: 'Change Proposal',
  node_qa: 'Entity Analysis',
  intro: 'Welcome',
  system: 'System',
  telemetry: 'Finance Data Assistant',
}

function formatCleanContent(text) {
  if (!text || typeof text !== 'string') return ''
  return text
    // Replace raw unicode escape representations if any (e.g. \ud83d)
    .replace(/\\u[0-9a-fA-F]{4}/g, (match) => {
      try {
        return JSON.parse(`"${match}"`)
      } catch {
        return ''
      }
    })
    // Remove emojis & symbol sequences
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    // Normalize smart curly quotes, dashes, and bullets
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/•/g, '-')
    .replace(/[—–]/g, '-')
    // Strip markdown bold asterisks: **text** -> text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[ \t]*\*[ \t]+/gm, '- ')
    // Replace technical terms KG1 / KG2 / KG0 with user-friendly domain terminology
    .replace(/\bGap Analysis \(KG2 Evolution\) Complete\b/gi, 'Gap Analysis Complete')
    .replace(/\(KG2 Evolution\)/gi, '')
    .replace(/\(KG2\)/gi, '')
    .replace(/\bwith KG1\b/gi, 'with your core domain model')
    .replace(/\bacross (\d+) KG1 entities\b/gi, 'across $1 entities')
    .replace(/\bKG1 entities\b/gi, 'entities')
    .replace(/\bKG1\b/g, 'Domain Model')
    .replace(/\bKG2\b/g, 'Telemetry Analysis')
    .replace(/\bKG0\b/g, 'Reference Model')
    .trim()
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
  onNextToUpload,
  isUploadOpen,
  parsingProgress,
}) {
  const toast = useToast()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('answer')
  const [wittyDialogue, setWittyDialogue] = useState(null)
  const end = useRef(null)

  // Interactive witty bot updates while parsing data (MOM Step 4)
  useEffect(() => {
    if (!parsingProgress?.fileName) return

    const { fileName } = parsingProgress
    setWittyDialogue({
      text: `Let me read your data and do a deep dive into “${fileName}”...`,
      sub: 'Scanning document headers & schemas',
      step: 1,
    })

    const t1 = setTimeout(() => {
      setWittyDialogue({
        text: `Crunching through rows and formulas... I don't even have a coffee break! ☕`,
        sub: 'Parsing table dimensions and identifiers',
        step: 2,
      })
    }, 2200)

    const t2 = setTimeout(() => {
      setWittyDialogue({
        text: `Cross-referencing telemetry columns with your core business model and rules...`,
        sub: 'Correlating with Finance ontology',
        step: 3,
      })
    }, 4500)

    const t3 = setTimeout(() => {
      setWittyDialogue({
        text: `Data parsing complete for “${fileName}”! Synthesizing Gap Analysis...`,
        sub: 'Ready for discrepancy review',
        step: 4,
      })
      // fetch persisted telemetry message from backend
      chat.get(slug).then(setSnap).catch(() => { })
    }, 7000)

    const t4 = setTimeout(() => {
      setWittyDialogue(null)
    }, 12000)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      clearTimeout(t4)
    }
  }, [parsingProgress?.timestamp, parsingProgress?.fileName, slug, setSnap])

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [snap?.messages?.length, wittyDialogue])

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

  const handleDecision = (action) => {
    run(
      () => chat.decision(slug, action),
      (r) => {
        merge(r)
      }
    )
  }

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
            Explore entity definitions, governance rules, and calculate formulas. Grounded strictly in the Finance reference ontology.
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
            {isComplete ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                Domain Discovery Complete
                <span className="ml-1 text-muted font-normal text-[11px]">
                  ({answeredCount} {answeredCount === 1 ? 'question' : 'questions'} explored)
                </span>
              </span>
            ) : activeSnap.awaiting_session_decision ? (
              <span className="text-amber-600 dark:text-amber-400 font-semibold">
                Session Check: Continue or Proceed?
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
              <span className="text-ink font-semibold">Domain Discovery Active</span>
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
            className={`h-full transition-all duration-500 ${isComplete
              ? 'w-full bg-emerald-500'
              : 'bg-gradient-to-r from-brand to-indigo-500'
              }`}
            style={{ width: isComplete ? '100%' : `${Math.min(95, Math.max(20, (answeredCount + 1) * 20))}%` }}
          />
        </div>

        {/* Status indicator with 'Next: Upload Data' Action Button (MOM Step 3) */}
        {(isComplete || answeredCount >= 1) && (
          <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 px-3 py-2 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-semibold truncate">
              <CheckCircle2 size={14} className="text-[#10b981] shrink-0" />
              <span className="truncate">
                {isComplete ? 'Discovery Complete · Model Ready' : 'Nuances Captured · Model Ready'}
              </span>
            </div>
            {onNextToUpload && (
              <button
                type="button"
                onClick={onNextToUpload}
                className={`btn text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer font-bold shadow-sm transition-all ${isUploadOpen
                  ? 'btn-ghost border-[#10b981] text-[#10b981]'
                  : 'bg-[#10b981] hover:bg-[#059669] text-white shadow-emerald-500/25 hover:scale-105'
                  }`}
              >
                {isUploadOpen ? (
                  <>
                    <span>Viewing Upload</span>
                    <CheckCircle2 size={13} />
                  </>
                ) : (
                  <>
                    <span>Next: Upload Data</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Messages Thread */}
      <div className="scroll-thin flex-1 space-y-3.5 overflow-y-auto p-4" role="log" aria-live="polite">
        {activeSnap.messages.map((m, idx) => {
          const isUser = m.role === 'user'
          const isDecisionMsg = m.kind === 'decision' || m.meta?.awaiting_session_decision
          const isTelemetry = m.kind === 'telemetry'

          return (
            <div key={m.id} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs font-semibold shadow-2xs ${isUser
                  ? 'bg-brand text-white shadow-brand/20'
                  : isTelemetry
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-surface2 text-brand border border-line'
                  }`}
              >
                {isUser ? <User size={14} /> : isTelemetry ? <Sparkles size={14} className="text-[#10b981]" /> : <Bot size={14} />}
              </span>

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-2xs ${isUser
                  ? 'bg-brand text-white rounded-tr-sm'
                  : isDecisionMsg
                    ? 'border-2 border-brand/50 bg-brand/10 text-ink rounded-tl-sm'
                    : isTelemetry
                      ? 'border border-emerald-500/35 bg-emerald-50/70 dark:bg-emerald-950/25 rounded-tl-sm text-ink shadow-xs'
                      : m.kind === 'question'
                        ? 'border border-brand/40 bg-brand/5 rounded-tl-sm text-ink'
                        : 'border border-line/70 bg-surface2/70 text-ink rounded-tl-sm'
                  }`}
              >
                {KIND_LABEL[m.kind] && !isUser && (
                  <span
                    className={`mb-1 block text-[10px] font-bold uppercase tracking-wider ${isTelemetry ? 'text-emerald-700 dark:text-emerald-400' : 'text-brand'
                      }`}
                  >
                    {KIND_LABEL[m.kind]}
                    {m.meta?.followup ? ' · Follow-up' : ''}
                  </span>
                )}
                <span className="whitespace-pre-wrap">{formatCleanContent(m.content)}</span>
              </div>
            </div>
          )
        })}

        {/* Live Witty Dialogue Stream while parsing data (MOM Step 4) */}
        {wittyDialogue && (
          <div className="rounded-2xl border border-emerald-500/35 bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 text-xs shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                <Sparkles size={14} className="text-[#10b981] animate-spin" />
                <span>Finance Data Assistant</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25 font-semibold">
                Deep Dive Step {wittyDialogue.step} of 4
              </span>
            </div>
            <p className="font-medium text-ink leading-relaxed">
              "{wittyDialogue.text}"
            </p>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted">
              <span className="italic">{wittyDialogue.sub}</span>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">Crunching</span>
              </div>
            </div>
          </div>
        )}

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
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 text-center text-xs">
            <div className="flex items-center justify-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
              <Lock size={13} />
              <span>Digital Twin Governed</span>
            </div>
            <p className="mt-1 text-[11px] text-muted">{disabledReason}</p>
            <div className="mt-2 flex justify-center">
              <Link to={`/finance/${slug}/finalize`} className="btn-ghost btn-sm text-[11px] text-ink hover:text-brand cursor-pointer">
                Review or Re-open Twin →
              </Link>
            </div>
          </div>
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

            {/* Session decision quick banner if awaiting decision */}
            {activeSnap.awaiting_session_decision && !isComplete && (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2 text-xs">
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Ready to proceed, or continue exploring?
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDecision('continue')}
                    className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink hover:text-brand transition cursor-pointer disabled:opacity-50"
                  >
                    Continue
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleDecision('proceed')}
                    className="rounded-lg bg-brand px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand/90 transition cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    Proceed
                  </button>
                </div>
              </div>
            )}

            {/* Discovery Complete / KG1 Milestone Card (MOM Step 3) */}
            {isComplete && onNextToUpload && !isUploadOpen && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/20 p-3.5 text-xs space-y-2 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300">
                  <Sparkles size={15} className="text-[#10b981]" />
                  <span>Domain Discovery Complete</span>
                </div>
                <p className="text-muted leading-relaxed">
                  Your initial questionnaire responses have successfully synthesized your <strong>Domain Knowledge Model</strong>. Ingest your business data files (CSV, Excel, PDF, SQL) to initiate Gap Analysis.
                </p>
                <button
                  type="button"
                  onClick={onNextToUpload}
                  className="btn bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm shadow-emerald-500/25 flex items-center gap-2 cursor-pointer transition-transform hover:scale-[1.02]"
                >
                  <UploadCloud size={14} />
                  <span>Next: Upload Business Data</span>
                  <ArrowRight size={14} />
                </button>
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
            <form onSubmit={send} className="relative flex items-stretch gap-2">
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
                className="grid w-11 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-sm transition hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 cursor-pointer"
                disabled={busy || !text.trim()}
                aria-label="Send message"
              >
                <Send size={15} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
