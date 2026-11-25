import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  Compass,
  MessageSquare,
  Upload,
  FileCheck,
  Layers,
  X,
  Sparkles,
  Database,
  FileText,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  FileSpreadsheet,
  FileCode,
  Bot,
  User
} from 'lucide-react'
import { domains } from '../../api'
import { useAuth } from '../../context/AuthContext'

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function getFileIcon(ext) {
  const cleanExt = (ext || '').toLowerCase().replace('.', '')
  if (['csv', 'xlsx', 'xls', 'tsv'].includes(cleanExt)) {
    return <FileSpreadsheet size={15} className="text-emerald-500 shrink-0" />
  }
  if (['json', 'sql', 'xml'].includes(cleanExt)) {
    return <FileCode size={15} className="text-amber-500 shrink-0" />
  }
  return <FileText size={15} className="text-sky-500 shrink-0" />
}

export default function DomainJourneyTracker({ className = '' }) {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { isAnalyst } = useAuth()

  const fullPath = (location.pathname || '') + ' ' + (typeof window !== 'undefined' ? window.location.pathname : '')
  const isExcludedPage =
    fullPath.includes('/models') ||
    fullPath.includes('/apps') ||
    fullPath.includes('/login') ||
    fullPath.includes('/register')

  const [journeyData, setJourneyData] = useState([])
  const [journeyLoading, setJourneyLoading] = useState(false)
  const [workspaceName, setWorkspaceName] = useState(null)
  const [activeModalItem, setActiveModalItem] = useState(null)

  const activeWorkspaceName = useMemo(() => {
    const raw =
      searchParams.get('model') ||
      sessionStorage.getItem('afx_current_workspace') ||
      sessionStorage.getItem('afx_active_model_name') ||
      null
    if (!raw) return null
    try {
      return decodeURIComponent(raw).replace(/\+/g, ' ')
    } catch {
      return raw.replace(/\+/g, ' ')
    }
  }, [searchParams, location.search, location.pathname])

  const loadJourney = React.useCallback(() => {
    if (isAnalyst || isExcludedPage) return
    const model = activeWorkspaceName

    domains
      .workspaceJourney(model)
      .then((res) => {
        setJourneyData(Array.isArray(res?.journey) ? res.journey : [])
        if (res?.workspace_name) {
          setWorkspaceName(res.workspace_name)
        }
      })
      .catch(() => {
        setJourneyData([])
      })
      .finally(() => {
        setJourneyLoading(false)
      })
  }, [activeWorkspaceName, isAnalyst])

  useEffect(() => {
    setJourneyLoading(true)
    loadJourney()
  }, [loadJourney])

  useEffect(() => {
    const handleRefresh = () => loadJourney()
    window.addEventListener('afx_journey_refresh', handleRefresh)
    // window.addEventListener('focus', handleRefresh)
    // const interval = setInterval(handleRefresh, 6000)
    return () => {
      window.removeEventListener('afx_journey_refresh', handleRefresh)
      // window.removeEventListener('focus', handleRefresh)
      // clearInterval(interval)
    }
  }, [loadJourney])

  if (isAnalyst || isExcludedPage) return null

  const displayWsName = activeWorkspaceName || workspaceName

  return (
    <section className={`mt-6 rounded-2xl border border-line bg-surface shadow-card overflow-hidden ${className}`}>
      <div className="px-5 py-4 border-b border-line bg-surface2/30 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-brand/10 text-brand text-xs font-bold">
            <Compass size={15} />
          </span>
          <span className="text-base font-bold text-ink">My domainwise journey</span>
          {displayWsName && (
            <span className="text-xs px-2.5 py-0.5 rounded-full border border-line font-medium bg-surface text-brand">
              Workspace: {displayWsName.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <span className="text-xs text-muted">
          Tracks domains and checkpoints worked on in this workspace
        </span>
      </div>

      <div className="p-5">
        {journeyLoading ? (
          <div className="py-6 text-center text-xs text-muted">
            Loading domain journey...
          </div>
        ) : journeyData.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-6 text-center bg-surface2/20">
            <p className="text-sm font-medium text-ink">No domain activity recorded in this workspace yet.</p>
            <p className="text-xs text-muted mt-1">
              Select any domain in the ontology graph above to start chatting or uploading data.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {journeyData.map((item) => {
              const summaryDetails = []
              if (item.checkpoint_key === 'finalized') {
                summaryDetails.push('Model finalized & published into governed twin')
              }
              if (item.files_count > 0) {
                summaryDetails.push(`${item.files_count} dataset file${item.files_count > 1 ? 's' : ''} uploaded`)
              }
              if (item.user_messages_count > 0) {
                summaryDetails.push(`${item.user_messages_count} business answer${item.user_messages_count > 1 ? 's' : ''} captured`)
              }
              if (item.proposals_count > 0) {
                summaryDetails.push(`${item.proposals_count} change proposal${item.proposals_count > 1 ? 's' : ''}`)
              }
              const shortSummary = summaryDetails.join(' • ') || 'Domain ontology explored & configured'

              return (
                <div
                  key={item.domain_slug}
                  onClick={() => setActiveModalItem(item)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-line bg-surface hover:border-brand/40 hover:bg-surface2/40 hover:shadow-sm transition flex-wrap sm:flex-nowrap gap-3 cursor-pointer group"
                  title="Click to view full domain activity details"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-black tracking-wide shrink-0 border"
                      style={{
                        backgroundColor: `${item.domain_color || '#4f46e5'}18`,
                        color: item.domain_color || '#4f46e5',
                        borderColor: `${item.domain_color || '#4f46e5'}33`,
                      }}
                    >
                      {item.domain_code}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-sm font-bold text-ink">
                          {item.domain_name}
                        </h4>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${item.checkpoint_key === 'finalized'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : item.checkpoint_key === 'data_input'
                              ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                            }`}
                        >
                          {item.checkpoint_key === 'finalized' && <CheckCircle2 size={12} />}
                          {item.checkpoint_key === 'data_input' && <Upload size={12} />}
                          {item.checkpoint_key === 'business_input' && <MessageSquare size={12} />}
                          <span>{item.checkpoint}</span>
                        </span>
                      </div>
                      <p className="text-xs text-muted mt-1 font-medium">
                        {shortSummary}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      {/* Detail Popup Modal */}
      {activeModalItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setActiveModalItem(null)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-2xl animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-line shrink-0">
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1.5 rounded-xl text-sm font-black tracking-wide border shadow-2xs"
                  style={{
                    backgroundColor: `${activeModalItem.domain_color || '#4f46e5'}18`,
                    color: activeModalItem.domain_color || '#4f46e5',
                    borderColor: `${activeModalItem.domain_color || '#4f46e5'}33`,
                  }}
                >
                  {activeModalItem.domain_code}
                </span>
                <div>
                  <h3 className="text-base font-bold text-ink">
                    {activeModalItem.domain_name}
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Domain Activity & Checkpoint Details
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface2 transition cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Checkpoint Status Banner */}
            <div className="flex items-center justify-between p-3.5 mt-4 rounded-xl bg-surface2/60 border border-line shrink-0">
              <span className="text-xs font-semibold text-muted">Current Checkpoint:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${activeModalItem.checkpoint_key === 'finalized'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                  : activeModalItem.checkpoint_key === 'data_input'
                    ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                  }`}
              >
                {activeModalItem.checkpoint_key === 'finalized' && <CheckCircle2 size={14} />}
                {activeModalItem.checkpoint_key === 'data_input' && <Upload size={14} />}
                {activeModalItem.checkpoint_key === 'business_input' && <MessageSquare size={14} />}
                <span>{activeModalItem.checkpoint}</span>
              </span>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                Completed Actions in this Domain
              </h4>

              {/* Model Status */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-line bg-surface2/30">
                <span className="mt-0.5 text-brand shrink-0">
                  <Sparkles size={16} />
                </span>
                <div>
                  <strong className="block font-semibold text-xs text-ink">Model Status</strong>
                  <span className="text-xs text-muted">
                    {activeModalItem.checkpoint_key === 'finalized'
                      ? 'Model finalized and published as a governed digital twin.'
                      : 'Domain ontology customized and currently in active development.'}
                  </span>
                </div>
              </div>

              {/* Data & Telemetry Ingestion (Uploaded Files Section) */}
              <div className="p-3.5 rounded-xl border border-line bg-surface2/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sky-500 shrink-0">
                      <Database size={16} />
                    </span>
                    <div>
                      <strong className="block font-semibold text-xs text-ink">Data & Telemetry Ingestion</strong>
                      <span className="text-[11px] text-muted">
                        {activeModalItem.files_count > 0
                          ? `${activeModalItem.files_count} dataset/spreadsheet file(s) uploaded and parsed.`
                          : 'No external dataset files uploaded yet.'}
                      </span>
                    </div>
                  </div>
                  {activeModalItem.uploaded_files_list && activeModalItem.uploaded_files_list.length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-semibold border border-sky-200 dark:border-sky-800">
                      {activeModalItem.uploaded_files_list.length} file{activeModalItem.uploaded_files_list.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Uploaded Files Detailed List */}
                {activeModalItem.uploaded_files_list && activeModalItem.uploaded_files_list.length > 0 && (
                  <div className="mt-2 space-y-2 pt-2 border-t border-line/60">
                    {activeModalItem.uploaded_files_list.map((f, idx) => (
                      <div
                        key={f.id || idx}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-line bg-surface hover:bg-surface2/60 transition text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {getFileIcon(f.ext || f.original_name?.split('.').pop())}
                          <div className="min-w-0">
                            <p className="font-semibold text-ink truncate text-xs" title={f.original_name}>
                              {f.original_name}
                            </p>
                            <p className="text-[10px] text-muted flex items-center gap-2 mt-0.5">
                              {f.size_bytes ? <span>{formatBytes(f.size_bytes)}</span> : null}
                              {f.stage && <span className="capitalize">• {f.stage.replace(/_/g, ' ')}</span>}
                              {f.created_at && (
                                <span>
                                  • {new Date(f.created_at).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {f.status && (
                          <span className="shrink-0 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface2 text-muted border border-line">
                            {f.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Business Input Section */}
              <div className="p-3.5 rounded-xl border border-line bg-surface2/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-indigo-500 shrink-0">
                      <MessageSquare size={16} />
                    </span>
                    <div>
                      <strong className="block font-semibold text-xs text-ink">Business Input</strong>
                      <span className="text-[11px] text-muted">
                        {activeModalItem.user_messages_count > 0
                          ? `${activeModalItem.user_messages_count} answer(s) recorded in discovery.`
                          : 'No business inputs submitted yet.'}
                      </span>
                    </div>
                  </div>
                  {activeModalItem.qa_list && activeModalItem.qa_list.filter((qa) => qa.answer && qa.answer.trim()).length > 0 && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800">
                      {activeModalItem.qa_list.filter((qa) => qa.answer && qa.answer.trim()).length} Q&A
                    </span>
                  )}
                </div>

                {/* Q&A Chat Conversation Thread (Only answered questions) */}
                {activeModalItem.qa_list && activeModalItem.qa_list.filter((qa) => qa.answer && qa.answer.trim()).length > 0 && (
                  <div className="mt-2 space-y-3 pt-3 border-t border-line/60">
                    {activeModalItem.qa_list
                      .filter((qa) => qa.answer && qa.answer.trim())
                      .map((qa, idx) => (
                        <div
                          key={qa.id || idx}
                          className="space-y-2.5"
                        >
                          {/* Question (Assistant message bubble) */}
                          <div className="flex gap-2.5 items-start">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-surface2 text-brand border border-line text-xs font-semibold shadow-2xs">
                              <Bot size={14} />
                            </span>
                            <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-brand/30 bg-brand/5 dark:bg-brand/10 px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-2xs text-ink">
                              <p className="whitespace-pre-wrap font-medium">
                                {qa.question}
                              </p>
                            </div>
                          </div>

                          {/* Answer (User message bubble) */}
                          <div className="flex gap-2.5 flex-row-reverse items-start">
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-brand/20 text-xs font-semibold shadow-2xs">
                              <User size={14} />
                            </span>
                            <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand text-white px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-2xs">
                              <p className="whitespace-pre-wrap font-medium">
                                {qa.answer}
                              </p>
                              {qa.answered_at && (
                                <span className="block text-[10px] text-white/75 mt-1 text-right">
                                  {new Date(qa.answered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                                  · {new Date(qa.answered_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Proposals Count if any */}
              {activeModalItem.proposals_count > 0 && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-line bg-surface2/30">
                  <span className="mt-0.5 text-amber-500 shrink-0">
                    <FileCheck size={16} />
                  </span>
                  <div>
                    <strong className="block font-semibold text-xs text-ink">Change Proposals</strong>
                    <span className="text-xs text-muted">
                      {activeModalItem.proposals_count} structural change proposal(s) processed.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-line flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface2 hover:bg-surface2/80 text-ink border border-line transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
