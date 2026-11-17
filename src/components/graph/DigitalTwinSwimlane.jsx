import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, AlertTriangle } from 'lucide-react'

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function wrap(t, w) {
  const out = []
  let line = ''
  String(t || '').split(' ').forEach((word) => {
    if ((line + ' ' + word).trim().length > w) {
      out.push(line.trim())
      line = word
    } else {
      line += ' ' + word
    }
  })
  if (line.trim()) out.push(line.trim())
  return out
}

/**
 * Generates domain-aware and data-driven process steps and lanes.
 * Dynamically anchors the user's verified nodes into the process ladder.
 */
export function getDynamicTwinModel({ domainName = 'Finance', slug = '', nodes = [] }) {
  const sLow = (slug || '').toLowerCase()
  const dLow = (domainName || '').toLowerCase()

  const isPlanning = sLow.includes('plan') || sLow.includes('budget') || dLow.includes('plan') || dLow.includes('budget')
  const isCost = sLow.includes('cost') || sLow.includes('profit') || dLow.includes('cost') || dLow.includes('profit')
  const isClose = sLow.includes('close') || sLow.includes('consol') || dLow.includes('close') || dLow.includes('consol')
  const isReporting = sLow.includes('report') || sLow.includes('gross') || dLow.includes('report') || dLow.includes('gross')

  // Find user nodes for dynamic tagging
  const nodeNames = (nodes || []).map((n) => n.name || n.n || n.label || n.id || '').filter(Boolean)
  const findMatchingNode = (keywords) => {
    return nodeNames.find((name) => keywords.some((k) => name.toLowerCase().includes(k.toLowerCase()))) || null
  }

  const st = (lane, label, type, agent, hitl, hitlWhy, icom) => ({
    lane,
    label,
    type: type || 'task',
    agent: agent || null,
    act: agent ? 'automate' : null,
    hitl: Boolean(hitl),
    hitlWhy,
    icom: icom || null,
    next: null,
    branch: [],
  })

  let steps = []
  let agentsList = []
  let simConfig = {
    unitLabel: 'Orders / day',
    sliderDefault: 40,
    roleA: { label: 'Credit Analysts', default: 2 },
    roleB: { label: 'AR Clerks', default: 3 },
    roleC: { label: 'Sales Ops', default: 3 },
  }

  if (isPlanning) {
    // ----------------------------------------------------
    // F1: Planning, Budgeting & Forecasting
    // ----------------------------------------------------
    simConfig = {
      unitLabel: 'Submissions / day',
      sliderDefault: 25,
      roleA: { label: 'FP&A Analysts', default: 3 },
      roleB: { label: 'Budget Approvers', default: 2 },
      roleC: { label: 'Controllers', default: 2 },
    }

    const calNode = findMatchingNode(['calendar', 'plancal']) || 'Planning Calendar Pattern'
    const methNode = findMatchingNode(['method', 'budgetmeth', 'zbb']) || 'Budget Methodology'
    const driverNode = findMatchingNode(['driver', 'driverinput']) || 'Driver-Based Input'
    const versNode = findMatchingNode(['version', 'scenario', 'planversion']) || 'Planning Version / Scenarios'
    const rollNode = findMatchingNode(['rolling', 'rollfc', 'forecast']) || 'Rolling Forecast / PPR'
    const varNode = findMatchingNode(['variance', 'varanalysis', 'analysis']) || 'Variance Analysis'
    const benchNode = findMatchingNode(['benchmark', 'fcastbench']) || 'Forecast Benchmark'
    const matNode = findMatchingNode(['maturity', 'simclass']) || 'Simulation Class'

    steps = [
      st('FP&A Lead', 'Set annual planning timetable & guidelines', 'task', null, false, null, calNode),
      st('🤖 Calendar & Workflow Agent', 'Broadcast timeline & cascade budget targets', 'system', 'plnCalAgent', false, null, methNode),
      st('Cost Center Owner', 'Capture operational driver inputs & headcount', 'task', null, false, null, driverNode),
      st('🤖 Driver Ingestion Agent', 'Normalize volumes, unit rates & assumptions', 'system', 'plnDrvAgent', false, null, driverNode),
      st('Financial Analyst', 'Calibrate driver assumptions & historical trend', 'task', null, false, null, matNode),
      st('🤖 Baseline Engine Agent', 'Calculate driver-based preliminary budget lines', 'system', 'plnBaseAgent', false, null, versNode),
      st('Financial Analyst', 'Review baseline draft vs strategic target', 'approval', null, true, 'baseline threshold check', varNode),
      st('🤖 Predictive Forecasting Agent', 'Run rolling forecast (PPR) & benchmark models', 'system', 'plnFcastAgent', false, null, rollNode),
      st('🤖 Scenario Simulation Agent', 'Model inflation, volume shock & FX scenarios', 'decision', 'plnSimAgent', false, null, benchNode),
      st('Business Unit Head', 'Validate scenario tradeoffs & capital request', 'approval', null, true, 'BU capital allocation sign-off', versNode),
      st('🤖 Variance & Anomaly Sentinel', 'Screen for sandbagging & anomalous line hikes', 'decision', 'plnSentAgent', false, null, varNode),
      st('FP&A Director', 'Challenge anomalous budget requests & reallocate', 'approval', null, true, 'sandbagging review gate', varNode),
      st('Executive Committee', 'Approve consolidated operating plan & cash need', 'approval', null, true, 'Board DOA sign-off', versNode),
      st('🤖 EPM & ERP Write-Back Agent', 'Publish locked plan version to SAP / Anaplan', 'system', 'plnEpmAgent', false, null, 'EPM Platform'),
      st('🤖 Audit Sentinel Agent', 'Record immutable baseline lock & DOA sign-offs', 'system', 'plnAudAgent', false, null, 'Audit Log'),
    ]

    steps[8].next = [{ to: 9, label: 'within bounds' }, { to: 4, label: 're-calibrate' }]
    steps[10].next = [{ to: 12, label: 'clean' }, { to: 11, label: '⚠ flagged' }]
    steps[11].next = [{ to: 12, label: 're-aligned' }]

    agentsList = [
      { id: 'plnCalAgent', n: 'Calendar & Workflow Agent', onto: 'PlanningCalendar §E1', hitl: 'FP&A Director adjusts locked timetable' },
      { id: 'plnDrvAgent', n: 'Driver Ingestion Agent', onto: 'DriverInput §E2', hitl: 'Financial Analyst confirms outliers' },
      { id: 'plnBaseAgent', n: 'Baseline Engine Agent', onto: 'BudgetMethodology §E3', hitl: 'Automated formula cascade' },
      { id: 'plnFcastAgent', n: 'Predictive Forecasting Agent', onto: 'RollingForecast §E4', hitl: 'FP&A checks variance models' },
      { id: 'plnSimAgent', n: 'Scenario Simulation Agent', onto: 'SimulationClass §E5', hitl: 'BU Head selects active scenario' },
      { id: 'plnSentAgent', n: 'Variance & Anomaly Sentinel', onto: 'VarianceAnalysis §E6', hitl: 'Flagged lines require human justification' },
      { id: 'plnEpmAgent', n: 'EPM & ERP Write-Back Agent', onto: 'EPMPlatform §E7', hitl: 'Idempotent baseline lock' },
      { id: 'plnAudAgent', n: 'Audit Sentinel Agent', onto: 'AuditEvent §E8', hitl: 'Read-only immutable log' },
    ]
  } else if (isCost) {
    // ----------------------------------------------------
    // F3: Cost & Profitability Management
    // ----------------------------------------------------
    simConfig = {
      unitLabel: 'Cost Batches / day',
      sliderDefault: 30,
      roleA: { label: 'Cost Accountants', default: 3 },
      roleB: { label: 'Commercial Mgrs', default: 2 },
      roleC: { label: 'Plant Controllers', default: 2 },
    }

    const stdNode = findMatchingNode(['stdcost', 'standard', 'cost']) || 'Standard Costing'
    const abcNode = findMatchingNode(['abc', 'pool', 'activity']) || 'ABC Cost Pools'
    const allocNode = findMatchingNode(['costing', 'allocation']) || 'Cost Allocation Model'
    const ctsNode = findMatchingNode(['cts', 'cost-to-serve', 'serve']) || 'Cost-to-Serve'
    const margNode = findMatchingNode(['profit', 'margin', 'truemargin']) || 'TrueMargin Scoring'

    steps = [
      st('Plant Operations', 'Log batch actuals, machine run-hours & waste', 'task', null, false, null, stdNode),
      st('🤖 BOM & Routing Agent', 'Extract bill-of-materials and standard cycles', 'system', 'cstBomAgent', false, null, stdNode),
      st('Cost Accountant', 'Review raw material price variance (PPV)', 'task', null, false, null, stdNode),
      st('🤖 ABC Cost Allocation Agent', 'Distribute indirect cost pools via dynamic drivers', 'system', 'cstAbcAgent', false, null, abcNode),
      st('Plant Controller', 'Validate labor absorption & plant recovery rates', 'approval', null, true, 'overhead absorption sign-off', allocNode),
      st('🤖 Cost-to-Serve Engine Agent', 'Calculate freight, handling, returns & channel cost', 'system', 'cstCtsAgent', false, null, ctsNode),
      st('🤖 TrueMargin Scoring Agent', 'Synthesize customer × SKU net pocket margin', 'decision', 'cstMrgAgent', false, null, margNode),
      st('Commercial Finance Mgr', 'Review negative pocket-margin & leak accounts', 'approval', null, true, 'margin floor override', margNode),
      st('Finance Director', 'Sign off standard cost revisions & allocation keys', 'approval', null, true, 'DOA — standard cost lock', stdNode),
      st('🤖 ERP Costing Write-Back Agent', 'Update standard cost estimates in SAP CO-PA', 'system', 'cstErpAgent', false, null, 'SAP CO-PA'),
      st('🤖 Audit Sentinel Agent', 'Audit trail for cost allocation changes & PPV', 'system', 'cstAudAgent', false, null, 'Audit Log'),
    ]

    steps[6].next = [{ to: 8, label: 'profitable' }, { to: 7, label: 'margin leak' }]
    steps[7].next = [{ to: 8, label: 'reviewed' }]

    agentsList = [
      { id: 'cstBomAgent', n: 'BOM & Routing Agent', onto: 'StandardCost §E1' },
      { id: 'cstAbcAgent', n: 'ABC Cost Allocation Agent', onto: 'ActivityCostPool §E2' },
      { id: 'cstCtsAgent', n: 'Cost-to-Serve Engine Agent', onto: 'CostToServe §E3' },
      { id: 'cstMrgAgent', n: 'TrueMargin Scoring Agent', onto: 'TrueMargin §E4' },
      { id: 'cstErpAgent', n: 'ERP Costing Write-Back Agent', onto: 'COPA §E5' },
      { id: 'cstAudAgent', n: 'Audit Sentinel Agent', onto: 'AuditEvent §E6' },
    ]
  } else if (isClose) {
    // ----------------------------------------------------
    // F5: Consolidation, Close & Statutory
    // ----------------------------------------------------
    simConfig = {
      unitLabel: 'Entities / day',
      sliderDefault: 20,
      roleA: { label: 'Entity Accountants', default: 4 },
      roleB: { label: 'IC Reconcilers', default: 2 },
      roleC: { label: 'Group Controllers', default: 2 },
    }

    steps = [
      st('Entity Accountant', 'Close local subledgers & submit trial balance', 'task', null, false, null, 'Trial Balance'),
      st('🤖 Trial Balance Extraction Agent', 'Ingest & validate chart-of-accounts mapping', 'system', 'clsTbAgent', false, null, 'COA Mapping'),
      st('🤖 Currency Translation Agent', 'Apply month-end closing & average FX rates', 'system', 'clsFxAgent', false, null, 'FX Translation'),
      st('Intercompany Specialist', 'Review bilateral intercompany matching breaks', 'task', null, false, null, 'IC Reconciliation'),
      st('🤖 IC Matching & Elimination Agent', 'Auto-eliminate balanced intercompany balances', 'decision', 'clsIcAgent', false, null, 'IC Elimination'),
      st('Group Accounting Lead', 'Resolve disputed intercompany balances > threshold', 'approval', null, true, 'IC dispute sign-off', 'IC Settlement'),
      st('🤖 Consolidation Journal Agent', 'Draft equity pickup, minority & dividend eliminations', 'system', 'clsJnlAgent', false, null, 'Elimination JRN'),
      st('Group Controller', 'Approve top-level consolidation adjustments', 'approval', null, true, 'DOA — consolidation lock', 'Consolidation'),
      st('🤖 Impairment & Disclosure Agent', 'Run IAS 36 screening & generate note disclosures', 'system', 'clsStatAgent', false, null, 'Statutory Notes'),
      st('CFO & Audit Committee', 'Sign off final statutory financials & MD&A', 'approval', null, true, 'Board audit sign-off', 'Statutory Pack'),
      st('🤖 Group ERP Write-Back Agent', 'Post locked consolidation to SAP Group Reporting', 'system', 'clsErpAgent', false, null, 'SAP S/4HANA'),
      st('🤖 Audit Sentinel Agent', 'Maintain audit trail for close controls & sign-offs', 'system', 'clsAudAgent', false, null, 'Audit Log'),
    ]

    steps[4].next = [{ to: 6, label: 'matched' }, { to: 5, label: 'discrepancy' }]
    steps[5].next = [{ to: 6, label: 'adjusted' }]

    agentsList = [
      { id: 'clsTbAgent', n: 'Trial Balance Extraction Agent', onto: 'TrialBalance §E1' },
      { id: 'clsFxAgent', n: 'Currency Translation Agent', onto: 'FXRates §E2' },
      { id: 'clsIcAgent', n: 'IC Matching & Elimination Agent', onto: 'Intercompany §E3' },
      { id: 'clsJnlAgent', n: 'Consolidation Journal Agent', onto: 'Consolidation §E4' },
      { id: 'clsStatAgent', n: 'Impairment & Disclosure Agent', onto: 'StatutoryReport §E5' },
      { id: 'clsErpAgent', n: 'Group ERP Write-Back Agent', onto: 'ERPTransaction §E6' },
      { id: 'clsAudAgent', n: 'Audit Sentinel Agent', onto: 'AuditEvent §E7' },
    ]
  } else if (isReporting) {
    // ----------------------------------------------------
    // F2: Management Reporting & Gross-to-Net
    // ----------------------------------------------------
    simConfig = {
      unitLabel: 'Contracts / day',
      sliderDefault: 35,
      roleA: { label: 'Commercial Controllers', default: 2 },
      roleB: { label: 'Trade Marketing', default: 2 },
      roleC: { label: 'Audit Leads', default: 2 },
    }

    steps = [
      st('Key Account Manager', 'Submit trade promotion agreement & terms', 'task', null, false, null, 'Trade Contract'),
      st('🤖 Contract Ingestion Agent', 'Parse discount grids, off-invoice rebates & terms', 'system', 'rptCntAgent', false, null, 'G2N Grid'),
      st('Trade Marketing Lead', 'Review promotional spend vs sales targets', 'approval', null, true, 'commercial budget check', 'Trade Spend'),
      st('🤖 Gross-to-Net Waterfall Agent', 'Calculate gross revenue to net pocket bridge', 'system', 'rptG2nAgent', false, null, 'G2N Waterfall'),
      st('Commercial Controller', 'Audit deduction claims & proof of performance', 'task', null, false, null, 'Deduction Claim'),
      st('🤖 Revenue Leakage Sentinel', 'Flag unapproved discounts & rebate overspends', 'decision', 'rptLeakAgent', false, null, 'Rev Leakage'),
      st('Sales Finance Director', 'Authorize disputed trade deductions & adjustments', 'approval', null, true, 'DOA — deduction approval', 'Deduction Override'),
      st('🤖 Rebate Accrual Agent', 'Compute monthly rebate true-ups & journal draft', 'system', 'rptAccAgent', false, null, 'Rebate Accrual'),
      st('VP Commercial Finance', 'Approve final monthly gross-to-net waterfall pack', 'approval', null, true, 'executive pack sign-off', 'Reporting Pack'),
      st('🤖 ERP Settlement Agent', 'Post rebate vouchers to SAP Vistex / ERP', 'system', 'rptErpAgent', false, null, 'SAP Vistex'),
      st('🤖 Audit Sentinel Agent', 'Track promo authorization and DOA audit log', 'system', 'rptAudAgent', false, null, 'Audit Log'),
    ]

    steps[5].next = [{ to: 7, label: 'verified' }, { to: 6, label: 'leak alert' }]
    steps[6].next = [{ to: 7, label: 'settled' }]

    agentsList = [
      { id: 'rptCntAgent', n: 'Contract Ingestion Agent', onto: 'TradeContract §E1' },
      { id: 'rptG2nAgent', n: 'Gross-to-Net Waterfall Agent', onto: 'G2NWaterfall §E2' },
      { id: 'rptLeakAgent', n: 'Revenue Leakage Sentinel', onto: 'RevenueLeakage §E3' },
      { id: 'rptAccAgent', n: 'Rebate Accrual Agent', onto: 'RebateAccrual §E4' },
      { id: 'rptErpAgent', n: 'ERP Settlement Agent', onto: 'ERPTransaction §E5' },
      { id: 'rptAudAgent', n: 'Audit Sentinel Agent', onto: 'AuditEvent §E6' },
    ]
  } else {
    // ----------------------------------------------------
    // F4 / O2C / General Enterprise Finance Digital Twin
    // ----------------------------------------------------
    simConfig = {
      unitLabel: 'Orders / day',
      sliderDefault: 40,
      roleA: { label: 'Credit Analysts', default: 2 },
      roleB: { label: 'AR Clerks', default: 3 },
      roleC: { label: 'Sales Ops', default: 3 },
    }

    steps = [
      st('Sales Ops', 'Receive onboarding request', 'task', null, false, null, 'Customer Master'),
      st('🤖 Onboarding Agent', 'Validate KYC & create master record', 'system', 'onbAgent', false, null, 'KYC Document'),
      st('Customer', 'Submit financial statements & documents', 'task', null, false, null, 'Financials'),
      st('🤖 Document Intelligence Agent', 'Extract statement lines from documents', 'system', 'docAgent', false, null, 'Extraction'),
      st('🤖 Credit Scoring Agent', 'Compute Altman Z & draft policy', 'task', 'zAgent', false, null, 'Z-Score'),
      st('Credit Analyst', 'Review borderline scores', 'approval', null, true, 'grey-zone judgment', 'Score Review'),
      st('Credit Committee', 'Approve credit policy', 'approval', null, true, 'DOA — policy sign-off', 'Policy Signoff'),
      st('🤖 Exposure Control Agent', 'Set credit limit from effective band', 'system', 'expAgent', false, null, 'Credit Limit'),
      st('Sales Rep', 'Capture SKU-level demand', 'task', null, false, null, 'Demand Order'),
      st('🤖 Demand Validation Agent', 'Order valid — SKU, qty, master?', 'decision', 'demAgent', false, null, 'Validation'),
      st('🤖 Exposure Control Agent', 'Within credit limit & exposure?', 'decision', 'expAgent', false, null, 'Exposure Check'),
      st('Credit Analyst', 'Release credit-blocked order?', 'approval', null, true, 'HITL override — logged', 'Order Release'),
      st('🤖 Invoicing Agent', 'Generate invoice — price · discount · terms', 'system', 'invAgent', false, null, 'Invoice Gen'),
      st('Logistics', 'Dispatch & deliver', 'task', null, false, null, 'Fulfillment'),
      st('🤖 Collections Agent', 'Monitor dues · run dunning ladder', 'task', 'colAgent', false, null, 'Dunning Ladder'),
      st('🤖 Dispute & Promise Agent', 'Track promises · code & route disputes', 'task', 'prmAgent', false, null, 'Dispute Code'),
      st('AR Clerk', 'Resolve disputes & short-pays', 'task', null, false, null, 'Dispute Desk'),
      st('🤖 Cash Application Agent', 'Match & post payment', 'system', 'cashAgent', false, null, 'Payment Match'),
      st('🤖 Behaviour Sentinel Agent', 'Score conduct · propose band migration', 'system', 'behAgent', false, null, 'Conduct Score'),
      st('🤖 Provisioning (ECL) Agent', 'Compute ECL · draft provision posting', 'system', 'eclAgent', false, null, 'IFRS 9 ECL'),
      st('Financial Controller', 'Approve ECL posting', 'approval', null, true, 'DOA — provision sign-off', 'ECL Approval'),
      st('AR Manager', 'Review ageing · 90+ escalations / write-off', 'approval', null, true, 'DOA — write-off authority', 'Write-Off'),
      st('🤖 ERP Sync Agent', 'Write decisions back to ERP — FSCM · VKM3 · F150', 'system', 'erpAgent', false, null, 'ERP Writeback'),
      st('🤖 Audit Sentinel Agent', 'Log actions · watch SoD / DOA adherence', 'system', 'audAgent', false, null, 'Audit Sentinel'),
    ]

    steps[9].next = [{ to: 10, label: 'valid' }, { to: 8, label: 'rework' }]
    steps[10].next = [{ to: 12, label: 'within limit' }, { to: 11, label: '⛔ blocked' }]
    steps[11].next = [{ to: 12, label: 'released' }]

    agentsList = [
      { id: 'onbAgent', n: 'Onboarding Agent', onto: 'Customer §E1' },
      { id: 'docAgent', n: 'Document Intelligence Agent', onto: 'FinancialStatement §E2' },
      { id: 'zAgent', n: 'Credit Scoring Agent', onto: 'CreditProfile §E3' },
      { id: 'behAgent', n: 'Behaviour Sentinel Agent', onto: 'BehaviourScore §E4' },
      { id: 'expAgent', n: 'Exposure Control Agent', onto: 'CreditLimit §E5' },
      { id: 'demAgent', n: 'Demand Validation Agent', onto: 'DemandOrder §E6' },
      { id: 'invAgent', n: 'Invoicing Agent', onto: 'Invoice §E7' },
      { id: 'colAgent', n: 'Collections Agent', onto: 'DunningAction §E8' },
      { id: 'prmAgent', n: 'Dispute & Promise Agent', onto: 'PromiseToPay §E9' },
      { id: 'cashAgent', n: 'Cash Application Agent', onto: 'Payment §E10' },
      { id: 'eclAgent', n: 'Provisioning (ECL) Agent', onto: 'KPI §E11' },
      { id: 'erpAgent', n: 'ERP Sync Agent', onto: 'ERPTransaction §E12' },
      { id: 'audAgent', n: 'Audit Sentinel Agent', onto: 'AuditEvent §E13' },
    ]
  }

  steps.forEach((s, i) => {
    if (!s.next) s.next = i + 1 < steps.length ? [{ to: i + 1, label: '' }] : []
  })

  return { steps, agentsList, simConfig }
}

