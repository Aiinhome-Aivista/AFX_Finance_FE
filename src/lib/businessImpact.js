export const TONE_BADGE_CLASSES = {
  indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30',
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30',
  teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30',
  red: 'bg-bad/10 text-bad border border-bad/30',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/30',
}

export const SEVERITY_STYLES = {
  high: {
    label: 'High Impact',
    cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30',
  },
  medium: {
    label: 'Model Calibration',
    cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
  },
  low: {
    label: 'Targeted Update',
    cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/30',
  },
}

const ACRONYMS = new Set([
  'abc', 'td', 'foar', 'cogs', 'cogm', 'ebitda', 'ebit', 'gl', 'erp', 'bi',
  'zbb', 'doa', 'sod', 'dsd', 'sku', 'kpi', 'ifrs', 'gaap', 'roi', 'roic',
  'pnl', 'fpa', 'ap', 'ar', 'tax', 'fx', 'etl', 'api', 'sql',
])

const LENSES = [
  {
    id: 'cost_allocation',
    tag: 'Costing & Allocation Mechanics',
    tone: 'indigo',
    keywords: ['cost', 'costing', 'allocat', 'overhead', 'absorption', 'foar', 'abc', 'ladder', 'indirect', 'direct', 'pool', 'driver'],
    financial: 'recalibrates unit-cost build-up, overhead absorption rates, and multi-tier cost distribution across centers',
  },
  {
    id: 'profitability_margin',
    tag: 'Margin & Revenue Protection',
    tone: 'emerald',
    keywords: ['margin', 'profit', 'gross', 'net', 'rebate', 'discount', 'revenue', 'price', 'ebitda', 'leakage', 'cost-to-serve', 'costtoserve', 'channel'],
    financial: 'governs gross-to-net revenue bridges, pocket-margin visibility, and customer/channel profitability rankings',
  },
  {
    id: 'operations_supply',
    tag: 'Operations & Fulfillment Economics',
    tone: 'teal',
    keywords: ['warehouse', 'freight', 'logistics', 'supply', 'inventory', 'sku', 'order', 'picking', 'packing', 'delivery', 'dsd', 'capacity', 'throughput'],
    financial: 'ties operational warehouse, logistics, and capacity activity directly into P&L cost lines',
  },
  {
    id: 'hierarchy_master',
    tag: 'Entity & Reporting Hierarchy',
    tone: 'cyan',
    keywords: ['organization', 'entity', 'hierarchy', 'center', 'coa', 'ledger', 'consolidation', 'intercompany', 'elimination', 'statutory', 'reporting'],
    financial: 'structures statutory and management roll-ups across legal entities and responsibility centers',
  },
  {
    id: 'planning_scenario',
    tag: 'Budgeting, ZBB & Scenarios',
    tone: 'blue',
    keywords: ['budget', 'zbb', 'zero-based', 'forecast', 'scenario', 'simulation', 'sensitivity', 'threshold', 'variance', 'target', 'plan'],
    financial: 'reshapes budget thresholds, scenario sensitivity models, and period variance accountability',
  },
  {
    id: 'governance_control',
    tag: 'Internal Controls & Compliance',
    tone: 'amber',
    keywords: ['control', 'audit', 'doa', 'sod', 'policy', 'approval', 'compliance', 'risk', 'reconcil', 'gaap', 'ifrs', 'tax'],
    financial: 'alters audit traceability, reconciliation controls, and statutory compliance checkpoints',
  },
  {
    id: 'incentive_kpi',
    tag: 'Performance & Incentive Alignment',
    tone: 'purple',
    keywords: ['bonus', 'compensation', 'incentive', 'kpi', 'benchmark', 'scorecard', 'payout'],
    financial: 'aligns executive KPI scorecards and incentive payouts to verified net profitability',
  },
]

function norm(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '')
}

function humanizeAttr(raw) {
  const str = String(raw || '').trim()
  const m = str.match(/\[([^\]]+)\]\s*$/)
  const detail = m ? m[1].trim() : null
  const core = m ? str.slice(0, m.index).trim() : str
  const spaced = core
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const label = spaced
    .split(' ')
    .filter(Boolean)
    .map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
  return detail ? `${label || str} (${detail})` : label || str
}

function previewList(arr, limit = 4) {
  if (!arr || arr.length === 0) return ''
  if (arr.length <= limit) return arr.join(', ')
  return `${arr.slice(0, limit).join(', ')}, and ${arr.length - limit} more`
}

