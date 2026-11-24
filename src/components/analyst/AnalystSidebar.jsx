import React from 'react'
import {
  LayoutDashboard,
  Receipt,
  Share2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CircleDollarSign,
  Menu,
  Settings,
  ArrowLeft
} from 'lucide-react'
import { Link } from 'react-router-dom'

export default function AnalystSidebar({
  activeTab = 'command_center',
  onSelectTab,
  collapsed = false,
  onToggleCollapse,
  modelName = 'Planning, Budgeting and Forecasting'
}) {
  const navItems = [
    {
      id: 'command_center',
      label: 'Command center',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'receivables',
      label: 'Receivables',
      icon: Receipt,
      badge: null
    },
    {
      id: 'assumptions',
      label: 'Assumptions',
      icon: SlidersHorizontal,
      badge: null
    }
  ]

  return (
    <aside
      className={`relative flex flex-col shrink-0 transition-all duration-200 ease-in-out border-r border-line bg-surface text-ink select-none h-[calc(100vh-64px)] z-30 ${
        collapsed ? 'w-[64px]' : 'w-[240px]'
      }`}
      aria-label="Working Capital Sidebar"
    >
      {/* 1. Top Header: Workspace & Collapse Toggle */}
      <div className="flex items-center justify-between h-14 px-3 border-b border-line shrink-0">
        {collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="mx-auto grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:text-ink hover:bg-surface2 transition cursor-pointer"
          >
            <Menu size={17} />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand/10 text-brand border border-brand/20">
                <CircleDollarSign size={17} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="flex items-center gap-1 text-xs font-bold text-ink truncate">
                  <span>AgentForgeX</span>
                </div>
                <p className="text-[10px] text-muted truncate">Workspace · Finance</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleCollapse}
              title="Collapse sidebar"
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:text-ink hover:bg-surface2 transition cursor-pointer shrink-0 ml-1"
            >
              <Menu size={16} />
            </button>
          </>
        )}
      </div>

      {/* 2. Workspace Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1 [scrollbar-width:none]">
        {!collapsed && (
          <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
            Workspace
          </p>
        )}

        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-brand/10 text-brand font-bold border border-brand/20 shadow-2xs'
                  : 'text-muted hover:bg-surface2 hover:text-ink border border-transparent'
              } ${collapsed ? 'justify-center px-0' : ''}`}
            >
              <Icon
                size={16}
                className={`shrink-0 transition-colors ${
                  isActive ? 'text-brand' : 'text-muted group-hover:text-ink'
                }`}
              />

              {!collapsed && (
                <>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {isActive ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-brand shrink-0" />
                  ) : item.badge ? (
                    <span className="rounded bg-surface2 border border-line px-1.5 py-0.2 text-[10px] font-mono text-muted shrink-0">
                      {item.badge}
                    </span>
                  ) : null}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* 3. Bottom Footer Section (Back to Models) */}
      <div className="border-t border-line p-2 shrink-0 bg-surface">
        {!collapsed ? (
          <Link
            to="/finance/models"
            className="flex items-center gap-2.5 rounded-lg border border-line/70 bg-surface2 px-3 py-2 text-xs font-semibold text-ink hover:text-brand hover:border-brand/40 hover:bg-brand/5 transition cursor-pointer group shadow-2xs"
            title="Back to Models"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-surface border border-line text-muted group-hover:text-brand transition-colors">
              <ArrowLeft size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-ink group-hover:text-brand">
                Back to Models
              </p>
            </div>
          </Link>
        ) : (
          <Link
            to="/finance/models"
            className="mx-auto grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:text-brand hover:bg-brand/5 transition cursor-pointer"
            title="Back to Models"
          >
            <ArrowLeft size={16} />
          </Link>
        )}
      </div>
    </aside>
  )
}
