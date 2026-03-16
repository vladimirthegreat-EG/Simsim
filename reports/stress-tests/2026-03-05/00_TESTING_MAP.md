# SIMSIM-Caliber-V2: Testing Map
**Generated:** 2026-03-05
**Engine Version:** 2.0.0 / Schema 2.0.0

---

## 1. Directory Tree (Engine — 101 .ts files)

```
engine/                              (1 file: index.ts)
  core/                              (2 files)
    SimulationEngine.ts              — Main orchestrator, processRound()
    EngineContext.ts                  — Mulberry32 PRNG, SeedBundle, DeterministicIDGenerator
  types/                             (16 files)
    index.ts                         — CONSTANTS object (all balance values), ComplexityPresets
    state.ts                         — TeamState interface
    decisions.ts                     — AllDecisions, per-module decision types
    factory.ts                       — Factory, Region, Segment, FactoryUpgrade
    employee.ts                      — Employee, EmployeeStats, BenefitsPackage
    product.ts                       — Product interface
    archetypes.ts                    — 15+ phone archetypes
    market.ts                        — MarketState, SegmentDemand, DynamicPriceExpectation
    results.ts                       — RoundResults, ModuleResult
    competition.ts                   — Scoring, rankings
    features.ts                      — Feature system
    patents.ts                       — Patent types
    achievements.ts                  — Achievement types
    economy.ts                       — Economic cycle types
    facilitator.ts                   — Facilitator report types
    machineryRequirements.ts         — Machinery requirement types
  modules/                           (13 files)
    FactoryModule.ts                 — Production, upgrades, ESG
    HRModule.ts                      — Hiring, training, turnover
    RDModule.ts                      — R&D budget, product dev, tech tree
    MarketingModule.ts               — Advertising, brand, pricing
    FinanceModule.ts                 — Debt, equity, dividends, market cap
    PatentEngine.ts                  — Patent filing & challenges
    AchievementEngine.ts             — Achievement evaluation
    FacilitatorReportEngine.ts       — Report generation
    FactoryExpansions.ts             — Factory expansion logic
    HRExpansions.ts                  — HR expansion logic
    RDExpansions.ts                  — R&D expansion logic
    MarketingExpansions.ts           — Marketing expansion logic
    FinanceExpansions.ts             — Finance expansion logic
  market/                            (1 file)
    MarketSimulator.ts               — Softmax competition, 5-dimension scoring
  machinery/                         (4 files)
    MachineCatalog.ts                — 15 machine type definitions
    MachineryEngine.ts               — Breakdown, maintenance, health
    types.ts                         — Machine type interfaces
    index.ts                         — Re-exports
  materials/                         (6 files)
    MaterialEngine.ts                — Material ordering, costs, holding
    MaterialIntegration.ts           — Integration with production
    FinanceIntegration.ts            — Financial impact of materials
    suppliers.ts                     — Supplier selection by region
    types.ts                         — Material types
    index.ts                         — Re-exports
  tariffs/                           (4 files)
    TariffEngine.ts                  — Tariff calculation, scenarios
    scenarios.ts                     — 4 tariff scenarios
    types.ts                         — Tariff types
    index.ts                         — Re-exports
  events/                            (2 files)
    EventEngine.ts                   — Crisis/opportunity events
    index.ts                         — Re-exports
  finance/                           (2 + 5 files)
    index.ts                         — Re-exports
    types.ts                         — FinancialStatements type
    statements/                      (5 files)
      IncomeStatement.ts             — Income statement generation
      CashFlowStatement.ts           — Cash flow generation
      BalanceSheet.ts                — Balance sheet generation
      StatementIntegration.ts        — Cross-statement reconciliation
      index.ts                       — Re-exports
  achievements/                      (5 + 13 files)
    AchievementEngine.ts             — Evaluation engine
    LedgerEngine.ts                  — Achievement ledger
    integration.ts                   — Integration helpers
    types.ts                         — Achievement types
    index.ts                         — Re-exports
    definitions/                     (13 files)
      index.ts, factory.ts, finance.ts, hr.ts, logistics.ts,
      marketing.ts, mega.ts, news.ts, overview.ts, rd.ts,
      results.ts, secret.ts, supply-chain.ts
  economy/                           (3 files)
    EconomicCycle.ts                 — Markov chain transitions
    EconomyEngine.ts                 — Economy processing
    index.ts                         — Re-exports
  experience/                        (2 files)
    ExperienceCurve.ts               — Learning curve effects
    index.ts                         — Re-exports
  explainability/                    (3 files)
    ExplainabilityEngine.ts          — Score decomposition, narratives
    types.ts                         — Explainability types
    index.ts                         — Re-exports
  intelligence/                      (2 files)
    CompetitiveIntelligence.ts       — Competitor analysis
    index.ts                         — Re-exports
  logistics/                         (4 files)
    LogisticsEngine.ts               — Route optimization
    routes.ts                        — Route definitions
    types.ts                         — Logistics types
    index.ts                         — Re-exports
  satisfaction/                      (2 files)
    SatisfactionEngine.ts            — Customer satisfaction scoring
    index.ts                         — Re-exports
  supplychain/                       (2 files)
    SupplyChainEngine.ts             — Supply chain management
    index.ts                         — Re-exports
  config/                            (5 + 1 files)
    defaults.ts                      — Default config values
    gamePresets.ts                   — Quick/Standard/Full presets
    schema.ts                        — Config schema
    loader.ts                        — Config loader
    index.ts                         — Re-exports
    presets/index.ts                 — Preset re-exports
  utils/                             (2 files)
    index.ts                         — cloneTeamState, cloneDecisions, helpers
    (stateUtils referenced from SimulationEngine)
```

