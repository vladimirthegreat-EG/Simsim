# Phase 0 -- Testing Map

**Miyazaki QA Framework -- Simsim Game Engine**

| Field            | Value                              |
|------------------|------------------------------------|
| Date             | 2026-03-08                         |
| Phase            | 0 (Reconnaissance)                 |
| Engine Version   | SimulationEngine (core/EngineContext CURRENT_ENGINE_VERSION) |
| Test Runner      | Vitest 4.x (unit/integration), Playwright 1.57 (E2E) |
| Node Framework   | Next.js 16.1.1 + tRPC 11          |
| Total Engine LOC | ~34,900 lines across 88 files      |
| Total Test LOC   | ~10,200 lines (Vitest) + ~3,800 lines (Playwright) |

---

## 1. Engine Architecture Overview

Simsim is a deterministic, multi-team business simulation engine. Each round, player decisions flow through a fixed module pipeline, then teams compete in a shared market simulation. The engine guarantees determinism via seeded RNG (`EngineContext`), meaning identical seeds and decisions produce identical outputs.

### 1.1 Round Processing Pipeline

```
SimulationEngine.processRound(input)
  |
  +-- For each team:
  |     1. MaterialEngine.processOrders()       -- material arrivals
  |     2. TariffEngine.processRoundEvents()    -- tariff adjustments
  |     3. FactoryModule.process()              -- production    (964 LOC)
  |     4. HRModule.process()                   -- workforce     (671 LOC)
  |     5. RDModule.process()                   -- R&D / patents (714 LOC)
  |     6. MarketingModule.process()            -- brand/ads     (369 LOC)
  |     7. FinanceModule.process()              -- treasury      (626 LOC)
  |     8. applyEvents()                        -- game events
  |
  +-- MarketSimulator.simulate()                -- inter-team competition (1,204 LOC)
  |
  +-- Post-market per team:
  |     - Revenue -> cash
  |     - FinancialStatementsEngine.generate()  -- IS, BS, CF
  |     - EPS, market cap, share price, rankings
  |
  +-- MarketSimulator.generateNextMarketState() -- advance market
  |
  +-- Return SimulationOutput (results, rankings, audit trail)
```

### 1.2 Key Entrypoints

| Entrypoint | Signature | Purpose |
|---|---|---|
| `SimulationEngine.processRound` | `(input: SimulationInput) => SimulationOutput` | Main round orchestrator |
| `SimulationEngine.createInitialTeamState` | `(config?, presetConfig?) => TeamState` | State factory |
| `SimulationEngine.createInitialMarketState` | `() => MarketState` | Market state factory |
| `SimulationEngine.validateDecisions` | `(state, decisions) => { valid, errors, correctedDecisions }` | Pre-processing validation |
| `MarketSimulator.simulate` | `(teams, marketState, opts?, ctx?) => MarketResult` | Inter-team market competition |
| `MarketSimulator.generateNextMarketState` | `(state, events?, ctx?, teams?) => MarketState` | Market evolution |
| `MarketSimulator.calculateRankings` | `(teams, marketResult) => Rankings[]` | EPS + market-share rankings |
| `{Module}.process` | `(state, decisions, ctx?) => { newState, result }` | Per-module processing |

---

## 2. Complete File Inventory (88 Engine Files)

### 2.1 Core (2 files -- 1,111 LOC)

| File | LOC | Role |
|---|---|---|
| `engine/core/SimulationEngine.ts` | 799 | Round orchestrator, state factories, validation |
| `engine/core/EngineContext.ts` | 312 | Seeded RNG, seed derivation, state hashing, versioning |

### 2.2 Modules (13 files -- ~6,290 LOC)

| File | LOC | Role |
|---|---|---|
| `engine/modules/FactoryModule.ts` | 964 | Production, capacity, factory creation |
| `engine/modules/HRModule.ts` | 671 | Hiring, firing, morale, turnover, training, benefits |
| `engine/modules/RDModule.ts` | 714 | Product development, quality, features, R&D budget |
| `engine/modules/MarketingModule.ts` | 369 | Brand value, advertising, campaign management |
| `engine/modules/FinanceModule.ts` | 626 | Loans, buybacks, dividends, market cap |
| `engine/modules/PatentEngine.ts` | -- | Patent filing and valuation |
| `engine/modules/AchievementEngine.ts` | -- | Module-level achievement hooks |
| `engine/modules/FacilitatorReportEngine.ts` | -- | Facilitator dashboard report generation |
| `engine/modules/FactoryExpansions.ts` | 594 | Advanced factory features (automation, green, QC) |
| `engine/modules/HRExpansions.ts` | 535 | Advanced HR features (culture, remote, DEI) |
| `engine/modules/RDExpansions.ts` | 679 | Advanced R&D features (partnerships, IP licensing) |
| `engine/modules/MarketingExpansions.ts` | 545 | Advanced marketing (influencer, CSR, loyalty) |
| `engine/modules/FinanceExpansions.ts` | 716 | Advanced finance (M&A, hedging, venture) |

