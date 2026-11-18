import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CopyPlus, FileJson, RefreshCw, Save, Sparkles, X } from 'lucide-react'

/**
 * Generate next version name if a model name already exists (e.g. Model -> Model (v2) -> Model (v3))
 */
function getNextVersionName(name) {
  const vMatch = name.match(/^(.*?)(?:[_\s]\(v?(\d+)\)|_v(\d+))$/i)
  if (vMatch) {
    const base = vMatch[1].trim()
    const num = parseInt(vMatch[2] || vMatch[3], 10) || 1
    return `${base} (v${num + 1})`
  }
  return `${name} (v2)`
}

export default function SaveAsModal({
  open,
  defaultName = '',
  domainName = 'Finance Domain',
  entityCount = 0,
  isPublished = false,
  isFresh = false,
  onSave,
  onClose,
}) {
  const [modelName, setModelName] = useState('')
  const inputRef = useRef(null)

  // Retrieve saved and published models from localStorage for real collision detection
  const existingModelsList = useMemo(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('afx_saved_models') || '[]')
      const published = JSON.parse(localStorage.getItem('afx_published_models') || '[]')
      return [...saved, ...published]
    } catch {
      return []
    }
  }, [open])

  // Clean initial baseline name
  const baselineName = useMemo(() => {
    return (defaultName || '').trim()
  }, [defaultName])

  // Check if current workspace has an existing name (i.e. not empty and not an unsaved generic template)
  const isExistingWorkspace = useMemo(() => {
    if (isFresh) return false
    try {
      if (sessionStorage.getItem('afx_fresh_session') === 'true') return false
    } catch { }
    if (!baselineName) return false
    // If it's explicitly found in saved/published models
    const explicitlySaved = existingModelsList.some(
      (m) => (m.name || '').trim().toLowerCase() === baselineName.toLowerCase()
    )
    if (explicitlySaved) return true
    // If it has a specific non-generic name (e.g. Finance_model part2, Management Reporting, etc.)
    const isGenericDefault = /^Finance_Model_[A-Za-z]{3}_\d{2}$/i.test(baselineName)
    return !isGenericDefault
  }, [isFresh, baselineName, existingModelsList])

  // Current input name trimmed
  const currentTrimmed = (modelName || '').trim()

  // Dynamic detection based on what is typed in the input:
  // If the user keeps the existing workspace name -> Overwrite existing (no new workspace)
  // If the user changes the name to a different name -> Save As new workspace!
  const isSameAsExisting = useMemo(() => {
    if (!isExistingWorkspace) return false
    if (!currentTrimmed) return true // empty input defaults to the same existing name
    return currentTrimmed.toLowerCase() === baselineName.toLowerCase()
  }, [isExistingWorkspace, currentTrimmed, baselineName])

  // Save mode dynamically determined:
  // 'overwrite' if preserving the existing workspace name
  // 'new_version' if saving a new name or in a new workspace
  const effectiveMode = isSameAsExisting ? 'overwrite' : 'new_version'

  useEffect(() => {
    if (open) {
      // Always prefill with the existing workspace name (or default name)
      setModelName(baselineName)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 60)
    }
  }, [open, baselineName])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = (e) => {
    e?.preventDefault()
    const targetName = currentTrimmed || baselineName || 'Finance_Model_Snapshot'
    // Send both the model name and the dynamic mode
    onSave?.(targetName, effectiveMode)
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-as-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-2xl transition-all duration-200 animate-in zoom-in-95">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-xl p-1.5 text-muted hover:text-ink hover:bg-surface2 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand border border-brand/20">
            <Save size={20} />
          </div>
          <div className="min-w-0 pr-6">
            <h3 id="save-as-modal-title" className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
              <span>Save Model Snapshot</span>
              {isSameAsExisting ? (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  Existing Workspace Detected
                </span>
              ) : (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  New Workspace Snapshot
                </span>
              )}
            </h3>
            <p className="mt-0.5 text-xs text-muted leading-relaxed">
              {isSameAsExisting
                ? 'Saving with this name will update the current workspace in-place without creating a duplicate.'
                : 'Changing the name will create a new independent workspace snapshot.'}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Dynamic Option Indicator */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-ink">
              Save Action
            </label>
            <div className="grid grid-cols-1 gap-2.5">
              {isSameAsExisting ? (
                <div className="rounded-xl border p-3 text-left transition flex items-center justify-between border-amber-500/40 bg-amber-500/10 text-ink">
                  <div className="flex items-center gap-2 font-semibold text-xs text-ink">
                    <RefreshCw size={14} className="text-amber-600 dark:text-amber-400 animate-spin-slow" />
                    <span>Overwrite Existing Workspace</span>
                  </div>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    No new workspace created
                  </span>
                </div>
              ) : (
                <div className="rounded-xl border p-3 text-left transition flex items-center justify-between border-emerald-500/40 bg-emerald-500/10 text-ink">
                  <div className="flex items-center gap-2 font-semibold text-xs text-ink">
                    <CopyPlus size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Save As New Workspace</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Creates new workspace
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Model Name Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="model-name-input" className="block text-xs font-semibold text-ink">
                Model Name
              </label>
              {isSameAsExisting ? (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Will overwrite existing workspace
                </span>
              ) : (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Will create new workspace
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <input
                id="model-name-input"
                ref={inputRef}
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder={baselineName || 'Enter model name'}
                className="input w-full text-xs sm:text-sm font-medium rounded-xl border border-line bg-surface2/40 px-3.5 py-2.5 text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-2xs"
                maxLength={80}
              />
            </div>
            <p className="mt-1 text-[11px] text-muted">
              {isSameAsExisting
                ? 'Change the name to save as a new workspace.'
                : 'Using a different name creates a new workspace snapshot.'}
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost text-xs px-4 py-2 rounded-xl text-muted hover:text-ink cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-[1.02] ${isSameAsExisting
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                : 'bg-[#10b981] hover:bg-[#059669] shadow-emerald-500/25'
                }`}
            >
              {isSameAsExisting ? (
                <>
                  <RefreshCw size={14} />
                  <span>Overwrite & Save</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save As New Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
