# Business Simulation Engine — Comprehensive Balance Fix List

**Version:** v3.0.0 → v3.1.0 | **Date:** 2026-02-08 | **Monte Carlo Score:** 0/100 → Target 75+

---

## Executive Summary

The Monte Carlo analysis (2,000+ simulated games) revealed **severe balance failure**: the "balanced" strategy wins 100% of games, 4 of 7 strategies never win, and the game is effectively solved. This document catalogs every identified issue, the root cause formula, the proposed fix, and implementation priority.

**Target Outcomes After Fixes:**
- No strategy wins more than 25% of games
- Every strategy wins at least 8% of games
- Snowball risk below 30% (currently 80%)
- Revenue spread widens to 1.5–3.0x (currently 1.13x)
- At least 3 distinct viable paths to victory

---

## Design Philosophy: Real Students, Not Bots

This game is played by **real students in a classroom setting**. Every mechanic must pass the "would a student feel this is fair?" test.

**Principles:**
- **No punishment for playing well.** Rubber-banding should feel like market dynamics, not artificial handicaps. A team that earns a lead should keep it unless competitors outplay them — not because the engine decided they were "too far ahead."
- **Discoverable counterplay.** Students should learn that R&D disrupts premium incumbents by *experiencing it*, not because a tooltip says "+15% bonus vs Premium." Counter-strategies should emerge naturally from the mechanics.
- **Meaningful choices, not solved games.** If one strategy always wins, students learn nothing about business tradeoffs. If every strategy can win in the right circumstances, students learn to read the market and adapt — which is the actual learning objective.
- **Gradual complexity.** Phase 1 fixes should be invisible to students (engine constants). Phase 2–3 fixes introduce new decisions. Don't overwhelm students with new mechanics all at once.
- **Failure should teach, not destroy.** Bankruptcy and cash crises create memorable learning moments. But a team that goes bankrupt in round 3 with no recovery path just disengages for the remaining 5 rounds. Always leave a path back.

---

## Priority Legend

| Priority | Meaning | Action |
|----------|---------|--------|
| 🔴 CRITICAL | Directly causes imbalance; game is broken without fix | Fix immediately |
| 🟠 HIGH | Major contributor to dominance/non-viability | Fix in same patch |
| 🟡 MEDIUM | Amplifies existing problems or blocks strategy viability | Fix in follow-up |
| 🟢 LOW | Quality-of-life or polish; improves depth but not strictly required | Backlog |

---

## Section 0: Pre-Requisite — RNG Variance Verification

Before any balance tuning can work, the simulation must actually produce varied outcomes across runs.

---

### Fix 0.0 — Verify RNG Produces Meaningful Variance Across Seeds

> **Priority:** 🔴 CRITICAL | **Effort:** Low (diagnostic + possible fix) | **Impact:** Blocking

**Root Cause:** The Monte Carlo showed **100%** win rates — not 95%, not 98%, but 100.0% across 200 games per matchup. That level of determinism suggests the seeded RNG may not be creating enough variance between simulation runs. If every seed produces nearly identical market conditions, demand patterns, and event sequences, no amount of balance tuning will create the 40–60% win rate distributions we're targeting.

**Diagnostic Steps:**
1. Run 10 simulations with different seeds, same strategies. Log per-round GDP, consumer confidence, demand per segment, and final revenue per team.
2. Compare: Are the numbers meaningfully different? Or do they cluster within 1–2% of each other?
3. Check the `EngineContext` seed → RNG pipeline: does the market evolution RNG actually use different seeds per game, or is there an accidental constant?

**If variance is too low, fix by:**
```
- Increase random walk amplitudes (GDP ±0.5 → ±1.5, confidence ±2.5 → ±8)
- Add regime-level variance (see Fix 8.1)
- Ensure demand noise (currently ±5%) actually uses the per-game seed
- Verify that the separate RNG streams (HR, R&D, Market, Factory) are seeded
  from the match seed, not from a hardcoded value
```

**Why this is Fix 0.0:** If the RNG isn't working, Phase 1 constant changes will still produce 100% win rates. This must be verified first.

**File:** `EngineContext.ts`, `SeededRNG.ts`, `SimulationEngine.ts`

---

## Section 1: Market Scoring & Competition Fixes

These are the highest-leverage fixes. The market simulator determines winners, and its current design mathematically guarantees generalist dominance.

---

### Fix 1.1 — Lower Softmax Temperature

> **Priority:** 🔴 CRITICAL | **Effort:** Trivial (1 constant) | **Impact:** Very High

**Root Cause:** Softmax temperature of 10 spreads market share too evenly. Even large score gaps produce mild share differences, so a generalist scoring "okay everywhere" captures enough share in every segment to win on total revenue.

**Current Formula:**
```
share[i] = exp((score[i] - max) / 10) / Σ exp((score[j] - max) / 10)
```

**Example at Temperature 10 (scores 80/60/55/50):**
- Shares: 79% / 11% / 6% / 4%
- But typical balanced-vs-specialist gaps are only 5–10 points, producing ~46/28/17/10%

**Proposed Fix:** Reduce temperature to **5** (conservative starting point).

```
share[i] = exp((score[i] - max) / 5) / Σ exp((score[j] - max) / 5)
```

**Example at Temperature 5 (scores 70/65/60/55):**
- Old shares (T=10): 46% / 28% / 17% / 10%
- New shares (T=5): 57% / 25% / 11% / 6%

**Why T=5 and not T=4:** Lower temperature sharpens segment dominance, which is good for specialists — but it also amplifies snowball risk (Fix 7.1). A team that takes an early lead in a segment gets a larger share, generating more revenue, enabling more investment, widening the gap. T=5 gives specialists meaningful segment ownership without making early leads insurmountable. **After Phase 1 Monte Carlo, if snowball risk is under 40%, try T=4. If snowball is already a problem at T=5, stay there or try T=6.**