### 2.3 Market (1 file -- 1,204 LOC)

| File | LOC | Role |
|---|---|---|
| `engine/market/MarketSimulator.ts` | 1,204 | Demand allocation, pricing, rubber-banding, rankings |

### 2.4 Finance / Statements (7 files -- ~1,371+ LOC)

| File | LOC | Role |
|---|---|---|
| `engine/finance/statements/IncomeStatement.ts` | 236 | Revenue, COGS, operating expenses, net income |
| `engine/finance/statements/BalanceSheet.ts` | 442 | Assets, liabilities, equity |
| `engine/finance/statements/CashFlowStatement.ts` | 210 | Operating, investing, financing cash flows |
| `engine/finance/statements/StatementIntegration.ts` | 483 | Cross-statement validation, generation orchestrator |
| `engine/finance/types.ts` | -- | Financial statement type definitions |
| `engine/finance/statements/index.ts` | -- | Barrel export |
| `engine/finance/index.ts` | -- | Barrel export |

### 2.5 Achievements (18 files)

| File | Role |
|---|---|
| `engine/achievements/AchievementEngine.ts` | Core evaluation engine |
| `engine/achievements/LedgerEngine.ts` | Achievement ledger / persistence |
| `engine/achievements/types.ts` | Achievement type definitions |
| `engine/achievements/integration.ts` | Hook into round processing |
| `engine/achievements/index.ts` | Barrel export |
| `engine/achievements/definitions/factory.ts` | Factory achievement definitions |
| `engine/achievements/definitions/finance.ts` | Finance achievement definitions |
| `engine/achievements/definitions/hr.ts` | HR achievement definitions |
| `engine/achievements/definitions/index.ts` | Definition barrel export |
| `engine/achievements/definitions/logistics.ts` | Logistics achievement definitions |
| `engine/achievements/definitions/marketing.ts` | Marketing achievement definitions |
| `engine/achievements/definitions/mega.ts` | Mega / cross-cutting achievements |
| `engine/achievements/definitions/news.ts` | News ticker achievement definitions |
| `engine/achievements/definitions/overview.ts` | Overview achievement definitions |
| `engine/achievements/definitions/rd.ts` | R&D achievement definitions |
| `engine/achievements/definitions/results.ts` | Results achievement definitions |
| `engine/achievements/definitions/secret.ts` | Secret / hidden achievements |
| `engine/achievements/definitions/supply-chain.ts` | Supply chain achievement definitions |

### 2.6 Economy (3 files -- ~917 LOC)

| File | LOC | Role |
|---|---|---|
| `engine/economy/EconomyEngine.ts` | 469 | GDP, inflation, consumer confidence simulation |
| `engine/economy/EconomicCycle.ts` | 448 | Boom/bust cycle generation |
| `engine/economy/index.ts` | -- | Barrel export |

### 2.7 Events (2 files -- ~1,163 LOC)

| File | LOC | Role |
|---|---|---|
| `engine/events/EventEngine.ts` | 1,163 | Random event generation, effect application |
| `engine/events/index.ts` | -- | Barrel export |

### 2.8 Explainability (3 files -- ~723+ LOC)

| File | LOC | Role |
|---|---|---|
| `engine/explainability/ExplainabilityEngine.ts` | 723 | Score breakdown, "why did I rank X?" |
| `engine/explainability/types.ts` | -- | Explanation type definitions |
| `engine/explainability/index.ts` | -- | Barrel export |

### 2.9 Experience (2 files -- 304 LOC)

| File | LOC | Role |
|---|---|---|
| `engine/experience/ExperienceCurve.ts` | 304 | Learning-curve / cost-reduction over time |
| `engine/experience/index.ts` | -- | Barrel export |

### 2.10 Intelligence (2 files -- 599 LOC)

| File | LOC | Role |
|---|---|---|
| `engine/intelligence/CompetitiveIntelligence.ts` | 599 | Competitor analysis, market intel reports |
| `engine/intelligence/index.ts` | -- | Barrel export |

### 2.11 Logistics (4 files -- LOC varies)

