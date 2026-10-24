import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react'
import { computeDynamicLayout, computeLayout, DOMMETA, FLOWS, ORDER } from '../../lib/ontologyData'
import { useTheme } from '../../context/ThemeContext'
import { Maximize2, Minimize2, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react'

/**
 * High-performance, pixel-perfect SVG visualizer for the FMCG Finance Ontology Graph.
 * Faithfully mirrors FMCG Finance Ontology Graph.html with:
 *  - Central conformed master-data spine ring
 *  - 8 celestial radial sub-domain clusters with colored halos
 *  - Quadratic Bezier curved arrows with typed relationship labels
 *  - Smooth pointer drag-pan, mousewheel zoom-to-cursor, and camera transitions
 *  - Full Screen mode with native Fullscreen API + in-app overlay fallback
 *  - Floating node inspection overlay in full-screen mode
 *  - Native Light & Dark mode support
 */
const OntologyGraphCanvas = forwardRef(function OntologyGraphCanvas(
  {
    selectedNodeId,
    selectedNode, // backward-compat alias
    onSelectNode,
    activeDomain = 'all',
    showNeighbours = true,
    activeFlowIdx = -1,
    activeFlow = -1, // backward-compat alias
    searchQuery = '',
    className = '',
    nodes: propNodes,
    edges: propEdges,
    flows: propFlows,
    domainMeta: propDomainMeta,
  },
  ref
) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const selId = selectedNodeId !== undefined ? selectedNodeId : selectedNode
  const currentFlow = activeFlowIdx >= 0 ? activeFlowIdx : activeFlow

  const containerRef = useRef(null)
  const [transform, setTransform] = useState({ scale: 1, tx: 0, ty: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const panStartRef = useRef({ x: 0, y: 0, moved: false, currentTx: 0, currentTy: 0 })
  const animFrameRef = useRef(null)

  // Layout computations (dynamic when propNodes provided, otherwise canonical layout)
  const layout = useMemo(() => {
    if (propNodes && propNodes.length > 0) {
      return computeDynamicLayout(propNodes, propEdges || [], activeDomain, propDomainMeta)
    }
    return computeLayout()
  }, [propNodes, propEdges, activeDomain, propDomainMeta])
  const { W, H, CX, CY, nodes, byId, edges, domMetas, spineMeta, adj } = layout

  // Visible set of nodes based on active domain
  const visibleSet = useMemo(() => {
    if (activeDomain === 'all' || !activeDomain) return null
    const s = new Set()
    nodes.forEach((n) => {
      const gKey = String(n.group_key || n.d || '').toLowerCase()
      const isClientNode = n.role === 'client' || n.origin === 'user' || gKey.startsWith('client') || n.origin === 'custom'
      if (gKey === activeDomain || gKey === 'spine' || n.d === activeDomain || n.d === 'spine' || isClientNode) {
        s.add(n.id)
      }
    })
    // If filter didn't match any node in this graph, don't dim everything — keep all nodes visible!
    if (s.size === 0) return null
    return s
  }, [activeDomain, nodes])

  // Cross-domain neighbours set
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

  // Active flow node IDs
  const flowNodeIds = useMemo(() => {
    const list = propFlows || FLOWS
    if (currentFlow < 0 || !list[currentFlow]) return null
    return new Set(list[currentFlow].ids || list[currentFlow].steps || [])
  }, [currentFlow, propFlows])

  // Search matches set
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return null
    const matches = new Set()
    nodes.forEach((n) => {
      const hit =
        n.n.toLowerCase().includes(q) ||
        (n.a && n.a.some((attr) => attr.toLowerCase().includes(q))) ||
        (n.def && n.def.toLowerCase().includes(q))
      if (hit) matches.add(n.id)
    })
    return matches
  }, [searchQuery, nodes])

  // Center & Fit graph to container (frames active domain cluster if filtered)
  const fit = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const w = el.clientWidth || window.innerWidth || 950
    const h = el.clientHeight || window.innerHeight || 650

    if (activeDomain && activeDomain !== 'all' && domMetas[activeDomain]) {
      const dm = domMetas[activeDomain]
      const midX = (dm.cx * 2 + CX) / 3
      const midY = (dm.cy * 2 + CY) / 3
      const sc = Math.max(0.55, Math.min(1.15, Math.min(w / 800, h / 720)))
      const tx = w / 2 - midX * sc
      const ty = h / 2 - midY * sc
      setTransform({ scale: sc, tx, ty })
      return
    }

    const sc = Math.max(0.25, Math.min(1.6, Math.min((w - 28) / W, (h - 28) / H)))
    const tx = (w - W * sc) / 2
    const ty = 14
    setTransform({ scale: sc, tx, ty })
  }, [W, H, CX, CY, activeDomain, domMetas])

  // Zoom function centered at arbitrary point
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

  // Smooth focus on a specific node
  const focusNode = useCallback((nodeId) => {
    const n = byId[nodeId]
    const el = containerRef.current
    if (!n || !el) return

    const rect = el.getBoundingClientRect()
    const targetScale = 1.05
    const targetTx = rect.width / 2 - n.x * targetScale
    const targetTy = rect.height / 2 - n.y * targetScale

    const startTx = transform.tx
    const startTy = transform.ty
    const startScale = transform.scale
    const startTime = performance.now()
    const duration = 400

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)

    const step = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / duration)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3)

      setTransform({
        scale: startScale + (targetScale - startScale) * ease,
        tx: startTx + (targetTx - startTx) * ease,
        ty: startTy + (targetTy - startTy) * ease,
      })

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step)
      }
    }

    animFrameRef.current = requestAnimationFrame(step)
  }, [byId, transform])

  // Full Screen toggle handler (Native API with In-App Fallback)
  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    if (!document.fullscreenElement && !isFullscreen) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          setIsFullscreen(true)
        })
      } else {
        setIsFullscreen(true)
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
      setIsFullscreen(false)
    }
  }, [isFullscreen])

  // Sync with native fullscreen changes
  useEffect(() => {
    const handleFsChange = () => {
      const active = !!document.fullscreenElement
      setIsFullscreen(active)
      setTimeout(fit, 80)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [fit])

  // Re-fit graph whenever fullscreen state changes
  useEffect(() => {
    const t = setTimeout(fit, 90)
    return () => clearTimeout(t)
  }, [isFullscreen, fit])

  // ESC key handler for in-app fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {})
        }
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

  // Expose methods via ref for parent components
  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomAt(1.25),
    zoomOut: () => zoomAt(0.8),
    fit,
    resetLayout: fit,
    focusNode,
    toggleFullscreen,
    isFullscreen: () => isFullscreen,
  }), [zoomAt, fit, focusNode, toggleFullscreen, isFullscreen])

  // Initial fit and window resize listener
  useEffect(() => {
    fit()
    window.addEventListener('resize', fit)
    return () => {
      window.removeEventListener('resize', fit)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [fit])

  // Pan handlers with mouse / pointer
  const onPointerDown = (e) => {
    if (e.button !== 0) return // Left click only
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
    onSelectNode?.(selId === nodeId ? null : nodeId)
  }

  // Canvas background click (deselect)
  const handleCanvasClick = () => {
    if (panStartRef.current.moved) {
      panStartRef.current.moved = false
      return
    }
    if (selId) onSelectNode?.(null)
  }

  // Colors tuned exactly to FMCG Finance Ontology Graph.html
  const themeColors = {
    bg: isDark ? '#101828' : '#F4F7FC',
    card: isDark ? '#182338' : '#FFFFFF',
    text: isDark ? '#AAB6CC' : '#122991',
    muted: isDark ? '#7E8CA6' : '#4A5878',
    border: isDark ? '#2A3548' : '#D8DFEA',
    accent: isDark ? '#6C8FEF' : '#5A8AC3',
    edge: isDark ? '#4A5C7E' : '#8CA0C0',
  }

  // Selected node details for full-screen inspection overlay
  const selectedNodeData = selId ? byId[selId] : null
  const selectedNodeRels = useMemo(() => {
    if (!selId) return []
    const rels = []
    edges.forEach((e) => {
      if (e.srcId === selId) {
        rels.push({
          otherId: e.tgtId,
          otherName: byId[e.tgtId]?.n || e.tgtId,
          label: e.label,
          dir: 'out',
        })
      } else if (e.tgtId === selId) {
        rels.push({
          otherId: e.srcId,
          otherName: byId[e.srcId]?.n || e.srcId,
          label: e.label,
          dir: 'in',
        })
      }
    })
    return rels
  }, [selId, edges, byId])

  return (
    <div
      ref={containerRef}
      className={`select-none transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] h-screen w-screen overflow-hidden rounded-none border-0 shadow-none'
          : 'relative h-[74vh] min-h-[500px] w-full overflow-hidden rounded-2xl border border-line shadow-card'
      } ${isPanning ? 'cursor-grabbing' : 'cursor-grab'} ${className}`}
      style={{ backgroundColor: themeColors.bg }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
      onClick={handleCanvasClick}
    >
      {/* Floating Canvas Controls (Zoom In, Zoom Out, Reset Fit, Full Screen) */}
      <div className="absolute right-3.5 top-3.5 z-20 flex items-center gap-1.5 rounded-xl border border-line bg-surface/90 p-1 backdrop-blur shadow-md">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            zoomAt(1.25)
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink hover:bg-surface2 hover:text-brand transition cursor-pointer"
          title="Zoom in (＋)"
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            zoomAt(0.8)
          }}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink hover:bg-surface2 hover:text-brand transition cursor-pointer"
          title="Zoom out (−)"
        >
          <ZoomOut size={14} />
        </button>
        <div className="h-4 w-px bg-line" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            fit()
          }}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink hover:bg-surface2 hover:text-brand transition cursor-pointer"
          title="Reset View"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
        <div className="h-4 w-px bg-line" />
        {/* Full Screen Toggle Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleFullscreen()
          }}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
            isFullscreen
              ? 'bg-brand text-white shadow-sm'
              : 'text-ink hover:bg-surface2 hover:text-brand'
          }`}
          title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen'}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          <span>{isFullscreen ? 'Exit' : 'Full Screen'}</span>
        </button>
      </div>

      {/* In Fullscreen Mode: Floating Overlay Header Banner */}
      {isFullscreen && (
        <div className="absolute left-4 top-4 z-20 flex items-center gap-2.5 rounded-xl border border-line bg-surface/90 px-3.5 py-1.5 backdrop-blur shadow-md pointer-events-auto">
          <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
          <span className="font-bold text-xs text-ink tracking-tight">FMCG Finance Ontology Graph</span>
          <span className="text-[11px] text-muted hidden sm:inline">— Press Esc or click Exit to return</span>
        </div>
      )}

      {/* In Fullscreen Mode: Floating Details Panel when a node is selected */}
      {isFullscreen && selectedNodeData && (
        <aside
          className="absolute right-4 top-16 w-[380px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-5.5rem)] h-fit z-30 flex flex-col rounded-2xl border border-line bg-surface/95 p-5 backdrop-blur-md shadow-2xl overflow-y-auto scroll-thin animate-in fade-in slide-in-from-right-4 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-ink leading-tight break-words">
                {selectedNodeData.n}
              </h2>
              <div
                className="mt-1.5 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider"
                style={{
                  backgroundColor: `${DOMMETA[selectedNodeData.d]?.c}18`,
                  color: DOMMETA[selectedNodeData.d]?.c,
                  border: `1px solid ${DOMMETA[selectedNodeData.d]?.c}35`,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: DOMMETA[selectedNodeData.d]?.c }}
                />
                <span className="truncate">{DOMMETA[selectedNodeData.d]?.n}</span>
              </div>
            </div>
            <button
              onClick={() => onSelectNode?.(null)}
              className="text-muted hover:text-ink p-1.5 rounded-lg hover:bg-surface2 transition shrink-0 cursor-pointer"
              title="Close card"
            >
              <X size={16} />
            </button>
          </div>

          <div className="text-xs leading-relaxed text-ink bg-surface2/50 border border-line rounded-xl p-3 my-2">
            {selectedNodeData.def}
          </div>

          {selectedNodeData.a && selectedNodeData.a.length > 0 && (
            <div className="mt-2.5">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5 flex justify-between items-center">
                <span>Governed Attributes</span>
                <span className="font-mono text-[9.5px] text-brand">{selectedNodeData.a.length}</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {selectedNodeData.a.map((attr, i) => (
                  <span
                    key={i}
                    className="font-mono text-[10.5px] bg-surface2 border border-line rounded-md px-2 py-0.5 text-ink"
                  >
                    {attr}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedNodeRels.length > 0 && (
            <div className="mt-3.5 pt-3 border-t border-line">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">
                Semantic Relationships ({selectedNodeRels.length})
              </h3>
              <ul className="space-y-1.5 text-xs text-muted max-h-56 overflow-y-auto scroll-thin pr-1">
                {selectedNodeRels.map((rel, i) => (
                  <li
                    key={i}
                    className="rounded-xl p-2 bg-surface2/50 border border-line flex flex-wrap items-center gap-1.5 text-[11.5px] leading-relaxed"
                  >
                    {rel.dir === 'out' ? (
                      <>
                        <b className="text-ink font-semibold">{selectedNodeData.n}</b>
                        <span className="text-[10px] font-semibold text-brand bg-brand/10 px-1.5 py-0.5 rounded border border-brand/20">
                          {rel.label}
                        </span>
                        <span className="text-muted">──▶</span>
                        <button
                          onClick={() => {
                            onSelectNode?.(rel.otherId)
                            focusNode(rel.otherId)
                          }}
                          className="text-brand hover:underline font-semibold cursor-pointer"
                        >
                          {rel.otherName}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            onSelectNode?.(rel.otherId)
                            focusNode(rel.otherId)
                          }}
                          className="text-brand hover:underline font-semibold cursor-pointer"
                        >
                          {rel.otherName}
                        </button>
                        <span className="text-[10px] font-semibold text-brand bg-brand/10 px-1.5 py-0.5 rounded border border-brand/20">
                          {rel.label}
                        </span>
                        <span className="text-muted">──▶</span>
                        <b className="text-ink font-semibold">{selectedNodeData.n}</b>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedNodeData.ev && (
            <div className="mt-3.5 pt-3 border-t border-line">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted mb-1.5">
                Corpus Evidence
              </h3>
              <p className="text-[11px] italic text-muted leading-relaxed bg-surface2/40 p-2.5 rounded-xl border border-line">
                “{selectedNodeData.ev}”
              </p>
            </div>
          )}
        </aside>
      )}

      {/* SVG Canvas Inner Viewport with Hardware-Accelerated Transform */}
      <div
        className="origin-top-left will-change-transform"
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
              id="ont-arr"
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

          {/* Central Master-Data Spine Halo & Label */}
          {(!propNodes || spineMeta?.hasNodes) && (
            <>
              <circle
                cx={CX}
                cy={CY}
                r={spineMeta.r || 255}
                fill={spineMeta.c}
                opacity={isDark ? '0.08' : '0.06'}
                className="transition-opacity pointer-events-none"
              />
              <text
                x={CX}
                y={CY + 8}
                textAnchor="middle"
                fill={spineMeta.c}
                opacity="0.6"
                className="select-none pointer-events-none font-bold"
                style={{
                  fontFamily: "'Barlow', 'Inter', sans-serif",
                  fontSize: '15px',
                  letterSpacing: '-0.02em',
                }}
              >
                Finance master-data spine
              </text>
            </>
          )}

          {/* Satellite Sub-Domain Halos & Labels */}
          {Object.entries(domMetas).map(([d, m]) => {
            if (!m) return null
            const isTargetDomain = activeDomain === d
            return (
              <g key={`halo-${d}`} className="pointer-events-none transition-opacity">
                <circle
                  cx={m.cx}
                  cy={m.cy}
                  r={m.r + 72}
                  fill={m.c}
                  opacity={isTargetDomain ? (isDark ? '0.15' : '0.11') : (isDark ? '0.065' : '0.055')}
                />
                <text
                  x={m.cx}
                  y={m.cy + m.r + 100}
                  textAnchor="middle"
                  fill={m.c}
                  opacity={isTargetDomain ? '1' : '0.85'}
                  className="select-none font-bold"
                  style={{
                    fontFamily: "'Barlow', 'Inter', sans-serif",
                    fontSize: '15px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {m.n}
                </text>
              </g>
            )
          })}

          {/* Edges Layer (Curved Quadratic Bezier Arrows) */}
          <g className="edges-layer">
            {edges.map((e) => {
              const aOk = !visibleSet || visibleSet.has(e.srcId) || neighbourSet.has(e.srcId)
              const bOk = !visibleSet || visibleSet.has(e.tgtId) || neighbourSet.has(e.tgtId)
              const isShown = aOk && bOk

              let isDim = false
              if (visibleSet) {
                const strong = visibleSet.has(e.srcId) || visibleSet.has(e.tgtId)
                if (!isShown || !strong) isDim = true
              }

              let isFlowHighlighted = false
              if (flowNodeIds) {
                if (flowNodeIds.has(e.srcId) && flowNodeIds.has(e.tgtId)) {
                  isFlowHighlighted = true
                } else {
                  isDim = true
                }
              }

              const isTouchesSelected = selId && (e.srcId === selId || e.tgtId === selId)
              const isHighlighted = isFlowHighlighted || (isTouchesSelected && !isDim)

              const edgeColor = isHighlighted ? themeColors.accent : themeColors.edge

              return (
                <g key={e.id}>
                  <path
                    d={e.d}
                    markerEnd="url(#ont-arr)"
                    style={{
                      color: edgeColor,
                      stroke: edgeColor,
                      strokeWidth: isHighlighted ? 2.4 : 1.15,
                      opacity: isDim ? 0.05 : isHighlighted ? 1 : 0.5,
                      fill: 'none',
                      strokeDasharray: isFlowHighlighted ? '6 4' : undefined,
                      transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s',
                    }}
                  />
                  {/* Label shown on curve arch when touched by selection or active in flow */}
                  {(isTouchesSelected || isFlowHighlighted) && !isDim && (
                    <text
                      x={e.mx}
                      y={e.my - 4}
                      textAnchor="middle"
                      className="select-none pointer-events-none font-medium text-[10px]"
                      style={{
                        fill: themeColors.accent,
                        paintOrder: 'stroke',
                        stroke: themeColors.card,
                        strokeWidth: '3.5px',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {e.label}
                    </text>
                  )}
                </g>
              )
            })}
          </g>

          {/* Nodes Layer */}
          <g className="nodes-layer">
            {nodes.map((n) => {
              const meta = domMetas[n.d] || DOMMETA[n.d] || DOMMETA.spine
              const nodeColor = n.color || meta?.c || '#3B82F6'
              const isSelected = selId === n.id
              const isFound = searchMatches?.has(n.id)

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
                    stroke={isSelected ? themeColors.accent : nodeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isFound ? '5 3' : undefined}
                    style={{
                      fill: themeColors.card,
                      filter: isSelected
                        ? `drop-shadow(0 0 10px ${nodeColor}88)`
                        : isDark
                          ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))'
                          : 'drop-shadow(0 1px 1.5px rgba(0,0,0,0.12))',
                      transition: 'stroke 0.2s, stroke-width 0.2s',
                    }}
                  />
                  {/* Colored indicator dot */}
                  <circle
                    cx={n.x - n.w / 2 + 11}
                    cy={n.y - n.h / 2 + 10}
                    r={3.4}
                    fill={nodeColor}
                  />
                  {/* Label (1 or 2 lines) */}
                  {n.l2 ? (
                    <>
                      <text
                        x={n.x}
                        y={n.y - 3}
                        textAnchor="middle"
                        className="pointer-events-none select-none text-[12px] font-semibold"
                        style={{
                          fill: themeColors.text,
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
                      >
                        {n.l1}
                      </text>
                      <text
                        x={n.x}
                        y={n.y + 11}
                        textAnchor="middle"
                        className="pointer-events-none select-none text-[12px] font-semibold"
                        style={{
                          fill: themeColors.text,
                          fontFamily: "'Inter', system-ui, sans-serif",
                        }}
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
                      style={{
                        fill: themeColors.text,
                        fontFamily: "'Inter', system-ui, sans-serif",
                      }}
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
