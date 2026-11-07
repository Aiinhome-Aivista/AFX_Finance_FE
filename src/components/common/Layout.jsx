import { Link, useNavigate } from 'react-router-dom'
import { BrainCircuit, LogOut, Moon, Sun } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import ChevronTracker from './ChevronTracker'

export default function Layout({ children, wide }) {
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
            <div className="hidden lg:flex flex-col leading-tight">
              <span className="text-[17px] font-bold tracking-tight text-ink group-hover:text-emerald-600 transition-colors">
                AgentForgeX
              </span>
              <span className="text-[13.5px] uppercase font-mono tracking-wider text-emerald-600 font-bold">
                Finance KG
              </span>
            </div>
          </Link>

          {/* Persistent Chevron Arrow Progress Tracker */}
          <div className="flex-1 flex justify-center max-w-[760px] mx-2">
            <ChevronTracker />
          </div>

          {/* User Controls & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              className="btn-ghost btn-sm"
              onClick={toggle}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <span
              className="hidden max-w-[140px] truncate text-xs text-muted sm:inline px-2.5 py-1 rounded-lg bg-surface2 border border-line"
              title={user?.email}
            >
              {user?.display_name || user?.email}
            </span>
            <button
              className="btn-ghost btn-sm hover:!text-bad hover:!border-bad/40"
              onClick={async () => {
                await logout()
                nav('/login')
              }}
              title="Sign out"
            >
              <LogOut size={15} />
              <span className="hidden xl:inline">Sign out</span>
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