/**
 * Builds SVG Swimlane Diagram with a clean, crisp WHITE / LIGHT palette.
 */
function buildSwimlaneSvgString(model, opts = {}) {
  const steps = model.steps
  const agentsList = model.agentsList || []

  const laneNames = []
  steps.forEach((s) => {
    if (laneNames.indexOf(s.lane) < 0) laneNames.push(s.lane)
  })

  function laneIsAgent(ln) {
    return ln.indexOf('🤖') === 0 || ln.toLowerCase().includes('agent')
  }

  const sortedLanes = laneNames.filter((l) => !laneIsAgent(l)).concat(laneNames.filter(laneIsAgent))

  const LBL = 136
  const CW = 168
  const BW = 142
  const BH = 64
  const LH = 108
  const TOP = 16
  const GAP = 44
  const n = steps.length
  const C = opts.perRow || (n > 8 ? 7 : Math.max(n, 1))
  const rows = Math.ceil(n / C)

  function rowOf(i) {
    return Math.floor(i / C)
  }
  function colOf(i) {
    return i - rowOf(i) * C + 1
  }

  const rowLanes = []
  const rowTops = []
  let hAcc = TOP
  for (let r0 = 0; r0 < rows; r0++) {
    let used = sortedLanes.filter((ln) => {
      for (let i = r0 * C; i < Math.min(n, (r0 + 1) * C); i++) {
        if (steps[i].lane === ln) return true
      }
      return false
    })
    if (!used.length) used = [sortedLanes[0]]
    rowLanes.push(used)
    rowTops.push(hAcc)
    hAcc += used.length * LH + (r0 < rows - 1 ? GAP : 0)
  }

  const W = LBL + (C + 2) * CW + 16
  const H = hAcc + 30

  function rowTop(r) {
    return rowTops[r]
  }
  function laneY(r, name) {
    let idx = rowLanes[r].indexOf(name)
    if (idx < 0) idx = 0
    return rowTops[r] + idx * LH
  }
  function cx(col) {
    return LBL + col * CW + CW / 2
  }
  function cy(i) {
    return laneY(rowOf(i), steps[i].lane) + LH / 2
  }
  function isDec(i) {
    return steps[i].type === 'decision'
  }
  function boxL(i) {
    return cx(colOf(i)) - (isDec(i) ? 74 : BW / 2)
  }
  function boxR(i) {
    return cx(colOf(i)) + (isDec(i) ? 74 : BW / 2)
  }

  const sv = []
  sv.push(`<svg id="twinSvgRoot" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="display:block;width:100%;height:auto;background:#FFFFFF;font-family:Inter,system-ui,sans-serif">`)
  sv.push(`<defs><marker id="ar${opts.mid || 'x'}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#10B981"/></marker></defs>`)

  // Lane bands per row (Light theme: crisp white and soft slate alternating)
  for (let r = 0; r < rows; r++) {
    rowLanes[r].forEach((ln, li) => {
      const y = laneY(r, ln)
      const isAgent = laneIsAgent(ln)
      const ag = isAgent ? agentsList.find((a) => '🤖 ' + a.n === ln || a.n === ln) : null

      // Row background
      sv.push(`<rect x="8" y="${y}" width="${W - 16}" height="${LH}" fill="${li % 2 ? '#FFFFFF' : '#F8FAFC'}" stroke="#E2E8F0" stroke-width="1"/>`)

      // Left Column Actor Header
      const headerBg = isAgent ? '#F5F3FF' : '#F1F5F9'
      const headerBorder = isAgent ? '#DDD6FE' : '#E2E8F0'
      const headerTextColor = isAgent ? '#6D28D9' : '#0F172A'

      sv.push(`<rect x="8" y="${y}" width="${LBL}" height="${LH}" fill="${headerBg}" stroke="${headerBorder}" stroke-width="1"${ag ? `><title>${esc(ag.onto)} — ${esc(ag.hitl || 'autonomous')}</title></rect>` : '/>'}`)

      // Strip emoji / icons so left lane headers show clean text without broken symbols/pictures
      const cleanLn = ln.replace(/^[\p{Emoji}\p{Extended_Pictographic}\u200d\s🤖]+/gu, '').trim()
      const nm = wrap(cleanLn || ln, 15).slice(0, 3)
      const extra = ag ? 1 : 0
      const sy = y + LH / 2 - (nm.length - 1 + extra) * 7
      nm.forEach((w, k) => {
        sv.push(`<text x="${8 + LBL / 2}" y="${sy + k * 14 + 4}" text-anchor="middle" style="font:700 ${isAgent ? '10.5' : '11'}px Inter,system-ui;fill:${headerTextColor}">${esc(w)}</text>`)
      })
      if (ag && ag.onto) {
        sv.push(`<text x="${8 + LBL / 2}" y="${sy + nm.length * 14 + 2}" text-anchor="middle" style="font:600 7.8px Inter,system-ui;fill:#7C3AED">${esc(ag.onto.split('—')[0].trim().slice(0, 24))}</text>`)
      }
    })
    if (r > 0) {
      sv.push(`<text x="${8 + LBL / 2}" y="${rowTop(r) - 10}" text-anchor="middle" style="font:600 9px Inter,system-ui;fill:#64748B">…flow continues</text>`)
    }
  }

  const paths = []
  const labels = []
  const circles = []
  const seen = {}

  function elbow(x1, y1, x2, y2) {
    if (y1 === y2) return `M${x1},${y1} L${x2},${y2}`
    const mx = (x1 + x2) / 2
    return `M${x1},${y1} L${mx},${y1} L${mx},${y2} L${x2},${y2}`
  }

  function offPage(i, j) {
    circles.push([boxR(i) + 11, cy(i) - BH / 2 + 6, String(j + 1), `to step ${j + 1}`])
    circles.push([boxL(j) - 11, cy(j) - BH / 2 + 6, String(i + 1), `from step ${i + 1}`])
    paths.push(`M${boxL(j) - 11 + 8},${cy(j) - BH / 2 + 6} L${boxL(j)},${cy(j) - BH / 2 + 6}`)
  }

  function drawEdge(i, j, label) {
    const ek = i + '>' + j
    if (seen[ek]) return
    seen[ek] = 1
    const ri = rowOf(i)
    const rj = rowOf(j)

    if (ri === rj) {
      if (j === i + 1) {
        paths.push(elbow(boxR(i), cy(i), boxL(j), cy(j)))
        if (label) labels.push([(boxR(i) + boxL(j)) / 2, Math.min(cy(i), cy(j)) - 8, label])
        return
      }
      const fwd = j > i
      const stripY = laneY(ri, steps[j].lane) + (fwd ? 9 : LH - 8)
      const stubX = boxR(i) + 12
      const entryY = fwd ? cy(j) - BH / 2 : cy(j) + BH / 2
      paths.push(`M${boxR(i)},${cy(i)} L${stubX},${cy(i)} L${stubX},${stripY} L${cx(colOf(j))},${stripY} L${cx(colOf(j))},${entryY}`)
      if (label) labels.push([stubX + 28, stripY + (fwd ? -5 : 12), label])
      return
    }

    if (j === i + 1) {
      paths.push(`M${boxR(i)},${cy(i)} L${W - 16},${cy(i)}`)
      sv.push(`<text x="${W - 28}" y="${cy(i) - 6}" style="font:800 12px Inter,system-ui;fill:#10B981">»</text>`)
      paths.push(`M${LBL + 12},${cy(j)} L${boxL(j)},${cy(j)}`)
      sv.push(`<text x="${LBL + 14}" y="${cy(j) - 6}" style="font:800 12px Inter,system-ui;fill:#10B981">»</text>`)
      if (label) labels.push([(boxR(i) + W - 16) / 2, cy(i) - 8, label])
      return
    }

    offPage(i, j)
    if (label) labels.push([boxR(i) + 11, cy(i) - BH / 2 - 6, label])
  }

  const last = n - 1
  const endRow = rowOf(last)
  const endCol = colOf(last) + 1
  const endLane = steps[last].lane
  const endX = cx(endCol)
  const endY = laneY(endRow, endLane) + LH / 2

  function drawEdge2End(i) {
    if (rowOf(i) === endRow) {
      if (steps[i].lane === endLane && colOf(i) + 1 === endCol) {
        paths.push(elbow(boxR(i), cy(i), endX - 32, endY))
      } else {
        const stripY = laneY(endRow, endLane) + 9
        const stubX = boxR(i) + 12
        paths.push(`M${boxR(i)},${cy(i)} L${stubX},${cy(i)} L${stubX},${stripY} L${endX - 46},${stripY} L${endX - 46},${endY} L${endX - 32},${endY}`)
      }
    } else {
      circles.push([boxR(i) + 11, cy(i) - BH / 2 + 6, 'E', 'to END'])
    }
  }

  steps.forEach((s, i) => {
    const outs = s.next || []
    let toEnd = !outs.length
    outs.forEach((nx) => {
      if (nx.to === null || nx.to === undefined || !steps[nx.to]) {
        toEnd = true
      } else {
        drawEdge(i, nx.to, nx.label)
      }
    })
    if (toEnd) drawEdge2End(i)
  })

  // Paths / Arrows (Emerald on light background)
  paths.forEach((d) => {
    sv.push(`<path d="${d}" fill="none" stroke="#10B981" stroke-width="1.8" marker-end="url(#ar${opts.mid || 'x'})" opacity="0.95"/>`)
  })

  // Labels with white backdrop halo for clean reading
  labels.forEach((L) => {
    sv.push(`<text x="${L[0]}" y="${L[1]}" text-anchor="middle" style="font:700 9.5px Inter,system-ui;fill:#047857;paint-order:stroke;stroke:#FFFFFF;stroke-width:4px">${esc(L[2])}</text>`)
  })

  circles.forEach((c) => {
    sv.push(`<circle cx="${c[0]}" cy="${c[1]}" r="8.5" fill="#FFFFFF" stroke="#10B981" stroke-width="1.5"><title>${esc(c[3])}</title></circle><text x="${c[0]}" y="${c[1] + 3.2}" text-anchor="middle" style="font:800 8px Inter,system-ui;fill:#047857">${esc(c[2])}</text>`)
  })

  // Start & End pills (Crisp light badges)
  const s0y = cy(0)
  sv.push(`<rect x="${cx(0) - 34}" y="${s0y - 15}" width="68" height="30" rx="15" fill="#ECFDF5" stroke="#10B981" stroke-width="1.8"/><text x="${cx(0)}" y="${s0y + 4.5}" text-anchor="middle" style="font:800 10.5px Inter,system-ui;fill:#065F46">START</text>`)
  sv.push(`<path d="${elbow(cx(0) + 34, s0y, boxL(0), cy(0))}" fill="none" stroke="#10B981" stroke-width="1.8" marker-end="url(#ar${opts.mid || 'x'})"/>`)
  sv.push(`<rect x="${endX - 32}" y="${endY - 15}" width="64" height="30" rx="15" fill="#FEF3C7" stroke="#F59E0B" stroke-width="1.8"/><text x="${endX}" y="${endY + 4.5}" text-anchor="middle" style="font:800 10.5px Inter,system-ui;fill:#92400E">END</text>`)

  // Step nodes in WHITE palette
  steps.forEach((s, i) => {
    const x = cx(colOf(i))
    const y = cy(i)
    const isAgent = s.agent && s.act !== 'assist'

    // Node background and border styling
    let fill = '#FFFFFF'
    let stroke = '#10B981'
    let txtFill = '#0F172A'

    if (s.hitl) {
      fill = '#FFFBEB' // soft warm amber
      stroke = '#F59E0B' // amber
      txtFill = '#78350F'
    } else if (isAgent) {
      fill = '#F5F3FF' // soft lavender
      stroke = '#8B5CF6' // violet
      txtFill = '#4C1D95'
    }

    const tip = esc(s.label) + (s.hitl ? ' — HITL: ' + esc(s.hitlWhy || 'approval') : '') + (s.agent ? ' — agent step' : '')

    if (s.type === 'decision') {
      sv.push(`<polygon data-step="${i}" points="${x},${y - 30} ${x + 74},${y} ${x},${y + 30} ${x - 74},${y}" fill="${fill}" stroke="${stroke}" stroke-width="1.8"${s.hitl ? ' stroke-dasharray="5 3"' : ''} style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.06))"><title>${tip}</title></polygon>`)
      const wd = wrap(s.label, 17).slice(0, 2)
      wd.forEach((w, k) => {
        sv.push(`<text x="${x}" y="${y - 4 + k * 11 + (wd.length === 1 ? 4 : 0)}" text-anchor="middle" style="font:700 8.8px Inter,system-ui;fill:${txtFill}">${esc(w)}</text>`)
      })
      let dc = null
      if (s.hitl) dc = ['#FEF3C7', '#B45309', 'HITL: ' + (s.hitlWhy || 'approval').slice(0, 16)]
      else if (isAgent) dc = ['#EDE9FE', '#6D28D9', 'AGENT — autonomous']
      else if (s.act === 'assist') dc = ['#EDE9FE', '#6D28D9', 'Assist · human leads']
      if (dc) {
        sv.push(`<rect x="${x - 52}" y="${y + 31}" width="104" height="12" rx="6" fill="${dc[0]}" stroke="#E2E8F0"/><text x="${x}" y="${y + 40}" text-anchor="middle" style="font:700 7.4px Inter,system-ui;fill:${dc[1]}">${esc(dc[2])}</text>`)
      }
    } else {
      sv.push(`<rect data-step="${i}" x="${x - BW / 2}" y="${y - BH / 2}" width="${BW}" height="${BH}" rx="9" fill="${fill}" stroke="${stroke}" stroke-width="${s.type === 'approval' ? 2.4 : 1.6}"${s.hitl ? ' stroke-dasharray="5 3"' : ''} style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.05))"><title>${tip}</title></rect>`)
      if (s.type === 'approval') {
        sv.push(`<rect x="${x - BW / 2}" y="${y - BH / 2}" width="${BW}" height="6" rx="3" fill="${stroke}"/>`)
      }
      const lines = wrap(s.label, 22).slice(0, (s.hitl || s.agent || s.act === 'assist') ? 2 : 3)
      const sy = y - (lines.length - 1) * 5.5 - ((s.hitl || s.act === 'assist' || isAgent) ? 6 : 0) + (s.type === 'approval' ? 2 : 0)
      lines.forEach((w, k) => {
        sv.push(`<text x="${x}" y="${sy + k * 11}" text-anchor="middle" style="font:700 9.4px Inter,system-ui;fill:${txtFill}">${esc(w)}</text>`)
      })
      const chipY = y + BH / 2 - 16
      let cc = null
      if (s.hitl) cc = ['#FEF3C7', '#B45309', 'HITL — ' + (s.hitlWhy || 'approval').slice(0, 26)]
      else if (isAgent) cc = ['#EDE9FE', '#5B21B6', 'AGENT — autonomous']
      else if (s.act === 'assist') cc = ['#EDE9FE', '#6D28D9', 'AGENT-ASSISTED · human leads']
      if (cc) {
        sv.push(`<rect x="${x - BW / 2 + 6}" y="${chipY}" width="${BW - 12}" height="13" rx="6.5" fill="${cc[0]}"/><text x="${x}" y="${chipY + 9.5}" text-anchor="middle" style="font:700 7.6px Inter,system-ui;fill:${cc[1]}">${esc(cc[2])}</text>`)
      }
    }

    // Step index number
    sv.push(`<text x="${x - BW / 2 + 4}" y="${y - BH / 2 - 4}" style="font:800 8.5px Inter,system-ui;fill:#64748B">${i + 1}</text>`)

    // Ontology Anchor Label
    if (s.icom) {
      sv.push(`<text x="${x}" y="${y - BH / 2 - 12}" text-anchor="middle" style="font:700 8.2px Inter,system-ui;fill:#059669;paint-order:stroke;stroke:#FFFFFF;stroke-width:3px">${esc(s.icom)}</text>`)
    }
  })

  sv.push('</svg>')
  return { svgHtml: sv.join(''), width: W, height: H }
}

