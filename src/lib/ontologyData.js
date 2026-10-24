/* ============ DATA (Domain 07 of FMCG ONTOLOGY.md v1.1 + finance mining files) ============ */
export const DOMMETA = {
  spine: { n: 'Finance master-data spine', short: 'Master-Data Spine', c: '#5A8AC3', code: 'SPINE' },
  f1: { n: 'F1 Planning, Budgeting & Forecasting', short: 'Planning & Budgeting', c: '#2E6FCA', code: 'F1' },
  f2: { n: 'F2 Management Reporting & Gross-to-Net', short: 'Reporting & Gross-to-Net', c: '#8A4FD0', code: 'F2' },
  f3: { n: 'F3 Cost & Profitability', short: 'Cost & Profitability', c: '#C05A9E', code: 'F3' },
  f4: { n: 'F4 Working Capital & Treasury', short: 'Working Capital & Treasury', c: '#2FA096', code: 'F4' },
  f5: { n: 'F5 Consolidation, Close & Statutory', short: 'Consolidation & Close', c: '#A0784A', code: 'F5' },
  f6: { n: 'F6 Statement Analysis & Valuation', short: 'Statement & Valuation', c: '#4EA36A', code: 'F6' },
  f7: { n: 'F7 Risk, Governance & Controls', short: 'Risk & Governance', c: '#C2503E', code: 'F7' },
  f8: { n: 'F8 EPM Platforms & Operating Model', short: 'EPM & Platforms', c: '#64748B', code: 'F8' },
}

export const ORDER = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8']

export const DOMAIN_SLUGS = {
  f1: 'planning-budgeting-forecasting',
  f2: 'management-reporting-gross-to-net',
  f3: 'cost-profitability-management',
  f4: 'working-capital-treasury',
  f5: 'consolidation-close-statutory',
  f6: 'statement-analysis-valuation',
  f7: 'risk-governance-controls',
  f8: 'epm-platforms-operating-model',
}

export const SLUG_TO_DOM = {
  'planning-budgeting-forecasting': 'f1',
  'management-reporting-gross-to-net': 'f2',
  'cost-profitability-management': 'f3',
  'working-capital-treasury': 'f4',
  'consolidation-close-statutory': 'f5',
  'statement-analysis-valuation': 'f6',
  'risk-governance-controls': 'f7',
  'epm-platforms-operating-model': 'f8',
}

