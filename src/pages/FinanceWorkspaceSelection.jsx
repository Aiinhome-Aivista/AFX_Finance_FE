import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, FolderKanban, Plus, ShieldCheck, Sparkles, Trash2, CheckCircle2, X } from 'lucide-react'
import Layout from '../components/common/Layout'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { Loading } from '../components/common/States'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { domains } from '../api'

const sortModelsByRecent = (list) => {
  return [...(list || [])]
    .filter((m) => m && m.name && m.name.trim())
    .sort((a, b) => {
      const tA = new Date(a.savedAt || a.updatedAt || a.createdAt || 0).getTime()
      const tB = new Date(b.savedAt || b.updatedAt || b.createdAt || 0).getTime()
      return tB - tA
    })
}

export default function FinanceWorkspaceSelection() {
  const nav = useNavigate()
  const { isAnalyst } = useAuth()
  const toast = useToast()

  // 1. My Finance Models: Populated directly from backend database API
  const [savedModels, setSavedModels] = useState([])

  // 2. Published Models: Populated directly from backend database API
  const [publishedModels, setPublishedModels] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedMyModel, setSelectedMyModel] = useState(null)
  const [selectedPublishedModel, setSelectedPublishedModel] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev))
    }, 3500)
  }

  // Fetch dynamically from backend database on mount - database is the single source of truth
  useEffect(() => {
    let alive = true

    domains
      .customModels()
      .then((res) => {
        if (!alive) return
        const beSaved = res?.saved_models || []
        const bePublished = res?.published_models || []
        setSavedModels(sortModelsByRecent(beSaved))
        setPublishedModels(bePublished)
      })
      .catch((err) => {
        console.warn('Backend custom models fetch error:', err)
      })
      .finally(() => {
        if (alive) {
          setLoading(false)
        }
      })

    return () => {
      alive = false
    }
  }, [])

  const sortedSavedModels = useMemo(() => sortModelsByRecent(savedModels), [savedModels])

  // Auto-select first available model if none selected (the most recently saved workspace)
  useEffect(() => {
    if (isAnalyst) {
      if (publishedModels.length > 0 && !selectedPublishedModel) {
        setSelectedPublishedModel(publishedModels[0].name)
      }
    } else {
      if (sortedSavedModels.length > 0 && !selectedMyModel && !selectedPublishedModel) {
        setSelectedMyModel(sortedSavedModels[0].name)
      } else if (publishedModels.length > 0 && !selectedPublishedModel && !selectedMyModel) {
        setSelectedPublishedModel(publishedModels[0].name)
      }
    }
  }, [isAnalyst, sortedSavedModels, publishedModels, selectedMyModel, selectedPublishedModel])

  const handleDeleteSavedModel = (e, modelName) => {
    e.stopPropagation()
    setDeleteTarget({ name: modelName, type: 'saved' })
  }

  const handleDeletePublishedModel = (e, modelName) => {
    e.stopPropagation()
    setDeleteTarget({ name: modelName, type: 'published' })
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    const { name: modelName, type } = deleteTarget
    const displayName = (modelName || '').replace(/_/g, ' ')
    setIsDeleting(true)

    try {
      await domains.deleteCustomModel(modelName)
      if (type === 'saved') {
        const updated = sortModelsByRecent(savedModels.filter((m) => m.name !== modelName))
        setSavedModels(updated)
        if (selectedMyModel === modelName) {
          setSelectedMyModel(updated[0]?.name || null)
        }
      } else {
        const updated = publishedModels.filter((m) => m.name !== modelName)
        setPublishedModels(updated)
        if (selectedPublishedModel === modelName) {
          setSelectedPublishedModel(updated[0]?.name || null)
        }
      }
      toast.success(`"${displayName}" workspace and database deleted successfully!`)
      setDeleteTarget(null)
    } catch (err) {
      console.error('Delete model API error:', err)
      toast.error('Failed to delete workspace: ' + (err.message || 'Server error'))
    } finally {
      setIsDeleting(false)
    }
  }

  // Method 2: Publish action (moves model from My Finance Models to Published Models and saves to backend database)
  const handlePublishModel = (modelName) => {
    const targetName = modelName || selectedMyModel
    if (!targetName) return

    const m = savedModels.find((x) => x.name === targetName)
    if (!m) return

    const pubItem = {
      name: m.name,
      slug: m.slug || 'planning-budgeting-forecasting',
      domainName: m.domainName || (m.slug ? m.slug.replace(/-/g, ' ') : ' '),
      publishedAt: new Date().toISOString(),
      governed: true,
      nodes: m.nodes || [],
      edges: m.edges || [],
      certifiedBy: 'A3 (Data Architect)',
    }

    // 1. Add to Published Models
    const nextPublished = [pubItem, ...publishedModels.filter((p) => p.name !== targetName)]
    setPublishedModels(nextPublished)

    // 2. Remove from My Finance Models (transfer across)
    const nextSaved = sortModelsByRecent(savedModels.filter((x) => x.name !== targetName))
    setSavedModels(nextSaved)

    // 3. Update selection state to newly published model
    setSelectedPublishedModel(pubItem.name)
    setSelectedMyModel(null)

    // 4. Persist to backend database dynamically
    domains
      .publishCustomModel({
        name: pubItem.name,
        slug: pubItem.slug,
        domainName: pubItem.domainName,
      })
      .then(() => domains.customModels())
      .then((res) => {
        if (res?.published_models) {
          setPublishedModels(res.published_models)
        }
        if (res?.saved_models) {
          const sorted = sortModelsByRecent(res.saved_models)
          setSavedModels(sorted)
        }
      })
      .catch((err) => console.warn('Backend custom model publish warning:', err))

    showToast(`"${targetName.replace(/_/g, ' ')}" published as Governed Digital Twin!`)
  }

  const handleGo = () => {
    if (selectedPublishedModel) {
      const pub = publishedModels.find((m) => m.name === selectedPublishedModel)
      if (pub) {
        const targetSlug = pub.slug || 'planning-budgeting-forecasting'
        sessionStorage.setItem(`afx_active_wf_${targetSlug}`, String(pub.workflow_id || ''))
        sessionStorage.setItem(`afx_active_model_${targetSlug}`, pub.name)
        sessionStorage.setItem('afx_current_workspace', pub.name)
        sessionStorage.setItem('afx_active_model_name', pub.name)
        sessionStorage.removeItem('afx_fresh_session')
        const queryParams = `?wf=${pub.workflow_id || ''}&model=${encodeURIComponent(pub.name)}`
        if (isAnalyst) {
          if (pub.workflow_id) {
            nav(`/finance/${targetSlug}/dashboard?wf=${pub.workflow_id}`)
          } else {
            nav(`/finance/${targetSlug}/twin${queryParams}`, {
              state: { modelName: pub.name, model: pub },
            })
          }
          return
        }
        nav(`/finance/${targetSlug}/twin${queryParams}`, {
          state: { modelName: pub.name, model: pub },
        })
        return
      }
    }

    if (selectedMyModel) {
      const my = savedModels.find((m) => m.name === selectedMyModel)
      if (my) {
        const targetSlug = my.slug || 'planning-budgeting-forecasting'
        sessionStorage.setItem(`afx_active_wf_${targetSlug}`, String(my.workflow_id || ''))
        sessionStorage.setItem(`afx_active_model_${targetSlug}`, my.name)
        sessionStorage.setItem('afx_current_workspace', my.name)
        sessionStorage.setItem('afx_active_model_name', my.name)
        sessionStorage.removeItem('afx_fresh_session')
        const queryParams = `?wf=${my.workflow_id || ''}&model=${encodeURIComponent(my.name)}`

        if (my.stage === 'twin' || my.isTwin) {
          nav(`/finance/${targetSlug}/twin${queryParams}`, {
            state: { modelName: my.name, model: my },
          })
          return
        }
        if (my.stage === 'finalize') {
          nav(`/finance/${targetSlug}/finalize${queryParams}`, {
            state: { modelName: my.name, model: my },
          })
          return
        }

        nav(`/finance/${targetSlug}${queryParams}`, {
          state: { modelName: my.name, model: my },
        })
        return
      }
    }

    // Default fallback: Open Finance Knowledge Graph
    nav('/finance')
  }

  const selectedTargetModel = useMemo(() => {
    if (selectedPublishedModel) {
      return {
        name: selectedPublishedModel,
        isPublished: true,
      }
    }
    if (selectedMyModel) {
      return {
        name: selectedMyModel,
        isPublished: false,
      }
    }
    return null
  }, [selectedPublishedModel, selectedMyModel])

  const [newModalOpen, setNewModalOpen] = useState(false)
  const [newWorkspaceInput, setNewWorkspaceInput] = useState('')

  const handleOpenNewModal = () => {
    const now = new Date()
    const month = now.toLocaleString('default', { month: 'short' })
    const day = now.getDate()
    setNewWorkspaceInput(`Workspace_${day}_${month}`)
    setNewModalOpen(true)
  }

  const handleCreateNewWorkspace = (e) => {
    e?.preventDefault()
    const cleanName = (newWorkspaceInput || '').trim()
    if (!cleanName) return

    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith('afx_active_wf_') || k.startsWith('afx_active_model_') || k.startsWith('afx_current_workspace')) {
        sessionStorage.removeItem(k)
      }
    })
    sessionStorage.removeItem('afx_active_model_name')
    sessionStorage.removeItem('afx_fresh_session')
    sessionStorage.setItem('afx_current_workspace', cleanName)
    sessionStorage.setItem('afx_active_model_name', cleanName)
    setNewModalOpen(false)

    toast.success(`Workspace "${cleanName}" created!`)
    nav(`/finance?model=${encodeURIComponent(cleanName)}`, { replace: true })
  }

  if (loading) {
    return (
      <Layout hideWorkflowBar>
        <div className="min-h-[70vh] flex flex-col items-center justify-center">
          <Loading label="Loading finance models…" className="text-base" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout hideWorkflowBar>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Top Breadcrumb & Title */}
        <div className="mb-6 space-y-1.5">
          <Link
            to="/apps"
            className="inline-flex items-center gap-1.5 text-xs text-mute hover:text-ink font-semibold transition"
          >
            <ArrowLeft size={14} />
            <span>Back to Domain Model Selection</span>
          </Link>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 text-xs font-semibold mb-1">
                <Sparkles size={12} className="text-[#10b981]" />
                <span>Finance Workspace</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                Finance Workspace
              </h1>
              <p className="text-xs sm:text-sm text-mute">
                {isAnalyst ? (
                  <>
                    Select a governed <span className="text-[#10b981] font-semibold">Digital Twin</span> model from Published Models and click Go.
                  </>
                ) : (
                  <>
                    Select your customized model on the left, use the arrow to publish as a governed{' '}
                    <span className="text-[#10b981] font-semibold">Digital Twin</span> on the right, then click Go.
                  </>
                )}
              </p>
            </div>

            {/* Top Right Quick Action: [New] (Data Architect Only) */}
            {!isAnalyst && (
              <button
                type="button"
                onClick={handleOpenNewModal}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-[#0b1320] shadow-sm transition cursor-pointer"
                title="Create a new Finance workspace"
              >
                <Plus size={15} />
                <span>New Workspace</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast Feedback */}
        {toastMsg && (
          <div
            role="status"
            className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-500 dark:text-emerald-400 animate-fadeIn"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#10b981]" />
              <span className="font-semibold">{toastMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMsg('')}
              className="text-xs font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {isAnalyst ? (
          /* Data Analyst View: ONLY Published Models */
          <div className="max-w-2xl mx-auto mt-4">
            <section
              aria-label="Published Models"
              className="card p-5 border border-line bg-surface flex flex-col min-h-[380px] shadow-2xs"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-[#10b981] flex items-center justify-center">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink">Published Models</h2>
                    <p className="text-xs text-mute">Enterprise Governed Digital Twins</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-surface2 border border-line text-mute">
                  {publishedModels.length}
                </span>
              </div>

              {publishedModels.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center p-6">
                  <p className="text-xs text-mute">
                    No certified digital twin models published yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1 scroll-thin">
                  {publishedModels.map((m) => {
                    const isSelected = selectedPublishedModel === m.name
                    return (
                      <div
                        key={m.name}
                        onClick={() => {
                          setSelectedPublishedModel(m.name)
                          setSelectedMyModel(null)
                        }}
                        className={`w-full group text-left rounded-xl border p-4 transition-all focus:outline-none cursor-pointer relative ${isSelected
                          ? 'border-[#10b981] bg-[#10b981]/10 ring-2 ring-[#10b981]/30 shadow-md'
                          : 'border-line bg-surface2/60 hover:border-[#10b981]/50 hover:bg-surface2'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h3 className="text-sm font-bold text-ink">{m.name.replace(/_/g, ' ')}</h3>
                          <div className="flex items-center gap-1.5">
                            {!isAnalyst && (
                              <button
                                type="button"
                                onClick={(e) => handleDeletePublishedModel(e, m.name)}
                                className="p-1 text-muted hover:text-red-500 hover:bg-surface rounded transition opacity-50 hover:opacity-100 group-hover:opacity-100 cursor-pointer"
                                title="Delete published workspace"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-mute mt-1">
                          Domain: {(m.domainName || m.slug?.replace(/-/g, ' ') || '').replace(/\s*[·-]\s*Governed Architecture/i, '')}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-mute pt-2 border-t border-line/40">
                          <span>Published on {m.publishedAt ? new Date(m.publishedAt).toLocaleDateString() : 'Recent'}</span>
                          <span className="text-[#10b981] font-semibold">Explore Digital Twin →</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        ) : (
          /* Data Architect View: 2-Column Side-by-Side View with Center Arrow Transfer */
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch mt-4">
            {/* Left Column: My Finance Models (Only Saved Models) */}
            <section
              aria-label="My Finance Models"
              className="card p-5 border border-line bg-surface flex flex-col min-h-[380px] shadow-2xs"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-[#10b981] flex items-center justify-center">
                    <FolderKanban size={15} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink">My Finance Models</h2>
                    <p className="text-xs text-mute">Models saved via "Save As"</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-surface2 border border-line text-mute">
                  {savedModels.length}
                </span>
              </div>

              {savedModels.length === 0 ? (
                <div className="flex-1" />
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1 scroll-thin">
                  {sortedSavedModels.map((m) => {
                    const isSelected = selectedMyModel === m.name

                    return (
                      <div
                        key={m.name}
                        onClick={() => {
                          setSelectedMyModel(m.name)
                          setSelectedPublishedModel(null)
                        }}
                        className={`w-full text-left rounded-xl border p-4 transition-all focus:outline-none cursor-pointer relative group ${isSelected
                          ? 'border-[#10b981] bg-[#10b981]/10 ring-2 ring-[#10b981]/30 shadow-md'
                          : 'border-line bg-surface2/60 hover:border-[#10b981]/50 hover:bg-surface2'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h3 className="text-sm font-bold text-ink">{m.name.replace(/_/g, ' ')}</h3>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/30">
                              Saved Snapshot
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSavedModel(e, m.name)}
                              className="p-1 text-muted hover:text-red-500 hover:bg-surface rounded transition opacity-40 hover:opacity-100 group-hover:opacity-100 cursor-pointer"
                              title="Delete saved snapshot"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-mute mt-1">
                          Domain: {m.domainName || (m.slug ? m.slug.replace(/-/g, ' ') : ' ')}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-mute pt-2 border-t border-line/40">
                          <span>Saved on {m.savedAt ? new Date(m.savedAt).toLocaleDateString() : (m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'Recent')}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handlePublishModel(m.name)
                            }}
                            className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981] hover:text-[#0b1320] border border-[#10b981]/40 transition inline-flex items-center gap-1 cursor-pointer"
                            title="Directly publish this model into Published Models"
                          >
                            <ShieldCheck size={11} />
                            <span>Publish →</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {/* Center Arrow Transfer Control (Directly matching sketch: [Finance Model] -> [Published Models]) */}
            <div className="flex md:flex-col items-center justify-center gap-3 py-4">
              <button
                type="button"
                onClick={() => handlePublishModel(selectedMyModel)}
                disabled={!selectedMyModel}
                aria-label="Publish selected model to Published Models"
                title={selectedMyModel ? `Publish "${selectedMyModel.replace(/_/g, ' ')}" to Published Models` : 'Select a saved model on the left to publish'}
                className={`h-11 w-11 rounded-xl border flex items-center justify-center transition-all ${selectedMyModel
                  ? 'bg-[#10b981] border-[#10b981] text-[#0b1320] shadow-md shadow-[#10b981]/25 hover:bg-[#34d399] cursor-pointer'
                  : 'bg-surface border-line text-mute opacity-40 cursor-not-allowed'
                  }`}
              >
                <ArrowRight size={18} />
              </button>
            </div>

            {/* Right Column: Published Models (Only Finalized / Published Models) */}
            <section
              aria-label="Published Models"
              className="card p-5 border border-line bg-surface flex flex-col min-h-[380px] shadow-2xs"
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-[#10b981] flex items-center justify-center">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-ink">Published Models</h2>
                    <p className="text-xs text-mute">Enterprise Governed Digital Twins</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-surface2 border border-line text-mute">
                  {publishedModels.length}
                </span>
              </div>

              {publishedModels.length === 0 ? (
                <div className="flex-1" />
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1 scroll-thin">
                  {publishedModels.map((m) => {
                    const isSelected = selectedPublishedModel === m.name
                    return (
                      <div
                        key={m.name}
                        onClick={() => {
                          setSelectedPublishedModel(m.name)
                          setSelectedMyModel(null)
                        }}
                        className={`w-full group text-left rounded-xl border p-4 transition-all focus:outline-none cursor-pointer relative ${isSelected
                          ? 'border-[#10b981] bg-[#10b981]/10 ring-2 ring-[#10b981]/30 shadow-md'
                          : 'border-line bg-surface2/60 hover:border-[#10b981]/50 hover:bg-surface2'
                          }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h3 className="text-sm font-bold text-ink">{m.name.replace(/_/g, ' ')}</h3>
                          <div className="flex items-center gap-1.5">
                            {!isAnalyst && (
                              <button
                                type="button"
                                onClick={(e) => handleDeletePublishedModel(e, m.name)}
                                className="p-1 text-muted hover:text-red-500 hover:bg-surface rounded transition opacity-50 hover:opacity-100 group-hover:opacity-100 cursor-pointer"
                                title="Delete published workspace"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-mute mt-1">
                          Domain: {(m.domainName || m.slug?.replace(/-/g, ' ') || '').replace(/\s*[·-]\s*Governed Architecture/i, '')}
                        </p>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-mute pt-2 border-t border-line/40">
                          <span>Published on {m.publishedAt ? new Date(m.publishedAt).toLocaleDateString() : 'Recent'}</span>
                          <span className="text-[#10b981] font-semibold">Explore Digital Twin →</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Bottom Bar: Selected Workspace Model and Go Action Button */}
        < div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm" >
          <div className="text-xs text-mute">
            {selectedTargetModel ? (
              <span>
                Selected Model:{' '}
                <strong className="text-ink font-bold text-sm ml-1 font-mono">
                  {selectedTargetModel.name}
                </strong>
                {selectedTargetModel.isPublished ? (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                    Published Twin
                  </span>
                ) : (
                  <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30">
                    Saved Snapshot
                  </span>
                )}
              </span>
            ) : isAnalyst ? (
              <span>Click any published model to select it and click Go to inspect the digital twin.</span>
            ) : (
              <span>Select any saved or published model to select it and click Go, or click + New to create a fresh model.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGo}
              disabled={!selectedTargetModel}
              className={`inline-flex items-center gap-2 rounded-xl px-7 py-2.5 text-sm font-bold transition-all ${selectedTargetModel
                ? 'cursor-pointer bg-[#10b981] text-[#0b1320] shadow-md shadow-[#10b981]/30 ring-2 ring-[#10b981]/50 hover:bg-[#34d399]'
                : 'bg-surface2 border border-line text-mute opacity-50 cursor-not-allowed'
                }`}
            >
              <span>Go</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Modern In-App Confirmation Popup for Deleting Workspace */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Workspace?"
        confirmLabel="Delete"
        danger
        busy={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => !isDeleting && setDeleteTarget(null)}
      >
        <p className="text-sm">
          Are you sure you want to permanently delete{' '}
          <span className="font-semibold text-ink">
            &ldquo;{(deleteTarget?.name || '').replace(/_/g, ' ')}&rdquo;
          </span>?
        </p>
      </ConfirmDialog>

      {/* New Workspace Creation Modal */}
      {newModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-2xl transition-all">
            <button
              type="button"
              onClick={() => setNewModalOpen(false)}
              className="absolute top-4 right-4 rounded-xl p-1.5 text-muted hover:text-ink hover:bg-surface2 transition cursor-pointer"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <FolderKanban size={18} />
              </span>
              <div>
                <h3 className="text-base font-bold text-ink">New Finance Workspace</h3>
                <p className="text-xs text-muted">A dedicated workspace container for all your finance domains</p>
              </div>
            </div>
            <form onSubmit={handleCreateNewWorkspace} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newWorkspaceInput}
                  onChange={(e) => setNewWorkspaceInput(e.target.value)}
                  placeholder="e.g. 23 Nov WS 1"
                  autoFocus
                  className="w-full rounded-xl border border-line bg-surface2 px-3.5 py-2 text-sm text-ink font-medium focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="btn-ghost px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newWorkspaceInput.trim()}
                  className="btn-primary px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Create Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
