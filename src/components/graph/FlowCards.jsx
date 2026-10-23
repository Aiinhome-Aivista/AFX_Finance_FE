import { Route, X } from 'lucide-react'
import { Loading } from '../common/States'
import { useTheme } from '../../context/ThemeContext'

/** Source-defined end-to-end flows. Selecting one highlights its nodes/edges on the graph and lists the ordered steps. */
export default function FlowCards({ flows, activeKey, onToggle, detail, loading, selectedKey, onStepSelect }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <section className="mt-6" aria-label="End-to-end Finance flows">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Route size={18} /> End-to-end Finance flows</h2>
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {flows.map((f, i) => {
          const isActive = activeKey === f.key
          const isLast = i === flows.length - 1

          // Arrow color: Black in light theme, White in dark theme, Brand color when active
          const arrowColor = isActive
            ? (isDark ? '#818CF8' : '#4F46E5')
            : (isDark ? '#FFFFFF' : '#000000')

          // Serpentine snake placement on desktop XL:
          // Row 1 (left to right): Col 1, Col 2, Col 3, Col 4
          // Row 2 (right to left): Col 4, Col 3, Col 2
          const SNAKE_GRID_XL = [
            'xl:col-start-1 xl:row-start-1',
            'xl:col-start-2 xl:row-start-1',
            'xl:col-start-3 xl:row-start-1',
            'xl:col-start-4 xl:row-start-1',
            'xl:col-start-4 xl:row-start-2',
            'xl:col-start-3 xl:row-start-2',
            'xl:col-start-2 xl:row-start-2',
          ]

          // Serpentine snake placement on tablet MD:
          const SNAKE_GRID_MD = [
            'md:col-start-1 md:row-start-1',
            'md:col-start-2 md:row-start-1',
            'md:col-start-2 md:row-start-2',
            'md:col-start-1 md:row-start-2',
            'md:col-start-1 md:row-start-3',
            'md:col-start-2 md:row-start-3',
            'md:col-start-2 md:row-start-4',
          ]

          return (
            <div key={f.key} className={`group/flow relative flex flex-col ${SNAKE_GRID_XL[i] || ''} ${SNAKE_GRID_MD[i] || ''}`}>
              <button
                type="button"
                onClick={() => onToggle(f.key)}
                aria-pressed={isActive}
                className={`card p-4 text-left transition hover:border-brand flex-1 h-full flex flex-col justify-between cursor-pointer ${isActive ? 'border-brand ring-2 ring-brand' : ''
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-sm">{f.title}</b>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {Boolean(f.customized) && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-600/15 dark:bg-purple-500/25 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:text-purple-300 border border-purple-500/40 shadow-2xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse" />
                          AI Tailored
                        </span>
                      )}
                      {f.relevant ? (
                        <span className="badge bg-brand/10 text-brand">this domain</span>
                      ) : f.touches_domain ? (
                        <span className="badge bg-surface2 text-muted">touches</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="relative mt-1.5">
                    <p className="line-clamp-3 text-xs leading-relaxed text-muted">
                      {f.narrative}
                    </p>

                    {/* Hover Tooltip: reveals complete remaining flow path without clipping */}
                    <div className="pointer-events-none absolute -inset-x-2 -top-2 z-40 opacity-0 invisible group-hover/flow:opacity-100 group-hover/flow:visible transition-all duration-150 rounded-xl border border-brand/50 bg-surface/98 p-2.5 text-xs text-ink shadow-2xl backdrop-blur-md">
                      <p className="text-xs leading-relaxed text-ink font-medium">
                        {f.narrative}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted">{f.step_count} steps</p>
              </button>

              {/* Arrow connecting to the next card in serpentine flow */}
              {!isLast && (
                <>
                  {/* Desktop XL: 0->1->2->3 (right), 3->4 (down), 4->5->6 (left) */}
                  <div className="hidden xl:flex">
                    {(i === 0 || i === 1 || i === 2) && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 w-5 z-10 flex items-center justify-center pointer-events-none">
                        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" className={`transition-colors duration-200 ${isActive ? 'text-brand' : 'text-black dark:text-white'}`}>
                          <path d="M1 6H15M10.5 1.5L15 6L10.5 10.5" stroke={arrowColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    {i === 3 && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 h-5 z-10 flex items-center justify-center pointer-events-none">
                        <svg width="12" height="18" viewBox="0 0 12 18" fill="none" className={`transition-colors duration-200 ${isActive ? 'text-brand' : 'text-black dark:text-white'}`}>
                          <path d="M6 1V15M1.5 10.5L6 15L10.5 10.5" stroke={arrowColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    {(i === 4 || i === 5) && (
                      <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-5 z-10 flex items-center justify-center pointer-events-none">
                        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" className={`transition-colors duration-200 ${isActive ? 'text-brand' : 'text-black dark:text-white'}`}>
                          <path d="M17 6H3M7.5 1.5L3 6L7.5 10.5" stroke={arrowColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Tablet MD: 0->1 (right), 1->2 (down), 2->3 (left), 3->4 (down), 4->5 (right), 5->6 (down) */}
                  <div className="hidden md:flex xl:hidden">
                    {(i === 0 || i === 4) && (
                      <div className="absolute left-full top-1/2 -translate-y-1/2 w-5 z-10 flex items-center justify-center pointer-events-none">
                        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" className={`transition-colors duration-200 ${isActive ? 'text-brand' : 'text-black dark:text-white'}`}>
                          <path d="M1 6H15M10.5 1.5L15 6L10.5 10.5" stroke={arrowColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    {(i === 1 || i === 3 || i === 5) && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 h-5 z-10 flex items-center justify-center pointer-events-none">
                        <svg width="12" height="18" viewBox="0 0 12 18" fill="none" className={`transition-colors duration-200 ${isActive ? 'text-brand' : 'text-black dark:text-white'}`}>
                          <path d="M6 1V15M1.5 10.5L6 15L10.5 10.5" stroke={arrowColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    {i === 2 && (
                      <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-5 z-10 flex items-center justify-center pointer-events-none">
                        <svg width="18" height="12" viewBox="0 0 18 12" fill="none" className={`transition-colors duration-200 ${isActive ? 'text-brand' : 'text-black dark:text-white'}`}>
                          <path d="M17 6H3M7.5 1.5L3 6L7.5 10.5" stroke={arrowColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Mobile (1 column): all down */}
                  <div className="flex md:hidden absolute top-full left-1/2 -translate-x-1/2 h-5 z-10 items-center justify-center pointer-events-none">
                    <svg width="12" height="18" viewBox="0 0 12 18" fill="none" className={`transition-colors duration-200 ${isActive ? 'text-brand' : 'text-black dark:text-white'}`}>
                      <path d="M6 1V15M1.5 10.5L6 15L10.5 10.5" stroke={arrowColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      {activeKey && (
        <div className="card mt-3 p-4">
          {loading || !detail ? <Loading label="Loading flow…" className="!p-2" /> : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div><h3 className="font-semibold">{detail.title}</h3><p className="mt-1 text-xs text-muted">{detail.narrative}</p></div>
                <button className="btn-ghost btn-sm shrink-0" onClick={() => onToggle(activeKey)}><X size={14} /> Clear</button>
              </div>
              <ol className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {detail.steps.map((s) => (
                  <li key={s.order}>
                    <button onClick={() => onStepSelect(s.node_key)} className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left hover:bg-surface2 ${selectedKey === s.node_key ? 'border-brand bg-brand/10' : 'border-line'}`}>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-brand-ink">{s.order}</span>
                      <span className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="block text-sm font-medium truncate">{s.name}</span>
                          {s.change_state === 'modified' && (
                            <span className="shrink-0 rounded bg-amber-500/15 px-1.5 py-0.2 text-[10px] font-semibold text-amber-500 border border-amber-500/30">
                              Modified
                            </span>
                          )}
                          {s.change_state === 'added' && (
                            <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-500 border border-emerald-500/30">
                              Added
                            </span>
                          )}
                        </div>
                        <span className="block text-[11px] text-muted">{s.group_name}</span>
                        {selectedKey === s.node_key && <span className="mt-1 block text-xs leading-relaxed text-muted">{s.definition}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}
    </section>
  )
}
