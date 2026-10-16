import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { shortGroup } from '../../lib/format'

const STATE_STYLE = {
  added: 'bg-ok/15 text-ok border-ok/40',
  modified: 'bg-warn/15 text-warn border-warn/40',
}

function EntityNode({ data }) {
  const { node, dim, selected, found, stepNo, ghost } = data
  const state = node.change_state
  return (
    <div
      className={`relative w-[208px] rounded-xl border bg-surface px-3 py-2 shadow-card transition
        ${selected ? 'border-brand ring-2 ring-brand' : found ? 'border-warn ring-2 ring-warn' : 'border-line'}
        ${ghost ? 'border-dashed' : ''}`}
      style={{ borderLeft: `5px solid ${node.color}`, opacity: dim ? 0.22 : 1 }}
      title={node.name}
    >
      <Handle type="target" position={Position.Left} className="!h-1.5 !w-1.5 !border-0 !bg-muted/50" />
      <div className="flex items-center gap-1.5">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted">{shortGroup(node.group_name)}</span>
        {node.role === 'neighbour' && <span className="badge border border-line text-muted">neighbour</span>}
        {state && state !== 'unchanged' && <span className={`badge border ${STATE_STYLE[state]}`}>{state === 'added' ? 'NEW' : 'MODIFIED'}</span>}
        {node.origin && node.origin !== 'reference' && <span className="badge border border-brand/40 bg-brand/10 text-brand">{node.origin}</span>}
        {stepNo != null && <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-brand text-[11px] font-bold text-brand-ink">{stepNo}</span>}
      </div>
      <div className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug">{node.name}</div>
      <Handle type="source" position={Position.Right} className="!h-1.5 !w-1.5 !border-0 !bg-muted/50" />
    </div>
  )
}
export default memo(EntityNode)
