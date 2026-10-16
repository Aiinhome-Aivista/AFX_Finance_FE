import { useEffect } from 'react'

export default function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return
    const h = (e) => e.key === 'Escape' && onCancel?.()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onCancel])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onCancel?.()}>
      <div className="card sheet-enter w-full max-w-md p-5">
        <h3 className="text-base font-semibold">{title}</h3>
        <div className="mt-2 text-sm text-muted">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