function extractClauseDiff(fromStr, toStr) {
  const a = String(fromStr || '').trim()
  const b = String(toStr || '').trim()
  if (!a || !b || a === b) return null
  const aWords = a.split(/\s+/)
  const bWords = b.split(/\s+/)
  let prefix = 0
  while (prefix < aWords.length && prefix < bWords.length && aWords[prefix] === bWords[prefix]) prefix++
  let suffix = 0
  while (
    suffix < aWords.length - prefix &&
    suffix < bWords.length - prefix &&
    aWords[aWords.length - 1 - suffix] === bWords[bWords.length - 1 - suffix]
  ) {
    suffix++
  }
  const removed = aWords.slice(prefix, aWords.length - suffix).join(' ').replace(/[,;.]+$/, '').trim()
  const added = bWords.slice(prefix, bWords.length - suffix).join(' ').replace(/[,;.]+$/, '').trim()
  if (prefix + suffix < Math.min(aWords.length, bWords.length) * 0.15) {
    return { kind: 'rewrite', from: a, to: b, removed: a, added: b }
  }
  return { kind: 'refined', removed, added }
}

function resolveNeighbors(node, ctx) {
  const upstream = [...(node?.upstream || [])]
  const downstream = [...(node?.downstream || [])]
  if (upstream.length || downstream.length) return { upstream, downstream }

  const key = node?.key
  const nodes = ctx?.graph?.nodes || []
  const edges = ctx?.graph?.edges || []
  if (!key || edges.length === 0) return { upstream, downstream }

  const nameMap = Object.fromEntries(nodes.map((n) => [n.key || n.id, n.name || n.key || n.id]))
  edges.forEach((e) => {
    if (e.target === key) {
      upstream.push({ key: e.source, name: nameMap[e.source] || e.source, label: e.label || 'relates to' })
    } else if (e.source === key) {
      downstream.push({ key: e.target, name: nameMap[e.target] || e.target, label: e.label || 'relates to' })
    }
  })
  return { upstream, downstream }
}

function gatherHistoryRationale(node, ctx) {
  const nk = norm(node?.key)
  const nn = norm(node?.name)
  const matches = []
    ; (ctx?.history || []).forEach((prop) => {
      ; (prop?.items || []).forEach((it) => {
        const desc = String(it?.description || '').trim()
        const rat = String(it?.rationale || '').trim()
        const hit =
          (nk && norm(desc).includes(nk)) ||
          (nn && norm(desc).includes(nn)) ||
          (it?.node_key && norm(it.node_key) === nk)
        if (hit && (rat || desc)) {
          matches.push(rat || desc)
        }
      })
    })
  const notes = node?.changes?.notes?.to || node?.notes || ''
  if (notes) matches.push(`Model note: ${notes}`)
  return [...new Set(matches)].slice(0, 2).join(' | ')
}

