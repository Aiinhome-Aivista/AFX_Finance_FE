import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { useWorkflow } from '../../context/WorkflowContext'

/**
 * 5 Dynamic Workflow Stages:
 * 1. Domain Prompts (Domain selection & prompts overview: /finance)
 * 2. Core Nuances (KG1 Interview & Discovery: /finance/:slug)
 * 3. Business Telemetry (KG2 Gap Analysis & Upload: /finance/:slug?mode=upload)
 * 4. Review (Validation & Finalization: /finance/:slug/finalize)
 * 5. Finalize Digital Twin (Governed Console: /finance/:slug/twin)
 */
const STAGES = [
  {
    id: 1,
    title: 'Template',
    // subtitle: 'Prompts & Overview',
    getRoute: () => '/finance',
  },
  {
    id: 2,
    title: 'Business Input',
    // subtitle: 'Discovery',
    getRoute: (slug) => (slug ? `/finance/${slug}` : '/finance'),
  },
  {
    id: 3,
    title: 'Data Input',
    // subtitle: 'Gap Analysis',
    getRoute: (slug) => (slug ? `/finance/${slug}?mode=upload` : '/finance'),
  },
  {
    id: 4,
    title: 'Review',
    // subtitle: 'Validation & Diff',
    getRoute: (slug) => (slug ? `/finance/${slug}/finalize` : '/finance'),
  },
  {
    id: 5,
    title: 'Finalize Digital Twin',
    // subtitle: 'Governed Console',
    getRoute: (slug) => (slug ? `/finance/${slug}/twin` : '/finance'),
  },
]