export const NODES = [
  /* ---- spine ---- */
  {
    id: 'account',
    n: 'Account / CoA',
    d: 'spine',
    def: "Chart-of-accounts dimension with account intelligence (account type, rate type, depreciation logic carried as attributes rather than separate hierarchies) — the 17-dimension planning reference model's anchor dimension.",
    a: ['accountCode', 'parent', 'accountType', 'rateType (avg/closing)', 'signConvention', 'rliMapping', 'depreciationIntelligence'],
    ev: '17-dimension planning blueprint (wind-turbine manufacturer), beverage-major BPC dimension set.',
  },
  {
    id: 'orgnode',
    n: 'OrganizationNode',
    d: 'spine',
    def: 'Legal entity → business unit → function → cost/profit/investment center → role. Responsibility-center taxonomy (profit / investment / standard-cost / discretionary-expense / revenue) types each node for control purposes; DOA and SOD hang off it.',
    a: ['entityId', 'parent', 'centerType', 'currency', 'doaLevel', 'sharedServiceFlag', 'consolidationScope'],
    ev: 'Canon 2.0/2.44/2.54; consolidation scoping decks.',
  },
  {
    id: 'timedim',
    n: 'Time / Calendar',
    d: 'spine',
    def: 'Fiscal calendar with the performance-period vs posting-period convention (trade events booked when earned vs when posted) and the planning calendar pattern layered on top.',
    a: ['fiscalYear', 'period', 'performancePeriod', 'postingPeriod', 'weekPattern', 'closingDay'],
    ev: 'HPC-major BPC dimensions, Finance MoM.',
  },
  {
    id: 'currency',
    n: 'Currency / FX',
    d: 'spine',
    def: 'Transaction, local and group currency with plan/actual/prior-year rate variants — constant-FX reporting (act@planRate, @pyRate) and organic-growth flags depend on it.',
    a: ['currencyCode', 'rateType', 'planRate', 'closingRate', 'averageRate', 'constantFxVariant'],
    ev: 'Canon 2.41; consolidation currency-translation vocabulary.',
  },
  {
    id: 'proddim',
    n: 'Product / SKU',
    d: 'spine',
    def: 'Category → brand → MPG → size → SKU hierarchy — the grain of customer×SKU profitability, granularity matrices and cost objects.',
    a: ['sku', 'brand', 'mpg', 'size', 'category', 'statCaseFactor', 'mpcFactor'],
    ev: 'Canon 2.0; HPC-major granularity matrix.',
  },
  {
    id: 'custdim',
    n: 'Customer / Channel',
    d: 'spine',
    def: 'Customer → key account → channel → route-to-market hierarchy; the other axis of profitability, cost-to-serve and credit exposure.',
    a: ['customerId', 'keyAccount', 'channel', 'rtmModel', 'creditTerms', 'supplyChainModel'],
    ev: 'Canon 2.0/2.42/2.43.',
  },
  {
    id: 'metricdef',
    n: 'MetricDefinition',
    d: 'spine',
    def: 'Governed KPI dictionary: every finance metric carries a verbatim formula, grain, source, owning role and RAG thresholds — the rationalization benchmark is 400 → 30 metrics.',
    a: ['metricName', 'formula (verbatim)', 'uom', 'timeGrains[]', 'owningRole', 'ragThresholds', 'leadLagClass', 'nonAggregationRule'],
    ev: 'Nutrition-group metric lists; canon 2.44 metric rationalization.',
  },
  {
    id: 'srcsys',
    n: 'SourceSystem / ERP',
    d: 'spine',
    def: 'The canonical source landscape finance consumes: ERP GL/COPA, sub-ledgers, TPM, BW/DW, with mapping/ETL bridges, drill-back and audit trail into the EPM layer.',
    a: ['systemClass (ERP·subLedger·TPM·DW)', 'extractPattern', 'mappingBridge', 'drillBack', 'auditTrail'],
    ev: 'Canon 2.51/2.58 integration patterns.',
  },
  /* ---- F1 Planning, Budgeting & Forecasting ---- */
  {
    id: 'planversion',
    n: 'PlanningVersion / Scenario',
    d: 'f1',
    def: 'The version backbone of planning: actual · plan/budget (annual plan, 1YP) · reforecast (PPR-n = n months actual + remainder forecast) · latest estimate · prior year · constant-FX variants · scenario slots, with organic flags and driver-based inputs.',
    a: ['versionType', 'pprCycle', 'organicFlag', 'constantFxVariants', 'scenarioSlot', 'workflowState'],
    ev: 'HPC-major BPC dimension set + Finance MoM; beverage-group FP&A proposal.',
  },
  {
    id: 'budgetmeth',
    n: 'BudgetMethodology',
    d: 'f1',
    def: 'The methodology set evidenced across the corpus: top-down target vs bottom-up, driver-based, rolling, zero-based (ZBB with cost-package ownership), activity-based, and adaptive/lean with quarterly reviews.',
    a: ['methodology', 'zbbCostPackages', 'targetCascade', 'reviewCadence', 'sandbagging (anti-pattern)'],
    ev: "Global-brewer ZBB; FPM battle cards ('extensive sandbagging' verbatim).",
  },
  {
    id: 'maturity',
    n: 'PlanningMaturityCurve',
    d: 'f1',
    def: '4-level maturity: Ad-hoc → Traditional (static annual Excel) → Coherent & Diagnostic (driver-based + rolling forecast + workflow + multidimensional variance) → Prescriptive (predictive, scenario, suggested decision options).',
    a: ['maturityLevel (1–4)', 'levelCriteria', 'assessmentPerProcess'],
    ev: 'FPM CFO-focused offering decks.',
  },
  {
    id: 'simclass',
    n: 'SimulationClass',
    d: 'f1',
    def: 'Deterministic simulation (rule-driven, ~1yr history, ~1-month time-to-value) vs stochastic (multivariate, full business cycle 3–5yrs of data, exogenous drivers FX/commodity/fuel/credit, 2–3-month time-to-value).',
    a: ['simType', 'dataHorizon', 'exogenousDrivers[]', 'timeToValue'],
    ev: 'FPM scenario-simulation decks.',
  },
  {
    id: 'plancal',
    n: 'PlanningCalendarPattern',
    d: 'f1',
    def: 'The evidenced annual rhythm: Q1 AOP actualization · Q2 full-year forecast · Q3 balance-sheet bottom-up · Q4 AOP-level forecast — reforecast cycles (PPR) interleave monthly.',
    a: ['quarterPattern', 'aopMilestones', 'pprSchedule'],
    ev: 'Canon 2.41 v1.1 extension.',
  },
  {
    id: 'driverinput',
    n: 'DriverBasedInput',
    d: 'f1',
    def: 'Operational drivers planned first and translated into cost/revenue lines — fuel price, trips, line speed, volume, rate cards — the mechanic that lifts planning from account-level guesswork to causal models.',
    a: ['driverName', 'driverUom', 'mappingToAccount', 'elasticity', 'driverTree'],
    ev: 'Driver-management forecasting model; canon 2.41.',
  },
  {
    id: 'rollfc',
    n: 'RollingForecast / PPR',
    d: 'f1',
    def: 'Reforecast machinery: PPR-n versions blend actuals and forecast; rolling forecasts extend beyond year-end to kill the fiscal-year cliff; modernization practice pairs it with workflow and variance analytics.',
    a: ['horizon', 'blendRule (n actual + 12−n fc)', 'cadence', 'workflow'],
    ev: 'Finance MoM PPR cycle; EPM rolling-forecast modernization notes.',
  },
  {
    id: 'fcastbench',
    n: 'PlanningBenchmarks',
    d: 'f1',
    def: 'Best-in-class planning performance: budget accuracy 104% (actual/budget), forecast accuracy 103%, best-in-class are 400% more likely to link compensation to budget performance; budget-cycle compression benchmark −65%.',
    a: ['budgetAccuracy 104%', 'forecastAccuracy 103%', 'compLinkage ×4', 'budgetCycle −65%'],
    ev: 'Benchmark research (industry studies), FPM decks.',
  },
  /* ---- F2 Management Reporting & Gross-to-Net ---- */
  {
    id: 'pnlrli',
    n: 'PnLReportingLineItem',
    d: 'f2',
    def: 'The account roll-up (\'RLI\' pattern) instantiating gross-to-net down to net income — evidenced IBP waterfall: volume → grossTurnover → −discounts/rebates/incentives → netRevenue → −VIC → −VLC → MACO (= grossTurnover − VIC − VILC, verbatim) → −ZBB overheads → EBITDA → operationalFreeCashFlow by zone.',
    a: ['rliCode', 'parent', 'sign', 'formulaRefs', 'macoFormula (verbatim)', 'zoneRollup'],
    ev: 'PNL Report by RU and PC1 (beverage-major BPC); global-brewer IBP.',
  },
  {
    id: 'g2n',
    n: 'GrossToNetWaterfall',
    d: 'f2',
    def: 'The cross-domain revenue waterfall (gross → invoiced → net) populated by trade terms, promotions and deductions — finance\'s contract with the commercial domains; four instances evidenced across clients.',
    a: ['waterfallStage', 'tradeTermType', 'onOffInvoice', 'accrualBasis'],
    ev: 'Canon 2.22; tobacco-major & brewer trade programs.',
  },
  {
    id: 'retkpi',
    n: 'Revenue KPI Cluster',
    d: 'f2',
    def: 'The reporting formulas riding the waterfall — ISP% = (invoicedSales − M&L) ÷ invoicedSales; retention = netSales ÷ grossSales; MPC / statistical-case conversions for volume comparability.',
    a: ['ispPct (verbatim)', 'retentionPct (verbatim)', 'mpcPerStatCase', 'volumeBridge'],
    ev: 'HPC-major consolidated P&L; nutrition-group metric lists.',
  },
  {
    id: 'granmatrix',
    n: 'GranularityMatrix',
    d: 'f2',
    def: 'Which P&L line legitimately exists at which grain (SKU vs brand vs company) — the honesty matrix that stops allocation fiction below the line where costs are actually incurred.',
    a: ['rli×grain matrix', 'allocationCeiling', 'publishRule'],
    ev: 'HPC-major UK granularity matrix (evidenced verbatim).',
  },
  {
    id: 'mgmtpack',
    n: 'ManagementReportingPack',
    d: 'f2',
    def: "The MoM/flash reporting cycle: flash results, variance commentary, one-version-of-truth pack from the RLI tree, versioned against plan/PPR/LE — the CFO pillar 'Bring one version of the truth' operationalized.",
    a: ['packSections[]', 'flashTiming', 'commentaryWorkflow', 'distribution'],
    ev: 'Finance MoM; FPM Finsight dashboards.',
  },
  {
    id: 'varanalysis',
    n: 'VarianceAnalysis',
    d: 'f2',
    def: 'Multidimensional variance: vs plan / PPR / prior year, at constant FX (act@planRate, @pyRate), organic vs total, with price/volume/mix decomposition feeding commentary.',
    a: ['varianceBasis', 'fxBasis', 'organicSplit', 'pvmDecomposition'],
    ev: 'Canon 2.41; HPC-major reporting conventions.',
  },
  /* ---- F3 Cost & Profitability ---- */
  {
    id: 'profitability',
    n: 'ProfitabilityRecord',
    d: 'f3',
    def: 'Customer×SKU P&L at customer × brand/MPG × size × month, COPA-extended: full G2N to marketing profit with allocation logic (mfg OH on planned volume, warehousing on net weight shipped, variances on DMC@std), TPM liability reconciliation, and the CPP margin ladder materialMargin → contributionMargin → plantMargin.',
    a: ['grain (cust×SKU×month)', 'allocationLogic', 'tpmLiabilityRecon', 'marginLadder', 'whaleCurve'],
    ev: 'HPC-major customer-profitability reference; nutrition-group CPP; dairy-cooperative EPM.',
  },
  {
    id: 'costing',
    n: 'CostingAllocationModel',
    d: 'f3',
    def: 'The formal costing machinery beneath profitability: technique choice (standard · marginal vs absorption · ABC · TD-ABC · job/batch/process), the cost build-up ladder Prime Cost → Works Cost → COGM → COGS → Cost of Sale, and absorption mechanics (FOAR = budgeted overhead ÷ budgeted normal activity; over/under-recovery).',
    a: ['costingTechnique', 'costBuildUpLadder', 'foarFormula (verbatim)', 'overUnderRecovery', 'marginalVsAbsorptionRecon'],
    ev: 'Professional-accounting-body costing guides (>70% of UK manufacturers use standard costing); FPM costing framework.',
  },
  {
    id: 'stdcost',
    n: 'StandardCosting & Variances',
    d: 'f3',
    def: "4-element control loop (set standards → compare → analyse & report → investigate & act; 'management by exception') with the full variance taxonomy: material price/usage (+mix & yield), labour rate/efficiency, variable-OH expenditure/efficiency, fixed-OH expenditure/volume, sales variances in contribution terms, planning vs operational split.",
    a: ['standardType', 'varianceTaxonomy[]', 'mixYieldSubVariances', 'planningVsOperational'],
    ev: 'Professional-body variance method (verbatim formulas in detail file).',
  },
  {
    id: 'abc',
    n: 'ABC / TD-ABC',
    d: 'f3',
    def: "Two-stage activity-based costing (cost drivers trace input costs into pools, pools into cost objects) with worked driver rates (set-up per run, receiving per receipt, packing per delivery, engineering per order, machine-hour); time-driven variant uses duration drivers ('far more accurate than transaction drivers') and capacity cost rates.",
    a: ['costPools[]', 'driverRates (worked)', 'timeEquations', 'capacityCostRate'],
    ev: 'Worked ABC examples; TD-ABC references in costing landing.',
  },
  {
    id: 'cts',
    n: 'CostToServe Model',
    d: 'f3',
    def: 'The CPG cost-to-serve reference: supply-chain model per customer (Warehoused / Cross-Dock / Direct-Store-Delivery), warehouse activities with UoM drivers (#cases unloading, case-days storage, labour-hours pick&pack, case-km ship-to-customer), customer characteristics (order variability, avg order size, credit period).',
    a: ['scModelPerCustomer', 'warehouseActivityDrivers[]', 'ctsCustomerCharacteristics', 'allocationComplexity'],
    ev: 'FPM profitability & cost-management offering; product & customer profitability proposal.',
  },
  {
    id: 'truemargin',
    n: 'TrueMargin Waterfall',
    d: 'f3',
    def: 'The profitability waterfall extended past net margin to trueMargin = net margin less financial elements (inventory-blockage cost, A/R-blockage cost, opportunity costs) — paired with the whale curve to expose the cumulative-profitability inflection, and the 12-component cost-classification matrix.',
    a: ['trueMarginFormula', 'financialElements[]', 'whaleInflection', 'costClassificationMatrix (12×5)'],
    ev: 'Canon 2.42 v1.1 extension.',
  },
  {
    id: 'chargeback',
    n: 'SharedServices Chargeback',
    d: 'f3',
    def: 'Two chargeback methodologies: (1) allocate actual expenses — no recovery variance; (2) standard/negotiated activity price — provider becomes a profit center with recovery variance. Allocation models: waterfall, recursive, reciprocal; ABC results posted to GL at month-end.',
    a: ['methodology (1|2)', 'allocationModel', 'recoveryVariance', 'glPosting'],
    ev: 'Shared-services costing white papers; bank shared-services re-engineering (recursive → reciprocal).',
  },
  {
    id: 'idlecap',
    n: 'IdleCapacity & Resp. Centers',
    d: 'f3',
    def: 'Practical-capacity rates expose unallocated (idle) capacity cost instead of burying it in product costs; responsibility-center taxonomy types every org node for what it can be held accountable for.',
    a: ['practicalCapacityRate', 'idleCapacityCost', 'responsibilityCenterType'],
    ev: 'Canon 2.54; TD-ABC capacity references.',
  },
  /* ---- F4 Working Capital & Treasury ---- */
  {
    id: 'treasury',
    n: 'TreasuryFunction',
    d: 'f4',
    def: 'The strategic-shift entity: back-office guardian → strategic value creator (84% report expanded role; 37% of treasurers in C-suite). Lead roles by survey share: bank relationships 94% · short-term borrowing 86% · long-term funding 85% · FX/financial risk 53% · working capital 49% · internal consultant 46%.',
    a: ['treasuryLeadRoles[] (survey %)', 'strategicShift', 'cSuitePresence 37%'],
    ev: 'Treasury-association and pan-European treasurer surveys.',
  },
  {
    id: 'wcprog',
    n: 'WorkingCapitalProgram',
    d: 'f4',
    def: 'CCC managed through the process triad Purchase-to-Pay · Forecast-to-Fulfill (S&OP) · Order-to-Cash, staged Recovery → Optimization → Transformation. Governance: shared finance+functions 40% / CFO 33% / treasury 20%; only 42% apply a WACC hurdle to working capital.',
    a: ['cccProcessTriad', 'improvementStaging', 'wcGovernance (survey %)', 'waccHurdle 42%'],
    ev: 'Big-4/strategy-consultancy working-capital papers; FPM WC analytics offering.',
  },
  {
    id: 'ccc',
    n: 'CashConversionCycle',
    d: 'f4',
    def: 'C2C = DSO + DIO − DPO with lever sensitivities per component. Benchmarks: WCR consumer goods 15–25% of sales; CCC median consumer staples ≈51 days; optimization unlocks 20–30% of tied-up funds.',
    a: ['c2cFormula (verbatim)', 'dso', 'dio', 'dpo', 'sectorBenchmarks'],
    ev: 'HPC-major working-capital report; WC benchmark studies.',
  },
  {
    id: 'debtor',
    n: 'DebtorPosition / CreditPolicy',
    d: 'f4',
    def: 'Position-level credit entity: arDso = meanDebt ÷ dailySales; ageing buckets with bucketMigrationPct = (concentration − collection) ÷ concentration (leading bad-debt indicator); doubtful rule >120 days; follow-up efficiency = collected ≤5 days of overdue ÷ total overdue; dispute taxonomy; credit overrides; provisioning model.',
    a: ['arDso (verbatim)', 'ageingBuckets[]', 'bucketMigrationPct (verbatim)', 'followUpEfficiency (verbatim)', 'disputes[]', 'insuredExposure'],
    ev: 'Nutrition-group debtor dashboards (formulas verbatim).',
  },
  {
    id: 'collections',
    n: 'CollectionsAnalytics',
    d: 'f4',
    def: 'Collection operations layer: payer-behaviour segmentation (always/sometimes/never on time), willingness × ability collection matrix, dunning/chase prioritization, dispute-reason analytics (non-payment, short supply, wrong supply, damage, pricing).',
    a: ['payerBehaviourSegment', 'willingnessAbilityMatrix', 'dunningPriority', 'disputeReasons[]'],
    ev: 'Nutrition-group collections metrics; bad-debt value-management papers.',
  },
  {
    id: 'baddebt',
    n: 'BadDebt ValueManagement',
    d: 'f4',
    def: 'Three-stage value model: access screening → in-life collection (willingness×ability segments) → recovery (multi-agency, debt sale), with NPV-based acceptance decisions. Bad debt runs 1–2% of revenue; best practice recovers 1–2 EBITDA points.',
    a: ['stageModel', 'npvAcceptance', 'badDebtPctRevenue 1–2%', 'ebitdaUpside 1–2pts'],
    ev: 'Bad-debt value-management white papers.',
  },
  {
    id: 'instruments',
    n: 'TradeFinance Instruments',
    d: 'f4',
    def: 'The instrument layer: reverse factoring / supply-chain finance, factoring (recourse/non-recourse, disclosed/undisclosed), bill discounting, forfaiting (aval, without recourse), e-invoicing (payment-timing pitfall), cash pooling, commercial credit insurance, money-market floats, bank-communication/STP routing.',
    a: ['instrumentType[]', 'recourseFlag', 'disclosureFlag', 'stpRouting'],
    ev: 'Treasury instrument papers; airline-group & brewer treasury cases.',
  },
  {
    id: 'zscore',
    n: 'CreditRiskScore (Z)',
    d: 'f4',
    def: 'Altman Z-score banding applied to debtor risk: safe >2.99 / grey zone / distress <1.8 — the operational cousin of the ratio-based risk-prediction family in F6.',
    a: ['zFormula', 'banding (2.99/1.8)', 'payerRiskGrade'],
    ev: 'Nutrition-group credit scoring; statement-analysis courseware Appendix 18-A.',
  },
  /* ---- F5 Consolidation, Close & Statutory ---- */
  {
    id: 'consol',
    n: 'FinancialConsolidation',
    d: 'f5',
    def: 'Group consolidation engine: intercompany elimination & matching, currency translation, minority interests, stage/step consolidation — one of the canonical five CPM suite components.',
    a: ['consolidationScope', 'icElimination', 'currencyTranslation', 'minorityInterest', 'ownershipPct'],
    ev: 'Analyst-research CPM suite definitions (verbatim); consolidation RFPs.',
  },
  {
    id: 'icmatch',
    n: 'Intercompany Matching',
    d: 'f5',
    def: 'IC reconciliation before elimination: counterparty matching by transaction type with tolerance rules — the close-control extension that removes the biggest close-cycle drag.',
    a: ['counterpartyPair', 'matchingRule', 'toleranceBand', 'disputeQueue'],
    ev: 'Close-control extensions in CPM suite definitions.',
  },
  {
    id: 'closectl',
    n: 'CloseControl',
    d: 'f5',
    def: 'The close cockpit: task sequencing & dependencies, reconciliation management, journal control, tax provisioning. Benchmarks: close cycle 18 days → 1 week; world-class ≈2 days.',
    a: ['closeCalendar', 'reconciliationMgmt', 'journalControl', 'taxProvisioning', 'closeCycleBenchmark (18d→1wk→2d)'],
    ev: 'Canon 2.44 benchmarks; close-control vocabulary from suite definitions.',
  },
  {
    id: 'statrep',
    n: 'StatutoryReporting',
    d: 'f5',
    def: 'Financial/statutory/management reporting & disclosure: GAAP/IFRS presentation, XBRL tagging, disclosure management — the last mile of record-to-report.',
    a: ['reportingRegime (GAAP/IFRS)', 'xbrlTagging', 'disclosureWorkflow'],
    ev: 'CPM suite component five (verbatim).',
  },
  {
    id: 'impair',
    n: 'ImpairmentTesting (IAS 36)',
    d: 'f5',
    def: 'Recoverable amount = higher of fair value less costs to sell and value in use; CGU logic; goodwill-loss allocation order; reversal rules — the standing accounting-standard event evidenced with worked figures.',
    a: ['recoverableAmount (verbatim rule)', 'cguDefinition', 'goodwillAllocation', 'reversalRules'],
    ev: 'Big-4 IAS 36 guide (worked figures in detail file).',
  },
  {
    id: 'indirecttax',
    n: 'IndirectTax Mechanics',
    d: 'f5',
    def: 'Dual-GST machinery: CGST/SGST/IGST credit-utilization matrix, destination-based levy, and the supply-chain re-engineering impact of tax-neutral interstate movement.',
    a: ['gstCreditMatrix', 'destinationBasis', 'supplyChainImpact'],
    ev: 'GST readiness decks (worked credit-utilization matrix).',
  },
  /* ---- F6 Statement Analysis & Valuation ---- */
  {
    id: 'ratios',
    n: 'RatioTaxonomy',
    d: 'f6',
    def: 'Four canonical categories — activity, liquidity, solvency/leverage, profitability — with verbatim formulas: current & quick ratios, average collection/payment periods, asset turnovers, debt & coverage ratios, margins, ROA/ROE and the DuPont decomposition.',
    a: ['category (4)', 'currentRatio', 'quickRatio', 'collectionPeriod', 'assetTurnover', 'debtCoverage', 'dupont'],
    ev: 'Statement-analysis courseware (formulas verbatim in detail file).',
  },
  {
    id: 'restate',
    n: 'AnalyticalRestatements',
    d: 'f6',
    def: "Restate before any cross-company comparison: LIFO↔FIFO via LIFO reserve · capitalization vs expensing · off-balance-sheet & securitization add-backs · equity-method vs consolidation recast · purchase vs pooling · FX effects · lease capitalization. Anchor case: a beverage major's bottler-consolidation recast.",
    a: ['restatementType[]', 'lifoReserve', 'obsAddbacks', 'leaseCapitalization'],
    ev: 'FSAV courseware cases (incl. FMCG bottler recast).',
  },
  {
    id: 'dcf',
    n: 'DCFModel',
    d: 'f6',
    def: 'Enterprise DCF in 4 steps: forecast FCF → WACC → continuing value → analyze. NOPLAT = (1−t)·EBIT + Δdeferred taxes; FCF = NOPLAT − ΔNOWC − ΔNFA; continuing value from the value-driver formula (ROIC & g); three-period pattern: 5yr detailed + 10yr key-driver + perpetuity.',
    a: ['noplatFormula (verbatim)', 'fcfFormula (verbatim)', 'continuingValue', 'wacc', 'forecastPattern (5+10+∞)'],
    ev: 'Strategy-consultancy valuation handbook & model.',
  },
  {
    id: 'ep',
    n: 'EconomicProfit / EVA / CFROI',
    d: 'f6',
    def: "Value-management family: EVA = (ROC − WACC) × capital; the equivalence proof BVIC + ΣPV(EP) = ΣPV(FCF) — DCF and economic profit must tie; CFROI and MVA variants; 'growth per se does not create value.'",
    a: ['evaFormula (verbatim)', 'equivalenceProof', 'cfroi', 'mva'],
    ev: 'Academic EVA/CFROI references; FPM EVA dashboards (Fin-sight).',
  },
  {
    id: 'resid',
    n: 'ResidualIncomeModel',
    d: 'f6',
    def: 'Equity-side valuation: P0 = B0 + Σ(ROE−r)·B/(1+r)^t with ROE fade to cost of equity — the accounting-based mirror of DCF for financial-statement-driven valuation.',
    a: ['riFormula (verbatim)', 'roeFade', 'bookValueAnchor'],
    ev: 'FSAV courseware equity models.',
  },
  {
    id: 'multiples',
    n: 'TargetMultiples / EV stack',
    d: 'f6',
    def: 'Fair-multiple formulas derived from ROIC/ROE, WACC/COE, growth, tax and margin: EV/Sales, EV/EBITDA, EV/EBIT, EV/NOPLAT, EV/IC, P/E, P/B, PEG. EV stack: market cap → net debt → minorities → provisions. OpFCF = EBITDA − maintenance capex − maintenance ΔNWC.',
    a: ['fairMultipleFormulas[]', 'evStack', 'opFcfFormula (verbatim)', 'pegCaveats'],
    ev: 'Investment-bank multiples primer (verbatim formulas).',
  },
  {
    id: 'masyn',
    n: 'M&A SynergyLogic',
    d: 'f6',
    def: 'Total synergy = V(C) − V(A) − V(B); the acquisition premium is the seller\'s capture of synergy; the buyer\'s premium must be NPV-positive after integration costs — valuation discipline for deals.',
    a: ['synergyFormula (verbatim)', 'premiumLogic', 'npvGate'],
    ev: 'Valuation handbook M&A chapter.',
  },
  {
    id: 'riskpred',
    n: 'RiskPredictionModels',
    d: 'f6',
    def: 'Ratio-based statistical prediction: bankruptcy models (Z-score lineage), bond-rating models, fundamental beta models — the inventory of ratios with predictive power over distress and ratings.',
    a: ['modelClass (bankruptcy·rating·beta)', 'ratioInventory', 'predictionHorizon'],
    ev: 'FSAV Appendix 18-A ratio inventory.',
  },
  /* ---- F7 Risk, Governance & Controls ---- */
  {
    id: 'riskctrl',
    n: 'RiskControlFramework',
    d: 'f7',
    def: "The governance spine: control environment ('tone at the top') · risk assessment (likelihood × impact × controllability) · risk response (avoid/accept/mitigate/share) · control activities (policies = principles, procedures = steps; preventive/detective balance) · information & communication · monitoring (design vs operating effectiveness).",
    a: ['controlComponents[] (6)', 'assertionChecks', 'preventiveDetectiveBalance', 'effectivenessTests'],
    ev: 'FPM GRC capability decks.',
  },
  {
    id: 'riskuniv',
    n: 'Risk & Control Universe',
    d: 'f7',
    def: 'Process → sub-process → risks (fraud-flagged) → controls → % operating effectively — the navigable inventory that risk analytics and audit planning run on.',
    a: ['processTree', 'riskRegister (fraudFlag)', 'controlMap', 'pctOperatingEffectively'],
    ev: 'FPM risk-analytics offering.',
  },
  {
    id: 'doa',
    n: 'DOA / SOD Matrices',
    d: 'f7',
    def: 'Delegation-of-authority thresholds per org node and segregation-of-duties rules (e.g. invoice processor ≠ vendor-master access ≠ payments) — the control grid every approval-bearing process step must respect.',
    a: ['doaThresholds', 'sodRules (verbatim example)', 'conflictMatrix'],
    ev: 'Canon 2.56; P2P policy annexures.',
  },
  {
    id: 'p2ppolicy',
    n: 'P2P Policy Anatomy',
    d: 'f7',
    def: 'The worked procure-to-pay policy artifact: header/versions/approvals → objectives → chapters vendor-onboarding→payment → procedure step tables → SLA table → KPI table → authority-matrix annexures. Verbatim thresholds: quotation ladder 1/2/3 quotes by value band; 3-way match Invoice = GRN ≤ PO with zero price margin; monthly open-PO dispositions; duplicate-vendor checks on trade-license/IBAN; 7-criteria weighted vendor rating.',
    a: ['policyAnatomy', 'quotationLadder (verbatim)', 'threeWayMatch (verbatim)', 'vendorRating (7 criteria)', 'openPoDisposition'],
    ev: "A GCC services company's P2P policy (worked artifact).",
  },
  {
    id: 'kri',
    n: 'KRI Repository & P2P KPIs',
    d: 'f7',
    def: 'Key-risk-indicator inventory including the 11 verbatim P2P KPIs — Purchase Price Variance, POs-just-below-approval-limit, vendor turnover, duplicate payments and peers — each a named early-warning metric with an owner.',
    a: ['kriName', 'threshold', 'owner', 'p2pKpiSet (11 verbatim)'],
    ev: 'P2P policy KPI table; canon 2.56.',
  },
  {
    id: 'fraudmode',
    n: 'RiskAnalyticsMode',
    d: 'f7',
    def: 'Traditional 25-sample periodic audit → analytical 100%-population anomaly screening with continuous-monitoring dashboards. Collusion statistics: 42% of frauds are collusive; 100% of financial-statement frauds are collusive — sampling cannot see them.',
    a: ['modeShift (25→100%)', 'anomalyScreens', 'continuousMonitoring', 'collusionStats (verbatim)'],
    ev: 'FPM risk-analytics offering; AP cognitive-bot cases (3× cycle, >50% cost cut).',
  },
  {
    id: 'erm',
    n: 'EmergingRisk / ERM',
    d: 'f7',
    def: 'Forward-looking risk radar with scenario analysis and stress testing — the enterprise layer above process controls, feeding board risk appetite and the audit plan.',
    a: ['riskRadar', 'scenarioAnalysis', 'stressTesting', 'riskAppetite'],
    ev: 'FPM GRC decks; ERM references in risk landing.',
  },
  /* ---- F8 EPM Platforms & Operating Model ---- */
  {
    id: 'epmplat',
    n: 'EPMPlatformModel',
    d: 'f8',
    def: 'The technology object Domain-07 runs on — the canonical five CPM suite components: budgeting-planning-forecasting · profitability modeling & optimization (ABC/ABM) · strategy management · financial consolidation & close · statutory/management reporting & disclosure.',
    a: ['cpmSuiteComponents[] (5 verbatim)', 'cloudVsOnPrem ($50–500K vs ~$200/person/yr)', 'marketSize ($2.2B→$2.8B)'],
    ev: 'Analyst-research suite definitions (2010/2014, verbatim); platform white papers.',
  },
  {
    id: 'dimmodel',
    n: 'ReferenceDimensionModel',
    d: 'f8',
    def: 'The 17-dimension planning design: Account (with intelligence as attributes) · Time · audit-trail/data-source · category/version · currency · flow (movement types for B/S planning) · entity/cost-center/profit-center · material/product/plant/location(WBS) · UoM · vendor–customer.',
    a: ['dimensionSet (17)', 'flowDimension', 'auditTrailDim', 'uomDim'],
    ev: "Wind-turbine manufacturer's planning blueprint.",
  },
  {
    id: 'allocengine',
    n: 'AllocationEngine',
    d: 'f8',
    def: 'Line Items → Resource Drivers → Activities → Activity Drivers → Cost Objects (product/customer/channel); driver analysis = back-calculation from targets; version/period/responsibility-center reference cube — the machinery that operationalizes ABC at platform scale.',
    a: ['allocationPath (5-stage)', 'driverBackCalc', 'referenceCube'],
    ev: 'Profitability-engine modelling guides.',
  },
  {
    id: 'implmeth',
    n: 'ImplementationMethodology',
    d: 'f8',
    def: 'Blueprint → realization → cutover → go-live + hypercare; global template + phased releases + parallel run. Failure statistics: insufficient planning 67%, poor requirements 59%; recovery 2×2: salvage / reprioritize / transform / discontinue.',
    a: ['phaseModel', 'globalTemplate', 'failureStats (67%/59%)', 'recovery2x2'],
    ev: 'Implementation methodology decks; glass-manufacturer phased budgeting case.',
  },
  {
    id: 'stratmgmt',
    n: 'StrategyManagement',
    d: 'f8',
    def: 'Goals → initiatives → KPIs → scorecards / strategy maps — the CPM component that cascades strategy into the metric dictionary and holds the \'strategy to execution discipline\' CFO pillar.',
    a: ['goalCascade', 'initiativePortfolio', 'scorecard', 'strategyMap'],
    ev: 'Strategy-management module references; CFO-agenda deck.',
  },
  {
    id: 'coe',
    n: 'PlanningCoE / OperatingModel',
    d: 'f8',
    def: '4 structure options (standard / run-carved-out / layered local clusters / +local delivery); hub-spoke crew roles businessUser → demandLead → valueAnalyst → solutionArchitect → headOfAnalytics (+adoption champion); 90-day scorecard (outcome & budget variance, adoption, NPS, SLA adherence, skill-gap closure); SLA tiers (reaction ≥90% in 30min; resolution P1 4h → P4 80bh; availability 99.0–99.8%).',
    a: ['structureOptions[] (4)', 'hubSpokeCrewRoles', 'ninetyDayScorecard', 'slaTiers (verbatim)'],
    ev: 'Global-brewer planning-CoE decks; tobacco-major planning-CoE approach; consolidation RFP SLAs.',
  },
  {
    id: 'cfoagenda',
    n: 'CFOAgenda & Transformation',
    d: 'f8',
    def: "Seven verbatim pillars: 'See the future first' · 'Bring one version of the truth' · 'Instill stakeholder confidence' · 'Make it easier to do business with us' · 'Improve finance effectiveness' · 'Protect value' · 'Strategy to execution discipline' — with the transformation lifecycle Set Direction → Design the Details → Make it Happen → Run it, and the Lagging → Mainstream → Leading → Pioneering maturity model per process.",
    a: ['cfoAgendaPillars[] (7 verbatim)', 'transformationLifecycle', 'maturityModel (4-level)'],
    ev: 'Consultancy CFO-agenda deck; FPM practice decks.',
  },
  {
    id: 'sharedsvc',
    n: 'SharedServices & Cost Benchmarks',
    d: 'f8',
    def: 'Shared services scope: labor arbitrage → transformation partner (~85% large-enterprise adoption). Finance-cost benchmarks: finance cost 1.24% of sales median → 0.61% best-in-class; metric rationalization 400 → 30; AP automation up to 86% of tasks, bots >50% cost cut and 3× cycle time.',
    a: ['ssScope', 'financeCostPctSales (1.24→0.61%)', 'adoption ~85%', 'apAutomation ≤86%'],
    ev: 'Benchmark studies; FPM decks; AP cognitive-bot cases.',
  },
]

