# Balance Tuning Log

## Current Best: v4.0.6 (Fano Sweep) — 100/100, 7/7 viable

### Parameters
| Parameter | Value | File |
|-----------|-------|------|
| BRAND_DECAY_RATE | 0.020 | `src/engine/types/index.ts` |
| SOFTMAX_TEMPERATURE | 4 | `src/engine/types/index.ts` |
| BRAND_MAX_GROWTH_PER_ROUND | 0.06 | `src/engine/types/index.ts` |
| QUALITY_FEATURE_BONUS_CAP | 1.2 | `src/engine/types/index.ts` |
| BRAND_CRITICAL_MASS_HIGH | 0.55 | `src/engine/types/index.ts` |
| BRAND_HIGH_MULTIPLIER | 1.1 | `src/engine/types/index.ts` |
| BRAND_CRITICAL_MASS_LOW | 0.3 | `src/engine/types/index.ts` |
| BRAND_LOW_MULTIPLIER | 0.9 | `src/engine/types/index.ts` |
| FLEXIBILITY_BONUS_FULL | 0.04 | `src/engine/types/index.ts` |
| Active Lifestyle brand weight | 10 | `src/engine/types/index.ts` SEGMENT_WEIGHTS |
| Active Lifestyle quality weight | 34 | `src/engine/types/index.ts` SEGMENT_WEIGHTS |

### Win Rates
```
rd-focused:  27%  ████████████████████████████
premium:     16%  ████████████████
cost-cutter: 15%  ███████████████
balanced:    14%  ██████████████
automation:  14%  ██████████████
brand:        9%  █████████
volume:       6%  ██████
```

### Matchup Design (Fano Plane Complement)
Every pair of strategies meets exactly 2 times. No structural bias.
```
1. [brand,    balanced,   rd-focused, cost-cutter]
2. [volume,   automation, rd-focused, cost-cutter]
3. [volume,   premium,    balanced,   cost-cutter]
4. [volume,   premium,    brand,      rd-focused ]
5. [premium,  brand,      automation, cost-cutter]
6. [volume,   brand,      automation, balanced   ]
7. [premium,  automation, balanced,   rd-focused ]
```

---

## Version History

### v4.0.6 — Fano Plane + Premium Fix (CURRENT)
- **Score**: 100/100, 7/7 viable
- **Changes**: Fano plane matchup design, premium bot (competitive pricing + ESG)
- **Params**: decay=0.020, T=4, ALB=10
- **Win rates**: rd:27% pre:16% cos:15% bal:14% aut:14% bra:9% vol:6%

### v4.0.6 — Pre-Fano (7 matchups, ad-hoc)
- **Score**: 100/100, 7/7 viable (but skewed)
- **Params**: decay=0.040, T=5, ALB=14
- **Win rates**: vol:29% rd:27% bra:17% pre:9% bal:9% cos:5% aut:4%
- **Problem**: Unbalanced matchups — automation faced rd-focused 3/4 times

### v4.0.5 — 7 Matchups + Bot Fixes
- **Score**: 100/100, 5/7 viable
- **Params**: decay=0.035, T=3, ALB=16
- **Win rates**: bra:29% rd:29% vol:14% bal:14% aut:14% (pre:0% cos:0%)
- **Problem**: Premium and cost-cutter non-viable

### v4.0.2 — Conservative Engine Changes
- **Score**: 89/100, 4/7 viable
- **Changes**: Brand critical mass, quality cap, flex bonus, R&D diminishing returns
- **Win rates**: vol:25% bal:25% aut:25% rd:25% (bra:0% pre:0% cos:0%)

### v4.0.0 — Structural Fixes
- **Score**: 76/100, 5/7 viable
- **Changes**: R&D budget fix, pricing decisions, promotions fix
- **Win rates**: rd:50% pre:24% cos:19% aut:6% vol:1% (bra:0% bal:0%)

### Baseline (pre-v4)
- **Score**: 25/100, 2/7 viable
- **Win rates**: bra + bal only (broken engine — no pricing, wasted R&D budget)

---

## Key Engine Mechanics

### R&D Diminishing Returns (`RDModule.ts`)
| Quality Level | Cost Per Point |
|---------------|---------------|
| < 70 | $1.0M |
| 70-79 | $1.5M |
| 80-89 | $2.5M |
| 90+ | $5.0M |
Features: half of above costs.

### Brand Critical Mass (`MarketSimulator.ts`)
- brandValue > 0.55 → 1.1x brand score
- brandValue < 0.30 → 0.9x brand score

### Flexibility Bonus (`MarketSimulator.ts`)
4 criteria: rdBudget >= $3M, brandValue >= 0.45, efficiency >= 0.70, 4+ products Q>=55
- 4/4 met → +4% total score
- 3/4 met → +1.5% total score

### Segment Weights
```
Budget:           price:65  quality:15  brand: 5  esg: 5  features:10
General:          price:28  quality:23  brand:17  esg:10  features:22
Enthusiast:       price:12  quality:30  brand: 8  esg: 5  features:45
Professional:     price: 8  quality:48  brand: 7  esg:20  features:17
Active Lifestyle: price:20  quality:34  brand:10  esg:10  features:26
```

---

## Strategy Bot Summaries

| Strategy | Pricing | R&D Budget | Key Moves |
|----------|---------|-----------|-----------|
| Volume | Budget $170, General $390, Active $530 | $3M | Low prices in high-demand segments |
| Premium | Pro $1200, Ent $780, Active $580 | $8M | Below-default pricing + quality focus + $1.5M ESG |
| Brand | General $410, Active $550 | $4M | $8M branding + $16M advertising + multi-product R&D |
| Automation | Budget $165, General $380, Active $520 (post-auto) | $4M | Buy $75M automation upgrade rounds 1-3, then undercut |
| Balanced | Default prices | $4M | Diversified investment, triggers flexibility bonus |
| R&D Focused | Ent $850, Pro $1350 | $15M | Max R&D across all products |
| Cost Cutter | Budget $145, General $350, Active $480 | $3M | Deepest price cuts + minimal overhead |

---

## Lessons Learned

1. **Matchup structure > parameter tuning** — The Fano plane fix had more impact than any parameter change
2. **Bot changes > engine changes** — Safer, more predictable, easier to diagnose
3. **Never combine multiple engine changes** — Impossible to attribute effects
4. **ESG + price undercut + branding = overcorrection** — Any combo of these on premium → 50%+ dominance
5. **Brand multiplier threshold matters** — 0.55 threshold too low means balanced also crosses it
6. **Quality cap (1.2x) essential** — Without it, R&D-focused dominates at 50%+