---

## 2. Entrypoints

| File | Export | Signature | Purpose |
|------|--------|-----------|---------|
| `engine/core/SimulationEngine.ts` | `SimulationEngine.processRound` | `(input: SimulationInput) => SimulationOutput` | Main round orchestrator |
| `engine/core/SimulationEngine.ts` | `SimulationEngine.createInitialTeamState` | `(config?, presetConfig?) => TeamState` | Initial state factory |
| `engine/core/SimulationEngine.ts` | `SimulationEngine.createInitialMarketState` | `() => MarketState` | Market state factory |
| `engine/core/SimulationEngine.ts` | `SimulationEngine.validateDecisions` | `(state, decisions) => { valid, errors, correctedDecisions }` | Decision validation |
| `engine/core/EngineContext.ts` | `createEngineContext` | `(matchSeed: string, roundNumber: number, teamId: string) => EngineContext` | Context factory |
| `engine/core/EngineContext.ts` | `createTestContext` | `(seed?, roundNumber?, teamId?) => EngineContext` | Test helper |
| `engine/core/EngineContext.ts` | `deriveSeedBundle` | `(matchSeed: string, roundNumber: number) => SeedBundle` | Seed derivation |
| `engine/core/EngineContext.ts` | `hashState` | `(state: unknown) => string` | State hashing |
| `engine/modules/FactoryModule.ts` | `FactoryModule.process` | `(state, decisions, ctx) => { newState, result }` | Factory processing |
| `engine/modules/HRModule.ts` | `HRModule.process` | `(state, decisions, ctx) => { newState, result }` | HR processing |
| `engine/modules/RDModule.ts` | `RDModule.process` | `(state, decisions, ctx) => { newState, result }` | R&D processing |
| `engine/modules/MarketingModule.ts` | `MarketingModule.process` | `(state, decisions) => { newState, result }` | Marketing processing |
| `engine/modules/FinanceModule.ts` | `FinanceModule.process` | `(state, decisions, marketState) => { newState, result }` | Finance processing |
| `engine/market/MarketSimulator.ts` | `MarketSimulator.simulate` | `(teams[], marketState, options, ctx?) => MarketResult` | Market competition |
| `engine/market/MarketSimulator.ts` | `MarketSimulator.calculateRankings` | `(teams[], marketResult) => Ranking[]` | Team rankings |

---

## 3. Existing Test Inventory

### Unit Tests (__tests__/ + engine/__tests__/) — 420 test cases across 19 files