export const EDGES = [
  /* spine conformance */
  ['account', 'pnlrli', 'rolls up to'],
  ['orgnode', 'pnlrli', 'profit-center axis'],
  ['timedim', 'planversion', 'period basis'],
  ['currency', 'varanalysis', 'constant-FX basis'],
  ['proddim', 'profitability', 'SKU grain'],
  ['custdim', 'profitability', 'customer grain'],
  ['custdim', 'debtor', 'credit exposure'],
  ['metricdef', 'kri', 'governs'],
  ['metricdef', 'retkpi', 'defines'],
  ['srcsys', 'epmplat', 'feeds'],
  ['srcsys', 'closectl', 'actuals into close'],
  ['orgnode', 'doa', 'authority per node'],
  ['orgnode', 'chargeback', 'provider/consumer'],
  ['account', 'dimmodel', 'anchor dimension'],
  ['timedim', 'plancal', 'carries rhythm'],
  /* F1 internal */
  ['budgetmeth', 'planversion', 'produces versions'],
  ['plancal', 'planversion', 'schedules'],
  ['driverinput', 'planversion', 'drives inputs'],
  ['rollfc', 'planversion', 'reforecasts (PPR-n)'],
  ['maturity', 'budgetmeth', 'stages methodology'],
  ['simclass', 'driverinput', 'simulates drivers'],
  ['fcastbench', 'maturity', 'benchmarks levels'],
  ['planversion', 'varanalysis', 'comparison basis'],
  /* F2 internal */
  ['g2n', 'pnlrli', 'instantiated by'],
  ['pnlrli', 'retkpi', 'computes'],
  ['granmatrix', 'pnlrli', 'constrains grain'],
  ['pnlrli', 'mgmtpack', 'renders into'],
  ['varanalysis', 'mgmtpack', 'commentary into'],
  /* F3 internal */
  ['costing', 'profitability', 'allocates into'],
  ['stdcost', 'costing', 'variance discipline'],
  ['abc', 'costing', 'technique of'],
  ['cts', 'profitability', 'extends to customer'],
  ['profitability', 'truemargin', 'extends to'],
  ['chargeback', 'costing', 'charges via'],
  ['idlecap', 'abc', 'capacity rates'],
  ['profitability', 'g2n', 'consumes waterfall'],
  ['costing', 'pnlrli', 'variance lines'],
  /* F4 internal */
  ['treasury', 'wcprog', 'stewards'],
  ['wcprog', 'ccc', 'manages'],
  ['debtor', 'ccc', 'DSO lever'],
  ['collections', 'debtor', 'works positions'],
  ['baddebt', 'collections', 'stages value'],
  ['instruments', 'ccc', 'funds/compresses'],
  ['zscore', 'debtor', 'grades risk'],
  ['treasury', 'instruments', 'selects'],
  ['wcprog', 'p2ppolicy', 'DPO lever via P2P'],
  /* F5 internal */
  ['icmatch', 'consol', 'precedes elimination'],
  ['consol', 'statrep', 'publishes'],
  ['closectl', 'consol', 'orchestrates'],
  ['impair', 'statrep', 'adjusts'],
  ['indirecttax', 'statrep', 'levies within'],
  ['closectl', 'pnlrli', 'closes actuals into'],
  /* F6 internal */
  ['restate', 'ratios', 'cleans inputs'],
  ['ratios', 'dcf', 'informs forecasts'],
  ['dcf', 'ep', 'must tie (equivalence)'],
  ['dcf', 'multiples', 'cross-checks'],
  ['resid', 'multiples', 'equity mirror'],
  ['multiples', 'masyn', 'prices deals'],
  ['ratios', 'riskpred', 'feeds models'],
  ['riskpred', 'zscore', 'operationalizes'],
  ['planversion', 'dcf', 'forecasts feed'],
  ['statrep', 'restate', 'statement inputs'],
  ['ep', 'stratmgmt', 'value-based mgmt'],
  /* F7 internal */
  ['riskctrl', 'riskuniv', 'populates'],
  ['riskctrl', 'doa', 'mandates'],
  ['p2ppolicy', 'doa', 'embeds'],
  ['p2ppolicy', 'kri', 'defines KPIs'],
  ['riskuniv', 'fraudmode', 'screened by'],
  ['erm', 'riskctrl', 'enterprise layer'],
  ['riskctrl', 'closectl', 'controls close'],
  ['fraudmode', 'p2ppolicy', 'monitors compliance'],
  /* F8 internal + platform implements */
  ['dimmodel', 'epmplat', 'designed on'],
  ['allocengine', 'epmplat', 'engine within'],
  ['implmeth', 'epmplat', 'delivers'],
  ['stratmgmt', 'epmplat', 'suite component'],
  ['coe', 'epmplat', 'operates'],
  ['cfoagenda', 'coe', 'sets agenda'],
  ['sharedsvc', 'coe', 'delivery arm'],
  ['epmplat', 'planversion', 'implements'],
  ['allocengine', 'abc', 'platform-scale ABC'],
  ['epmplat', 'consol', 'consolidation engine'],
  ['epmplat', 'mgmtpack', 'reporting layer'],
  ['coe', 'metricdef', 'governs dictionary'],
  ['cfoagenda', 'mgmtpack', "'one version of truth'"],
  ['sharedsvc', 'fraudmode', 'AP bots evidence'],
]

