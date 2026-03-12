# BIZZSIMSIM V2 — Complete System Reference

> Every parameter, every formula, every connection — in one document.
> Auto-generated 2026-03-11 from engine source code analysis.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Pipeline: How a Round Executes](#2-pipeline-how-a-round-executes)
3. [Constants Reference](#3-constants-reference)
4. [Factory Module](#4-factory-module)
5. [HR Module](#5-hr-module)
6. [Finance Module](#6-finance-module)
7. [Marketing Module](#7-marketing-module)
8. [R&D Module](#8-rd-module)
9. [Market Simulator](#9-market-simulator)
10. [Economic Engine](#10-economic-engine)
11. [Event Engine](#11-event-engine)
12. [Machinery System](#12-machinery-system)
13. [Materials & Supply Chain](#13-materials--supply-chain)
14. [Experience Curve](#14-experience-curve)
15. [Customer Satisfaction](#15-customer-satisfaction)
16. [Expansion Modules](#16-expansion-modules)
17. [Cross-Module Dependency Map](#17-cross-module-dependency-map)
18. [State Reference (TeamState)](#18-state-reference)
19. [Decision Reference (AllDecisions)](#19-decision-reference)

---

## 1. Architecture Overview

BIZZSIMSIM V2 is a deterministic, multiplayer business simulation engine. Up to **5 teams** compete over multiple rounds (16–32), each making decisions across 5 departments: Factory, HR, Finance, Marketing, and R&D.

**Determinism**: All randomness uses Mulberry32 PRNG via `SeededRNG` and `SeedBundle` derivation. Same seed + same decisions = identical results.

**Key files**:
- `engine/core/SimulationEngine.ts` — main `processRound()` entry point
- `engine/market/MarketSimulator.ts` — market share allocation (softmax)
- `engine/modules/*.ts` — 5 core modules + 5 expansion modules
- `engine/types/index.ts` — all constants (`CONSTANTS` object)
- `engine/types/state.ts` — `TeamState` interface

---

## 2. Pipeline: How a Round Executes

`processRound()` executes in **5 sequential steps**:

```
INPUT: teams[].state + teams[].decisions + marketState + roundNumber + matchSeed

STEP 0 ─ Rubber-Banding Factor Calculation
  │  MarketSimulator.calculateRubberBandingFactors(teams, round)
  │  Writes: state.rubberBanding = { costReliefFactor, perceptionBonus,
  │           brandDecayMultiplier, qualityExpectationBoost }
  ▼
STEP 1 ─ Module Processing (per team, sequential)
  │  1.1  Materials & Tariffs → inventory arrives, holding costs, tariff updates
  │  1.2  Factory Module     → production, efficiency, upgrades, ESG
  │  1.3  HR Module          → hiring, firing, training, benefits, turnover
  │  1.4  R&D Module         → research, product development, patents
  │  1.5  Marketing Module   → brand building, advertising, promotions
  │  1.6  Finance Module     → debt, equity, dividends, board meetings
  │  1.7  Events Application → modifiers from global/team events
  │  Each module deducts costs from cash immediately.
  ▼
STEP 2 ─ Market Simulation (once, all teams)
  │  MarketSimulator.simulate(allTeams, marketState)
  │  Softmax allocation → market shares, units sold, revenue per team
  ▼
STEP 3 ─ State Updates & Financial Reporting
  │  Write market results to state (revenue, COGS, marketShare)
  │  Calculate: netIncome = revenue − totalCosts
  │  Calculate: EPS, totalAssets, shareholdersEquity, marketCap, sharePrice
  │  Generate: IncomeStatement, BalanceSheet, CashFlowStatement
  ▼
STEP 4 ─ Rankings
  │  Rank all teams by: revenue, EPS, market share
  ▼
STEP 5 ─ Next Market State
  │  Generate new demand, economic conditions, dynamic pricing for round N+1

OUTPUT: SimulationOutput {
  results[]: RoundResults per team (state, module results, rankings)
  newMarketState: MarketState for next round
  rankings[]: sorted ranking array
  auditTrail: { seedBundle, stateHashes }
}
```

**Critical ordering dependencies**:
- Step 0 (RB) must complete before Step 1 (modules read `state.rubberBanding`)
- Materials must process before Factory (inventory availability)
- All Step 1 modules must complete before Step 2 (market needs final product specs)
- Step 2 must complete before Step 3 (revenue needed for financial metrics)

---

## 3. Constants Reference

All constants live in `engine/types/index.ts` as `CONSTANTS`.

### 3.1 Factory

| Constant | Value | Description |
|----------|-------|-------------|
| `NEW_FACTORY_COST` | $50,000,000 | Cost to build a new factory |
| `MAX_PRODUCTION_LINES` | 10 | Max lines per factory |
| `EFFICIENCY_PER_MILLION` | 0.02 | 2% efficiency gain per $1M invested |
| `EFFICIENCY_DIMINISH_THRESHOLD` | $10,000,000 | Above this, gains halved |
| `MAX_EFFICIENCY` | 1.0 | Ceiling on efficiency multiplier |
| `BASE_DEFECT_RATE` | 0.06 | 6% baseline defect rate |

**Efficiency investment multipliers (per $1M)**:

| Category | Multiplier |
|----------|-----------|
| Workers | 0.01 (1%) |
| Supervisors | 0.015 (1.5%) |
| Engineers | 0.02 (2%) |
| Machinery | 0.012 (1.2%) |
| Factory | 0.008 (0.8%) |

Diminishing returns: After $10M threshold, subsequent gains halved (50% of multiplier).

**Regional cost modifiers**:

| Region | Modifier |
|--------|----------|
| North America | 1.00 |
| Europe | 1.00 |
| Asia | 0.85 |
| MENA | 0.90 |

### 3.2 Factory Upgrades (20 total, $25M–$200M)

**Tier 1 — No prerequisites (rdLevel 0)**:
| Upgrade | Cost | Key Effect |
|---------|------|-----------|
| Six Sigma | $75M | defectRate ×0.6, warranty −50% |
| Warehousing | $100M | storageCost ×0.1, demand spike capture 90% |
| Lean Manufacturing | $40M | efficiency +15%, operating cost −10% |
| Continuous Improvement | $30M | +1% efficiency per round |

**Tier 2 — R&D Level 1 (requires `process_optimization`)**:
| Upgrade | Cost | Key Effect |
|---------|------|-----------|
| Automation | $75M | unitCost −35%, workers −80% |
| Material Refinement | $100M | materialLevel +1 (max 5) |
| Modular Lines | $80M | changeover −50% |
| Water Recycling | $25M | water cost −30%, +50 ESG |
| Solar Panels | $45M | energy cost −40%, +100 ESG |

**Tier 3 — R&D Level 2 (requires `advanced_manufacturing`)**:
| Upgrade | Cost | Key Effect |
|---------|------|-----------|
| Supply Chain | $200M | shipping −30%, stockout −70% |
| Digital Twin | $60M | maintenance −20%, predictive maintenance |
| IoT Integration | $50M | breakdown −15%, real-time monitoring |
| Waste to Energy | $35M | waste cost −20%, +75 ESG |
| Smart Grid | $55M | energy −25%, +80 ESG |
| Rapid Prototyping | $40M | R&D speed +50% |

**Tier 4 — R&D Level 3 (requires `industry_4_0`)**:
| Upgrade | Cost | Key Effect |
|---------|------|-----------|
| Advanced Robotics | $100M | capacity ×1.5, labor −30% |
| Quality Lab | $60M | defectRate ×0.5, QA speed +30% |
| Carbon Capture | $70M | CO2 ×0.5, +150 ESG |
| Flexible Manufacturing | $90M | changeover −30% |

**Tier 5 — R&D Level 4 (requires `breakthrough_tech`)**:
| Upgrade | Cost | Key Effect |
|---------|------|-----------|
| Clean Room | $120M | professional price bonus +20% |

### 3.3 HR

| Constant | Value |
|----------|-------|
| `BASE_WORKER_OUTPUT` | 100 units/worker |
| `BASE_TURNOVER_RATE` | 0.125 (12.5% annual) |
| `WORKERS_PER_MACHINE` | 2.75 |
| `WORKERS_PER_SUPERVISOR` | 15 |
| `ENGINEERS_PER_FACTORY` | 8 |
| `BASE_RD_POINTS_PER_ENGINEER` | 15 |
| `RD_BUDGET_TO_POINTS_RATIO` | $100,000 per point |
| `MAX_SALARY` | $500,000 |
| `SALARY_MULTIPLIER_MIN` | 0.8 |
| `SALARY_MULTIPLIER_MAX` | 2.2 |
| `HIRING_COST_MULTIPLIER` | 0.15 (15% of salary) |
| `TRAINING_FATIGUE_THRESHOLD` | 1 program/year |
| `TRAINING_FATIGUE_PENALTY` | 0.30 (30% per extra) |
| `TRAINING_COOLDOWN_ROUNDS` | 2 |

**Base salaries**: Worker $45K, Engineer $85K, Supervisor $75K

**Recruitment tiers**:
| Tier | Cost | Candidates | Stat Range |
|------|------|-----------|------------|
| Basic | $5,000 | 4 | 70–110 |
| Premium | $15,000 | 6 | 90–130 |
| Executive | $50,000 | 8 | 120–160 |

**Training costs**: Worker $50K, Engineer $75K, Supervisor $100K

**Benefits costs (per employee/year)**:
| Benefit | Cost | Morale Impact | Turnover Reduction |
|---------|------|---------------|-------------------|
| Health Insurance | $5K per 10pts | +0.15 per 100pts | −10% |
| Retirement Match | $3K per 10pts | +0.10 | −8% |
| Paid Time Off | $200/day | +0.08 | −5% |
| Parental Leave | $1K/week | +0.05 | −3% |
| Stock Options | $2,000 flat | +0.12 | −7% |
| Flexible Work | $500 flat | +0.08 | −4% |
| Prof. Development | $1 per $1 | +0.05 | −3% |

### 3.4 Finance

| Constant | Value |
|----------|-------|
| `FX_VOLATILITY_MIN` | 0.05 |
| `FX_VOLATILITY_MAX` | 0.15 |
| `BOARD_MEETINGS_PER_YEAR` | 2 |

### 3.5 Inventory & COGS

| Constant | Value |
|----------|-------|
| `INVENTORY_HOLDING_COST` | 0.02 (2% per round) |
| `LABOR_COST_PER_UNIT` | $20 |
| `OVERHEAD_COST_PER_UNIT` | $15 |

**Raw material cost per unit (by segment)**:
| Segment | Cost |
|---------|------|
| Budget | $50 |
| General | $100 |
| Enthusiast | $200 |
| Professional | $350 |
| Active Lifestyle | $150 |

### 3.6 Brand & Marketing

| Constant | Value | Description |
|----------|-------|-------------|
| `BRAND_DECAY_RATE` | 0.005 | 0.5% per round |
| `BRAND_MAX_GROWTH_PER_ROUND` | 0.06 | Max 6% growth/round |
| `BRAND_CRITICAL_MASS_LOW` | 0.15 | Below → −30% brand score |
| `BRAND_CRITICAL_MASS_HIGH` | 0.55 | Above → +10% brand score |
| `BRAND_LOW_MULTIPLIER` | 0.7 | Penalty multiplier |
| `BRAND_HIGH_MULTIPLIER` | 1.1 | Bonus multiplier |
| `ADVERTISING_BASE_IMPACT` | 0.0011 | 0.11% brand per $1M |
| `ADVERTISING_CHUNK_SIZE` | $1,000,000 | Diminishing returns chunk |
| `ADVERTISING_DECAY` | 0.2 | 20% effectiveness drop/chunk |
| `BRANDING_BASE_IMPACT` | 0.003 | 0.3% brand per $1M |
| `BRANDING_LINEAR_THRESHOLD` | $2,000,000 | Linear up to $2M |
| `BRANDING_LOG_MULTIPLIER` | 1.5 | Log multiplier above threshold |

### 3.7 Market Allocation

| Constant | Value | Description |
|----------|-------|-------------|
| `SOFTMAX_TEMPERATURE` | 2 | Market share sharpness |
| `QUALITY_FEATURE_BONUS_CAP` | 1.1 | Max quality/feature multiplier |
| `QUALITY_MARKET_SHARE_BONUS` | 0.0011 | +0.11% share per quality pt |
| `PRICE_FLOOR_PENALTY_THRESHOLD` | 0.08 | 8% below min → penalty |
| `PRICE_FLOOR_PENALTY_MAX` | 0.10 | Max 10% score reduction |

### 3.8 ESG

| Constant | Value | Description |
|----------|-------|-------------|
| `ESG_HIGH_THRESHOLD` | 700 | High tier trigger |
| `ESG_MID_THRESHOLD` | 400 | Mid tier (400–699) |
| `ESG_HIGH_BONUS` | 0.05 | +5% revenue bonus |
| `ESG_MID_BONUS` | 0.02 | +2% revenue bonus |
| `ESG_PENALTY_THRESHOLD` | 300 | Below → penalty |
| `ESG_PENALTY_MAX` | 0.12 | 12% max penalty at score 0 |
| `ESG_PENALTY_MIN` | 0.0133 | 1.33% penalty at score 299 |

### 3.9 Rubber-Banding (v6.0.0 Continuous System)

| Constant | Value | Description |
|----------|-------|-------------|
| `RUBBER_BAND_ACTIVATION_ROUND` | 3 | No RB in rounds 1–2 |
| `RB_MAX_COST_RELIEF` | 0.12 | Max 12% COGS/hiring reduction |
| `RB_COST_RELIEF_SENSITIVITY` | 1.5 | tanh ramp speed |
| `RB_MAX_PERCEPTION_BONUS` | 0.08 | Max 8% quality score boost |
| `RB_PERCEPTION_SENSITIVITY` | 1.2 | tanh ramp speed |
| `RB_MAX_DRAG` | 0.50 | Max 50% brand decay acceleration |
| `RB_DRAG_SENSITIVITY` | 0.8 | Gentler ramp |
| `RB_MAX_QUALITY_EXPECTATION_BOOST` | 5.0 | Up to +5 quality expectation pts |

### 3.10 R&D Technology Tree

| Technology | Cost | R&D Points | Prerequisite |
|-----------|------|-----------|-------------|
| `process_optimization` | $5M | 100 | None |
| `advanced_manufacturing` | $15M | 300 | process_optimization |
| `industry_4_0` | $30M | 600 | advanced_manufacturing |
| `breakthrough_tech` | $50M | 1,000 | industry_4_0 |

### 3.11 Initial Defaults

| Constant | Value |
|----------|-------|
| `DEFAULT_STARTING_CASH` | $175,000,000 |
| `DEFAULT_MARKET_CAP` | $500,000,000 |
| `DEFAULT_SHARES_ISSUED` | 10,000,000 |
| `DEFAULT_RAW_MATERIALS` | $5,000,000 |
| `DEFAULT_LABOR_COST` | $5,000,000 |

### 3.12 Segment Weights (Market Scoring)

| Segment | Price | Quality | Brand | ESG | Features | Total |
|---------|-------|---------|-------|-----|----------|-------|
| Budget | 65 | 15 | 5 | 5 | 10 | 100 |
| General | 28 | 23 | 17 | 10 | 22 | 100 |
| Enthusiast | 12 | 30 | 8 | 5 | 45 | 100 |
| Professional | 8 | 48 | 7 | 20 | 17 | 100 |
| Active Lifestyle | 20 | 34 | 10 | 10 | 26 | 100 |

---

## 4. Factory Module

**Source**: `engine/modules/FactoryModule.ts`

### Inputs (FactoryDecisions)
- `efficiencyInvestments` — per-factory resource allocation
- `greenInvestments` — CO2 reduction spending
- `upgradePurchases` — factory upgrades to buy
- `newFactories` — new factory construction
- `esgInitiatives` — 20 ESG programs
- `machineryDecisions` — machine purchases/maintenance
- `materialTierChoices` — quality tier per segment (1–5)
- `productionAllocations` — quantity targets per segment

### State Mutations
- `factories[]` — efficiency, upgrades, defectRate, CO2
- `cash` — deducted by all costs
- `brandValue` — incremented by green investments
- `esgScore` — incremented by ESG initiatives
- `co2Emissions` — recalculated
- `machineryStates[]` — updated machinery health
- `productionAllocations`, `materialTierChoices` — stored for market use

### Formulas

**Worker production output**:
```
baseOutput = workers × 100
produced = baseOutput × factory.efficiency × (workerEfficiency/100) × (speed/100) × automationMult
automationMult = 5 if "automation" upgrade, else 1
defects = produced × factory.defectRate
finalProduction = produced − defects
```

**CO2 reduction**:
```
reduction = (investmentAmount / 100,000) × 10 tons
```

**Waste metrics**:
```
baseWasteRate = 0.15 (15%)
efficiencyReduction = factory.efficiency × 0.12
upgradeReduction = factory.wasteCostReduction × 0.05
finalWasteRate = max(0.02, 0.15 − efficiencyReduction − upgradeReduction)
wasteUnits = produced × finalWasteRate
disposalCost = wasteUnits × $5
```

**Material tier quality effects**:
- Premium tier (above natural): −20% defect rate, +10% quality
- Economy tier (below natural): +30% defect rate, −15% quality

### ESG Initiatives (20 total, 4 tiers)

**Tier 1** (available from start): charitableDonation, communityInvestment, codeOfEthics, employeeWellness, communityEducation

**Tier 2** (ESG 100+ or round 2+): workplaceHealthSafety (+200 ESG, $2M), fairWageProgram (+110 ESG), carbonOffsetProgram ($20/ton), renewableEnergyCertificates, diversityInclusion (+90 ESG, $1M), transparencyReport (+50 ESG, $300K)

**Tier 3** (ESG 300+ or round 4+): supplierEthicsProgram (+150 ESG, +20% material costs), waterConservation (+80 ESG, $1.5M), zeroWasteCommitment (+100 ESG, $2M), humanRightsAudit (+70 ESG, $800K), whistleblowerProtection (+40 ESG, $200K), biodiversityProtection

**Tier 4** (ESG 500+ or round 6+): circularEconomy (+120 ESG, $3M), affordableHousing, executivePayRatio (+100 ESG, free)

---

## 5. HR Module

**Source**: `engine/modules/HRModule.ts`

### Inputs (HRDecisions)
- `hires[]` — new employees with role and optional candidateData
- `fires[]` — employee IDs to terminate
- `trainingPrograms[]` — training by role
- `benefitChanges` — benefits package updates
- `recruitmentSearches[]` — candidate generation

### State Mutations
- `employees[]` — hired, fired, trained, morale updated
- `cash` — deducted (hiring, severance, training, salaries, benefits)
- `workforce` — recalculated summary
- `benefits` — package, costs, morale/turnover effects

### Formulas

**Salary calculation**:
```
averageStat = sum(all employee stats) / stat_count
multiplier = 0.8 + (averageStat / 100) × 1.4       // Range: 0.8x to 2.2x
salary = min($500K, round(baseSalary × multiplier))
```

**Hiring cost** (with rubber-banding):
```
hiringCost = salary × 0.15 × (1 − costReliefFactor)
```

**Severance**: `salary / 12` (one month)

**R&D output per engineer**:
```
output = 15 × (efficiency/100) × (speed/100) × (1 + innovation/200)
```

**Training with fatigue**:
```
if programsThisYear < FATIGUE_THRESHOLD:
  effectiveness = 1.0
else:
  effectiveness = max(0.2, 1.0 − (excessPrograms × 0.30))

baseImprovement = 5 + random(0, 10)%
actualImprovement = baseImprovement × effectiveness
```

**Turnover**:
```
monthlyRate = 0.125 / 12
if morale < 50:  monthlyRate += 0.15/12
turnoverRate *= (150 − loyalty) / 100
if burnout > 50: turnoverRate += 0.1/12
```

**Burnout accumulation**:
```
moraleStress = max(0, (50 − morale) / 100)
burnoutGain = 3 + moraleStress × 10     // 3–8 points/round
burnout = min(100, burnout + burnoutGain)

// Recovery (if morale ≥ 70):
recovery = (morale − 70) / 10
burnout = max(0, burnout − recovery)
```

**Supervisor team boost**:
```
leadershipMultiplier = 1.0 + (leadership / 500)    // 1.0 to 1.2
```

---

## 6. Finance Module

**Source**: `engine/modules/FinanceModule.ts`

### Inputs (FinanceDecisions)
- `treasuryBillsIssue`, `corporateBondsIssue`, `loanRequest`
- `stockIssuance`, `sharesBuyback`, `dividendPerShare`
- `economicForecast` — GDP/inflation predictions

### State Mutations
- `cash` — ±debt proceeds, −interest, −buyback, −dividends
- `shortTermDebt`, `longTermDebt`, `totalLiabilities`
- `sharesIssued`, `shareholdersEquity`
- `sharePrice`, `marketCap`, `eps`

### Formulas

**Share buyback → EPS boost**:
```
newShares = floor(buybackAmount / sharePrice)
sharesIssued = max(1M, sharesIssued − newShares)
epsGrowth = (newEPS − oldEPS) / oldEPS
priceBoost = 1 + min(0.15, epsGrowth × 0.5)
```

**Dividend yield effect**:
```
yield = (dividendPerShare / sharePrice) × 100%
yield > 5%  → sharePrice ×= 0.98   (concern)
yield 2–5%  → sharePrice ×= 1.02   (healthy)
```

**PE ratio (target)**:
```
targetPE = 15
  + min(10, epsGrowth × 50)              // growth premium
  + (sentiment − 50) / 5                  // sentiment (−10 to +10)
  + profitabilityBonus (3 / 1 / −2)       // margin tiers
  + leveragePenalty (−5 / −2 / 0)         // D/E tiers
  Clamped: [5, 30]
```

**Market cap**:
```
if eps > 0:  marketCap = eps × sharesIssued × targetPE
else:        marketCap = revenue × priceToSales   // P/S fallback
Floor:       max(bookValue × 0.5, totalAssets × 0.3)
```

**Financial ratios**:
| Ratio | Formula | Green | Yellow | Red |
|-------|---------|-------|--------|-----|
| Current | (cash + AR) / (shortTermDebt + AP) | ≥2.0 | ≥1.2 | <1.2 |
| Quick | currentAssets × 0.8 / currentLiabilities | ≥1.5 | ≥1.0 | <1.0 |
| Cash | cash / currentLiabilities | ≥0.5 | ≥0.2 | <0.2 |
| D/E | totalDebt / equity | ≤0.3 | ≤0.6 | >0.6 |
| ROE | netIncome / equity | ≥15% | ≥8% | <8% |
| ROA | netIncome / totalAssets | ≥8% | ≥4% | <4% |
| Profit Margin | netIncome / revenue | ≥15% | ≥5% | <5% |
| Gross Margin | (revenue − COGS) / revenue | ≥40% | ≥25% | <25% |

**Board approval probability**:
```
baseProbability = 50%
if ROE > 15%:         +10%
if currentRatio > 2:  +5%
if D/E > 0.6:        −15%
if ESG > 600:         +8%
if ESG < 300:         −12%
Vote: 6 members, majority wins
```

---

## 7. Marketing Module

**Source**: `engine/modules/MarketingModule.ts`

### Inputs (MarketingDecisions)
- `advertisingBudget` — spend per segment
- `brandingInvestment` — overall brand building
- `productPricing` — price changes
- `promotions` — discount campaigns per segment
- `sponsorships` — sponsorship deals

### State Mutations
- `brandValue` — increased by investment, decayed naturally
- `products[].price` — adjusted by pricing/promotions
- `cash` — deducted by all marketing spend

### Formulas

**Advertising impact (diminishing returns via chunks)**:
```
For each $1M chunk:
  impact += chunkSize × 0.0011 × effectiveness × segmentMultiplier
  effectiveness ×= 0.8    // 20% decay per chunk

Segment multipliers:
  Budget: 1.1, General: 1.0, Enthusiast: 0.75, Professional: 0.5, Active: 0.85
```

**Branding investment (logarithmic scaling)**:
```
if millions ≤ $2M:
  return millions × 0.003
else:
  base = $2M × 0.003
  extra = 0.003 × 1.5 × log₂(1 + extraMillions / $2M)
  return base + extra
Cap: 6% per round max
```

**Brand decay** (with rubber-banding):
```
decayRate = 0.005 × brandDecayMultiplier      // leaders decay faster
decayAmount = brandValue × decayRate
newBrandValue = max(0, brandValue − decayAmount)
```

**Price elasticity by segment**:
| Segment | Elasticity |
|---------|-----------|
| Budget | 2.5 |
| General | 1.8 |
| Enthusiast | 1.2 |
| Professional | 0.8 |
| Active Lifestyle | 1.5 |

**Sponsorship options**:
| Sponsorship | Cost | Brand Impact |
|------------|------|-------------|
| Tech Conference | $7.5M | +1.2% |
| Sports Team Jersey | $22M | +3.0% |
| Gaming Tournament | $4.5M | +0.9% |
| National TV Campaign | $35M | +4.5% |
| Influencer Partnership | $3M | +0.6% |
| Budget Retailer Partner | $12M | +1.8% |

---

## 8. R&D Module

**Source**: `engine/modules/RDModule.ts`

### Inputs (RDDecisions)
- `rdBudget` — R&D spending amount
- `newProducts[]` — new product specs or archetype-based creation
- `productImprovements[]` — quality/feature increases

### State Mutations
- `cash` — deducted (R&D budget, dev costs, improvement costs)
- `rdProgress` — incremented by engineer output + budget conversion
- `products[]` — new products, development progress, launches, improvements
- `patents` — milestone-based generation
- `unlockedTechnologies[]` — auto-unlocked at thresholds

### Formulas

**R&D points generation**:
```
engineerPoints = 15 × (efficiency/100) × (speed/100) × (1 + innovation/200)
budgetPoints = floor(rdBudget / $100,000)
totalPoints = engineerPoints + budgetPoints
```

**Product development cost by segment**:
| Segment | Base Cost |
|---------|----------|
| Budget | $5M |
| General | $10M |
| Enthusiast | $20M |
| Professional | $35M |
| Active Lifestyle | $15M |

```
qualityMultiplier = 1 + (targetQuality − 50) / 50     // 0.5x to 2x
totalCost = baseCost × qualityMultiplier
```

**Development time**:
```
baseRounds = 2
qualityFactor = max(0, targetQuality − 50) × 0.05
engineerSpeedup = min(0.5, engineerCount × 0.05)
totalRounds = max(1, round((baseRounds + qualityFactor) × (1 − engineerSpeedup)))
```

**Improvement cost (progressive)**:
| Quality Level | Cost per Point |
|---------------|---------------|
| <70 | $1M |
| 70–79 | $1.5M |
| 80–89 | $2.5M |
| 90+ | $5M |

| Feature Level | Cost per Point |
|--------------|---------------|
| <70 | $500K |
| 70–79 | $750K |
| 80–89 | $1.25M |
| 90+ | $2.5M |

**Patent generation** (milestone-based):
```
totalPatents = floor(rdProgress / 200)
qualityBonus = min(25, patents × 5)           // +5 quality per patent, max +25
costReduction = min(0.25, patents × 0.05)     // up to 25%
marketShareBonus = min(0.15, patents × 0.03)  // up to 15%
```

**Unit cost**:
```
unitCost = materialCost[segment] + $20 labor + $15 overhead + (targetQuality − 50) × $0.50
```

---

## 9. Market Simulator

**Source**: `engine/market/MarketSimulator.ts`

### 9.1 Softmax Market Share Allocation

```
marketShare[i] = exp((score[i] − maxScore) / temperature) / Σ(exp(...))
temperature = 2
```

Behavior at temp=2:
- Close scores (70, 65, 60, 55): ~46%, 28%, 17%, 10%
- Clear leader (80, 60, 55, 50): ~79%, 11%, 6%, 4%
- Dominant (90, 50, 45, 40): ~97%, 2%, 1%, 1%

### 9.2 Five Scoring Dimensions

**Total score** = priceScore + qualityScore + brandScore + esgScore + featureScore

#### Price Score

```
// Dynamic pricing mode:
priceAdvantage = (expectedPrice − actualPrice) / expectedPrice
sigmoidScore = tanh(priceAdvantage × 2) × 0.5 + 0.5
priceScore = sigmoidScore × weight.price × priceFloorMultiplier

// Price floor penalty (if price < segment minimum):
belowFloor = (floor − price) / floor
priceFloorMultiplier = max(0.5, 1 − belowFloor)
```

#### Quality Score

Three-zone scoring:
```
qualityRatio = product.quality / (baseExpectation + qualityExpectationBoost)

if ratio ≥ 1.0:  multiplier = 1.0 + sqrt(ratio − 1) × 0.5     // diminishing bonus
if ratio ≥ 0.7:  multiplier = ratio                              // linear
if ratio < 0.7:  multiplier = ratio² / 0.49                      // accelerating penalty

qualityScore = min(1.1, multiplier) × weight.quality + perceptionBonus × weight.quality
```

**Quality expectations by segment**:
| Segment | Expected Quality |
|---------|-----------------|
| Budget | 50 |
| General | 65 |
| Enthusiast | 80 |
| Professional | 90 |
| Active Lifestyle | 70 |

#### Brand Score

```
brandScore = sqrt(brandValue) × weight.brand × brandMultiplier

brandMultiplier:
  brandValue > 0.55 → 1.1 (+10%)
  brandValue < 0.15 → 0.7 (−30%)
  else → 1.0
```

#### ESG Score

```
esgRatio = esgScore / 1000
esgScore = esgRatio × sustainabilityPremium × weight.esg
```

#### Feature Score

```
featureMatchScore = calculateFeatureMatchScore(featureSet, segmentPrefs)  // 0–1
featureMultiplier = featureMatchScore ≤ 1 ? featureMatchScore
                    : 1.0 + sqrt(featureMatchScore − 1) × 0.5
featureScore = min(1.1, featureMultiplier) × weight.features
```

### 9.3 Score Modifiers

**Quality grade bonus**: artisan +8%, premium +4%

**Quality market share bonus**: `+quality × 0.0011`

**Crowding factor**:
```
if products > 3: score ×= max(0, 1 − (products − 3) × 0.05)
```

**First-mover bonus**: +15% if 0 competitors, +7.5% if 1, decaying over 3 rounds

**Arms race bonus**: +5% if first to apply a technology

**Customer loyalty bonus**: `(loyalty / 100) × 0.05` (0–5% score bonus)

### 9.4 Demand Calculation

```
adjustedDemand = baseDemand
  × (1 + GDP/100)                   // GDP effect
  × (consumerConfidence / 75)       // confidence effect
  × (1 − inflation/100 × 0.5)      // inflation dampening
  × (1 + growthRate)                // segment growth
  × cycleDemandMultiplier           // seasonal/cycle
  × (0.95 + random × 0.1)          // ±5% noise
```

### 9.5 Revenue Calculation

```
demandUnits = floor(segmentDemand × marketShare)
cappedUnits = min(demandUnits, productionCapacity)
revenue = cappedUnits × product.price
warrantyCost = cappedUnits × effectiveDefectRate × unitCost
```

**Production capacity**:
```
capacity = machineCapacity × workerRatio × avgEfficiency × (1 − avgDefectRate)
workerRatio = min(1.0, workers / (machines × 2.75))
```

### 9.6 Rubber-Banding Integration

**Position**: `(teamAvgShare − globalAvgShare) / globalAvgShare`

**Mechanism A — Cost Relief** (trailing teams, position < 0):
```
costReliefFactor = tanh(|position| × 1.5) × 0.12
Applied to: COGS, hiring costs
```

**Mechanism B — Perception Boost** (trailing teams):
```
perceptionBonus = tanh(|position| × 1.2) × 0.08
Applied to: quality score in market scoring
```

**Mechanism C — Incumbent Drag** (leading teams, position > 0):
```
dragFactor = tanh(position × 0.8) × 0.50
brandDecayMultiplier = 1.0 + dragFactor       // faster brand decay
qualityExpectationBoost = dragFactor × 5.0    // higher quality bar
```

### 9.7 Dynamic Pricing

```
EMA_ALPHA = 0.3
expectedPrice = prevExpected × 0.7 + avgPrice × 0.3

priceFloor = materialCost[segment] + $20 labor + $15 overhead
priceCeiling = priceRange.max × inflationFactor × 1.2
```

---

## 10. Economic Engine

**Source**: `engine/economy/EconomicCycle.ts`, `EconomyEngine.ts`

### 10.1 Economic Cycle Phases

| Phase | GDP | Inflation | Unemployment | Confidence | Corp Rate |
|-------|-----|-----------|-------------|------------|-----------|
| Expansion | +3.0% | 2.5% | 4.5% | 75 | 4.5% |
| Peak | +2.0% | 4.0% | 3.5% | 80 | 6.0% |
| Contraction | −1.0% | 1.5% | 6.5% | 45 | 5.0% |
| Trough | −2.0% | 0.5% | 8.0% | 35 | 3.5% |

**Minimum rounds per phase**: Expansion 4, Peak 2, Contraction 3, Trough 2

**Transition probabilities**:
| From → | Expansion | Peak | Contraction | Trough |
|--------|-----------|------|-------------|--------|
| Expansion | 70% | 30% | — | — |
| Peak | 10% | 30% | 60% | — |
| Contraction | — | — | 50% | 50% |
| Trough | 60% | — | 20% | 20% |

### 10.2 Economic Impacts

```
demandMultiplier = 1 + ((confidence − 50) / 100 × 0.3) + (gdp / 100 × 0.2)
costMultiplier = (1 + inflation/100) × avgCommodityPrice
financingCostMultiplier = corporateRate / 4.5
laborCostMultiplier = 1.1 if unemployment < 5%, 0.95 if > 7%, else 1.0
```

### 10.3 Natural Fluctuation (per round)

```
GDP:        ±0.5        clamped [−5%, +10%]
Inflation:  ±0.25       clamped [0%, 15%]
Confidence: ±2.5        clamped [20, 100]
Unemployment: ±0.15     clamped [2%, 15%]
```

### 10.4 Unit Economics Enforcement

```
unitCost = materialCost × qualityMult / efficiency + labor + overhead
qualityMult = 1 + (quality − 50) / 100
factoryEfficiencyEffect = 2 − efficiency    // 0.7 eff → 1.3x cost

Below-cost pricing: penalty 20–50% if loss > 20%
Unsustainable discount: penalty 10% if margin < 10%
```

### 10.5 Working Capital

```
accountsReceivable = revenue × (30/90)        // 30 days
accountsPayable = costs × 0.7 × (45/90)       // 45 days
workingCapitalCost = max(0, WC) × (0.08/4)    // 8% annual, quarterly
cashConversionCycle = daysReceivable + DIO − daysPayable
```

---

## 11. Event Engine

**Source**: `engine/events/EventEngine.ts`

### Event Categories (57 templates)

**Opportunity** (4 types): Tech Breakthrough (5%), Market Expansion (8%), Talent Pool (6%), Supply Chain Quality (5%)

**Crisis** (6 types): Product Recall (30% if defectRate > 0.08), Labor Dispute (40% if morale < 40), Cybersecurity Breach (4%), Port Congestion (8%), Semiconductor Shortage (6%), Display Quality Issue (10%)

**Market Shift**: Trend Shift (10%)

**Regulatory**: New Regulation (6%, cost ×1.05)

**Competitive**: Competitor Exit (4%, demand ×1.2)

**Contract Orders** (4 types): Govt School Order (12%), Telecom Bundle (10%), Enterprise Rollout (7%), Retail Chain (10%)

### Event Effect Types

| Effect | Application |
|--------|------------|
| Revenue modifier | Multiply (e.g., 1.2× = +20%) |
| Cost modifier | Multiply (e.g., 1.4× = +40%) |
| Brand modifier | Additive (e.g., +0.05) |
| Demand modifier | Multiply (e.g., 1.15×) |
| Cash change | Direct (e.g., −$5M) |
| Quality modifier | Additive (e.g., +5) |
| ESG modifier | Direct (e.g., +100) |
| Morale modifier | Additive (e.g., +10) |
| Capacity modifier | Multiply (e.g., 0.7× = −30%) |

**Probability adjustment**:
```
adjustedProb = baseProbability × difficulty.events.crisisFrequency    // for crises
adjustedProb = baseProbability × difficulty.events.opportunityFrequency // for opportunities
```

---

## 12. Machinery System

**Source**: `engine/machinery/MachineCatalog.ts`, `MachineryEngine.ts`

### 15 Machine Types

**Production** (7):
| Machine | Cost | Capacity | Defect Reduction | Labor Reduction |
|---------|------|----------|-----------------|----------------|
| Assembly Line | $5M | 10,000 | 0% | 0% |
| CNC Machine | $8M | 3,000 | −1% | −10% |
| Welding Station | $4M | 5,000 | −0.5% | −5% |
| Injection Molder | $7M | 12,000 | 0% | −5% |
| PCB Assembler | $10M | 6,000 | −1.5% | −15% |
| Paint Booth | $3M | 8,000 | 0% | 0% |
| Laser Cutter | $6M | 4,000 | −1% | −10% |

**Automation** (2):
| Machine | Cost | Capacity | Defect Reduction | Labor Reduction |
|---------|------|----------|-----------------|----------------|
| Robotic Arm | $12M | 8,000 | −1% | −20% |
| Conveyor System | $3M | 15,000 | 0% | −8% |

**Quality** (2):
| Machine | Cost | Capacity | Defect Reduction | Labor Reduction |
|---------|------|----------|-----------------|----------------|
| Quality Scanner | $6M | 0 | −3% | −5% |
| Testing Rig | $4M | 0 | −2% | −3% |

**Specialized** (3):
| Machine | Cost | Capacity | Defect Reduction | Labor Reduction | Special |
|---------|------|----------|-----------------|----------------|---------|
| 3D Printer | $2M | 500 | 0% | −5% | — |
| Clean Room | $15M | 2,000 | −4% | 0% | — |
| Packaging System | $2.5M | 20,000 | 0% | −10% | shipping −5% |

**Logistics** (1):
| Machine | Cost | Capacity | Special |
|---------|------|----------|---------|
| Forklift Fleet | $1M | 0 | labor −3%, shipping −10% |

### Health & Breakdown System

**Health degradation per round**:
```
base: −1%
after 50% lifespan: −1.5%
after 75% lifespan: −2%
past expected lifespan: −3%
overdue maintenance: −0.5% per overdue round
utilization > 90%: −1%
```

**Breakdown severity**:
| Severity | Production Loss | Repair Cost | Rounds to Repair |
|----------|----------------|-------------|-----------------|
| Minor | 5–15% | $100K–$500K | 1 |
| Moderate | 15–30% | $500K–$1.5M | 1 |
| Major | 30–50% | $1.5M–$3M | 2 |
| Critical | 50–80% | $3M–$5M | 3 |

---

## 13. Materials & Supply Chain

**Source**: `engine/materials/MaterialEngine.ts`

### Material Costs by Segment (per unit, all components)

| Segment | Total Cost | Lead Time | Quality Tier |
|---------|-----------|-----------|-------------|
| Budget | $60 | 30 days | 1 |
| General | $150 | 32 days | 2 |
| Active Lifestyle | $250 | 36 days | 3 |
| Enthusiast | $350 | 38 days | 4 |
| Professional | $600 | 42 days | 5 |

### Lead Time Calculation

```
productionTime = 20 + (quantity / monthlyCapacity) × 30 × (1 / responsiveness)
shippingTime ≈ 25 days
clearance ≈ 3 days
inspection ≈ 2 days
totalLeadTime = sum → convert to rounds (÷30)
```

**Delay**: 5% probability for air, 15% for sea. Duration: 1–2 extra rounds.

**Holding costs**: 2% per round of total inventory value.

---

## 14. Experience Curve

**Source**: `engine/experience/ExperienceCurve.ts`

### Wright's Law

```
costMultiplier = learningRate ^ log₂(cumulativeUnits / 10,000)
baseLearningRate = 0.85    // 15% cost reduction per production doubling
floor = 0.50               // max 50% total reduction
```

### Learning Rate Modifiers

```
innovation:    effectiveRate ×= (1 − innovation/200 × 0.1)    // up to 10% better
sixSigma:      effectiveRate ×= (1 − sixSigmaBonus × 0.5)
complexity:    effectiveRate ×= (1 + (complexity − 50)/200 × 0.1)
efficiency:    effectiveRate ×= (1 − (efficiency − 0.7) × 0.2)
Bounds: [0.70, 0.95]
```

### Technology Transfer (30% spillover to adjacent segments)

- Budget ↔ General
- General ↔ Active Lifestyle
- Enthusiast ↔ Professional
- Enthusiast ↔ Active Lifestyle

---

## 15. Customer Satisfaction

**Source**: `engine/satisfaction/SatisfactionEngine.ts`

### Segment Expectations

| Segment | Quality | Price Sensitivity | Features | Service |
|---------|---------|------------------|----------|---------|
| Budget | 40 | 100 | 30 | 40 |
| General | 55 | 70 | 50 | 55 |
| Enthusiast | 75 | 40 | 80 | 65 |
| Professional | 85 | 30 | 70 | 80 |
| Active Lifestyle | 65 | 55 | 60 | 60 |

### Satisfaction Components & Weights

| Component | Weight | Formula |
|-----------|--------|---------|
| Product Quality | 30% | 50 + (avgQuality − marketAvg) |
| Delivery Reliability | 25% | 70 base, −15 if utilization > 95%, +20 if cash > $50M |
| Price Fairness | 20% | 50 + (marketPrice / teamPrice − 1) × 50 |
| Service Experience | 10% | morale × 0.6 + efficiency × 0.4 |
| Brand Trust | 15% | brandValue × 100 × 0.5 + previousTrust × 0.5 |

### Business Impact

| Metric | Formula |
|--------|---------|
| Brand Growth Modifier | (satisfaction − 50) / 100 |
| Price Tolerance | (satisfaction − 70) / 100 if > 70 |
| Organic Growth | (satisfaction − 60) / 100 × 0.02 if > 60 |
| Churn Reduction | max(0, (satisfaction − 50) / 100 × 0.3) |
| Word of Mouth | 0.5 + satisfaction / 100 |

---

## 16. Expansion Modules

### 16.1 Factory Expansions

**Source**: `engine/modules/FactoryExpansions.ts`

**Breakdown probability**:
```
prob = 3%
  + (maintenanceBacklog / 1000) × 5%
  + (equipmentAge / 10) × 2%
  + burnoutBonus (if burnout > 50)
  − (preventiveMaintenance / $1M) × 2%
  × (2 − maintenanceEfficiency)
  × difficulty.disruptions.frequencyMultiplier
  Clamped: [1%, 50%]
```

**Burnout dynamics**:
```
if utilization > 95%:
  burnoutRisk += 15%, burnoutLevel += 10, overdriveRounds++
else:
  burnoutRisk −= 5%, burnoutLevel −= 5, overdriveRounds = 0
```

**Defect impact on brand**:
```
brandDamage = unitsAffected × 0.001 / 1000
if defectRate > 10%: recall required, brandDamage ×= 3
```

### 16.2 Finance Expansions

**Source**: `engine/modules/FinanceExpansions.ts`

**Credit rating score** (0–100):
```
D/E > 1.5: −40    D/E > 1.0: −25    D/E > 0.6: −15    D/E > 0.3: −5
Coverage < 1.5: −30   < 3: −20    < 5: −10
Current < 1.0: −15    < 1.5: −10  < 2.0: −5
Profit < 0: −15       < 5%: −10   < 10%: −5

AAA: ≥90  AA: ≥80  A: ≥70  BBB: ≥60  BB: ≥50  B: ≥40  CCC: ≥20  D: else
```

**Interest spread by rating**: AAA: 0%, AA: +0.5%, A: +1%, BBB: +2%, BB: +4%, B: +8%, CCC: +15%

**Investor sentiment → capital access**:
```
overall < 30  → "restricted"
overall > 70  → "favorable"
else          → "normal"
```

**Cash runway**:
```
burnRate = max(0, −netIncome)
cashRunway = floor(totalLiquidity / burnRate)
liquidityCrisis = cashRunway < 2 OR availableCash < minRequired
```

### 16.3 HR Expansions

**Source**: `engine/modules/HRExpansions.ts`

**Career levels**: junior (0 XP), mid (1,000), senior (3,000), lead (6,000), principal (10,000)

**Ramp-up**: Round 1: 30%, Round 2: 70%, Round 3+: 100%. Mentor: ×1.5

**Team dynamics**:
```
cohesion ×= (1 − turnoverRate)
  + min(15, teamBuildingInvestment / $100K)
conflictLevel += 10 if growth > 20%, −5 natural decay
productivityMultiplier = max(0.5, 1 + (cohesion − 50)/200 − conflictLevel/200)
rdMultiplier = 1 + innovationSynergy/100 × 0.3 + knowledgeSharing/100 × 0.2
```

**Promotion effects**: +20 morale, −30% turnover, +15% salary
**Blocked promotion**: +20% turnover, −10 morale

### 16.4 Marketing Expansions

**Source**: `engine/modules/MarketingExpansions.ts`

**Performance marketing**:
```
IMPACT_PER_MILLION = 15%, MAX_BOOST = 50%, DECAY_RATE = 70%
newBoost = min(50%, (budget / $1M) × 15%)
currentBoost = min(50%, newBoost + previousBoost × 30%)
```

**Channel effectiveness matrix** (multiplier by segment):

| Channel | Budget | General | Professional | Enthusiast | Active |
|---------|--------|---------|-------------|-----------|--------|
| Retail | 1.2 | 1.0 | 0.6 | 0.8 | 1.1 |
| Digital | 0.8 | 1.0 | 0.8 | 1.3 | 1.0 |
| Enterprise | 0.3 | 0.5 | 1.5 | 0.4 | 0.3 |
| Carrier | 1.5 | 1.2 | 0.7 | 0.9 | 1.0 |

**Competitor response**: 30% probability if segment spend > $5M, intensity 70% × difficulty

### 16.5 R&D Expansions (Tech Tree)

**Source**: `engine/modules/RDExpansions.ts`

**54-node tech tree across 6 families × 5 tiers**:

| Family | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
|--------|--------|--------|--------|--------|--------|
| Battery | Extended Battery, Power Mgmt | Fast Charge, Wireless Charge | Graphene, Solar | Solid State, Energy Harvest | Perpetual Power |
| Camera | Enhanced Optics, Wide Angle | Night Vision, Computational | 8K Video, 3D Depth | Pro Cinema, Holographic | Quantum Imaging |
| AI | Smart Assistant, Predictive | On-Device ML, Context | Autonomous Agent, Emotion | Neural Processing, Adaptive UX | Sentient OS |
| Durability | Gorilla Glass, Rubber Armor | IP68, Shock Absorb | MIL-STD, Self-Healing | Extreme Env, Titanium | Indestructible |
| Display | OLED, High Brightness | 120Hz, Always-On | Adaptive ProMotion, Under-Display Cam | Micro-LED, Foldable | Holographic |
| Connectivity | 5G Modem, WiFi 6 | mmWave, WiFi 6E | Satellite SOS, UWB | LEO Satellite, Mesh | Quantum Comm |

**Prerequisites**: AND logic (all required) + OR groups (any one group). Tier N generally requires at least one Tier N−1 node in same family.

**Risk by research level**:
| Level | Delay Prob | Overrun Prob |
|-------|-----------|-------------|
| Conservative | 5% | 5% |
| Moderate | 15% | 20% |
| Aggressive | 30% | 40% |

**Overrun magnitude**: 10–30% of research cost

**Platform strategy**: $50M investment, 25% cost reduction, 20% dev speed bonus, quality floor 60

**Spillover rate**: 20% of quality bonuses transfer to related segments

**Research decay**: Warning at 6 rounds unused, −50% effectiveness at 12 rounds

---

## 17. Cross-Module Dependency Map

```
┌─────────────────────────────────────────────────────────────┐
│                     ROUND PIPELINE                          │
│                                                             │
│  ┌──────────┐                                               │
│  │ STEP 0   │  Rubber-Banding factors calculated            │
│  │ RB Calc  │──────────────────────────────────────┐        │
│  └──────────┘                                      │        │
│       │                                            ▼        │
│  ┌────┴────────────── STEP 1: PER TEAM ──────────────────┐  │
│  │                                                       │  │
│  │  Materials ──► Factory ──► HR ──► R&D ──► Marketing   │  │
│  │      │            │         │       │         │       │  │
│  │      │            │         │       │         │       │  │
│  │      ▼            ▼         ▼       ▼         ▼       │  │
│  │  inventory    efficiency  morale  products  brandValue │  │
│  │  holdingCost  production  salary  patents   pricing    │  │
│  │  payables     upgrades    hiring  rdPoints  promotions │  │
│  │               ESG        training            decay     │  │
│  │               machinery  benefits                      │  │
│  │                                                       │  │
│  │  ──► Finance (reads cash after all other deductions)  │  │
│  │      debt, equity, dividends, board meetings          │  │
│  │                                                       │  │
│  │  ──► Events (applied last, can override anything)     │  │
│  └───────────────────────────────────────────────────────┘  │
│       │                                                     │
│  ┌────┴─────┐                                               │
│  │ STEP 2   │  Market Simulation (all teams simultaneously) │
│  │ Market   │  reads: products, brandValue, factories, RB   │
│  │ Softmax  │  writes: marketShares, units sold, revenue    │
│  └──────────┘                                               │
│       │                                                     │
│  ┌────┴─────┐                                               │
│  │ STEP 3   │  Financial reporting + state finalization      │
│  │ Finance  │  netIncome, EPS, assets, equity, statements   │
│  └──────────┘                                               │
│       │                                                     │
│  ┌────┴─────┐                                               │
│  │ STEP 4-5 │  Rankings + next market state                  │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key Cross-Module Interactions

| From | To | What Flows |
|------|-----|-----------|
| Rubber-Banding → Factory | COGS relief | `costReliefFactor` reduces production costs |
| Rubber-Banding → HR | Hiring relief | `costReliefFactor` reduces hiring costs |
| Rubber-Banding → Marketing | Brand decay | `brandDecayMultiplier` accelerates decay for leaders |
| Rubber-Banding → Market | Quality bar | `qualityExpectationBoost` raises bar for leaders |
| Rubber-Banding → Market | Perception | `perceptionBonus` boosts quality score for trailers |
| Factory → HR | Staffing needs | Factory size determines worker/supervisor/engineer counts |
| Factory → R&D | Speed bonus | Rapid Prototyping upgrade gives +50% R&D speed |
| Factory → Market | Capacity cap | Production capacity limits units sold |
| Factory → Finance | Cash drain | Machinery, upgrades, ESG deducted from cash |
| HR → R&D | Engineer output | Engineer count × stats → rdProgress points |
| HR → Market | Morale → satisfaction | Workforce morale feeds customer service scores |
| HR → Finance | Labor costs | Salaries, benefits, hiring costs deducted |
| R&D → Factory | Tech unlock | Technologies enable higher-tier upgrades |
| R&D → Market | Product quality | Quality and features drive market scores |
| R&D → Market | Patents | Patent bonuses to market share and quality |
| Marketing → Market | Brand value | Brand score is one of 5 market scoring dimensions |
| Marketing → Market | Pricing | Product prices determine price score |
| Finance → All | Cash gate | Insufficient cash blocks decisions everywhere |
| Events → All | Modifiers | Can override revenue, costs, brand, morale, capacity |
| Economy → Market | Demand | GDP, confidence, inflation multiply segment demand |
| Economy → Finance | Rates | Interest rates affect borrowing costs |
| Experience → Market | Unit costs | Cumulative production reduces COGS |
| Satisfaction → Market | Organic growth | High satisfaction → free market share gain |
| Materials → Factory | Production | Material availability gates production output |
| Machinery → Factory | Capacity + quality | Machines provide capacity and reduce defects |

---

## 18. State Reference

`TeamState` (from `engine/types/state.ts`) — all fields on a team's state object:

### Financial
| Field | Type | Description |
|-------|------|-------------|
| `cash` | number | Available cash |
| `revenue` | number | This round's revenue |
| `netIncome` | number | Revenue − total costs |
| `totalAssets` | number | Cash + factory value |
| `totalLiabilities` | number | shortTermDebt + longTermDebt |
| `shortTermDebt` | number | T-bills, credit lines, loans ≤12mo |
| `longTermDebt` | number | Bonds, loans >12mo |
| `shareholdersEquity` | number | Assets − liabilities |
| `marketCap` | number | EPS × shares × PE |
| `sharesIssued` | number | Outstanding shares |
| `sharePrice` | number | marketCap / sharesIssued |
| `eps` | number | netIncome / sharesIssued |
| `revenueByRegion?` | Record | Revenue per region for FX |
| `financialStatements?` | obj | Income, balance sheet, cash flow |
| `previousFinancialStatements?` | obj | Prior round for trends |

### Inventory
| Field | Type | Description |
|-------|------|-------------|
| `inventory.finishedGoods` | Record<Segment, number> | Units per segment |
| `inventory.rawMaterials` | number | Dollar value |
| `inventory.workInProgress` | number | Dollar value |
| `cogs` | number | Cost of goods sold |
| `accountsReceivable` | number | Money owed by customers |
| `accountsPayable` | number | Money owed to suppliers |

### Operations
| Field | Type | Description |
|-------|------|-------------|
| `factories` | Factory[] | All factories |
| `products` | Product[] | All products |
| `employees` | Employee[] | All employees |
| `workforce.totalHeadcount` | number | Employee count |
| `workforce.averageMorale` | number | 0–100 |
| `workforce.averageEfficiency` | number | 0–100 |
| `workforce.laborCost` | number | Total salary cost |
| `workforce.turnoverRate` | number | Annual rate |

### Brand & Market
| Field | Type | Description |
|-------|------|-------------|
| `brandValue` | number | 0–1 |
| `marketShare` | Record<Segment, number> | Share per segment |

### R&D
| Field | Type | Description |
|-------|------|-------------|
| `rdBudget` | number | R&D spending |
| `rdProgress` | number | Accumulated points |
| `patents` | number or Patent[] | Patent count/details |
| `unlockedTechnologies?` | string[] | Researched tech IDs |

### ESG
| Field | Type | Description |
|-------|------|-------------|
| `esgScore` | number | 0–1000 |
| `co2Emissions` | number | Total tons |

### Rubber-Banding
| Field | Type | Description |
|-------|------|-------------|
| `rubberBanding?.position` | number | (teamAvg − globalAvg) / globalAvg |
| `rubberBanding?.costReliefFactor` | number | 0 to 0.12 |
| `rubberBanding?.perceptionBonus` | number | 0 to 0.08 |
| `rubberBanding?.brandDecayMultiplier` | number | 1.0 to 1.5 |
| `rubberBanding?.qualityExpectationBoost` | number | 0 to 5.0 |

### Game State
| Field | Type | Description |
|-------|------|-------------|
| `round` | number | Current round |
| `complexityLevel?` | string | "simple" / "standard" / "advanced" |
| `version` | StateVersion | Engine + schema version |

### Expansion Fields
| Field | Type | Description |
|-------|------|-------------|
| `materials?` | obj | Material inventory, orders, region |
| `tariffs?` | TariffState | Trade tariffs |
| `machineryStates?` | Record | Per-factory machinery |
| `wasteMetrics?` | obj | Waste per factory |
| `customerLoyalty?` | Record<Segment, number> | 0–100 per segment |
| `activeContracts?` | ContractOrder[] | NPC bulk orders |
| `activeResearchTrack?` | string | "process" / "commerce" / "innovation" |
| `researchDecayTimers?` | Record | Tech → rounds since use |
| `productionAllocations?` | Record | % per segment |
| `researchProposals?` | ResearchProposal[] | Multiplayer collab |
| `achievements?` | UnlockedAchievement[] | Victory tracking |
| `achievementScore?` | number | Sum of points |
| `benefits` | CompanyBenefits | Benefits package |

---

## 19. Decision Reference

`AllDecisions` (from `engine/types/decisions.ts`) — everything a player can do per round:

### Factory Decisions
- `efficiencyInvestments` — per-factory {workers, supervisors, engineers, machinery, factory}
- `greenInvestments` — CO2 reduction spending per factory
- `upgradePurchases` — factory upgrades to buy (20 types)
- `newFactories` — build new factories {name, region}
- `productionAllocations` — quantity per segment per factory
- `esgInitiatives` — 20 ESG programs (booleans/amounts)
- `machineryDecisions` — buy/maintain/replace machines
- `materialTierChoices` — material quality per segment (1–5)

### HR Decisions
- `hires[]` — {factoryId, role, candidateId, candidateData}
- `fires[]` — {employeeId}
- `recruitmentSearches[]` — {role, tier, factoryId}
- `trainingPrograms[]` — {role, programType}
- `benefitChanges` — partial BenefitsPackage update
- `salaryMultiplierChanges` — adjustments by role

### Finance Decisions
- `treasuryBillsIssue` — short-term debt amount
- `corporateBondsIssue` — long-term debt amount
- `loanRequest` — {amount, termMonths}
- `stockIssuance` — {shares, pricePerShare}
- `sharesBuyback` — buyback spend amount
- `dividendPerShare` — dividend per share
- `economicForecast` — {gdpForecast, inflationForecast}
- `boardProposals` — up to 13 proposal types

### Marketing Decisions
- `advertisingBudget` — spend per segment
- `brandingInvestment` — overall brand investment
- `productPricing` — {productId, newPrice}
- `promotions` — {segment, discountPercent, duration}
- `sponsorships` — {name, cost, brandImpact}

### R&D Decisions
- `rdBudget` — total R&D allocation
- `newProducts[]` — {name, segment, targetQuality, targetFeatures} or {archetypeId}
- `productImprovements[]` — {productId, qualityIncrease, featuresIncrease}

---

*Generated from engine source code. For implementation details, see the source files referenced in each section.*
