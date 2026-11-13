import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrainCircuit, ChevronRight, LogOut, Moon, Sun, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import ChevronTracker from './ChevronTracker'

export default function Layout({ children, wide, headerAction, onNext, nextLabel, hideWorkflowBar }) {
  const { user, isAnalyst, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const roleLabel = isAnalyst ? 'Data Analyst' : 'Data Architect'
  const isModelSelectionPage = hideWorkflowBar || loc.pathname === '/apps'

  const handleNext = () => {
    if (onNext) {
      onNext()
      return
    }

    const path = loc.pathname
    const search = loc.search

    if (path === '/apps') {
      nav('/finance')
      return
    }

    const parts = path.split('/').filter(Boolean)
    if (parts.length === 1 && parts[0] === 'finance') {
      nav('/finance/cost-and-profitability-management')
      return
    }

    if (parts[0] === 'finance' && parts[1]) {
      const slug = parts[1]
      if (parts[2] === 'twin') {
        nav('/finance')
        return
      }
      if (parts[2] === 'finalize') {
        nav(`/finance/${slug}/twin`)
        return
      }
      if (search.includes('upload') || search.includes('gap')) {
        nav(`/finance/${slug}/finalize`)
        return
      }
      // Business Input -> Data Input
      nav(`/finance/${slug}?mode=upload`)
      return
    }

    nav('/finance')
  }

  return (
    <div className="flex min-h-full flex-col bg-bg text-ink selection:bg-[#10b981] selection:text-black">
      {/* Persistent Clean White Header with Chevron Progress Tracker (MOM Step 2) */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur shadow-xs">
        <div className="mx-auto flex h-16 max-w-[1850px] items-center justify-between gap-3 px-3 sm:px-6">
          {/* Brand Logo & Name */}
          <Link
            to={isAnalyst ? '/finance' : '/apps'}
            className="flex items-center gap-2.5 font-semibold shrink-0 group focus:outline-none"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#10b981] text-[#141821] shadow-sm shadow-[#10b981]/30 transition-transform group-hover:scale-105">
              <BrainCircuit size={22} strokeWidth={2.4} />
            </span>
            <div className="hidden sm:flex items-baseline gap-2">
              <span className="text-[16.5px] font-bold tracking-tight text-ink leading-none">
                AgentForgeX
              </span>
            </div>
          </Link>

          {/* Persistent Chevron Arrow Progress Tracker (hidden on Model Selection / apps page) */}
          <div className="flex justify-start min-w-0 ml-2 sm:ml-4 mr-auto">
            {!isAnalyst && !isModelSelectionPage && <ChevronTracker />}
          </div>

          {/* User Controls & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            {!isModelSelectionPage && (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary btn-sm inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl shadow-xs cursor-pointer hover:scale-[1.02] transition"
                title={nextLabel || "Next step"}
                data-testid="header-next-btn"
              >
                <span>{nextLabel || 'Next'}</span>
                <ChevronRight size={14} />
              </button>
            )}
            <button
              className="btn-ghost btn-sm"
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-xl bg-[#10b981]/10 border border-[#10b981]/25 text-[11px] font-semibold text-[#10b981]">
              {roleLabel}
            </span>
            <div
              className="hidden sm:inline-flex items-center gap-1.5 max-w-[160px] px-2.5 py-1 rounded-xl bg-surface2 border border-line text-xs font-semibold text-ink shadow-2xs"
              title={user?.email}
            >
              <User size={13} className="shrink-0 text-[#10b981]" />
              <span className="truncate">
                {user?.display_name || user?.email}
              </span>
            </div>
            <button
              className="btn-ghost btn-sm hover:!text-bad hover:!border-bad/40"
              onClick={async () => {
                await logout()
                nav('/login')
              }}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className={`mx-auto w-full flex-1 px-3 py-5 sm:px-6 ${wide ? 'max-w-[1850px]' : 'max-w-6xl'}`}>
        {children}
      </main>
    </div>
  )
}

