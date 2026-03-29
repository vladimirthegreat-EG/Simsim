# SIMSIM Capacity Design — Capsim/BSG Comparison

## How Capsim Does It

```
CAPACITY CHAIN:
  Machine Capacity (you buy this)     → e.g. 1,800 units/day
  × Staffing (1st shift = 100%)       → 1,800 × 1.0 = 1,800
  × Overtime (optional, +50%, costly) → 1,800 × 1.5 = 2,700
  × Automation (investment reduces workers needed, increases output)
  = ACTUAL OUTPUT

Workers are a COST, not a capacity driver.
More workers = higher cost but same output (unless overtime).
Fewer workers = can't run machines = output drops.
```

**Capsim starting position:**
- Each product segment: ~1,200 units capacity vs ~1,000 units demand
- 20% excess capacity → teams can grow into it
- Workers sized exactly for 1st shift on all machines
- Profitable immediately (~$5-10M net income round 1)

## How BSG Does It

```
CAPACITY CHAIN:
  Plant Capacity (you build this)     → e.g. 6M pairs/year
  × Workforce Productivity            → base productivity + training
  × Quality/Defect Rate               → higher quality = lower defects
  = ACTUAL OUTPUT

Workers affect PRODUCTIVITY, not max capacity.
Plants set the ceiling. Workers determine how close you get to it.
```

## What SIMSIM Should Do

SIMSIM already has the right architecture — machines drive capacity, workers staff machines. The problem is just that starter machines weren't being created.

### Recommended Capacity Model

```
MACHINE CAPACITY (the ceiling)
  × WORKER STAFFING RATIO (workers available / workers needed)
  × FACTORY EFFICIENCY (0.7 base, improves with investment)
  × (1 - DEFECT RATE) (0.06 base, improves with quality investment)
  = ACTUAL OUTPUT per segment

WHERE:
  - Machine capacity = number of machines × capacity per machine
  - Workers needed = machines × WORKERS_PER_MACHINE (2.75)
  - If understaffed: output proportionally reduced
  - If overstaffed: no benefit (workers idle, cost wasted)
```

### Recommended Numbers

Based on Capsim's ~1.2× demand ratio:

**Market Demand (4 teams, equal share = 25% each):**
| Segment | Total Demand | Per Team (25%) | Target Capacity (1.2×) |
|---------|-------------|---------------|----------------------|
| Budget | 700,000 | 175,000 | 210,000 |
| General | 450,000 | 112,500 | 135,000 |
| Enthusiast | 150,000 | 37,500 | 45,000 |
| Professional | 80,000 | 20,000 | 24,000 |
| Active Lifestyle | 200,000 | 50,000 | 60,000 |

**Starting Machines (to hit ~1.2× demand per team):**

Option A — "Capsim style" (each segment gets machines):
| Segment | Target Cap | Machines Needed (@50K/machine) | Workers Needed |
|---------|-----------|-------------------------------|---------------|
| Budget | 210,000 | 4 machines | 11 workers |
| General | 135,000 | 3 machines | 8 workers |
| Enthusiast | 45,000 | 1 machine | 3 workers |
| Professional | 24,000 | 1 machine | 3 workers |
| Active Lifestyle | 60,000 | 2 machines | 6 workers |
| **TOTAL (5 seg)** | **474,000** | **11 machines** | **31 workers** |
| **TOTAL (2 seg)** | **345,000** | **7 machines** | **19 workers** |

This means:
- **Quick (5 segments):** 11 machines, ~31 workers, 8 engineers, 5 supervisors = 44 total staff
- **Standard (2 segments):** 7 machines, ~19 workers, 4 engineers, 2 supervisors = 25 total staff
- **Full (1 segment):** 3 machines, ~8 workers, 2 engineers, 1 supervisor = 11 total staff

### Should Workers or Machines Drive Capacity?

**MACHINES should drive capacity.** This matches Capsim/BSG and creates strategic decisions:

1. "Do I buy more machines to increase capacity?" (capital investment)
2. "Do I hire more workers to staff new machines?" (operating cost)
3. "Do I invest in automation to reduce workers needed?" (efficiency)
4. "Do I run overtime for extra output?" (short-term cost for short-term gain)

If WORKERS drive capacity, the strategy is just "hire more people" — boring and unrealistic.
If MACHINES drive capacity with workers as constraint, you get rich strategic trade-offs.

### Current SIMSIM Constants — Are They Right?

| Constant | Current | Capsim Equivalent | Recommendation |
|----------|---------|-------------------|----------------|
| BASE_WORKER_OUTPUT | 100 units | N/A (workers don't produce alone) | Keep as fallback only — machine capacity should dominate |
| WORKERS_PER_MACHINE | 2.75 | ~1-3 depending on automation | Good |
| DEFAULT_PRODUCT_CAPACITY | 50,000 | Varies by machine type | OK for line theoretical max |
| BASE_FACTORY_EFFICIENCY | 0.7 | ~0.5-0.8 depending on age | Good |
| Machine capacity | ~16K each (our fix) | ~1,000-2,000 units/day | Needs calibration to demand |

### The Key Number: Machine Capacity

Each starter machine should provide enough capacity for ~1.2× the per-team demand share:

For 4 teams in General segment:
- Demand: 450,000 / 4 = 112,500 per team
- Target: 112,500 × 1.2 = 135,000
- With 3 machines: 135,000 / 3 = 45,000 per machine
- After efficiency (0.7): needs 45,000 / 0.7 = ~64,000 raw capacity per machine

**Recommended: machine capacity = 50,000 raw units each**
- 3 machines × 50,000 × 0.7 efficiency × 0.94 defect = 98,700 actual output
- vs 112,500 demand = 88% utilization (slightly capacity constrained → room to grow)

This is close to the 50K DEFAULT_PRODUCT_CAPACITY which is already the line capacity. Makes sense.