| File | Role |
|---|---|
| `engine/logistics/LogisticsEngine.ts` | Shipping, routing, delivery time |
| `engine/logistics/routes.ts` | Route definitions and costs |
| `engine/logistics/types.ts` | Logistics type definitions |
| `engine/logistics/index.ts` | Barrel export |

### 2.12 Machinery (4 files -- 577+ LOC)

| File | LOC | Role |
|---|---|---|
| `engine/machinery/MachineryEngine.ts` | 577 | Machine purchase, maintenance, depreciation |
| `engine/machinery/MachineCatalog.ts` | -- | Available machine definitions |
| `engine/machinery/types.ts` | -- | Machinery type definitions |
| `engine/machinery/index.ts` | -- | Barrel export |

### 2.13 Materials (6 files)

| File | Role |
|---|---|
| `engine/materials/MaterialEngine.ts` | Order processing, inventory, holding costs |
| `engine/materials/MaterialIntegration.ts` | Integration with production pipeline |
| `engine/materials/FinanceIntegration.ts` | Material costs -> financial statements |
| `engine/materials/suppliers.ts` | Supplier catalog and lead times |
| `engine/materials/types.ts` | Material type definitions |
| `engine/materials/index.ts` | Barrel export |

### 2.14 Satisfaction (2 files -- 430 LOC)

| File | LOC | Role |
|---|---|---|
| `engine/satisfaction/SatisfactionEngine.ts` | 430 | Customer satisfaction scoring |
| `engine/satisfaction/index.ts` | -- | Barrel export |

### 2.15 Supply Chain (2 files -- 582 LOC)

| File | LOC | Role |
|---|---|---|
| `engine/supplychain/SupplyChainEngine.ts` | 582 | End-to-end supply chain management |
| `engine/supplychain/index.ts` | -- | Barrel export |

### 2.16 Tariffs (4 files)

| File | Role |
|---|---|
| `engine/tariffs/TariffEngine.ts` | Tariff calculation, round events |
| `engine/tariffs/scenarios.ts` | Pre-defined tariff scenarios |
| `engine/tariffs/types.ts` | Tariff type definitions |
| `engine/tariffs/index.ts` | Barrel export |

### 2.17 Config (6 files -- ~1,330 LOC)

| File | LOC | Role |
|---|---|---|
| `engine/config/defaults.ts` | 470 | Default configuration values |
| `engine/config/schema.ts` | 415 | Zod schema for config validation |
| `engine/config/loader.ts` | 341 | Config loading, merging, validation |
| `engine/config/gamePresets.ts` | 104 | Game mode presets (quick, standard, advanced) |
| `engine/config/presets/index.ts` | -- | Preset barrel export |
| `engine/config/index.ts` | -- | Config barrel export |

### 2.18 Types (16 files)

`engine/types/`: `index.ts`, `state.ts`, `decisions.ts`, `archetypes.ts`, `factory.ts`, `employee.ts`, `product.ts`, `market.ts`, `results.ts`, `competition.ts`, `features.ts`, `patents.ts`, `achievements.ts`, `economy.ts`, `facilitator.ts`, `machineryRequirements.ts`

### 2.19 Utils (2 files)

| File | Role |
|---|---|
| `engine/utils/index.ts` | Seeded random, helpers |
| `engine/utils/stateUtils.ts` | Deep clone for state and decisions |

### 2.20 Root Export (1 file)

| File | Role |
|---|---|
| `engine/index.ts` | Public API barrel export |

---

## 3. Server / API Layer

### 3.1 tRPC Router Inventory

| Router | File | Procedures |
|---|---|---|
| `game` | `server/api/routers/game.ts` | getByJoinCode, create, start, getById, listFacilitatorGames, processRound, getGameState, getTeamStates, getRoundHistory, getMarketState, getRoundResults, getTeamRoundResults, explainTeamScore, getAchievements, getFacilitatorReport, updateComplexity |
| `team` | `server/api/routers/team.ts` | join, getMe, getCurrentState, getPreviousStates, logout |
| `decision` | `server/api/routers/decision.ts` | submit, getDecisions, validateDecisions, previewDecisionResults |
| `facilitator` | `server/api/routers/facilitator.ts` | register, login, logout, me, updatePassword |
| `material` | `server/api/routers/material.ts` | getMaterialsState, getSuppliers, getMaterialRequirements, getRecommendedOrders, placeOrder, getOrders, getSourcingChoices |
| `achievement` | `server/api/routers/achievement.ts` | getAllDefinitions, getById, getByCategory, getByTier, getVisible, getPositive, getInfamy, getSecret |

