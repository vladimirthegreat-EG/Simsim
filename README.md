# Simsim - Multiplayer Business Simulation

A full-stack multiplayer business simulation where teams compete as phone manufacturing CEOs. Built with Next.js 16, tRPC, Prisma, PostgreSQL, and a deterministic simulation engine with 98+ modules.

**Live:** https://simsim-mu.vercel.app
**Stack:** Next.js 16 &middot; React 19 &middot; tRPC 11 &middot; Prisma 5 &middot; PostgreSQL (Supabase) &middot; Zustand &middot; Tailwind CSS 4
**Tests:** 420/420 passing (Vitest)

---

## Table of Contents

- [What Is Simsim?](#what-is-simsim)
- [How It Works](#how-it-works)
- [Game Flow](#game-flow)
- [Game Presets](#game-presets)
- [The Five Decision Modules](#the-five-decision-modules)
- [Market Simulation](#market-simulation)
- [Competitive Mechanics](#competitive-mechanics)
- [Financial System](#financial-system)
- [ESG (Environmental, Social, Governance)](#esg-environmental-social-governance)
- [Achievement System](#achievement-system)
- [Tech Tree & R&D Expansions](#tech-tree--rd-expansions)
- [Facilitator Tools](#facilitator-tools)
- [Tutorial System](#tutorial-system)
- [Engine Architecture](#engine-architecture)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Key Variables & Constants](#key-variables--constants)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Testing](#testing)

---

## What Is Simsim?

Simsim is a classroom/workshop-oriented multiplayer business simulation. A **facilitator** (instructor) creates a game session, and multiple **teams** (students/participants) join via a 6-character code. Each team runs a phone manufacturing company, making decisions about factory operations, hiring, marketing, R&D, and finance across multiple rounds. After each round, the simulation engine processes all decisions simultaneously, calculates market competition using softmax-based allocation, and produces rankings.

The game teaches:

- Operations management (factory efficiency, production capacity, supply chain)
- Human resources (hiring, training, benefits, morale, turnover)
- Marketing strategy (advertising, brand building, sponsorships, segment targeting)
- Research & development (product development, tech trees, patent strategy)
- Financial management (debt/equity, credit ratings, financial statements, stock price)
- ESG responsibility (environmental initiatives, ethical practices, regulatory risk)
- Competitive strategy (market positioning, first-mover advantage, segment crowding)

---

## How It Works

### High-Level Loop

```
Facilitator creates game  -->  Teams join via code  -->  Game starts
     |                                                        |
     v                                                        v
Teams make decisions         <--  Results displayed  <--  Engine processes round
(Factory, HR, Marketing,                                  (all teams simultaneously)
 R&D, Finance)                                                |
     |                                                        v
     +----> Facilitator advances round -----> Repeat until maxRounds
                                                              |
                                                              v
                                                     Game Complete
                                                   (Rankings + Achievements)
```

### Determinism Guarantee

The simulation engine is fully deterministic. All randomness flows through a **seeded RNG** system (`EngineContext`). Given the same seed and the same decisions, the engine produces identical outputs every time. Each team gets its own RNG context to prevent cross-contamination. An audit trail records seed bundles and final state hashes for verification and replay.

---

## Game Flow

1. **Facilitator creates a game** &mdash; picks a preset (Quick/Standard/Full), names the game, and receives a 6-character join code.
2. **Teams join** &mdash; navigate to `/join`, enter the code, pick a team name and color. Land in the **LOBBY**.
3. **Facilitator starts the game** &mdash; game status moves to `IN_PROGRESS`. Teams receive their initial company state based on the selected preset.
4. **Decision phase** &mdash; each team submits decisions across 5 modules: Factory, HR, Marketing, R&D, and Finance. Decisions can be submitted independently per module and locked when ready.
5. **Facilitator advances the round** &mdash; triggers the simulation engine. The engine processes all team decisions simultaneously, runs market competition, calculates revenue/costs/rankings, and stores results.
6. **Results phase** &mdash; teams see their round results, financial statements, market share, competitor intelligence, and rankings.
7. **Repeat** until `maxRounds` is reached. Game status moves to `COMPLETED`. Final rankings and achievement scores determine the winner.

### Game Statuses

| Status | Description |
|---|---|
| `LOBBY` | Teams joining, game not yet started |
| `IN_PROGRESS` | Active gameplay, teams submitting decisions |
| `ROUND_PROCESSING` | Engine processing current round |
| `PAUSED` | Game paused by facilitator |
| `COMPLETED` | All rounds finished, final results available |

---

## Game Presets

Facilitators choose from 3 presets when creating a game:

| Preset | Rounds | Duration | Starting State | Tutorial |
|---|---|---|---|---|
| **Quick** | 16 | ~40-80 min | Pre-built company: 50 workers, 8 engineers, 5 supervisors, all 5 products launched, $175M cash, 0.5 brand value | Light (6 steps) |
| **Standard** | 24 | ~60-120 min | Starter company: 20 workers, 4 engineers, 2 supervisors, 2 products (General + Budget), $175M cash, 0.3 brand value | Medium (10 steps) |
| **Full** | 32 | ~80-160 min | Clean slate: no workers, no products, no equipment. Build everything from scratch. $175M cash, 0 brand value | Full (14 steps) |

---

## The Five Decision Modules

Every round, each team makes decisions across five independent modules.

### 1. Factory

Manage manufacturing operations: build new factories ($50M each), purchase/configure production lines (max 10 per factory), allocate production across market segments, and invest in factory upgrades.

**Key decisions:**
- Build new factories (choose region: North America, Europe, Asia, MENA)
- Add/remove production lines per segment
- Set production allocation per line
- Invest in efficiency improvements (1% per $1M, diminishing after $10M)
- Invest in maintenance (reduces breakdown probability)
- Purchase factory upgrades (20 available across 5 tiers)

**Factory upgrades (5 tiers):**

| Tier | Upgrades | R&D Prerequisite | Cost Range |
|---|---|---|---|
| 1 | Six Sigma, Lean Manufacturing, Warehousing, Continuous Improvement | None | $30M-$100M |
| 2 | Automation, Material Refinement, Modular Lines | R&D Level 1 | $75M-$100M |
| 3 | Supply Chain Optimization, Digital Twin, IoT Integration | R&D Level 2 | $50M-$200M |
| 4 | Advanced Robotics, Quality Lab, Carbon Capture | R&D Level 3 | $60M-$100M |
| 5 | Clean Room | R&D Level 4 | $120M |

**Regional cost modifiers:**

| Region | Modifier |
|---|---|
| North America | 1.00x (baseline) |
| Europe | 1.00x |
| Asia | 0.85x (-15%) |
| MENA | 0.90x (-10%) |

**Utilization mechanics:** Operating above 95% utilization triggers burnout risk (+15%/round), increased defects (+2%), and maintenance backlog accumulation. Breakdown probability: 3% base + age factor + backlog factor - maintenance investment.

### 2. Human Resources

Manage your workforce: hire/fire employees, set salary levels, run training programs, and configure benefits packages.

**Employee roles:**

| Role | Base Salary | Output | Staffing Ratio |
|---|---|---|---|
| Worker | $45,000 | 100 units/round | 2.75 per machine |
| Engineer | $85,000 | 10 R&D points/round | 8 per factory |
| Supervisor | $75,000 | Manages workers | 1 per 15 workers |

**Recruitment tiers:**

| Tier | Cost | Candidates | Stat Range |
|---|---|---|---|
| Basic | $5,000 | 3 | 70-110 |
| Premium | $15,000 | 5 | 90-130 |
| Executive | $50,000 | 4 | 120-160 |

**Key mechanics:**
- Hiring cost: 25% of annual salary
- Base turnover: 12.5% annually. +15% if morale < 50, +10% if burnout > 50
- Salary multiplier range: 0.8x (low stats) to 2.2x (high stats), max $500K
- Training: $50K-$100K per employee. Fatigue kicks in after 2 programs/year (-20% effectiveness per extra)
- New hire ramp-up: 30% productivity round 1, 70% round 2, 100% round 3
- Benefits (health insurance, retirement, PTO, parental leave, stock options, flexible work, professional development) impact morale (up to +50%) and turnover reduction (up to -40%)

### 3. Marketing

Build brand awareness and drive demand: set advertising budgets, invest in brand building, and activate sponsorships.

**Advertising:**
- Impact: 0.15% market awareness per $1M spent
- Diminishing returns: 40% decay per $3M chunk (first $3M gives full effect, next $3M gives 60%, etc.)

**Brand building:**
- Impact: 0.25% brand value per $1M, logarithmic scaling after $5M
- Brand decays 2% per round if not maintained
- Maximum brand growth: 6% per round
- Brand value (0.0 to 1.0) uses sqrt() for diminishing returns in market scoring

**Sponsorship deals:**

| Sponsorship | Cost | Brand Impact |
|---|---|---|
| Influencer Partnership | $3M | +0.6% |
| Gaming Tournament | $4.5M | +0.9% |
| Tech Conference | $7.5M | +1.2% |
| Retailer Partnership | $12M | +1.8% |
| Sports Jersey | $22M | +3.0% |
| National TV Campaign | $35M | +4.5% |

### 4. Research & Development

Develop new products, improve existing ones, and research technologies across a 54-node tech tree.

**Product development:**
- Base development time: 2 rounds + 0.02 rounds per quality point above 50
- Engineer speedup: 5% per engineer (max 50% speedup)
- R&D budget converts to progress points at $100K per point

**Tech tree (54 nodes, 6 families):**

| Family | Focus | Example Techs |
|---|---|---|
| Battery | Power capacity, charging speed | Fast Charge, Solid State, Graphene Anode |
| Camera | Image quality, zoom, low-light | AI Night Mode, Periscope Lens, Computational Photography |
| AI | Smart features, personalization | On-Device AI, Federated Learning, Neural Engine |
| Durability | Build quality, water/dust resistance | Gorilla Glass, IP68, MIL-STD |
| Display | Screen quality, refresh rate | OLED, 120Hz, Under-Display Camera |
| Connectivity | Network speed, range | 5G Advanced, WiFi 7, Satellite Link |

Each family has 9 nodes across 5 tiers. Nodes have AND/OR prerequisites, variable research costs, and research durations. Completed techs provide quality bonuses, feature unlocks, cost reductions, development speed boosts, and cross-family bonuses.

**Phone archetypes (25 definitions, tiers 0-5):** Pre-defined phone templates that unlock as tech prerequisites are met. Each targets specific market segments.

**Patent system:** Teams can file patents on technologies to gain blocking power, license patents to competitors, or challenge existing patents.

### 5. Finance

Manage the balance sheet: issue/buyback shares, take on or repay debt, and monitor financial health.

**Financial instruments:**
- Share issuance (dilutes EPS, raises cash)
- Share buyback (boosts EPS, costs cash)
- Short-term debt (treasury bills, credit lines)
- Long-term debt (corporate bonds, bank loans)

**Credit rating system:**

| Rating | Spread | Borrowing Impact |
|---|---|---|
| AAA | 0.0% | Best rates |
| AA | 0.5% | |
| A | 1.0% | |
| BBB | 2.0% | |
| BB | 4.0% | |
| B | 8.0% | |
| CCC | 15.0% | |
| D | N/A | Cannot borrow |

**Financial statements generated per round:**
- **Income Statement** &mdash; revenue, COGS, operating expenses, net income
- **Balance Sheet** &mdash; assets (cash, inventory, factories), liabilities (short/long-term debt), shareholders' equity
- **Cash Flow Statement** &mdash; operating, investing, and financing activities

**Market cap:** Calculated using P/E multiple (5x-30x range, 15x baseline) with a floor at 0.5x book value. Share price = market cap / shares outstanding.

**Key financial ratios monitored:** Current ratio, quick ratio, cash ratio, debt-to-equity, ROE, ROA, profit margin, gross margin, operating margin.

---

## Market Simulation

The market simulation is the core competitive layer. After all teams submit decisions, the engine runs `MarketSimulator.simulate()` to determine who wins customers.

### Market Segments (5)

| Segment | Total Demand | Price Range | Growth Rate | Price Weight | Quality Weight | Brand Weight | ESG Weight | Feature Weight |
|---|---|---|---|---|---|---|---|---|
| Budget | 500,000 | $100-$300 | 2% | **65%** | 15% | 5% | 5% | 10% |
| General | 400,000 | $300-$600 | 3% | 28% | 23% | 17% | 10% | **22%** |
| Enthusiast | 200,000 | $600-$1000 | 4% | 12% | 30% | 8% | 5% | **45%** |
| Professional | 100,000 | $1000-$1500 | 2% | 8% | **48%** | 7% | **20%** | 17% |
| Active Lifestyle | 150,000 | $400-$800 | **5%** | 20% | 34% | 10% | 10% | 26% |

### How Market Share Is Calculated

For each segment, every team's product is scored on 5 axes:

1. **Price Score** &mdash; dynamic pricing uses EMA (Exponential Moving Average) of actual market prices with a tanh sigmoid. Cheaper than expected = higher score. Quality-driven price tolerance allows up to 20% premium for high-quality products.
2. **Quality Score** &mdash; product quality vs. segment expectations (Budget=50, General=65, Enthusiast=80, Professional=90, Active=70). Exceeding expectations gives diminishing returns via `sqrt()`.
3. **Brand Score** &mdash; `sqrt(brandValue) * weight * brandMultiplier`. Diminishing returns ensure brand-only strategies plateau.
4. **ESG Score** &mdash; `(esgScore / 1000) * sustainabilityPremium * weight`. Sustainability premium increases over time.
5. **Feature Score** &mdash; dot product of product feature set against segment preferences across 6 axes (battery, camera, AI, durability, display, connectivity), or legacy `features/100` fallback.

**Total score** = weighted sum + quality market share bonus + flexibility bonus (for diversified investment).

### Softmax Allocation

Market shares are calculated using the **softmax function** with temperature parameter:

```
share_i = exp(score_i / temperature) / sum(exp(score_j / temperature))
```

- Temperature = 4 (tuned via Fano sweep for 7/7 strategy viability)
- Lower temperature = more winner-take-all
- Higher temperature = more equal distribution

Example at temperature 4:
- Close scores (70, 65, 60, 55): ~46%, 28%, 17%, 10%
- Clear leader (80, 60, 55, 50): ~79%, 11%, 6%, 4%

### Demand Adjustment

Base demand is adjusted by macroeconomic conditions:
- GDP growth boosts demand
- Consumer confidence multiplier (normalized to 75)
- Inflation reduces demand
- Segment-specific growth rate
- Random noise (deterministic): +/-5%

---

## Competitive Mechanics

### Rubber-Banding

Activates from round 3 onward when any team's average share drops below 50% of the mean or exceeds 200% of the mean.

| Condition | Adjustment |
|---|---|
| Trailing team (share < avg * 0.5) | **+15%** boost to market shares |
| Leading team (share > avg * 2.0) | **-8%** penalty to market shares |

### Segment Crowding

When multiple teams compete in the same segment, a crowding factor penalizes all competitors. More products = smaller slice for everyone.

### First-Mover Advantage

Teams entering an underserved segment (0-1 competitors) receive a temporary market share bonus that decays over subsequent rounds.

### Brand Erosion

When a competitor's product score exceeds yours by more than 20% in a segment, your brand value in that segment decays faster (erosion multiplier proportional to the score gap).

### Arms Race Bonus

The first team to deploy a newly researched technology in a product gains a one-time market score bonus.

---

## Financial System

### Economic Conditions (Macro Environment)

The simulation models a dynamic macroeconomic environment that fluctuates each round:

| Parameter | Starting Value | Range | Effect |
|---|---|---|---|
| GDP Growth | 2.5% | -5% to 10% | Boosts/reduces demand |
| Inflation | 2.0% | 0% to 15% | Reduces demand, drives interest rates |
| Consumer Confidence | 75 | 20 to 100 | Multiplies demand |
| Unemployment Rate | 4.5% | 2% to 15% | Background economic indicator |

**Interest rates** follow inflation: rates rise when inflation > 3%, fall when < 1.5%. Federal rate: 0-10%, corporate bond = federal + 1%.

**Foreign exchange:** 4 pairs (EUR/USD, GBP/USD, JPY/USD, CNY/USD) with 15-25% volatility. Revenue tracked by factory region for FX impact.

### Economic Cycle Engine

The economy follows a Markov chain with 4 phases:

| From \ To | Expansion | Peak | Contraction | Trough |
|---|---|---|---|---|
| **Expansion** | 70% | 30% | 0% | 0% |
| **Peak** | 10% | 30% | 60% | 0% |
| **Contraction** | 0% | 0% | 50% | 50% |
| **Trough** | 60% | 0% | 20% | 20% |

Each phase applies demand multipliers (0.8x to 1.2x) and inflation adjustments.

### Unit Economics

| Segment | Raw Material Cost | Labor Cost | Overhead | Total Unit Cost |
|---|---|---|---|---|
| Budget | $50 | $20 | $15 | $85 |
| General | $100 | $20 | $15 | $135 |
| Enthusiast | $200 | $20 | $15 | $235 |
| Professional | $350 | $20 | $15 | $385 |
| Active Lifestyle | $150 | $20 | $15 | $185 |

---

## ESG (Environmental, Social, Governance)

ESG operates as a risk mitigation system rather than a revenue driver.

**Scoring tiers:**

| ESG Score | Effect |
|---|---|
| 700+ | Risk mitigation, better board approval |
| 400-699 | Baseline (no effect) |
| < 400 | **Penalty:** 1-8% revenue penalty (gradient). Represents boycotts, fines, regulatory action |

**ESG initiatives:**
- Workplace Safety Program: $2M, +200 points
- Code of Ethics: Free, +200 points
- Fair Wage (Workers): +220 points
- Fair Wage (Supervisors): +40 points
- Supplier Ethics: +20% supply costs

**Sustainability upgrades** (from factory upgrades): Solar Panels ($45M), Water Recycling ($25M), Waste-to-Energy ($35M), Smart Grid ($55M), Carbon Capture ($70M).

---

## Achievement System

The game features ~40 achievement definitions across 7 categories. **Victory condition: highest achievement score wins.**

| Category | Points Range | Focus |
|---|---|---|
| Innovation | 5-50 pts | R&D mastery, tech tree completion |
| Market | 5-40 pts | Market share, segment dominance |
| Financial | 5-30 pts | Profitability, efficiency metrics |
| Strategic | 10-50 pts | Long-term planning, patents, combos |
| Milestone | 5-20 pts | Reaching specific thresholds |
| Infamy | 0 pts | Tracked but neutral (shame-based) |
| Bad | 0 pts | Excluded from scoring entirely |

**Victory resolution tiebreakers:** If teams tie on achievement score, tiebreaker goes to total revenue, then total market share.

The `AchievementEngine` evaluates ~40 conditions per round and tracks progress via `AchievementProgress` records (current value, target value, sustained rounds).

---

## Tech Tree & R&D Expansions

The expanded R&D system includes a 54-node tech tree organized into 6 technology families with 9 nodes each across 5 tiers.

### Node Structure

Each tech node has:
- **Prerequisites:** AND (all required) and/or OR (any group sufficient)
- **Research cost:** Dollar investment required
- **Research rounds:** Time to complete
- **Effects:** Quality bonus, feature unlock, cost reduction, dev speed boost, segment bonus, or cross-family bonus
- **Risk levels:** Conservative (safe), Moderate (balanced), Aggressive (faster but chance of delay/overrun)

### Active Research State

```
TechTreeState {
  unlockedTechs: string[]       // Completed technologies
  activeResearch: [{
    techId, roundsRemaining, investmentSoFar,
    riskLevel, delayedRounds, costOverrun
  }]
  researchPoints: number        // Accumulated R&D points
  techLevel: number             // Overall 1-10
}
```

### Product Feature Sets (6-axis)

Products can have a `featureSet` with scores across 6 axes:
- Battery, Camera, AI, Durability, Display, Connectivity

Each market segment has different preferences for these axes. The market simulator uses a dot product of product features against segment preferences to calculate feature match score.

---

## Facilitator Tools

The facilitator has a dedicated dashboard and reporting suite:

### During Game
- **Facilitator Dashboard** &mdash; live team health monitoring, resource tensions, decision submission status
- **Event Injection** &mdash; inject market events mid-game (recession, boom, tech breakthrough, supply chain crisis, etc.)
- **Complexity Selector** &mdash; adjust game complexity at creation

### Post-Round
- **Round Brief** &mdash; auto-generated narrative summary of what happened, key tensions, and discussion prompts
- **Competitive Intelligence** &mdash; aggregated view of team activities without revealing specific numbers

### Post-Game
- **Post-Game Report** &mdash; full analysis with tabs for each team's journey, key inflection points, and strategy assessment
- **Discussion Guide** &mdash; auto-generated debrief questions tailored to what actually happened in the game
- **Participant Scorecard** &mdash; per-team scorecard with achievements, financial performance, and strategic assessment

All reports use template-based narrative generation from `FacilitatorReportEngine` (~327 lines of structured analysis).

---

## Tutorial System

Three levels of tutorial depth, aligned with game presets:

| Level | Steps | Interactive Elements | Target |
|---|---|---|---|
| Light | 6 | Basic | Quick Game preset |
| Medium | 10 | Choices, quizzes | Standard Game preset |
| Full | 14 | Choices, quizzes, action prompts, spotlight | Full Simulation preset |

**Features:**
- Auto-starts on Round 1 based on game config
- Path navigation with automatic tab switching (equipment, production, ESG, recruitment, advertising, upgrades)
- Interactive elements: choice cards, quiz questions, action prompts
- CSS mask spotlight overlay highlighting specific UI elements
- State managed via Zustand store (`tutorialStore`)

---

## Engine Architecture

### Core Pipeline

```
SimulationEngine.processRound(input)
  |
  |-- For each team:
  |     |-- MaterialEngine.processOrders()     # Check material arrivals
  |     |-- TariffEngine.processRoundEvents()  # Apply tariff changes
  |     |-- FactoryModule.process()            # Production, upgrades, maintenance
  |     |-- HRModule.process()                 # Hiring, training, turnover
  |     |-- RDModule.process()                 # Product development, tech research
  |     |-- MarketingModule.process()          # Brand building, advertising
  |     |-- FinanceModule.process()            # Debt, equity, interest
  |     |-- applyEvents()                      # Facilitator-injected events
  |
  |-- MarketSimulator.simulate()               # Cross-team competition
  |     |-- calculateDemand()                  # Economic adjustments
  |     |-- calculateTeamPosition()            # 5-axis scoring per segment
  |     |-- calculateMarketShares()            # Softmax allocation
  |     |-- applyRubberBanding()               # Balance mechanic
  |     |-- applyESGEvents()                   # ESG bonuses/penalties
  |
  |-- For each team:
  |     |-- Calculate revenue, costs, net income
  |     |-- Generate financial statements (Income, Balance, Cash Flow)
  |     |-- Update market cap, share price, EPS
  |
  |-- calculateRankings()                      # Revenue, EPS, market share
  |-- generateNextMarketState()                # Evolve economy for next round
  |-- Return SimulationOutput + audit trail
```

### Engine Modules (98+ files)

| Module | Location | Purpose |
|---|---|---|
| SimulationEngine | `engine/core/` | Main orchestrator, round processing |
| EngineContext | `engine/core/` | Seeded RNG, determinism, audit trail |
| FactoryModule | `engine/modules/` | Production, efficiency, upgrades, maintenance |
| HRModule | `engine/modules/` | Hiring, firing, training, morale, turnover |
| FinanceModule | `engine/modules/` | Debt, equity, market cap, credit ratings |
| MarketingModule | `engine/modules/` | Advertising, brand building, sponsorships |
| RDModule | `engine/modules/` | Product development, quality/feature improvement |
| RDExpansions | `engine/modules/` | 54-node tech tree, research risk, cross-family bonuses |
| AchievementEngine | `engine/modules/` | ~40 conditions, victory resolution, tiebreakers |
| MarketSimulator | `engine/market/` | Softmax allocation, demand, scoring, rubber-banding |
| EconomicCycle | `engine/economy/` | Markov chain phases, demand multipliers |
| EconomyEngine | `engine/economy/` | GDP, inflation, consumer confidence evolution |
| FinancialStatements | `engine/finance/` | Income Statement, Balance Sheet, Cash Flow generation |
| MaterialEngine | `engine/materials/` | Raw material ordering, inventory, holding costs |
| LogisticsEngine | `engine/logistics/` | Route optimization, delivery timing |
| MachineCatalog | `engine/machinery/` | Machine types, costs, capabilities |
| TariffEngine | `engine/tariffs/` | Trade tariff scenarios, regional cost impacts |
| EventEngine | `engine/events/` | Random and scripted market events |
| CompetitiveIntelligence | `engine/intelligence/` | Competitor action summaries |
| SatisfactionEngine | `engine/satisfaction/` | Customer satisfaction tracking |
| SupplyChainEngine | `engine/supplychain/` | End-to-end supply chain modeling |
| ExperienceCurve | `engine/experience/` | Learning curve cost reduction |
| ExplainabilityEngine | `engine/explainability/` | Plain-English explanations of engine decisions |
| FacilitatorReportEngine | `engine/modules/` | Narrative report generation |

### State Types

**TeamState** (core team snapshot, stored as JSON in database):
```typescript
{
  version: StateVersion           // Engine version for compatibility
  cash: number                    // Available cash ($)
  revenue: number                 // Current round revenue
  netIncome: number               // Revenue - costs
  totalAssets: number             // Cash + factory value
  totalLiabilities: number        // Short + long-term debt
  shortTermDebt: number           // Treasury bills, credit lines
  longTermDebt: number            // Corporate bonds, bank loans
  shareholdersEquity: number      // Assets - liabilities
  marketCap: number               // P/E based valuation
  sharesIssued: number            // Outstanding shares (default 10M)
  sharePrice: number              // Market cap / shares
  eps: number                     // Earnings per share
  inventory: {                    // Finished goods, raw materials, WIP
    finishedGoods: Record<Segment, number>
    rawMaterials: number
    workInProgress: number
  }
  cogs: number                    // Cost of goods sold
  accountsReceivable: number
  accountsPayable: number
  materials: MaterialState        // Raw material inventory & orders
  tariffs: TariffState            // Active tariff scenarios
  factories: Factory[]            // Array of factory objects
  products: Product[]             // Array of products (launched + in development)
  employees: Employee[]           // Individual employee records with stats
  workforce: WorkforceStats       // Aggregate headcount, morale, efficiency
  brandValue: number              // 0.0 to 1.0
  marketShare: Record<Segment, number>  // Per-segment share
  rdBudget: number                // Current R&D investment
  rdProgress: number              // Accumulated R&D points
  patents: number                 // Patent count
  esgScore: number                // 0-1000
  co2Emissions: number            // Carbon output metric
  benefits: CompanyBenefits       // Benefits package configuration
  financialStatements?: {         // Generated each round
    income: IncomeStatement
    balanceSheet: BalanceSheet
    cashFlow: CashFlowStatement
    validation: { valid: boolean, errors: string[] }
  }
}
```

**MarketState** (shared economy, evolves each round):
```typescript
{
  roundNumber: number
  economicConditions: { gdp, inflation, consumerConfidence, unemploymentRate }
  fxRates: { "EUR/USD", "GBP/USD", "JPY/USD", "CNY/USD" }
  fxVolatility: number            // 0.15 to 0.25
  interestRates: { federalRate, tenYearBond, corporateBond }
  demandBySegment: Record<Segment, { totalDemand, priceRange, growthRate }>
  marketPressures: { priceCompetition, qualityExpectations, sustainabilityPremium }
  dynamicPricing?: Record<Segment, DynamicPriceExpectation>  // EMA-based
}
```

---

## Project Structure

```
simsim-repo/
├── src/                          # Next.js app (Vercel root directory)
│   ├── app/                      # Pages (App Router)
│   │   ├── (auth)/               # /login, /join
│   │   ├── (facilitator)/        # /admin, /admin/games/[gameId]
│   │   ├── (game)/game/[gameId]/ # All game pages (overview, factory, hr, marketing, rnd, finance, results, achievements, news)
│   │   ├── demo/                 # Demo mode (no database required)
│   │   └── api/trpc/             # tRPC HTTP handler
│   ├── components/               # React components
│   │   ├── achievements/         # AchievementBadge, Card, Grid, Toast
│   │   ├── charts/               # MarketSharePie, MetricBar, MetricLine (Recharts)
│   │   ├── facilitator/          # Dashboard, RoundBrief, PostGameReport, DiscussionGuide, ParticipantScorecard
│   │   ├── game/                 # GameLayout, DecisionSubmitBar, TutorialGuide, TutorialSpotlight, WorkflowGuide, NewsTicker, ArchetypeCatalog, FeatureRadarChart, PatentPanel, MarketDashboard, CompetitiveIntel, ProductComparison, AchievementLeaderboard, NotificationPanel, PlainEnglishTooltip
│   │   ├── shared/               # AnimatedCard, ErrorBoundary, LoadingState
│   │   └── ui/                   # shadcn/ui components (20+), HelpTooltip
│   ├── engine/                   # Simulation engine (98+ files)
│   │   ├── core/                 # SimulationEngine, EngineContext
│   │   ├── modules/              # Factory, HR, Finance, Marketing, RD, RDExpansions, AchievementEngine, FacilitatorReportEngine
│   │   ├── market/               # MarketSimulator
│   │   ├── economy/              # EconomicCycle, EconomyEngine
│   │   ├── finance/              # IncomeStatement, BalanceSheet, CashFlow
│   │   ├── config/               # defaults, schema, loader, gamePresets
│   │   ├── achievements/         # Achievement definitions
│   │   ├── materials/            # MaterialEngine, suppliers
│   │   ├── logistics/            # LogisticsEngine, routes
│   │   ├── machinery/            # MachineCatalog
│   │   ├── tariffs/              # TariffEngine, scenarios
│   │   ├── events/               # EventEngine
│   │   ├── intelligence/         # CompetitiveIntelligence
│   │   ├── satisfaction/         # SatisfactionEngine
│   │   ├── supplychain/          # SupplyChainEngine
│   │   ├── experience/           # ExperienceCurve
│   │   ├── explainability/       # ExplainabilityEngine
│   │   ├── types/                # All TypeScript interfaces (employee, factory, product, market, state, decisions, results, features, archetypes, patents, achievements, competition, facilitator)
│   │   └── utils/                # stateUtils, helpers
│   ├── data/                     # tutorialSteps.ts (3 levels: light/medium/full)
│   ├── lib/stores/               # Zustand stores (decisionStore, tutorialStore)
│   ├── server/api/routers/       # tRPC routers (game, team, decision, achievement, facilitator, material)
│   ├── prisma/                   # schema.prisma (PostgreSQL), schema.sqlite.prisma
│   └── __tests__/                # 420 tests across 19 test files
│       ├── e2e/                  # Game flow integration tests
│       ├── engine/               # Feature demand, archetypes, achievements, competition, patents, dynamic pricing, facilitator reports
│       ├── logistics/            # LogisticsEngine tests
│       └── ...                   # Factory, HR, Finance, Marketing, RD, Market, Materials, Economy, Events
├── tools/balance/                # Balance testing tools
├── docs/                         # Design documents
├── vercel.json                   # Vercel config (root dir: src)
└── package.json
```

---

## Database Schema

PostgreSQL via Prisma ORM, hosted on Supabase.

### Models

| Model | Purpose | Key Fields |
|---|---|---|
| **Facilitator** | Instructor account | email (unique), name, passwordHash |
| **Game** | Game session | name, joinCode (6-char, unique), status, currentRound, maxRounds, config (JSON) |
| **Team** | Playing team | name, color, sessionToken (auth), currentState (JSON), achievementPoints, achievementState (JSON) |
| **Round** | Round record | roundNumber, status, marketState (JSON), events (JSON), simulationLog |
| **TeamDecision** | Per-module decisions | module (FACTORY/FINANCE/HR/MARKETING/RD), decisions (JSON), isLocked |
| **RoundResult** | Post-simulation results | stateAfter (JSON), metrics (JSON), rank, per-module result breakdowns |
| **TeamAchievement** | Earned achievements | achievementId, earnedRound, pointsAwarded, wasHidden |
| **AchievementProgress** | Progress tracking | achievementId, currentValue, targetValue, percentComplete, sustainedRounds, history (JSON) |

### Relationships

```
Facilitator 1--* Game 1--* Team
                       1--* Round
                              |
                     Round 1--* TeamDecision (per team per module)
                     Round 1--* RoundResult (per team)
Team 1--* TeamDecision
Team 1--* RoundResult
Team 1--* TeamAchievement
Team 1--* AchievementProgress
```

Team authentication uses session tokens (no user accounts required for players). Teams join via the 6-character game code and receive a unique `sessionToken` stored in the browser.

---

## Key Variables & Constants

### Starting Values (Default)

| Variable | Value |
|---|---|
| Starting Cash | $175M (presets) / $200M (config default) |
| Market Cap | $500M |
| Shares Issued | 10,000,000 |
| Share Price | $50 |
| Raw Materials Value | $5M |
| Labor Cost (default) | $5M |
| ESG Score | 100 |
| CO2 Emissions | 1,000 |
| Brand Value | 0-0.5 (depends on preset) |

### Difficulty Presets

| Parameter | Easy | Normal | Hard | Expert |
|---|---|---|---|---|
| Starting Cash | $250M | $200M | $150M | $100M |
| AI Aggressiveness | Low | 0.6 | High | Max |
| Income Modifier | +20% | - | -10% | -20% |
| Rubber-banding | Yes | Yes | Yes | **No** |
| Disruptions | Fewer | Normal | More | Max |

### Market Constants

| Constant | Value | Purpose |
|---|---|---|
| `SOFTMAX_TEMPERATURE` | 4 | Controls winner-take-all intensity |
| `QUALITY_FEATURE_BONUS_CAP` | 1.2x | Limits R&D compounding |
| `PRICE_FLOOR_PENALTY_THRESHOLD` | 15% | Below segment min |
| `PRICE_FLOOR_PENALTY_MAX` | 30% | Max score reduction for dumping |
| `INVENTORY_HOLDING_COST` | 2%/round | Cost of unsold inventory |
| `FX_VOLATILITY_MIN` | 15% | Minimum FX fluctuation |
| `FX_VOLATILITY_MAX` | 25% | Maximum FX fluctuation |

### Balance Constants

| Constant | Value | Purpose |
|---|---|---|
| `RUBBER_BAND_TRAILING_BOOST` | 1.15 (+15%) | Boost for trailing teams |
| `RUBBER_BAND_LEADING_PENALTY` | 0.92 (-8%) | Penalty for leaders |
| `RUBBER_BAND_THRESHOLD` | 0.5 | Trigger when share < avg * 0.5 |
| `BRAND_DECAY_RATE` | 2%/round | Brand value decay if not maintained |
| `BRAND_MAX_GROWTH_PER_ROUND` | 6% | Cap on brand growth |
| `DYNAMIC_PRICE_EMA_ALPHA` | 0.3 | EMA smoothing factor |
| `UNDERSERVED_PRICE_BONUS` | 0.25 | Bonus for underserved segments |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or use SQLite for local development)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/vladimirthegreat-EG/Simsim.git
cd Simsim/src

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and DIRECT_URL

# Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL="postgresql://..."    # Pooled connection (port 6543)
DIRECT_URL="postgresql://..."      # Direct connection (port 5432)
```

### SQLite (Local Development)

```bash
npm run db:use-sqlite    # Switch to SQLite schema
npm run dev              # No external DB needed
```

---

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | `prisma generate && prisma db push && next build` |
| `npm start` | Start production server |
| `npm test` | Run Vitest in watch mode |
| `npm run test:run` | Run all tests once (CI) |
| `npm run e2e` | Run Playwright end-to-end tests |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio (DB GUI) |
| `npm run db:use-sqlite` | Switch to SQLite schema |
| `npm run db:use-postgres` | Switch to PostgreSQL schema |

---

## Deployment

Deployed on **Vercel** with **Supabase** PostgreSQL.

- **Vercel root directory:** `src`
- **Build command:** `prisma generate && next build`
- **Database:** Supabase PostgreSQL (pooled + direct connections)
- **Schema migration:** Run `prisma db push` locally before deploying

---

## Testing

**420 tests passing** across 19 test files using Vitest.

### Test Coverage

| Area | Tests | Coverage |
|---|---|---|
| Engine modules (Factory, HR, Finance, Marketing, RD) | 150+ | Core simulation logic |
| Market simulation | 40+ | Softmax, scoring, demand |
| Feature demand & archetypes | 41 | Tech tree, phone templates |
| Achievements | 24 | Condition evaluation, victory resolution |
| Competition mechanics | 18 | Crowding, first-mover, brand erosion |
| Patents | 17 | Filing, licensing, challenges |
| Dynamic pricing | 15 | EMA updates, underserved bonuses |
| Facilitator reports | 7 | Narrative generation |
| Logistics | 10+ | Route optimization |
| E2E game flow | 20+ | Full round processing integration |
| Economy & events | 15+ | Cycle transitions, event effects |
| Materials & supply chain | 15+ | Ordering, inventory, holding costs |

### Tested Strategy Archetypes

4 distinct strategies validated for competitive viability:

| Archetype | Strategy | Key Focus |
|---|---|---|
| **Alpha** (Premium) | R&D $10-15M, salary 1.3x, quality 90 | Professional & Enthusiast segments |
| **Beta** (Cost Leader) | R&D $2-3M, salary 0.9x, quality 55 | Budget & General segments |
| **Gamma** (Balanced) | R&D $5-7M, salary 1.0x, quality 70 | Diversified across all segments |
| **Delta** (Marketing) | R&D $3-5M, salary 1.1x, brand $4M | Active Lifestyle focus |

All 4 strategies are viable with 10-15x expected revenue spread for extreme strategies.

```bash
# Run all tests
cd src && npm run test:run

# Run specific test file
npx vitest run __tests__/engine/competition.test.ts

# Watch mode
npm test
```
