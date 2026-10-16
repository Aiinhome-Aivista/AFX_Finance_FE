import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Image as ImageIcon, Lock, X } from 'lucide-react'

const ROUTES = (slug) => ({ 1: '/apps', 2: `/finance/${slug}`, 3: `/finance/${slug}/graph`, 4: `/finance/${slug}/customize`, 5: `/finance/${slug}/finalize`, 6: `/finance/${slug}/telemetry` })

/** The 6-step workflow from the project brief. Server-enforced; locked steps cannot be opened. */
export default function Stepper({ slug, steps, current }) {
  const [showImg, setShowImg] = useState(false)
  const routes = ROUTES(slug)
  return (
    // <div className="card p-3 sm:p-4">
    //   <div className="mb-2 flex items-center justify-between">
    //     <h2 className="h-section">Workflow</h2>
    //     <button className="btn-ghost btn-sm" onClick={() => setShowImg(true)}><ImageIcon size={14} /> Workflow diagram</button>
    //   </div>
    //   <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
    //     {steps.map((s) => {
    //       const locked = s.status === 'locked'
    //       const isCur = s.no === current
    //       const body = (
    //         <div className={`flex h-full items-start gap-2 rounded-xl border p-2.5 text-left transition
    //           ${isCur ? 'border-brand bg-brand/10' : 'border-line'} ${locked ? 'opacity-55' : 'hover:bg-surface2'}`}>
    //           <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold
    //             ${s.status === 'completed' ? 'bg-ok text-white' : isCur || s.status === 'active' ? 'bg-brand text-brand-ink' : 'bg-surface2 text-muted'}`}>
    //             {s.status === 'completed' ? <Check size={14} /> : locked ? <Lock size={11} /> : s.no}
    //           </span>
    //           <span className="min-w-0">
    //             <span className="block truncate text-[13px] font-semibold">{s.title}</span>
    //             <span className="line-clamp-2 text-[11px] leading-snug text-muted">{s.hint}</span>
    //           </span>
    //         </div>
    //       )
    //       return <li key={s.no}>{locked ? <div aria-disabled="true" title="Complete the previous steps first">{body}</div> : <Link to={routes[s.no]} aria-current={isCur ? 'step' : undefined}>{body}</Link>}</li>
    //     })}
    //   </ol>
    //   {showImg && (
    //     <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Workflow diagram" onClick={() => setShowImg(false)}>
    //       <div className="card sheet-enter max-h-[90vh] max-w-3xl overflow-auto p-3" onClick={(e) => e.stopPropagation()}>
    //         <div className="mb-2 flex items-center justify-between"><b className="text-sm">Business workflow (image1.jpg)</b><button className="btn-ghost btn-sm" onClick={() => setShowImg(false)}><X size={14} /> Close</button></div>
    //         <img src="/workflow.jpg" alt="Six-step workflow: identify industry sector, pick a domain, produce the KG template, collect client nuances (KG-1), finalise the ontology, add telemetry data (KG-2)" className="w-full rounded-lg" />
    //       </div>
    //     </div>
    //   )}
    // </div>
    <>
    </>
  )
}
