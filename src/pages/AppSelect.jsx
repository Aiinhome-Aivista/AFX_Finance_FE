import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, Landmark, Package, Layers, Ban } from 'lucide-react'
import { apps as appsApi } from '../api'
import Layout from '../components/common/Layout'
import { Loading, Spinner } from '../components/common/States'
import { useAuth } from '../context/AuthContext'

const APP_META = {
  finance: {
    icon: Landmark,
    badge: 'Active Domain',
    accent: '#10b981',
  },
  fmcg: {
    icon: Package,
    badge: 'Active Domain',
    accent: '#06b6d4',
  },
  supply_chain: {
    icon: Package,
    badge: 'Active Domain',
    accent: '#06b6d4',
  },
  others: {
    icon: Layers,
    badge: 'Disabled',
    accent: '#94a3b8',
  },
}

const DEFAULT_APPS = [
  {
    key: 'finance',
    name: 'Finance',
    description: 'Finance & EPM knowledge graphs — built from scratch for enterprise finance functions.',
    route: '/finance',
    active: true,
  },
  {
    key: 'fmcg',
    name: 'FMCG',
    description: 'Fast-moving consumer goods supply-chain, trade promotions, route-to-market, and retail execution models.',
    route: '/fmcg',
    active: true,
  },
  {
    key: 'others',
    name: 'Others',
    description: 'Cross-functional enterprise domains (Sales, Operations, HR) — currently disabled.',
    route: '/others',
    active: false,
  },
]

const VALID_KEYS = new Set(['finance', 'supply_chain', 'fmcg', 'others'])