function buildFallbackInsight(node, mode, ctx) {
  const domainName = String(ctx?.domainName || 'Finance').replace(/^F\d+[:\s-]*/, '').trim() || 'Finance'
  const name = node?.name || node?.key || 'Entity'
  const groupName = node?.group_name || ''
  const defFrom = node?.changes?.definition?.from || ''
  const defTo = node?.changes?.definition?.to || node?.definition || ''
  const attrsAdded = (node?.attributes_added || (mode === 'added' ? node?.attributes : []) || []).map(humanizeAttr)
  const attrsRemoved = (node?.attributes_removed || (mode === 'removed' ? node?.attributes : []) || []).map(humanizeAttr)
  const formulasAdded = node?.formulas_added || (mode === 'added' ? node?.formulas : []) || []
  const formulasRemoved = node?.formulas_removed || (mode === 'removed' ? node?.formulas : []) || []
  const defDelta = mode === 'modified' ? extractClauseDiff(defFrom, defTo) : null
  const { upstream, downstream } = resolveNeighbors(node, ctx)

  const blob = [
    name,
    groupName,
    domainName,
    defTo,
    ...attrsAdded,
    ...attrsRemoved,
    ...formulasAdded,
    ...formulasRemoved,
  ]
    .join(' ')
    .toLowerCase()

  const matchedLenses = LENSES.map((l) => ({
    lens: l,
    score: l.keywords.reduce((acc, kw) => (blob.includes(kw) ? acc + 1 : acc), 0),
  }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.lens)

  let tag = groupName || matchedLenses[0]?.tag || 'Enterprise Operating Rule'
  let tone = mode === 'removed' ? 'red' : matchedLenses[0]?.tone || (mode === 'added' ? 'emerald' : 'slate')
  if (mode === 'removed') tag = `${tag} · Removed`

  // 1. Operational & Structural Shift
  const opParts = []
  if (mode === 'added') {
    opParts.push(`Introduced custom entity “${name}” outside the standard ${domainName} reference template.`)
    if (defTo) opParts.push(`Defined scope: ${defTo}`)
    if (attrsAdded.length) opParts.push(`Tracks ${attrsAdded.length} attribute(s): ${previewList(attrsAdded, 5)}.`)
    if (formulasAdded.length) opParts.push(`Defines ${formulasAdded.length} formula(s): ${previewList(formulasAdded, 3)}.`)
  } else if (mode === 'removed') {
    opParts.push(`Excluded baseline entity “${name}” from the active ${domainName} Digital Twin.`)
    if (defTo) opParts.push(`Previously governed: ${defTo}`)
    if (attrsRemoved.length) opParts.push(`Retired ${attrsRemoved.length} attribute(s): ${previewList(attrsRemoved, 4)}.`)
    if (formulasRemoved.length) opParts.push(`Removed ${formulasRemoved.length} formula(s): ${previewList(formulasRemoved, 3)}.`)
  } else {
    if (node?.changes?.name?.from) {
      opParts.push(`Renamed entity from “${node.changes.name.from}” to “${name}” to match internal enterprise naming.`)
    }
    if (defDelta?.kind === 'refined' && (defDelta.removed || defDelta.added)) {
      const shift =
        defDelta.removed && defDelta.added
          ? `replaced “${defDelta.removed}” with “${defDelta.added}”`
          : defDelta.added
            ? `added “${defDelta.added}”`
            : `removed “${defDelta.removed}”`
      opParts.push(`Recalibrated definition for ${name}: ${shift}.`)
    } else if (defDelta?.kind === 'rewrite') {
      opParts.push(`Redefined operating scope for ${name}: ${defDelta.to}`)
    }
    if (attrsAdded.length) opParts.push(`Introduced ${attrsAdded.length} custom parameter(s): ${previewList(attrsAdded, 5)}.`)
    if (attrsRemoved.length) opParts.push(`Retired ${attrsRemoved.length} baseline attribute(s): ${previewList(attrsRemoved, 4)}.`)
    if (formulasAdded.length) opParts.push(`Added ${formulasAdded.length} formula(s): ${previewList(formulasAdded, 3)}.`)
    if (formulasRemoved.length) opParts.push(`Removed ${formulasRemoved.length} formula(s): ${previewList(formulasRemoved, 3)}.`)
    if (opParts.length === 0) opParts.push(`Updated structural metadata for ${name}.`)
  }

  // 2. Financial & Analytical Effect
  const finParts = []
  if (matchedLenses.length) {
    finParts.push(`Within ${domainName}, ${name} ${matchedLenses.map((l) => l.financial).join(' and ')}.`)
  } else {
    finParts.push(`Within ${domainName}, ${name} shapes classification rules and operational accounting behavior.`)
  }
  if (defDelta?.added || attrsAdded.length) {
    finParts.push('Aligning these custom rules eliminates catch-all averages and improves reporting accuracy.')
  }
  if (mode === 'removed' || attrsRemoved.length) {
    finParts.push('Removed dimensions stop flowing into downstream KPIs unless compensated by another node.')
  }

  // 3. Graph Ripple
  const upNames = upstream.map((u) => `${u.name} [${u.label}]`)
  const downNames = downstream.map((d) => `${d.name} [${d.label}]`)
  const rippleParts = []
  if (upNames.length) rippleParts.push(`Receives inputs from ${previewList(upNames, 3)}.`)
  if (downNames.length) {
    rippleParts.push(
      mode === 'removed'
        ? `Severing this entity leaves ${downNames.length} downstream node(s) unanchored: ${previewList(downNames, 4)}.`
        : `Changes cascade downstream into ${previewList(downNames, 4)}.`,
    )
  }
  const rippleText =
    rippleParts.join(' ') ||
    `${name} currently has no direct inbound or outbound edges in this view.`

  // 4. Governance & Risk
  let severity = 'medium'
  let riskText = ''
  if (mode === 'removed') {
    severity = 'high'
    riskText = `Omission risk: verify audit, statutory, or reconciliation checks previously handled by “${name}” are covered elsewhere.`
  } else if (defDelta || formulasAdded.length || formulasRemoved.length || attrsRemoved.length) {
    severity = 'high'
    riskText = 'Period comparability & ERP/BI sync risk: document baseline shift and verify data feeds populate all custom parameters.'
  } else if (mode === 'added') {
    riskText = `Confirm source-of-record ownership and link “${name}” to backbone entities before finalizing.`
  } else {
    severity = 'low'
    riskText = `Validate “${name}” naming and metadata with finance governance owners.`
  }

  // Missing vs Model Template + Actionable Suggestions
  const missingItems = []
  if (mode === 'removed') {
    if (defTo) missingItems.push(`Baseline domain concept: ${defTo}`)
    if (attrsRemoved.length) missingItems.push(`Lost attribute(s): ${previewList(attrsRemoved, 5)}`)
    if (formulasRemoved.length) missingItems.push(`Lost formula(s): ${previewList(formulasRemoved, 3)}`)
    if (upNames.length) missingItems.push(`Disconnected upstream feed(s): ${previewList(upNames, 3)}`)
    if (downNames.length) missingItems.push(`Unanchored downstream consumer(s): ${previewList(downNames, 3)}`)
    if (missingItems.length === 0) missingItems.push(`Core baseline entity “${name}” omitted from Current Model.`)
  } else if (mode === 'modified') {
    if (defDelta?.kind === 'rewrite' && defDelta?.from) {
      missingItems.push(`Baseline definition replaced: “${defDelta.from}”`)
    } else if (defDelta?.removed && defDelta?.added) {
      missingItems.push(`Baseline definition clause replaced: “${defDelta.removed}” → “${defDelta.added}”`)
    } else if (defDelta?.removed) {
      missingItems.push(`Removed definition clause: “${defDelta.removed}”`)
    }
    attrsRemoved.forEach((a) => missingItems.push(`Missing baseline attribute: ${a}`))
    formulasRemoved.forEach((f) => missingItems.push(`Missing baseline formula: ${f}`))
  }

  let missingFromBaseline = null
  if (missingItems.length > 0) {
    const conseq = []
    if (mode === 'removed') {
      conseq.push(
        `Because “${name}” is present in the standard ${domainName} Model Template but missing in Current Model, its controls and calculations no longer run automatically.`,
      )
      if (downNames.length) {
        conseq.push(`Downstream nodes (${previewList(downNames, 4)}) lose direct automated lineage from “${name}”.`)
      }
    } else {
      conseq.push(
        `Elements present in the Model Template for “${name}” were removed or replaced in Current Model, which can affect historical comparability and downstream extracts unless mapped.`,
      )
    }
    missingFromBaseline = {
      has_missing: true,
      title:
        mode === 'removed'
          ? 'What Is Missing vs Model Template & Business Consequence'
          : 'Baseline Elements Missing or Replaced in Current Model',
      summary:
        mode === 'removed'
          ? `“${name}” existed in the ${domainName} Model Template but is absent from your Current Model.`
          : `${missingItems.length} baseline element(s) from the Model Template are missing or replaced on “${name}”.`,
      missing_items: missingItems.slice(0, 6),
      business_consequences: conseq.join(' '),
    }
  }

  const actionSteps = []
  const verificationChecks = []
  if (mode === 'removed') {
    actionSteps.push(
      `Evaluate Restoration via Chatbot: Click “Keep & Restore Entity” (or prompt the Domain Chatbot) to reinstate “${name}” if your organization still relies on its tracking and controls.`,
    )
    if (downNames.length || upNames.length) {
      actionSteps.push(
        `Bridge Severed Graph Dependencies: If intentionally excluded, explicitly remap connected neighbors (${previewList([...upNames, ...downNames], 3)}) so ${domainName} calculations and lineage remain unbroken.`,
      )
    }
    if (formulasRemoved.length) {
      actionSteps.push(
        `Confirm External ERP Handling: Verify retired formula(s) (${previewList(formulasRemoved, 2)}) are executed outside the twin or superseded by another node.`,
      )
    }
    actionSteps.push(
      `Audit & Statutory Sign-Off: Document finance controllership/audit confirmation that excluding “${name}” creates no statutory reconciliation or compliance gap.`,
    )
    verificationChecks.push(
      `Confirm no closing schedule, statutory report, or BI extract queries “${name}”.`,
      downNames.length
        ? `Verify downstream consumers (${previewList(downNames, 3)}) receive required inputs via an alternate path.`
        : `Verify compensating internal controls cover the scope of “${name}”.`,
    )
  } else if (mode === 'added') {
    actionSteps.push(
      `Source-of-Record Ownership: Assign an ERP, GL, or telemetry owner for “${name}” and define refresh cadence so ongoing loads stay synchronized.`,
    )
    if (attrsAdded.length) {
      actionSteps.push(
        `Schema & ETL Field Mapping: Map source tables to populate ${attrsAdded.length} custom attribute(s) (${previewList(attrsAdded, 4)}) with explicit null-handling rules.`,
      )
    }
    if (formulasAdded.length) {
      actionSteps.push(
        `Historical Period Reconciliation: Benchmark new formula(s) (${previewList(formulasAdded, 2)}) against audited historical period numbers.`,
      )
    }
    if (!upNames.length && !downNames.length) {
      actionSteps.push(
        `Graph Backbone Integration: Link “${name}” to core spine or profitability entities via the Domain Chatbot so it participates in automated roll-ups.`,
      )
    } else {
      actionSteps.push(
        `Neighbor Lineage Validation: Confirm edge semantics connecting “${name}” with ${previewList([...upNames, ...downNames], 3)} reflect real data flows.`,
      )
    }
    actionSteps.push(
      `Controllership Governance Review: Confirm “${name}” does not duplicate an existing baseline node and document business intent for audit readiness.`,
    )
    verificationChecks.push(
      `Verify system-of-record extraction is scheduled and tested for “${name}”.`,
      upNames.length || downNames.length
        ? `Confirm roll-ups with ${previewList([...upNames, ...downNames], 3)} reconcile cleanly.`
        : `Attach at least one backbone relationship to avoid an isolated node.`,
    )
  } else {
    if (defDelta?.removed && defDelta?.added) {
      actionSteps.push(
        `Accounting Cross-Walk & Mapping: Build a stage-by-stage reconciliation mapping baseline logic (“${defDelta.removed}”) to your custom flow (“${defDelta.added}”) so management P&L lines bridge cleanly to statutory/GAAP schedules.`,
      )
    } else if (missingItems.length) {
      actionSteps.push(
        `Accounting Cross-Walk & Mapping: Document how replaced/missing baseline elements on “${name}” map back to standard ${domainName} schedules for audit and YoY comparability.`,
      )
    }
    if (attrsRemoved.length || formulasRemoved.length) {
      const dropped = previewList([...attrsRemoved, ...formulasRemoved], 3)
      actionSteps.push(
        `Retire & Regression-Check Removed Fields: Audit downstream BI dashboards and close packets to confirm none depend on dropped baseline element(s) (${dropped}).`,
      )
    }
    if (attrsAdded.length) {
      actionSteps.push(
        `ERP / Telemetry Pipeline Alignment: Assign data-source ownership and GL mapping for newly added parameter(s) (${previewList(attrsAdded, 3)}) so feeds populate cleanly with zero nulls.`,
      )
    }
    if (formulasAdded.length) {
      actionSteps.push(
        `Parallel Close Formula Validation: Run updated rule(s) (${previewList(formulasAdded, 2)}) against the last closed period’s actuals to verify variance thresholds and accuracy.`,
      )
    }
    if (downNames.length || upNames.length) {
      const parts = []
      if (upNames.length) parts.push(`upstream feeds from ${previewList(upNames, 3)}`)
      if (downNames.length) parts.push(`downstream roll-ups into ${previewList(downNames, 3)}`)
      actionSteps.push(
        `End-to-End Lineage & Roll-Up Review: Trace ${parts.join(' and ')} to confirm driver weights and allocation multipliers behave consistently across operating centers.`,
      )
    }
    actionSteps.push(
      `Historical Baseline & Governance Sign-Off: Annotate or restate prior-period KPIs affected by “${name}” before comparing YoY trends and capture Finance Controllership approval before locking.`,
    )
    if (defDelta?.removed && defDelta?.added) {
      verificationChecks.push(`Verify GL account & cost-center buckets map cleanly into “${defDelta.added}” without orphan balances.`)
    }
    if (attrsAdded.length) {
      verificationChecks.push(`Confirm 100% source-system coverage for ${previewList(attrsAdded, 3)} across active reporting entities.`)
    }
    if (downNames.length) {
      verificationChecks.push(`Reconcile simulated roll-ups on ${previewList(downNames, 3)} against latest audited actuals within tolerance.`)
    }
    if (!verificationChecks.length) {
      verificationChecks.push(`Confirm “${name}” definitions, attributes, and formulas reflect approved finance policy.`)
    }
  }

  const rationaleText =
    mode === 'removed'
      ? `Because “${name}” is a standard ${domainName} reference component missing from your Current Model, confirming intentional exclusion vs accidental omission is critical before locking.`
      : mode === 'added'
        ? `“${name}” extends the standard ${domainName} baseline to capture client-specific mechanics; establishing source ownership, formula reconciliation, and graph links ensures custom KPIs feed executive reporting reliably.`
        : `Calibrating “${name}” directly reshapes ${domainName} logic${defDelta?.added ? ` toward “${defDelta.added}”` : ''}. Confirming cross-walk rules, source mappings, and downstream roll-ups upfront prevents close-cycle rework.`

  const expectedOutcome =
    mode === 'removed'
      ? `Either restoring “${name}” or documenting compensating controls closes silent reconciliation blind spots across your governed Digital Twin.`
      : mode === 'added'
        ? `Governing “${name}” prevents isolated data silos and turns client-specific operating nuances into auditable, automated Digital Twin metrics.`
        : `Completing these checks ensures “${name}” delivers audit-ready reconciliation, prevents blind spots across downstream reports, and keeps YoY comparisons defensible.`

  const suggestions = {
    headline:
      mode === 'removed'
        ? `Restore “${name}” or Verify Compensating Controls`
        : mode === 'added'
          ? `Integrate & Govern New Enterprise Entity “${name}”`
          : missingItems.length
            ? `Verify Missing / Replaced Baseline Elements on “${name}”`
            : `Validate Custom Calibration for “${name}”`,
    priority:
      mode === 'removed'
        ? 'High Priority — Baseline Omission Risk'
        : missingItems.length || formulasAdded.length
          ? 'High Priority — Omission & Comparability Check'
          : 'Medium Priority — Schema Verification',
    rationale: rationaleText,
    action_steps: actionSteps.slice(0, 5),
    verification_checks: verificationChecks.slice(0, 3),
    expected_outcome: expectedOutcome,
  }

  const rationale = gatherHistoryRationale(node, ctx)
  const pillars = [
    ...(missingFromBaseline && mode === 'removed'
      ? [{ label: 'Missing vs Model Template', text: missingFromBaseline.business_consequences }]
      : []),
    { label: 'Operational & Structural Shift', text: opParts.join(' ') },
    { label: 'Financial & Analytical Effect', text: finParts.join(' ') },
    { label: 'Graph Ripple & Dependencies', text: rippleText },
    { label: 'Governance & Risk Consideration', text: riskText },
  ]
  if (missingFromBaseline && mode === 'modified') {
    pillars.push({ label: 'Missing vs Model Template', text: missingFromBaseline.business_consequences })
  }
  if (rationale) pillars.push({ label: 'Captured Rationale & Evidence', text: rationale })

  const summary = opParts[0]
  return {
    tag,
    tone,
    badgeClass: TONE_BADGE_CLASSES[tone] || TONE_BADGE_CLASSES.slate,
    severity,
    summary,
    missing_from_baseline: missingFromBaseline,
    suggestions,
    pillars,
    impact: summary,
  }
}

export function describeEdgeChange(edge, kind = 'removed', ctx = {}) {
  const nodes = ctx?.graph?.nodes || []
  const nameMap = Object.fromEntries(nodes.map((n) => [n.key || n.id, n.name || n.key || n.id]))
  const sname = edge?.source_name || nameMap[edge?.source] || edge?.source || 'Source'
  const tname = edge?.target_name || nameMap[edge?.target] || edge?.target || 'Target'
  const domainName = String(ctx?.domainName || 'Finance').replace(/^F\d+[:\s-]*/, '').trim() || 'Finance'

  if (edge?.business_impact?.impact) {
    return {
      sourceName: sname,
      targetName: tname,
      impact: edge.business_impact.impact,
      suggestion: edge.business_impact.suggestion || '',
    }
  }
  if (kind === 'removed') {
    return {
      sourceName: sname,
      targetName: tname,
      impact: `In the standard ${domainName} Model Template, “${sname}” connected to “${tname}” (${edge?.label || 'relates to'}). With this link missing in Current Model, automated handoff between these entities is disconnected.`,
      suggestion: `Restore this relationship in the Chatbot if “${tname}” still depends on “${sname}”, or verify an alternate path covers it.`,
    }
  }
  return {
    sourceName: sname,
    targetName: tname,
    impact: `Relationship semantics between “${sname}” and “${tname}” changed from “${edge?.from}” to “${edge?.to}”.`,
    suggestion: `Confirm downstream logic on “${tname}” reflects “${edge?.to}”.`,
  }
}

export function buildDynamicBusinessInsight(node, mode = 'modified', ctx = {}) {
  const bi = node?.business_impact
  if (bi && Array.isArray(bi.pillars) && bi.pillars.length > 0) {
    const tone = bi.tone || (mode === 'removed' ? 'red' : mode === 'added' ? 'emerald' : 'slate')
    return {
      tag: bi.tag || 'Enterprise Operating Rule',
      tone,
      badgeClass: TONE_BADGE_CLASSES[tone] || TONE_BADGE_CLASSES.slate,
      severity: bi.severity || (mode === 'removed' ? 'high' : 'medium'),
      summary: bi.summary || bi.operational_effect || '',
      pillars: bi.pillars,
      operational_effect: bi.operational_effect || '',
      financial_control: bi.financial_control || '',
      downstream_ripple: bi.downstream_ripple || '',
      governance_risk: bi.governance_risk || '',
      missing_from_baseline: bi.missing_from_baseline || null,
      suggestions: bi.suggestions || null,
      rationale: bi.rationale || '',
      impact: bi.summary || bi.narrative || '',
    }
  }
  return buildFallbackInsight(node, mode, ctx)
}

/**
 * Annotates graph nodes with missing/discrepancy gap indicators uniformly across all domains,
 * merging telemetry gap analysis (missing entities + uploaded telemetry nodes/edges) and diff removals.
 */
export function annotateMissingGapNodes(graph, nodesRemoved = [], gapGraph = null) {
  const hasGapGraph = Boolean(gapGraph?.nodes && gapGraph.nodes.length > 0)
  const rawNodes = (hasGapGraph ? gapGraph.nodes : (graph?.nodes || []))
    // Filter out file nodes so no filename entity appears in the knowledge graph
    .filter((n) => {
      const name = n.name || n.n || n.id || ''
      const key = n.key || n.id || ''
      const kind = n.kind || ''
      return !(
        kind === 'datasource' ||
        key.startsWith('data-file-') ||
        name.startsWith('Telemetry:') ||
        name.startsWith('Data:') ||
        /\.(pdf|xlsx|xls|csv|json|txt|docx)$/i.test(name)
      )
    })

  const validKeys = new Set()
  rawNodes.forEach((n) => {
    if (n.id) validKeys.add(String(n.id))
    if (n.key) validKeys.add(String(n.key))
    if (n.name) validKeys.add(String(n.name))
    if (n.n) validKeys.add(String(n.n))
  })

  // Prefer existing graph edges if gapGraph has no edges or empty relationships
  const candidateEdges = (hasGapGraph && Array.isArray(gapGraph.edges) && gapGraph.edges.length > 0)
    ? gapGraph.edges
    : (graph?.edges || [])

  const rawEdges = candidateEdges
    // Filter out edges connected to excluded file nodes or invalid nodes
    .filter((e) => {
      const src = String(e.source?.id || e.source || e.srcId || e.from || '')
      const tgt = String(e.target?.id || e.target || e.tgtId || e.to || '')
      return validKeys.has(src) && validKeys.has(tgt)
    })

  if (rawNodes.length === 0) return { nodes: rawNodes, edges: rawEdges }

  const removedList = Array.isArray(nodesRemoved) ? nodesRemoved : []
  const nodes = rawNodes.map((n) => {
    const name = n.name || n.n || n.id || ''
    const isRemovedInDiff = removedList.some((rem) => rem.name === name || rem.key === n.id || rem.key === n.key)

    if (n.gap_status === 'missing' || (isRemovedInDiff && n.gap_status !== 'new')) {
      return {
        ...n,
        gap_status: 'missing',
        is_discrepancy: true,
        color: '#ef4444',
        gap_color: '#ef4444',
      }
    }
    return n
  })

  return { nodes, edges: rawEdges }
}

