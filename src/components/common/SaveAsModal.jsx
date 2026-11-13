import { useEffect, useRef, useState } from 'react'
import { FileJson, Save, X } from 'lucide-react'

export default function SaveAsModal({
  open,
  defaultName = '',
  domainName = 'Finance Domain',
  entityCount = 0,
  onSave,
  onClose,
}) {
  const [modelName, setModelName] = useState(defaultName)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setModelName(defaultName)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [open, defaultName])

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
    const trimmed = (modelName || '').trim() || defaultName || 'Finance_Model_Snapshot'
    onSave?.(trimmed)
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
      <div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-2xl transition-all duration-200 animate-in zoom-in-95">
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
            <h3 id="save-as-modal-title" className="text-base font-bold text-ink tracking-tight">
              Save Model Snapshot As
            </h3>
            <p className="mt-0.5 text-xs text-muted leading-relaxed">
              Save this financial ontology model snapshot.
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="model-name-input" className="block text-xs font-semibold text-ink mb-1.5">
              Model Name
            </label>
            <div className="relative flex items-center">
              <input
                id="model-name-input"
                ref={inputRef}
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g. Finance_Model_Nov_26"
                className="input w-full text-xs sm:text-sm font-medium rounded-xl border border-line bg-surface2/40 px-3.5 py-2.5 text-ink placeholder:text-muted focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand shadow-2xs"
                maxLength={80}
              />
            </div>
          </div>

          {/* Snapshot Summary Chips */}
          <div className="rounded-xl border border-line/70 bg-surface2/30 p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-muted">
              <span>Domain:</span>
              <span className="font-semibold text-ink truncate max-w-[220px]">{domainName}</span>
            </div>
            <div className="flex items-center justify-between text-muted">
              <span>Captured Architecture:</span>
              <span className="font-mono font-semibold text-[#10b981]">{entityCount} Entities</span>
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
              className="btn bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs px-5 py-2 rounded-xl shadow-sm shadow-emerald-500/25 flex items-center gap-1.5 cursor-pointer transition-transform hover:scale-[1.02]"
            >
              <Save size={14} />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