**Total tRPC procedures: ~38 across 6 routers.**

Supporting files: `server/api/root.ts` (router composition), `server/api/trpc.ts` (context, middleware), `server/api/shared/constants.ts`, `server/db/index.ts` (Prisma client).

---

## 4. Existing Test Inventory (30 Vitest + 9 Playwright = 39 total)

### 4.1 Vitest Tests (30 files, ~10,200 LOC)

| Category | File | What It Covers |
|---|---|---|
| **Engine Core** | `engine/__tests__/SimulationEngine.test.ts` | processRound end-to-end, state factories, determinism |
| **Engine / Archetypes** | `__tests__/engine/archetypes.test.ts` | Team archetype strategies |
| **Engine / Competition** | `__tests__/engine/competition.test.ts` | Market competition mechanics |
| **Engine / Dynamic Pricing** | `__tests__/engine/dynamic-pricing.test.ts` | Price elasticity, dynamic pricing |
| **Engine / Facilitator** | `__tests__/engine/facilitator-reports.test.ts` | Facilitator report generation |
| **Engine / Feature Demand** | `__tests__/engine/feature-demand.test.ts` | Feature-driven demand curves |
| **Engine / Patents** | `__tests__/engine/patents.test.ts` | Patent filing, valuation, expiry |
| **Engine / Achievements** | `__tests__/engine/achievements.test.ts` | Achievement evaluation |
| **Logic** | `__tests__/logic/initial-state.test.ts` | Initial state correctness |
| **Logistics** | `__tests__/logistics/LogisticsEngine.test.ts` | Logistics routing, delivery |
| **Materials** | `__tests__/materials/MaterialEngine.test.ts` | Material orders, inventory |
| **Materials / Kits** | `__tests__/materials/KitSystem.test.ts` | Kit assembly system |
| **Tariffs** | `__tests__/tariffs/TariffEngine.test.ts` | Tariff calculation, scenarios |
| **Audit** | `__tests__/audit/formula-audit.test.ts` | Formula consistency audit |
| **Balance** | `__tests__/balance/game-balance.test.ts` | Game balance verification |
| **Strategy** | `__tests__/strategy/four-team-strategy.test.ts` | 4-team strategy simulation |
| **Strategy** | `__tests__/strategy/ten-round-strategies.test.ts` | 10-round strategy simulation |
| **E2E (Vitest)** | `__tests__/e2e/game-flow.test.ts` | Full game flow (engine-level) |
| **E2E (Vitest)** | `__tests__/e2e/realistic-gameplay.test.ts` | Realistic multi-round gameplay |
| **E2E (Vitest)** | `__tests__/e2e/multi-strategy-balance.test.ts` | Multiple strategies compete |
| **E2E (Vitest)** | `__tests__/e2e/five-team-stress.test.ts` | 5-team stress test |

### 4.2 Playwright Tests (9 files, ~3,800 LOC)

| File | What It Covers |
|---|---|
| `e2e/auth.spec.ts` | Authentication flows |
| `e2e/complete-game-cycle.spec.ts` | Full game lifecycle via browser |
| `e2e/comprehensive-value-test.spec.ts` | Value/state verification in UI |
| `e2e/department-pages.spec.ts` | Department page navigation and display |
| `e2e/facilitator.spec.ts` | Facilitator dashboard flows |
| `e2e/four-team-strategy.spec.ts` | 4-team competitive gameplay in browser |
| `e2e/full-game-flow.spec.ts` | End-to-end game flow via browser |
| `e2e/game-navigation.spec.ts` | Game navigation and routing |
| `e2e/team-join.spec.ts` | Team join flow |

**Playwright config:** Single Chromium project, sequential execution (1 worker), 60s timeout, dev server auto-start.

---

## 5. Coverage Gap Analysis

This is the most critical section. It identifies every engine subsystem with **zero dedicated test coverage**.

### 5.1 Severity Classification

| Severity | Definition |
|---|---|
| **CRITICAL** | Core financial/game logic with zero tests -- bugs here corrupt game state or produce wrong outcomes |
| **HIGH** | Significant gameplay system with zero tests -- bugs degrade player experience or break features |
| **MEDIUM** | Supporting system with zero tests -- bugs cause incorrect reports or secondary effects |
| **LOW** | Configuration or utility with zero tests -- bugs cause setup failures or minor issues |

### 5.2 Gap Inventory

