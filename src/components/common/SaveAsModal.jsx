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
  onSave,
  onClose,
}) {
  const [modelName, setModelName] = useState('')
  const [saveMode, setSaveMode] = useState('overwrite') // 'overwrite' | 'new_version'
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

  // Check if defaultName or current input exists
  const existingMatch = useMemo(() => {
    const trimmed = (modelName || '').trim().toLowerCase()
    const defTrimmed = (defaultName || '').trim().toLowerCase()
    return existingModelsList.find(
      (m) =>
        (trimmed && (m.name || '').trim().toLowerCase() === trimmed) ||
        (defTrimmed && (m.name || '').trim().toLowerCase() === defTrimmed)
    )
  }, [existingModelsList, modelName, defaultName])

  const hasExistingModel = Boolean(existingMatch)

  useEffect(() => {
    if (open) {
      setModelName('')
      setSaveMode('overwrite')
      setTimeout(() => {
        inputRef.current?.focus()
      }, 60)
    }
  }, [open])

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

  const handleModeChange = (mode) => {
    setSaveMode(mode)
    setModelName('')
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    const suggestedVer = getNextVersionName((existingMatch?.name || defaultName || 'Finance_Model').trim())
    const fallbackName = saveMode === 'new_version' ? suggestedVer : (existingMatch?.name || defaultName || 'Finance_Model_Snapshot')
    const trimmed = (modelName || '').trim() || fallbackName
    // Send both the model name and the chosen mode
    onSave?.(trimmed, saveMode)
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
              {hasExistingModel && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/25">
                  Existing Model Detected
                </span>
              )}
            </h3>
            <p className="mt-0.5 text-xs text-muted leading-relaxed">
              {hasExistingModel
                ? 'Choose whether to overwrite the existing model or create a new version snapshot.'
                : 'Save this financial ontology model snapshot into your workspace.'}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Dual Choice Prompt if existing model is detected */}
          {hasExistingModel && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-ink">
                How would you like to save this model?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Option 1: Overwrite */}
                <button
                  type="button"
                  onClick={() => handleModeChange('overwrite')}
                  className={`rounded-xl border p-3 text-left transition cursor-pointer flex flex-col justify-between ${saveMode === 'overwrite'
                    ? 'border-brand bg-brand/10 ring-1 ring-brand text-ink'
                    : 'border-line bg-surface2/30 hover:border-line/90 hover:bg-surface2/60 text-muted hover:text-ink'
                    }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs text-ink mb-1">
                    <RefreshCw size={14} className={saveMode === 'overwrite' ? 'text-brand animate-spin-slow' : 'text-muted'} />
                    <span>Overwrite Existing</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted">
                    Update current snapshot in-place with latest changes without creating a duplicate.
                  </p>
                </button>

                {/* Option 2: Save as New Version */}
                <button
                  type="button"
                  onClick={() => handleModeChange('new_version')}
                  className={`rounded-xl border p-3 text-left transition cursor-pointer flex flex-col justify-between ${saveMode === 'new_version'
                    ? 'border-brand bg-brand/10 ring-1 ring-brand text-ink'
                    : 'border-line bg-surface2/30 hover:border-line/90 hover:bg-surface2/60 text-muted hover:text-ink'
                    }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs text-ink mb-1">
                    <CopyPlus size={14} className={saveMode === 'new_version' ? 'text-brand' : 'text-muted'} />
                    <span>Save as New Version</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted">
                    Preserve historical snapshot and create an independent version (e.g. v2).
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Model Name Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="model-name-input" className="block text-xs font-semibold text-ink">
                {saveMode === 'new_version' ? 'New Version Name' : 'Model Name'}
              </label>
              {saveMode === 'overwrite' && hasExistingModel && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  Will overwrite existing
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
                placeholder={saveMode === 'new_version' ? 'Enter new version name' : 'Enter model name'}
                className="input w-full text-xs sm:text-sm font-medium rounded-xl border border-line bg-surface2/40 px-3.5 py-2.5 text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-2xs"
                maxLength={80}
              />
            </div>
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
              className={`btn text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-[1.02] ${saveMode === 'overwrite' && hasExistingModel
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/25'
                : 'bg-[#10b981] hover:bg-[#059669] shadow-emerald-500/25'
                }`}
            >
              {saveMode === 'overwrite' && hasExistingModel ? (
                <>
                  <RefreshCw size={14} />
                  <span>Overwrite & Save</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>{hasExistingModel ? 'Save New Version' : 'Save Model'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
