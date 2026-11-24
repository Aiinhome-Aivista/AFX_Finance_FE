import React, { useState, useRef } from 'react'

export const fmt = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return String(v)
  const a = Math.abs(n)
  if (a >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (a >= 1e4) return `$${(n / 1e3).toFixed(0)}K`
  if (a >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

const niceMax = (max) => {
  if (max <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(max))
  const f = max / p
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p
}

const PALETTE = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#6366f1']

// High-fidelity Floating Tooltip matching Screenshot 5
function ChartTooltip({ tooltip }) {
  if (!tooltip) return null

  return (
    <div
      style={{
        left: `${tooltip.x}px`,
        top: `${tooltip.y - 12}px`,
      }}
      className="absolute z-50 -translate-x-1/2 -translate-y-full pointer-events-none min-w-[170px] rounded-xl border border-line/80 bg-surface/98 p-3 shadow-2xl backdrop-blur-md transition-all duration-150 animate-in fade-in zoom-in-95"
    >
      <p className="font-bold text-xs text-ink mb-1.5 border-b border-line/40 pb-1">{tooltip.title}</p>
      <div className="space-y-1 text-xs">
        {tooltip.items.map((it, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <span className="font-semibold flex items-center gap-1.5" style={{ color: it.color || 'var(--ink)' }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: it.color || 'var(--ink)' }} />
              {it.label}:
            </span>
            <span className="font-bold text-ink">{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Axes({ max, ticks = 4, suffix = '', width = 560, height = 260, margin }) {
  const M = margin || { t: 25, r: 20, b: 42, l: 56 }
  return Array.from({ length: ticks + 1 }, (_, i) => {
    const v = (max / ticks) * i
    const y = M.t + (height - M.t - M.b) * (1 - i / ticks)
    return (
      <g key={i}>
        <line x1={M.l} x2={width - M.r} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
        <text x={M.l - 8} y={y + 3.5} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.55">
          {fmt(v)}
          {suffix}
        </text>
      </g>
    )
  })
}

// 1. Combo Chart (Bar + Multi-line Dual Axis, edge-to-edge alignment)
export function ComboChart({ data, isLarge, onHover, onLeave }) {
  const W = isLarge ? 960 : 560
  const H = isLarge ? 320 : 260
  const M = isLarge ? { t: 26, r: 24, b: 44, l: 64 } : { t: 25, r: 18, b: 42, l: 56 }

  const max = niceMax(Math.max(...data.map((d) => Math.max(d.barValue || 0, d.lineValue || 0)), 0))
  const bw = (W - M.l - M.r) / data.length
  const ih = H - M.t - M.b

  const linePts = data.map((d, i) => [
    M.l + i * bw + bw * 0.5,
    M.t + ih - ((d.lineValue || 0) / max) * ih,
    d,
  ])
  const linePath = linePts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full text-ink select-none overflow-visible" preserveAspectRatio="none">
      <Axes max={max} width={W} height={H} margin={M} />
      {/* Bars spanning across full width */}
      {data.map((d, i) => {
        const val = Math.max(d.barValue || 0, 0)
        const h = Math.max((val / max) * ih, 2)
        const width = bw * (isLarge ? 0.46 : 0.54)
        const x = M.l + i * bw + (bw - width) / 2
        const color = d.color || '#0ea5e9'

        return (
          <g
            key={d.label}
            className="cursor-pointer group"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const parentRect = e.currentTarget.closest('.chart-container').getBoundingClientRect()
              onHover({
                x: rect.left + rect.width / 2 - parentRect.left,
                y: rect.top - parentRect.top,
                title: d.label,
                items: [
                  { label: 'Sale Value', value: fmt(d.barValue), color: '#0ea5e9' },
                  { label: 'Plan / Target', value: fmt(d.lineValue), color: '#f59e0b' },
                  { label: 'Variance', value: d.variance, color: '#10b981' },
                ],
              })
            }}
            onMouseLeave={onLeave}
          >
            <rect
              x={x}
              y={M.t + ih - h}
              width={width}
              height={h}
              rx="4"
              fill={color}
              className="transition-all duration-150 hover:brightness-110"
            />
            {/* Top Bar Callout */}
            <text x={x + width / 2} y={M.t + ih - h - 6} textAnchor="middle" fontSize={isLarge ? '11' : '9.5'} fontWeight="bold" fill={color}>
              {fmt(d.barValue)}
            </text>
            <text
              transform={`translate(${x + width / 2}, ${H - M.b + 16}) ${isLarge ? '' : 'rotate(-12)'}`}
              textAnchor={isLarge ? 'middle' : 'end'}
              fontSize={isLarge ? '11.5' : '10'}
              fontWeight="500"
              fill="currentColor"
              opacity="0.8"
            >
              {d.label}
            </text>
          </g>
        )
      })}

      {/* Target Plan Line (Orange) */}
      <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth={isLarge ? '3.2' : '2.5'} strokeLinejoin="round" />
      {linePts.map(([x, y, d]) => (
        <circle
          key={`pt-${d.label}`}
          cx={x}
          cy={y}
          r={isLarge ? '5.5' : '4.5'}
          fill="#f59e0b"
          stroke="#ffffff"
          strokeWidth="2.2"
          className="cursor-pointer hover:r-7 transition-all"
        />
      ))}
    </svg>
  )
}

// 2. Rich Pie / Donut with radial pointer callouts (properly centered & aligned)
export function PieChartWithCallouts({ data, onHover, onLeave }) {
  const total = data.reduce((s, d) => s + Math.max(d.value, 0), 0) || 1
  const W = 500
  const H = 220
  const R = 76
  const r = 40
  const cx = W / 2
  const cy = 105
  let a0 = -Math.PI / 2

  const arcs = data.map((d, i) => {
    const frac = Math.max(d.value, 0) / total
    const a1 = a0 + frac * Math.PI * 2 - (frac >= 0.999 ? 0.0001 : 0)
    const midAngle = (a0 + a1) / 2
    const large = a1 - a0 > Math.PI ? 1 : 0
    const p = (rad, a) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]
    const [x0, y0] = p(R, a0)
    const [x1, y1] = p(R, a1)
    const [x2, y2] = p(r, a1)
    const [x3, y3] = p(r, a0)
    const dPath = `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`

    // Pointer lines
    const [px1, py1] = p(R + 4, midAngle)
    const [px2, py2] = p(R + 24, midAngle)
    const isRight = Math.cos(midAngle) >= 0
    const px3 = px2 + (isRight ? 32 : -32)
    const py3 = py2

    a0 += frac * Math.PI * 2
    const color = d.color || PALETTE[i % PALETTE.length]
    const pct = (frac * 100).toFixed(1)

    return { d, dPath, color, pct, midAngle, px1, py1, px2, py2, px3, py3, isRight }
  })

  return (
    <div className="flex flex-col items-center justify-between w-full h-full py-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full text-ink select-none" preserveAspectRatio="xMidYMid meet">
        {arcs.map((a) => (
          <g
            key={a.d.label}
            className="cursor-pointer group"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const parentRect = e.currentTarget.closest('.chart-container').getBoundingClientRect()
              onHover({
                x: rect.left + rect.width / 2 - parentRect.left,
                y: rect.top - parentRect.top,
                title: a.d.label,
                items: [
                  { label: 'Customer Accounts', value: `${a.d.value} (${a.pct}%)`, color: a.color },
                  { label: 'Total Exposure', value: a.d.exposure, color: '#f59e0b' },
                  { label: 'Status', value: a.d.desc, color: '#10b981' },
                ],
              })
            }}
            onMouseLeave={onLeave}
          >
            <path d={a.dPath} fill={a.color} className="transition-all duration-150 hover:brightness-110" />
            {/* Pointer line */}
            <polyline
              points={`${a.px1},${a.py1} ${a.px2},${a.py2} ${a.px3},${a.py3}`}
              fill="none"
              stroke={a.color}
              strokeWidth="1.3"
              opacity="0.85"
            />
            {/* Label at pointer end */}
            <text
              x={a.px3 + (a.isRight ? 4 : -4)}
              y={a.py3 + 3.5}
              textAnchor={a.isRight ? 'start' : 'end'}
              fontSize="10"
              fontWeight="bold"
              fill={a.color}
            >
              {a.d.label}: {a.pct}%
            </text>
          </g>
        ))}
        {/* Donut Center */}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.6">
          PORTFOLIO
        </text>
        <text x={cx} y={cy + 15} textAnchor="middle" fontSize="15" fontWeight="bold" fill="currentColor">
          {total}
        </text>
      </svg>
      {/* Legend below */}
      <div className="flex flex-wrap items-center justify-center gap-5 text-xs pt-1 border-t border-line/30 w-full">
        {arcs.map((a) => (
          <span key={a.d.label} className="inline-flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
            <span className="text-ink">{a.d.label}</span>
            <span className="text-muted">({a.pct}%)</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// 3. Horizontal Bar Chart (starts from left margin, spans edge-to-edge)
export function HorizontalBarChart({ data, onHover, onLeave }) {
  const W = 560
  const H = 260
  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const leftMargin = 125
  const rightMargin = 18
  const plotWidth = W - leftMargin - rightMargin
  const rowHeight = (H - 24 - 28) / data.length

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full text-ink select-none" preserveAspectRatio="none">
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
        const x = leftMargin + pct * plotWidth
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={20} y2={H - 24} stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
            <text x={x} y={H - 10} textAnchor="middle" fontSize="9.5" fill="currentColor" opacity="0.5">
              {fmt(max * pct)}
            </text>
          </g>
        )
      })}

      {data.map((d, i) => {
        const y = 20 + i * rowHeight + rowHeight * 0.16
        const barH = rowHeight * 0.65
        const barW = Math.max(((d.value || 0) / max) * plotWidth, 4)
        const color = d.color || PALETTE[i % PALETTE.length]

        return (
          <g
            key={d.label}
            className="cursor-pointer group"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect()
              const parentRect = e.currentTarget.closest('.chart-container').getBoundingClientRect()
              onHover({
                x: rect.left + rect.width / 2 - parentRect.left,
                y: rect.top - parentRect.top,
                title: d.label,
                items: [
                  { label: 'Value / Delay', value: d.display || fmt(d.value), color },
                  { label: 'Status', value: d.status || 'Active', color: '#10b981' },
                  { label: 'Volume', value: d.orders || 'Normal', color: '#0ea5e9' },
                ],
              })
            }}
            onMouseLeave={onLeave}
          >
            {/* Left Category Label aligned to right of text margin */}
            <text x={leftMargin - 12} y={y + barH * 0.72} textAnchor="end" fontSize="10.5" fontWeight="500" fill="currentColor" opacity="0.85">
              {d.label}
            </text>
            {/* Horizontal Bar */}
            <rect
              x={leftMargin}
              y={y}
              width={barW}
              height={barH}
              rx="4"
              fill={color}
              className="transition-all duration-150 hover:brightness-110"
            />
            {/* Value on the right of bar */}
            <text x={leftMargin + barW + 8} y={y + barH * 0.72} fontSize="9.5" fontWeight="bold" fill={color}>
              {d.display || fmt(d.value)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// 4. Grouped Column Chart (spans 100% full width, edge-to-edge)
export function GroupedBarChart({ data, series = [], isLarge, onHover, onLeave }) {
  const W = isLarge ? 960 : 560
  const H = isLarge ? 320 : 260
  const M = isLarge ? { t: 26, r: 24, b: 52, l: 64 } : { t: 25, r: 18, b: 46, l: 56 }

  const max = niceMax(Math.max(...data.map((d) => Math.max(d.v1 || 0, d.v2 || 0, d.v3 || 0)), 0))
  const gw = (W - M.l - M.r) / data.length
  const ih = H - M.t - M.b
  const subBarW = (gw * (isLarge ? 0.68 : 0.74)) / 3

  const defaultSeries = [
    { name: 'Baseline (2024)', color: '#ef4444' },
    { name: 'Current (2025)', color: '#f59e0b' },
    { name: 'Target (2026)', color: '#8b5cf6' },
  ]
  const sList = series.length === 3 ? series : defaultSeries

  return (
    <div className="flex flex-col items-center justify-between w-full h-full">
      <svg viewBox={`0 0 ${W} ${H - 22}`} className="w-full h-full text-ink select-none overflow-visible" preserveAspectRatio="none">
        <Axes max={max} width={W} height={H} margin={M} />
        {data.map((d, i) => {
          const gx = M.l + i * gw + (gw - subBarW * 3) / 2
          const vList = [
            { val: d.v1, s: sList[0] },
            { val: d.v2, s: sList[1] },
            { val: d.v3, s: sList[2] },
          ]

          return (
            <g key={d.label}>
              {vList.map((item, j) => {
                const val = Math.max(item.val || 0, 0)
                const h = Math.max((val / max) * ih, 2)
                const x = gx + j * subBarW

                return (
                  <rect
                    key={j}
                    x={x}
                    y={M.t + ih - h}
                    width={subBarW * 0.88}
                    height={h}
                    rx="3.5"
                    fill={item.s.color}
                    className="cursor-pointer hover:brightness-110 transition-all duration-150"
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      const parentRect = e.currentTarget.closest('.chart-container').getBoundingClientRect()
                      onHover({
                        x: rect.left + rect.width / 2 - parentRect.left,
                        y: rect.top - parentRect.top,
                        title: `${d.label} (${item.s.name})`,
                        items: [
                          { label: 'Value', value: fmt(val), color: item.s.color },
                          { label: 'Category', value: d.metric || d.label, color: '#10b981' },
                        ],
                      })
                    }}
                    onMouseLeave={onLeave}
                  />
                )
              })}
              <text x={gx + (subBarW * 3) / 2} y={H - M.b + 16} textAnchor="middle" fontSize={isLarge ? '11.5' : '10'} fontWeight="500" fill="currentColor" opacity="0.85">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      {/* Grouped Legend */}
      <div className="flex items-center justify-center gap-6 text-xs pt-1.5 border-t border-line/30 w-full">
        {sList.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="text-muted">{s.name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

// 5. Line Area Chart (edge-to-edge alignment)
export function LineChart({ data, onHover, onLeave }) {
  const W = 560
  const H = 260
  const M = { t: 25, r: 20, b: 42, l: 56 }

  const max = niceMax(Math.max(...data.map((d) => d.value), 0))
  const iw = W - M.l - M.r
  const ih = H - M.t - M.b
  const pts = data.map((d, i) => [
    M.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw),
    M.t + ih - (Math.max(d.value, 0) / max) * ih,
    d,
  ])
  const path = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full text-ink select-none overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <Axes max={max} suffix="d" width={W} height={H} margin={M} />
      <path d={`${path} L${pts[pts.length - 1][0]},${M.t + ih} L${pts[0][0]},${M.t + ih} Z`} fill="url(#lineAreaGrad)" />
      <path d={path} fill="none" stroke="#10b981" strokeWidth="2.8" strokeLinejoin="round" />

      {/* Target reference dashed line at 40d spanning full width */}
      <line
        x1={M.l}
        x2={W - M.r}
        y1={M.t + ih - (40 / max) * ih}
        y2={M.t + ih - (40 / max) * ih}
        stroke="#f59e0b"
        strokeWidth="1.8"
        strokeDasharray="4 4"
        opacity="0.85"
      />
      <text x={W - M.r} y={M.t + ih - (40 / max) * ih - 4} textAnchor="end" fontSize="9" fontWeight="bold" fill="#f59e0b">
        Target: 40d
      </text>

      {pts.map(([x, y, d]) => (
        <g
          key={d.label}
          className="cursor-pointer group"
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const parentRect = e.currentTarget.closest('.chart-container').getBoundingClientRect()
            onHover({
              x: rect.left + rect.width / 2 - parentRect.left,
              y: rect.top - parentRect.top,
              title: d.label,
              items: [
                { label: 'Actual DSO', value: `${d.value} days`, color: '#10b981' },
                { label: 'Target Benchmark', value: '40 days', color: '#f59e0b' },
                { label: 'Cash Released', value: d.cash || '$438K', color: '#0ea5e9' },
                { label: 'Progress Pace', value: d.pace || '-2 days', color: '#8b5cf6' },
              ],
            })
          }}
          onMouseLeave={onLeave}
        >
          <circle cx={x} cy={y} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" className="transition-all hover:r-7" />
          <text x={x} y={y - 9} textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#10b981">
            {d.value}d
          </text>
          <text transform={`translate(${x}, ${H - M.b + 14}) rotate(-20)`} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.75">
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// Master Chart Component with Responsive Large / Compact Mode
export default function Chart({ chart }) {
  const [tooltip, setTooltip] = useState(null)
  const containerRef = useRef(null)

  if (!chart.data?.length) return <p className="p-6 text-center text-xs text-muted">No data to chart.</p>

  const isLarge = chart.size === 'full'
  const handleHover = (tip) => setTooltip(tip)
  const handleLeave = () => setTooltip(null)

  return (
    <div ref={containerRef} className="chart-container relative w-full h-full flex flex-col items-center justify-between">
      <ChartTooltip tooltip={tooltip} />

      {chart.type === 'combo' && <ComboChart data={chart.data} isLarge={isLarge} onHover={handleHover} onLeave={handleLeave} />}
      {chart.type === 'pie' && <PieChartWithCallouts data={chart.data} onHover={handleHover} onLeave={handleLeave} />}
      {chart.type === 'horizontal_bar' && <HorizontalBarChart data={chart.data} onHover={handleHover} onLeave={handleLeave} />}
      {chart.type === 'grouped_bar' && (
        <GroupedBarChart data={chart.data} series={chart.series} isLarge={isLarge} onHover={handleHover} onLeave={handleLeave} />
      )}
      {chart.type === 'line' && <LineChart data={chart.data} onHover={handleHover} onLeave={handleLeave} />}
    </div>
  )
}
