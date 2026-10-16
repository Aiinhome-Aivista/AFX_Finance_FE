import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Moon, Network, Sun } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

export default function Layout({ children, wide }) {
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const nav = useNavigate()
  const link = ({ isActive }) => `rounded-lg px-3 py-1.5 ${isActive ? 'bg-surface2 font-medium' : 'text-muted hover:text-ink'}`
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-3 px-3 sm:px-6">
          <Link to={user?.selected_app ? '/finance' : '/apps'} className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-ink"><Network size={18} /></span>
            <span className="hidden sm:inline">Finance Knowledge Graph</span>
          </Link>
          
          <div className="ml-auto flex items-center gap-2">
            <button className="btn-ghost btn-sm" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Toggle theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span className="hidden max-w-[160px] truncate text-sm text-muted sm:inline" title={user?.email}>{user?.display_name}</span>
            <button className="btn-ghost btn-sm" onClick={async () => { await logout(); nav('/login') }}><LogOut size={16} /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-3 py-5 sm:px-6 ${wide ? 'max-w-[1800px]' : 'max-w-6xl'}`}>{children}</main>
    </div>
  )
}
