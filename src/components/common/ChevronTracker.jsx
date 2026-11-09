import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, Sparkles } from 'lucide-react'
import { useWorkflow } from '../../context/WorkflowContext'

/**
 * 4 Dynamic Workflow Stages according to Option 1:
 * 1. Domain Prompts (Domain selection & prompts overview: /finance)
 * 2. Core Nuances (KG1 Interview & Discovery: /finance/:slug)
 * 3. Business Telemetry (KG2 Gap Analysis & Upload: /finance/:slug?mode=upload)
 * 4. Review & Digital Twin (Governance & Finalization: /finance/:slug/finalize)
 */
const STAGES = [
  {
    id: 1,
    title: 'Domain',
    subtitle: 'Prompts & Overview',
    getRoute: () => '/finance',
  },
  {
    id: 2,
    title: 'Core Nuances',
    subtitle: 'Discovery',
    getRoute: (slug) => (slug ? `/finance/${slug}` : '/finance'),
  },
  {
    id: 3,
    title: 'Business Telemetry',
    subtitle: 'Gap Analysis',
    getRoute: (slug) => (slug ? `/finance/${slug}?mode=upload` : '/finance'),
  },
  {
    id: 4,
    title: 'Review',
    subtitle: 'Digital Twin',
    getRoute: (slug) => (slug ? `/finance/${slug}/finalize` : '/finance'),
  },
]

export default function ChevronTracker() {
  const location = useLocation()
  const path = location.pathname
  const { domainMap } = useWorkflow()

  // Extract slug from /finance/:slug/...
  const { currentStep, slug, domainInfo, isFinalized } = useMemo(() => {
    const parts = path.split('/').filter(Boolean)
    let extractedSlug = null
    if (parts[0] === 'finance' && parts[1] && !['overview'].includes(parts[1])) {
      extractedSlug = parts[1]
    }

    const info = (extractedSlug && domainMap[extractedSlug]) || {}
    const finalized = Boolean(info.isFinalized)
    const isUploadView =
      info.viewMode === 'upload' ||
      info.isGapMode ||
      location.search.includes('upload') ||
      location.search.includes('gap')
    const isFinalizePage = path.includes('/finalize')

    let step = 1
    if (!extractedSlug || path === '/finance') {
      step = 1
    } else if (isFinalizePage) {
      step = 4
    } else if (isUploadView) {
      step = 3
    } else {
      step = 2
    }

    return {
      currentStep: step,
      slug: extractedSlug,
      domainInfo: info,
      isFinalized: finalized,
    }
  }, [path, location.search, domainMap])

  return (
    <nav
      aria-label="Workflow Stages"
      className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1 scroll-none max-w-full"
    >
      {STAGES.map((stage) => {
        // Dynamic Completion & Lock Calculation:
        const isDomainSelected = Boolean(slug)
        const isKG1Ready = Boolean(domainInfo.isKG1Ready || isFinalized)
        const hasFiles = Boolean(domainInfo.hasFiles || isFinalized)

        let isCompleted = false
        let isLocked = false

        if (stage.id === 1) {
          isCompleted = isDomainSelected
        } else if (stage.id === 2) {
          isCompleted = isKG1Ready && currentStep > 2
          isLocked = !isDomainSelected
        } else if (stage.id === 3) {
          isCompleted = hasFiles && currentStep > 3
          isLocked = !isDomainSelected || (!isKG1Ready && !hasFiles)
        } else if (stage.id === 4) {
          isCompleted = isFinalized
          isLocked = !isDomainSelected || (!isKG1Ready && !isFinalized)
        }

        const isActive = stage.id === currentStep

        // Enhanced High-End Styling (preserves exact chevron shape with modern depth):
        let outerBg = 'bg-slate-200/90 dark:bg-slate-600/70'
        let innerBg = 'bg-slate-100/90 dark:bg-[#323944]'
        let titleColor = 'text-slate-600 dark:text-slate-200 font-semibold'
        let subColor = 'text-slate-400 dark:text-slate-400'
        let containerShadow = ''
        let iconMarkup = (
          <span className="grid h-4 w-4 place-items-center rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] text-slate-500 dark:text-slate-200 font-semibold">
            {stage.id}
          </span>
        )

        if (isCompleted) {
          // ✅ Completed Stage: Rich emerald gradient with crisp white text & border bevel (same across all steps)
          outerBg = 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600'
          innerBg = 'bg-gradient-to-r from-[#059669] to-[#047857]'
          titleColor = 'text-white font-bold'
          subColor = 'text-emerald-100/90'
          containerShadow = 'shadow-[0_2px_8px_rgba(5,150,105,0.2)]'
          iconMarkup = (
            <span className="grid h-4 w-4 place-items-center rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-sm">
              <Check size={10} strokeWidth={3} />
            </span>
          )
        } else if (isActive) {
          // 🟢 Active Stage: Electric Cyan-Emerald gradient outline with elevated card
          outerBg = 'bg-gradient-to-r from-[#10b981] via-[#22d3ee] to-[#10b981]'
          innerBg = 'bg-white/95 dark:bg-[#252B33] backdrop-blur-md'
          titleColor = 'text-emerald-800 dark:text-[#34d399] font-extrabold'
          subColor = 'text-emerald-600 dark:text-[#6ee7b7] font-medium'
          containerShadow = 'shadow-[0_4px_16px_rgba(16,185,129,0.35)]'
          iconMarkup = (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]" />
            </span>
          )
        }

        // Subtitle customization if Governed
        const displaySubtitle =
          stage.id === 4 && isFinalized ? 'Governed Twin' : stage.subtitle

        const content = (
          <div
            className={`chevron-arrow relative p-[1.5px] transition-all duration-300 ${outerBg} ${containerShadow}`}
          >
            <div
              className={`chevron-arrow ${innerBg} px-4 sm:px-5 py-1.5 flex items-center gap-2 select-none min-w-[128px] sm:min-w-[155px] h-[38px]`}
            >
              {/* Status Indicator Icon */}
              <span className="flex items-center justify-center shrink-0">
                {iconMarkup}
              </span>

              {/* Step Title & Subtitle */}
              <div className="flex flex-col min-w-0 leading-tight">
                <span className={`text-[11px] sm:text-xs truncate tracking-tight ${titleColor}`}>
                  {stage.title}
                </span>
                <span className={`text-[9px] sm:text-[10px] truncate ${subColor}`}>
                  {displaySubtitle}
                </span>
              </div>
            </div>
          </div>
        )

        const targetRoute = stage.getRoute(slug)

        if (isLocked) {
          return (
            <div
              key={stage.id}
              className="cursor-not-allowed opacity-55"
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
            className="group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#10b981] rounded block"
            title={`${stage.title} - ${displaySubtitle}`}
          >
            {content}
          </Link>
        )
      })}
    </nav>
  )
}
