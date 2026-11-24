import React, { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Compass, MessageSquare, Upload } from 'lucide-react'
import { domains } from '../../api'
import { useAuth } from '../../context/AuthContext'

export default function DomainJourneyTracker({ className = '' }) {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { isAnalyst } = useAuth()

  const fullPath = (location.pathname || '') + ' ' + (typeof window !== 'undefined' ? window.location.pathname : '')
  const isExcludedPage =
    fullPath.includes('/models') ||
    fullPath.includes('/apps') ||
    fullPath.includes('/login') ||
    fullPath.includes('/register') ||
    fullPath.includes('/finalize') ||
    fullPath.includes('/twin')

  const [journeyData, setJourneyData] = useState([])
  const [journeyLoading, setJourneyLoading] = useState(false)
  const [workspaceName, setWorkspaceName] = useState(null)

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
    window.addEventListener('focus', handleRefresh)
    const interval = setInterval(handleRefresh, 6000)
    return () => {
      window.removeEventListener('afx_journey_refresh', handleRefresh)
      window.removeEventListener('focus', handleRefresh)
      clearInterval(interval)
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
          <span className="text-base font-bold text-ink">My Domain wise Journey</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {journeyData.map((item) => (
              <div
                key={item.domain_slug}
                className="group flex items-center justify-between p-4 rounded-xl border border-line bg-surface hover:border-brand/40 hover:shadow-sm transition"
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
                    <h4 className="text-sm font-semibold text-ink truncate group-hover:text-brand transition">
                      {item.domain_name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted font-normal">Checkpoint:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          item.checkpoint_key === 'finalized'
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
                      {item.files_count > 0 && (
                        <span className="text-[11px] text-muted">
                          ({item.files_count} file{item.files_count > 1 ? 's' : ''})
                        </span>
                      )}
                      {item.user_messages_count > 0 && item.checkpoint_key === 'business_input' && (
                        <span className="text-[11px] text-muted">
                          ({item.user_messages_count} answer{item.user_messages_count > 1 ? 's' : ''})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  to={item.resume_url}
                  className="ml-3 shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface2/60 text-xs font-semibold text-ink hover:bg-brand hover:text-white hover:border-brand transition shadow-sm"
                >
                  <span>Resume</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
