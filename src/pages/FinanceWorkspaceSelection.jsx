import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, FolderKanban, Plus, ShieldCheck, Sparkles, Trash2, CheckCircle2 } from 'lucide-react'
import Layout from '../components/common/Layout'
import { useAuth } from '../context/AuthContext'
import { domains } from '../api'

export default function FinanceWorkspaceSelection() {
  const nav = useNavigate()
  const { isAnalyst } = useAuth()

  // 1. My Finance Models: Populated dynamically from backend (and cached locally)
  const [savedModels, setSavedModels] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem('afx_saved_models') || '[]')
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  })

  // 2. Published Models: Populated dynamically from backend (and cached locally)
  const [publishedModels, setPublishedModels] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem('afx_published_models') || '[]')
      return Array.isArray(data) ? data : []
    } catch {
      return []
    }
  })

  const [selectedMyModel, setSelectedMyModel] = useState(null)
  const [selectedPublishedModel, setSelectedPublishedModel] = useState(null)
  const [toastMsg, setToastMsg] = useState('')

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? '' : prev))
    }, 3500)
  }

  // Fetch dynamically from backend database on mount so changes are visible across all browsers & sessions
  useEffect(() => {
    let alive = true

    const localSaved = JSON.parse(localStorage.getItem('afx_saved_models') || '[]')
    const localPublished = JSON.parse(localStorage.getItem('afx_published_models') || '[]')

    domains
      .customModels()
      .then((res) => {
        if (!alive) return
        const beSaved = res?.saved_models || []
        const bePublished = res?.published_models || []

        // If backend database is empty but local storage has models, sync them to the database
        if (beSaved.length === 0 && bePublished.length === 0 && (localSaved.length > 0 || localPublished.length > 0)) {
          domains
            .syncCustomModels({ saved: localSaved, published: localPublished })
            .then((syncRes) => {
              if (!alive) return
              const nextSaved = syncRes?.saved_models || localSaved
              const nextPub = syncRes?.published_models || localPublished
              setSavedModels(nextSaved)
              setPublishedModels(nextPub)
              localStorage.setItem('afx_saved_models', JSON.stringify(nextSaved))
              localStorage.setItem('afx_published_models', JSON.stringify(nextPub))
            })
            .catch(() => {})
        } else {
          // Backend is the source of truth across all browsers
          setSavedModels(beSaved)
          setPublishedModels(bePublished)
          localStorage.setItem('afx_saved_models', JSON.stringify(beSaved))
          localStorage.setItem('afx_published_models', JSON.stringify(bePublished))
        }
      })
      .catch((err) => {
        console.warn('Backend custom models fetch error:', err)
      })

    return () => {
      alive = false
    }
  }, [])

  // Auto-select first available model if none selected
  useEffect(() => {
    if (savedModels.length > 0 && !selectedMyModel && !selectedPublishedModel) {
      setSelectedMyModel(savedModels[0].name)
    } else if (publishedModels.length > 0 && !selectedPublishedModel && !selectedMyModel) {
      setSelectedPublishedModel(publishedModels[0].name)
    }
  }, [savedModels, publishedModels, selectedMyModel, selectedPublishedModel])

  const handleDeleteSavedModel = (e, modelName) => {
    e.stopPropagation()
    const updated = savedModels.filter((m) => m.name !== modelName)
    setSavedModels(updated)
    localStorage.setItem('afx_saved_models', JSON.stringify(updated))
    if (selectedMyModel === modelName) {
      setSelectedMyModel(updated[0]?.name || null)
    }
    domains.deleteCustomModel(modelName).catch((err) => console.warn('Delete model API warning:', err))
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
      domainName: m.domainName || (m.slug ? m.slug.replace(/-/g, ' ') : 'Planning, Budgeting and Forecasting'),
      publishedAt: new Date().toISOString(),
      governed: true,
      nodes: m.nodes || [],
      edges: m.edges || [],
      certifiedBy: 'A3 (Data Architect)',
    }

    // 1. Add to Published Models
    const nextPublished = [pubItem, ...publishedModels.filter((p) => p.name !== targetName)]
    setPublishedModels(nextPublished)
    localStorage.setItem('afx_published_models', JSON.stringify(nextPublished))

    // 2. Remove from My Finance Models (transfer across)
    const nextSaved = savedModels.filter((x) => x.name !== targetName)
    setSavedModels(nextSaved)
    localStorage.setItem('afx_saved_models', JSON.stringify(nextSaved))

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
      .catch((err) => console.warn('Backend custom model publish warning:', err))

    showToast(`"${targetName.replace(/_/g, ' ')}" published as Governed Digital Twin!`)
  }

  const handleGo = () => {
    if (selectedPublishedModel) {
      const pub = publishedModels.find((m) => m.name === selectedPublishedModel)
      if (pub) {
        nav(`/finance/${pub.slug || 'planning-budgeting-forecasting'}/twin`)
        return
      }
    }

    if (selectedMyModel) {
      const my = savedModels.find((m) => m.name === selectedMyModel)
      if (my) {
        nav(`/finance/${my.slug || 'planning-budgeting-forecasting'}`)
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

  const handleNewModel = () => {
    sessionStorage.setItem('afx_fresh_session', 'true')
    sessionStorage.setItem('afx_fresh_timestamp', String(Date.now()))

    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('afx_custom_graph_') || k.startsWith('afx_gap_cache_') || k.startsWith('afx_working_graph_')) {
          localStorage.removeItem(k)
        }
      })
    } catch {}

    domains.resetWorkspace().catch(() => {})
    nav('/finance?fresh=1')
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
                Select your customized model on the left, use the arrow to publish as a Governed Digital Twin on the right, then click Go.
              </p>
            </div>

            {/* Top Right Quick Action: [New] */}
            <button
              type="button"
              onClick={handleNewModel}
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-[#0b1320] shadow-sm transition cursor-pointer"
              title="Create a new Finance domain model"
            >
              <Plus size={15} />
              <span>New</span>
            </button>
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

        {/* 2-Column Side-by-Side View with Center Arrow Transfer (matches user hand-drawn sketch and AppSelect layout) */}
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
                {savedModels.map((m) => {
                  const isSelected = selectedMyModel === m.name
                  const nodeCount = m.nodes?.length || 9
                  const edgeCount = m.edges?.length || 0

                  const handleNewModel = () => {
    sessionStorage.setItem('afx_fresh_session', 'true')
    sessionStorage.setItem('afx_fresh_timestamp', String(Date.now()))

    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('afx_custom_graph_') || k.startsWith('afx_gap_cache_') || k.startsWith('afx_working_graph_')) {
          localStorage.removeItem(k)
        }
      })
    } catch {}

    domains.resetWorkspace().catch(() => {})
    nav('/finance?fresh=1')
  }

  return (
                    <div
                      key={m.name}
                      onClick={() => {
                        setSelectedMyModel(m.name)
                        setSelectedPublishedModel(null)
                      }}
                      className={`w-full text-left rounded-xl border p-4 transition-all focus:outline-none cursor-pointer relative group ${
                        isSelected
                          ? 'border-[#10b981] bg-[#10b981]/10 ring-2 ring-[#10b981]/30 shadow-md'
                          : 'border-line bg-surface2/60 hover:border-[#10b981]/50 hover:bg-surface2'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-surface border border-line text-ink font-mono">
                          {m.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/30">
                            Saved Snapshot
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedModel(e, m.name)}
                            className="p-1 text-muted hover:text-red-500 hover:bg-surface rounded transition opacity-0 group-hover:opacity-100"
                            title="Delete saved snapshot"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-sm font-bold text-ink">{m.name.replace(/_/g, ' ')}</h3>
                      <p className="text-xs text-mute mt-1">
                        Domain: {m.slug ? m.slug.replace(/-/g, ' ') : 'Planning, Budgeting and Forecasting'} · {nodeCount} entities · {edgeCount} relationships
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-mute pt-2 border-t border-line/40">
                        <span>Saved on {m.savedAt ? new Date(m.savedAt).toLocaleDateString() : 'Recent'}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePublishModel(m.name)
                          }}
                          className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981] hover:text-[#0b1320] border border-[#10b981]/40 transition inline-flex items-center gap-1"
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
              className={`h-11 w-11 rounded-xl border flex items-center justify-center transition-all ${
                selectedMyModel
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
                  const handleNewModel = () => {
    sessionStorage.setItem('afx_fresh_session', 'true')
    sessionStorage.setItem('afx_fresh_timestamp', String(Date.now()))

    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('afx_custom_graph_') || k.startsWith('afx_gap_cache_') || k.startsWith('afx_working_graph_')) {
          localStorage.removeItem(k)
        }
      })
    } catch {}

    domains.resetWorkspace().catch(() => {})
    nav('/finance?fresh=1')
  }

  return (
                    <div
                      key={m.name}
                      onClick={() => {
                        setSelectedPublishedModel(m.name)
                        setSelectedMyModel(null)
                      }}
                      className={`w-full text-left rounded-xl border p-4 transition-all focus:outline-none cursor-pointer ${
                        isSelected
                          ? 'border-[#10b981] bg-[#10b981]/10 ring-2 ring-[#10b981]/30 shadow-md'
                          : 'border-line bg-surface2/60 hover:border-[#10b981]/50 hover:bg-surface2'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-surface border border-line text-ink font-mono">
                          {m.name}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck size={12} /> Certified Twin
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-ink">{m.name.replace(/_/g, ' ')}</h3>
                      <p className="text-xs text-mute mt-1">
                        Domain: {m.domainName || m.slug?.replace(/-/g, ' ')} · Governed Architecture
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

        {/* Bottom Bar: Selected Workspace Model and Go Action Button */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm">
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
            ) : (
              <span>Select any saved or published model to select it and click Go, or click + New to create a fresh model.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGo}
              disabled={!selectedTargetModel}
              className={`inline-flex items-center gap-2 rounded-xl px-7 py-2.5 text-sm font-bold transition-all ${
                selectedTargetModel
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
    </Layout>
  )
}