| File | Domain | Test Count |
|------|--------|-----------|
| `__tests__/audit/formula-audit.test.ts` | Formula verification | 65 |
| `engine/__tests__/SimulationEngine.test.ts` | Core pipeline | 44 |
| `__tests__/balance/game-balance.test.ts` | Game balance | 41 |
| `__tests__/tariffs/TariffEngine.test.ts` | Tariff system | 27 |
| `__tests__/engine/archetypes.test.ts` | Product archetypes | 26 |
| `__tests__/logistics/LogisticsEngine.test.ts` | Logistics | 25 |
| `__tests__/engine/achievements.test.ts` | Achievements | 24 |
| `__tests__/e2e/game-flow.test.ts` | Full game flow | 24 |
| `__tests__/materials/MaterialEngine.test.ts` | Materials | 22 |
| `__tests__/strategy/ten-round-strategies.test.ts` | Strategy testing | 20 |
| `__tests__/logic/initial-state.test.ts` | Initial state | 19 |
| `__tests__/engine/competition.test.ts` | Competition | 18 |
| `__tests__/engine/patents.test.ts` | Patents | 17 |
| `__tests__/engine/feature-demand.test.ts` | Feature demand | 15 |
| `__tests__/engine/dynamic-pricing.test.ts` | Dynamic pricing | 15 |
| `__tests__/engine/facilitator-reports.test.ts` | Facilitator reports | 7 |
| `__tests__/e2e/multi-strategy-balance.test.ts` | Multi-strategy | 6 |
| `__tests__/e2e/realistic-gameplay.test.ts` | Realistic gameplay | 4 |
| `__tests__/strategy/four-team-strategy.test.ts` | 4-team strategy | 1 |

### E2E Tests (e2e/) — 71 test cases across 9 files

| File | Domain | Test Count |
|------|--------|-----------|
| `e2e/comprehensive-value-test.spec.ts` | Value testing | 20 |
| `e2e/complete-game-cycle.spec.ts` | Full game cycle | 15 |
| `e2e/facilitator.spec.ts` | Facilitator flows | 9 |
| `e2e/team-join.spec.ts` | Team joining | 7 |
| `e2e/four-team-strategy.spec.ts` | 4-team strategy | 6 |
| `e2e/game-navigation.spec.ts` | Navigation | 4 |
| `e2e/auth.spec.ts` | Authentication | 4 |
| `e2e/full-game-flow.spec.ts` | Full flow | 4 |
| `e2e/department-pages.spec.ts` | Department pages | 2 |

---

## 4. Module Responsibility Matrix

| Module | Owns | Key Functions | Inputs | Outputs |
|--------|------|---------------|--------|---------|
| **SimulationEngine** | Round orchestration (13 steps) | `processRound()`, `createInitialTeamState()`, `createInitialMarketState()`, `validateDecisions()` | `SimulationInput` | `SimulationOutput` |
| **FactoryModule** | Production, 20 upgrades (4 tiers), 14+ ESG initiatives, new factories | `process()`, `createNewFactory()` | TeamState, FactoryDecisions, ctx | { newState, result } |
| **HRModule** | Hiring (3 tiers), firing, turnover, training, salary, 7 benefits | `process()` | TeamState, HRDecisions, ctx | { newState, result } |
| **RDModule** | R&D budget, product dev (15+ archetypes), tech tree (4 tiers), patents | `process()` | TeamState, RDDecisions, ctx | { newState, result } |
| **MarketingModule** | Advertising (per-segment), branding, 6 sponsorships, pricing | `process()` | TeamState, MarketingDecisions | { newState, result } |
| **FinanceModule** | Debt instruments, equity, dividends, market cap, 15 board proposal types, credit rating | `process()`, `updateMarketCap()` | TeamState, FinanceDecisions, MarketState | { newState, result } |
| **MarketSimulator** | 5-dimension scoring, softmax(T=4) allocation, rubber-banding | `simulate()`, `calculateRankings()`, `generateNextMarketState()` | teams[], MarketState, options, ctx? | MarketResult |
| **MachineryEngine** | 15 machine types, breakdowns, health, maintenance | Via FactoryModule | Machine catalog, health state | Breakdown/maintenance results |
| **PatentEngine** | Patent filing, challenges, bonuses | — | R&D points, decisions | Patent awards |
| **EventEngine** | Crisis/opportunity events | — | Round state | Event effects |
| **AchievementEngine** | 221 achievements, 12 categories, 6 tiers | `evaluate()` | TeamState, history | Earned achievements |
| **Financial Statements** | Income, CashFlow, BalanceSheet, reconciliation | `generate()` | TeamState, previous statements | FinancialStatements |
| **ExplainabilityEngine** | Score decomposition, narratives, delta explanations | — | Scoring data | Breakdown reports |
| **EconomicCycle** | Markov chain transitions | — | Current state | Next economic state |
| **ExperienceCurve** | Learning curve effects on production | — | History | Efficiency modifiers |
| **CompetitiveIntelligence** | Competitor analysis | — | All team states | Intel reports |
| **LogisticsEngine** | Route optimization | — | Regions, quantities | Optimal routes |
| **SatisfactionEngine** | Customer satisfaction scoring | — | Product/service data | Satisfaction scores |
| **SupplyChainEngine** | Supply chain management | — | Orders, suppliers | Supply chain state |
| **MaterialEngine** | Raw material ordering, inventory, holding costs | `processOrders()`, `calculateHoldingCosts()` | Material state, round | Updated inventory |
| **TariffEngine** | 4 tariff scenarios, trade agreements, geopolitics | `processRoundEvents()`, `initializeTariffState()` | TariffState, round | Updated tariffs |