export const FLOWS = [
  {
    t: 'Record-to-report',
    ids: ['srcsys', 'closectl', 'icmatch', 'consol', 'impair', 'statrep', 'pnlrli', 'mgmtpack'],
    x: 'ERP actuals ──▶ close cockpit ──▶ IC matching ──▶ consolidation (+IAS 36 events) ──▶ statutory ──▶ RLI tree ──▶ management pack',
  },
  {
    t: 'Plan-to-perform',
    ids: ['plancal', 'budgetmeth', 'driverinput', 'planversion', 'rollfc', 'varanalysis', 'mgmtpack', 'fcastbench'],
    x: 'Q1–Q4 calendar ──▶ methodology (ZBB/driver/rolling) ──▶ drivers ──▶ versions ──▶ PPR reforecasts ──▶ variance ──▶ pack; benchmarked at 104/103%',
  },
  {
    t: 'Cost-to-margin',
    ids: ['stdcost', 'abc', 'costing', 'chargeback', 'profitability', 'cts', 'truemargin', 'pnlrli', 'g2n'],
    x: 'Standard costs + ABC pools ──▶ allocation model ──▶ customer×SKU P&L ──▶ cost-to-serve ──▶ trueMargin; variances land on RLI lines',
  },
  {
    t: 'Credit-to-cash',
    ids: ['custdim', 'debtor', 'zscore', 'collections', 'baddebt', 'ccc', 'instruments', 'treasury', 'wcprog'],
    x: 'Customer terms ──▶ debtor position (DSO, ageing, migration) ──▶ Z-graded collection ──▶ bad-debt staging ──▶ C2C ──funded by──▶ instruments',
  },
  {
    t: 'Purchase-to-pay control loop',
    ids: ['p2ppolicy', 'doa', 'kri', 'fraudmode', 'riskuniv', 'riskctrl', 'wcprog'],
    x: 'P2P policy (3-way match, quotation ladder) ──▶ DOA/SOD ──▶ 11 KPIs ──▶ 100%-population screening ──▶ control universe; DPO lever of WC',
  },
  {
    t: 'Forecast-to-value',
    ids: ['planversion', 'restate', 'ratios', 'dcf', 'ep', 'resid', 'multiples', 'masyn', 'riskpred'],
    x: 'Forecasts + restated statements ──▶ ratios ──▶ DCF (NOPLAT/FCF/CV) ⇄ economic profit (must tie) ──▶ target multiples ──▶ M&A synergy pricing',
  },
  {
    t: 'Platform backbone',
    ids: ['dimmodel', 'epmplat', 'allocengine', 'implmeth', 'coe', 'cfoagenda', 'sharedsvc', 'stratmgmt', 'metricdef'],
    x: '17-dimension design ──▶ CPM suite (5 components) ──▶ allocation engine ──▶ phased delivery ──▶ CoE operating model under the 7-pillar CFO agenda',
  },
]