**File:** `MarketSimulator.ts` → softmax temperature constant

**Tuning note:** Run Monte Carlo at T=4, T=5, T=6 after Phase 1. Track both win rate spread AND snowball rate — these two metrics are in tension at this parameter.

---

### Fix 1.2 — Increase Segment Scoring Weight Differentiation

> **Priority:** 🔴 CRITICAL | **Effort:** Low (weight table update) | **Impact:** Very High

**Root Cause:** The non-primary weights dilute specialist advantages. In Budget segment (Price weight=50), a balanced team scoring 60% on everything gets 60 points. A volume specialist scoring 95% on price but 30% on everything else gets only 62.5 points — a trivial 4% edge despite massive commitment.

**Current Weights:**
| Segment | Price | Quality | Brand | ESG | Features |
|---------|-------|---------|-------|-----|----------|
| Budget | 50 | 22 | 8 | 8 | 12 |
| General | 32 | 28 | 10 | 10 | 20 |
| Enthusiast | 20 | 40 | 10 | 10 | 20 |
| Professional | 15 | 42 | 10 | 16 | 17 |
| Active Lifestyle | 25 | 32 | 12 | 10 | 21 |

**Proposed Weights (sharpen primary factors):**
| Segment | Price | Quality | Brand | ESG | Features |
|---------|-------|---------|-------|-----|----------|
| Budget | **65** | 15 | 5 | 5 | 10 |
| General | 30 | 25 | **15** | 10 | 20 |
| Enthusiast | 12 | **30** | 8 | 5 | **45** |
| Professional | 8 | **50** | 5 | **20** | 17 |
| Active Lifestyle | 20 | 30 | **18** | 10 | 22 |

**Design rationale:**
- Budget buyers care almost exclusively about price (65 weight)
- Enthusiasts are feature-obsessed (45 weight)
- Professionals demand quality above all (50 weight)
- General segment is the only one where breadth helps — this is balanced's natural territory
- Brand weight elevated in General and Active Lifestyle to make brand strategy viable there

**File:** `MarketSimulator.ts` → segment scoring weights object

---

### Fix 1.3 — Add Segment Entry Costs / Capacity Constraints

> **Priority:** 🔴 CRITICAL | **Effort:** Medium (new mechanic) | **Impact:** Very High

**Root Cause:** All teams start with 5 products covering all 5 segments. There is zero cost to *being in* a segment. Balanced competes everywhere for free because the game gives everyone full coverage by default.

**Proposed Fix — Production Line Dedication:**

Each factory production line can only produce for **one segment at a time**. Teams start with **2 production lines** (not 5 products ready for all segments).

- Adding a new production line: **$15M + 1 round setup time**
- Switching a production line to a different segment: **$5M + 1 round retooling**
- Maximum lines per factory: **4** (need a second factory for full coverage)

**Impact on strategies:**
- **Balanced** must spend $45M+ and 3+ rounds to cover all 5 segments, plus a second factory ($50M) for full coverage. That's $95M+ and significant time — a real cost.
- **Volume** invests in 1–2 lines with maximum capacity upgrades
- **Premium** invests in 1–2 high-quality lines for Enthusiast/Professional
- **Specialists** get to market faster and cheaper in their chosen segments

**Alternative (lighter touch):** If production lines are too complex, add a **market entry fee** per segment per round: $2M to maintain active sales in a segment (advertising minimums, distribution contracts, customer support). Balanced pays $10M/round for 5 segments; a 2-segment specialist pays $4M.

**⚠️ Stacking Warning:** This fix and Fix 9.1 (complexity overhead) both penalize breadth. **Implement only one in Phase 2.** Run Monte Carlo after. If balanced is still above 25% win rate, add the other in Phase 3. Implementing both simultaneously risks making balanced unplayable, which is as bad as making it dominant — students who naturally gravitate toward a "do a bit of everything" approach shouldn't feel the game is punishing them for it.

**File:** New mechanic in `FactoryModule.ts`, `SimulationEngine.ts`

---

### Fix 1.4 — Redesign Win Condition (Multi-Dimensional Scoring)

> **Priority:** 🟠 HIGH | **Effort:** Medium | **Impact:** High

**Root Cause:** Revenue as the sole win condition across 5 segments mathematically favors the generalist. Even if a specialist dominates 2 segments, the generalist's decent shares across all 5 sum to more.

**Proposed Fix — Victory Point System:**

| Dimension | Scoring | Specialist It Rewards |
|-----------|---------|----------------------|
| Total Revenue | $50M brackets → 10/7/4/1 VP | Volume, Balanced |
| Net Profit Margin | 5% brackets → 10/7/4/1 VP | Premium, Cost-cutter |
| Highest Single-Segment Share | 10% brackets → 10/7/4/1 VP | Any specialist |
| Brand Value | 0.2 brackets → 10/7/4/1 VP | Brand |
| Patent Count | 2-patent brackets → 10/7/4/1 VP | R&D |
| Operational Efficiency | 15% brackets → 10/7/4/1 VP | Automation |
| ESG Score | 200-point brackets → 10/7/4/1 VP | ESG-focused |

**Diminishing returns per dimension** means being excellent at 2–3 things beats being mediocre at 7. The key is making Tier 1 easy (everyone gets 10 VP) but Tier 3–4 very hard (only specialists reach them). Total VP across all dimensions at "average" performance should be lower than specialist performance in 2–3 dimensions at Tier 3.

**Simplified alternative:** Keep revenue as primary, but add **bonus multipliers** for dimension leadership:
- Highest profit margin in the game: 1.10x revenue multiplier
- Highest brand value: 1.08x
- Most patents: 1.08x
- Highest efficiency: 1.06x
- Best ESG: 1.05x

