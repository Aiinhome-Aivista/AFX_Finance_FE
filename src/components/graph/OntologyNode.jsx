import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'

function OntologyNode({ data, selected }) {
  const { node, domainMeta, dim, isNeighbour, isFound, isFlowActive, isFlowStep } = data
  const color = domainMeta?.c || '#6366F1'
  const code = domainMeta?.code || node.d?.toUpperCase()

  const isDimmed = dim && !selected && !isFound && !isFlowStep
  const opacity = isDimmed ? 0.18 : isNeighbour ? 0.48 : 1

  return (
    <div
      className={`group relative w-[210px] rounded-xl border bg-surface px-3 py-2.5 shadow-card transition-all duration-200 cursor-pointer select-none
        ${selected
          ? 'ring-2 ring-offset-2 ring-offset-bg z-30'
          : isFound
            ? 'ring-2 ring-warn ring-offset-1 ring-offset-bg z-20 animate-pulse'
            : isFlowStep
              ? 'ring-2 ring-brand ring-offset-1 ring-offset-bg z-20'
              : 'border-line hover:border-brand/60 hover:shadow-md'
        }
        ${isNeighbour ? 'border-dashed' : ''}
      `}
      style={{
        borderLeft: `4px solid ${color}`,
        boxShadow: selected
          ? `0 0 20px -2px ${color}70, 0 8px 16px -4px rgba(0,0,0,0.2)`
          : isFlowStep
            ? `0 0 16px -2px rgba(99, 102, 241, 0.4)`
            : undefined,
        opacity,
        pointerEvents: isDimmed ? 'none' : 'auto',
      }}
      title={`${node.n} (${domainMeta?.n || ''})`}
    >
      {/* Handles on all 4 sides for clean smooth routing */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!h-2 !w-2 !border-0 !bg-muted/40 transition-colors group-hover:!bg-brand"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!h-2 !w-2 !border-0 !bg-muted/40 transition-colors group-hover:!bg-brand"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!h-2 !w-2 !border-0 !bg-muted/40 transition-colors group-hover:!bg-brand"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!h-2 !w-2 !border-0 !bg-muted/40 transition-colors group-hover:!bg-brand"
      />

      {/* Top Header: Domain Pill & Tag */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <span
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
          style={{
            backgroundColor: `${color}18`,
            color: color,
            border: `1px solid ${color}35`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          {code}
        </span>

        {isNeighbour ? (
          <span className="text-[9.5px] font-medium text-muted uppercase tracking-wide">
            neighbour
          </span>
        ) : isFlowStep ? (
          <span className="badge bg-brand text-brand-ink text-[9.5px] font-bold">
            flow
          </span>
        ) : (
          <span className="text-[10px] text-muted font-mono">
            {node.a?.length || 0} attrs
          </span>
        )}
      </div>

      {/* Entity Title */}
      <div className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-ink transition-colors group-hover:text-brand">
        {node.n}
      </div>
    </div>
  )
}

export default memo(OntologyNode)
