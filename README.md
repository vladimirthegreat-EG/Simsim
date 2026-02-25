# SIMSIM Caliber V2 — Business Simulation Engine

A deterministic, multiplayer business simulation game where teams compete as smartphone manufacturers across 5 market segments. Built with Next.js 16, TypeScript, tRPC, Prisma, and a custom game engine with seeded RNG for full reproducibility.

**Live:** https://simsim-mu.vercel.app
**Stack:** Next.js 16.1.1 · React 19.2 · tRPC 11 · Prisma 5 · PostgreSQL (Supabase) · Zustand 5 · Tailwind CSS 4
**Tests:** Vitest + Playwright

---

## Table of Contents

1. [What Is SIMSIM?](#what-is-simsim)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Project Structure](#project-structure)
5. [Architecture Overview](#architecture-overview)
6. [Engine Deep Dive](#engine-deep-dive)
   - [Simulation Pipeline](#simulation-pipeline)
   - [Deterministic RNG](#deterministic-rng)
   - [Factory Module](#factory-module)
   - [HR Module](#hr-module)
   - [R&D Module](#rd-module)
   - [Marketing Module](#marketing-module)
   - [Finance Module](#finance-module)
   - [Market Simulator](#market-simulator)
   - [Machinery System](#machinery-system)
   - [Materials & Supply Chain](#materials--supply-chain)
   - [Tariffs & Trade](#tariffs--trade)
   - [Event System](#event-system)
   - [Achievement System](#achievement-system)
   - [Financial Statements](#financial-statements)
   - [Explainability Engine](#explainability-engine)
7. [Game Constants & Balance](#game-constants--balance)
8. [Decision Flow: UI to Engine](#decision-flow-ui-to-engine)
9. [Database Schema](#database-schema)
10. [API Layer (tRPC)](#api-layer-trpc)
11. [Frontend Architecture](#frontend-architecture)
12. [Known Issues & Development State](#known-issues--development-state)

---

## What Is SIMSIM?

SIMSIM is a classroom/workshop-oriented multiplayer business simulation. A **facilitator** (instructor) creates a game session, and multiple **teams** (students/participants) join via a 6-character code. Each team runs a phone manufacturing company, making decisions about factory operations, hiring, marketing, R&D, and finance across multiple rounds. After each round, the simulation engine processes all decisions simultaneously, calculates market competition using softmax-based allocation, and produces rankings.

The game teaches:
- Operations management (factory efficiency, production capacity, supply chain)
- Human resources (hiring, training, benefits, morale, turnover)
- Marketing strategy (advertising, brand building, sponsorships, segment targeting)
- Research & development (product development, tech trees, patent strategy)
- Financial management (debt/equity, credit ratings, financial statements, stock price)
- ESG responsibility (environmental initiatives, ethical practices, regulatory risk)
- Competitive strategy (market positioning, first-mover advantage, segment crowding)

### Game Flow

```
Facilitator creates game  →  Teams join via code  →  Game starts
     ↓                                                    ↓
Teams make decisions       ←  Results displayed  ←  Engine processes round
(R&D → Factory → Finance     (rankings, financials,   (all teams simultaneously)
 → HR → Marketing)             market share, events)      ↓
     ↓                                              Facilitator advances round
     +────────────────────────────────────────────→ Repeat until maxRounds
                                                         ↓
                                                   Game Complete
                                                 (Rankings by Achievement Score)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.1.1 (App Router, Turbopack) |
| Language | TypeScript 5.x |
| UI | React 19.2, Tailwind CSS 4, shadcn/ui (Radix primitives) |
| State | Zustand 5.x (client decision store) |
| Charts | Recharts 3.6 |
| Animation | Framer Motion 12.x |
| API | tRPC 11 + TanStack React Query 5 |
| Database | Prisma 5 (PostgreSQL or SQLite) |
| Auth | Supabase Auth (facilitators) / Session tokens (teams) |
| Validation | Zod 4.x |
| Forms | React Hook Form 7.x |
| Testing | Vitest 4 (unit), Playwright 1.57 (e2e) |
| Icons | Lucide React |
| Toasts | Sonner |

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up database (SQLite for local dev)
npm run db:use-sqlite
npm run db:push

# Start development server
npm run dev
```

**Environment variables** (create `.env`):
```env
DATABASE_URL="file:./dev.db"                # SQLite (local dev)
# DATABASE_URL="postgresql://..."           # PostgreSQL (production)
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

**Available scripts:**

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server (Turbopack) |
| `npm run build` | `prisma generate && prisma db push && next build` |
| `npm start` | Start production server |
| `npm test` | Run Vitest in watch mode |
| `npm run test:run` | Run all tests once |
| `npm run e2e` | Run Playwright e2e tests |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:use-sqlite` | Switch to SQLite schema |
| `npm run db:use-postgres` | Switch to PostgreSQL schema |

---

## Project Structure

```
SIMSIM-Caliber-V2/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Landing page
│   ├── (auth)/                       # Auth routes
│   │   ├── login/page.tsx            # Facilitator login
│   │   └── join/page.tsx             # Team join (6-char code)
│   ├── (facilitator)/admin/          # Facilitator dashboard
│   │   ├── page.tsx                  # Admin home
│   │   └── games/[gameId]/page.tsx   # Game management
│   ├── (game)/game/[gameId]/         # Main game routes (per team)
│   │   ├── layout.tsx                # Game layout with sidebar nav
│   │   ├── page.tsx                  # Overview dashboard
│   │   ├── factory/page.tsx          # Factory management (~3500 lines)
│   │   ├── hr/page.tsx               # Human resources
│   │   ├── rnd/page.tsx              # Research & development
│   │   ├── marketing/page.tsx        # Marketing & brand
│   │   ├── finance/page.tsx          # Financial management
│   │   ├── results/page.tsx          # Round results
│   │   ├── achievements/page.tsx     # Achievement tracking
│   │   ├── market/page.tsx           # Market intelligence
│   │   ├── logistics/page.tsx        # Logistics
│   │   ├── supply-chain/page.tsx     # Supply chain
│   │   └── news/page.tsx             # News & events
│   ├── demo/                         # Demo mode (no auth)
│   │   ├── layout.tsx, page.tsx, mockData.ts
│   │   └── [module]/page.tsx         # Mirror of game routes
│   ├── dev-login/page.tsx            # Dev login bypass
│   └── api/trpc/[trpc]/route.ts      # tRPC API handler
│
├── engine/                           # Game simulation engine (100+ files)
│   ├── core/
│   │   ├── SimulationEngine.ts       # Main orchestrator — processRound()
│   │   └── EngineContext.ts          # Deterministic RNG (Mulberry32)
│   ├── types/                        # Type definitions (18 files)
│   │   ├── index.ts                  # CONSTANTS object (all balance values)
│   │   ├── state.ts                  # TeamState interface
│   │   ├── decisions.ts              # AllDecisions, per-module types
│   │   ├── factory.ts                # Factory, Region, Segment
│   │   ├── employee.ts               # Employee roles, stats, benefits
│   │   ├── product.ts                # Product, archetypes, features
│   │   ├── archetypes.ts             # 15+ phone archetypes
│   │   ├── market.ts                 # MarketState, demand, FX
│   │   ├── results.ts                # RoundResults, ModuleResult
│   │   ├── competition.ts            # Scoring, rankings
│   │   ├── features.ts               # Feature system
│   │   ├── patents.ts                # Patent types
│   │   ├── achievements.ts           # Achievement types
│   │   ├── economy.ts                # Economic cycle types
│   │   └── facilitator.ts            # Facilitator report types
│   ├── modules/                      # Core game modules
│   │   ├── FactoryModule.ts          # Production, upgrades, ESG
│   │   ├── HRModule.ts               # Hiring, training, turnover
│   │   ├── RDModule.ts               # R&D budget, product dev, tech tree
│   │   ├── MarketingModule.ts        # Advertising, brand, pricing
│   │   ├── FinanceModule.ts          # Debt, equity, dividends, market cap
│   │   ├── PatentEngine.ts           # Patent filing & challenges
│   │   ├── AchievementEngine.ts      # Achievement evaluation
│   │   ├── FacilitatorReportEngine.ts
│   │   └── *Expansions.ts            # Factory/HR/RD/Marketing/Finance expansions
│   ├── market/MarketSimulator.ts     # Competition scoring (softmax)
│   ├── machinery/                    # 15 machine types
│   │   ├── MachineCatalog.ts, MachineryEngine.ts, types.ts
│   ├── materials/                    # Raw material supply chain
│   ├── tariffs/                      # Trade tariffs & geopolitics
│   ├── events/EventEngine.ts         # Crisis & opportunity events
│   ├── finance/statements/           # Income, CashFlow, BalanceSheet
│   ├── achievements/definitions/     # 12 category definition files
│   ├── economy/                      # Economic cycles (Markov chain)
│   ├── experience/                   # Learning curves
│   ├── explainability/               # Score breakdowns, narratives
│   ├── intelligence/                 # Competitive intelligence
│   ├── logistics/                    # Route optimization
│   ├── satisfaction/                 # Customer satisfaction
│   ├── supplychain/                  # Supply chain management
│   ├── config/                       # Engine configuration system
│   └── utils/                        # cloneTeamState, helpers
│
├── components/                       # React components
│   ├── ui/                           # shadcn/ui base (20+ components)
│   ├── game/                         # Game-specific (30+ components)
│   ├── charts/                       # Recharts wrappers (6)
│   ├── facilitator/                  # Admin components (9)
│   ├── achievements/                 # Achievement display (4)
│   ├── hr/, market/, rd/             # Module-specific components
│   └── shared/                       # ErrorBoundary, AnimatedCard, LoadingState
│
├── lib/                              # Client-side libraries
│   ├── stores/
│   │   ├── decisionStore.ts          # Zustand store (all module decisions)
│   │   └── tutorialStore.ts          # Tutorial progress
│   ├── hooks/                        # Preview hooks, cross-module warnings
│   ├── converters/decisionConverters.ts  # UI → engine decision mapping
│   ├── config/                       # Demand cycles, segment profiles
│   └── utils/                        # Archetype eligibility, play style
│
├── server/                           # Server-side code
│   ├── api/
│   │   ├── root.ts, trpc.ts          # tRPC setup
│   │   └── routers/                  # game, team, decision, facilitator, achievement, material
│   └── db/index.ts                   # Prisma client
│
├── prisma/                           # Database schemas
│   ├── schema.prisma                 # Active schema
│   ├── schema.postgresql.prisma      # PostgreSQL variant
│   └── schema.sqlite.prisma          # SQLite variant
│
├── data/                             # Static game data
│   ├── gameGlossary.ts               # Business term definitions
│   ├── tutorialSteps.ts              # Tutorial content (3 depth levels)
│   ├── breakthroughEvents.ts         # Special R&D events
│   ├── contractOrders.ts             # NPC contract orders
│   └── supplyChainEvents.ts          # Supply chain disruptions
│
├── __tests__/                        # Vitest unit tests
├── e2e/                              # Playwright e2e tests
└── tools/                            # Dev & balance tools
```

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                           BROWSER                                │
│                                                                  │
│  ┌──────────────┐   ┌───────────────┐   ┌─────────────────┐    │
│  │  Game Pages   │──▶│ Zustand Store  │──▶│ Preview Hooks   │    │
│  │  (factory,    │   │ (decisions)   │   │ (run engine     │    │
│  │   hr, rnd,    │   └───────┬───────┘   │  client-side    │    │
│  │   marketing,  │           │           │  for live       │    │
│  │   finance)    │           │           │  impact)        │    │
│  └───────────────┘           │           └─────────────────┘    │
│                              ▼                                   │
│                    ┌─────────────────┐                           │
│                    │ Decision        │                           │
│                    │ Converters      │                           │
│                    │ (UI → Engine)   │                           │
│                    └────────┬────────┘                           │
└─────────────────────────────┼────────────────────────────────────┘
                              │ tRPC mutation
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                           SERVER                                 │
│                                                                  │
│  ┌───────────────┐   ┌─────────────────────────────────────┐    │
│  │ tRPC Router   │──▶│       SimulationEngine               │    │
│  │ (game.ts,     │   │                                     │    │
│  │  team.ts)     │   │  processRound():                    │    │
│  └───────────────┘   │    1. Clone team states              │    │
│                      │    2. Materials & tariffs             │    │
│                      │    3. FactoryModule.process()         │    │
│                      │    4. HRModule.process()              │    │
│                      │    5. RDModule.process()              │    │
│                      │    6. MarketingModule.process()       │    │
│                      │    7. FinanceModule.process()         │    │
│                      │    8. Apply events                    │    │
│                      │    9. MarketSimulator.simulate()      │    │
│                      │   10. cash += revenue  ← CRITICAL    │    │
│                      │   11. Financial statements            │    │
│                      │   12. Achievements                    │    │
│                      │   13. Audit trail                     │    │
│                      └─────────────────────────────────────┘    │
│                                                                  │
│  ┌───────────┐                                                  │
│  │  Prisma   │  Game, Team, TeamState (JSON), Decisions, Results │
│  │  (DB)     │                                                  │
│  └───────────┘                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**
- **Engine is pure TypeScript** — no framework dependencies, runs client-side (previews) and server-side (round processing)
- **Deterministic via seeded RNG** — same seed + same decisions = identical output
- **Zustand for client decisions** — each module has its own decision slice
- **Preview hooks run the engine client-side** — users see live impact before saving
- **Decision converters** bridge UI types to engine types
- **State is a single JSON blob** — `TeamState` is the source of truth, stored in the database

---

## Engine Deep Dive

### Simulation Pipeline

`SimulationEngine.processRound(input)` is the main entry point:

```typescript
interface SimulationInput {
  roundNumber: number;
  teams: Array<{
    id: string;
    state: TeamState;
    decisions: AllDecisions;
  }>;
  marketState: MarketState;
  events?: GameEvent[];
  matchSeed?: string;
}

interface SimulationOutput {
  roundNumber: number;
  results: RoundResults[];
  newMarketState: MarketState;
  rankings: TeamRanking[];
  marketPositions: TeamMarketPosition[];
  summaryMessages: string[];
  auditTrail: { seedBundle, finalStateHashes, version };
}
```

**Processing pipeline (13 steps):**

1. **Seed generation** — matchSeed → SeedBundle with per-module seeds
2. **Clone states** — `cloneTeamState()` for safe mutation
3. **Materials** — check order arrivals, apply tariffs
4. **FactoryModule.process()** — production, efficiency, upgrades, ESG, machinery
5. **HRModule.process()** — hiring, firing, turnover, training, salary
6. **RDModule.process()** — R&D budget, product dev, tech tree
7. **MarketingModule.process()** — advertising, branding, pricing
8. **FinanceModule.process()** — debt, equity, dividends, market cap
9. **Apply events** — crisis/opportunity effects
10. **MarketSimulator.simulate()** — competition scoring, softmax market share
11. **`cash += revenue`** — add revenue to cash (modules already deducted costs)
12. **Financial statements** — generate Income, CashFlow, BalanceSheet
13. **Audit trail** — store seed bundle, state hashes for replay

---

### Deterministic RNG

All randomness flows through `EngineContext`, wrapping a **Mulberry32 PRNG**.

```typescript
// Seed derivation
matchSeed → hash → roundSeed
roundSeed → per-module seeds (factory, hr, marketing, rd, finance, market)
per-module seed + teamId → per-team RNG instance

// Usage
const ctx = createEngineContext(matchSeed, roundNumber, teamId);
ctx.random();                    // 0-1 float
ctx.randomInt(min, max);
ctx.generateId("machine");       // "machine-team1-r3-001"
```

**Golden rule:** Same `matchSeed` + same decisions = bit-identical output.

IDs are counter-based: `{type}-{teamId}-r{round}-{counter}`. No `Date.now()` or `Math.random()`.

---

### Factory Module

**`FactoryModule.process(state, decisions, ctx) → { newState, result }`**

**Operations:** efficiency investments, factory upgrades (20 types), ESG initiatives (14 types), new factories ($50M each), machinery via MachineryEngine.

**Production formula:**
```
production = capacity × efficiency × (1 - defectRate)
defectRate = 0.06 - (avgAccuracy/100 × 0.04) - sixSigmaBonus
efficiency = base(0.7) + investments + upgrades    // capped at 1.0
efficiency/million = 0.02 (2% per $1M), diminishing after $10M
```

**20 factory upgrades across 4 tiers:**

| Tier | Upgrades | Cost Range |
|------|----------|-----------|
| 1 | Six Sigma ($75M), Warehousing ($100M), Lean Manufacturing ($40M), Continuous Improvement ($30M) | $30-100M |
| 2 | Automation ($75M), Material Refinement ($100M), Modular Lines ($80M), Water Recycling ($25M), Solar Panels ($45M) | $25-100M |
| 3 | Supply Chain ($200M), Digital Twin ($60M), IoT Integration ($50M), Waste-to-Energy ($35M), Smart Grid ($55M), Rapid Prototyping ($40M) | $35-200M |
| 4 | Advanced Robotics ($100M), Quality Lab ($60M), Carbon Capture ($70M), Flexible Manufacturing ($90M), Clean Room ($120M) | $60-120M |

**Key upgrade effects:**
- Six Sigma: -40% defects, -50% warranty, -75% recalls
- Automation: -35% unit cost, -80% workers needed
- Supply Chain: -70% shipping costs, -70% stockouts
- Advanced Robotics: +50% capacity, -30% labor

**Regional cost modifiers:** North America 1.0x, Europe 1.0x, Asia 0.85x, MENA 0.90x

**Cost deduction:** `newState.cash -= totalCosts` at end.

---

### HR Module

**`HRModule.process(state, decisions, ctx) → { newState, result }`**

**Recruitment tiers:**

| Tier | Cost | Candidates | Stat Range |
|------|------|-----------|------------|
| Basic | $5,000 | 4 | 70-110 |
| Premium | $15,000 | 6 | 90-130 |
| Executive | $50,000 | 8 | 120-160 |

**Employee roles:**

| Role | Base Salary | Output |
|------|-------------|--------|
| Worker | $45,000 | 100 units/round |
| Engineer | $85,000 | 5 R&D points/round |
| Supervisor | $75,000 | Manages 15 workers |

**Salary formula:**
```
salary = baseSalary × (0.8 + avgStat/100 × 1.4)
multiplier range: 0.8x to 2.2x, max $500K
hiring cost: 25% of annual salary (one-time)
```

**Turnover formula:**
```
baseTurnover = 12.5%
moraleFactor = 1 - (morale - 50) / 100
salaryFactor = 1 - (salaryVsMarket - 1)
turnoverCount = headcount × 0.125 × moraleFactor × salaryFactor
```

**Training costs:** Worker $50K, Engineer $75K, Supervisor $100K. Fatigue: -30% effectiveness per extra program beyond 1/year.

**Benefits (7 types):**

| Benefit | Cost/Employee | Morale Impact | Turnover Reduction |
|---------|--------------|--------------|-------------------|
| Health Insurance | $5K per 10pts | +15% | -10% |
| Retirement Match | $3K per 10pts | +10% | -8% |
| Paid Time Off | $200/day | +8% | -5% |
| Parental Leave | $1K/week | +5% | -3% |
| Stock Options | $2K | +12% | -7% |
| Flexible Work | $500 | +8% | -4% |
| Professional Dev | $1/$ budget | +5% | -3% |

---

### R&D Module

**`RDModule.process(state, decisions, ctx) → { newState, result }`**

**R&D point generation:**
```
budgetPoints = floor(rdBudget / 100,000)
engineerOutput = 5 × engineerCount × (1 + (avgInnovation - 65) / 100)
totalPoints = budgetPoints + engineerOutput
```

**Product development timeline:**
```
devRounds = max(1, base + (targetQuality - 50) × 0.01 - engineerSpeedup)
engineerSpeedup = min(0.5, engineerCount × 0.08)   // 8% per engineer, max 50%
```

**Product improvement costs (progressive):**

| Range | Quality Cost/Point | Feature Cost/Point |
|-------|-------------------|-------------------|
| 0-69 | $1M | $500K |
| 70-79 | $1.5M | $750K |
| 80-89 | $2.5M | $1.25M |
| 90+ | $5M | $2.5M |

**Tech tree (4 tiers, sequential):**

| Technology | Cost | Points Required | Prerequisite |
|-----------|------|----------------|-------------|
| Process Optimization | $5M | 100 | None |
| Advanced Manufacturing | $15M | 300 | Process Optimization |
| Industry 4.0 | $30M | 600 | Advanced Manufacturing |
| Breakthrough Tech | $50M | 1,000 | Industry 4.0 |

**Patent system:** Every 200 R&D points → 1 patent. Bonuses: +5 quality (max +25), -5% cost (max -25%), +3% market share (max +15%).

**Product archetypes:** 15+ phone templates (Basic Phone, Standard Phone, Entry Smartphone, Long-Life Phone, etc.) with preset feature distributions, suggested price ranges, and segment targeting. Unlock as tech prerequisites are met.

---

### Marketing Module

**`MarketingModule.process(state, decisions) → { newState, result }`**

**Advertising impact (per segment, chunked with diminishing returns):**
```
chunkSize = $1M
baseImpact = 0.11% brand per chunk
decay = 20% per chunk (each chunk is 0.8× the previous)

totalImpact = Σ(chunkImpact × 0.8^chunkNumber)

Segment multipliers: Budget 1.1x, General 1.0x, Enthusiast 0.75x, Professional 0.5x, Active 0.85x
```

**Branding investment:**
```
linear portion (≤$2M): investment × 0.003   // 0.3% per $1M
log portion (>$2M):    log2(1 + extra/$2M) × 1.5 × 0.003

brandValue = current × (1 - 0.01) + growth   // 1% decay per round, capped [0, 1]
max growth: 4% per round
```

**Brand critical mass thresholds:**
- Below 0.15 brand value: **-30%** market score (brand too weak)
- 0.15-0.55: 1.0x (normal)
- Above 0.55: **+10%** market score (brand premium)

**Sponsorships:**

| Sponsorship | Cost | Brand Impact |
|------------|------|-------------|
| Influencer Partnership | $3M | +0.6% |
| Gaming Tournament | $4.5M | +0.9% |
| Tech Conference | $7.5M | +1.2% |
| Retailer Partnership | $12M | +1.8% |
| Sports Jersey | $22M | +3.0% |
| National TV Campaign | $35M | +4.5% |

---

### Finance Module

**`FinanceModule.process(state, decisions, marketState) → { newState, result }`**

**Instruments:**
- **Treasury Bills** — short-term debt, lower interest
- **Corporate Bonds** — long-term debt
- **Bank Loans** — interest = amount × corpBondRate × termMonths/12
- **Stock Issuance** — shares × price = proceeds (dilutes EPS)
- **Share Buyback** — reduces shares, improves EPS, up to 15% price boost
- **Dividends** — cash payout per share

**Market cap calculation:**
```
targetPE = 15 (base)
  + min(10, epsGrowth × 50)           // growth premium
  + (sentiment - 50) / 5              // investor sentiment
  + profitBonus                       // +3 if margin>15%, -2 if low
  - leveragePenalty                   // -5 if D/E>1.0, -2 if D/E>0.6

marketCap = max(floor, EPS × shares × PE)
floor = max(bookValue × 0.5, totalAssets × 0.3)
sharePrice = marketCap / sharesIssued
```

**Financial ratios:** Current ratio, quick ratio, cash ratio, debt-to-equity, ROE, ROA, profit margin, gross margin, operating margin.

**Board proposals (10 types):** Dividend payout, global expansion, issue bonds, executive comp, R&D spend, spinoff, share buyback, emergency capital, vertical integration, debt refinancing. Approval probability: 10-95% based on financial health, ESG score, and proposal type.

---

### Market Simulator

**`MarketSimulator.simulate(teams, marketState, options, ctx)`**

The heart of competition. Determines who wins each market segment.

**5 Market Segments (scoring weights):**

| Segment | Demand | Price | Quality | Brand | ESG | Features |
|---------|--------|-------|---------|-------|-----|----------|
| Budget | 500K | **65%** | 15% | 5% | 5% | 10% |
| General | 400K | 28% | 23% | 17% | 10% | **22%** |
| Enthusiast | 200K | 12% | 30% | 8% | 5% | **45%** |
| Professional | 100K | 8% | **48%** | 7% | **20%** | 17% |
| Active Lifestyle | 150K | 20% | 34% | 10% | 10% | 26% |

**Scoring pipeline (per team, per segment):**

1. **Price Score** — sigmoid of advantage vs EMA-smoothed expected price
2. **Quality Score** — ratio vs segment expectation (Budget=50, General=65, Enthusiast=80, Professional=90, Active=70). sqrt bonus above, quadratic penalty below 70%
3. **Brand Score** — `sqrt(brandValue) × weight × criticalMassMultiplier`
4. **ESG Score** — `(esgScore / 1000) × sustainabilityPremium × weight`
5. **Feature Score** — dot product of product features vs segment preferences
6. **Weighted total** — `Σ(component × weight) / 100`

**Adjustments:** quality/feature cap 1.1x, brand critical mass (-30% to +10%), ESG penalty (up to -12% below score 300), crowding factor, first-mover bonus.

**Market share allocation (softmax with temperature=4):**
```
share_i = exp(score_i × 4) / Σ exp(score_j × 4)
```

At temperature=4: close scores (70,65,60,55) → ~46%, 28%, 17%, 10%. Clear leader (80,60,55,50) → ~79%, 11%, 6%, 4%.

**Revenue:** `unitsSold = totalDemand[segment] × marketShare[team]`, `revenue = unitsSold × price`.

**Rubber-banding (round ≥ 3):** Triggers when team share < 30% of average. Leading teams get 0.8x score penalty (-20%).

---

### Machinery System

15 machine types across 5 categories.

**Production Machines:**

| Machine | Cost | Capacity/Rd | Maint/Rd | Key Effects |
|---------|------|------------|----------|-------------|
| Assembly Line | $5M | 10,000 | $50K | — |
| CNC Machine | $8M | 3,000 | $80K | -1% defects, -10% labor |
| Welding Station | $4M | 5,000 | $45K | -0.5% defects, -5% labor |
| Injection Molder | $7M | 12,000 | $70K | -5% labor |
| PCB Assembler | $10M | 6,000 | $90K | -1.5% defects, -15% labor |
| Paint Booth | $3M | 8,000 | $35K | — |
| Laser Cutter | $6M | 4,000 | $55K | -1% defects, -10% labor |
| Robotic Arm | $12M | 8,000 | $100K | -1% defects, -20% labor |
| Conveyor System | $3M | 15,000 | $30K | -8% labor |
| Quality Scanner | $6M | 0 (utility) | $60K | -3% defects |
| Testing Rig | $4M | 0 (utility) | $40K | -2% defects, -3% labor |
| 3D Printer | $2M | 500 | $40K | -5% labor |
| Clean Room Unit | $15M | 2,000 | $150K | -4% defects |
| Packaging System | $2.5M | 20,000 | $25K | -10% labor, -5% shipping |
| Forklift Fleet | $1M | 0 (utility) | $15K | -3% labor, -10% shipping |

**Breakdown system:**
- Base chance: 2%/round
- Health multipliers: ≤20% → 5.0x, ≤40% → 3.0x, ≤60% → 1.5x, ≤80% → 1.0x, >80% → 0.5x
- Severity: Minor (50%, 10% loss), Moderate (30%, 25% loss), Major (15%, 50% loss), Critical (5%, 100% loss)

**Maintenance types:** Scheduled (1x cost, +25 health), Emergency (2.5x, +40 health), Major Overhaul (5x, +80 health).

---

### Materials & Supply Chain

Raw material ordering, inventory, supplier selection by region, lead time management (20-42 days).

**Unit costs by segment:** Budget $50, General $100, Enthusiast $200, Professional $350, Active $150. Plus labor $20 and overhead $15 per unit.

**Inventory holding cost:** 2% per round.

---

### Tariffs & Trade

Dynamic tariffs by region pair and material type. 4 scenarios: baseline, escalation, de-escalation, shock. Trade agreements reduce rates. Geopolitical events trigger changes.

---

### Event System

`EventEngine` generates crisis/opportunity events with player choices.

Events have probability, duration, effects (revenue/cost/brand/morale modifiers), and optional branching decisions the team must respond to.

---

### Achievement System

221 achievements across 12 categories, 6 tiers. **Achievement score is the primary victory metric.**

| Tier | Points |
|------|--------|
| Bronze | 10 |
| Silver | 25 |
| Gold | 50 |
| Platinum | 100 |
| Infamy | -25 (negative) |
| Secret | 75 (hidden) |

**Categories:** Overview, Factory, Finance, HR, Marketing, R&D, Supply Chain, Logistics, News, Results, Secret, Mega.

Tiebreaker: total revenue, then total market share.

---

### Financial Statements

Full three-statement model generated each round:

1. **Income Statement** — Revenue - COGS - Operating Expenses = Net Income
2. **Cash Flow Statement** — Operating + Investing + Financing
3. **Balance Sheet** — Assets = Liabilities + Equity

Includes reconciliation validation (cash flow change matches balance sheet change).

---

### Explainability Engine

Transparent breakdowns:
- Segment score decomposition (5 dimensions)
- Delta explanations (round-over-round change drivers)
- Driver trees (revenue & profit decomposition)
- Natural language narratives
- Competitor comparison percentiles

---

## Game Constants & Balance

### Starting State

| Parameter | Value |
|-----------|-------|
| Starting Cash | $175,000,000 |
| Market Cap | $500,000,000 |
| Shares Issued | 10,000,000 |
| Share Price | $50 |
| Brand Value | 0.0-0.5 (by preset) |
| ESG Score | 0-100 (by preset) |

### Game Presets

| Preset | Rounds | Workers | Engineers | Products | Cash | Brand |
|--------|--------|---------|-----------|----------|------|-------|
| Quick | 16 | 50 | 8 | 5 launched | $175M | 0.5 |
| Standard | 24 | 20 | 4 | 2 launched | $175M | 0.3 |
| Full | 32 | 0 | 0 | 0 | $175M | 0.0 |

### Difficulty Presets

| Setting | Simple | Standard | Advanced |
|---------|--------|----------|----------|
| Starting Cash | $300M | $200M | $150M |
| Market Volatility | 0.5x | 1.0x | 1.5x |
| Competitor Strength | 0.7x | 1.0x | 1.3x |
| Rubber-banding | Yes | Yes | No |

### Key Balance Constants

| Constant | Value | Purpose |
|----------|-------|---------|
| `DEFAULT_STARTING_CASH` | $175M | Initial cash balance |
| `NEW_FACTORY_COST` | $50M | Cost per new factory |
| `SOFTMAX_TEMPERATURE` | 4 | Market share allocation sharpness |
| `BASE_DEFECT_RATE` | 6% | Factory defect rate before improvements |
| `BASE_TURNOVER_RATE` | 12.5% | Annual employee turnover |
| `BASE_WORKER_OUTPUT` | 100 units | Production per worker per round |
| `WORKERS_PER_MACHINE` | 2.75 | Workers needed per machine |
| `WORKERS_PER_SUPERVISOR` | 15 | Ratio |
| `ADVERTISING_BASE_IMPACT` | 0.11% | Brand growth per $1M advertising |
| `ADVERTISING_DECAY` | 20% | Diminishing returns per chunk |
| `BRANDING_BASE_IMPACT` | 0.3% | Brand growth per $1M branding |
| `BRAND_DECAY_RATE` | 1% | Brand decay per round |
| `BRAND_MAX_GROWTH` | 4% | Max brand growth per round |
| `RD_BUDGET_TO_POINTS` | $100K/pt | R&D budget conversion rate |
| `BASE_RD_POINTS_PER_ENGINEER` | 5 | Engineer R&D output |
| `INVENTORY_HOLDING_COST` | 2%/round | Cost of unsold inventory |
| `RUBBER_BAND_LEADING_PENALTY` | 0.80 | -20% for leading teams |
| `RUBBER_BAND_THRESHOLD` | 0.30 | Trigger: share < avg × 0.3 |
| `ESG_PENALTY_THRESHOLD` | 300 | Below this: up to -12% revenue |

---

## Decision Flow: UI to Engine

Every game module follows the same pattern:

```
1. USER INTERACTION (React component)
   └──▶ Local state (useState)

2. STATE SYNC (useEffect, bidirectional)
   └──▶ Zustand store (decisionStore.ts)
        e.g., setFactoryDecisions({ upgradePurchases })

3. PREVIEW (custom hook, runs client-side)
   └──▶ decisionConverters.ts: UI types → Engine types
   └──▶ [Module].process(state, engineDecisions, ctx)
   └──▶ Returns previewState (live impact shown in UI)

4. SAVE (DecisionSubmitBar click)
   └──▶ tRPC mutation: team.submitDecisions
   └──▶ Server stores decisions in database
   └──▶ Pending state CLEARED from UI (critical pattern)

5. ROUND ADVANCE (facilitator triggers)
   └──▶ SimulationEngine.processRound()
   └──▶ All modules process all teams simultaneously
   └──▶ Market simulation runs
   └──▶ New state saved to database

6. NEXT ROUND
   └──▶ Client fetches new TeamState via tRPC query
   └──▶ UI reflects accumulated state
```

### Decision Store (Zustand)

```typescript
interface DecisionStore {
  factory: UIFactoryDecisions;    // upgradePurchases, productionAllocations, newFactories
  hr: UIHRDecisions;              // recruitmentSearches, selectedCandidates, trainingPrograms
  rd: UIRDDecisions;              // rdInvestment, newProducts, techUpgrades, patentFilings
  marketing: UIMarketingDecisions; // adBudgets, brandInvestment, brandActivities, promotions
  finance: UIFinanceDecisions;    // stockIssuance, sharesBuyback, loanRequest, dividends
  submissionStatus: Record<Module, { isSubmitted: boolean }>;
}
```

### Decision Converters (`lib/converters/decisionConverters.ts`)

- **Factory:** Splits `upgradePurchases` into factory upgrades vs machinery purchases using `MACHINE_TYPES` set. Machinery purchases go to `machineryDecisions.purchases`.
- **HR:** Maps `recruitmentSearches` to engine recruitment, `selectedCandidates` to hires
- **R&D:** Maps `newProducts` with archetype IDs, tech upgrades, patent filings
- **Marketing:** Maps `adBudgets` to per-segment advertising, `brandActivities` to engine sponsorships via `BRAND_ACTIVITY_MAP`
- **Finance:** Direct mapping of financial instrument decisions

### Submission Clearing Pattern

**Critical:** After saving decisions, all pending local state must be cleared. Each page watches `submissionStatus` and clears on fresh submission:

```typescript
useEffect(() => {
  const wasSubmitted = prevRef.current;
  const isNowSubmitted = submissionStatus.MODULE?.isSubmitted;
  prevRef.current = isNowSubmitted;
  if (!wasSubmitted && isNowSubmitted) {
    setPendingItems([]);  // Clear pending state
    // Auto-navigate to next module
  }
}, [submissionStatus.MODULE?.isSubmitted]);
```

Without this pattern, pending purchases/products remain visible even after being submitted to the engine.

### Module Submission Order

R&D → Factory → Finance → HR → Marketing (each page auto-navigates to the next).

---

## Database Schema

Prisma with dual-database support (PostgreSQL production, SQLite local dev).

**Core models:**

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **Facilitator** | Instructor account | email, name, passwordHash |
| **Game** | Game session | name, joinCode (6-char), status, currentRound, maxRounds, config (JSON) |
| **Team** | Playing team | name, color, sessionToken, currentState (JSON), achievementPoints |
| **Round** | Round record | roundNumber, status, marketState (JSON), events (JSON) |
| **TeamDecision** | Per-module decisions | module, decisions (JSON), isLocked |
| **RoundResult** | Post-round results | stateAfter (JSON), metrics (JSON), rank |
| **TeamAchievement** | Earned achievements | achievementId, earnedRound, pointsAwarded |
| **AchievementProgress** | Progress tracking | achievementId, currentValue, targetValue |

**Relationships:**
```
Facilitator 1──* Game 1──* Team
                      1──* Round 1──* TeamDecision (per team per module)
                                  1──* RoundResult (per team)
Team 1──* TeamDecision
Team 1──* RoundResult
Team 1──* TeamAchievement
```

Team auth uses session tokens (no user accounts for players). Teams join via 6-character game code.

---

## API Layer (tRPC)

| Router | Key Procedures |
|--------|---------------|
| `game` | create, join, getById, advanceRound, getMarketState |
| `team` | getMyState, submitDecisions, getDecisions |
| `decision` | save, load, getForRound |
| `facilitator` | getAllTeams, injectEvent, generateReport |
| `achievement` | getAll, getForTeam |
| `material` | placeOrder, getInventory |

---

## Frontend Architecture

### Game Pages

Each game module page follows a consistent pattern:

1. **Data loading:** `trpc.team.getMyState.useQuery()` — fetches current `TeamState`
2. **Decision store:** `useDecisionStore()` — provides decisions and setters
3. **Preview hook:** `use[Module]Preview(state, decisions)` — runs engine client-side
4. **Local state:** `useState` synced bidirectionally with Zustand store
5. **Submission detection:** `useEffect` watches `submissionStatus` to clear pending state
6. **Tab structure:** Most pages use `<Tabs>` with sub-sections

### Preview Hooks

Run the actual engine modules on the client for instant feedback:

```typescript
export function useFactoryPreview(state: TeamState | null, decisions: UIFactoryDecisions) {
  return useMemo(() => {
    const engineDecisions = convertFactoryDecisions(decisions, state);
    const ctx = createEngineContext("preview", state.round ?? 1, "preview");
    const { newState, result } = FactoryModule.process(state, engineDecisions, ctx);
    return { previewState: newState, result, costs: result.costs, messages: result.messages };
  }, [state, decisions]);
}
```

Available: `useFactoryPreview`, `useHRPreview`, `useRDPreview`, `useMarketingPreview`, `useFinancePreview`.

### Key Components

| Component | Purpose |
|-----------|---------|
| `GameLayout` | Main game chrome (sidebar, header, module nav) |
| `DecisionSubmitBar` | Save decisions button with module status |
| `FinancialStatements` | Full 3-statement renderer |
| `ArchetypeCatalog` | Product archetype browser |
| `TutorialGuide` | In-game tutorial (3 depth levels) |
| `GlossaryPanel` | Business term definitions |
| `CompetitiveIntel` | Competitor analysis |
| `MarketDashboard` | Market overview |

### Facilitator Components

| Component | Purpose |
|-----------|---------|
| `FacilitatorDashboard` | Live team monitoring |
| `EventInjectionPanel` | Inject market events mid-game |
| `PostGameReport` | Full analysis with team journeys |
| `DiscussionGuide` | Auto-generated debrief questions |
| `ParticipantScorecard` | Per-team scorecard |

---

## Known Issues & Development State

### Pre-existing TypeScript Errors (not blocking runtime)
- `factory/page.tsx`: `esgScore` property not recognized on tRPC return type
- `rnd/page.tsx`: `rdPoints` not on TeamState
- `supply-chain/page.tsx`: `cash` not recognized on tRPC return type
- Various test files: missing properties on mock objects

### Architecture Rules to Maintain
1. **Engine is pure TypeScript** — no React imports, no Next.js dependencies
2. **Modules are static classes** with `process()` as main entry point
3. **State mutations only on deep clones** — never mutate input state
4. **Preview hooks must use `createEngineContext`** for determinism
5. **Decision converters are the only bridge** between UI and engine types
6. **Pending state must clear on submission** (the `!wasSubmitted && isNowSubmitted` pattern)
7. **Cash accumulates across rounds** — modules deduct costs, SimulationEngine adds revenue. Never reset cash.
8. **No `Date.now()` or `Math.random()`** in engine code — use EngineContext

### Cash Flow (Critical)
Cash carries across rounds. Each round: modules deduct costs → market simulation → `cash += revenue`. Starting cash is only set once during game creation. This is the fundamental economic loop.

### Deployment
- **Vercel** with Supabase PostgreSQL
- Build: `prisma generate && prisma db push && next build`
- SQLite for local dev, PostgreSQL for production