This keeps revenue as the scoreboard but rewards excellence in specific areas. Easier for students to understand than a full VP system.

**File:** `SimulationEngine.ts` → ranking/scoring logic

---

## Section 2: Brand System Fixes

Brand strategy is mathematically broken. The decay rate outpaces maximum possible growth, making it impossible to build brand value over time.

---

### Fix 2.1 — Fix Brand Growth vs. Decay Math

> **Priority:** 🔴 CRITICAL | **Effort:** Trivial (2 constants) | **Impact:** High

**Root Cause:** Brand growth caps at 2%/round. Brand decays at 6.5%/round. Even at maximum investment, the net formula trends downward:

```
next = (current + 0.02) × 0.935
```

Starting at 0.5: → 0.486 → 0.473 → 0.461 → ... converges to ~0.31. **Brand strategy literally cannot build brand value.**

**Proposed Fix (Option A — Reduce Decay):**
```
Brand decay: 6.5% → 2.5%
Growth cap: 2.0% → stays 2.0%
next = (current + 0.02) × 0.975
```
Starting at 0.5: → 0.507 → 0.514 → 0.521 → ... converges to ~0.80. Now sustained investment builds toward a strong brand.

**Proposed Fix (Option B — Increase Growth Cap):**
```
Brand decay: 6.5% → stays 6.5%
Growth cap: 2.0% → 6.0%
```
Higher cap allows brand-focused strategies to outpace decay when investing heavily, while light investors still lose brand value. Creates sharper differentiation between committed and casual brand investment.

**Recommendation:** Option A is simpler and more predictable. Option B creates higher variance (which is interesting but harder to balance).

**⚠️ Interaction with Fix 2.4:** Reducing decay makes brand stronger at all starting cash levels. Check Monte Carlo at $100M and $150M starting cash after this fix — brand may become even more dominant at low cash (see Fix 2.4).

**File:** `MarketingModule.ts` → `BRAND_DECAY_RATE`, `BRAND_GROWTH_CAP`

---

### Fix 2.2 — Add Brand Compounding / Critical Mass Threshold

> **Priority:** 🟡 MEDIUM | **Effort:** Medium | **Impact:** Medium

**Root Cause:** Brand returns are linear. There's no reason to invest heavily vs. moderately — you get the same per-dollar return.

**Proposed Fix:** Add a brand critical mass threshold at **0.6 brand value**. Below 0.6, brand investment returns are normal. Above 0.6, brand generates a **compounding loyalty bonus**:

```
if (brandValue > 0.6):
  loyaltyBonus = (brandValue - 0.6) × 0.5  // Up to +20% at brand=1.0
  effectiveBrandScore = brandScore × (1 + loyaltyBonus)
```

**Also add brand-driven switching costs:** Once a customer buys from a high-brand team, there's a 20–40% chance they "lock in" and aren't available to competitors next round. This shrinks the addressable market for non-brand competitors in segments where a strong brand exists.

**File:** `MarketSimulator.ts` → brand score calculation, demand allocation

---

### Fix 2.3 — Sponsorship Effectiveness is Too Weak

> **Priority:** 🟡 MEDIUM | **Effort:** Trivial | **Impact:** Medium

**Root Cause:** The most expensive sponsorship (National TV Campaign, $35M) gives +4.5% brand. With the 2% growth cap, most of this is wasted. Even without the cap, 4.5% on a 0–1 scale for $35M is poor ROI.

