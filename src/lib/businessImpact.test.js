import { describe, expect, it } from 'vitest'
import { annotateMissingGapNodes, buildDynamicBusinessInsight, describeEdgeChange } from './businessImpact'

describe('businessImpact client fallback & passthrough', () => {
  it('builds detailed missing_from_baseline & suggestions for removed entities', () => {
    const res = buildDynamicBusinessInsight(
      {
        key: 'variance-std',
        name: 'Variance & Standard Costing',
        definition: 'Tracks material and overhead variances against standards.',
        attributes: ['varianceThresholdPct'],
        formulas: ['Variance = Actual - Standard'],
        downstream: [{ key: 'profit-rec', name: 'ProfitabilityRecord', label: 'feeds variance' }],
      },
      'removed',
      { domainName: 'F3 Cost and Profitability Management' },
    )

    expect(res.severity).toBe('high')
    expect(res.missing_from_baseline?.has_missing).toBe(true)
    expect(res.missing_from_baseline?.business_consequences).toContain('ProfitabilityRecord')
    expect(res.suggestions?.headline).toContain('Variance & Standard Costing')
    expect(res.suggestions?.action_steps.length).toBeGreaterThanOrEqual(2)
  })

  it('builds missing_from_baseline when modified entity replaces baseline ladder stages', () => {
    const res = buildDynamicBusinessInsight(
      {
        key: 'cost-alloc',
        name: 'CostingAllocationModel',
        changes: {
          definition: {
            from: 'Cost build-up ladder Prime Cost → Works Cost → COGM → COGS → Cost of Sale.',
            to: 'Cost build-up ladder Direct Costs → Indirect Costs → Overhead Costs → Final Cost Allocation.',
          },
        },
        attributes_added: ['costBuildUpLadder[Direct Costs → Indirect Costs]'],
        attributes_removed: ['legacyCostPool'],
      },
      'modified',
      { domainName: 'Cost and Profitability Management' },
    )

    expect(res.missing_from_baseline?.has_missing).toBe(true)
    expect(res.missing_from_baseline?.missing_items.some((x) => x.includes('Prime Cost'))).toBe(true)
    expect(res.suggestions?.headline).toContain('CostingAllocationModel')
  })

  it('describes removed relationship impact and suggestion', () => {
    const ed = describeEdgeChange(
      { source: 'a', target: 'b', label: 'feeds cost' },
      'removed',
      {
        domainName: 'Cost Management',
        graph: { nodes: [{ key: 'a', name: 'CostPool' }, { key: 'b', name: 'MarginEngine' }] },
      },
    )
    expect(ed.sourceName).toBe('CostPool')
    expect(ed.targetName).toBe('MarginEngine')
    expect(ed.impact).toContain('CostPool')
    expect(ed.suggestion).toContain('MarginEngine')
  })

  it('preserves telemetry gap_graph missing and new nodes across any domain', () => {
    const out = annotateMissingGapNodes(
      { nodes: [{ key: 'cash-pool', name: 'CashPooling' }], edges: [] },
      [],
      {
        nodes: [
          { key: 'cash-pool', name: 'CashPooling', gap_status: 'matched' },
          { key: 'fx-hedge', name: 'FXHedging', gap_status: 'missing', color: '#ef4444' },
          { key: 'data-file-9', name: 'Telemetry: F4_Working_Capital_Treasury.pdf', gap_status: 'new', color: '#ef4444' },
        ],
        edges: [{ source: 'data-file-9', target: 'cash-pool', label: 'supplies data to' }],
      },
    )
    expect(out.nodes).toHaveLength(3)
    expect(out.nodes.find((n) => n.key === 'fx-hedge')?.gap_status).toBe('missing')
    expect(out.nodes.find((n) => n.key === 'data-file-9')?.gap_status).toBe('new')
    expect(out.edges).toHaveLength(1)
  })
})

