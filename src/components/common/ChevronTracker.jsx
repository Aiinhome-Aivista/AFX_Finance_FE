import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check } from 'lucide-react'

/**
 * 4 Workflow Stages according to MOM requirement #2:
 * 1. Industry Identification (AgentForge / Finance)
 * 2. Domain Prompts (Domain selection & prompts)
 * 3. Core Nuances (KG1 Questionnaire & Discovery)
 * 4. Review & Digital Twin (Gap Analysis & Finalization)
 */
const STAGES = [
  {
    id: 1,
    title: 'Industry',
    subtitle: 'Identification',
    route: () => '/apps',
  },
  {
    id: 2,
    title: 'Domain',
    subtitle: 'Prompts',
    route: (slug) => (slug ? `/finance/${slug}` : '/finance'),
  },
  {
    id: 3,
    title: 'Core Nuances',
    subtitle: 'KG1 Discovery',
    route: (slug) => (slug ? `/finance/${slug}/customize` : '/finance'),
  },
  {
    id: 4,
    title: 'Review',
    subtitle: 'Digital Twin',
    route: (slug) => (slug ? `/finance/${slug}/finalize` : '/finance'),
  },
]

export default function ChevronTracker() {
  const location = useLocation()
  const path = location.pathname

  // Parse current route & slug
  const { currentStep, slug } = useMemo(() => {
    // Stage 1: /apps
    if (path.startsWith('/apps')) {
      return { currentStep: 1, slug: null }
    }

    // Extract slug from /finance/:slug/...
    const parts = path.split('/').filter(Boolean)
    let extractedSlug = null
    if (parts[0] === 'finance' && parts[1] && !['overview'].includes(parts[1])) {
      extractedSlug = parts[1]
    }

    // Stage 4: /finance/:slug/finalize or /finance/:slug/telemetry
    if (path.includes('/finalize') || path.includes('/telemetry')) {
      return { currentStep: 4, slug: extractedSlug }
    }

    // Stage 3: /finance/:slug/customize
    if (path.includes('/customize')) {
      return { currentStep: 3, slug: extractedSlug }
    }

    // Stage 2: /finance or /finance/:slug or /finance/:slug/graph
    if (path === '/finance' || (parts[0] === 'finance' && parts.length <= 3)) {
      return { currentStep: 2, slug: extractedSlug }
    }

    return { currentStep: 1, slug: extractedSlug }
  }, [path])

  return (
    <nav
      aria-label="Workflow Stages"
      className="flex items-center gap-1.5 sm:gap-2.5 overflow-x-auto py-1 scroll-none max-w-full"
    >
      {STAGES.map((stage) => {
        const isCompleted = stage.id < currentStep
        const isActive = stage.id === currentStep
        const isLocked = stage.id > currentStep

        // Colors tailored to seamlessly blend on white header:
        // 🟢 Green (Emerald): #10b981 (Primary), #34d399 (Accent), #6ee7b7 (Hover)
        // ⚪ Clean White / Slate: bg-white / bg-slate-100 (Light) vs Dark fallback
        // 🔵 Secondary Accent: #22d3ee (Cyan Gradient)

        let outerBg = 'bg-slate-200 dark:bg-white/10' // default border outline
        let innerBg = 'bg-slate-50 dark:bg-[#171717]' // default surface
        let textColor = 'text-slate-600 dark:text-neutral-400 font-medium'
        let subColor = 'text-slate-400 dark:text-neutral-500'
        let iconColor = 'text-slate-400 dark:text-neutral-500'

        if (isCompleted) {
          outerBg = 'bg-[#10b981]'
          innerBg = 'bg-[#10b981]' // Solid Primary Green
          textColor = 'text-black font-semibold'
          subColor = 'text-black/80'
          iconColor = 'text-black'
        } else if (isActive) {
          outerBg = 'bg-gradient-to-r from-[#10b981] via-[#22d3ee] to-[#10b981]' // Green-Cyan gradient outline
          innerBg = 'bg-emerald-50/70 dark:bg-[#171717]' // Subtle tinted emerald on light, dark on dark
          textColor = 'text-emerald-800 dark:text-[#34d399] font-bold'
          subColor = 'text-emerald-600 dark:text-[#6ee7b7]'
          iconColor = 'text-[#10b981]'
        }

        const content = (
          <div
            className={`chevron-arrow relative p-[1.5px] transition-all duration-300 ${outerBg} ${
              isActive ? 'shadow-[0_2px_12px_rgba(16,185,129,0.25)]' : ''
            }`}
          >
            <div
              className={`chevron-arrow ${innerBg} px-4 sm:px-6 py-1.5 sm:py-2 flex items-center gap-2 select-none min-w-[130px] sm:min-w-[160px] h-[38px]`}
            >
              {/* Status Indicator Icon */}
              <span className="flex items-center justify-center shrink-0">
                {isCompleted ? (
                  <span className="grid h-4 w-4 place-items-center rounded-full bg-black/20 text-black">
                    <Check size={11} strokeWidth={3} />
                  </span>
                ) : isActive ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]" />
                  </span>
                ) : (
                  <span className={`text-[11px] font-mono ${iconColor}`}>
                    {stage.id}
                  </span>
                )}
              </span>

              {/* Step Title & Subtitle */}
              <div className="flex flex-col min-w-0 leading-tight">
                <span className={`text-[11px] sm:text-xs truncate ${textColor}`}>
                  {stage.title}
                </span>
                <span className={`text-[9px] sm:text-[10px] truncate ${subColor}`}>
                  {stage.subtitle}
                </span>
              </div>
            </div>
          </div>
        )

        const targetRoute = stage.route(slug)

        if (isLocked) {
          return (
            <div
              key={stage.id}
              className="cursor-not-allowed opacity-65"
              title="Complete previous steps to unlock"
            >
              {content}
            </div>
          )
        }

        return (
          <Link
            key={stage.id}
            to={targetRoute}
            className="group cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#10b981] rounded"
            title={`${stage.title} - ${stage.subtitle}`}
          >
            {content}
          </Link>
        )
      })}
    </nav>
  )
}