**Proposed Fix:**
- Sponsorships should **bypass the growth cap** (they're one-time events, not sustained growth)
- Increase sponsorship brand impacts by 1.5–2x
- Add segment-specific market share bonuses (not just brand) — e.g., Sports Jersey gives +5% market share in Active Lifestyle for 2 rounds

**File:** `MarketingModule.ts` → sponsorship processing

---

### Fix 2.4 — Address Brand-at-Low-Cash Anomaly

> **Priority:** 🟠 HIGH | **Effort:** Low–Medium | **Impact:** Medium

**Root Cause:** Monte Carlo showed brand wins 100% at $100–150M starting cash, then balanced wins 100% at $200M+. This is a binary flip with no gradual transition. The likely cause: at low starting cash, teams can't afford factory upgrades or R&D, so the only effective spending is marketing (which is cheaper per-dollar of impact). Brand strategy spends proportionally less of its cash on marketing than other strategies spend on their respective investments, making it the only strategy that "works" when cash is tight.

Fix 2.1 (reducing brand decay) would make brand even stronger at low cash, potentially extending brand dominance into the $200M range.

**Proposed Fix — Make Brand Investment Scale With Absolute Cost, Not Proportionally:**

```
Current: Brand impact = 0.25% per $1M (same regardless of company size)
Proposed: Brand maintenance cost = $3M/round baseline just to prevent decay
          Brand growth investment starts being effective only above $5M/round

This means:
  At $100M cash: $5M is 5% of cash → brand still accessible but costly
  At $300M cash: $5M is 1.7% of cash → brand is proportionally cheap (intended)
```

**Alternative:** Scale brand decay with company revenue — larger companies need more marketing spend to maintain the same brand value (brand "weight" increases with scale). This naturally disadvantages brand at high cash where companies are larger.

**Also consider:** The Monte Carlo sensitivity test should vary starting cash in Phase 1 validation. If brand still dominates below $175M after other fixes, add a minimum brand investment threshold before any brand growth occurs ($3M minimum to get any positive return).

**File:** `MarketingModule.ts` → brand investment processing, decay formula

---

## Section 3: R&D System Fixes

R&D-focused strategy is non-viable because the patent system is too slow and the payoff is too small.

---

### Fix 3.1 — Accelerate Patent Generation

> **Priority:** 🟠 HIGH | **Effort:** Trivial (1 constant) | **Impact:** High

**Root Cause:** Patents require 500 R&D points. Engineers generate ~5–10 points/round each. With 8 engineers: 40–80 points/round → 7+ rounds for first patent. In an 8-round game, an R&D strategy gets 1 patent worth +2 quality. That's equivalent to a $2M product improvement — pathetic ROI for $105M+ in R&D spending.

**Proposed Fix:**
```
Patent threshold: 500 → 200 points
Patent quality bonus: 2 per patent → 5 per patent (max +25)
Patent cost reduction: 3% per patent → 5% per patent (max 25%)
Patent market share bonus: 1% per patent → 3% per patent (max 15%)
```

**Expected result:** R&D-focused team with 8 engineers gets first patent by round 3–4, accumulates 3–4 patents by round 8. Total bonus: +15–20 quality, 15–20% cost reduction, 9–12% market share bonus. Now it's a real competitive advantage.

**File:** `RDModule.ts` → patent constants

---

### Fix 3.2 — Add R&D Breakthrough Mechanic

> **Priority:** 🟠 HIGH | **Effort:** Medium (new mechanic) | **Impact:** High

**Root Cause:** R&D returns are linear and incremental. There's no exciting payoff moment — no "eureka" that justifies heavy R&D investment over steady balanced spending.

**Proposed Fix:** Each round, if R&D budget exceeds a threshold, roll for a breakthrough:

```
Breakthrough chance per round:
  Budget < $5M:   0%
  $5M–$10M:       5%
  $10M–$20M:      15%
  $20M+:          25%
  Cumulative bonus: +2% per consecutive round of $10M+ spending

On breakthrough:
  - One random product gets +20 quality AND +20 features instantly
  - OR: New product unlocked in any segment with quality 90+
  - OR: Manufacturing cost reduction of 30% for 3 rounds
  - Competitor quality expectations rise by 5% (externality — hurts everyone else)
```

**Design note:** The breakthrough is probabilistic. Some games, R&D hits big in round 4 and dominates. Other games, it never fires and R&D underperforms. This creates the high-variance profile that makes R&D exciting and situationally dominant without being always-dominant. **Students will remember the game where their R&D bet paid off — and the game where it didn't.** Both are valuable learning experiences about risk management.

**File:** `RDModule.ts` → new breakthrough logic in `processRound`

---

### Fix 3.3 — Engineer R&D Output is Too Low

> **Priority:** 🟡 MEDIUM | **Effort:** Trivial | **Impact:** Medium

**Current formula:**
```
R&D Points = 10 × (efficiency/100) × (speed/100) × (1 + innovation/200) × (1 - burnout/200)
```

With average stats (70 efficiency, 70 speed, 70 innovation): `10 × 0.7 × 0.7 × 1.35 × 0.65 = 4.3 points`. That's extremely low.

**Proposed Fix:** Increase base from 10 to **25**, and make innovation weight stronger:
```
R&D Points = 25 × (efficiency/100) × (speed/100) × (1 + innovation/100) × (1 - burnout/200)
```

Same average stats: `25 × 0.7 × 0.7 × 1.7 × 0.65 = 13.5 points`. Now 8 engineers produce ~108 points/round → patent every 2 rounds with the reduced threshold from Fix 3.1.

**File:** `HRModule.ts` or `RDModule.ts` → engineer output formula

---

## Section 4: Automation Strategy Fixes

Automation never wins because its cost savings are too small relative to the investment.

---

### Fix 4.1 — Increase Automation Economic Impact

> **Priority:** 🟠 HIGH | **Effort:** Low | **Impact:** High

**Root Cause:** Automation's $75M upgrade reduces workers by 80%, but labor cost per unit is only $20. Saving $16/unit on a $450 phone is 3.5% — nowhere near enough to offset the upfront cost or create competitive advantage.

**Proposed Fix — Automation Affects Total Unit Cost, Not Just Labor:**
```
Current: Automation saves labor cost only ($20/unit × 80% = $16/unit saved)

Proposed: Automation reduces TOTAL unit production cost by 35%
  - Budget phone: $85 → $55 (saves $30/unit)
  - General phone: $135 → $88 (saves $47/unit)
  - Pro phone: $235 → $153 (saves $82/unit)
  - Enterprise phone: $385 → $250 (saves $135/unit)
  - Active phone: $185 → $120 (saves $65/unit)
```

**Additionally, add an automation tipping point (nonlinear threshold):**
```
Automation level 0–50%: Linear cost reduction (current behavior)
Automation level 50–80%: Slightly better than linear
Automation level 80%+: "Lights out factory" — additional 20% cost reduction on top
                        AND +25% production capacity
                        AND defect rate drops to 1%
```

This makes automation a slow-burn strategy that's mediocre for 3–4 rounds then becomes extremely powerful. Students learn about capex payback periods and long-term strategic bets.

**File:** `FactoryModule.ts` → automation upgrade processing, unit cost calculation

---

### Fix 4.2 — Automation Should Enable Price War Dominance

> **Priority:** 🟡 MEDIUM | **Effort:** Low | **Impact:** Medium

**Proposed Fix:** When a team has full automation AND undercuts competitors by 15%+, they should capture disproportionate market share in price-sensitive segments. Model this as a **price leadership bonus**:

```
if (hasAutomation && priceIsLowestByMargin >= 15%):
  priceScore *= 1.3 in Budget segment
  priceScore *= 1.15 in General segment
```

This gives automation a concrete competitive application rather than just being "slightly cheaper."

**File:** `MarketSimulator.ts` → price score calculation

---

## Section 5: Volume Strategy Fixes

Volume never wins because flooding the market with cheap products doesn't generate enough revenue advantage.

---

### Fix 5.1 — Volume Discounts Should Increase Addressable Market

> **Priority:** 🟠 HIGH | **Effort:** Medium | **Impact:** High

**Root Cause:** Volume and premium compete for shares of the same fixed demand pool. Volume can't expand the pie — it can only take a slice. But in reality, low prices bring in buyers who wouldn't have purchased at higher prices.

**Proposed Fix — Price-Driven Demand Expansion:**
```
For Budget and General segments:
  If any team's price is >20% below segment average:
    Segment demand increases by 15–25%
    The price leader captures 60%+ of the new demand
```

This means a volume strategy pricing aggressively doesn't just steal share — it **grows the market** and captures most of the growth. Other players benefit slightly from the larger market too, but the price leader benefits disproportionately.

**File:** `MarketSimulator.ts` → demand calculation, before share allocation

---

### Fix 5.2 — Scale Economies for High-Volume Producers

> **Priority:** 🟡 MEDIUM | **Effort:** Low | **Impact:** Medium

**Proposed Fix:** Teams producing above a volume threshold get progressive cost reductions:

```
Units produced > 100,000: -5% unit cost
Units produced > 250,000: -12% unit cost
Units produced > 500,000: -20% unit cost
```

This makes volume self-reinforcing — the more you produce, the cheaper it gets, letting you price even lower, capturing more share, producing more. Students learn about economies of scale.

**File:** `FactoryModule.ts` → production cost calculation

---

## Section 6: Cost-Cutter Strategy Fixes

Cost-cutter never wins because there's no scenario where conservative spending is rewarded.

---

### Fix 6.1 — Add Meaningful Downside Risk / Bankruptcy Mechanic

> **Priority:** 🟠 HIGH | **Effort:** Medium | **Impact:** High

**Root Cause:** Zero teams ever go bankrupt. Starting conditions are too forgiving ($200M cash), and there are no cash drain events. This means conservative cash management (cost-cutter's strength) has no value — there's nothing to survive.

**Proposed Fix:**
- **Cash crunch events:** 2–3 times per game, inject events that drain cash proportional to company size (e.g., `max($20M, revenue × 0.25)`). Over-invested teams face liquidity crises; cost-cutters weather them easily. Events should be **announced 1 round in advance** so students can prepare.
- **Bankruptcy at negative cash:** If cash < -$20M at end of round, team enters bankruptcy protection (50% revenue penalty for 2 rounds, forced asset sales). This is devastating but recoverable — a team in bankruptcy isn't eliminated, they're fighting uphill. **Students should always have a path back.**
- **Interest on negative cash:** If cash < 0, charge 15% interest per round (emergency lending rates). Drains the team further.
- **Credit rating matters:** Teams with high debt/low cash pay more for everything (worse supplier terms, higher borrowing costs). Cost-cutters with strong balance sheets get preferential rates.

**Student experience note:** Cash crunch events should be announced 1 round in advance ("Warning: regulatory lawsuit pending, estimated cost $40–60M next round") so students can prepare. Surprise cash drains feel unfair; anticipated ones create interesting strategic dilemmas — do you save cash or keep investing?

**File:** `SimulationEngine.ts`, `FinanceModule.ts` → new bankruptcy logic, event system

---

### Fix 6.2 — Cash Reserves Should Provide Tangible Benefits

> **Priority:** 🟡 MEDIUM | **Effort:** Low | **Impact:** Medium

**Proposed Fix:**
```
Cash reserve bonus (if cash > $100M and debt = 0):
  - +5% investor sentiment → higher market cap
  - +10% board approval for all proposals
  - Unlocks "opportunistic acquisition" events: cheap factory purchases, talent raids
  - 2% interest income on cash reserves per round
```

This gives cost-cutters a passive income stream and strategic optionality that big spenders don't have.

**File:** `FinanceModule.ts` → round processing

---

## Section 7: Snowball & Rubber-Banding Fixes

Round-3 leaders win 80% of games. The current rubber-banding is too weak to counteract early advantages.

---

### Fix 7.1 — Strengthen Rubber-Banding

> **Priority:** 🟠 HIGH | **Effort:** Low | **Impact:** High

**Current rubber-banding:**
```
Trailing teams (share < avg × 0.5): +15% market share boost
Leading teams (share > avg × 2.0): -8% market share penalty
```

**Problem:** +15% of a tiny share is still tiny. -8% of a dominant share is a rounding error. The thresholds (0.5x and 2.0x average) are also too extreme — they rarely trigger.

**Proposed Fix:**
```
Activation: Round >= 2 (was 3)

Trailing (share < avg × 0.7):
  Boost = 20% + (avg - share) / avg × 30%  // Scales with gap, up to +50%

Leading (share > avg × 1.5):
  Penalty = 10% + (share - avg) / avg × 20%  // Scales with gap, up to +30%

Additional: "Underdog marketing bonus" — trailing teams get 1.5x marketing effectiveness
```

**⚠️ Tension with Fix 1.1:** Lowering softmax temperature makes segment dominance sharper, which amplifies snowball. This fix counteracts that. The two need to be tuned together — run Monte Carlo with both applied and check snowball rate. If snowball risk is still above 45% after both, increase the rubber-banding coefficients or raise softmax temperature from T=5 to T=6.

**File:** `MarketSimulator.ts` → rubber-banding logic

---

### Fix 7.2 — Add Catch-Up Mechanics (Diminishing Returns on Market Leadership)

> **Priority:** 🟡 MEDIUM | **Effort:** Medium | **Impact:** Medium

**Proposed Fix:** Market share above 40% in any segment faces increasing customer churn:

```
if (segmentShare > 0.4):
  churnRate = (segmentShare - 0.4) × 0.3  // 30% of excess share lost per round
  // At 60% share: lose (0.6 - 0.4) × 0.3 = 6% share per round
  // At 80% share: lose (0.8 - 0.4) × 0.3 = 12% share per round
```

Rationale: Dominant players face antitrust scrutiny, customer fatigue ("too mainstream"), and competitor targeting. This caps how dominant any single team can be in a segment. Feels fair to students because it's framed as market dynamics, not punishment.

**File:** `MarketSimulator.ts` → post-allocation share adjustment

---

## Section 8: Market Dynamics Fixes

The game has no dynamic market environments. Every simulation run produces similar conditions, so the same strategy always wins.

---

### Fix 8.1 — Add Market Regime System

> **Priority:** 🟠 HIGH | **Effort:** Medium-High | **Impact:** Very High

**Root Cause:** Economic conditions evolve via small random walks (GDP ±0.5, inflation ±0.25). This produces nearly identical macro environments across all simulations. There are no regime changes that dramatically shift which strategies are viable.

**Proposed Fix — Market Regimes:**

| Regime | Duration | GDP | Confidence | Effect |
|--------|----------|-----|------------|--------|
| **Boom** | 2–3 rounds | +3 to +5 | 85–95 | All demand +20%, Premium/Enthusiast demand +30% |
| **Recession** | 2–3 rounds | -2 to -4 | 35–55 | All demand -20%, Budget demand +10%, Premium demand -35% |
| **Tech Disruption** | 1–2 rounds | +1 | 70 | R&D teams get 2x output, non-R&D products lose 10 quality |
| **Price War** | 1–2 rounds | 0 | 60 | Price weight +50% in all segments, margins compress 20% |
| **Brand Renaissance** | 2 rounds | +1 | 80 | Brand weight 2x in all segments, brand decay halved |
| **Regulation Wave** | 1–2 rounds | -1 | 55 | ESG weight 3x, non-compliant teams pay 10% revenue fine |
| **Supply Shock** | 1 round | -1 | 50 | Raw material costs +50%, volume producers hit hardest |

**Transition logic:** Each regime has a probability of transitioning to others (like the existing economic cycle system, but at a higher abstraction level affecting all game variables at once).

**Student visibility:** Regimes should be **announced to students** at the start of the round they begin ("Breaking News: The economy is entering a recession..."). This teaches students to read macroeconomic signals and adapt. Hidden regimes would feel random; visible ones create strategic decision points.

**File:** New `MarketRegimeEngine.ts`, integrated into `SimulationEngine.processRound`

---

### Fix 8.2 — Increase Economic Variance

> **Priority:** 🟡 MEDIUM | **Effort:** Trivial | **Impact:** Medium

**Current random walks are too narrow:**
```
GDP: ±0.5/round → range stays within 1–4% across a whole game
Consumer confidence: ±2.5/round → stays within 65–85
```

**Proposed Fix:**
```
GDP: ±1.5/round (with momentum — if GDP dropped last round, 60% chance it drops again)
Consumer confidence: ±8/round
Inflation: ±1.0/round
Unemployment: ±0.5/round
```

Also add **correlated shocks**: When GDP drops more than 2 points in one round, consumer confidence drops 15 and unemployment rises 1.5 (cascade effect). This creates genuine recessions rather than gentle wobbles.

**Note:** This fix partially overlaps with Fix 0.0 (RNG variance). If Fix 0.0 reveals the random walks are working correctly but just too narrow, this fix addresses it directly.

**File:** `SimulationEngine.ts` → market evolution logic

---

## Section 9: Generalist Tax (Balanced Strategy Nerf)

Even after all other fixes, balanced may still need a cost for trying to be everywhere at once. But proceed cautiously — implement conditionally based on Monte Carlo results.

---

### Fix 9.1 — Complexity Overhead Cost

> **Priority:** 🟡 MEDIUM | **Effort:** Low | **Impact:** Medium

**Proposed Fix:** Teams competing in 4+ segments simultaneously pay a **complexity tax**:

```
Segments active: 1–2 → no overhead
Segments active: 3   → 3% operating cost increase
Segments active: 4   → 8% operating cost increase
Segments active: 5   → 15% operating cost increase
```

"Active" means producing and selling in that segment. This directly penalizes the balanced approach of competing everywhere.

**Justification:** Real companies managing 5 product lines across 5 market segments need more managers, more complex supply chains, more diverse marketing, and more coordination overhead. This is a real business concept students should internalize.

**⚠️ CRITICAL: Do not implement simultaneously with Fix 1.3 (segment entry costs).** Both fixes penalize breadth. Stacking them would make balanced unplayable rather than just non-dominant. **Implement Fix 1.3 first (Phase 2). Run Monte Carlo. If balanced is still above 25% win rate after Fix 1.3, add Fix 9.1 in Phase 3. If balanced is already below 25%, skip Fix 9.1 entirely or reduce the percentages.**

**File:** `SimulationEngine.ts` → cost calculation, after module processing

---

### Fix 9.2 — Execution Efficiency Penalty for Breadth

> **Priority:** 🟢 LOW | **Effort:** Medium | **Impact:** Medium

**Proposed Fix:** Each department's effectiveness scales inversely with how many departments are being invested in heavily:

```
Departments with >$5M investment this round: count them
If count >= 4: each department operates at 85% effectiveness
If count >= 5: each department operates at 75% effectiveness
If count <= 2: focused departments operate at 110% effectiveness (specialist bonus)
```

This means a balanced team's $5M R&D budget produces like $3.75M, while an R&D specialist's $15M budget effectively produces like $16.5M. The gap between "adequate" and "focused" becomes meaningful.

**Same stacking warning as Fix 9.1 — only add if other generalist nerfs are insufficient.**

**File:** Each module's `processDecisions` → apply effectiveness multiplier

---

## Section 10: Player Interaction & Counter-Strategy Fixes

Currently each team operates in a vacuum. Strategies don't interact, so there's no metagame.

---

### Fix 10.1 — Emergent Market Externalities

> **Priority:** 🟡 MEDIUM | **Effort:** Medium | **Impact:** High

**Proposed Fix:** When teams compete in the same segment, their strategies should directly affect each other through **emergent mechanics** (not hard-coded bonuses):

- **Volume flooding** (any team with >35% share in Budget): Reduces average selling price in Budget by 10%, hurting all Budget competitors' margins. This naturally counters cost-cutters (who can't match volume's scale) while being countered by premium players (who aren't in Budget).
- **Premium pull-up**: If any team has a product with quality >90, quality expectations in that segment rise by 5 (on top of the natural rise per round). This forces everyone to invest more in quality or lose share — naturally benefiting R&D-focused teams and hurting volume players who ignored quality.
- **Brand saturation**: If total marketing spend across all teams in a segment exceeds 3x the segment's revenue, marketing effectiveness drops 50% for everyone (ad fatigue). First-mover advantage in marketing matters. This naturally disadvantages late-comers to brand strategy.
- **R&D disruption externality**: When a breakthrough occurs (Fix 3.2), ALL products in that segment lose 5 quality points as the market redefines "good." This naturally makes R&D counter premium — premium's quality lead shrinks when innovation resets the bar.

**Why emergent, not hard-coded:** Students should discover that "when my competitor dumps cheap phones into Budget, it lowers prices for everyone" by experiencing it, not by reading a counter-strategy matrix. The learning happens when a student team says "wait, why did our Budget margins drop?" and realizes it's because another team flooded the market. That's real business intuition you can't get from a tooltip.

**File:** `MarketSimulator.ts` → pre-scoring adjustments based on competitive actions

---

### Fix 10.2 — ~~Hard-Coded Counter-Strategy Bonuses~~ REMOVED

> **Status:** ❌ REMOVED from fix list

**Original proposal:** Flat percentage bonuses when specific strategies face each other (+15% R&D vs Premium, +10% Brand vs Volume, etc.).

**Why removed:** Hard-coded bonuses feel arbitrary to students. A team running premium strategy seeing "-15% because opponent is R&D" with no in-game explanation undermines trust in the simulation. Counter-dynamics should emerge from the mechanics in Fix 10.1 instead.

---

## Section 11: Temporal Balance Fixes (Early/Mid/Late Game)

---

### Fix 11.1 — Rising Quality Expectations Should Punish Underinvestment Harder

> **Priority:** 🟡 MEDIUM | **Effort:** Trivial | **Impact:** Medium

**Current:** Quality expectations rise +0.02/round (basically nothing — 2% over an entire game on a 0–100 scale).

**Proposed:** Quality expectations rise **+1.5 points/round** (on a 0–100 scale). By round 8, expectations are 10.5 points higher than at start. Teams that don't invest in quality gradually lose competitiveness in premium segments while remaining viable in budget segments.

```
Round 1 expectations: Budget=50, General=65, Enthusiast=80, Professional=90
Round 8 expectations: Budget=60.5, General=75.5, Enthusiast=90.5, Professional=100.5
```

**Why +1.5 and not +3:** At +3/round, Enthusiast expectations hit 101 by round 8 — literally impossible to meet on a 0–100 quality scale. At +1.5/round, round-8 Enthusiast expectations (90.5) are reachable with sustained quality investment but impossible without it. Professional at 100.5 is very tight — only R&D-focused or premium teams with active product improvements will keep up.

**File:** `MarketSimulator.ts` → quality expectation evolution

---

### Fix 11.2 — Add Product Obsolescence

> **Priority:** 🟢 LOW | **Effort:** Medium | **Impact:** Medium

**Proposed Fix:** Products lose 2–3 quality points per round if not improved.

```
Product quality decay: -2.5 quality per round without improvement investment
Product features decay: -2 features per round without improvement investment
```

This forces all teams to continuously invest in products, draining cash from non-R&D strategies. R&D-focused teams naturally counter this through their ongoing investment.

**File:** `RDModule.ts` → product aging in round processing

---

## Section 12: Formula-Level Bug Fixes

---

### Fix 12.1 — Brand Score Uses sqrt() But Others Don't

> **Priority:** 🟡 MEDIUM | **Effort:** Trivial | **Impact:** Medium

Brand is the only dimension with sqrt diminishing returns baked into the scoring. This double-penalizes brand (once by growth cap, again by sqrt scoring).

**Proposed Fix:** Remove sqrt from brand scoring:
```
Brand Score = brandValue × brandWeight
```

**File:** `MarketSimulator.ts` → brand score calculation

---

### Fix 12.2 — ESG Penalty Tier Is Disconnected From Starting Score

> **Priority:** 🟢 LOW | **Effort:** Trivial | **Impact:** Low

**Proposed Fix:** ESG decays 20 points/round without investment (parallels brand decay).

**File:** `FactoryModule.ts` or `ESGModule.ts` → ESG initialization and decay

---

### Fix 12.3 — Financial Statement Approximations

> **Priority:** 🟢 LOW | **Effort:** Low | **Impact:** Low (gameplay), Medium (realism)

Calculate actual COGS from production costs, actual opex from module costs instead of approximations (60% COGS, netIncome × 1.2 operating margin).

**File:** `FinancialStatementsEngine.ts`

---

## Section 13: Implementation Roadmap

### Phase 1: Critical Fixes (Target: Break Balanced Dominance)

| # | Fix | Effort | Expected Impact |
|---|-----|--------|----------------|
| 0.0 | Verify RNG variance across seeds | 1–2 hours | Blocking — confirms tuning can work |
| 1.1 | Softmax temperature 10 → 5 | 10 min | Segment dominance matters |
| 1.2 | Sharpen segment weights | 30 min | Specialists score higher in their segments |
| 2.1 | Brand decay 6.5% → 2.5% | 10 min | Brand strategy becomes viable |
| 3.1 | Patent threshold 500 → 200, boost rewards | 20 min | R&D strategy becomes viable |
| 4.1 | Automation affects total unit cost (-35%) | 30 min | Automation strategy becomes viable |

**Estimated total: 4–6 hours** (includes Monte Carlo run + analysis + tuning loop)

**Phase 1 Monte Carlo checklist:**
- [ ] Run at default starting cash ($200M) — is balanced still above 60%?
- [ ] Run at $100M, $150M starting cash — does brand still dominate at low cash?
- [ ] Check snowball rate — is it above 50%?
- [ ] Verify different seeds produce different winners
- [ ] Check if any strategy is now *too* strong (overcorrection)

### Phase 2: Strategy Viability (Target: All 7 Strategies Can Win)

| # | Fix | Effort |
|---|-----|--------|
| 1.3 | Production line dedication / segment entry costs | 4–6 hours |
| 2.4 | Brand-at-low-cash fix (if needed after Phase 1 MC) | 2–3 hours |
| 3.2 | R&D breakthrough mechanic | 3–4 hours |
| 5.1 | Volume demand expansion | 2–3 hours |
| 6.1 | Bankruptcy mechanic + cash crunch events | 4–6 hours |
| 7.1 | Strengthen rubber-banding | 1–2 hours |

**Estimated total: 17–24 hours | Run Monte Carlo after to validate**

### Phase 3: Dynamic Gameplay (Target: No Solved Metagame)

| # | Fix | Effort |
|---|-----|--------|
| 8.1 | Market regime system | 8–12 hours |
| 9.1 | Complexity overhead cost **(conditional)** | 2–3 hours |
| 1.4 | Victory point system | 4–6 hours |
| 10.1 | Emergent market externalities | 4–6 hours |
| 11.1 | Quality expectations +1.5/round | 30 min |

**Estimated total: 19–28 hours | Run Monte Carlo after to validate**

### Phase 4: Polish & Depth

| # | Fix | Effort |
|---|-----|--------|
| 2.2 | Brand compounding / critical mass | 3–4 hours |
| 4.2 | Price war dominance for automation | 1–2 hours |
| 5.2 | Scale economies | 1–2 hours |
| 6.2 | Cash reserve benefits | 1–2 hours |
| 7.2 | Diminishing returns on market leadership | 2–3 hours |
| 8.2 | Increase economic variance | 1 hour |
| 9.2 | Execution efficiency penalty (conditional) | 2–3 hours |
| 11.2 | Product obsolescence | 2–3 hours |
| 12.1–12.3 | Formula bug fixes | 2–3 hours |

**Estimated total: 16–24 hours**

---

## Section 14: Validation Criteria

After each phase, run Monte Carlo (1,000+ games) and check:

| Metric | Phase 1 Target | Phase 2 Target | Phase 3 Target | Final Target |
|--------|---------------|----------------|----------------|-------------|
| Max win rate (any strategy) | < 60% | < 40% | < 25% | < 20% |
| Min viable strategies | ≥ 3 | ≥ 5 | ≥ 7 | 7 |
| Snowball risk | < 60% | < 45% | < 30% | < 25% |
| Revenue spread | > 1.3x | > 1.5x | > 2.0x | 1.5–3.0x |
| Close games rate | > 30% | > 40% | > 50% | > 50% |
| Bankruptcy rate | 0–2% | 2–5% | 3–8% | 3–8% |
| Balance score | > 30 | > 50 | > 70 | > 75 |

**Additional Phase 1 checks:**
| Check | Pass Criteria |
|-------|---------------|
| RNG variance | Different seeds produce ≥ 3 different winners across 10 runs |
| Starting cash sensitivity | No strategy dominates > 70% at any cash level ($100M–$500M) |
| Snowball vs. temperature | Snowball rate < 50% at chosen temperature |

---

## Appendix: Change Log from Review

| # | Reviewer Concern | Original | Updated |
|---|-----------------|----------|---------|
| 1 | Fix 1.1 + 7.1 snowball tension | T=4, no tension noted | T=5 starting point, explicit snowball tension warning |
| 2 | Fix 7.1 complacency penalty feels unfair | -10% quality for leaders | Removed — punishes students for playing well |
| 3 | Fix 11.1 quality rise too aggressive | +3 quality/round | +1.5/round — keeps Enthusiast reachable at 90.5 |
| 4 | Fix 9.1 + 1.3 stacking risk | Both in roadmap, no warning | Explicit stacking warning; implement 1.3 first, MC gate |
| 5 | Fix 10.2 should be emergent | +15%/+10% flat bonuses | Removed — replaced with emergent mechanics in Fix 10.1 |
| 6 | Brand-at-low-cash anomaly | Missing | New Fix 2.4 added |
| 7 | Phase 1 time estimate too optimistic | 2 hours | 4–6 hours including MC validation loop |
| 8 | RNG variance not verified | Not checked | New Fix 0.0 added as blocking prerequisite |
| 9 | Real students context missing | Not mentioned | Design Philosophy section added throughout |
| 10 | Fix 6.1 cash drain range too wide | $30-80M flat | Scaled to company size: max($20M, revenue × 0.25) |

---

*Document generated from analysis of v3.0.0 engine source code, Monte Carlo results (2,000+ games), Design Bible v3.0.0, and reviewer feedback (2026-02-08).*
