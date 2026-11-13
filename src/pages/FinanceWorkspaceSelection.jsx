import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, FolderKanban, Plus, ShieldCheck, Sparkles, Workflow } from 'lucide-react'
import { domains as domainsApi } from '../api'
import Layout from '../components/common/Layout'
import { Loading, ErrorState } from '../components/common/States'
import useAsync from '../components/common/useAsync'
import { useAuth } from '../context/AuthContext'

export default function FinanceWorkspaceSelection() {
  const nav = useNavigate()
  const { isAnalyst } = useAuth()

  // Load user models & published models from workspace API
  const ws = useAsync(() => domainsApi.workspaceModels(), [isAnalyst])
  const myModels = ws.data?.my_models || []
  const publishedModels = ws.data?.published_models || []

  const [selectedMyModel, setSelectedMyModel] = useState(null)
  const [selectedPublishedModel, setSelectedPublishedModel] = useState(null)

  // Default select first available model if any
  useEffect(() => {
    if (myModels.length > 0 && !selectedMyModel) {
      setSelectedMyModel(myModels[0].slug || myModels[0].workflow_id)
    }
  }, [myModels, selectedMyModel])

  const handleGo = () => {
    if (selectedPublishedModel) {
      const pub = publishedModels.find(
        (m) => m.slug === selectedPublishedModel || m.workflow_id === selectedPublishedModel
      )
      if (pub) {
        nav(`/finance/${pub.slug}/twin?wf=${pub.workflow_id}`)
        return
      }
    }

    if (selectedMyModel) {
      const my = myModels.find(
        (m) => m.slug === selectedMyModel || m.workflow_id === selectedMyModel
      )
      if (my) {
        if (my.finalized) {
          nav(`/finance/${my.slug}/twin?wf=${my.workflow_id}`)
        } else {
          nav(`/finance/${my.slug}`)
        }
        return
      }
    }

    // Default: Open general Finance Knowledge Graph
    nav('/finance')
  }

  const selectedTargetModel =
    publishedModels.find((m) => m.slug === selectedPublishedModel || m.workflow_id === selectedPublishedModel) ||
    myModels.find((m) => m.slug === selectedMyModel || m.workflow_id === selectedMyModel)

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
                Select from your active customized models on the left, or inspect governed published digital twin models on the right.
              </p>
            </div>

            {/* Quick 'New' Action Button to start a fresh Finance Domain */}
            <Link
              to="/finance"
              className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-[#0b1320] shadow-sm transition"
              title="Create a new Finance domain model"
            >
              <Plus size={15} />
              <span>New</span>
            </Link>
          </div>
        </div>

        {ws.loading && !ws.data && <Loading label="Loading Finance Models…" className="min-h-[300px]" />}
        {ws.error && <ErrorState error={ws.error} onRetry={ws.reload} />}

        {ws.data && (
          <>
            {/* 2-Column Side-by-Side View matching exact design language */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
              {/* Left Column: My Finance Models */}
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
                      <p className="text-xs text-mute">Active models under customization</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-surface2 border border-line text-mute">
                    {myModels.length}
                  </span>
                </div>

                {myModels.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-line rounded-xl">
                    <p className="text-xs text-mute mb-3">
                      No active customized models yet. Start building your first enterprise domain model.
                    </p>
                    <Link
                      to="/finance"
                      className="btn-primary text-xs px-3.5 py-1.5 rounded-xl inline-flex items-center gap-1.5"
                    >
                      <Plus size={13} />
                      <span>Start New Model</span>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1 scroll-thin">
                    {myModels.map((m) => {
                      const isSelected = selectedMyModel === (m.slug || m.workflow_id) && !selectedPublishedModel
                      return (
                        <button
                          key={m.workflow_id || m.slug}
                          type="button"
                          onClick={() => {
                            setSelectedMyModel(m.slug || m.workflow_id)
                            setSelectedPublishedModel(null)
                          }}
                          className={`w-full text-left rounded-xl border p-4 transition-all focus:outline-none cursor-pointer ${
                            isSelected
                              ? 'border-[#10b981] bg-[#10b981]/10 ring-2 ring-[#10b981]/30 shadow-md'
                              : 'border-line bg-surface2/60 hover:border-[#10b981]/50 hover:bg-surface2'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface border border-line text-ink">
                              {m.code || m.slug}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                m.finalized
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                              }`}
                            >
                              {m.finalized ? 'Finalized / Twin' : 'In Progress'}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-ink">{m.name}</h3>
                          <p className="text-xs text-mute mt-1 line-clamp-2">{m.description}</p>
                          <div className="mt-3 flex items-center justify-between text-[11px] text-mute pt-2 border-t border-line/40">
                            <span>Step {m.current_step || 1} of 5</span>
                            <span className="text-[#10b981] font-semibold">
                              {m.finalized ? 'Governed Twin Ready →' : 'Continue Workflow →'}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </section>

              {/* Right Column: Published Models */}
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
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-line rounded-xl">
                    <ShieldCheck size={24} className="text-[#10b981] mb-2" />
                    <p className="text-xs text-mute">
                      No published models yet. Models appear here once finalized by a Data Architect.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1 scroll-thin">
                    {publishedModels.map((m) => {
                      const isSelected = selectedPublishedModel === (m.slug || m.workflow_id)
                      return (
                        <button
                          key={m.workflow_id || m.slug}
                          type="button"
                          onClick={() => {
                            setSelectedPublishedModel(m.slug || m.workflow_id)
                            setSelectedMyModel(null)
                          }}
                          className={`w-full text-left rounded-xl border p-4 transition-all focus:outline-none cursor-pointer ${
                            isSelected
                              ? 'border-[#10b981] bg-[#10b981]/10 ring-2 ring-[#10b981]/30 shadow-md'
                              : 'border-line bg-surface2/60 hover:border-[#10b981]/50 hover:bg-surface2'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-surface border border-line text-ink">
                              {m.code || m.slug}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck size={12} /> KG{m.finalized_version_number}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-ink">{m.name}</h3>
                          <p className="text-xs text-mute mt-1 line-clamp-2">{m.description}</p>
                          <div className="mt-3 flex items-center justify-between text-[11px] text-mute pt-2 border-t border-line/40">
                            <span>Published by <b className="text-ink">{m.owner_name}</b></span>
                            <span className="text-[#10b981] font-semibold">Inspect Twin →</span>
                          </div>
                        </button>
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
                    <strong className="text-ink font-bold text-sm ml-1">
                      {selectedTargetModel.name}
                    </strong>
                    {selectedPublishedModel && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                        Published Twin
                      </span>
                    )}
                  </span>
                ) : (
                  <span>Click any model on either side to activate Go, or click New to start a new model.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGo}
                  className="inline-flex items-center gap-2 rounded-xl px-7 py-2.5 text-sm font-bold transition-all cursor-pointer bg-[#10b981] text-[#0b1320] shadow-md shadow-[#10b981]/30 ring-2 ring-[#10b981]/50 hover:bg-[#34d399]"
                >
                  <span>Go</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