---

## 5. Processing Pipeline (Module Dependencies)

```
SimulationEngine.processRound():
  1. deriveSeedBundle(matchSeed, round)         — EngineContext
  2. cloneTeamState(team.state)                 — utils/stateUtils
  3. MaterialEngine.processOrders()             — materials (if present)
     TariffEngine.processRoundEvents()          — tariffs (if present)
  4. FactoryModule.process(state, decisions, ctx) — depends on: materials, machinery
  5. HRModule.process(state, decisions, ctx)     — depends on: factory (headcount)
  6. RDModule.process(state, decisions, ctx)     — depends on: HR (engineers)
  7. MarketingModule.process(state, decisions)   — depends on: products (from R&D)
  8. FinanceModule.process(state, decisions, ms) — depends on: marketState
  9. applyEvents(state, events)                 — modifies: efficiency, morale, brand, cash, esg
 10. MarketSimulator.simulate(teams, ms, opts)  — depends on: ALL module outputs
 11. cash += revenue                            — CRITICAL: revenue from MarketSimulator
 12. FinancialStatementsEngine.generate()       — depends on: final state
 13. hashState(finalState)                      — audit trail
```

---

## 6. Decision Converter Mapping

| UI Slice | Converter | Engine Type | Key Transformations |
|----------|-----------|-------------|---------------------|
| `factory` | `convertFactoryDecisions()` | `FactoryDecisions` | Splits `upgradePurchases` into factory upgrades vs machinery purchases using `MACHINE_TYPES` set |
| `hr` | `convertHRDecisions()` | `HRDecisions` | Maps `recruitmentSearches` → engine recruitment, `selectedCandidates` → hires |
| `rd` | `convertRDDecisions()` | `RDDecisions` | Maps `newProducts` with archetype IDs, tech upgrades, patent filings |
| `marketing` | `convertMarketingDecisions()` | `MarketingDecisions` | Maps `adBudgets` → per-segment advertising, `brandActivities` → sponsorships via `BRAND_ACTIVITY_MAP` |
| `finance` | `convertFinanceDecisions()` | `FinanceDecisions` | Direct mapping of financial instrument decisions |

---

## 7. Zustand Store Shape (decisionStore.ts)

```typescript
{
  factory: UIFactoryDecisions;      // upgradePurchases, productionAllocations, newFactories
  hr: UIHRDecisions;                // recruitmentSearches, selectedCandidates, trainingPrograms
  rd: UIRDDecisions;                // rdInvestment, newProducts, techUpgrades, patentFilings
  marketing: UIMarketingDecisions;  // adBudgets, brandInvestment, brandActivities, promotions
  finance: UIFinanceDecisions;      // stockIssuance, sharesBuyback, loanRequest, dividends
  submissionStatus: Record<Module, { isSubmitted: boolean }>;
}
```

