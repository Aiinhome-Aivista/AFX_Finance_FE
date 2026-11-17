// Dependency-free SVG charts for the analyst dashboard. Data shape: [{ label, value }].
const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#94a3b8']

export const fmt = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  const a = Math.abs(n)
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (a >= 1e4) return `${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const niceMax = (max) => {
  if (max <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(max))
  const f = max / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}

const W = 520
const H = 260
const M = { t: 12, r: 12, b: 56, l: 52 }

function Axes({ max, ticks = 4 }) {
  return Array.from({ length: ticks + 1 }, (_, i) => {
    const v = (max / ticks) * i
    const y = M.t + (H - M.t - M.b) * (1 - i / ticks)
    return (
      <g key={i}>
        <line x1={M.l} x2={W - M.r} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="3 3" />
        <text x={M.l - 8} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.6">{fmt(v)}</text>
      </g>
    )
  })
}

const trunc = (s, n) => (String(s).length > n ? `${String(s).slice(0, n - 1)}…` : String(s))

export function BarChart({ data }) {
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const bw = (W - M.l - M.r) / data.length
  const ih = H - M.t - M.b
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-ink" role="img">
      <Axes max={max} />
      {data.map((d, i) => {
        const h = Math.max((Math.max(d.value, 0) / max) * ih, 1)
        const x = M.l + i * bw + bw * 0.15
        return (
          <g key={d.label}>
            <rect x={x} y={M.t + ih - h} width={bw * 0.7} height={h} rx="3" fill={PALETTE[1]}>
              <title>{`${d.label}: ${d.value.toLocaleString()}`}</title>
            </rect>
            <text transform={`translate(${x + bw * 0.35}, ${H - M.b + 12}) rotate(-35)`} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.7">
              {trunc(d.label, 14)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function LineChart({ data }) {
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const iw = W - M.l - M.r
  const ih = H - M.t - M.b
  const pts = data.map((d, i) => [M.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw), M.t + ih - (Math.max(d.value, 0) / max) * ih, d])
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const step = Math.ceil(data.length / 8)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-ink" role="img">
      <Axes max={max} />
      <path d={`${path} L${pts[pts.length - 1][0]},${M.t + ih} L${pts[0][0]},${M.t + ih} Z`} fill={PALETTE[0]} opacity="0.12" />
      <path d={path} fill="none" stroke={PALETTE[0]} strokeWidth="2.2" strokeLinejoin="round" />
      {pts.map(([x, y, d], i) => (
        <g key={d.label}>
          <circle cx={x} cy={y} r="3.4" fill="var(--ont-card, #fff)" stroke={PALETTE[0]} strokeWidth="2">
            <title>{`${d.label}: ${d.value.toLocaleString()}`}</title>
          </circle>
          {i % step === 0 && (
            <text transform={`translate(${x}, ${H - M.b + 14}) rotate(-35)`} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.7">{d.label}</text>
          )}
        </g>
      ))}
    </svg>
  )
}

export function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + Math.max(d.value, 0), 0) || 1
  const R = 80
  const r = 50
  let a0 = -Math.PI / 2
  const arcs = data.map((d, i) => {
    const frac = Math.max(d.value, 0) / total
    const a1 = a0 + frac * Math.PI * 2 - (frac >= 0.999 ? 0.0001 : 0)
    const large = a1 - a0 > Math.PI ? 1 : 0
    const p = (rad, a) => [100 + rad * Math.cos(a), 100 + rad * Math.sin(a)]
    const [x0, y0] = p(R, a0)
    const [x1, y1] = p(R, a1)
    const [x2, y2] = p(r, a1)
    const [x3, y3] = p(r, a0)
    const dPath = `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`
    a0 += frac * Math.PI * 2
    return { d, dPath, color: PALETTE[i % PALETTE.length], pct: (frac * 100).toFixed(1) }
  })
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      <svg viewBox="0 0 200 200" className="h-48 w-48 shrink-0" role="img">
        {arcs.map((a) => (
          <path key={a.d.label} d={a.dPath} fill={a.color}><title>{`${a.d.label}: ${a.d.value.toLocaleString()} (${a.pct}%)`}</title></path>
        ))}
      </svg>
      <ul className="min-w-0 space-y-1.5 text-xs">
        {arcs.map((a) => (
          <li key={a.d.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: a.color }} />
            <span className="truncate text-ink">{trunc(a.d.label, 24)}</span>
            <span className="ml-auto pl-2 text-muted">{a.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Chart({ chart }) {
  if (!chart.data?.length) return <p className="p-6 text-center text-xs text-muted">No data to chart.</p>
  if (chart.type === 'line') return <LineChart data={chart.data} />
  if (chart.type === 'pie') return <DonutChart data={chart.data} />
  return <BarChart data={chart.data} />
}