| # | Subsystem | Files | LOC | Severity | Risk Description |
|---|---|---|---|---|---|
| G-01 | **FinanceModule.process()** | FinanceModule.ts | 626 | **CRITICAL** | Loans, buybacks, dividends, and market cap calculations have no isolated unit tests. Bugs silently corrupt cash balances for every team every round. |
| G-02 | **Financial Statements** | IncomeStatement.ts, BalanceSheet.ts, CashFlowStatement.ts, StatementIntegration.ts | 1,371 | **CRITICAL** | The entire GAAP-style reporting pipeline (IS, BS, CF, cross-statement validation) has zero tests. Accounting errors propagate to EPS, rankings, and facilitator reports. |
| G-03 | **EventEngine** | EventEngine.ts | 1,163 | **HIGH** | Random game events (market crashes, supply disruptions, regulatory changes) are completely untested. A single broken event modifier can warp the entire game economy. |
| G-04 | **EconomyEngine + EconomicCycle** | EconomyEngine.ts, EconomicCycle.ts | 917 | **HIGH** | GDP, inflation, consumer confidence, and boom/bust cycles have zero tests. These feed directly into demand calculations and market state evolution. |
| G-05 | **SupplyChainEngine** | SupplyChainEngine.ts | 582 | **HIGH** | End-to-end supply chain management is untested. Interacts with materials, logistics, and production. |
| G-06 | **MachineryEngine** | MachineryEngine.ts, MachineCatalog.ts | 577+ | **HIGH** | Machine purchase, maintenance, and depreciation logic is untested. Affects factory capacity and CAPEX. |
| G-07 | **ExplainabilityEngine** | ExplainabilityEngine.ts | 723 | **MEDIUM** | "Why did I rank X?" explanations are untested. Player-facing feature; wrong explanations erode trust. |
| G-08 | **SatisfactionEngine** | SatisfactionEngine.ts | 430 | **MEDIUM** | Customer satisfaction scoring is untested. Feeds into brand value and repeat purchase rates. |
| G-09 | **CompetitiveIntelligence** | CompetitiveIntelligence.ts | 599 | **MEDIUM** | Competitor analysis reports are untested. Player-facing strategic information may be inaccurate. |
| G-10 | **ExperienceCurve** | ExperienceCurve.ts | 304 | **MEDIUM** | Learning-curve cost reduction is untested. Affects long-game production economics. |
| G-11 | **Expansion Modules (5)** | FactoryExpansions.ts, HRExpansions.ts, RDExpansions.ts, MarketingExpansions.ts, FinanceExpansions.ts | 3,069 | **HIGH** | All five advanced-mode expansion modules have zero tests. These add automation, M&A, hedging, culture programs, IP licensing, and more. A single bug in any expansion can cascade through the module it extends. |
| G-12 | **Config System** | loader.ts, schema.ts, defaults.ts, gamePresets.ts | 1,330 | **LOW** | Config loading, Zod validation, and preset selection are untested. Bad defaults or failed validation would break game initialization. |
| G-13 | **tRPC Routers** | game.ts, team.ts, decision.ts, facilitator.ts, material.ts, achievement.ts | ~38 procedures | **HIGH** | Zero server-side API tests for any of the 38 tRPC procedures. Auth, data fetching, mutation side-effects, and error handling are all unverified at the API layer. |
| G-14 | **Shared Test Utilities** | (none exist) | 0 | **LOW** | No shared testkit, factories, or fixtures. Every test file re-creates state from scratch, leading to duplication and inconsistency. |

### 5.3 Gap Summary by LOC

```
Untested engine code:  ~11,691 LOC  (across gaps G-01 through G-12)
Untested server code:  ~38 procedures (G-13, LOC not counted)
Total engine code:     ~34,900 LOC
Estimated coverage:    ~66% of engine LOC has zero dedicated tests
```

---

## 6. Coverage Heat Map

