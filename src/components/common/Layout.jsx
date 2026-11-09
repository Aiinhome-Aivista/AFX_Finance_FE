import { Link, useNavigate } from 'react-router-dom'
import { BrainCircuit, LogOut, Moon, Sun, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import ChevronTracker from './ChevronTracker'

export default function Layout({ children, wide, headerAction }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()

  return (
    <div className="flex min-h-full flex-col bg-bg text-ink selection:bg-[#10b981] selection:text-black">
      {/* Persistent Clean White Header with Chevron Progress Tracker (MOM Step 2) */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur shadow-xs">
        <div className="mx-auto flex h-16 max-w-[1850px] items-center justify-between gap-3 px-3 sm:px-6">
          {/* Brand Logo & Name */}
          <Link
            to={user?.selected_app ? '/finance' : '/apps'}
            className="flex items-center gap-2.5 font-semibold shrink-0 group focus:outline-none"
          >
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#10b981] text-[#0a0a0a] shadow-sm shadow-[#10b981]/30 transition-transform group-hover:scale-105">
              <BrainCircuit size={22} strokeWidth={2.4} />
            </span>
            <div className="hidden sm:flex items-baseline gap-2">
              <span className="text-[16.5px] font-bold tracking-tight text-ink leading-none">
                AgentForgeX
              </span>
              <span className="text-[16.5px] font-bold tracking-tight text-[#10b981] leading-none">
                Finance KG
              </span>
            </div>
          </Link>

          {/* Persistent Chevron Arrow Progress Tracker */}
          <div className="flex justify-start ml-2 sm:ml-4 mr-auto">
            <ChevronTracker />
          </div>

          {/* User Controls & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button
              className="btn-ghost btn-sm"
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
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

