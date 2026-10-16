import dagre from '@dagrejs/dagre'

export const NODE_W = 208
export const NODE_H = 68

/** Left-to-right layered layout (dagre). Returns { [key]: {x,y} } top-left positions for React Flow. */
export function layoutGraph(nodes, edges) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 34, ranksep: 120, marginx: 24, marginy: 24, ranker: 'network-simplex' })
  g.setDefaultEdgeLabel(() => ({}))
  const keys = new Set(nodes.map((n) => n.key))
  nodes.forEach((n) => g.setNode(n.key, { width: NODE_W, height: NODE_H }))
  edges.forEach((e) => { if (keys.has(e.source) && keys.has(e.target) && e.source !== e.target) g.setEdge(e.source, e.target) })
  dagre.layout(g)
  const out = {}
  nodes.forEach((n) => {
    const p = g.node(n.key)
    out[n.key] = { x: Math.round(p.x - NODE_W / 2), y: Math.round(p.y - NODE_H / 2) }
  })
  return out
}
