# SIMSIM Preset Analysis — Current vs Capsim/BSG Logic

## Current Presets

| Setting | Quick (16r) | Standard (24r) | Full (32r) |
|---------|------------|---------------|------------|
| Cash | $175M | $175M | $175M |
| Workers | 50 | 20 | 0 |
| Engineers | 8 | 4 | 0 |
| Supervisors | 5 | 2 | 0 |
| Machines | Yes | Yes | No |
| Products | All 5 segments | 2 segments | None |
| Brand | 0.5 | 0.3 | 0.0 |
| Segments | 5 | 2 | 0 |
| Capacity/line | 200K | 200K | 200K |

## Issues Found

### Issue 1: Full Simulation (32 rounds) — UNPLAYABLE START
**Problem:** 0 workers, 0 engineers, 0 products, no machines, no brand. Team has $175M cash but NOTHING to produce or sell. First several rounds produce $0 revenue — teams just bleed overhead costs.

**Capsim never does this.** Even their most basic mode gives you a running company. Building from zero is frustrating, not educational.

**BSG never does this.** You always start with an operational business.

**Fix:** Full should start with a SMALL operation (10 workers, 2 engineers, 1 segment), not empty. The extra rounds are for expanding into new segments, not building from nothing.

### Issue 2: Cash is Identical ($175M) Across All Modes
**Problem:** Quick (16 rounds) and Full (32 rounds) both get $175M. But Full needs to BUILD everything from scratch — factory, hire workers, develop products. $175M for 32 rounds of spending is much tighter than $175M for 16 rounds of an established company.

**Capsim:** Adjusts starting cash based on what you need to do. More complex scenarios get more resources.

**Fix:** Full should get MORE starting cash ($250M+) to account for build-from-scratch costs, OR less cash but with credit lines.

### Issue 3: Worker Count Too Low for Standard
**Problem:** Standard has 20 workers with 200K capacity per line across 2 segments. Worker output is 100 units/worker, so 20 workers = 2,000 units. But demand per segment is 450K (General) + 700K (Budget) = 1.15M total. The team can produce ~2,000 units against 1.15M demand = 0.2% utilization.

**Capsim:** Workers are sized to produce at ~80% of demand initially.

**Fix:** Standard needs ~100-150 workers to produce meaningful output. Or capacity should be worker-driven, not line-driven.

### Issue 4: Quick Has Too Many Segments for 16 Rounds
**Problem:** 5 segments × 16 rounds = players must manage ALL segments immediately. No time to learn, no room to expand strategically.

**Capsim:** Starts with 5 segments but each has ONE product — expansion is about improving existing products, not learning 5 new segments at once.

**BSG:** Starts in all regions but strategy is about WHERE to focus, not whether to participate.

**This one is actually OK** if the tutorial is good. Quick is for experienced players.

### Issue 5: Brand Value Scale (0-1) Too Compressed
**Problem:** Quick starts at 0.5, Standard at 0.3. The difference is 0.2 on a 0-1 scale. Brand takes many rounds to build but decays at 4%/round. Starting at 0.3 vs 0.5 means Standard teams need ~5 extra rounds just to reach Quick's starting brand.

**Fix:** Standard should start at 0.4 (closer to Quick). The 24 rounds should be for GROWING brand, not catching up.

---

## Recommended Preset Redesign

Based on Capsim/BSG patterns:

| Setting | Quick (16r) | Standard (24r) | Full (32r) |
|---------|------------|---------------|------------|
| **Cash** | $175M | $200M | $250M |
| **Workers** | 100 | 60 | 20 |
| **Engineers** | 12 | 8 | 4 |
| **Supervisors** | 8 | 5 | 2 |
| **Machines** | Yes (5 lines) | Yes (2 lines) | Yes (1 line) |
| **Products** | All 5 segments | 2 segments (General + Budget) | 1 segment (General) |
| **Brand** | 0.5 (established) | 0.4 (emerging) | 0.2 (startup) |
| **Segments** | 5 | 2 | 1 |
| **Capacity/line** | 200K | 200K | 200K |
| **Tutorial** | None / tooltips | Guided first 3 rounds | Full walkthrough 5+ rounds |

### Key Changes:
1. **Full now starts with a SMALL company** (1 segment, 20 workers, 1 line) — not empty
2. **Cash scales with difficulty** ($175M → $200M → $250M)
3. **Workers match production needs** (Quick: 100 for 5 lines, Standard: 60 for 2 lines)
4. **Brand progression makes sense** (0.5 → 0.4 → 0.2, not 0.5 → 0.3 → 0.0)
5. **Nobody starts from zero** — that's not fun or educational

### The Capsim Rule:
> "Every team should be profitable in round 1 without making any decisions. The simulation teaches through OPTIMIZATION, not SURVIVAL."

The current Full preset violates this — teams start with zero revenue and must figure out how to build a company before they can learn strategy.
