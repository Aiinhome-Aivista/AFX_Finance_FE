import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Background, Controls, MarkerType, MiniMap, Panel, ReactFlow, ReactFlowProvider, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Maximize2, RotateCcw } from 'lucide-react'
import EntityNode from './EntityNode'
import { layoutGraph } from '../../lib/layout'
import { edgeId } from '../../lib/format'
import { useTheme } from '../../context/ThemeContext'

const nodeTypes = { entity: EntityNode }

/**
 * Interactive graph. Props:
 *  nodes/edges      API-shaped graph (key, name, color, group_name, change_state, ...)
 *  selectedKey      currently selected node (its neighbours are highlighted, others dimmed)
 *  highlight        { nodeKeys:Set, edgeKeys:Set, steps:Map(key->order) } explicit focus (flow / blocks) — wins over selection
 *  found            Set of keys matched by search (ring + focus when nothing else is active)
 */
function Inner({ nodes, edges, selectedKey, onSelect, highlight, found, className = '', minimap = true }) {
  const { theme } = useTheme()
  const rf = useReactFlow()
  const [overrides, setOverrides] = useState({})
  const sig = useMemo(() => nodes.map((n) => n.key).sort().join('|') + '#' + edges.map(edgeId).sort().join('|'), [nodes, edges])
  const base = useMemo(() => layoutGraph(nodes, edges), [sig]) // eslint-disable-line react-hooks/exhaustive-deps
  const initial = useRef(true)

  useEffect(() => { setOverrides({}) }, [sig])
  useEffect(() => {
    const t = setTimeout(() => rf.fitView({ padding: 0.12, duration: initial.current ? 0 : 350 }), 60)
    initial.current = false
    return () => clearTimeout(t)
  }, [sig]) // eslint-disable-line react-hooks/exhaustive-deps

  const adj = useMemo(() => {
    const m = new Map(nodes.map((n) => [n.key, new Set()]))
    edges.forEach((e) => { m.get(e.source)?.add(e.target); m.get(e.target)?.add(e.source) })
    return m
  }, [nodes, edges])

  const focus = useMemo(() => {
    if (highlight?.nodeKeys && highlight.nodeKeys.size) return highlight.nodeKeys
    if (selectedKey && adj.has(selectedKey)) return new Set([selectedKey, ...adj.get(selectedKey)])
    if (found && found.size) return found
    return null
  }, [highlight, selectedKey, adj, found])

  const colors = theme === 'dark'
    ? { edge: '#64748b', hi: '#60a5fa', sel: '#fbbf24' }
    : { edge: '#94a3b8', hi: '#2563eb', sel: '#d97706' }

  const rfNodes = useMemo(() => nodes.map((n) => ({
    id: n.key, type: 'entity', position: overrides[n.key] || base[n.key] || { x: 0, y: 0 },
    data: { node: n, dim: !!focus && !focus.has(n.key), selected: n.key === selectedKey, found: !!found?.has(n.key),
            stepNo: highlight?.steps?.get(n.key), ghost: n.role === 'neighbour' || n.role === 'flow' },
  })), [nodes, base, overrides, focus, selectedKey, found, highlight])

  const rfEdges = useMemo(() => edges.map((e) => {
    const id = edgeId(e)
    const flowOn = highlight?.edgeKeys && highlight.edgeKeys.size
    const touchesSel = selectedKey && (e.source === selectedKey || e.target === selectedKey)
    const hi = flowOn ? highlight.edgeKeys.has(id) : !!touchesSel
    const dim = focus ? !(hi || (focus.has(e.source) && focus.has(e.target) && !flowOn)) : false
    const color = hi ? (flowOn ? colors.hi : colors.sel) : colors.edge
    const changed = e.change_state && e.change_state !== 'unchanged'
    const stroke = changed ? (e.change_state === 'added' ? '#16a34a' : '#d97706') : color
    return {
      id, source: e.source, target: e.target, label: e.label, type: 'default',
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 },
      animated: hi && !!flowOn,
      style: { stroke, strokeWidth: hi || changed ? 2.4 : 1.4, strokeDasharray: e.cross_domain ? '5 4' : undefined, opacity: dim ? 0.12 : 1 },
      labelStyle: { fontSize: 10, fontWeight: hi ? 700 : 500, opacity: dim ? 0.1 : 1 },
      labelBgPadding: [4, 2], labelBgBorderRadius: 4,
    }
  }), [edges, focus, selectedKey, highlight, colors.edge, colors.hi, colors.sel])

  const onNodeClick = useCallback((_, n) => onSelect?.(n.id), [onSelect])
  const onNodeDrag = useCallback((_, n) => setOverrides((o) => ({ ...o, [n.id]: n.position })), [])
  const reset = () => { setOverrides({}); onSelect?.(null); setTimeout(() => rf.fitView({ padding: 0.12, duration: 350 }), 30) }

  return (
    <ReactFlow
      className={className} nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes} colorMode={theme}
      onNodeClick={onNodeClick} onPaneClick={() => onSelect?.(null)} onNodeDrag={onNodeDrag}
      nodesConnectable={false} elementsSelectable minZoom={0.08} maxZoom={2.2} fitView proOptions={{ hideAttribution: true }}
    >
      <Background gap={22} size={1} color={theme === 'dark' ? '#233049' : '#dde3ee'} />
      <Controls showInteractive={false} position="bottom-left" />
      {minimap && <MiniMap pannable zoomable className="!hidden sm:!block" nodeColor={(n) => n.data?.node?.color || '#94a3b8'} maskColor={theme === 'dark' ? 'rgba(0,0,0,.5)' : 'rgba(240,243,248,.7)'} />}
      <Panel position="top-right" className="flex gap-2">
        <button className="btn-ghost btn-sm shadow-card" onClick={() => rf.fitView({ padding: 0.12, duration: 350 })} title="Fit to screen"><Maximize2 size={14} /> Fit</button>
        <button className="btn-ghost btn-sm shadow-card" onClick={reset} title="Reset layout, zoom and selection"><RotateCcw size={14} /> Reset</button>
      </Panel>
    </ReactFlow>
  )
}

export default function GraphCanvas(props) {
  return <ReactFlowProvider><Inner {...props} /></ReactFlowProvider>
}
