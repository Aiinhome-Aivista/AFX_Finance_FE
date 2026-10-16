import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react'
import { computeLayout, DOMMETA, FLOWS, ORDER } from '../../lib/ontologyData'

const OntologyGraphCanvas = forwardRef(function OntologyGraphCanvas(
  {
    selectedNode,
    onSelectNode,
    activeDomain = 'all',
    showNeighbours = true,
    activeFlow = -1,
    searchQuery = '',
  },
  ref
) {
  const containerRef = useRef(null)
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0, moved: false, currentTx: 0, currentTy: 0 })

  // Layout computations
  const layout = useMemo(() => computeLayout(), [])
  const { W, H, CX, CY, nodes, byId, edges, domMetas, spineMeta, adj } = layout

  // Visible set based on domain
  const visibleSet = useMemo(() => {
    if (activeDomain === 'all') return null
    const s = new Set()
    nodes.forEach((n) => {
      if (n.d === activeDomain || n.d === 'spine') s.add(n.id)
    })
    return s
  }, [activeDomain, nodes])

  // Cross-domain neighbours
  const neighbourSet = useMemo(() => {
    if (!visibleSet || !showNeighbours) return new Set()
    const nb = new Set()
    nodes.forEach((n) => {
      if (visibleSet.has(n.id)) {
        adj[n.id]?.forEach((nbrId) => {
          if (!visibleSet.has(nbrId)) nb.add(nbrId)
        })
      }
    })
    return nb
  }, [visibleSet, showNeighbours, nodes, adj])

  // Flow node ids
  const flowNodeIds = useMemo(() => {
    if (activeFlow < 0 || !FLOWS[activeFlow]) return null
    return new Set(FLOWS[activeFlow].ids)
  }, [activeFlow])

  // Search match set
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return null
    const matches = new Set()
    nodes.forEach((n) => {
      const hit =
        n.n.toLowerCase().includes(q) ||
        n.a.some((attr) => attr.toLowerCase().includes(q)) ||
        n.def.toLowerCase().includes(q)
      if (hit) matches.add(n.id)
    })
    return matches
  }, [searchQuery, nodes])

  // Center & Fit graph
  const fit = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const w = el.clientWidth || 900
    const h = el.clientHeight || 650
    const sc = Math.max(0.25, Math.min(1.6, Math.min((w - 20) / W, (h - 20) / H)))
    const tx = (w - W * sc) / 2
    const ty = 10
    setTransform({ scale: sc, tx, ty })
  }, [W, H])

  // Zoom function centered at point
  const zoomAt = useCallback((factor, cx, cy) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = cx !== undefined ? cx : rect.width / 2
    const py = cy !== undefined ? cy : rect.height / 2

    setTransform((prev) => {
      const newScale = Math.max(0.2, Math.min(3.8, prev.scale * factor))
      const newTx = px - (px - prev.tx) * (newScale / prev.scale)
      const newTy = py - (py - prev.ty) * (newScale / prev.scale)
      return { scale: newScale, tx: newTx, ty: newTy }
    })
  }, [])

  // Expose zoom controls via ref
  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomAt(1.25),
    zoomOut: () => zoomAt(0.8),
    fit,
  }))

  // Initial fit and window resize handler
  useEffect(() => {
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [fit])

  // Pan handlers
  const onPointerDown = (e) => {
    if (e.button !== 0) return // only left click
    setIsPanning(true)
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      moved: false,
      currentTx: transform.tx,
      currentTy: transform.ty,
    }
  }

  const onPointerMove = (e) => {
    if (!isPanning) return
    const dx = e.clientX - panStartRef.current.x
    const dy = e.clientY - panStartRef.current.y
    if (Math.abs(dx) + Math.abs(dy) > 3) {
      panStartRef.current.moved = true
    }
    setTransform((prev) => ({
      ...prev,
      tx: prev.tx + dx,
      ty: prev.ty + dy,
    }))
    panStartRef.current.x = e.clientX
    panStartRef.current.y = e.clientY
  }

  const onPointerUp = () => {
    setIsPanning(false)
  }

  // Wheel zoom
  const onWheel = (e) => {
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const factor = e.deltaY < 0 ? 1.12 : 0.89
    zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top)
  }

  // Node click handler
  const handleNodeClick = (e, nodeId) => {
    e.stopPropagation()
    if (panStartRef.current.moved) {
      panStartRef.current.moved = false
      return
    }
    onSelectNode?.(selectedNode === nodeId ? null : nodeId)
  }

  // Canvas background click (deselects)
  const handleCanvasClick = (e) => {
    if (panStartRef.current.moved) {
      panStartRef.current.moved = false
      return
    }
    onSelectNode?.(null)
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-[74vh] min-h-[500px] w-full overflow-hidden rounded-2xl border border-line bg-surface select-none shadow-card ${
        isPanning ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
      onClick={handleCanvasClick}
    >
      <div
        className="origin-top-left transition-transform duration-75 ease-out"
        style={{
          transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
          width: W,
          height: H,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="overflow-visible"
        >
          <defs>
            <marker
              id="arr"
              viewBox="0 0 10 10"
              refX="8.5"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
            </marker>
          </defs>

          {/* Central spine halo & label */}
          <circle
            cx={CX}
            cy={CY}
            r={spineMeta.r}
            fill={spineMeta.c}
            className="opacity-[0.06] transition-opacity"
          />
          <text
            x={CX}
            y={CY + 8}
            textAnchor="middle"
            className="domlab select-none font-bold tracking-tight"
            fill={spineMeta.c}
            opacity="0.6"
            fontSize="15"
          >
            Finance master-data spine
          </text>

          {/* 8 Circular Domain halos & labels */}
          {ORDER.map((d) => {
            const m = domMetas[d]
            if (!m) return null
            const isTargetDomain = activeDomain === d
            return (
              <g key={`halo-${d}`} className="pointer-events-none transition-opacity">
                <circle
                  cx={m.cx}
                  cy={m.cy}
                  r={m.r + 72}
                  fill={m.c}
                  opacity={isTargetDomain ? '0.12' : '0.055'}
                />
                <text
                  x={m.cx}
                  y={m.cy + m.r + 100}
                  textAnchor="middle"
                  className="domlab select-none font-bold tracking-tight"
                  fill={m.c}
                  fontSize="15"
                  opacity={isTargetDomain ? '1' : '0.85'}
                >
                  {m.n}
                </text>
              </g>
            )
          })}

          {/* Edges */}
          <g className="edges-layer">
            {edges.map((e) => {
              const aOk =
                !visibleSet ||
                visibleSet.has(e.srcId) ||
                neighbourSet.has(e.srcId)
              const bOk =
                !visibleSet ||
                visibleSet.has(e.tgtId) ||
                neighbourSet.has(e.tgtId)
              const isShown = aOk && bOk

              let isDim = false
              if (visibleSet) {
                const strong =
                  visibleSet.has(e.srcId) || visibleSet.has(e.tgtId)
                if (!isShown || !strong) isDim = true
              }

              let isHighlighted = false
              if (flowNodeIds) {
                if (flowNodeIds.has(e.srcId) && flowNodeIds.has(e.tgtId)) {
                  isHighlighted = true
                } else {
                  isDim = true
                }
              }

              const isTouchesSelected =
                selectedNode &&
                (e.srcId === selectedNode || e.tgtId === selectedNode)
              if (isTouchesSelected && !isDim) {
                isHighlighted = true
              }

              const edgeColor = isHighlighted
                ? 'var(--ont-accent, #6C8FEF)'
                : 'var(--ont-edge, #8CA0C0)'

              return (
                <g key={e.id}>
                  <path
                    d={e.d}
                    markerEnd="url(#arr)"
                    style={{
                      color: edgeColor,
                      stroke: edgeColor,
                      strokeWidth: isHighlighted ? 2.2 : 1.15,
                      opacity: isDim ? 0.05 : isHighlighted ? 1 : 0.5,
                      fill: 'none',
                      transition: 'opacity 0.2s, stroke-width 0.2s, stroke 0.2s',
                    }}
                  />
                  {/* Label on curved center when highlighted or touches selected */}
                  {(isTouchesSelected || (isHighlighted && flowNodeIds)) && (
                    <text
                      x={e.mx}
                      y={e.my - 4}
                      textAnchor="middle"
                      className="elab show select-none text-[10px] font-medium"
                      style={{
                        fill: 'var(--ont-accent, #6C8FEF)',
                        paintOrder: 'stroke',
                        stroke: 'var(--ont-card, #182338)',
                        strokeWidth: '3px',
                      }}
                    >
                      {e.label}
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          {/* Nodes */}
          <g className="nodes-layer">
            {nodes.map((n) => {
              const meta = DOMMETA[n.d] || DOMMETA.spine
              const isSelected = selectedNode === n.id
              const isFound = searchMatches?.has(n.id)

              // Visibility state
              let isDim = false
              let isNeighbour = false

              if (visibleSet) {
                if (visibleSet.has(n.id)) {
                  // regular visible
                } else if (neighbourSet.has(n.id)) {
                  isNeighbour = true
                } else {
                  isDim = true
                }
              }

              if (flowNodeIds) {
                if (!flowNodeIds.has(n.id)) {
                  if (visibleSet && !visibleSet.has(n.id) && !neighbourSet.has(n.id)) {
                    isDim = true
                  } else {
                    isNeighbour = true
                  }
                }
              }

              const opacity = isDim ? 0.1 : isNeighbour ? 0.38 : 1
              const strokeWidth = isSelected ? 3.2 : isFound ? 2.6 : 1.6

              return (
                <g
                  key={n.id}
                  className="gnode cursor-pointer transition-opacity duration-150"
                  style={{
                    opacity,
                    pointerEvents: isDim ? 'none' : 'auto',
                  }}
                  onClick={(e) => handleNodeClick(e, n.id)}
                >
                  <rect
                    x={n.x - n.w / 2}
                    y={n.y - n.h / 2}
                    width={n.w}
                    height={n.h}
                    rx={9}
                    stroke={isSelected ? 'var(--ont-accent, #6C8FEF)' : meta.c}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isFound ? '5 3' : undefined}
                    style={{
                      fill: 'var(--ont-card, #182338)',
                      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.18))',
                      transition: 'stroke 0.2s, stroke-width 0.2s',
                    }}
                  />
                  {/* Colored indicator dot */}
                  <circle
                    cx={n.x - n.w / 2 + 11}
                    cy={n.y - n.h / 2 + 10}
                    r={3.4}
                    fill={meta.c}
                  />
                  {/* Label (1 or 2 lines) */}
                  {n.l2 ? (
                    <>
                      <text
                        x={n.x}
                        y={n.y - 3}
                        textAnchor="middle"
                        className="pointer-events-none select-none text-[12px] font-semibold"
                        style={{ fill: 'var(--ont-text, #AAB6CC)' }}
                      >
                        {n.l1}
                      </text>
                      <text
                        x={n.x}
                        y={n.y + 11}
                        textAnchor="middle"
                        className="pointer-events-none select-none text-[12px] font-semibold"
                        style={{ fill: 'var(--ont-text, #AAB6CC)' }}
                      >
                        {n.l2}
                      </text>
                    </>
                  ) : (
                    <text
                      x={n.x}
                      y={n.y + 4}
                      textAnchor="middle"
                      className="pointer-events-none select-none text-[12px] font-semibold"
                      style={{ fill: 'var(--ont-text, #AAB6CC)' }}
                    >
                      {n.l1}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      </div>
    </div>
  )
})

export default OntologyGraphCanvas
