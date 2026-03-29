# Business Simulation - Player Guide

## Table of Contents
1. [Overview](#overview)
2. [Financial Mechanics](#financial-mechanics)
3. [Quality & Production](#quality--production)
4. [Market Strategy](#market-strategy)
5. [ESG & Risk Management](#esg--risk-management)
6. [Advanced Strategies](#advanced-strategies)

---

## Overview

Welcome to the Business Simulation! You'll manage a technology company competing in 5 market segments:
- **Budget** - Price-sensitive mass market
- **General** - Mainstream consumers
- **Enthusiast** - Tech-savvy early adopters
- **Professional** - Enterprise customers
- **Active Lifestyle** - Fitness and outdoor market

### Win Conditions
- Highest revenue by final round
- Sustainable profitability
- Positive cash flow
- Strong market position

---

## Financial Mechanics

### Capital Structure (NEW)

**Short-Term vs Long-Term Debt**

Your liabilities are now split into two categories:

| Instrument | Type | When to Use |
|------------|------|-------------|
| Treasury Bills | Short-term | Quick cash needs, < 1 year |
| Credit Lines | Short-term | Working capital |
| Bank Loans (≤12 months) | Short-term | Bridge financing |
| Corporate Bonds | Long-term | Capital projects, expansion |
| Bank Loans (>12 months) | Long-term | Major investments |

**Liquidity Ratios Now Matter:**

```
Current Ratio = Current Assets / Short-Term Debt
  • Green: > 2.0 (healthy)
  • Yellow: 1.2-2.0 (adequate)
  • Red: < 1.2 (liquidity risk)

Quick Ratio = (Cash + Receivables) / Short-Term Debt
  • Green: > 1.5
  • Yellow: 1.0-1.5
  • Red: < 1.0

Cash Ratio = Cash / Short-Term Debt
  • Green: > 0.5
  • Yellow: 0.2-0.5
  • Red: < 0.2
```

**Strategic Implications:**
- Too much short-term debt = rollover risk
- Long-term debt safer but increases leverage
- Balance liquidity with growth needs

---

### Stock Buybacks & Dividends (NEW)

**Stock Buybacks**

Buybacks now affect EPS (Earnings Per Share):

```
1. Shares Reduced = Buyback Amount / Share Price
2. New EPS = Net Income / (Shares - Shares Reduced)
3. Share Price Boost = Based on EPS Growth (up to 15%)
4. Market Cap = New Share Price × New Share Count
```

**When to Buy Back:**
- Strong cash position (cash ratio > 1.0)
- Undervalued stock (low PE ratio)
- High profitability (ROE > 15%)

**When NOT to Buy Back:**
- Low cash reserves
- Negative earnings growth
- Better investment opportunities available

**Dividends**

Dividends signal financial health but affect growth:

```
Dividend Yield = (Dividend / Share Price) × 100%

• 2-5% yield: Healthy signal → +2% share price boost
• >5% yield: Growth concern → -2% share price penalty
• <2% yield: Neutral effect
```

**Dividend Strategy:**
- Pay dividends when profitable and mature
- Excessive dividends signal lack of growth opportunities
- Balance shareholder returns with reinvestment

---

### PE Ratio System (NEW)

**Understanding PE Ratios:**

```
PE Ratio = Share Price / Earnings Per Share (EPS)

Target PE = 15 (base)
  + Growth Premium (up to +10 for high EPS growth)
  + Sentiment Adjustment (-10 to +10)
  + Profitability Bonus (+3 for margin >15%)
  + Leverage Penalty (-5 for D/E >1.0)

Range: 5 to 30
```

**What PE Ratios Mean:**
- PE < 10: Undervalued (value investment)
- PE 10-20: Fairly valued
- PE > 20: Growth expectations (momentum play)

**Market Cap Calculation:**
```
Market Cap = EPS × Shares × Target PE

If negative earnings:
Market Cap = Revenue × Price-to-Sales Ratio
```

---

## Quality & Production

### Utilization vs Efficiency (UPDATED)

**Key Distinction:**

```
Efficiency = Worker/machine effectiveness (0-1)
  • Increased by training, equipment
  • Affects output per worker

Utilization = Demand / Production Capacity (0-1)
  • Based on actual market demand
  • Triggers burnout if >95%
```

**Burnout Mechanics:**

```
If Utilization > 95%:
  ✗ Burnout Risk +15% per round
  ✗ Maintenance Backlog +100 hours
  ✗ Defect Rate +2%

If Utilization < 95%:
  ✓ Burnout Risk -5% per round
  ✓ Maintenance Backlog -20 hours
  ✓ Defect Rate stable
```

**Strategic Implications:**
- Build excess capacity to avoid burnout
- Schedule maintenance during low demand
- Don't run factories at 100% constantly

---

### Quality Premium Pricing (NEW)

**Price Tolerance System:**

```
Price Tolerance = Quality × 0.2%

Quality 100 → +20% max acceptable price
Quality 80  → +16% max acceptable price
Quality 60  → +12% max acceptable price
```

**Example:**
```
Segment Max Price: $800
Quality Score: 90

Price Tolerance: 90 × 0.2% = 18%
Your Max Price: $800 × 1.18 = $944

You can charge $144 premium!
```

**Market Share Bonus:**
```
Quality Bonus = Quality × 0.1%

Quality 90 → +9% market share
Quality 80 → +8% market share
```

---

### Warranty Costs (NEW)

**Defect Economics:**

```
Warranty Cost = Units Sold × Defect Rate × Unit Cost

Example:
  Units: 100,000
  Defect Rate: 5%
  Unit Cost: $300

  Warranty Cost = 100,000 × 0.05 × $300 = $1.5M
```

**Six Sigma Impact:**
```
Effective Defect Rate = Base Defect Rate × (1 - Warranty Reduction)

With Six Sigma (50% reduction):
  5% defect rate → 2.5% effective rate
  Warranty savings: $750K on 100K units
```

**ROI Calculation:**
```
Six Sigma Cost: $75M
Annual Savings: Unit Sales × 0.025 × Unit Cost

Break-even: When cumulative savings reach $75M
Typical payback: 3-5 rounds
```

---

## Market Strategy

### Foreign Exchange Risk (NEW)

**Revenue by Region:**

Your revenue is now tracked by factory region:
- North America (home) - No FX risk
- Europe - EUR/USD exposure
- Asia - JPY/USD exposure
- MENA - Stable (minimal risk)

**FX Impact:**

```
FX Impact = (FX Rate - 1.0) × Foreign Revenue

FX Rate > 1.0 → Foreign currency stronger → Gain
FX Rate < 1.0 → Foreign currency weaker → Loss

Example:
  Europe Revenue: $50M
  EUR/USD: 1.05 (euro strong)

  FX Gain = (1.05 - 1.0) × $50M = $2.5M
```

**Hedging Strategy:**
- Diversify factory locations
- Don't concentrate all production in one region
- Asia = high growth but high FX volatility
- Europe = stable but slower growth

---

### Competitive Positioning

**Five Viable Strategies:**

#### 1. Quality Leader
```
Focus: Premium products, high R&D
Key Decisions:
  • 15-20% budget to R&D
  • Six Sigma upgrade priority
  • Target Professional/Enthusiast segments
  • Premium pricing (use quality tolerance)

Strengths: High margins, brand premium
Weaknesses: Smaller market share, high costs
```

#### 2. Cost Leader
```
Focus: Low prices, operational efficiency
Key Decisions:
  • Automation upgrade early
  • 10-15% to efficiency investments
  • Target Budget/General segments
  • Aggressive pricing

Strengths: High volume, market share
Weaknesses: Low margins, price pressure
```

#### 3. Brand Builder
```
Focus: Marketing, customer loyalty
Key Decisions:
  • 15-20% to branding/advertising
  • Sponsorships and promotions
  • Balanced quality
  • All segments

Strengths: Customer loyalty, pricing power
Weaknesses: High marketing costs, slow build
```

#### 4. ESG Focused
```
Focus: Risk mitigation, investor appeal
Key Decisions:
  • 2-3% revenue to charity/community
  • ESG programs (safety, ethics)
  • Green investments
  • Targets high-ESG segments

Strengths: Board approval, investor sentiment
Weaknesses: Higher costs, indirect returns
```

#### 5. R&D Innovator
```
Focus: Technology leadership, patents
Key Decisions:
  • 20%+ to R&D
  • Hire premium engineers
  • Tech-forward segments
  • Feature-rich products

Strengths: Innovation premium, first-mover
Weaknesses: High R&D costs, risk
```

---

## ESG & Risk Management

### ESG Redesigned as Risk Mitigation (NEW)

**Old System (Removed):**
- ❌ ESG 700+ = +5% revenue (exploit)
- ❌ ESG 400-699 = +2% revenue
- ❌ Code of Ethics = free +200 ESG

**New System:**

```
ESG Score < 300: Crisis Risk
  • 1-8% revenue penalty (boycotts, fines)
  • -12% board approval
  • -10 investor sentiment

ESG Score 300-600: Baseline
  • No direct revenue effect
  • Normal operations

ESG Score > 600: Risk Mitigation
  • +8% board approval (better governance)
  • +8 investor sentiment (ESG investing)
  • Lower breakdown/crisis probability
```

**Strategic Implications:**
- ESG is insurance, not revenue generator
- Minimum 300 to avoid penalties
- High ESG (>600) improves financing options
- Balance ESG costs with risk reduction

---

### Upgrade Economic Payoffs (NEW)

All factory upgrades now have clear ROI:

#### Six Sigma ($75M)
```
Direct: 40% defect reduction
Economic:
  • 50% warranty cost reduction
  • 75% recall probability reduction

Example ROI:
  Warranty savings: $2M/round
  Payback: 37.5 rounds
  But: Avoids $50M recall (catastrophic risk)
```

#### Automation ($75M)
```
Direct: 80% worker reduction
Economic:
  • 60% cost volatility reduction
  • Predictable unit costs

Best for: Cost leaders, high volume
```

#### Supply Chain ($200M)
```
Direct: 70% shipping cost reduction
Economic:
  • 70% stockout reduction
  • Captures more demand during spikes

Best for: High-demand products, global ops
```

#### Warehousing ($100M)
```
Direct: 90% storage cost reduction
Economic:
  • 90% demand spike capture
  • Never lose sales to inventory issues

Best for: Volatile segments (Enthusiast)
```

#### Material Refinement ($100M)
```
Direct: +1 material quality level
Economic:
  • Quality improvement
  • Enables premium pricing

Best for: Quality leaders
```

---

## Advanced Strategies

### The Quality-Premium Loop

```
1. Invest in R&D (15-20% budget)
2. Target quality 80-100
3. Price at upper tolerance (Quality × 0.2%)
4. Buy Six Sigma (reduce warranty costs)
5. Market share bonus (Quality × 0.1%)
6. Reinvest premium margins

Result: 30-40% higher revenue than cost strategy
```

### The Cash Flow Optimization

```
1. Maintain Current Ratio > 2.0
2. Use long-term debt for capex
3. Short-term debt for working capital only
4. Buybacks only when:
   - Cash ratio > 1.0
   - ROE > 15%
   - PE ratio < 15
5. Dividends 2-4% yield (signal strength)

Result: AAA credit rating, low cost of capital
```

### The Geographic Diversification

```
1. Start with North America factory (no FX risk)
2. Round 3-4: Add Asia factory (growth)
3. Round 6-7: Add Europe factory (stability)
4. Spread production across regions

FX Impact: ±2-3% (manageable)
Growth Boost: +15-20% (Asia exposure)
Risk Reduction: No single-region dependency
```

### The Balanced Scorecard

```
Financial Health:
  • Current Ratio: > 2.0
  • Debt/Equity: < 0.6
  • Profit Margin: > 15%

Operations:
  • Utilization: 70-90% (not >95%)
  • Defect Rate: < 3%
  • Efficiency: > 0.85

Market:
  • Market Share Growth: +2-5% per round
  • Brand Value: Growing
  • Customer Satisfaction: High

ESG:
  • ESG Score: 300-600 (risk mitigation)
  • Board Approval: > 60%
  • Investor Sentiment: 55-70
```

---

## Quick Reference

### Decision Priority Framework

**Early Game (Rounds 1-3):**
1. Build production capacity
2. Develop quality products
3. Establish brand presence
4. Maintain liquidity (current ratio > 2.0)

**Mid Game (Rounds 4-7):**
1. Strategic upgrades (Six Sigma OR Automation)
2. Geographic expansion
3. Market share growth
4. ESG baseline (300+)

**Late Game (Rounds 8-10):**
1. Maximize profitability
2. Optimize capital structure
3. Buybacks if undervalued
4. Dividend policy (2-4% yield)

### Red Flags

⚠️ **Immediate Action Required:**
- Current ratio < 1.2
- Cash < $20M
- Utilization > 95% for 2+ rounds
- Defect rate > 10%
- ESG < 300
- Market share declining 3 rounds

### Common Mistakes

❌ **Don't:**
- Buy back stock when cash-strapped
- Run factories at 100% utilization
- Ignore liquidity ratios
- Pay excessive dividends (>5% yield)
- Concentrate all production in one region
- Treat ESG as revenue generator

✅ **Do:**
- Balance short and long-term debt
- Maintain 70-90% utilization
- Monitor warranty costs
- Use quality for premium pricing
- Diversify geographically
- View ESG as risk insurance

---

## Conclusion

Success requires balancing:
- **Financial discipline** (liquidity, leverage, capital allocation)
- **Operational excellence** (quality, efficiency, capacity)
- **Market positioning** (pricing, brand, segments)
- **Risk management** (ESG, FX, diversification)

Multiple strategies are viable - choose one and execute consistently!

Good luck! 🎯