---

## 8. Database Models (Prisma)

| Model | Key Fields | JSON Blobs |
|-------|-----------|------------|
| Facilitator | id, email, name, passwordHash | — |
| Game | id, name, joinCode (6-char unique), status, currentRound, maxRounds | config |
| Team | id, name, color, sessionToken (unique) | currentState |
| Round | id, roundNumber, status | marketState, events, simulationLog |
| TeamDecision | id, module (enum string), isLocked | decisions |
| RoundResult | id, rank | stateAfter, metrics, factoryResults, financeResults, hrResults, marketingResults, rdResults |

**Cascade:** Game → Team (cascade), Game → Round (cascade), Team → TeamDecision (cascade), Team → RoundResult (cascade)

---

## 9. Package.json Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Dev server |
| `build` | `prisma generate && prisma db push && next build` | Production build |
| `test` | `vitest` | Unit tests (watch mode) |
| `test:run` | `vitest run` | Unit tests (single run) |
| `e2e` | `playwright test` | E2E tests |
| `db:use-sqlite` | `cp prisma/schema.sqlite.prisma prisma/schema.prisma && prisma generate` | Switch to SQLite |
| `db:use-postgres` | `cp prisma/schema.postgresql.prisma prisma/schema.prisma && prisma generate` | Switch to PostgreSQL |
| `db:push` | `prisma db push` | Push schema to DB |
| `db:studio` | `prisma studio` | DB GUI |

---

## 10. Static Data Files (/data/)

| File | Content | Used By |
|------|---------|---------|
| `gameGlossary.ts` | Business term definitions | GlossaryPanel component |
| `tutorialSteps.ts` | Tutorial content (3 depth levels) | TutorialGuide component |
| `breakthroughEvents.ts` | Special R&D breakthrough events | EventEngine, R&D module |
| `contractOrders.ts` | NPC contract order definitions | Contract system in TeamState |
| `supplyChainEvents.ts` | Supply chain disruption events | SupplyChainEngine |

---

## 11. Test Coverage Gaps

### Modules with ZERO dedicated test coverage:
- **FactoryModule** — no `factory.test.ts`
- **HRModule** — no `hr.test.ts`
- **RDModule** — no `rd.test.ts` (only archetypes tested)
- **MarketingModule** — no `marketing.test.ts`
- **FinanceModule** — no `finance.test.ts`
- **MachineryEngine** — no `machinery.test.ts`
- **EventEngine** — no `events.test.ts`
- **FinancialStatements** — no `statements.test.ts`
- **ExplainabilityEngine** — no `explainability.test.ts`
- **EconomicCycle** — no `economy.test.ts`
- **ExperienceCurve** — no `experience.test.ts`
- **SatisfactionEngine** — no `satisfaction.test.ts`
- **SupplyChainEngine** — no `supplychain.test.ts`
- **CompetitiveIntelligence** — no `intelligence.test.ts`
- **Decision Converters** — no `converters.test.ts`
- **State Cloning** — no `cloning.test.ts`

### Modules with SOME coverage:
- **SimulationEngine** — 44 tests (engine/__tests__/SimulationEngine.test.ts)
- **MarketSimulator** — 18 tests (competition) + 15 (dynamic pricing) + 15 (feature demand)
- **Achievements** — 24 tests
- **Patents** — 17 tests
- **Materials** — 22 tests
- **Tariffs** — 27 tests
- **Logistics** — 25 tests
- **Archetypes** — 26 tests
- **Formula audit** — 65 tests (cross-cutting)
- **Game balance** — 41 tests (cross-cutting)
- **Game flow** — 24+6+4 tests (integration)

---

## 12. Known Pre-existing TypeScript Errors

