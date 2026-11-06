import { useMemo, useState } from 'react'
import {
  Calendar,
  Clock,
  GitCommit,
  Layers,
  MessageSquare,
  Sparkles,
  Bot,
  User,
  ExternalLink,
  ChevronRight,
  Filter,
  CheckCircle2,
  TrendingUp,
  Search,
} from 'lucide-react'

function parseDate(rawStr) {
  if (!rawStr) return null
  try {
    if (typeof rawStr !== 'string') {
      const d = new Date(rawStr)
      return isNaN(d.getTime()) ? null : d
    }
    // Flask's DefaultJSONProvider outputs timestamps as 'Mon, 26 Oct 2026 18:45:45 GMT'
    // where 18:45:45 is the local server/database time, NOT true UTC.
    // When the browser parses 'GMT', it shifts the time by the user's local timezone (+5:30),
    // incorrectly turning 18:45 into 00:15 of Oct 27!
    // We strip the trailing ' GMT' or 'Z' to treat the timestamp as local time.
    let s = rawStr.trim()
    if (s.endsWith(' GMT')) {
      s = s.slice(0, -4).trim()
    } else if (s.endsWith('Z')) {
      s = s.slice(0, -1).trim()
    }
    const d = new Date(s)
    if (!isNaN(d.getTime())) return d
    const fallback = new Date(rawStr)
    return isNaN(fallback.getTime()) ? null : fallback
  } catch {
    return null
  }
}