```
                          Test Coverage Heat Map
                     (darker = more coverage, blank = zero)

  CORE
  +---------------------------+
  | SimulationEngine    [###] |  Has dedicated test file + E2E coverage
  | EngineContext        [## ] |  Indirectly tested via SimulationEngine
  +---------------------------+

  MODULES (processRound pipeline)
  +---------------------------+
  | FactoryModule       [### ] |  Tested via engine tests, archetypes, strategy
  | HRModule            [### ] |  Tested via engine tests, archetypes, strategy
  | RDModule            [##  ] |  Tested via patents, feature-demand, archetypes
  | MarketingModule     [##  ] |  Tested via archetypes, competition
  | FinanceModule       [    ] |  ZERO isolated tests (G-01)
  +---------------------------+

  MARKET
  +---------------------------+
  | MarketSimulator     [####] |  Tested: competition, pricing, archetypes, E2E
  +---------------------------+

  FINANCIAL STATEMENTS
  +---------------------------+
  | IncomeStatement     [    ] |  ZERO tests (G-02)
  | BalanceSheet        [    ] |  ZERO tests (G-02)
  | CashFlowStatement   [    ] |  ZERO tests (G-02)
  | StatementIntegration[    ] |  ZERO tests (G-02)
  +---------------------------+

  SUBSYSTEMS
  +---------------------------+
  | MaterialEngine      [##  ] |  Has dedicated tests
  | TariffEngine        [##  ] |  Has dedicated tests
  | LogisticsEngine     [##  ] |  Has dedicated tests
  | AchievementEngine   [##  ] |  Has dedicated tests
  | EventEngine         [    ] |  ZERO tests (G-03)
  | EconomyEngine       [    ] |  ZERO tests (G-04)
  | EconomicCycle       [    ] |  ZERO tests (G-04)
  | SupplyChainEngine   [    ] |  ZERO tests (G-05)
  | MachineryEngine     [    ] |  ZERO tests (G-06)
  | ExplainabilityEngine[    ] |  ZERO tests (G-07)
  | SatisfactionEngine  [    ] |  ZERO tests (G-08)
  | CompetitiveIntel    [    ] |  ZERO tests (G-09)
  | ExperienceCurve     [    ] |  ZERO tests (G-10)
  +---------------------------+

  EXPANSIONS
  +---------------------------+
  | FactoryExpansions   [    ] |  ZERO tests (G-11)
  | HRExpansions        [    ] |  ZERO tests (G-11)
  | RDExpansions        [    ] |  ZERO tests (G-11)
  | MarketingExpansions [    ] |  ZERO tests (G-11)
  | FinanceExpansions   [    ] |  ZERO tests (G-11)
  +---------------------------+

  CONFIG
  +---------------------------+
  | loader.ts           [    ] |  ZERO tests (G-12)
  | schema.ts           [    ] |  ZERO tests (G-12)
  | defaults.ts         [    ] |  ZERO tests (G-12)
  | gamePresets.ts      [    ] |  ZERO tests (G-12)
  +---------------------------+

  API LAYER
  +---------------------------+
  | game router         [    ] |  ZERO server tests (G-13)
  | team router         [    ] |  ZERO server tests (G-13)
  | decision router     [    ] |  ZERO server tests (G-13)
  | facilitator router  [    ] |  ZERO server tests (G-13)
  | material router     [    ] |  ZERO server tests (G-13)
  | achievement router  [    ] |  ZERO server tests (G-13)
  +---------------------------+

  Legend:  [####] = strong    [### ] = good    [##  ] = partial
           [#   ] = minimal   [    ] = ZERO
```

---

## 7. Dependency Graph (Testing Impact Analysis)

Understanding how untested systems feed into tested systems is critical for assessing real risk.

```
Config (G-12)
  |
  v
createInitialTeamState() ---> ALL tests depend on correct defaults
  |
  v
+------------------------------------------------------------------+
|                    processRound() pipeline                        |
|                                                                   |
|  Materials --> Tariffs --> Factory --> HR --> R&D --> Marketing    |
|     [##]        [##]       [###]    [###]  [##]     [##]          |
|                                                                   |
|  --> Finance (G-01) --> Events (G-03)                             |
|       [ZERO]              [ZERO]                                  |
+------------------------------------------------------------------+
          |
          v
  MarketSimulator [####]
          |
          v
  +--------------------------------------------+
  |  Post-market calculations                   |
  |  FinancialStatements (G-02) [ZERO]          |
  |  EPS, MarketCap, SharePrice                 |
  |  Rankings                                   |
  +--------------------------------------------+
          |
          v
  EconomyEngine (G-04) [ZERO] --> next MarketState
          |
          v
  ExplainabilityEngine (G-07) [ZERO] --> player explanations
  SatisfactionEngine (G-08) [ZERO] --> customer satisfaction
  CompetitiveIntelligence (G-09) [ZERO] --> competitor reports
  ExperienceCurve (G-10) [ZERO] --> cost reduction over time
          |
          v
  tRPC Routers (G-13) [ZERO] --> client receives data
```

**Key insight:** Gaps G-01 (FinanceModule) and G-02 (Financial Statements) sit in the critical path of every round. Every team's cash, EPS, rankings, and share price flow through these untested subsystems. A bug here affects every player in every game.

---

## 8. Test Infrastructure Assessment

### 8.1 Current Setup

