# BIZZSIMSIM V2 - Complete Engine & Game System Reference

> **Purpose:** Use this document to ideate with Claude about game mechanics, balance changes, and new features. Contains every formula, constant, type, and system summary — no source code reading required.

## Executive Summary

BIZZSIMSIM V2 is a multiplayer business simulation where 2-8 teams compete as phone manufacturers over 8-16 rounds. Each team manages 5 departments (Factory, HR, R&D, Marketing, Finance) and competes for market share, revenue, and EPS. The engine is deterministic (seeded RNG), modular, and implements rubber-banding, 221 achievements, ESG systems, and dynamic pricing.

**Tech Stack:** TypeScript, Next.js, tRPC, Prisma, SQLite/PostgreSQL
**Game Length:** 8-16 rounds | **Teams:** 2-8 + facilitator | **Segments:** 5 markets

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Round Processing Pipeline](#2-round-processing-pipeline)
3. [Factory System](#3-factory-system)
4. [HR & Workforce](#4-hr--workforce)
5. [R&D & Products](#5-rd--products)
6. [Marketing & Brand](#6-marketing--brand)
7. [Finance Module](#7-finance-module)
8. [Market Simulation & Scoring](#8-market-simulation--scoring)
9. [Materials & Supply Chain](#9-materials--supply-chain)
10. [Logistics & Shipping](#10-logistics--shipping)
11. [Tariffs & Trade](#11-tariffs--trade)
12. [FX Engine](#12-fx-engine)
13. [ESG System](#13-esg-system)
14. [Rubber-Banding](#14-rubber-banding)
15. [Achievements](#15-achievements)
16. [Machinery](#16-machinery)
17. [Experience Curves](#17-experience-curves)
18. [Financial Statements](#18-financial-statements)
19. [Configuration & Difficulty](#19-configuration--difficulty)
20. [Decision Pipeline](#20-decision-pipeline)
21. [Key Constants Reference](#21-key-constants-reference)
22. [Known Issues & Gaps](#22-known-issues--gaps)

---

## 1. Architecture Overview

```
engine/
├── core/SimulationEngine.ts      # Main orchestrator (processRound)
├── core/EngineContext.ts          # Deterministic RNG (Mulberry32 PRNG)
├── types/                        # 15 type files (state, factory, market, etc.)
├── modules/                      # 18 game mechanic modules
├── market/MarketSimulator.ts     # Competitive dynamics & softmax
├── materials/MaterialEngine.ts   # Raw material ordering & inventory
├── logistics/LogisticsEngine.ts  # Shipping routes, costs, lead times
├── tariffs/TariffEngine.ts       # Trade policy & tariff events
├── fx/FXEngine.ts                # Currency conversion
├── machinery/                    # 15 machine types, catalog, lifecycle
├── finance/                      # Income Statement, Balance Sheet, Cash Flow
├── achievements/                 # 221-achievement "Ledger of Legends"
├── explainability/               # Score breakdowns & narratives
├── config/                       # Externalized balance parameters
└── testkit/                      # Testing utilities & scenario generators
```

**Determinism Rule:** ALL randomness uses SeededRNG (Mulberry32). No Math.random() allowed. Same seed = identical output.

**Seed Bundle:** Each round derives separate seeds for market, factory, HR, marketing, R&D, and finance modules — ensuring module isolation.

---

## 2. Round Processing Pipeline

**SimulationEngine.processRound()** — 12 steps, sequential per team then cross-team:

### Per-Team (Steps 1-7):
1. **Materials & Tariffs** — Check order arrivals, update inventory, holding costs, tariff events
2. **Factory** — Efficiency investments, green investments, upgrades ($20M-$200M), new factories ($30M-$80M), warehouse management, production lines, machinery
3. **HR** — Hires (with recruitment search), fires (with severance), training, benefits, salary changes, turnover calculation
4. **R&D** — Budget allocation, engineer output, new products, product improvements, patent decisions
5. **Marketing** — Advertising by segment, branding, promotions, sponsorships, brand decay
6. **Finance** — Treasury bills, bonds, loans, stock issuance, buybacks, dividends, forecasts
7. **Events** — Process any injected facilitator events

### Cross-Team (Steps 8-12):
8. **Market Simulation** — Score teams per segment → softmax → market share → revenue
9. **Financial Statements** — Income Statement, Balance Sheet, Cash Flow, ratios
10. **Achievements** — Check 221 achievements against state
11. **Explainability** — Score breakdowns, delta explanations, narratives
12. **Rankings** — Final rankings using 5D BSC

---

## 3. Factory System

### Factory Tiers
| Size | Cost | Max Lines | Base Capacity | Label |
|------|------|-----------|---------------|-------|
| Small | $30M | 2 | 50,000 units/round | Small Factory |
| Medium | $50M | 6 | 150,000 units/round | Medium Factory |
| Large | $80M | 10 | 250,000 units/round | Large Factory |

### Regional Cost Modifiers
- North America: 1.0x (baseline)
- Europe: 1.0x
- Asia: 0.85x (15% cheaper labor)
- MENA: 0.9x (10% cheaper)

### Efficiency Investment Formula
```
New Efficiency = Old + (invested / 1,000,000) × 0.02
Diminishing returns after $10M: 50% reduced effectiveness
Max Efficiency: 1.0 (100%)
```

### Production Output Formula
```
output = min(machineCapacity, workerCapacity, targetOutput) × efficiency
efficiency = baseEfficiency × (1 + trainingBonus + rdBonus + modernizationBonus + esgSocialBonus)
```

### Automation (Tiered, F1 Fix)
```
automationMultiplier = 1.0 (base)
  + 0.15 (automation upgrade)
  + 0.15 (advancedRobotics)
  + 0.10 (continuousImprovement)
  + 0.10 (leanManufacturing)
  + 0.10 (flexibleManufacturing)
Max = 1.60x
```

### 20 Factory Upgrades

**Quality & Efficiency:**
| Upgrade | Cost | Effect |
|---------|------|--------|
| sixSigma | $40M | 40% defect reduction, 50% warranty reduction |
| automation | $75M | +15% automation multiplier |
| leanManufacturing | $25M | +15% efficiency, +10% cost reduction |
| digitalTwin | $60M | +20% maintenance cost reduction |
| iotIntegration | $50M | Real-time monitoring, -15% breakdowns |
| modularLines | $80M | -50% changeover time |
| continuousImprovement | $30M | +1% efficiency/round (caps +10%) |

**Sustainability (ESG):**
| Upgrade | Cost | ESG Points |
|---------|------|------------|
| solarPanels | $45M | +100 ESG |
| waterRecycling | $25M | +50 ESG |
| wasteToEnergy | $35M | +75 ESG |
| smartGrid | $55M | +80 ESG |
| carbonCapture | $70M | +150 ESG |

**Capacity & Specialization:**
| Upgrade | Cost | Effect |
|---------|------|--------|
| cleanRoom | $120M | High-purity production (+20% price) |
| rapidPrototyping | $40M | -50% R&D prototype time |
| advancedRobotics | $100M | +50% capacity, +15% automation |
| qualityLab | $60M | -50% defect rate |
| flexibleManufacturing | $90M | All segments producible, +10% automation |
| materialRefinement | $100M | +1 material level |
| supplyChain | $200M | -70% shipping costs |
| warehousing | $100M | -90% storage costs |

### Defect Rate
```
Base: 6%
Reduced by: sixSigma (-40%), qualityLab (-50%), worker accuracy
Formula: baseDefect × (1 - sixSigmaReduction) × (1 - qualityLabReduction) × accuracyModifier
```

---

## 4. HR & Workforce

### Employee Types
| Role | Base Salary | Output | Key Stats |
|------|-------------|--------|-----------|
| Worker | ~$45K | 5,000 units/round | efficiency, accuracy, speed, stamina |
| Engineer | ~$85K | 15 R&D pts/round | + innovation, problemSolving |
| Supervisor | ~$120K | Manages 15 workers | + leadership, tacticalPlanning |

### Employee Stats (0-100 each)
efficiency, accuracy, speed, stamina, discipline, loyalty, teamCompatibility, health

### Recruitment Tiers
| Tier | Cost | Candidates | Stat Range |
|------|------|------------|------------|
| Basic | $5K | 4 | 70-110 |
| Premium | $15K | 6 | 90-130 |
| Executive | $50K | 8 | 120-160 |

### Hiring/Firing Costs
```
Hiring Cost = salary × 0.15 (15% of annual salary)
Severance = salary / 12 (1 month)
```

### Turnover
```
Base Rate: 12.5% annual
+15% if morale < 50
+10% if burnout > 50
-10% per benefit point (cumulative)
```

### Training
```
Cost: $50K (worker), $75K (engineer), $100K (supervisor)
Effect: +5 to random stat per employee
Fatigue: Programs beyond 2/year → -20% effectiveness each
```

### Benefits Package
healthInsurance (0-100), retirementMatch (0-100), paidTimeOff (days), parentalLeave (weeks), stockOptions (bool), flexibleWork (bool), professionalDevelopment ($/employee)

### Understaffing Penalties
```
ratio >= 1.0:  full output
ratio 0.8-0.99: output × ratio (linear)
ratio 0.5-0.79: output × ratio × 0.85 (compounding)
ratio < 0.5:   line shuts down (0 output)
```

---

## 5. R&D & Products

### R&D Output Formula
```
Engineer Output = engineers × 15 points/round
Budget Points = floor(rdBudget / $100K), capped at 200 points (~$20M effective max)
Total R&D Progress = Engineer Output + Capped Budget Points
```

### Product Development
```
Cost: Varies by segment ($5M-$25M)
Time: 1-4 rounds
Quality/Features: Set at creation, can be improved later
Segments: Budget, General, Enthusiast, Professional, Active Lifestyle
Max: 5 products per segment
```

### Product Aging (F2 Fix)
```
Per round (launched products):
  Quality decay: -0.5 per round (without R&D improvement)
  Feature decay: -0.3 per round (without R&D improvement)
  With R&D improvement: only 30% of normal decay
  Quality floor: 10 | Features floor: 5
```

### Product Improvement
```
Cost: $2M per +5 quality, $3M per +5 features
Applied to launched products
Reduces aging effect by 70% that round
```

### Patent System
```
Filing cost: $1M per patent
Duration: 8 rounds
Exclusive bonus: +10% quality/features if sole holder
Blocking: Can reduce competitor quality by 15%
Requires: Underlying technology researched first
```

### Tech Tree (6 Families × 5 Tiers)
Families: battery, camera, ai, durability, display, connectivity
Each family has 5 tier levels with prerequisites
Higher tiers unlock more powerful product bonuses

### Quality Grades
| Grade | Price Mult | Time Mult | Min Material Tier |
|-------|-----------|-----------|-------------------|
| standard | 1.0x | 1.0x | 1 |
| premium | 1.3x | 1.5x | 3 |
| artisan | 1.6x | 2.0x | 5 |

---

## 6. Marketing & Brand

### Advertising Impact
```
Brand Impact = budget / $10M × 0.05
Example: $10M spend → +5% brand value
Segment-specific targeting
```

### Brand Mechanics
```
Decay Rate: 8% per round (F9 Fix, was 1.2%)
Max Growth: +15% per round
Natural Cap: 0.90
Critical Mass: 0.45 (bonus threshold)
```

### Sponsorships (from strategies.ts)
| Sponsorship | Cost | Brand Impact |
|-------------|------|--------------|
| Community Events | $1M | +0.008 |
| National TV Campaign | $2M | +0.015 |
| International Sponsorship | $3M | +0.020 |
| Celebrity Endorsement | $15M | +0.10 |

### Promotions
```
Max Sales Boost: 30% (F8 Fix, was 75%)
Types: discount promotions per segment
Duration: 1-3 rounds
```

### Segment Advertising Multipliers
Budget: 1.1x | General: 1.0x | Enthusiast: 0.75x | Professional: 0.5x | Active: 0.85x

---

## 7. Finance Module

### Debt Instruments
| Type | Term | Rate |
|------|------|------|
| Treasury Bills | Short (<12mo) | ~3% |
| Corporate Bonds | Long (>12mo) | ~6% |
| Bank Loans | Variable | ~5% |
| Credit Line | Revolving | ~7% |

### Debt Covenants (T5-T6 Fix)
```
D/E > 1.5 → Interest rate surcharge
D/E > 2.0 → Forced repayment, credit frozen
```

### Leverage Penalty (T7 Fix)
```
D/E > 2.0: -5 penalty
D/E > 1.5: -3 penalty
D/E > 0.8: -1 penalty
D/E ≤ 0.8: no penalty
```

### Stock Issuance
```
Dilution Ratio = newShares / (oldShares + newShares)
Price Impact = 1 - (dilutionRatio² × 2)
Effective Price = requestedPrice × max(0.5, priceImpact)
```

### EPS & Market Cap
```
EPS = NetIncome / sharesOutstanding

If EPS > 0:
  targetPE = 15 + growthPremium + sentimentAdjust + profitBonus - leveragePenalty
  marketCap = EPS × shares × targetPE
Else:
  priceToSales = max(0.5, 2 + (sentiment-50)/25)
  marketCap = revenue × priceToSales
```

### Board Approval
Required for: bonds >$20M, stock issuance
5-person board, 3+ votes to pass
Probability: 50-70% (adjusted by D/E, profitability, sentiment)

---

## 8. Market Simulation & Scoring

### Segment Weights (what consumers care about)

| Segment | Price | Quality | Brand | ESG | Features |
|---------|-------|---------|-------|-----|----------|
| Budget | 45 | 20 | 10 | 7 | 18 |
| General | 28 | 23 | 17 | 10 | 22 |
| Enthusiast | 12 | 30 | 8 | 5 | 45 |
| Professional | 25 | 27 | 10 | 17 | 21 |
| Active Lifestyle | 20 | 34 | 10 | 10 | 26 |

### Segment Quality Expectations (F3 Fix: Drift)
```
Base: Budget=50, General=65, Enthusiast=80, Professional=90, Active=70
Drift: +0.5 per round from round 2
Round 8: Budget=53.5, General=68.5, Enthusiast=83.5, Pro=93.5, Active=73.5
Cap: 100
```

### Segment Demand
| Segment | Units/Round | Price Range | Growth |
|---------|-------------|-------------|--------|
| Budget | 500K | $100-$300 | +2%/round |
| General | 400K | $300-$600 | +3%/round |
| Enthusiast | 200K | $600-$1,000 | +4%/round |
| Professional | 100K | $1,000-$1,500 | +2%/round |
| Active Lifestyle | 150K | $400-$800 | +5%/round |

### Softmax Market Share Allocation
```
Temperature: 1.8 (F6 Fix, was 3.0)
marketShare[team][segment] = exp(score/temp) / Σ(exp(allScores/temp))
```

### Price Scoring
```
Dynamic price expectation (EMA of actual prices)
Price floor penalty: products below cost get penalized
Price ceiling penalty (F12 Fix): within 10% of max → up to -20% penalty
```

### Quality Scoring
```
Quality Feature Bonus Cap: 1.50 (raised from 1.07/1.15)
Allows quality differentiation in low-expectation segments
```

### 5D BSC Ranking (T8 Fix)
```
compositeScore = revenueRank × 0.20
              + stockPriceRank × 0.25
              + epsRank × 0.20
              + marketShareRank × 0.15
              + achievementRank × 0.20
```

---

## 9. Materials & Supply Chain

### STATUS: 85% Built, 0% Integrated

The material/supply chain system is architecturally complete but **not connected to the game decision pipeline**. Players cannot effectively order materials — production runs without supply chain constraints.

### Material Types (8 per product)
display, processor, memory, storage, camera, battery, chassis, other

### Material Costs by Segment
| Segment | Cost/Unit | Lead Time | Quality Tier |
|---------|-----------|-----------|--------------|
| Budget | $60 | 30 days | 1 |
| General | $150 | 32 days | 2 |
| Active Lifestyle | $250 | 36 days | 3 |
| Enthusiast | $350 | 38 days | 4 |
| Professional | $600 | 42 days | 5 |

### What Works (in isolation)
- MaterialEngine.processOrders() — called in SimulationEngine step 1
- Inventory tracking, order creation, lead time estimation
- Quality impact calculations, holding costs (2%/round)

### What's Broken/Missing
- No decision pipeline (no `supply_chain` in decision store)
- `placeOrder` tRPC mutation exists but UI never calls it
- No production constraints from material availability
- Material quality not affecting product quality
- Holding costs calculated but never deducted from cash

---

## 10. Logistics & Shipping

### STATUS: Fully Built, Not Connected

### Shipping Methods
| Method | Cost Mult | Time Mult | Reliability | Min Volume |
|--------|-----------|-----------|-------------|------------|
| Sea | 1.0x | 1.0x | 85% | 100 m³ |
| Air | 5.0x | 0.2x | 95% | 1 m³ |
| Land | 2.0x | 0.6x | 90% | 10 m³ |
| Rail | 1.3x | 0.7x | 88% | 50 m³ |

### Routes
24 major shipping routes defined (NA→Asia, Asia→Europe, etc.)
Base lead times: 15-35 days depending on route
23 ports across 7 regions with efficiency ratings

### What's Missing
- LogisticsEngine never called in SimulationEngine
- Shipping costs calculated but never applied to orders
- No shipping delays in actual gameplay
- Supply chain disruptions framework exists but zero events defined

---

## 11. Tariffs & Trade

### STATUS: Built, Partially Connected (events processed, costs not applied)

### Baseline Tariffs
- Intra-region: 0%
- To NA from: EU 3%, Asia 8%, MENA 5%
- To EU from: NA 3%, Asia 8%, MENA 5%
- To Asia from: NA 10%, EU 10%, MENA 7%

### Events (12 types)
tariff_increase, trade_agreement, sanctions, embargo, retaliatory_tariff, most_favored_nation, free_trade_zone, anti_dumping, countervailing_duty, safeguard, quota, subsidy

### What's Missing
- Tariff costs NOT deducted from cash
- Tariff costs NOT added to COGS
- Costs calculated correctly but never applied

---

## 12. FX Engine

### STATUS: Fully Working

### Currency Pairs
EUR/USD: 1.10 baseline | GBP/USD: 1.27 | JPY/USD: 0.0067 | CNY/USD: 0.14

### FX Impact
```
Material Cost Adjusted = Original Cost × (Current Rate / Baseline Rate)
FX Volatility: 5-15% standard range
Applied to: Material costs in unit cost calculation
NOT applied to: Logistics costs, tariffs
```

---

## 13. ESG System

### 20 ESG Initiatives
Grouped into Environmental, Social, Governance (subscores 0-333 each, total 0-1000)

### ESG Subscores & Bonuses
```
Environmental → reach_multiplier = 1.0 + (env/333) × 0.15 (up to +15%)
Social → efficiency_bonus = (social/333) × 0.06 (up to +6%, M1 Fix)
Governance → risk_multiplier = 1.0 - (gov/333) × 0.20 (up to -20% risk)
```

### ESG Balance (F11 Fix)
```
Score capped at 1000
Decay above 700: 5% of excess
Diminishing returns in scoring above 700 (sqrt curve)
```

### ESG Revenue Impact
- Score < 400: Revenue penalty
- Score 400-699: +2% revenue
- Score 700+: +5% revenue

---

## 14. Rubber-Banding

### Activation
Starts round 3 (configurable)

### Position Calculation
```
globalAvgShare = 1 / numTeams
teamAvgShare = average of team's shares across segments
position = (teamAvgShare - globalAvgShare) / globalAvgShare
```

### Four Mechanisms

**A. Cost Relief (trailing teams):**
```
costReliefFactor = max(0, -position × 0.10)  // 0-10% cheaper costs
```

**B. Perception Bonus (trailing teams):**
```
perceptionBonus = max(0, -position × 0.20)  // 0-20% quality boost
```

**C. Brand Decay Acceleration (leading teams):**
```
brandDecayMultiplier = 1.0 + (position × 0.10)  // Up to 10% faster decay
```

**D. Quality Expectation Boost (leading teams):**
```
qualityExpectationBoost = position × 0.25  // Up to 25% higher bar
Max: 2.0 points (F7 Fix, was 5.0)
```

### Exploit Prevention
Teams with 0 active segments get NO benefits (prevents tanking exploit)

---

## 15. Achievements

221 achievements across 12 categories:
Factory (20), HR (18), R&D (22), Marketing (18), Finance (20), Results (19), News (15), Logistics (18), Supply Chain (16), Mega (18), Overview (15), Secret (22)

### Tiers
| Tier | Points | Difficulty |
|------|--------|------------|
| Bronze | 1 | Easy |
| Silver | 5 | Medium |
| Gold | 15 | Hard |
| Platinum | 40 | Legendary |
| Infamy | -10 | Anti-achievements |
| Secret | Varies | Hidden |

Total possible: ~1,750 points

---

## 16. Machinery

### 15 Machine Types
assembly_line, cnc_machine, robotic_arm, conveyor_system, quality_scanner, 3d_printer, welding_station, packaging_system, injection_molder, pcb_assembler, paint_booth, laser_cutter, testing_rig, clean_room_unit, forklift_fleet

### Line-Locked vs Shared
- **Line-Locked:** Assigned to one production line (CNC, robotic arm, injection molder, etc.)
- **Shared:** Factory-wide (packaging, testing, conveyor, forklift)

### Depreciation
```
Annual Rate: 15%
Value = Original × 0.85^years
Maintenance: 3% of original cost per year
```

---

## 17. Experience Curves

### Wright's Law
```
Cost = initialCost × (cumulativeUnits ^ log2(learningRate))

Learning Rates by Segment:
  Budget: 0.90 (10% cost reduction per production doubling)
  General: 0.87 (13%)
  Active: 0.85 (15%)
  Enthusiast: 0.83 (17%)
  Professional: 0.80 (20%)

Min Cost Multiplier: 0.65 (max 35% total reduction)
```

---

## 18. Financial Statements

### Income Statement
```
Revenue
- COGS (material + labor costs)
= Gross Profit
- SGA (selling, general, admin)
- R&D Expense
- Depreciation
- Storage & Warehousing (NEW)
- Inventory Write-Off (NEW)
= EBIT
- Interest Expense
- Taxes
= Net Income
```

### Balance Sheet
```
Assets = Cash + AR + Inventory + Plant Value + Machinery + Warehouse
Liabilities = Short-term Debt + Long-term Debt + AP
Equity = Retained Earnings + Common Stock
Identity: Assets = Liabilities + Equity (must hold every round)
```

### Key Ratios
Current Ratio, Quick Ratio, D/E Ratio, ROE, ROA, Profit Margin, Gross Margin

---

## 19. Configuration & Difficulty

### Difficulty Presets
| Setting | Easy | Normal | Hard | Impossible |
|---------|------|--------|------|------------|
| Upgrade Costs | 50% | 100% | 125% | 150% |
| R&D Output | +20% | Normal | -20% | -50% |
| Market Share | +10% | Normal | -10% | -20% |
| Cash | Loose | Normal | Tight | Very tight |

---

## 20. Decision Pipeline

### Current Flow (5 modules working)
```
UI → Decision Store (Zustand) → tRPC Submit → DB → SimulationEngine → Results
```

### Working Modules
Factory, HR, R&D, Marketing, Finance

### Missing Module
Supply Chain / Materials / Logistics — no decision store, no converter, no submission

### Converter Functions (lib/converters/decisionConverters.ts)
- convertFactoryDecisions(ui, state) → engine format
- convertHRDecisions(ui) → engine format
- convertFinanceDecisions(ui) → engine format
- convertMarketingDecisions(ui) → engine format
- convertRDDecisions(ui) → engine format

---

## 21. Key Constants Reference

```
// Factory
NEW_FACTORY_COST: $50M
MAX_PRODUCTION_LINES: 10
EFFICIENCY_PER_MILLION: 0.02

// HR
BASE_WORKER_OUTPUT: 5,000 units/worker
BASE_DEFECT_RATE: 6%
BASE_TURNOVER_RATE: 12.5%
WORKERS_PER_SUPERVISOR: 15
WORKERS_PER_MACHINE: 2.75
BASE_RD_POINTS_PER_ENGINEER: 15/round

// R&D
RD_BUDGET_TO_POINTS_RATIO: $100K per point
MAX_RD_BUDGET_POINTS_PER_ROUND: 200 (effective cap ~$20M)

// Market
SOFTMAX_TEMPERATURE: 1.8
QUALITY_FEATURE_BONUS_CAP: 1.50
BRAND_DECAY_RATE: 0.08 (8%/round)
MAX_PROMOTION_SALES_BOOST: 0.30 (30%)

// Rubber-Banding
RB_MAX_COST_RELIEF: 0.10 (10%)
RB_MAX_DRAG: 0.25 (25%)
RB_MAX_QUALITY_EXPECTATION_BOOST: 2.0

// Finance
DEBT_COVENANT_DE_THRESHOLD_1: 1.5 (surcharge)
DEBT_COVENANT_DE_THRESHOLD_2: 2.0 (credit frozen)
CREDIT_FROZEN_DE_THRESHOLD: 2.0

// ESG
ESG_SOCIAL_BONUS_MAX: 0.06 (6%)
ESG_ENVIRONMENTAL_REACH_MAX: 0.15 (15%)
ESG_GOVERNANCE_RISK_MAX: 0.20 (20%)
```

---

## 22. Known Issues & Gaps

### Critical
1. **Supply chain not integrated** — Materials/logistics/tariffs exist but aren't connected to decision pipeline
2. **Production ignores inventory** — Factories produce at full capacity regardless of material availability
3. **Tariff/logistics costs never applied** — Calculated but not deducted

### Balance (Post-27-Fix Status)
- Automation: Fixed (tiered 1.0-1.6x, was binary 5x)
- Budget segment: Rebalanced (price 45, was 65)
- Brand decay: Fixed (8%, was 1.2%)
- ESG social bonus: Reduced (6%, was 10%)
- Professional weights: Retuned (quality 27, price 25)
- 5D BSC: Implemented (was revenue-only)

### UI Gaps
- Two redundant tabs (logistics + supply chain) → should be one page
- Factory page doesn't show material requirements per line
- Production capacity not limited by machine bottleneck in UI
- HR page doesn't show worker-to-line assignment

---

*Generated from codebase analysis on March 29, 2026. Use this document with Claude to ideate about mechanics, balance, and new features.*
