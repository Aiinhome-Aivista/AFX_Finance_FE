import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Maximize2, RotateCcw } from 'lucide-react'
import OntologyNode from './OntologyNode'
import { computeLayout, DOMMETA, EDGES, FLOWS, ORDER } from '../../lib/ontologyData'
import { useTheme } from '../../context/ThemeContext'

const nodeTypes = {
  ontologyNode: OntologyNode,
}

function InnerCanvas({
  selectedNodeId,
  onSelectNode,
  activeDomain = 'all',
  showNeighbours = true,
  activeFlowIdx = -1,
  searchQuery = '',
  imperativeRef,
}) {
  const { theme } = useTheme()
  const rf = useReactFlow()
  const [nodeOverrides, setNodeOverrides] = useState({})
  const layout = useMemo(() => computeLayout(), [])
  const { nodes, byId, edges: layoutEdges, adj, CX, CY, domMetas, spineMeta } = layout

  // Visible set of nodes based on active domain
  const visibleSet = useMemo(() => {
    if (activeDomain === 'all') return null
    const s = new Set()
    nodes.forEach((n) => {
      if (n.d === activeDomain || n.d === 'spine') s.add(n.id)
    })
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
    if (activeFlowIdx < 0 || !FLOWS[activeFlowIdx]) return null
    return new Set(FLOWS[activeFlowIdx].ids)
  }, [activeFlowIdx])

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

  // Initial fit view & domain change camera pan
  useEffect(() => {
    const t = setTimeout(() => {
      rf.fitView({ padding: 0.15, duration: 400 })
    }, 80)
    return () => clearTimeout(t)
  }, [activeDomain, rf])

  // Reset all dragged positions
  const resetLayout = useCallback(() => {
    setNodeOverrides({})
    rf.fitView({ padding: 0.15, duration: 400 })
  }, [rf])

  // Expose imperative methods to parent
  useImperativeHandle(imperativeRef, () => ({
    zoomIn: () => rf.zoomIn({ duration: 300 }),
    zoomOut: () => rf.zoomOut({ duration: 300 }),
    fit: () => rf.fitView({ padding: 0.15, duration: 400 }),
    resetLayout,
    focusNode: (nodeId) => {
      const n = byId[nodeId]
      if (n) {
        rf.setCenter(n.x, n.y, { zoom: 1.2, duration: 500 })
      }
    },
  }))

  // Transform nodes for React Flow
  const rfNodes = useMemo(() => {
    return nodes.map((n) => {
      const isSelected = n.id === selectedNodeId
      const isFound = !!searchMatches?.has(n.id)
      const isFlowStep = !!flowNodeIds?.has(n.id)

      let isDim = false
      let isNeighbour = false

      if (visibleSet) {
        if (visibleSet.has(n.id)) {
          // visible
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

      const defaultPos = { x: n.x - 105, y: n.y - 34 }
      const pos = nodeOverrides[n.id] || defaultPos

      return {
        id: n.id,
        type: 'ontologyNode',
        position: pos,
        data: {
          node: n,
          domainMeta: DOMMETA[n.d],
          dim: isDim,
          isNeighbour,
          isFound,
          isFlowStep,
          selected: isSelected,
        },
      }
    })
  }, [nodes, selectedNodeId, searchMatches, flowNodeIds, visibleSet, neighbourSet, nodeOverrides])

  // Colors for edges
  const colors = theme === 'dark'
    ? { edge: '#475569', hi: '#818CF8', sel: '#FBBF24', flow: '#38BDF8' }
    : { edge: '#94A3B8', hi: '#4F46E5', sel: '#D97706', flow: '#0284C7' }

  // Transform edges for React Flow
  const rfEdges = useMemo(() => {
    return EDGES.map(([src, tgt, label], idx) => {
      const edgeId = `e-${src}-${tgt}-${idx}`
      const touchesSelected = selectedNodeId && (src === selectedNodeId || tgt === selectedNodeId)
      const inFlow = flowNodeIds && flowNodeIds.has(src) && flowNodeIds.has(tgt)

      const aVisible = !visibleSet || visibleSet.has(src) || neighbourSet.has(src)
      const bVisible = !visibleSet || visibleSet.has(tgt) || neighbourSet.has(tgt)
      const isEdgeVisible = aVisible && bVisible

      let isDim = false
      if (visibleSet) {
        const strong = visibleSet.has(src) || visibleSet.has(tgt)
        if (!isEdgeVisible || !strong) isDim = true
      }
      if (flowNodeIds && !inFlow) {
        isDim = true
      }

      const isHighlighted = inFlow || touchesSelected
      const stroke = inFlow
        ? colors.flow
        : touchesSelected
          ? colors.sel
          : colors.edge

      return {
        id: edgeId,
        source: src,
        target: tgt,
        label: (touchesSelected || inFlow) ? label : undefined,
        type: 'smoothstep',
        animated: !!inFlow,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: stroke,
          width: 14,
          height: 14,
        },
        style: {
          stroke,
          strokeWidth: isHighlighted ? 2.5 : 1.2,
          opacity: isDim ? 0.08 : isHighlighted ? 1 : 0.45,
          transition: 'all 0.2s',
        },
        labelStyle: {
          fontSize: 10,
          fontWeight: 600,
          fill: isHighlighted ? stroke : colors.edge,
        },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 6,
        labelBgStyle: {
          fill: theme === 'dark' ? '#0F172A' : '#FFFFFF',
          fillOpacity: 0.95,
          stroke: isHighlighted ? stroke : (theme === 'dark' ? '#334155' : '#E2E8F0'),
          strokeWidth: 1,
        },
      }
    })
  }, [visibleSet, neighbourSet, flowNodeIds, selectedNodeId, colors, theme])

  // Drag node override
  const onNodeDragStop = useCallback((_, node) => {
    setNodeOverrides((prev) => ({
      ...prev,
      [node.id]: node.position,
    }))
  }, [])

  return (
    <div className="relative h-[74vh] min-h-[550px] w-full overflow-hidden rounded-2xl border border-line shadow-card bg-[#FFFFFF]">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        colorMode={theme}
        onNodeClick={(_, node) => onSelectNode(selectedNodeId === node.id ? null : node.id)}
        onPaneClick={() => onSelectNode(null)}
        onNodeDragStop={onNodeDragStop}
        nodesConnectable={false}
        elementsSelectable
        minZoom={0.12}
        maxZoom={2.8}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background
          gap={26}
          size={1.5}
          color={theme === 'dark' ? '#1E293B' : '#E2E8F0'}
        />

        <Controls
          showInteractive={false}
          position="bottom-left"
          className="shadow-lg border border-line rounded-xl overflow-hidden"
        />

        {/* <MiniMap
          pannable
          zoomable
          className="!hidden md:!block rounded-xl border border-line shadow-card overflow-hidden"
          nodeColor={(n) => n.data?.domainMeta?.c || '#6366F1'}
          maskColor={theme === 'dark' ? 'rgba(15,23,42,0.7)' : 'rgba(248,250,252,0.75)'}
        /> */}

        {/* Top-Right Canvas Action Controls */}
        <Panel position="top-right" className="flex items-center gap-2 m-3">
          <button
            onClick={() => rf.fitView({ padding: 0.15, duration: 400 })}
            className="btn-ghost btn-sm shadow-card flex items-center gap-1.5 text-xs bg-surface/90 backdrop-blur"
            title="Fit graph to view"
          >
            <Maximize2 size={13} />
            <span>Fit</span>
          </button>
          <button
            onClick={resetLayout}
            className="btn-ghost btn-sm shadow-card flex items-center gap-1.5 text-xs bg-surface/90 backdrop-blur"
            title="Reset dragged nodes & zoom"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        </Panel>
      </ReactFlow>
    </div>
  )
}

const ReactFlowOntologyCanvas = forwardRef(function ReactFlowOntologyCanvas(props, ref) {
  return (
    <ReactFlowProvider>
      <InnerCanvas {...props} imperativeRef={ref} />
    </ReactFlowProvider>
  )
})

export default ReactFlowOntologyCanvas
