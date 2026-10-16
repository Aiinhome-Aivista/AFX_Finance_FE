import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'

export function Loading({ label = 'Loading…', className = '' }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-2 p-8 text-sm text-muted ${className}`}>
      <Loader2 className="animate-spin" size={18} /> {label}
    </div>
  )
}
export function ErrorState({ error, onRetry, className = '' }) {
  return (
    <div role="alert" className={`flex flex-col items-center gap-3 p-8 text-center ${className}`}>
      <AlertTriangle className="text-bad" />
      <p className="max-w-md text-sm">{error?.message || String(error) || 'Something went wrong.'}</p>
      {onRetry && <button className="btn-ghost btn-sm" onClick={onRetry}>Try again</button>}
    </div>
  )
}
export function EmptyState({ title, hint, icon: Icon = Inbox, children, className = '' }) {
  return (
    <div className={`flex flex-col items-center gap-2 p-8 text-center ${className}`}>
      <Icon className="text-muted" />
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="max-w-md text-xs text-muted">{hint}</p>}
      {children}
    </div>
  )
}
export const Spinner = ({ size = 16 }) => <Loader2 className="animate-spin" size={size} />