export default function DigitalTwinSwimlane({
  domainName = 'Cost and Profitability Management',
  slug = '',
  nodes = [],
  fitMode: propFitMode,
  setFitMode: propSetFitMode,
}) {
  const [internalFitMode, setInternalFitMode] = useState('fit')
  const fitMode = propFitMode !== undefined ? propFitMode : internalFitMode
  const setFitMode = propSetFitMode || setInternalFitMode

  const model = useMemo(() => {
    return getDynamicTwinModel({ domainName, slug, nodes })
  }, [domainName, slug, nodes])

  const TW = model.steps
  const simConfig = model.simConfig

  const [simRate, setSimRate] = useState(simConfig.sliderDefault || 40)
  const [capA, setCapA] = useState(simConfig.roleA?.default || 2)
  const [capB, setCapB] = useState(simConfig.roleB?.default || 3)
  const [capC, setCapC] = useState(simConfig.roleC?.default || 3)
  const [isRunning, setIsRunning] = useState(false)
  const [simClock, setSimClock] = useState('idle')
  const [simMetrics, setSimMetrics] = useState({
    thru: 0,
    cyc: 0,
    wip: 0,
    bnName: '—',
    bnCount: 0,
    util: {},
    unstable: [],
  })

  const containerRef = useRef(null)
  const simStateRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    setSimRate(simConfig.sliderDefault || 40)
    setCapA(simConfig.roleA?.default || 2)
    setCapB(simConfig.roleB?.default || 3)
    setCapC(simConfig.roleC?.default || 3)
    resetSim()
  }, [slug, domainName])

  const { svgHtml, width: svgWidth } = useMemo(() => {
    return buildSwimlaneSvgString(model, { mid: 'tw' })
  }, [model])

  // Reactively enforce Fit Width vs. Actual Size on the live SVG
  useEffect(() => {
    if (!containerRef.current) return
    const svg = containerRef.current.querySelector('svg')
    if (svg) {
      if (fitMode === 'fit') {
        svg.style.width = '100%'
        svg.style.minWidth = '0'
        svg.style.maxWidth = '100%'
        svg.style.height = 'auto'
        svg.removeAttribute('width')
      } else {
        svg.style.width = `${svgWidth}px`
        svg.style.minWidth = `${svgWidth}px`
        svg.style.maxWidth = 'none'
        svg.style.height = 'auto'
        svg.setAttribute('width', String(svgWidth))
      }
    }
  }, [fitMode, svgWidth, svgHtml])

  const twLane = (i) => TW[i].lane
  const twCap = (lane) => {
    if (lane.indexOf('🤖') === 0 || lane.toLowerCase().includes('agent')) return 100
    const lLow = lane.toLowerCase()
    if (lLow.includes('analyst') || lLow.includes('accountant') || lLow.includes('credit')) return Math.max(1, Number(capA) || 1)
    if (lLow.includes('approver') || lLow.includes('clerk') || lLow.includes('commercial')) return Math.max(1, Number(capB) || 1)
    if (lLow.includes('ops') || lLow.includes('owner') || lLow.includes('controller') || lLow.includes('lead')) return Math.max(1, Number(capC) || 1)
    return 2
  }
  const twSvc = (i) => {
    const s = TW[i]
    if (s.lane.indexOf('🤖') === 0 || s.lane.toLowerCase().includes('agent')) return 2
    if (s.type === 'approval') return 18
    return 25
  }

  const resetSim = () => {
    setIsRunning(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    simStateRef.current = null
    setSimClock('idle')
    setSimMetrics({
      thru: 0,
      cyc: 0,
      wip: 0,
      bnName: '—',
      bnCount: 0,
      util: {},
      unstable: [],
    })

    if (containerRef.current) {
      const svg = containerRef.current.querySelector('svg')
      if (svg) {
        svg.querySelectorAll('.sim-badge').forEach((el) => el.remove())
        TW.forEach((_, i) => {
          const node = svg.querySelector(`[data-step="${i}"]`)
          if (node) {
            const isAgent = TW[i].agent && TW[i].act !== 'assist'
            const origStroke = TW[i].hitl ? '#F59E0B' : (isAgent ? '#8B5CF6' : '#10B981')
            node.setAttribute('stroke', origStroke)
            node.setAttribute('stroke-width', TW[i].type === 'approval' ? '2.4' : '1.6')
          }
        })
      }
    }
  }

  const simTick = (dt, st) => {
    st.clock += dt
    const rate = (simRate / 480) * dt
    let n = Math.floor(rate)
    if (Math.random() < rate - n) n++
    for (let a = 0; a < n; a++) {
      st.spawned++
      st.q[0].push({ born: st.clock })
    }

    const busy = {}
    TW.forEach((s, i) => {
      const l = twLane(i)
      busy[l] = (busy[l] || 0) + st.sv[i].length
    })

    TW.forEach((s, i) => {
      const keep = []
      st.sv[i].forEach((t) => {
        if (st.clock >= t.fin) {
          let nx
          if (s.next && s.next.length > 1) {
            const r = Math.random()
            nx = r < 0.85 ? s.next[0].to : s.next[1].to
          } else if (s.next && s.next.length === 1) {
            nx = s.next[0].to
          } else {
            nx = i + 1 < TW.length ? i + 1 : -1
          }
          if (nx === undefined || nx === null) nx = -1
          if (nx < 0) {
            st.done.push(st.clock - t.born)
            st.thru.push(st.clock)
          } else {
            st.q[nx].push({ born: t.born })
          }
        } else {
          keep.push(t)
        }
      })
      st.sv[i] = keep
    })

    const lanes = {}
    TW.forEach((s, i) => {
      ; (lanes[twLane(i)] = lanes[twLane(i)] || []).push(i)
    })

    Object.keys(lanes).forEach((l) => {
      let free = twCap(l) - (busy[l] || 0)
      const idxs = lanes[l].slice().reverse()
      let prog = true
      while (free > 0 && prog) {
        prog = false
        for (let k = 0; k < idxs.length && free > 0; k++) {
          const i = idxs[k]
          if (st.q[i].length) {
            const t = st.q[i].shift()
            const m = twSvc(i)
            st.sv[i].push({
              born: t.born,
              fin: st.clock + Math.min(-m * Math.log(1 - Math.random()), m * 6),
            })
            free--
            prog = true
          }
        }
      }
    })

    TW.forEach((s, i) => {
      st.qh[i].push(st.q[i].length)
      if (st.qh[i].length > 480) st.qh[i].shift()
    })

    Object.keys(st.util).forEach((l) => {
      let b = 0
      TW.forEach((s, i) => {
        if (twLane(i) === l) b += st.sv[i].length
      })
      const w = st.util[l]
      w.push(Math.min(1, b / twCap(l)))
      if (w.length > 480) w.shift()
    })

    st.thru = st.thru.filter((c) => c > st.clock - 480)
  }

  const computeMetrics = (st) => {
    let wip = 0
    TW.forEach((s, i) => {
      wip += st.q[i].length + st.sv[i].length
    })
    const rec = st.done.slice(-200)
    const cyc = rec.length ? rec.reduce((a, b) => a + b, 0) / rec.length : 0
    const util = {}
    Object.keys(st.util).forEach((l) => {
      const w = st.util[l]
      util[l] = w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0
    })

    let bn = -1
    let bq = 0
    st.q.forEach((q, i) => {
      if (q.length > bq) {
        bq = q.length
        bn = i
      }
    })

    const unstable = []
    TW.forEach((s, i) => {
      const l = twLane(i)
      if (l.indexOf('🤖') === 0 || l.toLowerCase().includes('agent')) return
      const h = st.qh[i]
      if (
        h.length >= 240 &&
        h[h.length - 1] > 8 &&
        h[h.length - 1] > h[Math.floor(h.length / 2)] + 10 &&
        (util[l] || 0) > 0.9 &&
        unstable.indexOf(l) < 0
      ) {
        unstable.push(l)
      }
    })

    return {
      wip,
      cyc,
      util,
      bn,
      bq,
      thru: st.thru.length,
      unstable,
      bnName: bn >= 0 && bq > 0 ? TW[bn].label.slice(0, 26) : '—',
      bnCount: bq,
    }
  }

  useEffect(() => {
    if (!isRunning) return

    if (!simStateRef.current) {
      const st = {
        clock: 0,
        q: TW.map(() => []),
        sv: TW.map(() => []),
        done: [],
        spawned: 0,
        thru: [],
        util: {},
        qh: TW.map(() => []),
      }
      TW.forEach((s, i) => {
        const l = twLane(i)
        if (l.indexOf('🤖') !== 0 && !st.util[l]) st.util[l] = []
      })
      simStateRef.current = st
    }

    let active = true

    const runFrame = () => {
      if (!active) return
      const st = simStateRef.current
      if (!st) return

      for (let k = 0; k < 24; k++) simTick(1, st)
      const m = computeMetrics(st)

      setSimClock(`sim day ${(st.clock / 480).toFixed(1)} · ${st.spawned} completed`)
      setSimMetrics(m)

      if (containerRef.current) {
        const svg = containerRef.current.querySelector('svg')
        if (svg) {
          TW.forEach((_, i) => {
            const node = svg.querySelector(`[data-step="${i}"]`)
            if (!node) return
            let badge = svg.querySelector(`.sim-badge-${i}`)
            const qCount = st.q[i].length
            const isBn = i === m.bn && m.bq > 0

            if (qCount > 0) {
              if (!badge) {
                try {
                  const bb = node.getBBox()
                  const NS = 'http://www.w3.org/2000/svg'
                  const g = document.createElementNS(NS, 'g')
                  g.setAttribute('class', `sim-badge sim-badge-${i}`)
                  const r = document.createElementNS(NS, 'rect')
                  r.setAttribute('x', String(bb.x + bb.width - 32))
                  r.setAttribute('y', String(bb.y - 10))
                  r.setAttribute('width', '44')
                  r.setAttribute('height', '16')
                  r.setAttribute('rx', '8')
                  r.setAttribute('fill', '#FEF2F2')
                  r.setAttribute('stroke', '#EF4444')
                  r.setAttribute('stroke-width', '1')

                  const tx = document.createElementNS(NS, 'text')
                  tx.setAttribute('x', String(bb.x + bb.width - 10))
                  tx.setAttribute('y', String(bb.y + 2))
                  tx.setAttribute('text-anchor', 'middle')
                  tx.setAttribute('style', 'font:800 9px Inter,system-ui;fill:#DC2626')

                  g.appendChild(r)
                  g.appendChild(tx)
                  svg.appendChild(g)
                  badge = g
                } catch (e) {
                  // ignore
                }
              }
              if (badge) {
                const tx = badge.querySelector('text')
                if (tx) tx.textContent = `⏳ ${qCount}`
                badge.style.display = ''
              }
            } else if (badge) {
              badge.style.display = 'none'
            }

            if (isBn) {
              node.setAttribute('stroke', '#DC2626')
              node.setAttribute('stroke-width', '3.5')
            } else if (qCount > 0) {
              node.setAttribute('stroke', '#D97706')
              node.setAttribute('stroke-width', '2.6')
            } else {
              const isAgent = TW[i].agent && TW[i].act !== 'assist'
              const origStroke = TW[i].hitl ? '#F59E0B' : (isAgent ? '#8B5CF6' : '#10B981')
              node.setAttribute('stroke', origStroke)
              node.setAttribute('stroke-width', TW[i].type === 'approval' ? '2.4' : '1.6')
            }
          })
        }
      }

      timerRef.current = setTimeout(runFrame, 100)
    }

    runFrame()

    return () => {
      active = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isRunning, simRate, capA, capB, capC])

  const fmtCycle = (min) => {
    const h = min / 60
    return h >= 24 ? (h / 24).toFixed(1) + 'd' : h.toFixed(1) + 'h'
  }

  return (
    <div className="w-full flex flex-col font-sans text-slate-800 bg-white select-none">
      {/* Main Swimlane SVG Canvas (Pure White Background) */}
      <div
        ref={containerRef}
        className="w-full bg-white overflow-x-auto overflow-y-auto"
        style={{
          minHeight: '520px',
          maxHeight: 'calc(100vh - 360px)',
          colorScheme: 'light',
          scrollbarColor: '#CBD5E1 #F8FAFC',
        }}
      >
        <div
          style={{
            width: fitMode === 'fit' ? '100%' : `${svgWidth}px`,
            minWidth: fitMode === 'fit' ? '0' : `${svgWidth}px`,
            maxWidth: fitMode === 'fit' ? '100%' : 'none',
            backgroundColor: '#FFFFFF',
            transition: 'width 0.2s ease-in-out',
          }}
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      </div>

      {/* Run the Twin Live Simulation Panel (Light Theme) */}
      <div className="bg-white border-t border-slate-200 p-5 flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span>Run the twin live</span>
            </h4>
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${isRunning
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
                }`}
            >
              {isRunning ? 'RUNNING' : simStateRef.current ? 'PAUSED' : 'STOPPED'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRunning(!isRunning)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition bg-[#10B981] hover:bg-emerald-600 text-white shadow-xs cursor-pointer"
            >
              {isRunning ? <Pause size={13} /> : <Play size={13} />}
              <span>{isRunning ? 'Pause' : '▶ Run'}</span>
            </button>
            <button
              type="button"
              onClick={resetSim}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
              title="Reset simulation"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
            <span className="text-xs text-slate-500 ml-2 hidden sm:inline-block font-medium">{simClock}</span>
          </div>
        </div>

        {/* Sliders & Capacity Inputs */}
        <div className="flex flex-wrap items-center gap-5 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
          <div className="flex flex-col gap-1 min-w-[180px]">
            <div className="flex justify-between text-[11px] font-semibold text-slate-600">
              <span>{simConfig.unitLabel}:</span>
              <b className="text-slate-900 font-bold">{simRate}</b>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              value={simRate}
              onChange={(e) => setSimRate(Number(e.target.value))}
              className="h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#10B981]"
            />
          </div>

          <div className="h-7 w-[1px] bg-slate-300 hidden md:block" />

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600 uppercase">{simConfig.roleA?.label}:</span>
            <input
              type="number"
              min="1"
              max="20"
              value={capA}
              onChange={(e) => setCapA(Number(e.target.value))}
              className="w-14 px-2 py-1 rounded bg-white border border-slate-300 text-xs font-bold text-slate-900 text-center focus:border-[#10B981] outline-none shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600 uppercase">{simConfig.roleB?.label}:</span>
            <input
              type="number"
              min="1"
              max="20"
              value={capB}
              onChange={(e) => setCapB(Number(e.target.value))}
              className="w-14 px-2 py-1 rounded bg-white border border-slate-300 text-xs font-bold text-slate-900 text-center focus:border-[#10B981] outline-none shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-600 uppercase">{simConfig.roleC?.label}:</span>
            <input
              type="number"
              min="1"
              max="20"
              value={capC}
              onChange={(e) => setCapC(Number(e.target.value))}
              className="w-14 px-2 py-1 rounded bg-white border border-slate-300 text-xs font-bold text-slate-900 text-center focus:border-[#10B981] outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Live Metrics Grid (Clean Light Cards) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Throughput (rolling day)</div>
            <div className="text-xl font-extrabold text-[#059669] mt-0.5">{simMetrics.thru}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">vs {simRate} arriving</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg cycle / unit</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{fmtCycle(simMetrics.cyc)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">end-to-end processing</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WIP (in flight)</div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">{simMetrics.wip}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">active operational load</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Bottleneck Now</div>
            <div className="text-sm font-bold text-red-600 mt-1 truncate" title={simMetrics.bnName}>
              {simMetrics.bnCount > 0 ? `${simMetrics.bnName} (${simMetrics.bnCount})` : '—'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">step with largest queue</div>
          </div>
        </div>

        {/* Lane Utilization Bars */}
        {Object.keys(simMetrics.util).length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
            {Object.keys(simMetrics.util).map((lane) => {
              const u = Math.round(simMetrics.util[lane] * 100)
              const col = u > 90 ? 'bg-red-500' : u > 70 ? 'bg-amber-500' : 'bg-emerald-500'
              return (
                <div key={lane} className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-600 font-medium truncate">{lane}</span>
                    <span className="font-mono text-slate-900 font-bold">
                      {u}% · {twCap(lane)} ppl
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${col}`} style={{ width: `${u}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Bottleneck Alert */}
        {simMetrics.unstable.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            <AlertTriangle size={15} className="shrink-0 text-red-600" />
            <span>
              ⚠ <b>{simMetrics.unstable.join(', ')}</b> cannot keep up at this volume — the queue grows without bound. Add people or lift agent coverage upstream.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