export default function ChevronTracker() {
  const location = useLocation()
  const path = location.pathname
  const { domainMap } = useWorkflow()

  // Extract slug from /finance/:slug/...
  const { currentStep, slug: effectiveSlug } = useMemo(() => {
    const parts = path.split('/').filter(Boolean)
    const nonSlugKeywords = ['overview', 'models', 'telemetry', 'apps']
    let extractedSlug = null
    if (parts[0] === 'finance' && parts[1] && !nonSlugKeywords.includes(parts[1])) {
      extractedSlug = parts[1]
      try {
        localStorage.setItem('afx_last_slug', extractedSlug)
        localStorage.setItem('afx_active_model_slug', extractedSlug)
      } catch {
        // ignore
      }
    }

    const fallbackSlug =
      localStorage.getItem('afx_last_slug') ||
      localStorage.getItem('afx_active_model_slug') ||
      Object.keys(domainMap)[0] ||
      'planning-budgeting-forecasting'

    const resolvedSlug = extractedSlug || fallbackSlug

    const isGapActive = location.search.includes('mode=gap')
    const isUploadView =
      (location.search.includes('mode=upload') || location.search.includes('upload')) && !isGapActive
    const twinPage = path.includes('/twin')
    const finalizePage = path.includes('/finalize')

    let step = 1
    if (!extractedSlug || path === '/finance' || path.startsWith('/finance/models') || path === '/apps') {
      step = 1
    } else if (twinPage) {
      step = 5
    } else if (finalizePage || isGapActive) {
      step = 4
    } else if (isUploadView) {
      step = 3
    } else {
      step = 2
    }

    return {
      currentStep: step,
      slug: resolvedSlug,
    }
  }, [path, location.search, domainMap])

  return (
    <nav
      aria-label="Workflow Stages"
      className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 scroll-none max-w-full"
    >
      {STAGES.map((stage) => {
        const isActive = stage.id === currentStep
        const isCompleted = stage.id < currentStep
        const isLocked = !effectiveSlug && stage.id > 1

        // Enhanced High-End Styling (preserves exact chevron shape with modern depth):
        let outerBg = 'bg-slate-200/90 dark:bg-slate-600/70'
        let innerBg = 'bg-slate-100/90 dark:bg-[#323944]'
        let titleColor = 'text-slate-600 dark:text-slate-200 font-semibold'
        let containerShadow = ''
        let iconMarkup = (
          <span className="grid h-4 w-4 place-items-center rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-200 font-semibold">
            {stage.id}
          </span>
        )

        if (isCompleted) {
          // Completed Stage: Rich emerald gradient with crisp white text & border bevel (same across all steps)
          outerBg = 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600'
          innerBg = 'bg-gradient-to-r from-[#059669] to-[#047857]'
          titleColor = 'text-white font-bold'
          containerShadow = 'shadow-[0_2px_8px_rgba(5,150,105,0.2)]'
          iconMarkup = (
            <span className="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              <Check size={10} strokeWidth={3} />
            </span>
          )
        } else if (isActive) {
          // Active Stage: Electric Cyan-Emerald gradient outline with elevated card
          outerBg = 'bg-gradient-to-r from-[#10b981] via-[#22d3ee] to-[#10b981]'
          innerBg = 'bg-white/95 dark:bg-[#252B33] backdrop-blur-md'
          titleColor = 'text-emerald-800 dark:text-[#34d399] font-extrabold'
          containerShadow = 'shadow-[0_4px_16px_rgba(16,185,129,0.35)]'
          iconMarkup = (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]" />
            </span>
          )
        }

        const content = (
          <div
            className={`chevron-arrow relative p-[1.5px] transition-all duration-300 ${outerBg} ${containerShadow}`}
          >
            <div
              className={`chevron-arrow ${innerBg} px-3.5 sm:px-4 py-1.5 flex items-center gap-2 select-none min-w-[110px] sm:min-w-[130px] h-[38px]`}
            >
              {/* Status Indicator Icon */}
              <span className="flex items-center justify-center shrink-0">
                {iconMarkup}
              </span>

              {/* Step Title & Subtitle for Template */}
              <div className="flex flex-col justify-center min-w-0 leading-tight">
                <span className={`text-[11px] sm:text-xs whitespace-nowrap tracking-tight font-semibold ${titleColor}`}>
                  {stage.title}
                </span>
                {stage.id === 1 && (
                  <span
                    className={`text-[9.5px] whitespace-nowrap font-medium leading-none mt-0.5 ${isCompleted
                        ? 'text-emerald-100/90'
                        : isActive
                          ? 'text-emerald-600 dark:text-[#6ee7b7]'
                          : 'text-slate-400 dark:text-slate-400'
                      }`}
                  >
                    Finance
                  </span>
                )}
              </div>
            </div>
          </div>
        )

        const sp = new URLSearchParams(location.search)
        const curWf = sp.get('wf') || (effectiveSlug ? sessionStorage.getItem(`afx_active_wf_${effectiveSlug}`) : null)
        const curModel = sp.get('model') || (effectiveSlug ? sessionStorage.getItem(`afx_active_model_${effectiveSlug}`) : null)
        const qs = new URLSearchParams()
        if (curWf) qs.set('wf', curWf)
        if (curModel) qs.set('model', curModel)
        const qStr = qs.toString() ? `?${qs.toString()}` : ''

        let targetRoute = stage.getRoute(effectiveSlug)
        if (effectiveSlug && (curWf || curModel)) {
          if (stage.id === 3) {
            targetRoute = `/finance/${effectiveSlug}?mode=upload&${qs.toString()}`
          } else if (stage.id === 2) {
            targetRoute = `/finance/${effectiveSlug}${qStr}`
          } else if (stage.id === 4) {
            targetRoute = `/finance/${effectiveSlug}/finalize${qStr}`
          } else if (stage.id === 5) {
            targetRoute = `/finance/${effectiveSlug}/twin${qStr}`
          }
        }

        if (isLocked) {
          return (
            <div
              key={stage.id}
              className="cursor-not-allowed opacity-55 shrink-0"
              title="Step locked: Complete previous steps first"
            >
              {content}
            </div>
          )
        }

        return (
          <Link
            key={stage.id}
            to={targetRoute}
            className="group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#10b981] rounded block shrink-0"
            title={stage.title}
          >
            {content}
          </Link>
        )
      })}
    </nav>
  )
}