| Component | Tool | Config File |
|---|---|---|
| Unit / Integration | Vitest 4.x | `vitest.config.ts` |
| Browser E2E | Playwright 1.57 | `playwright.config.ts` |
| Linting | ESLint 9 | `eslint.config.mjs` |
| Type checking | TypeScript 5 | `tsconfig.json` |
| Database | Prisma (SQLite / PostgreSQL) | `prisma/schema.prisma` |

### 8.2 Vitest Configuration

- Environment: Node
- Globals: enabled (`describe`, `it`, `expect` available without import)
- Path alias: `@/` maps to project root
- Excludes: `e2e/` directory (Playwright tests), `node_modules/`
- No coverage reporter configured
- No setup files configured

### 8.3 Playwright Configuration

- Browser: Chromium only (single project)
- Workers: 1 (sequential execution)
- Timeout: 60 seconds per test
- Retries: 1 locally, 2 in CI
- Artifacts: screenshots on failure, video and trace on first retry
- Dev server: auto-started via `npm run dev` when testing locally

### 8.4 Test Script Inventory

| Script | Command | Purpose |
|---|---|---|
| `npm test` | `vitest` | Watch mode |
| `npm run test:run` | `vitest run` | Single run (CI) |
| `npm run e2e` | `playwright test` | Playwright suite |
| `npm run e2e:ui` | `playwright test --ui` | Playwright UI mode |
| `npm run e2e:headed` | `playwright test --headed` | Headed browser |

### 8.5 Infrastructure Gaps

1. **No coverage reporting** -- Vitest supports `--coverage` with `@vitest/coverage-v8` or `@vitest/coverage-istanbul`, but neither is configured. There is no way to measure or track coverage trends.
2. **No shared test utilities** -- Every test file creates its own state from scratch. There is no `testkit/`, `fixtures/`, or factory helper library.
3. **No CI pipeline visible** -- No `.github/workflows/`, `Jenkinsfile`, or similar CI config was found in the project root. Tests may only run locally.
4. **No snapshot testing** -- For a deterministic engine, snapshot testing of round outputs would catch regressions cheaply.
5. **No mutation testing** -- No Stryker or similar tool configured. High line coverage could still miss logic errors.

---

## 9. Risk-Prioritized Testing Roadmap

Based on the gap analysis, the following phases are recommended, ordered by risk and dependency.

### Phase 1: Critical Path (Blocks everything)

| Priority | Gap | What to Test | Estimated Tests |
|---|---|---|---|
| P0 | **G-14** | Create shared testkit: state factories, decision builders, assertion helpers | 0 (infrastructure) |
| P0 | **G-01** | FinanceModule.process(): loans, buybacks, dividends, interest, market cap | 15-20 |
| P0 | **G-02** | Financial Statements: IS, BS, CF generation + cross-validation | 20-25 |

### Phase 2: Game Economy (High gameplay impact)

| Priority | Gap | What to Test | Estimated Tests |
|---|---|---|---|
| P1 | **G-03** | EventEngine: event generation, effect application, edge cases | 15-20 |
| P1 | **G-04** | EconomyEngine + EconomicCycle: GDP, inflation, boom/bust | 10-15 |
| P1 | **G-05** | SupplyChainEngine: supply chain disruptions, optimization | 10-12 |
| P1 | **G-06** | MachineryEngine: purchase, maintenance, depreciation | 10-12 |

### Phase 3: Expansion Modules (Advanced mode)

| Priority | Gap | What to Test | Estimated Tests |
|---|---|---|---|
| P2 | **G-11** | All 5 expansion modules: each feature path, integration with base module | 30-40 |

### Phase 4: Player-Facing Systems

| Priority | Gap | What to Test | Estimated Tests |
|---|---|---|---|
| P2 | **G-07** | ExplainabilityEngine: score breakdowns, explanation accuracy | 8-10 |
| P2 | **G-08** | SatisfactionEngine: satisfaction scoring, edge cases | 8-10 |
| P2 | **G-09** | CompetitiveIntelligence: report accuracy, data completeness | 8-10 |
| P3 | **G-10** | ExperienceCurve: learning curve math, boundary conditions | 5-8 |

### Phase 5: API Layer

| Priority | Gap | What to Test | Estimated Tests |
|---|---|---|---|
| P2 | **G-13** | tRPC routers: auth, input validation, happy path, error cases | 40-50 |

### Phase 6: Configuration

| Priority | Gap | What to Test | Estimated Tests |
|---|---|---|---|
| P3 | **G-12** | Config loader, schema validation, preset correctness | 10-15 |

**Estimated total new tests needed: 190-250**

---

## 10. Determinism Testing Strategy

