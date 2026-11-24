import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BrainCircuit, ChevronDown, ChevronRight, ExternalLink, GitBranch, LogOut, Moon, ShieldCheck, Sun, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import ChevronTracker from './ChevronTracker'
import DomainJourneyTracker from './DomainJourneyTracker'

export default function Layout({ children, wide, headerAction, onNext, nextLabel, hideWorkflowBar, hideNext, fullBleed }) {
  const { user, isAnalyst, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    setProfileMenuOpen(false)
  }, [loc.pathname])
  const roleLabel = isAnalyst ? 'Data Analyst' : 'Data Architect'
  const isArchitecturePage = loc.pathname.startsWith('/cicd') || loc.pathname.startsWith('/security')
  const isModelSelectionPage = hideWorkflowBar || loc.pathname === '/apps' || isArchitecturePage
  const isLandingOrOverview = loc.pathname === '/finance' || loc.pathname === '/finance/'
  const isFinalStep = hideNext || loc.pathname.endsWith('/twin') || isLandingOrOverview || isArchitecturePage
  const shouldHideNext = isFinalStep

  const isWorkspaceSelectionPage =
    hideWorkflowBar ||
    loc.pathname.includes('/models') ||
    (typeof window !== 'undefined' && window.location.pathname.includes('/models'))
  const isReviewPage = loc.pathname.includes('/finalize')
  const isTwinPage = loc.pathname.includes('/twin')
  const isAuthOrApps = loc.pathname === '/login' || loc.pathname === '/register' || loc.pathname === '/apps'
  const shouldShowJourneyTracker = !hideWorkflowBar && !isWorkspaceSelectionPage && !isReviewPage && !isTwinPage && !isAuthOrApps && !isAnalyst

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
      nav('/finance/planning_budgeting_forecasting')
      return
    }

    if (parts[0] === 'finance' && parts[1]) {
      const slug = parts[1]
      const sp = new URLSearchParams(search)
      const curWf = sp.get('wf') || sessionStorage.getItem(`afx_active_wf_${slug}`)
      const curModel = sp.get('model') || sessionStorage.getItem(`afx_active_model_${slug}`) || sessionStorage.getItem('afx_current_workspace')
      const qs = new URLSearchParams()
      if (curWf) qs.set('wf', curWf)
      if (curModel) qs.set('model', curModel)
      const qStr = qs.toString() ? `?${qs.toString()}` : ''

      if (parts[2] === 'twin') {
        nav(qStr ? `/finance${qStr}` : '/finance')
        return
      }
      if (parts[2] === 'finalize') {
        nav(`/finance/${slug}/twin${qStr}`)
        return
      }
      if (search.includes('upload') || search.includes('gap')) {
        nav(`/finance/${slug}/finalize${qStr}`)
        return
      }
      // Business Input -> Data Input
      nav(`/finance/${slug}?mode=upload${curWf ? `&wf=${curWf}` : ''}${curModel ? `&model=${encodeURIComponent(curModel)}` : ''}`)
      return
    }

    nav('/finance')
  }

  return (
    <div className={`flex flex-col bg-bg text-ink selection:bg-[#10b981] selection:text-black ${fullBleed ? 'h-screen max-h-screen overflow-hidden' : 'min-h-full'}`}>
      {/* Persistent Clean White Header with Chevron Progress Tracker (MOM Step 2) */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur shadow-xs">
        <div className={`flex h-16 items-center justify-between gap-3 px-3 sm:px-6 ${fullBleed ? 'w-full max-w-full' : wide ? 'mx-auto max-w-[1850px]' : 'mx-auto max-w-6xl'}`}>
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
            {!isModelSelectionPage && !shouldHideNext && (
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

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition cursor-pointer select-none ${profileMenuOpen
                    ? 'bg-surface border-[#10b981] text-ink shadow-sm'
                    : 'bg-surface2 hover:bg-surface border-line text-ink shadow-2xs'
                  }`}
                title="Profile & Architecture Plans"
                data-testid="profile-dropdown-btn"
              >
                <User size={13} className="shrink-0 text-[#10b981]" />
                <span className="truncate max-w-[80px]">
                  {user?.display_name || user?.email || 'Profile'}
                </span>
                <ChevronDown
                  size={12}
                  className={`text-muted transition-transform duration-200 ${profileMenuOpen ? 'rotate-180 text-[#10b981]' : ''
                    }`}
                />
              </button>

              {/* Dropdown Menu */}
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface border border-line shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User info */}
                  <div className="px-3 py-2.5 border-b border-line mb-1.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-bold text-ink truncate">
                        {user?.display_name || 'Active User'}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 shrink-0">
                        {roleLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted truncate">{user?.email || 'Authenticated Session'}</p>
                  </div>

                  {/* Engineering & Architecture Plans */}
                  <div className="px-1 py-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted px-2 py-1">
                      Engineering Architecture
                    </div>

                    {/* CI/CD Plan */}
                    <Link
                      to="/cicd-plan"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setProfileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition ${loc.pathname === '/cicd-plan' || loc.pathname === '/cicd'
                          ? 'bg-[#10b981]/15 text-[#10b981] font-semibold border border-[#10b981]/30'
                          : 'text-ink hover:bg-surface2'
                        }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
                        <GitBranch size={13} className="text-[#10b981]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-ink leading-tight flex items-center justify-between">
                          <span>Deployment</span>
                          <ExternalLink size={11} className="text-muted ml-1" />
                        </div>
                        <div className="text-[10px] text-muted truncate">Pipeline, Jenkins & Docker</div>
                      </div>
                    </Link>

                    {/* Security Plan */}
                    <Link
                      to="/security-plan"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setProfileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-2.5 py-2 mt-1 rounded-xl text-xs font-medium transition ${loc.pathname === '/security-plan' || loc.pathname === '/security'
                          ? 'bg-indigo-500/15 text-indigo-400 font-semibold border border-indigo-500/30'
                          : 'text-ink hover:bg-surface2'
                        }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center shrink-0">
                        <ShieldCheck size={13} className="text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-ink leading-tight flex items-center justify-between">
                          <span>Application Security</span>
                          <ExternalLink size={11} className="text-muted ml-1" />
                        </div>
                        <div className="text-[10px] text-muted truncate">Zero-Trust, RBAC & Isolation</div>
                      </div>
                    </Link>
                  </div>

                  <div className="my-1.5 border-t border-line" />

                  {/* Logout option */}
                  {/* <button
                    type="button"
                    onClick={async () => {
                      setProfileMenuOpen(false)
                      await logout()
                      nav('/login')
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium text-bad hover:bg-bad/10 transition cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-lg bg-bad/10 border border-bad/20 flex items-center justify-center shrink-0">
                      <LogOut size={13} className="text-bad" />
                    </div>
                    <span className="font-semibold">Sign Out</span>
                  </button> */}
                </div>
              )}
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
      <main className={`w-full flex-1 ${fullBleed ? 'flex flex-col p-0 m-0 overflow-hidden min-h-0 max-w-full' : `mx-auto px-3 py-5 sm:px-6 ${wide ? 'max-w-[1850px]' : 'max-w-6xl'}`}`}>
        {children}
        {shouldShowJourneyTracker && <DomainJourneyTracker />}
      </main>
    </div>
  )
}