export default function AppSelect() {
  const nav = useNavigate()
  const { refreshUser } = useAuth()

  const [available, setAvailable] = useState([])
  const [subscribed, setSubscribed] = useState([])
  const [selectedAvailable, setSelectedAvailable] = useState(null)
  const [selectedSubscribed, setSelectedSubscribed] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [goBusy, setGoBusy] = useState(false)
  const [err, setErr] = useState('')

  const syncFromPayload = (res) => {
    const rawAvail = Array.isArray(res?.available_apps) ? res.available_apps : null
    const rawSub = Array.isArray(res?.subscribed_apps) ? res.subscribed_apps : null

    if (rawAvail && rawSub) {
      setAvailable(rawAvail.filter((a) => VALID_KEYS.has(a.key)))
      setSubscribed(rawSub.filter((a) => VALID_KEYS.has(a.key)))
      return
    }

    const rawApps = (Array.isArray(res?.apps) ? res.apps : DEFAULT_APPS).filter((a) =>
      VALID_KEYS.has(a.key)
    )
    setAvailable(rawApps)
    setSubscribed([])
  }

  useEffect(() => {
    let alive = true
    setLoading(true)
    appsApi
      .list()
      .then((res) => {
        if (!alive) return
        syncFromPayload(res)
      })
      .catch((e) => {
        if (!alive) return
        setErr(e.message || 'Could not load model domains.')
        setAvailable(DEFAULT_APPS)
        setSubscribed([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const handleSubscribe = async () => {
    if (!selectedAvailable || busy) return
    const appToSub = available.find((a) => a.key === selectedAvailable)
    if (appToSub && appToSub.active === false) {
      setErr("The 'Others' domain is currently disabled.")
      return
    }
    setErr('')
    const key = selectedAvailable

    // Immediate state update
    setAvailable((prev) => prev.filter((a) => a.key !== key))
    setSubscribed((prev) => [...prev.filter((a) => a.key !== key), appToSub])
    setSelectedSubscribed(key)
    setSelectedAvailable(null)

    setBusy(true)
    try {
      const res = await appsApi.subscribe(key)
      syncFromPayload(res)
      setSelectedSubscribed(key)
    } catch (e) {
      console.warn('Subscription API warning:', e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleUnsubscribe = async () => {
    if (!selectedSubscribed || busy) return
    setErr('')
    const key = selectedSubscribed
    const appToUnsub = subscribed.find((a) => a.key === key)

    // Immediate state update
    setSubscribed((prev) => prev.filter((a) => a.key !== key))
    if (appToUnsub) {
      setAvailable((prev) => [...prev.filter((a) => a.key !== key), appToUnsub])
    }
    setSelectedAvailable(key)
    setSelectedSubscribed(null)

    setBusy(true)
    try {
      const res = await appsApi.unsubscribe(key)
      syncFromPayload(res)
      setSelectedAvailable(key)
    } catch (e) {
      console.warn('Unsubscription API warning:', e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleGo = async () => {
    if (!selectedSubscribed || goBusy) return
    setErr('')
    setGoBusy(true)
    try {
      await appsApi.select(selectedSubscribed).catch(() => { })
      await refreshUser().catch(() => { })
      const target =
        subscribed.find((a) => a.key === selectedSubscribed)?.route ||
        (selectedSubscribed === 'supply_chain' ? '/supply-chain' : `/${selectedSubscribed}`)
      nav(target)
    } catch (e) {
      setErr(e.message || 'Could not open workspace for the selected model.')
    } finally {
      setGoBusy(false)
    }
  }

  const renderCard = (app, { isSelected, onClick, variant }) => {
    const meta = APP_META[app.key] || { icon: Layers, badge: app.active === false ? 'Disabled' : 'Active Domain', accent: '#10b981' }
    const Icon = meta.icon
    const isDisabled = app.active === false

    return (
      <button
        key={app.key}
        type="button"
        onClick={isDisabled ? () => setErr("The 'Others' domain is disabled.") : onClick}
        aria-pressed={isSelected}
        aria-disabled={isDisabled}
        data-testid={`model-card-${variant}-${app.key}`}
        className={`w-full text-left rounded-xl border p-4 transition-all focus:outline-none ${isDisabled
          ? 'border-line/60 bg-surface2/30 opacity-60 cursor-not-allowed select-none'
          : isSelected
            ? 'border-[#10b981] bg-[#10b981]/10 ring-2 ring-[#10b981]/30 shadow-md cursor-pointer'
            : 'border-line bg-surface2/60 hover:border-[#10b981]/50 hover:bg-surface2 cursor-pointer'
          }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: isDisabled
                  ? 'rgba(148,163,184,0.08)'
                  : isSelected
                    ? 'rgba(16,185,129,0.16)'
                    : 'rgba(16,185,129,0.08)',
                borderColor: isDisabled
                  ? 'rgba(148,163,184,0.2)'
                  : isSelected
                    ? 'rgba(16,185,129,0.45)'
                    : 'rgba(16,185,129,0.2)',
                color: meta.accent,
              }}
            >
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={`text-sm font-bold ${isDisabled ? 'text-mute' : 'text-ink'}`}>
                  {app.name}
                </h3>
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${isDisabled
                    ? 'bg-neutral-800/40 border-neutral-700 text-neutral-400'
                    : 'bg-surface border-line text-mute'
                    }`}
                >
                  {isDisabled ? 'Disabled' : meta.badge}
                </span>
              </div>
              <p className="text-xs text-mute mt-1 leading-relaxed">{app.description}</p>
            </div>
          </div>

          {isDisabled ? (
            <Ban size={16} className="text-neutral-500 shrink-0 mt-1" />
          ) : (
            isSelected && <CheckCircle2 size={18} className="text-[#10b981] shrink-0 mt-0.5" />
          )}
        </div>
      </button>
    )
  }

  return (
    <Layout hideWorkflowBar>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/25 text-[11px] font-semibold text-[#10b981] mb-2">
            Data Architect Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">Model Selection</h1>
          <p className="text-sm text-mute mt-1">
            Select an active domain from <strong className="text-ink">Available Models</strong> (Finance, FMCG, Others) and move it to{' '}
            <strong className="text-ink">Subscribed Models</strong>, then select a subscribed model and click{' '}
            <strong className="text-ink">Go</strong>.
          </p>
        </div>

        {err && (
          <div
            role="alert"
            className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-xs text-red-400"
          >
            <span>{err}</span>
            <button type="button" onClick={() => setErr('')} className="font-semibold underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <Loading label="Loading domain models…" className="min-h-[280px]" />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch mt-4">
              {/* Left Panel: Available Models */}
              <section
                aria-label="Available Models"
                className="card p-5 border border-line bg-surface flex flex-col min-h-[300px]"
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
                  <div>
                    <h2 className="text-sm font-bold text-ink">Available Models</h2>
                    <p className="text-xs text-mute mt-0.5">Available domains to select and subscribe</p>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-surface2 border border-line text-mute">
                    {available.length}
                  </span>
                </div>

                {available.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <p className="text-xs text-mute">
                      All available domain models have been moved to Subscribed Models.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {available.map((app) =>
                      renderCard(app, {
                        isSelected: selectedAvailable === app.key,
                        variant: 'available',
                        onClick: () => {
                          setSelectedAvailable((prev) => (prev === app.key ? null : app.key))
                        },
                      })
                    )}
                  </div>
                )}
              </section>

              {/* Center Arrow Transfer Controls */}
              <div className="flex md:flex-col items-center justify-center gap-3 py-2">
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={!selectedAvailable || busy}
                  aria-label="Move selected model to Subscribed Models"
                  title="Move to Subscribed Models"
                  className={`h-11 w-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${selectedAvailable && !busy
                    ? 'bg-[#10b981] border-[#10b981] text-[#0b1320] shadow-md shadow-[#10b981]/25 hover:bg-[#34d399]'
                    : 'bg-surface border-line text-mute opacity-50 cursor-not-allowed'
                    }`}
                >
                  {busy && selectedAvailable ? <Spinner /> : <ArrowRight size={18} />}
                </button>

                <button
                  type="button"
                  onClick={handleUnsubscribe}
                  disabled={!selectedSubscribed || busy}
                  aria-label="Move selected model back to Available Models"
                  title="Move back to Available Models"
                  className={`h-9 w-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${selectedSubscribed && !busy
                    ? 'bg-surface2 border-line text-ink hover:border-[#10b981]/60'
                    : 'bg-surface border-line text-mute opacity-40 cursor-not-allowed'
                    }`}
                >
                  <ArrowLeft size={15} />
                </button>
              </div>

              {/* Right Panel: Subscribed Models */}
              <section
                aria-label="Subscribed Models"
                className="card p-5 border border-line bg-surface flex flex-col min-h-[300px]"
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
                  <div>
                    <h2 className="text-sm font-bold text-ink">Subscribed Models</h2>
                    <p className="text-xs text-mute mt-0.5">Click a subscribed model to highlight Go</p>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-surface2 border border-line text-mute">
                    {subscribed.length}
                  </span>
                </div>

                {subscribed.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <p className="text-xs text-mute">
                      No subscribed models yet. Select a domain from Available Models and click the arrow button.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subscribed.map((app) =>
                      renderCard(app, {
                        isSelected: selectedSubscribed === app.key,
                        variant: 'subscribed',
                        onClick: () => {
                          setSelectedSubscribed((prev) => (prev === app.key ? null : app.key))
                        },
                      })
                    )}
                  </div>
                )}
              </section>
            </div>

            {/* Bottom Go Bar */}
            <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-5 py-4">
              <div className="text-xs text-mute">
                {selectedSubscribed ? (
                  <span>
                    Selected workspace:{' '}
                    <strong className="text-ink">
                      {subscribed.find((a) => a.key === selectedSubscribed)?.name || selectedSubscribed}
                    </strong>
                  </span>
                ) : (
                  <span>Select a domain inside Subscribed Models to activate Go.</span>
                )}
              </div>

              <button
                type="button"
                onClick={handleGo}
                disabled={!selectedSubscribed || goBusy}
                data-testid="model-select-go"
                className={`inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition-all cursor-pointer ${selectedSubscribed && !goBusy
                  ? 'bg-[#10b981] text-[#0b1320] shadow-lg shadow-[#10b981]/30 ring-2 ring-[#10b981]/50 hover:bg-[#34d399]'
                  : 'bg-surface2 border border-line text-mute opacity-55 cursor-not-allowed'
                  }`}
              >
                {goBusy ? (
                  <Spinner />
                ) : (
                  <>
                    <span>Go</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
