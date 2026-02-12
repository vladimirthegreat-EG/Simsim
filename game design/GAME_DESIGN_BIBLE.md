# Business Simulation Game - Complete Design Bible

> **Version:** Current Demo (v3.0.0 Engine)
> **Tech Stack:** Next.js, TypeScript, tRPC, Prisma, Tailwind CSS
> **Purpose:** This document captures EVERY variable, formula, mechanic, and interaction in the current game for redesign purposes.

---

## Table of Contents

1. [Game Overview](#1-game-overview)
2. [Core Game Loop](#2-core-game-loop)
3. [Team State (All Variables)](#3-team-state-all-variables)
4. [Market State (All Variables)](#4-market-state-all-variables)
5. [Module: Factory](#5-module-factory)
6. [Module: HR (Human Resources)](#6-module-hr)
7. [Module: R&D (Research & Development)](#7-module-rd)
8. [Module: Marketing](#8-module-marketing)
9. [Module: Finance](#9-module-finance)
10. [Module: ESG (Environmental, Social, Governance)](#10-module-esg)
11. [Market Simulator & Competition](#11-market-simulator--competition)
12. [Materials & Supply Chain](#12-materials--supply-chain)
13. [Tariffs System](#13-tariffs-system)
14. [Financial Statements Engine](#14-financial-statements-engine)
15. [Achievement System](#15-achievement-system)
16. [Economic Cycles](#16-economic-cycles)
17. [Event System](#17-event-system)
18. [Balance & Rubber-Banding](#18-balance--rubber-banding)
19. [Complexity System](#19-complexity-system)
20. [Strategy Archetypes](#20-strategy-archetypes)
21. [All Formulas Reference](#21-all-formulas-reference)
22. [UX/UI Screens & Interactions](#22-uxui-screens--interactions)
23. [Data Flow & Architecture](#23-data-flow--architecture)
24. [Known Design Issues & Gaps](#24-known-design-issues--gaps)
25. [Monte Carlo Balance Test Results](#25-monte-carlo-balance-test-results)
26. [Balance Redesign Proposals](#26-balance-redesign-proposals)

---

## 1. Game Overview

### What Is It?
A multiplayer business simulation where teams compete as phone manufacturers. Each team manages a company across 5 departments (Factory, HR, R&D, Marketing, Finance) over multiple rounds. Teams make decisions each round, the engine processes them simultaneously, and results are calculated based on competitive dynamics.

### Core Theme
**Phone manufacturing company** - Teams build phones across 5 market segments, competing for market share, revenue, and EPS (Earnings Per Share).

### Win Condition
Ranked by **total revenue** at end of game (typically 8 rounds). Secondary rankings by EPS and total market share.

### Players
- **2-8 teams** per game (typically 4)
- Each team = group of human players collaborating
- **1 facilitator** controls game flow, injects events, advances rounds

### Game Flow
1. Facilitator creates game, teams join via code
2. Each round: teams make decisions across all departments
3. Facilitator advances round → engine processes all decisions simultaneously
4. Results shown: revenue, market share, rankings, competitor intel
5. Repeat for configured number of rounds (default: 8)

---

## 2. Core Game Loop

### Round Processing Order (SimulationEngine.processRound)

```
For each team:
  1. Process Materials & Tariffs (before production)
     - Check material order arrivals
     - Update inventory
     - Calculate holding costs
     - Process tariff events
  2. Process Factory Module
     - Efficiency investments
     - Green investments
     - Upgrade purchases
     - New factory construction
     - ESG initiatives
     - Machinery processing
  3. Process HR Module
     - Hires
     - Fires
     - Training programs
     - Benefit changes
     - Turnover calculation
     - Workforce summary update
  4. Process R&D Module
     - Set R&D budget
     - Calculate engineer R&D output
     - New product development
     - Product improvements
     - Patent generation
  5. Process Marketing Module
     - Advertising by segment
     - Branding investment
     - Promotions
     - Sponsorships
     - Brand decay
  6. Process Finance Module
     - Treasury bills issuance
     - Corporate bonds issuance
     - Bank loans
     - Stock issuance
     - Share buybacks
     - Dividends
     - Economic forecasts
  7. Apply Events (if any targeting this team)

After all teams processed:
  8. Market Simulation (competition between all teams)
     - Calculate demand per segment
     - Score each team per segment (price, quality, brand, ESG, features)
     - Softmax market share allocation
     - Apply ESG bonuses/penalties
     - Apply rubber-banding (if round >= 3)
  9. Update team states with market results
     - Revenue, costs, net income
     - EPS, market cap, share price
     - Financial statements generation
  10. Calculate rankings
  11. Generate next market state
```

### Determinism Guarantee
- All randomness from seeded RNG via `EngineContext`
- Same seed + same decisions = identical outputs
- Each team gets its own RNG context to prevent cross-contamination
- Separate RNG streams for: HR, R&D, Market, Factory

---

## 3. Team State (All Variables)

### Financial Variables
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `cash` | number | $200,000,000 | Available liquid cash |
| `revenue` | number | 0 | Total revenue this round |
| `netIncome` | number | 0 | Revenue minus all costs |
| `totalAssets` | number | $250,000,000 | Cash + factory value |
| `totalLiabilities` | number | 0 | shortTermDebt + longTermDebt |
| `shortTermDebt` | number | 0 | Treasury bills, credit lines, short-term loans |
| `longTermDebt` | number | 0 | Corporate bonds, long-term bank loans |
| `shareholdersEquity` | number | $250,000,000 | totalAssets - totalLiabilities |
| `marketCap` | number | $500,000,000 | Company market capitalization |
| `sharesIssued` | number | 10,000,000 | Outstanding shares |
| `sharePrice` | number | $50 | marketCap / sharesIssued |
| `eps` | number | 0 | netIncome / sharesIssued |
| `accountsReceivable` | number | 0 | Money owed by customers |
| `accountsPayable` | number | 0 | Money owed to suppliers |
| `cogs` | number | 0 | Cost of goods sold this round |

### Inventory
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `inventory.finishedGoods` | Record<Segment, number> | All 0 | Units by segment |
| `inventory.rawMaterials` | number | $5,000,000 | Dollar value of raw materials |
| `inventory.workInProgress` | number | 0 | Dollar value of WIP |

### Operations
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `factories` | Factory[] | 1 factory | Array of factory objects |
| `products` | Product[] | 5 products | Array of product objects |
| `employees` | Employee[] | [] | Array of employee objects |

### Workforce Summary
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `workforce.totalHeadcount` | number | 63 | Total employees |
| `workforce.averageMorale` | number | 75 | Average morale (0-100) |
| `workforce.averageEfficiency` | number | 70 | Average efficiency (0-100) |
| `workforce.laborCost` | number | $5,000,000 | Total salary cost |
| `workforce.turnoverRate` | number | 0.12 | Annual turnover rate |

### Brand & Market
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `brandValue` | number | 0.5 | Brand strength (0-1 scale) |
| `marketShare` | Record<Segment, number> | {} | Market share per segment |

### R&D
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `rdBudget` | number | 0 | Current R&D budget |
| `rdProgress` | number | 0 | Accumulated R&D points |
| `patents` | number | 0 | Number of patents held |

### ESG
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `esgScore` | number | 100 | ESG score (0-1000+) |
| `co2Emissions` | number | 1000 | CO2 emissions in tons |

### Benefits
| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `benefits.package.healthInsurance` | number | 50 | Coverage level (0-100) |
| `benefits.package.retirementMatch` | number | 30 | Match % (0-100) |
| `benefits.package.paidTimeOff` | number | 15 | Days per year |
| `benefits.package.parentalLeave` | number | 6 | Weeks |
| `benefits.package.stockOptions` | boolean | false | Stock options offered |
| `benefits.package.flexibleWork` | boolean | false | Flexible work offered |
| `benefits.package.professionalDevelopment` | number | 1000 | Annual budget per employee |

---

## 4. Market State (All Variables)

### Economic Conditions
| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `gdp` | 2.5 | -5 to 10 | GDP growth rate % |
| `inflation` | 2.0 | 0 to 15 | Inflation rate % |
| `consumerConfidence` | 75 | 20 to 100 | Consumer confidence index |
| `unemploymentRate` | 4.5 | 2 to 15 | Unemployment % |

### FX Rates
| Pair | Default | Description |
|------|---------|-------------|
| EUR/USD | 1.10 | Euro to Dollar |
| GBP/USD | 1.27 | Pound to Dollar |
| JPY/USD | 0.0067 | Yen to Dollar |
| CNY/USD | 0.14 | Yuan to Dollar |
| `fxVolatility` | 0.15 | FX movement range |

### Interest Rates
| Rate | Default | Description |
|------|---------|-------------|
| `federalRate` | 5.0% | Federal funds rate |
| `tenYearBond` | 4.5% | 10-year bond yield |
| `corporateBond` | 6.0% | Corporate bond rate |

### Demand by Segment
| Segment | Total Demand | Price Range | Growth Rate |
|---------|-------------|-------------|-------------|
| Budget | 500,000 | $100-$300 | 2% |
| General | 400,000 | $300-$600 | 3% |
| Enthusiast | 200,000 | $600-$1,000 | 4% |
| Professional | 100,000 | $1,000-$1,500 | 2% |
| Active Lifestyle | 150,000 | $400-$800 | 5% |

### Market Pressures
| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `priceCompetition` | 0.5 | 0.2-0.9 | Price competition intensity |
| `qualityExpectations` | 0.6 | 0.3-0.95 | Quality bar (rises +0.02/round) |
| `sustainabilityPremium` | 0.3 | 0.1-0.6 | ESG importance (rises +0.01/round) |

---

## 5. Module: Factory

### Factory Object
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `id` | string | auto | Unique factory ID |
| `name` | string | "Main Factory" | Display name |
| `region` | Region | "North America" | Location |
| `productionLines` | ProductionLine[] | 1 line | Manufacturing lines |
| `workers` | number | 50 | Worker count |
| `engineers` | number | 8 | Engineer count |
| `supervisors` | number | 5 | Supervisor count |
| `efficiency` | number | 0.7 | 0-1 effectiveness multiplier |
| `utilization` | number | 0 | 0-1 capacity usage |
| `defectRate` | number | 0.05 | 5% base defect rate |
| `materialLevel` | number | 1 | Material quality (1-5) |
| `shippingCost` | number | $100K × regional modifier | Shipping cost |
| `storageCost` | number | $50K × regional modifier | Storage cost |
| `co2Emissions` | number | 1000 | CO2 output in tons |
| `burnoutRisk` | number | 0 | Accumulates at high utilization |
| `maintenanceBacklog` | number | 0 | Deferred maintenance hours |
| `warrantyReduction` | number | 0 | From Six Sigma |
| `recallProbability` | number | 0.05 | 5% base |
| `stockoutReduction` | number | 0 | From Supply Chain upgrade |
| `demandSpikeCapture` | number | 0 | From Warehousing upgrade |
| `costVolatility` | number | 0.15 | 15% base cost variance |

### Production Lines
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Line identifier |
| `segment` | Segment | Target segment |
| `productId` | string | Product being made |
| `capacity` | number | Units per round |
| `efficiency` | number | 0-1 line efficiency |

### New Factory Cost: **$50,000,000**

### Regional Cost Modifiers
| Region | Modifier | Effect |
|--------|----------|--------|
| North America | 1.00 | Baseline |
| Europe | 1.00 | Same as baseline |
| Asia | 0.85 | 15% cheaper |
| MENA | 0.90 | 10% cheaper |

### Efficiency Investment Formula
```
Per investment type:
  - Workers:     1.0% per $1M invested
  - Supervisors: 1.5% per $1M invested
  - Engineers:   2.0% per $1M invested
  - Machinery:   1.2% per $1M invested
  - Factory:     0.8% per $1M invested

Diminishing Returns:
  After $10M cumulative → 50% effectiveness

  Max Efficiency: 1.0 (100%)
```

### Factory Upgrades (20 Total)

#### Tier 1 - No Prerequisites (Basic)
| Upgrade | Cost | Effect |
|---------|------|--------|
| Six Sigma | $75M | 40% defect reduction, 50% warranty reduction, 75% recall reduction |
| Warehousing | $100M | 90% storage cost reduction, 90% demand spike capture |
| Lean Manufacturing | $40M | +15% efficiency, 10% operating cost reduction |
| Continuous Improvement | $30M | +1% efficiency per round (caps at 10%) |

#### Tier 2 - R&D Level 1 Required
| Upgrade | Cost | Effect |
|---------|------|--------|
| Automation | $75M | 80% worker reduction (5x productivity), 60% cost volatility reduction |
| Material Refinement | $100M | +1 material level |
| Modular Lines | $80M | 50% changeover time reduction |
| Water Recycling | $25M | 30% water cost reduction, +50 ESG |
| Solar Panels | $45M | 40% energy cost reduction, +100 ESG |

#### Tier 3 - R&D Level 2 Required
| Upgrade | Cost | Effect |
|---------|------|--------|
| Supply Chain | $200M | 70% shipping cost reduction, 70% stockout reduction |
| Digital Twin | $60M | 20% maintenance cost reduction, predictive alerts |
| IoT Integration | $50M | 15% breakdown reduction, real-time monitoring |
| Waste to Energy | $35M | 20% waste savings, +75 ESG |
| Smart Grid | $55M | 25% energy efficiency, +80 ESG |
| Rapid Prototyping | $40M | 50% faster R&D prototypes |

#### Tier 4 - R&D Level 3 Required
| Upgrade | Cost | Effect |
|---------|------|--------|
| Advanced Robotics | $100M | 50% capacity increase, 30% labor reduction |
| Quality Lab | $60M | 50% defect reduction, 30% QA speed increase |
| Carbon Capture | $70M | 50% CO2 reduction, +150 ESG |
| Flexible Manufacturing | $90M | Can produce all segments efficiently |

#### Tier 5 - R&D Level 4 Required
| Upgrade | Cost | Effect |
|---------|------|--------|
| Clean Room | $120M | Enables high-purity production, +20% Professional price |

### Utilization & Burnout System
```
When utilization > 95%:
  - Burnout risk += 15% per round
  - Maintenance backlog += 100 hours per round
  - Defect rate += 2% per round

When utilization <= 95%:
  - Burnout risk decays by 5% per round
  - Maintenance backlog reduces by 20 hours per round

Caps:
  - Burnout risk: max 100%
  - Defect rate: max 25%
```

### CO2 Reduction Formula
```
CO2 Reduction = (investmentAmount / $100,000) × 10 tons
```

---

## 6. Module: HR

### Employee Stats (8 base + 2 role-specific)

**All Employees:**
| Stat | Range | Description |
|------|-------|-------------|
| efficiency | 0-100 | Overall work output quality |
| accuracy | 0-100 | Defect reduction capability |
| speed | 0-100 | Production rate multiplier |
| stamina | 0-100 | Resistance to burnout |
| discipline | 0-100 | Consistency and rule-following |
| loyalty | 0-100 | Retention likelihood |
| teamCompatibility | 0-100 | Collaboration effectiveness |
| health | 0-100 | Sick leave probability reduction |

**Engineers (additional):**
| Stat | Range | Description |
|------|-------|-------------|
| innovation | 0-100 | R&D output multiplier |
| problemSolving | 0-100 | Bug reduction capability |

**Supervisors (additional):**
| Stat | Range | Description |
|------|-------|-------------|
| leadership | 0-100 | Team productivity boost |
| tacticalPlanning | 0-100 | Team size optimization |

### Base Salaries
| Role | Base Salary |
|------|------------|
| Worker | $45,000 |
| Engineer | $85,000 |
| Supervisor | $75,000 |

### Salary Formula
```
Average Stat = sum(all stats) / count(stats)
Multiplier = 0.8 + (averageStat / 100) × 1.4   // Range: 0.8x to 2.2x
Salary = min($500,000, round(baseSalary × multiplier))
```

### Hiring Cost
```
Hiring Cost = salary × 0.15   // 15% of salary
```

### Recruitment Tiers
| Tier | Cost | Candidates | Stat Range |
|------|------|------------|------------|
| Basic | $5,000 | 3 | 70-110 |
| Premium | $15,000 | 5 | 90-130 |
| Executive | $50,000 | 4 | 120-160 |

### Training
| Role | Training Cost | Effect |
|------|--------------|--------|
| Worker | $50,000 | +5-15% efficiency |
| Engineer | $75,000 | +5-15% efficiency |
| Supervisor | $100,000 | +5-15% efficiency |

### Training Fatigue System
```
Programs per year threshold: 2
Beyond threshold: -20% effectiveness per extra program
Minimum effectiveness: 20%
Cooldown: 2 rounds between training for full effect
```

### Turnover Formula
```
Base annual rate: 12%
Monthly rate: 1%

Adjustments:
  If morale < 50: +15% annually
  Loyalty factor: rate × (150 - loyalty) / 100
  If burnout > 50: +10% annually

Benefits turnover reduction: min(40%, calculated from benefits)
```

### Worker Output Formula
```
Output = 100 units × (efficiency / 100) × (speed / 100)
```

### Engineer R&D Output Formula
```
R&D Points = 10 × (efficiency / 100) × (speed / 100) × (1 + innovation / 200) × (1 - burnout / 200)
```

### Supervisor Boost Formula
```
Leadership Multiplier = 1.0 + (leadership / 500)   // 0-20% boost
```

### Employee Value Score (Composite)
```
Value = efficiency × 0.25 + accuracy × 0.20 + speed × 0.15 +
        stamina × 0.10 + discipline × 0.10 + loyalty × 0.10 +
        teamCompatibility × 0.10
```

### Staffing Ratios
```
Workers per machine: 2.5
Workers per supervisor: 15
Engineers per factory: 8

With Automation upgrade: workers needed × 0.2 (80% reduction)
```

### Hiring Pipeline (Phase 7)
```
Ramp-up rounds: 2
Productivity by round: [30%, 70%, 100%]
```

### Benefits System

**Costs per employee per year:**
| Benefit | Cost Formula |
|---------|-------------|
| Health Insurance | (level / 10) × $5,000 |
| Retirement Match | (level / 10) × $3,000 |
| Paid Time Off | days × $200 |
| Parental Leave | weeks × $1,000 |
| Stock Options | $2,000 (if enabled) |
| Flexible Work | $500 (if enabled) |
| Prof. Development | $1 per dollar budgeted |

**Morale Impact (cumulative, capped at 50%):**
| Benefit | Impact per max |
|---------|---------------|
| Health Insurance | +15% |
| Retirement Match | +10% |
| Paid Time Off | +8% |
| Parental Leave | +5% |
| Stock Options | +12% |
| Flexible Work | +8% |
| Prof. Development | +5% |

**Turnover Reduction (cumulative, capped at 40%):**
| Benefit | Reduction per max |
|---------|------------------|
| Health Insurance | -10% |
| Retirement Match | -8% |
| Paid Time Off | -5% |
| Parental Leave | -3% |
| Stock Options | -7% |
| Flexible Work | -4% |
| Prof. Development | -3% |

---

## 7. Module: R&D

### Products
Each product has:
| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique ID |
| `name` | string | Display name |
| `segment` | Segment | Target market segment |
| `price` | number | Sale price per unit |
| `quality` | number | 0-100 quality score |
| `features` | number | 0-100 feature score |
| `reliability` | number | 0-100 reliability score |
| `developmentStatus` | string | "in_development" / "ready" / "launched" |
| `developmentProgress` | number | 0-100% completion |
| `targetQuality` | number | Target quality when complete |
| `targetFeatures` | number | Target features when complete |
| `roundsRemaining` | number | Rounds until development complete |
| `unitCost` | number | Cost to produce one unit |

### Initial Products (All teams start with these, all "launched")
| Product | Segment | Price | Quality | Features | Reliability | Unit Cost |
|---------|---------|-------|---------|----------|-------------|-----------|
| Standard Phone | General | $450 | 65 | 50 | 70 | $135 |
| Budget Phone | Budget | $200 | 50 | 30 | 60 | $85 |
| Pro Phone | Enthusiast | $800 | 80 | 70 | 75 | $235 |
| Enterprise Phone | Professional | $1,250 | 90 | 85 | 90 | $385 |
| Active Phone | Active Lifestyle | $600 | 70 | 60 | 80 | $185 |

### Unit Cost Formula
```
Unit Cost = rawMaterialCost[segment] + laborCostPerUnit + overheadCostPerUnit + qualityPremium

Raw Material Cost by Segment:
  Budget:          $50
  General:         $100
  Enthusiast:      $200
  Professional:    $350
  Active Lifestyle: $150

Labor Cost Per Unit: $20
Overhead Cost Per Unit: $15

Quality Premium: (targetQuality - 50) × $0.50
```

### Development Cost Formula
```
Base Cost by Segment:
  Budget:          $5,000,000
  General:         $10,000,000
  Enthusiast:      $20,000,000
  Professional:    $35,000,000
  Active Lifestyle: $15,000,000

Quality Multiplier = 1 + (targetQuality - 50) / 50   // Range: 0.5x to 2.0x
Development Cost = baseCost × qualityMultiplier
```

### Development Time Formula
```
Base Rounds: 2
Quality Factor: max(0, targetQuality - 50) × 0.02 extra rounds
Engineer Speedup: min(50%, engineerCount × 5%)

Total Rounds = (baseRounds + qualityFactor) × (1 - engineerSpeedup)
Minimum: 1 round
```

### Product Improvement Cost
```
Cost = qualityIncrease × $1,000,000 + featuresIncrease × $500,000
```

### Patent Generation
```
When rdProgress >= 500:
  patents += 1
  rdProgress -= 500
```

### Patent Value
```
Quality Bonus: min(10, patents × 2)        // Up to +10 quality
Cost Reduction: min(15%, patents × 3%)      // Up to 15%
Market Share Bonus: min(5%, patents × 1%)   // Up to 5%
```

### R&D Technology Tree
| Technology | Cost | R&D Points Required | Prerequisite |
|-----------|------|---------------------|--------------|
| Process Optimization | $5M | 100 | None |
| Advanced Manufacturing | $15M | 300 | Process Optimization |
| Industry 4.0 | $30M | 600 | Advanced Manufacturing |
| Breakthrough Technology | $50M | 1000 | Industry 4.0 |

---

## 8. Module: Marketing

### Advertising Impact Formula
```
Base Impact: 0.15% brand increase per $1M

Segment Multipliers:
  Budget:          1.1x
  General:         1.0x
  Enthusiast:      0.75x
  Professional:    0.5x
  Active Lifestyle: 0.85x

Diminishing Returns:
  Processed in $3M chunks
  Each chunk: effectiveness × 40% (drops to 40% for next chunk)

Example: $9M spend on General:
  Chunk 1 ($3M): 3 × 0.0015 × 1.0 × 1.0 = 0.45%
  Chunk 2 ($3M): 3 × 0.0015 × 1.0 × 0.4 = 0.18%
  Chunk 3 ($3M): 3 × 0.0015 × 1.0 × 0.16 = 0.072%
  Total: 0.702% brand increase
```

### Branding Investment Formula
```
Base Impact: 0.25% per $1M

Up to $5M: linear (5 × 0.0025 = 1.25%)
Beyond $5M: logarithmic
  Extra Return = 0.0025 × 2.5 × log2(1 + extraMillions / 5)
```

### Brand Growth Cap
```
Max growth per round: 2.0%
Any growth above this is wasted (diminishing returns message)
```

### Brand Decay
```
Decay per round: 6.5% of current brand value
Decay = brandValue × 0.065
Brands need constant investment to maintain
```

### Sponsorships
| Sponsorship | Cost | Brand Impact | Target Segment |
|-------------|------|-------------|----------------|
| Tech Conference | $7,500,000 | +1.2% | Professional |
| Sports Jersey | $22,000,000 | +3.0% | Active Lifestyle |
| Gaming Tournament | $4,500,000 | +0.9% | Enthusiast |
| National TV Campaign | $35,000,000 | +4.5% | All |
| Influencer Partnership | $3,000,000 | +0.6% | General |
| Retailer Partnership | $12,000,000 | +1.8% | Budget |

### Price Elasticity by Segment
| Segment | Elasticity | Meaning |
|---------|-----------|---------|
| Budget | 2.5 | Very price sensitive |
| General | 1.8 | Moderately sensitive |
| Enthusiast | 1.2 | Less sensitive |
| Professional | 0.8 | Price insensitive |
| Active Lifestyle | 1.5 | Moderate |

### Promotion Impact Formula
```
Sales Boost = (discountPercent / 100) × elasticity × (1 + brandValue)
Margin Reduction = discountPercent / 100
```

---

## 9. Module: Finance

### Debt Instruments

**Treasury Bills (Short-term):**
- Cash += amount
- shortTermDebt += amount
- totalLiabilities += amount
- Investor sentiment: -8%

**Corporate Bonds (Long-term):**
- Cash += amount
- longTermDebt += amount
- totalLiabilities += amount
- Investor sentiment: -5%

**Bank Loans:**
- Interest rate = corporateBond rate / 100
- Interest cost = amount × rate × (termMonths / 12)
- If term ≤ 12 months → short-term debt
- If term > 12 months → long-term debt

### Stock Issuance
```
Proceeds = shares × pricePerShare
cash += proceeds
sharesIssued += shares
shareholdersEquity += proceeds
sharePrice = marketCap / sharesIssued  (dilution)
```

### Share Buyback (Enhanced)
```
Shares purchased = floor(buybackAmount / currentSharePrice)
sharesIssued -= shares (floor at 1,000,000)
cash -= buybackAmount

EPS recalculation: netIncome / newSharesIssued
EPS growth = (newEPS - oldEPS) / oldEPS
Price boost = 1 + min(15%, epsGrowth × 50%)
sharePrice = oldSharePrice × priceBoost
marketCap = sharePrice × sharesIssued
```

### Dividend System
```
Total Dividends = dividendPerShare × sharesIssued
Dividend Yield = (dividendPerShare / sharePrice) × 100

Effects:
  Yield > 5%: -2% share price (growth concern)
  Yield 2-5%: +2% share price (healthy signal)
  Yield < 2%: neutral
```

### Financial Ratios
```
Current Ratio = (cash + accountsReceivable) / (shortTermDebt + accountsPayable)
Quick Ratio = (currentAssets × 0.8) / currentLiabilities
Cash Ratio = cash / currentLiabilities
Debt-to-Equity = totalLiabilities / shareholdersEquity
ROE = netIncome / shareholdersEquity
ROA = netIncome / totalAssets
Profit Margin = netIncome / revenue
Gross Margin = (revenue - revenue × 0.6) / revenue
Operating Margin = (netIncome × 1.2) / revenue
```

### Ratio Health Thresholds
| Ratio | Green | Yellow | Red |
|-------|-------|--------|-----|
| Current Ratio | ≥ 2.0 | ≥ 1.2 | < 1.2 |
| Quick Ratio | ≥ 1.5 | ≥ 1.0 | < 1.0 |
| Cash Ratio | ≥ 0.5 | ≥ 0.2 | < 0.2 |
| Debt/Equity | ≤ 0.3 | ≤ 0.6 | > 0.6 |
| ROE | ≥ 15% | ≥ 8% | < 8% |
| ROA | ≥ 8% | ≥ 4% | < 4% |
| Profit Margin | ≥ 15% | ≥ 5% | < 5% |
| Gross Margin | ≥ 40% | ≥ 25% | < 25% |
| Operating Margin | ≥ 20% | ≥ 10% | < 10% |

### Market Cap Formula (PE-Based)
```
If EPS > 0:
  Target PE = 15 (base)
    + min(10, epsGrowth × 50)          // Growth premium
    + (sentiment - 50) / 5             // Sentiment adjustment
    + profitabilityBonus               // +3 if margin > 15%, +1 if > 10%, -2 otherwise
    + leveragePenalty                  // -5 if D/E > 1.0, -2 if > 0.6
  Clamped: 5 to 30

  Market Cap = EPS × sharesIssued × targetPE

If EPS ≤ 0:
  Price-to-Sales = max(0.5, 2 + (sentiment - 50) / 25)
  Market Cap = revenue × priceToSales

Floor: max(bookValue × 0.5, totalAssets × 0.3)
```

### Board Approval Probability
```
Base: 50%
  + 10% if ROE > 15%
  + 5% if current ratio > 2.0
  - 15% if debt/equity > 0.6
  + 8% if ESG score > 600
  - 12% if ESG score < 300

Proposal-specific adjustments:
  Dividend: +20% if ROE > 12% AND cash ratio > 1.0, else -20%
  Expansion: +15% if D/E < 0.5, else -10%
  Acquisition: +10% if cash > $100M AND D/E < 0.4, else -25%
  Emergency Capital: 65% if D/E > 2, else 15%
  Stock Buyback: +15% if ROE > 10% AND cash > $50M

Clamped: 10% to 95%
```

### Credit Rating Spreads
| Rating | Spread |
|--------|--------|
| AAA | 0.0% |
| AA | 0.5% |
| A | 1.0% |
| BBB | 2.0% |
| BB | 4.0% |
| B | 8.0% |
| CCC | 15.0% |
| D | Cannot borrow |

---

## 10. Module: ESG

### ESG Score System (3-Tier Gradient)

**Penalty Tier (Score < 300):**
```
Penalty Rate = 8% - (score / 300) × (8% - 1%)
Revenue Penalty = -revenue × penaltyRate
Score 0   → 8% revenue loss
Score 150 → ~4.5% revenue loss
Score 299 → ~1% revenue loss
```

**Neutral Tier (300-600):** No effect (baseline)

**Benefit Tier (600+):** Risk mitigation, better board approval (handled in Finance module), +8% investor sentiment

### ESG Initiatives (20 Total)

#### Tier 1 - Available From Start
| Initiative | Cost | ESG Points |
|-----------|------|------------|
| Charitable Donation | Variable | (donation / netIncome) × 100 × 6.28 |
| Community Investment | Variable | (investment / revenue) × 100 × 9.5 |
| Code of Ethics | Free | +200 |
| Employee Wellness | $500K/yr | +60, -10% turnover |
| Community Education | Variable | +1 per $2K |

#### Tier 2 - ESG 100+ or Round 2+
| Initiative | Cost | ESG Points |
|-----------|------|------------|
| Workplace Health & Safety | $2M/yr | +200 |
| Fair Wage Program | Free | +260 |
| Carbon Offset Program | $20/ton CO2 | +1 per 10 tons |
| Renewable Energy Certs | Variable | +1 per $10K |
| Diversity & Inclusion | $1M/yr | +90, +5% morale |
| Transparency Report | $300K/yr | +50, +10% investor trust |

#### Tier 3 - ESG 300+ or Round 4+
| Initiative | Cost | ESG Points |
|-----------|------|------------|
| Supplier Ethics Program | +20% material costs | +150 |
| Water Conservation | $1.5M/yr | +80, -20% water costs |
| Zero Waste Commitment | $2M/yr | +100, -30% waste costs |
| Human Rights Audit | $800K/yr | +70 |
| Whistleblower Protection | $200K/yr | +40, -25% scandal risk |
| Biodiversity Protection | Variable | +1 per $5K |

#### Tier 4 - ESG 500+ or Round 6+
| Initiative | Cost | ESG Points |
|-----------|------|------------|
| Circular Economy | $3M/yr | +120, -20% material costs |
| Affordable Housing | Variable | +1 per $10K |
| Executive Pay Ratio | Free | +100 (caps exec pay at 50x avg) |

---

## 11. Market Simulator & Competition

### Segment Scoring Weights (v2.4.0)
| Segment | Price | Quality | Brand | ESG | Features | Total |
|---------|-------|---------|-------|-----|----------|-------|
| Budget | 50 | 22 | 8 | 8 | 12 | 100 |
| General | 32 | 28 | 10 | 10 | 20 | 100 |
| Enthusiast | 20 | 40 | 10 | 10 | 20 | 100 |
| Professional | 15 | 42 | 10 | 16 | 17 | 100 |
| Active Lifestyle | 25 | 32 | 12 | 10 | 21 | 100 |

### Score Calculation per Team per Segment

**Price Score:**
```
Quality-adjusted max price: segmentMaxPrice × (1 + quality × 0.002)
Price position = (adjustedMax - price) / (adjustedMax - segmentMin)

Price Floor Penalty (if price < segment minimum):
  Threshold: 15% below minimum
  Max penalty: 30% score reduction

Price Score = min(1, pricePosition) × priceWeight × floorPenaltyMultiplier
```

**Quality Score:**
```
Quality expectations by segment:
  Budget: 50, General: 65, Enthusiast: 80, Professional: 90, Active Lifestyle: 70

Ratio = quality / expectation
If ratio ≤ 1.0: multiplier = ratio
If ratio > 1.0: multiplier = 1.0 + sqrt(ratio - 1) × 0.5
Capped at 1.3x

Quality Score = min(1.3, qualityMultiplier) × qualityWeight
```

**Brand Score:**
```
Brand Score = sqrt(brandValue) × brandWeight
// sqrt() provides diminishing returns for high brand values
```

**ESG Score:**
```
ESG Score = (esgScore / 1000) × sustainabilityPremium × esgWeight
```

**Feature Score:**
```
Ratio = features / 100
If ratio ≤ 1.0: multiplier = ratio
If ratio > 1.0: multiplier = 1.0 + sqrt(ratio - 1) × 0.5
Capped at 1.3x

Feature Score = min(1.3, featureMultiplier) × featureWeight
```

**Quality Market Share Bonus:**
```
Bonus = quality × 0.001  // 0.1% per quality point added to total score
```

**Total Score = priceScore + qualityScore + brandScore + esgScore + featureScore + qualityBonus**

### Market Share Allocation (Softmax)
```
Temperature: 10

For each team in segment:
  expScore[i] = exp((score[i] - maxScore) / temperature)

share[i] = expScore[i] / sum(allExpScores)

Temperature effects:
  - Close scores (70,65,60,55): ~46%, 28%, 17%, 10%
  - Clear leader (80,60,55,50): ~79%, 11%, 6%, 4%
  - Dominant (90,50,45,40): ~97%, 2%, 1%, 1%
```

### Demand Calculation
```
For each segment:
  adjustedDemand = baseDemand
    × (1 + gdp / 100)                    // GDP multiplier
    × (consumerConfidence / 75)           // Confidence multiplier
    × (1 - inflation / 100 × 0.5)        // Inflation dampening
    × (1 + growthRate)                    // Segment growth
    × (0.95 + random × 0.1)              // ±5% noise

  demand[segment] = floor(adjustedDemand)
```

### Revenue Calculation
```
Units sold per team per segment = floor(segmentDemand × marketShare)
Revenue = unitsSold × productPrice
```

### Warranty Cost (from defects)
```
effectiveDefectRate = factory.defectRate × (1 - factory.warrantyReduction)
warrantyCost = unitsSold × effectiveDefectRate × product.unitCost
```

---

## 12. Materials & Supply Chain

### Material Inventory Properties
| Property | Description |
|----------|-------------|
| materialId | Material identifier |
| quantity | Units in stock |
| averageCost | Weighted average cost |
| region | Source region |

### Material Orders
| Property | Description |
|----------|-------------|
| orderId | Order identifier |
| materialId | Material ordered |
| quantity | Quantity ordered |
| totalCost | Total order cost |
| orderRound | Round when ordered |
| expectedDeliveryRound | When it should arrive |
| status | "ordered" / "in_transit" / "delivered" |

### Holding Costs
```
Holding cost = sum(inventory[i].quantity × inventory[i].averageCost × 0.02)
// 2% of inventory value per round
```

---

## 13. Tariffs System

Tariff scenarios can be injected by facilitator affecting:
- Import/export costs between regions
- Material costs from certain regions
- Supply chain disruptions

---

## 14. Financial Statements Engine

Generates three complete financial statements per round:

### Income Statement
- Revenue
- Cost of Goods Sold (COGS)
- Gross Profit
- Operating Expenses
- Operating Income
- Interest Expense
- Net Income

### Cash Flow Statement
- Operating Cash Flow = Revenue - Labor Cost
- Investing Cash Flow = -(new factories × $50M)
- Financing Cash Flow = Debt changes + Equity changes
- Net Cash Flow = Operating + Investing + Financing

### Balance Sheet
- Assets: Cash + Factory Value
- Liabilities: Short-term + Long-term Debt
- Equity: Assets - Liabilities

Includes validation checks for accounting identity (Assets = Liabilities + Equity).

---

## 15. Achievement System

Achievements are tracked across categories:
- **HR:** Employee management milestones
- **Marketing:** Brand and market share achievements
- **R&D:** Innovation and patent milestones
- **Supply Chain:** Logistics achievements
- **Logistics:** Shipping and delivery milestones
- **Finance:** Financial performance achievements
- **Factory:** Manufacturing milestones
- **Overview:** General company milestones
- **Results:** Round performance achievements
- **News:** Event-related achievements
- **Secret:** Hidden achievements
- **Mega:** Epic multi-category achievements

---

## 16. Economic Cycles

### Cycle Phases & Transition Probabilities
| Current Phase | → Expansion | → Peak | → Contraction | → Trough |
|--------------|-------------|--------|---------------|----------|
| Expansion | 70% | 30% | 0% | 0% |
| Peak | 10% | 30% | 60% | 0% |
| Contraction | 0% | 0% | 50% | 50% |
| Trough | 60% | 0% | 20% | 20% |

### Phase Effects
| Phase | Demand Multiplier | Inflation Range |
|-------|------------------|-----------------|
| Any | 0.8x - 1.2x | 1% - 5% |

---

## 17. Event System

### Market Events (Facilitator-Injected)
| Event | Effect |
|-------|--------|
| Recession | GDP -2, confidence -15, unemployment +1.5, all demand -15% |
| Boom | GDP +2, confidence +10, unemployment -0.5, all demand +15% |
| Inflation Spike | Inflation +3, federal rate +0.75, confidence -8 |
| Tech Breakthrough | Enthusiast demand +25%, Professional +20%, quality expectations +5% |
| Sustainability Regulation | Sustainability premium +15% |
| Price War | Price competition +20%, Budget demand +15% |
| Supply Chain Crisis | All demand -10% |
| Currency Crisis | FX volatility = 35%, all FX rates shift ±15% randomly |

### Team Events
Applied per-team by facilitator:
| Target | Effect |
|--------|--------|
| Efficiency | All factory efficiency × (1 + modifier), clamped 0.1-1.0 |
| Morale | All employee morale × (1 + modifier), clamped 0-100 |
| Brand Value | brandValue × (1 + modifier), clamped 0-1 |
| Cash | cash × (1 + modifier) |
| ESG Score | esgScore += modifier |

### Natural Market Evolution per Round
```
GDP: ±0.5 random walk
Inflation: ±0.25 random walk
Consumer Confidence: ±2.5 random walk
Unemployment: ±0.15 random walk

Interest rates follow inflation:
  Inflation > 3%: federal rate += 0.25
  Inflation < 1.5%: federal rate -= 0.25

Quality expectations: always +0.02/round
Sustainability premium: always +0.01/round
Price competition: ±0.05 random walk

Demand grows by segment growthRate each round
```

---

## 18. Balance & Rubber-Banding

### Rubber-Banding System
```
Activation: Round >= 3

Trigger: Any team's average market share < avgShare × 0.5
         OR any team's average market share > avgShare × 2.0

Effects:
  Trailing teams (share < avg × 0.5): +15% market share boost
  Leading teams (share > avg × 2.0): -8% market share penalty
```

### Balance Thresholds (Design Targets)
| Metric | Target |
|--------|--------|
| Max win rate for any strategy | < 60% |
| Min viable strategies (can win) | ≥ 3 |
| Max bankruptcy rate | < 5% |
| Revenue spread (max/min) | 1.5x - 3.0x |
| Min diversity score | > 0.7 |
| Min competitiveness (close games) | > 30% |
| Max snowball risk | < 40% |

---

## 19. Complexity System

### Presets
| Feature | Simple | Standard | Advanced |
|---------|--------|----------|----------|
| Factory Module | Yes | Yes | Yes |
| HR Module | Auto | Yes | Yes |
| Finance Module | Simplified | Yes | Yes |
| Marketing Module | Yes | Yes | Yes |
| R&D Module | Yes | Yes | Yes |
| ESG Module | No | Yes | Yes |
| Multiple Factories | No | Yes | Yes |
| Employee Management | No | Yes | Yes |
| Detailed Financials | No | Yes | Yes |
| Board Meetings | No | Yes | Yes |
| Market Events | No | Yes | Yes |
| Rubber-Banding | Yes | Yes | No |
| Product Dev Timeline | No (instant) | Yes | Yes |
| Training Fatigue | No | Yes | Yes |
| Benefits System | No | Yes | Yes |
| Inventory Management | No | Yes | Yes |
| Starting Cash | $300M | $200M | $150M |
| Market Volatility | 0.5x | 1.0x | 1.5x |
| Competitor Strength | 0.7x | 1.0x | 1.3x |
| Economic Stability | 0.8 | 0.5 | 0.3 |

---

## 20. Strategy Archetypes

### Volume Strategy
- Focus: Budget + General segments
- Pricing: Low prices for market share
- Factory: Invest in worker efficiency
- Marketing: Moderate, Budget/General focus
- R&D: Minimal ($2-3M budget)
- Typical spend: 5-10% of cash on factory, 5-9% on marketing, 3% on R&D

### Premium Strategy
- Focus: Professional + Enthusiast segments
- Pricing: Premium prices for margin
- Factory: Invest in engineers + machinery quality
- Marketing: Premium segments + branding
- R&D: Heavy ($8M+, 12%+ of cash)
- Product improvements: +5 quality, +3 features per round

### Brand Strategy
- Focus: All segments via brand dominance
- Factory: Minimal investment
- Marketing: HEAVY (15%+ of cash on branding, 8-10% on ads per segment)
- R&D: Moderate
- Sponsorships: Active
- Total marketing spend: 30-40% of cash

### Automation Strategy
- Focus: Cost reduction through automation upgrade
- Priority: Buy $75M automation upgrade early (rounds 1-3)
- Post-automation: Invest in machinery efficiency
- Marketing: Moderate
- R&D: Moderate

### Balanced Strategy
- Moderate investment across all areas
- ESG: Active (charitable donations, green investments)
- Factory: Balanced across all categories
- Marketing: Spread across all segments
- R&D: $4M+ with product improvements
- Green investment: 1% of cash

### R&D Focused Strategy
- Heavy R&D: $15M+ (25% of cash)
- Multiple product improvements per round
- Minimal factory investment (engineers only)
- Moderate marketing
- Focus on quality + features growth

### Cost Cutter Strategy
- Minimal investment everywhere
- Factory: ~$1M total
- Marketing: ~$1M total + aggressive discounts (10-15%)
- R&D: ~$1M
- Cash conservation focused

---

## 21. All Formulas Reference

### Production
```
Units = workers × 100 × factoryEfficiency × (workerEfficiency/100) × (workerSpeed/100) × automationMultiplier
Net Units = Units - floor(Units × defectRate)
```

### Revenue
```
Revenue = sum(unitsSold[segment] × price[segment]) for all segments
```

### Total Costs
```
Total Costs = factoryModule.costs + hrModule.costs + financeModule.costs + marketingModule.costs + rdModule.costs
```

### Net Income
```
Net Income = Revenue - Total Costs
```

### EPS
```
EPS = netIncome / sharesIssued
```

### Market Cap
```
If EPS > 0: EPS × sharesIssued × targetPE
If EPS ≤ 0: revenue × priceToSales
Floor: max(bookValue × 0.5, totalAssets × 0.3)
```

### Share Price
```
Share Price = marketCap / sharesIssued
```

### Market Share (Softmax)
```
share[i] = exp((score[i] - max) / 10) / sum(exp((score[j] - max) / 10))
```

### Brand Value
```
Next Round Brand = (currentBrand + min(totalGrowth, 2%)) × (1 - 6.5%)
```

### Turnover Rate
```
monthly = 1%
if morale < 50: monthly += 1.25%
monthly × (150 - loyalty) / 100
if burnout > 50: monthly += 0.83%
```

---

## 22. UX/UI Screens & Interactions

### Auth Pages
- **/login** - Team login page
- **/join** - Join game with code
- **/dev-login** - Development shortcut login

### Game Pages (per game ID)
- **/game/[gameId]** - Main dashboard/overview
  - Company financials summary
  - Market share pie chart
  - Performance history line chart
  - Round results card
  - Team rankings card
  - ESG notifications
- **/game/[gameId]/hr** - HR management
  - Employee roster with stats
  - Hiring (3 recruitment tiers)
  - Firing with severance
  - Training programs
  - Benefits package configuration
  - Workforce summary
- **/game/[gameId]/marketing** - Marketing management
  - Advertising budget sliders per segment
  - Branding investment
  - Sponsorship selection
  - Promotion configuration
  - Brand value meter
- **/game/[gameId]/rnd** - R&D management
  - R&D budget allocation
  - Product development pipeline
  - Product improvement interface
  - Patent progress tracker
  - Technology tree (if enabled)
- **/game/[gameId]/results** - Round results
  - Revenue breakdown
  - Cost breakdown
  - Market share by segment
  - Competitor intelligence
  - Rankings

### Facilitator Pages
- **/admin** - Facilitator dashboard
  - Game list
  - Create new game
- **/admin/games/[gameId]** - Game management
  - Team detail panels
  - Round history panels
  - Event injection panel
  - Advance round button
  - Complexity selector

### Shared Components
- AnimatedCard - Card with animations
- ErrorBoundary - Error handling wrapper
- LoadingState - Loading skeletons
- StatCard - Stat display card
- SkeletonCard - Loading placeholder
- SectionHeader - Section title component
- EnhancedProgress - Progress bar with labels

### Charts
- MarketSharePieChart - Pie chart for market share
- MetricBarChart - Bar chart for comparisons
- MetricLineChart - Line chart for trends over time
- PerformanceHistoryChart - Multi-metric history

### State Management
- **Zustand store** (`decisionStore.ts`) for client-side decision state
- **tRPC** for server communication
- **ComplexityContext** for feature toggling

---

## 23. Data Flow & Architecture

### Server-Side
```
Next.js App Router
  └─ API: /api/trpc/[trpc]
     └─ tRPC Routers:
        ├─ game.ts      - Game CRUD, round advancement
        ├─ team.ts      - Team operations
        ├─ decision.ts  - Decision submission
        ├─ facilitator.ts - Admin operations
        ├─ material.ts  - Supply chain operations
        └─ achievement.ts - Achievement tracking
```

### Database (Prisma)
- Schema: `schema.sqlite.prisma` (dev) / `schema.postgresql.prisma` (prod)
- Seed: `seed.ts` for initial data

### Engine Architecture
```
SimulationEngine (orchestrator)
  ├─ FactoryModule    - Production, upgrades, ESG
  ├─ HRModule         - Hiring, training, turnover
  ├─ RDModule         - Products, R&D, patents
  ├─ MarketingModule  - Ads, branding, sponsorships
  ├─ FinanceModule    - Debt, equity, ratios
  ├─ MarketSimulator  - Competition, demand, shares
  ├─ MaterialEngine   - Supply chain
  ├─ TariffEngine     - Trade tariffs
  ├─ MachineryEngine  - Equipment management
  └─ FinancialStatementsEngine - Full accounting
```

### Determinism Layer
```
EngineContext
  ├─ SeededRNG (per module: hr, rd, market, factory)
  ├─ IdGenerator (deterministic IDs)
  ├─ SeedBundle (match seed → round seed → team seed)
  └─ hashState() for verification
```

---

## 24. Known Design Issues & Gaps

### Potential Balance Issues
1. **Brand growth cap (2%/round) vs decay (6.5%):** Brand strategy may be underpowered because decay outpaces max growth significantly. A team that stops investing loses brand faster than they can rebuild.

2. **Automation early advantage:** $75M automation in round 1 gives 5x worker productivity immediately, potentially creating snowball.

3. **R&D points → patents is slow:** 500 points for one patent, engineers generate ~5-10 points each/round. With 8 engineers, that's 40-80 points/round → 7+ rounds for first patent.

4. **ESG score starts at 100 but penalty tier is < 300:** Teams start in "neutral" tier. Need ~200+ ESG investment to avoid ever touching penalty, but not much incentive to go higher since 600+ only gives "risk mitigation" (no direct revenue boost after v2.4.0).

5. **Cost cutter strategy may be non-viable:** Minimal investment + aggressive discounts but no quality/brand investment means progressively worse market scores as quality expectations rise (+0.02/round).

6. **Financial statements use approximations:** Gross margin assumes 60% COGS, operating margin approximated as netIncome × 1.2.

7. **FX impact incomplete:** Only North America treated as "home", EUR/USD and JPY/USD tracked but impact calculation is simplified.

8. **Promotions:** Described in decisions but not fully factored into market share calculation (handled externally).

9. **Inventory system partially implemented:** Finished goods inventory tracked but production-to-inventory-to-sales pipeline not fully connected.

10. **Machinery system:** MachineryEngine exists but integration with production output is incomplete.

11. **Experience curves:** ExperienceCurve module exists but not wired into main simulation loop.

12. **Competitive intelligence:** Module exists but not surfacing data to teams in a meaningful way.

13. **Customer satisfaction:** SatisfactionEngine exists but not connected to market share calculation.

### Missing Game Mechanics
- No bankruptcy/game-over mechanic (teams can go negative cash)
- No inter-team trading or partnerships
- No mergers & acquisitions between player teams
- No regional market differentiation (all demand is global)
- No seasonal demand variation
- No product lifecycle/obsolescence
- No consumer loyalty/switching costs
- No supply chain disruption events (framework exists but not populated)

---

---

## 25. Monte Carlo Balance Test Results

> **Test Date:** 2026-02-08 | **Games Simulated:** 2,000+ | **Score: 0/100 (SEVERELY IMBALANCED)**

### Aggregate Win Rates
| Strategy | Win Rate | Status |
|----------|----------|--------|
| balanced | 100.0% | DOMINANT |
| brand | 40.0% | Partial (only at low cash) |
| premium | 33.3% | Partial (only vs non-balanced) |
| volume | 0.0% | NON-VIABLE |
| automation | 0.0% | NON-VIABLE |
| rd-focused | 0.0% | NON-VIABLE |
| cost-cutter | 0.0% | NON-VIABLE |

### Average Revenue by Strategy
| Strategy | Avg Revenue |
|----------|-------------|
| balanced | $192.5M |
| brand | $190.6M |
| premium | $187.6M |
| volume | $185.6M |
| rd-focused | $183.4M |
| automation | $180.5M |
| cost-cutter | $170.8M |

### Key Findings
1. **Balanced dominates everything:** Wins 100% of games in every matchup where it's present. Revenue spread is razor-thin ($170M-$192M) but balanced consistently edges out.
2. **Brand dominates at low cash:** At $100-150M starting cash, brand wins 100%. At $200M+, balanced wins 100%. Binary flip, no gradual transition.
3. **4 of 7 strategies never win:** Volume, automation, rd-focused, and cost-cutter have 0% win rate across all matchups.
4. **Snowball risk at 80%:** Round-3 leaders win 80% of games. Rubber-banding (+15%/-8%) is too weak to counteract.
5. **All games are "close" by revenue** (100% close rate) but the same strategy always wins — tiny consistent edges compound into guaranteed victories.
6. **Zero bankruptcy:** No strategy ever goes bankrupt, meaning the game isn't punishing bad decisions harshly enough OR starting conditions are too forgiving.

### Variable Sensitivity (Starting Cash)
| Starting Cash | Winner | Win Rate |
|---------------|--------|----------|
| $100M | brand | 100% |
| $150M | brand | 100% |
| $200M | balanced | 100% |
| $300M | balanced | 100% |
| $500M | balanced | 100% |

### Root Cause Analysis
1. **Market scoring rewards breadth over depth:** Softmax across 5 segments means "okay everywhere" beats "great in 2 segments." A balanced strategy scores 60/100 in every segment, beating a specialist scoring 90 in one and 40 in others.
2. **Brand growth is crippled:** Max growth 2%/round vs 6.5% decay = net -4.5% per round even at max investment. Brand strategy is fighting a losing battle mathematically.
3. **Specialization has no breakpoint rewards:** Linear returns on investment mean there's never a reason to invest heavily in one area — you get the same marginal return from the 1st dollar and the 100th.
4. **No counter-strategy dynamics:** Strategies don't interact. Volume doesn't steal from premium's addressable market. R&D breakthroughs don't disrupt brand loyalty.
5. **Static market conditions:** Every simulation run has similar conditions, so the same strategy always wins. No regime changes to shuffle the hierarchy.

> Full results: `monte-carlo-report.txt` and `monte-carlo-results.json`

---

## 26. Balance Redesign Proposals

The following proposals address the critical balance failures identified by Monte Carlo testing. They are organized as independent philosophical approaches that can be **combined** for maximum effect.

---

### Approach A: Amplify Specialization Rewards

**Philosophy:** Specialists should be dramatically better in their niche, not just slightly. The current $20M revenue spread across all strategies is too tight.

**Proposed Changes:**

- **Volume:** Should generate 2-3x unit sales at razor-thin margins. In price wars or commodity markets, volume crushes everyone. In premium-shifting markets, it gets destroyed.
- **Premium:** Highest per-unit margins by far, but small addressable market. Wins when consumer spending is high, loses when it contracts.
- **Brand:** Compounding loyalty that creates a moat over time — expensive early, vulnerable to disruption, but eventually dominant if sustained.
- **R&D-focused:** Occasionally produces breakthrough products that completely reshape the market. High variance — sometimes R&D fails entirely, sometimes it 10x's revenue.
- **Automation:** Slow start (heavy capex) but becomes dominant in later rounds as costs plummet. A bet on the long game.
- **Cost-cutter:** Survives downturns better than anyone, wins in recessions, but loses in growth markets where investment matters.

**Core Principle:** Each strategy must have a scenario where it's the obvious best choice. If a strategy can't be the best answer to any game state, it's a design failure.

---

### Approach B: Tax the Generalist

**Philosophy:** Instead of buffing specialists, nerf balanced. Real businesses that try to do everything face real costs.

**Proposed Mechanics:**

- **Complexity overhead:** Balanced pays a fixed cost per round for maintaining multiple capabilities simultaneously (management overhead, organizational complexity). Could be modeled as 5-15% efficiency penalty across all departments.
- **Execution penalty:** Each capability operates at 60-80% effectiveness compared to a specialist. A balanced company's R&D produces fewer breakthroughs; its brand campaigns are less effective; its cost structure is worse than a cost-cutter's.
- **Decision lag:** Balanced takes longer to pivot, so when market conditions shift, specialists adapt faster. Could be modeled as a 1-round delay before balanced's changes take effect.
- **Talent dilution:** Model a talent pool where specialists attract top-tier people in their domain (A-players), while balanced gets B+ players across the board. Manifests as lower morale, higher turnover, and weaker per-dollar output.

**Design Note:** Be careful not to make balanced feel punishing to play. The tax should be subtle enough that balanced remains viable but no longer dominant.

---

### Approach C: Dynamic Market Environments

**Philosophy:** If every simulation run has similar market conditions, the same strategy always wins. Introduce distinct market regimes that rotate unpredictably.

**Proposed Regimes:**

| Regime | Duration | Favors | Punishes |
|--------|----------|--------|----------|
| **Boom Cycle** | 2-3 rounds | Volume, Brand (consumers spend freely, market grows) | Cost-cutter (savings matter less) |
| **Recession** | 2-3 rounds | Cost-cutter, Automation (margins compress, efficiency wins) | Brand, Premium (consumers cut back) |
| **Disruption Wave** | 1-2 rounds | R&D-focused (new tech reshapes market, incumbents scramble) | Volume, Automation (existing processes become obsolete) |
| **Consolidation** | 2-3 rounds | Premium, Brand (fewer players, loyalty matters) | Volume (market shrinks) |
| **Regulation Shock** | 1-2 rounds | Balanced (adaptability matters) | Specialists (compliance costs hit concentrated strategies harder) |

**Implementation:** Each simulation run randomly draws a sequence of regimes. Over many runs, different strategies should win in different environments. Balanced should be the "safe pick" that rarely wins big but rarely loses badly — not the dominant choice.

---

### Approach D: Redesign the Win Condition

**Philosophy:** Collapsing a multidimensional competition into "highest revenue" guarantees the generalist wins because it's always close enough across all dimensions.

**Proposed Alternatives:**

1. **Multiple victory paths:** A strategy can win via market share dominance (volume), highest profitability (premium/cost-cutter), brand valuation (brand), IP portfolio value (R&D), or operational efficiency score (automation). First to hit ANY win threshold wins.

2. **Weighted composite score** where different dimensions matter differently each game — sometimes profitability is weighted 3x, sometimes market share is. Announced at game start so players can plan.

3. **Survival + performance:** In some game modes, the goal isn't to be #1, it's to survive a harsh environment. Cost-cutter and automation shine when the game is "don't go bankrupt" rather than "maximize revenue."

4. **Relative scoring:** Instead of absolute revenue, score each strategy on how much it outperforms its expected baseline. Balanced has a higher baseline expectation (since it's "supposed" to be stable), so it needs to do more to "win."

---

### Approach E: Player Interaction Effects (Counter-Strategies)

**Philosophy:** Strategies should directly affect each other. Real markets are zero-sum in many dimensions.

**Proposed Mechanics:**

- **Market share is explicitly zero-sum:** If volume floods the market with cheap products, premium's addressable market literally shrinks (consumers switch down). If brand builds loyalty, volume can't steal those customers easily (switching costs).
- **Counter-strategy matrix:** Certain strategies naturally counter others, creating a rock-paper-scissors dynamic:

| Strategy | Beats | Loses To | Reason |
|----------|-------|----------|--------|
| Volume | Cost-cutter | Premium | Scale beats cost-cutting, but can't compete on quality |
| Premium | Brand | R&D | Quality beats marketing, but innovation disrupts incumbents |
| Brand | Volume | Premium | Loyalty beats price, but can't fake quality |
| R&D | Premium, Automation | Volume | Innovation disrupts, but can't match scale |
| Automation | Volume | R&D | Efficiency beats scale, but can't innovate |
| Cost-cutter | R&D | Volume | Survives downturns, but scale crushes in growth |
| Balanced | None hard | None hard | Never dominates, never gets dominated |

- **Competitive response modeling:** If one player is winning decisively, the market naturally reacts — price wars, marketing blitzes, talent poaching. This creates natural rubber-banding that emerges from competition rather than artificial catch-up mechanics.

---

### Approach F: Nonlinear / Threshold Mechanics

**Philosophy:** Linear systems converge on balanced solutions. Nonlinear systems create interesting dynamics where specialization can "break through" to disproportionate returns.

**Proposed Mechanics:**

- **Critical mass effects:** Brand only becomes powerful after a loyalty threshold is crossed (~60% brand value), then it compounds rapidly. Below that threshold, brand spending is mostly wasted. Creates a "do I commit or not?" decision.
- **Diminishing returns with breakpoints:** The first dollar spent on R&D is more valuable than the hundredth (diminishing returns). But if you push past a second inflection point (e.g., $15M/round), you hit a "breakthrough zone" where returns spike again. This punishes moderate R&D investment but rewards heavy commitment.
- **Boom-or-bust R&D:** Instead of steady incremental returns, R&D has a % chance each round of producing a breakthrough (3x revenue for 1-2 rounds) or producing nothing. High variance makes R&D exciting and occasionally dominant.
- **Automation tipping point:** Once automation reaches a certain level (e.g., 80%), costs drop precipitously (modeling a "lights out factory" moment). Before that point, automation is a money pit. After it, you have the lowest costs in the game.
- **Quality cliff:** Below a quality threshold, products get rejected by premium segments entirely (not just scored lower — actually zero market share). This makes cost-cutter dangerous: cut too deep and you lose segments completely.

---

### Approach G: Temporal Power Curves (Early/Mid/Late Game)

**Philosophy:** Borrow from RTS game design where rush, turtle, and boom strategies each dominate a specific game phase. Each strategy should have a power curve with a peak and a vulnerability window.

**Proposed Power Curves:**

```
Round:    1    2    3    4    5    6    7    8    9   10   11   12
Volume:   ████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░
Premium:  ░░░░████████████████████████████████████████░░░░░░░░░░
Brand:    ░░░░░░░░░░░░████████████████████████████████████░░░░░░
R&D:      ░░░░░░░░░░░░░░░░░░░░░░░░░░░░████████████████████████
Automtn:  ░░░░░░░░░░░░░░░░░░░░░░░░████████████████████████████
CostCut:  ████████████████░░░░░░░░░░░░░░░░████████████████░░░░░
Balanced: ░░░░░░░░████████████████████████████████░░░░░░░░░░░░░
```

- **Volume** peaks early (flood market before competitors establish), falls off late (commoditized, no moat).
- **Premium** is viable early (high margins fund growth), peaks mid-game, struggles late as competitors catch up on quality.
- **Brand** is weak early (building takes time), peaks mid-game (loyalty compounds), vulnerable late to disruption.
- **R&D** is weak early (investing, no products yet), peaks late (breakthrough products dominate).
- **Automation** is a money pit early (capex), breaks even mid-game, peaks late (near-zero marginal cost).
- **Cost-cutter** is strong early (immediate savings), weakens mid-game (underinvestment catches up), can resurge in downturns.
- **Balanced** is mediocre at every phase — never the worst, never the best.

**Key mechanic: Variable game length.** Games last 6-12 rounds (unknown to players). This makes timing-based strategy selection genuinely risky. If you pick a late-game strategy and the game ends at round 6, you lose. If you pick an early-game strategy and the game runs to round 12, you lose. Players who read the game state to predict when it's ending gain an edge.

---

### Approach H: Contested Scarce Resources

**Philosophy:** Introduce shared limited pools that strategies draw from differently. Currently each player operates in a vacuum — decisions don't deplete anything from others.

**Proposed Resource Pools:**

| Resource | Finite Per Round | Strategies Competing | Effect of Scarcity |
|----------|-----------------|---------------------|-------------------|
| **Elite Engineers** | 5-10 available | R&D, Premium, Automation | Bidding war drives up salaries; duplicates split talent |
| **Marketing Talent** | 5-8 available | Brand, Balanced | Less effective campaigns per dollar |
| **Factory Sites** | 3-5 per region | Volume, Automation | Late-movers pay 2-3x premium or get worse locations |
| **Distribution Channels** | Limited shelf space | Volume, Brand | Volume takes quantity slots; Premium takes exclusive slots |
| **Raw Materials (Premium)** | Limited supply | Premium, R&D | Quality-dependent strategies compete for best inputs |
| **Raw Materials (Bulk)** | Large but finite | Volume, Cost-cutter | Bulk orders deplete supply; late orders cost more |
| **Ad Inventory** | Finite attention | Brand, Marketing-heavy | More players spending = ad saturation = lower ROI for all |

**Why this matters:** Lobby composition affects strategy viability. A game with three R&D players feels different from a game with one, because they're all fighting over the same engineers. This creates a natural metagame where players must consider what others are doing.

---

### Approach I: Strategic Pivoting with Switching Costs

**Philosophy:** Allow players to change strategy mid-game, but make it expensive. This transforms the game from "pick a strategy and execute" into "read the market and adapt."

**Proposed Mechanics:**

- **Sunk cost friction:** Automation equipment can't be repurposed. Brand equity evaporates if you stop investing. R&D talent leaves if you cut funding. The deeper you commit, the harder it is to leave.
- **Pivot cost model:**

| Pivot From → To | Cost (rounds of penalty) | What You Lose |
|-----------------|-------------------------|---------------|
| R&D → Cost-cutter | 2 rounds | All R&D progress, engineers leave |
| Brand → Volume | 2 rounds | 50% brand value, premium customer loyalty |
| Automation → Brand | 3 rounds | Equipment depreciates, need new talent |
| Balanced → Anything | 1 round | Minor friction only |
| Anything → Balanced | 1 round | Specialist bonuses deactivate |

- **Balanced's true identity:** Balanced pays the lowest switching cost because it never committed deeply. This is its actual advantage — flexibility and adaptability. But it never accesses deep-specialization bonuses.
- **Skill ceiling:** Novice players pick a strategy and ride it. Advanced players time their pivots to exploit shifting market conditions (Approach C).

---

### Approach J: Asymmetric Information and Scouting

**Philosophy:** Perfect information eliminates uncertainty. Real business operates in fog of war, and different strategies have different visibility profiles.

**Proposed Information Model:**

| Strategy | Visibility to Others | What's Hidden |
|----------|---------------------|---------------|
| Brand | **High** (ads are public) | Internal financials only |
| Volume | **Medium** (market share is visible) | Exact production numbers |
| Premium | **Medium** (pricing is visible) | Quality improvements until next product launch |
| R&D | **Low** (labs are secret) | Breakthroughs hidden until product launch — creates surprise disruptions |
| Automation | **Low** (internal process) | Cost advantages hidden until price wars reveal them |
| Cost-cutter | **Low** (cuts are internal) | Declining quality hidden until warranty claims spike |

**Additional mechanics:**
- **Intelligence investment:** Players can spend money on competitive intelligence (market research, industry reports, corporate espionage). Balanced must invest the most to maintain its "do everything adequately" approach — without information on competitors, you can't allocate optimally.
- **Bluffing:** A player could fake a premium positioning (high prices, quality branding) while actually running a volume play internally. Only works with imperfect information.
- **Reveal timing:** R&D breakthroughs are hidden until launched. Brand campaigns are announced in advance. This asymmetry in information timing gives different strategies different tactical textures.

---

### Approach K: Geographic / Map Advantages

**Philosophy:** Since the redesign targets interactive maps, tie strategy viability to geography. Different regions naturally favor different strategies.

**Proposed Region Types:**

| Region Type | Example | Favors | Penalizes |
|-------------|---------|--------|-----------|
| **Urban High-Income** | Manhattan, Mayfair | Premium, Brand | Volume (expensive real estate, low price tolerance) |
| **Dense Population Center** | Mumbai, São Paulo | Volume, Cost-cutter | Premium (price-sensitive mass market) |
| **Tech Corridor** | Silicon Valley, Shenzhen | R&D, Automation | Brand (consumers want specs, not image) |
| **Emerging Market** | Lagos, Jakarta | Cost-cutter, Volume | Premium, R&D (price sensitivity dominates) |
| **Cultural Capital** | Paris, Tokyo | Brand, Premium | Cost-cutter (consumers demand quality + image) |
| **Industrial Hub** | Detroit, Dongguan | Automation, Volume | Brand (B2B focus, no consumer brand matters) |

**Map Mechanics:**
- **Expansion decisions:** Players choose where to build factories, open offices, launch products. A volume strategy in a premium-favoring region loses; the same strategy in a high-population region dominates.
- **Map control:** Limited slots per region. First-mover advantage for choosing prime locations. Late-movers pay premiums or settle for suboptimal territories.
- **Logistics and supply chains:** Distance between factories and markets matters. Regions far from raw materials penalize volume. Remote regions with cheap labor favor automation.
- **Regional events:** A tech boom in one region benefits R&D players there. A recession in another benefits cost-cutters there. This creates localized market regimes instead of global ones, increasing strategic depth dramatically.

---

### Approach L: Ecosystem Externalities

**Philosophy:** Players' strategies should affect the entire market, not just their own performance. Currently each player's decisions exist in a bubble.

**Proposed Externalities:**

| Strategy | Market Effect | Impact on Others |
|----------|--------------|-----------------|
| **Volume flooding** | Crashes average market prices industry-wide | Premium must justify premium harder; brand's perceived value gap shrinks |
| **Premium investment** | Raises consumer quality expectations globally | Everyone's products feel worse by comparison unless they also invest |
| **Brand spending** | Increases overall market awareness and demand for the product category | Everyone benefits slightly from larger market, but brand player benefits most |
| **R&D breakthrough** | Creates technology waves that raise the floor | Within 1-2 rounds, innovation becomes table stakes; all must adopt or fall behind |
| **Cost-cutting race** | Degrades industry quality perception | Total addressable market shrinks as consumers lose trust in the category |
| **Automation wave** | Displaces labor in the region | Reduces consumer spending power, shrinking market for premium and brand |

**Why this matters:** The composition of the lobby creates emergent dynamics. A game with 3 volume players feels radically different from a game with 3 premium players. Players must consider not just "what strategy is best" but "what strategy is best given what everyone else is doing."

---

### Approach M: Strategic Debt / Legacy Effects

**Philosophy:** Every strategy should become harder to sustain the longer you maintain it. This prevents any single strategy from dominating across a full game and rewards adaptive play.

**Proposed Debt Mechanics:**

| Strategy | Debt Type | Accumulation | Consequence |
|----------|-----------|-------------|-------------|
| **Cost-cutter** | Quality debt | +5%/round of cutting | Product failure rates spike; warranty costs 3x; brand perception tanks after round 4-5 of sustained cutting |
| **Volume** | Innovation debt | +3%/round without R&D | Products become outdated; each round without R&D makes catch-up exponentially more expensive |
| **Automation** | Rigidity debt | +4%/round of automation | Can't change product lines; when market shifts, adaptation takes 2-3 rounds instead of 1 |
| **Brand** | Expectation debt | +2%/round of high brand | Customers expect premium service; any service cut triggers 3x backlash (losing 3x normal brand value) |
| **R&D** | Talent burnout | +3%/round of heavy R&D | Key employees leave after shipping breakthroughs; R&D effectiveness declines unless you invest in culture/retention |
| **Premium** | Niche trap | +2%/round | Addressable market slowly shrinks as you move upmarket; eventually you're selling to nobody |
| **Balanced** | Decision fatigue | +1%/round | Mild efficiency decay from managing everything; lowest debt accumulation rate (this is balanced's advantage) |

**Key principle:** You can run any strategy for 3-4 rounds profitably. By round 6-7, the debt catches up. By round 10+, it's crippling. This forces strategic evolution over the course of a game.

---

### Approach N: Metagame / Counter-Drafting

**Philosophy:** If this is a multiplayer game where players can see or guess each other's strategies, the selection process itself becomes strategic.

**Proposed Mechanics:**

- **Draft phase:** Before the game begins, players choose strategies in sequence (like character picks in MOBAs). Later picks have information advantage — you know what you're up against.
- **Counter-picking:** If you know the lobby is heavy on brand, you pick R&D (disrupt their brand moat with innovation). If you know it's heavy on volume, pick premium (flee to a segment they can't follow).
- **Ban system (competitive mode):** Players can ban 1-2 strategies from the game, forcing everyone to play outside their comfort zone and preventing solved metagames.
- **Asymmetric starting positions:** Instead of everyone starting equal, give each player a random (or drafted) starting condition — more cash, existing brand equity, a patent, a factory already built. Strategy choice adapts to what you're given.

---

### Approach O: Victory Point Diversification with Diminishing Returns

**Philosophy:** Award victory points across multiple dimensions, but with diminishing returns per dimension. This naturally rewards being excellent at 2-3 things rather than mediocre at all or hyper-focused on one.

**Proposed VP System:**

| Dimension | 1st Tier (easy) | 2nd Tier (medium) | 3rd Tier (hard) | 4th Tier (diminishing) |
|-----------|----------------|-------------------|-----------------|----------------------|
| Revenue | 0-$100M → 10 VP | $100-200M → 7 VP | $200-300M → 4 VP | $300M+ → 1 VP per $100M |
| Market Share | 0-15% → 10 VP | 15-25% → 7 VP | 25-35% → 4 VP | 35%+ → 1 VP per 10% |
| Profitability | 0-10% margin → 10 VP | 10-20% → 7 VP | 20-30% → 4 VP | 30%+ → 1 VP per 10% |
| Brand Value | 0-30% → 10 VP | 30-50% → 7 VP | 50-70% → 4 VP | 70%+ → 1 VP per 20% |
| IP Portfolio | 0-2 patents → 10 VP | 2-5 → 7 VP | 5-8 → 4 VP | 8+ → 1 VP per patent |
| ESG Score | 0-300 → 10 VP | 300-500 → 7 VP | 500-700 → 4 VP | 700+ → 1 VP per 200 |
| Efficiency | 0-50% → 10 VP | 50-70% → 7 VP | 70-85% → 4 VP | 85%+ → 1 VP per 10% |

**Optimal play:** Being excellent at 2-3 dimensions (~21-24 VP each) beats being mediocre at 7 (~17 VP each) or maxing one (~28 VP + nothing else). Different game modes could weight VP categories differently for replayability.

---

### Recommended Combination for Redesign

The most impactful combination that aligns with the interactive map redesign vision:

1. **C + G** (Dynamic environments + temporal power curves) — Ensures no single strategy is always optimal. Creates game-to-game variety.
2. **H** (Contested scarce resources) — Creates organic player interaction without needing explicit combat. Lobby composition matters.
3. **K** (Geographic/map advantages) — Directly supports the interactive map vision. Geography = strategy.
4. **L** (Ecosystem externalities) — Makes the meta-composition of strategies matter. Emergent dynamics from player interaction.
5. **M** (Strategic debt/legacy) — Prevents runaway dominance. Every strategy has a shelf life.
6. **F** (Nonlinear thresholds) — Creates exciting breakpoint moments. Automation tipping points, R&D breakthroughs, brand critical mass.
7. **B lite** (Mild generalist tax) — Ensures balanced isn't the free default without making it feel punishing.
8. **O** (VP diversification) — Replaces single-dimensional "highest revenue" win condition with richer scoring.

**Expected outcome:** Monte Carlo simulations with this combination should show:
- Each strategy winning 10-20% of games (±5%)
- Win rates shifting based on market regime, lobby composition, and map layout
- Balanced winning ~15% (safe, consistent, but never dominant)
- High variance strategies (R&D, brand) having wider win rate ranges but competitive averages
- Snowball risk below 30%
- No permanently non-viable strategies

---

*End of Game Design Bible - Generated from source code analysis of v3.0.0 engine*
