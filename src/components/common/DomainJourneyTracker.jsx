import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Compass, MessageSquare, Upload, FileCheck, Layers } from 'lucide-react'
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
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-line bg-surface hover:border-brand/40 hover:shadow-xs transition flex-wrap sm:flex-nowrap gap-3"
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
    </section>
  )
}