function formatDate(rawStr) {
  if (!rawStr) return ''
  const d = parseDate(rawStr)
  if (!d) return rawStr
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(rawStr) {
  if (!rawStr) return ''
  const d = parseDate(rawStr)
  if (!d) return ''
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ChatHistoryPanel({
  snap,
  versions = [],
  domainName,
  onSelectNode,
  onSwitchToChat,
}) {
  const [filter, setFilter] = useState('all') // 'all' | 'chat' | 'graph'
  const [search, setSearch] = useState('')

  // Build a chronological combined timeline of chat messages and graph updates
  const timeline = useMemo(() => {
    const items = []

    // 1. Add Chat Messages
    const msgs = snap?.messages || []
    msgs.forEach((m) => {
      const isGraphUpdate =
        m.role === 'assistant' &&
        (m.content?.includes('✨ New Node Added') ||
          m.content?.includes('🔗 New Relationship Built') ||
          m.content?.includes('Updated your knowledge graph') ||
          m.content?.includes('Knowledge Graph automatically updated'))

      items.push({
        id: `msg-${m.id}`,
        type: 'chat',
        role: m.role,
        kind: m.kind,
        content: m.content,
        timestamp: m.created_at,
        meta: m.meta,
        isGraphUpdate,
      })
    })

    // 2. Add Graph Versions / Updates
    ;(versions || []).forEach((v) => {
      if (v.number === 0) return // Skip initial KG0 reference
      items.push({
        id: `ver-${v.number}`,
        type: 'graph_version',
        versionNumber: v.number,
        label: v.label || `KG${v.number}`,
        summary: v.summary || 'Knowledge graph customized and updated',
        timestamp: v.created_at,
        nodeCount: v.node_count,
        edgeCount: v.edge_count,
        kind: v.kind,
        status: v.status,
      })
    })

    // Sort items chronologically (newest first for quick audit)
    items.sort((a, b) => {
      const da = parseDate(a.timestamp)
      const db = parseDate(b.timestamp)
      const ta = da ? da.getTime() : 0
      const tb = db ? db.getTime() : 0
      return tb - ta
    })

    return items
  }, [snap?.messages, versions])

  const filteredTimeline = useMemo(() => {
    return timeline.filter((item) => {
      if (filter === 'chat' && item.type !== 'chat') return false
      if (filter === 'graph' && item.type !== 'graph_version' && !item.isGraphUpdate) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        if (item.type === 'chat') {
          return item.content?.toLowerCase().includes(q)
        }
        if (item.type === 'graph_version') {
          return (
            item.summary?.toLowerCase().includes(q) ||
            item.label?.toLowerCase().includes(q) ||
            `kg${item.versionNumber}`.includes(q)
          )
        }
      }
      return true
    })
  }, [timeline, filter, search])

  // Group by Date
  const groupedByDate = useMemo(() => {
    const groups = {}
    filteredTimeline.forEach((item) => {
      const dateKey = formatDate(item.timestamp) || 'Recent Activity'
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(item)
    })
    return groups
  }, [filteredTimeline])

  return (
    <div className="flex h-full flex-col bg-surface/90 text-ink">
      {/* Top Filter and Search Bar */}
      <div className="border-b border-line/70 bg-surface2/40 px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-surface p-0.5 border border-line/60">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              All ({timeline.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('graph')}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                filter === 'graph'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <TrendingUp size={11} />
              <span>Graph Updates</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('chat')}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition cursor-pointer ${
                filter === 'chat'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-muted hover:text-ink'
              }`}
            >
              <MessageSquare size={11} />
              <span>Messages</span>
            </button>
          </div>

          <div className="relative flex-1 max-w-[150px]">
            <Search size={12} className="absolute left-2.5 top-2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history…"
              className="w-full rounded-lg border border-line/80 bg-surface pl-7 pr-2 py-1 text-[11px] text-ink placeholder:text-muted focus:border-brand focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto p-4 scroll-thin space-y-6">
        {filteredTimeline.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted">
            <Clock size={32} className="mb-2 text-muted/50" />
            <p className="text-sm font-semibold text-ink">No Activity Found</p>
            <p className="mt-1 text-xs text-muted max-w-xs">
              Conversations and knowledge graph updates will be logged here with timestamps and changes.
            </p>
            {onSwitchToChat && (
              <button
                type="button"
                onClick={onSwitchToChat}
                className="btn-ghost btn-sm mt-3 text-xs cursor-pointer text-brand hover:underline"
              >
                Go to Chatbot
              </button>
            )}
          </div>
        ) : (
          Object.entries(groupedByDate).map(([dateStr, items]) => (
            <div key={dateStr} className="space-y-3">
              {/* Date Header Badge */}
              <div className="sticky top-0 z-10 flex items-center gap-2 bg-surface/95 backdrop-blur-xs py-1">
                <span className="flex items-center gap-1.5 rounded-full border border-line bg-surface2 px-2.5 py-0.5 text-[11px] font-semibold text-muted shadow-2xs">
                  <Calendar size={11} className="text-brand" />
                  {dateStr}
                </span>
                <div className="h-px flex-1 bg-line/60" />
              </div>

              {/* Items for this date */}
              <div className="relative pl-4 border-l-2 border-line/70 space-y-3 ml-2">
                {items.map((item) => {
                  const timeStr = formatTime(item.timestamp)

                  // 1. Graph Version Update Entry
                  if (item.type === 'graph_version') {
                    return (
                      <div
                        key={item.id}
                        className="relative rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs shadow-2xs transition hover:border-emerald-500/50"
                      >
                        {/* Dot on timeline line */}
                        <span className="absolute -left-[23px] top-3.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500 shadow-xs" />

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                              KG {item.versionNumber}
                            </span>
                            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                              Knowledge Graph Version Created
                            </span>
                          </div>
                          {timeStr && (
                            <span className="flex items-center gap-1 text-[10px] text-muted font-medium">
                              <Clock size={10} />
                              {timeStr}
                            </span>
                          )}
                        </div>

                        <p className="mt-1.5 text-xs text-ink leading-relaxed">
                          {item.summary}
                        </p>

                        <div className="mt-2 flex items-center gap-3 text-[10px] text-muted">
                          {item.nodeCount !== undefined && item.nodeCount !== null && (
                            <span className="flex items-center gap-1 font-medium">
                              <Layers size={11} className="text-emerald-500" />
                              {item.nodeCount} Entities
                            </span>
                          )}
                          {item.edgeCount !== undefined && item.edgeCount !== null && (
                            <span className="flex items-center gap-1 font-medium">
                              <TrendingUp size={11} className="text-emerald-500" />
                              {item.edgeCount} Relationships
                            </span>
                          )}
                          <span className="ml-auto rounded bg-surface2 px-1.5 py-0.5 text-[10px] capitalize">
                            {item.status || 'Active'}
                          </span>
                        </div>
                      </div>
                    )
                  }

                  // 2. Chat Message with Graph Update (Clean & Minimal)
                  if (item.isGraphUpdate) {
                    // Extract minimal clean text
                    const raw = item.content || ''
                    const lines = raw.split('\n').filter(Boolean)
                    const introLine = lines.find((l) => !l.startsWith('✨') && !l.startsWith('🔗') && !l.startsWith('📝') && !l.startsWith('⚠️')) || 'Graph updated based on conversation'
                    const addedLine = lines.find((l) => l.startsWith('✨'))
                    const updatedLine = lines.find((l) => l.startsWith('📝'))

                    return (
                      <div
                        key={item.id}
                        className="relative rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 text-xs shadow-2xs transition hover:border-indigo-500/50"
                      >
                        <span className="absolute -left-[23px] top-3.5 h-3 w-3 rounded-full border-2 border-surface bg-indigo-500 shadow-xs" />

                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="grid h-4 w-4 place-items-center rounded-full bg-indigo-600 text-white">
                              <Sparkles size={9} />
                            </span>
                            <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                              Live Graph Adaptation
                            </span>
                          </div>
                          {timeStr && (
                            <span className="flex items-center gap-1 text-[10px] text-muted font-medium">
                              <Clock size={10} />
                              {timeStr}
                            </span>
                          )}
                        </div>

                        <p className="mt-1.5 text-xs text-ink leading-relaxed">
                          {introLine}
                        </p>

                        {(addedLine || updatedLine) && (
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                            {addedLine && (
                              <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-indigo-700 dark:text-indigo-300 font-medium">
                                {addedLine}
                              </span>
                            )}
                            {updatedLine && (
                              <span className="rounded-md bg-surface2 border border-line px-2 py-0.5 text-ink font-medium">
                                {updatedLine}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  }

                  // 3. Regular Chat Message (User or Assistant)
                  const isUser = item.role === 'user'
                  return (
                    <div
                      key={item.id}
                      className={`relative rounded-xl border p-2.5 text-xs shadow-2xs transition ${
                        isUser
                          ? 'border-brand/20 bg-brand/5 ml-3'
                          : 'border-line/70 bg-surface'
                      }`}
                    >
                      <span
                        className={`absolute -left-[23px] top-3.5 h-2.5 w-2.5 rounded-full border-2 border-surface shadow-xs ${
                          isUser ? 'bg-brand' : 'bg-muted'
                        }`}
                      />

                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold">
                          {isUser ? (
                            <>
                              <User size={12} className="text-brand" />
                              <span className="text-ink">User</span>
                            </>
                          ) : (
                            <>
                              <Bot size={12} className="text-muted" />
                              <span className="text-ink">Assistant</span>
                            </>
                          )}
                          {item.kind && item.kind !== 'chat' && (
                            <span className="rounded bg-surface2 px-1.5 py-0.2 text-[9px] font-normal text-muted capitalize">
                              {item.kind.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        {timeStr && (
                          <span className="text-[10px] text-muted">
                            {timeStr}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-ink/90 leading-relaxed whitespace-pre-wrap">
                        {item.content}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