| File | Error | Impact |
|------|-------|--------|
| `app/(game)/game/[gameId]/factory/page.tsx` | `esgScore` property not recognized on tRPC return type | UI compilation |
| `app/(game)/game/[gameId]/rnd/page.tsx` | `rdPoints` not on TeamState | UI compilation |
| `app/(game)/game/[gameId]/supply-chain/page.tsx` | `cash` not recognized on tRPC return type | UI compilation |
| Various test files | Missing properties on mock objects | Test compilation |

---

## 13. Key Constants (from CONSTANTS object)

| Category | Constant | Value |
|----------|----------|-------|
| Starting | DEFAULT_STARTING_CASH | $175,000,000 |
| Starting | DEFAULT_MARKET_CAP | $500,000,000 |
| Starting | DEFAULT_SHARES_ISSUED | 10,000,000 |
| Factory | NEW_FACTORY_COST | $50,000,000 |
| Factory | BASE_DEFECT_RATE | 0.06 (6%) |
| Factory | MAX_EFFICIENCY | 1.0 |
| Factory | EFFICIENCY_PER_MILLION | 0.02 |
| HR | BASE_TURNOVER_RATE | 0.125 (12.5%) |
| HR | WORKERS_PER_MACHINE | 2.75 |
| HR | WORKERS_PER_SUPERVISOR | 15 |
| HR | BASE_WORKER_OUTPUT | 100 units |
| HR | BASE_RD_POINTS_PER_ENGINEER | 5 |
| HR | MAX_SALARY | $500,000 |
| Marketing | ADVERTISING_BASE_IMPACT | 0.0011 (0.11%) |
| Marketing | ADVERTISING_DECAY | 0.2 (20%) |
| Marketing | BRANDING_BASE_IMPACT | 0.003 (0.3%) |
| Marketing | BRAND_DECAY_RATE | 0.01 (1%) |
| Marketing | BRAND_MAX_GROWTH_PER_ROUND | 0.04 (4%) |
| Market | SOFTMAX_TEMPERATURE | 4 |
| Market | RUBBER_BAND_LEADING_PENALTY | 0.80 |
| Market | RUBBER_BAND_THRESHOLD | 0.30 |
| R&D | RD_BUDGET_TO_POINTS_RATIO | 100,000 |
| Finance | ESG_PENALTY_THRESHOLD | 300 |
| Finance | ESG_PENALTY_MAX | 0.12 (12%) |
| Supply | INVENTORY_HOLDING_COST | 0.02 (2%) |

---

## 14. Existing Balance/Analysis Tools

```
tools/balance/
  harness.ts              — Test harness for running simulations
  strategies.ts           — Predefined strategy profiles
  metrics.ts              — Balance metrics collection
  parameter-sweep.ts      — Parameter sweep analysis
  comprehensive-sweep.ts  — Full parameter sweep
  run-monte-carlo.ts      — Monte Carlo runner
  validate-strategies.ts  — Strategy validation
  index.ts                — Re-exports
  BALANCE-LOG.md          — Balance change log

tools/scripts/
  strategy-test.ts                  — Strategy testing
  monte-carlo-analysis.ts           — MC analysis
  monte-carlo-all-strategies.ts     — All strategies MC
  monte-carlo-comprehensive.ts      — Comprehensive MC
  monte-carlo-full-report.ts        — Full MC report
  generate-monte-carlo-report.ts    — Report generation
  parameter-sweep-analysis.ts       — Sweep analysis
  extended-strategy-validation.ts   — Extended validation
```

---

## 15. Verification Checklist

- [x] All 101 .ts files under engine/ accounted for
- [x] package.json scripts documented
- [x] Vitest config analyzed (environment: node, excludes: e2e/)
- [x] Playwright config analyzed (chromium, sequential, 60s timeout)
- [x] All 16 type definition files in engine/types/ documented
- [x] All 13 achievement definition files documented
- [x] Static data files (/data/) and their roles documented
- [x] Decision converter mapping documented
- [x] Zustand store shape documented
- [x] All 6 tRPC routers identified
- [x] Database schema (SQLite variant) documented
- [x] Coverage gaps identified (16 modules with zero coverage)
- [x] Known TS errors catalogued
- [x] Test run commands: `npm run test:run` (unit), `npm run e2e` (E2E)
