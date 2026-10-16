import { createContext, useCallback, useContext, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

const Ctx = createContext({ push: () => {} })
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const remove = useCallback((id) => setItems((l) => l.filter((x) => x.id !== id)), [])
  const push = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).slice(2)
    setItems((l) => [...l, { id, message, type }])
    setTimeout(() => remove(id), type === 'error' ? 7000 : 4000)
  }, [remove])
  const icons = { success: <CheckCircle2 size={18} className="text-ok" />, error: <XCircle size={18} className="text-bad" />, info: <Info size={18} className="text-brand" /> }
  return (
    <Ctx.Provider value={{ push, success: (m) => push(m, 'success'), error: (m) => push(m, 'error') }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="card flex items-start gap-3 p-3 text-sm">
            {icons[t.type]}
            <div className="flex-1">{t.message}</div>
            <button className="text-muted hover:text-ink" onClick={() => remove(t.id)} aria-label="Dismiss"><X size={16} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