/**
 * Computes canonical radial positions and box sizes for the ontology canvas.
 */
export function computeLayout() {
  const W = 1900
  const H = 1650
  const CX = 950
  const CY = 800

  const byId = {}
  const nodes = NODES.map((n) => ({ ...n, a: [...n.a] }))
  nodes.forEach((n) => {
    byId[n.id] = n
  })

  const domNodes = {}
  nodes.forEach((n) => {
    ;(domNodes[n.d] = domNodes[n.d] || []).push(n)
  })

  // spine ring
  const spineMeta = { ...DOMMETA.spine, cx: CX, cy: CY, r: 255 }
  if (domNodes.spine) {
    domNodes.spine.forEach((n, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / domNodes.spine.length
      n.x = CX + 180 * Math.cos(a)
      n.y = CY + 155 * Math.sin(a)
    })
  }

  // domain clusters
  const domMetas = {}
  ORDER.forEach((d, di) => {
    const a = -Math.PI / 2 + (di * 2 * Math.PI) / ORDER.length
    const cx = CX + 565 * Math.cos(a)
    const cy = CY + 525 * Math.sin(a)
    const dNodes = domNodes[d] || []
    const r = dNodes.length <= 3 ? 85 : dNodes.length <= 6 ? 150 : 185
    domMetas[d] = { ...DOMMETA[d], cx, cy, r }
    dNodes.forEach((n, i) => {
      const na = a + (i * 2 * Math.PI) / dNodes.length
      n.x = cx + r * Math.cos(na)
      n.y = cy + r * Math.sin(na)
    })
  })

  // box sizing and label wrapping
  nodes.forEach((n) => {
    const t = n.n
    if (t.length > 21) {
      const mid = Math.floor(t.length / 2)
      let best = -1
      for (let i = 0; i < t.length; i++) {
        if (t[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i
      }
      if (best > 0) {
        n.l1 = t.slice(0, best)
        n.l2 = t.slice(best + 1)
      } else {
        n.l1 = t
      }
    } else {
      n.l1 = t
    }
    const wtext = Math.max((n.l1 || '').length, (n.l2 || '').length)
    n.w = Math.min(215, Math.max(105, wtext * 7.3 + 22))
    n.h = n.l2 ? 46 : 32
  })

  // precalculate edge coordinates
  const edges = EDGES.map(([srcId, tgtId, label], idx) => {
    const a = byId[srcId]
    const b = byId[tgtId]
    if (!a || !b) return null
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.sqrt(dx * dx + dy * dy)
    const ux = dx / len
    const uy = dy / len
    const sx = a.x + ux * Math.min(len / 2, a.w / 2 + 6)
    const sy = a.y + uy * Math.min(len / 2, a.h / 2 + 8)
    const tx = b.x - ux * Math.min(len / 2, b.w / 2 + 10)
    const ty = b.y - uy * Math.min(len / 2, b.h / 2 + 12)
    const mx = (sx + tx) / 2 - uy * len * 0.09
    const my = (sy + ty) / 2 + ux * len * 0.09
    const d = `M${sx},${sy} Q${mx},${my} ${tx},${ty}`
    return {
      id: `e-${idx}`,
      srcId,
      tgtId,
      label,
      sx,
      sy,
      tx,
      ty,
      mx,
      my,
      d,
    }
  }).filter(Boolean)

  // adjacency map
  const adj = {}
  nodes.forEach((n) => {
    adj[n.id] = new Set()
  })
  edges.forEach((e) => {
    adj[e.srcId]?.add(e.tgtId)
    adj[e.tgtId]?.add(e.srcId)
  })

  return {
    W,
    H,
    CX,
    CY,
    nodes,
    byId,
    edges,
    domMetas,
    spineMeta,
    adj,
  }
}

const DYNAMIC_PALETTE = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#4F46E5', '#DB2777']

/**
 * Computes radial positions, cluster halos, box sizing, and curved arrows
 * dynamically from any backend / LLM-generated nodes and edges while preserving
 * the exact same visual design language.
 */
export function computeDynamicLayout(rawNodes, rawEdges, activeDomain = 'all', domainMeta = null) {
  const W = 1900
  const H = 1650
  const CX = 950
  const CY = 800

  if (!rawNodes || rawNodes.length === 0) {
    return computeLayout()
  }

  const byId = {}
  const nodes = rawNodes.map((rn, idx) => {
    const id = String(rn.key || rn.id || `node-${idx}`)
    const n = String(rn.name || rn.n || id)
    const rawGroup = rn.group_key || rn.group_name || rn.d || 'general'
    const d = rawGroup.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const groupName = rn.group_name || DOMMETA[d]?.n || rawGroup
    const color = rn.color || DOMMETA[d]?.c || DYNAMIC_PALETTE[idx % DYNAMIC_PALETTE.length]
    const def = rn.definition || rn.def || ''
    const a = Array.isArray(rn.attributes || rn.a)
      ? (rn.attributes || rn.a).map((attr) => (typeof attr === 'string' ? attr : attr.name || attr.key || ''))
      : []
    const f = Array.isArray(rn.formulas || rn.f)
      ? (rn.formulas || rn.f).map((frm) => (typeof frm === 'string' ? frm : frm.name || frm.expression || ''))
      : []
    const ev = rn.evidence || rn.ev || ''

    const nodeObj = {
      ...rn,
      id,
      key: id,
      n,
      name: n,
      d,
      group_key: d,
      group_name: groupName,
      color,
      def,
      definition: def,
      a,
      attributes: a,
      f,
      formulas: f,
      ev,
      evidence: ev,
    }
    byId[id] = nodeObj
    return nodeObj
  })

  // Group nodes by domain / cluster
  const domNodes = {}
  nodes.forEach((node) => {
    ;(domNodes[node.d] = domNodes[node.d] || []).push(node)
  })
  const groupKeys = Object.keys(domNodes)

  // Identify spine / central cluster
  const spineKey = groupKeys.find((k) => k === 'spine' || k.toLowerCase().includes('spine'))
  const spineMeta = {
    ...DOMMETA.spine,
    hasNodes: Boolean(spineKey && domNodes[spineKey]?.length > 0),
    n: spineKey ? (domNodes[spineKey][0]?.group_name || 'Finance master-data spine') : 'Finance master-data spine',
    c: DOMMETA.spine?.c || '#4F46E5',
    cx: CX,
    cy: CY,
    r: 255,
  }

  const domMetas = {}

  if (spineKey && domNodes[spineKey]) {
    // Spine nodes on center ring
    domNodes[spineKey].forEach((n, i) => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / domNodes[spineKey].length
      n.x = CX + 180 * Math.cos(a)
      n.y = CY + 155 * Math.sin(a)
    })

    // Other groups on surrounding orbital circles (aligned to canonical ORDER or sort order)
    const otherGroups = groupKeys
      .filter((k) => k !== spineKey)
      .sort((a, b) => {
        const ia = ORDER.indexOf(a)
        const ib = ORDER.indexOf(b)
        if (ia !== -1 && ib !== -1) return ia - ib
        if (ia !== -1) return -1
        if (ib !== -1) return 1
        return a.localeCompare(b)
      })
    otherGroups.forEach((d, di) => {
      const a = -Math.PI / 2 + (di * 2 * Math.PI) / otherGroups.length
      const cx = CX + 560 * Math.cos(a)
      const cy = CY + 510 * Math.sin(a)
      const dNodes = domNodes[d] || []
      const r = dNodes.length <= 3 ? 95 : dNodes.length <= 6 ? 155 : 190
      const groupColor = dNodes[0]?.color || DOMMETA[d]?.c || DYNAMIC_PALETTE[di % DYNAMIC_PALETTE.length]
      domMetas[d] = {
        n: dNodes[0]?.group_name || d,
        c: groupColor,
        cx,
        cy,
        r,
      }
      dNodes.forEach((n, i) => {
        const na = a + (i * 2 * Math.PI) / dNodes.length
        n.x = cx + r * Math.cos(na)
        n.y = cy + r * Math.sin(na)
      })
    })
  } else if (groupKeys.length === 1) {
    // Single domain: place nodes gracefully in celestial concentric orbital pattern
    const singleKey = groupKeys[0]
    const all = domNodes[singleKey] || []
    const groupColor = all[0]?.color || domainMeta?.color || '#2563EB'
    const groupTitle = all[0]?.group_name || domainMeta?.name || 'Knowledge Graph'

    domMetas[singleKey] = {
      n: groupTitle,
      c: groupColor,
      cx: CX,
      cy: CY,
      r: 320,
    }

    if (all.length <= 7) {
      all.forEach((n, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / all.length
        n.x = CX + 280 * Math.cos(a)
        n.y = CY + 220 * Math.sin(a)
      })
    } else {
      const innerCount = Math.min(4, Math.floor(all.length / 2))
      const outerCount = all.length - innerCount

      for (let i = 0; i < innerCount; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / innerCount
        all[i].x = CX + 190 * Math.cos(a)
        all[i].y = CY + 155 * Math.sin(a)
      }
      for (let i = 0; i < outerCount; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / outerCount + Math.PI / outerCount
        all[innerCount + i].x = CX + 440 * Math.cos(a)
        all[innerCount + i].y = CY + 350 * Math.sin(a)
      }
    }
  } else {
    // Multiple groups without explicit spine: distribute groups evenly in celestial orbit
    groupKeys.forEach((d, di) => {
      const a = -Math.PI / 2 + (di * 2 * Math.PI) / groupKeys.length
      const dist = groupKeys.length <= 4 ? 420 : 540
      const cx = CX + dist * Math.cos(a)
      const cy = CY + (dist - 40) * Math.sin(a)
      const dNodes = domNodes[d] || []
      const r = dNodes.length <= 3 ? 90 : dNodes.length <= 6 ? 145 : 180
      const groupColor = dNodes[0]?.color || DYNAMIC_PALETTE[di % DYNAMIC_PALETTE.length]

      domMetas[d] = {
        n: dNodes[0]?.group_name || d,
        c: groupColor,
        cx,
        cy,
        r,
      }
      dNodes.forEach((n, i) => {
        const na = a + (i * 2 * Math.PI) / dNodes.length
        n.x = cx + r * Math.cos(na)
        n.y = cy + r * Math.sin(na)
      })
    })
  }

  // Box sizing and label wrapping
  nodes.forEach((n) => {
    const t = n.n
    if (t.length > 21) {
      const mid = Math.floor(t.length / 2)
      let best = -1
      for (let i = 0; i < t.length; i++) {
        if (t[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i
      }
      if (best > 0) {
        n.l1 = t.slice(0, best)
        n.l2 = t.slice(best + 1)
      } else {
        n.l1 = t
      }
    } else {
      n.l1 = t
    }
    const wtext = Math.max((n.l1 || '').length, (n.l2 || '').length)
    n.w = Math.min(220, Math.max(105, wtext * 7.4 + 22))
    n.h = n.l2 ? 46 : 32
  })

  // Precalculate edge coordinates (curved quadratic bezier arrows)
  const edges = (rawEdges || []).map((re, idx) => {
    const srcId = String(Array.isArray(re) ? re[0] : (re.source || re.srcId || re.from || ''))
    const tgtId = String(Array.isArray(re) ? re[1] : (re.target || re.tgtId || re.to || ''))
    const label = Array.isArray(re) ? (re[2] || '') : (re.label || '')
    const a = byId[srcId]
    const b = byId[tgtId]
    if (!a || !b || srcId === tgtId) return null
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / len
    const uy = dy / len
    const sx = a.x + ux * Math.min(len / 2, a.w / 2 + 6)
    const sy = a.y + uy * Math.min(len / 2, a.h / 2 + 8)
    const tx = b.x - ux * Math.min(len / 2, b.w / 2 + 10)
    const ty = b.y - uy * Math.min(len / 2, b.h / 2 + 12)
    const mx = (sx + tx) / 2 - uy * len * 0.09
    const my = (sy + ty) / 2 + ux * len * 0.09
    const d = `M${sx},${sy} Q${mx},${my} ${tx},${ty}`
    return {
      id: `e-${idx}`,
      srcId,
      tgtId,
      label,
      sx,
      sy,
      tx,
      ty,
      mx,
      my,
      d,
    }
  }).filter(Boolean)

  // Adjacency map
  const adj = {}
  nodes.forEach((n) => {
    adj[n.id] = new Set()
  })
  edges.forEach((e) => {
    adj[e.srcId]?.add(e.tgtId)
    adj[e.tgtId]?.add(e.srcId)
  })

  return {
    W,
    H,
    CX,
    CY,
    nodes,
    byId,
    edges,
    domMetas,
    spineMeta,
    adj,
  }
}