The engine provides a determinism guarantee: same seed + same decisions = identical outputs. This property is invaluable for testing but is not currently verified systematically.

### 10.1 Recommended Determinism Tests

1. **Seed replay:** Run processRound with seed S and decisions D. Run again with same S and D. Assert outputs are byte-identical (use `auditTrail.finalStateHashes`).
2. **Cross-team isolation:** Verify that adding/removing a team from the input does not change other teams' results (each team gets its own RNG context).
3. **Round independence:** Verify that processing round N twice with the same state produces the same output, regardless of what happened in round N-1's processing.
4. **Seed sensitivity:** Verify that different seeds produce different outputs (no hardcoded values bypassing RNG).

### 10.2 Regression Snapshot Strategy

For each "golden" scenario (e.g., 4-team 10-round standard game), capture:
- All 40 `finalStateHashes` (4 teams x 10 rounds)
- All market states across 10 rounds
- Final rankings

Store as Vitest inline snapshots. Any engine change that alters these hashes signals a regression or intentional formula change.

---

## 11. Stress Test Dimensions

These are the axes along which the engine should be stress-tested in subsequent phases.

| Dimension | Range | What Breaks |
|---|---|---|
| **Team count** | 1, 2, 4, 8, 16, 32 | Array indexing, market share division by zero, memory |
| **Round count** | 1, 5, 10, 20, 50, 100 | Numeric overflow, runaway values, memory leaks |
| **Decision extremes** | All-zero, all-max, contradictory | Validation gaps, negative cash, impossible states |
| **Cash extremes** | 0, 1, MAX_SAFE_INTEGER | Division by zero, overflow, precision loss |
| **Empty state** | No factories, no employees, no products | Null references, empty array iteration |
| **Concurrent rounds** | Parallel processRound calls | State mutation, shared mutable references |
| **Config permutations** | Every preset, custom configs | Initialization failures, invalid defaults |
| **Event saturation** | 0 events, 50 events per round | Performance, compounding effects |

---

## 12. Definitions and Conventions

### 12.1 Test Categories Used in This Project

| Category | Location | Runner | Description |
|---|---|---|---|
| Unit | `engine/__tests__/`, `__tests__/engine/` | Vitest | Single module/function isolation |
| Integration | `__tests__/materials/`, `__tests__/logistics/`, `__tests__/tariffs/` | Vitest | Multi-module interaction |
| Strategy | `__tests__/strategy/` | Vitest | Multi-round competitive scenarios |
| Balance | `__tests__/balance/` | Vitest | Game balance verification |
| Audit | `__tests__/audit/` | Vitest | Formula consistency checks |
| E2E (engine) | `__tests__/e2e/` | Vitest | Full pipeline without browser |
| E2E (browser) | `e2e/` | Playwright | Full stack through browser |

### 12.2 File Naming Conventions

- Vitest: `*.test.ts`
- Playwright: `*.spec.ts`
- Engine source: PascalCase (e.g., `FactoryModule.ts`, `SimulationEngine.ts`)
- Type files: camelCase (e.g., `state.ts`, `decisions.ts`)

---

## 13. Appendix: Quick Reference

### 13.1 Run All Vitest Tests

```bash
npm run test:run
```

### 13.2 Run All Playwright Tests

```bash
npm run e2e
```

### 13.3 Run a Single Test File

```bash
npx vitest run __tests__/engine/competition.test.ts
```

### 13.4 Run Tests in Watch Mode

```bash
npm test
```

### 13.5 Engine File Count by Directory

| Directory | Files |
|---|---|
| `engine/core/` | 2 |
| `engine/modules/` | 13 |
| `engine/market/` | 1 |
| `engine/finance/` | 7 |
| `engine/achievements/` | 18 |
| `engine/economy/` | 3 |
| `engine/events/` | 2 |
| `engine/explainability/` | 3 |
| `engine/experience/` | 2 |
| `engine/intelligence/` | 2 |
| `engine/logistics/` | 4 |
| `engine/machinery/` | 4 |
| `engine/materials/` | 6 |
| `engine/satisfaction/` | 2 |
| `engine/supplychain/` | 2 |
| `engine/tariffs/` | 4 |
| `engine/config/` | 6 |
| `engine/types/` | 16 |
| `engine/utils/` | 2 |
| `engine/` (root) | 1 |
| **Total** | **88** |

---

**End of Phase 0 -- Testing Map**

*This document serves as the foundation for all subsequent Miyazaki QA phases. Every test written from this point forward should reference a gap ID (G-01 through G-14) and contribute to closing the coverage holes identified here.*
