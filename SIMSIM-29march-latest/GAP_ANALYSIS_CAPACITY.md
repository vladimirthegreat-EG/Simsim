# SIMSIM Capacity Gap Analysis — vs Capsim/BSG

## The Current Gap

```
WHAT THE ENGINE HAS:
  ✅ machineryStates with machines (capacity, status, condition)
  ✅ Production lines with segment assignment
  ✅ Worker staffing ratios (WORKERS_PER_MACHINE)
  ✅ Factory efficiency and defect rates
  ✅ autoAssignMachinesToLines (round-robin)
  ✅ Machine purchase decisions (machineryDecisions)

WHAT'S BROKEN:
  ❌ Bottleneck analysis returns NaN (missing fields: assignedWorkers, targetOutput)
  ❌ Legacy capacity path treats ALL machines as available for ANY segment
  ❌ starterMachines flag was defined but never wired (FIXED this session)
  ❌ No concept of "buy capacity FOR a specific segment"
  ❌ No overtime/2nd shift option
  ❌ No "sell capacity" option
  ❌ Machine purchase doesn't specify which segment/line it's for
```

## How Capsim Does It

```
CAPSIM CAPACITY MODEL:
━━━━━━━━━━━━━━━━━━━━━

Each product has DEDICATED capacity. No sharing between products.

  Product: "Able" (Low Tech segment)
  ├── Capacity: 1,800 units (you bought this)
  ├── 1st Shift: 1,800 × 100% = 1,800 units (base)
  ├── 2nd Shift: 1,800 × 50%  = +900 units (overtime, 50% more expensive)
  ├── Automation: Level 4.0 → reduces labor cost $2.40/unit → $1.80/unit
  └── Workers: sized to capacity × automation level

STRATEGIC DECISIONS:
  1. BUY capacity: +$6 per unit of new capacity ($6M for 1,000 units)
     Takes 1 round to build. Plan ahead!
  2. SELL capacity: get $0.65 per unit back (lose money — forces commitment)
  3. AUTOMATE: costs $4 per 0.5 automation points
     - Higher automation = fewer workers needed = lower labor cost
     - BUT higher upfront capital investment
  4. 2ND SHIFT: no investment needed, just higher labor cost
     - Useful for short-term demand spikes
     - Not sustainable (worker fatigue, quality drops)

RESULT: Players must PLAN capacity 1-2 rounds ahead.
"Should I build for future demand or run overtime now?"
```

## How BSG Does It

```
BSG CAPACITY MODEL:
━━━━━━━━━━━━━━━━━━

Plants produce ALL models. Capacity = total plant capacity.
Allocation is by % of capacity to each model.

  Plant: "North America" (4M pairs/year capacity)
  ├── Branded allocation: 60% → 2.4M pairs
  ├── Private label: 25% → 1.0M pairs
  └── Internet only: 15% → 0.6M pairs

STRATEGIC DECISIONS:
  1. BUILD new plant: $50-100M, takes 1 year. Regional advantage.
  2. UPGRADE existing: $10-30M for +1M capacity. Faster than new build.
  3. ALLOCATE %: shift production between branded/private label
  4. OVERTIME: +20% output at +50% cost per unit
  5. CLOSE plant: save fixed costs but lose capacity permanently

RESULT: Players manage a PORTFOLIO of plants across regions.
"Which region to build in? Branded vs private label allocation?"
```

## What SIMSIM Should Do (Hybrid Capsim/BSG)

```
SIMSIM PROPOSED CAPACITY MODEL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Like Capsim: machines are segment-specific (via production line assignment)
Like BSG: one factory with multiple lines (not one factory per product)

  Factory: "Main Factory"
  ├── Line 1 (General): 3 machines × 50K = 150K raw capacity
  │   ├── Workers: 9 (3 × 2.75)
  │   ├── Efficiency: 0.7
  │   └── Output: 150K × 0.7 × 0.94 = 98,700 units
  │
  ├── Line 2 (Budget): 5 machines × 50K = 250K raw capacity
  │   ├── Workers: 14 (5 × 2.75)
  │   ├── Efficiency: 0.7
  │   └── Output: 250K × 0.7 × 0.94 = 164,500 units
  │
  └── Line 3 (Enthusiast): 1 machine × 50K = 50K raw capacity
      ├── Workers: 3 (1 × 2.75)
      ├── Efficiency: 0.7
      └── Output: 50K × 0.7 × 0.94 = 32,900 units

STRATEGIC DECISIONS PLAYERS CAN MAKE:
  1. BUY MACHINES for a specific line/segment
     - "Add 2 machines to Budget line" → +100K capacity
     - Cost: machine cost (from MACHINERY_COSTS constant)
     - Takes effect next round (like Capsim's 1-round build time)

  2. HIRE WORKERS to staff new machines
     - No point buying machines without workers to run them
     - Creates: "build machines now, hire next round" planning

  3. INVEST IN EFFICIENCY
     - Factory efficiency 0.7 → 0.85 → 0.95 with investment
     - Applies to ALL lines in the factory
     - Like Capsim's automation — reduces cost, increases output

  4. OPEN NEW PRODUCTION LINE (expand into new segment)
     - Need: product in that segment (from R&D)
     - Need: machines for the new line
     - Need: workers to staff it
     - Creates: "develop product first, THEN build capacity" sequence

  5. UPGRADE MACHINES (future feature)
     - Replace old machines with better ones
     - Higher capacity per machine, lower defect rate

KEY TRADE-OFFS THIS CREATES:
  ✅ "Invest in Budget capacity (high volume, low margin) or Professional (low volume, high margin)?"
  ✅ "Build capacity now for demand I expect in 3 rounds, or run lean?"
  ✅ "Hire more workers (operating cost) or buy automation (capital cost)?"
  ✅ "Spread machines across 5 segments thin, or concentrate on 2 segments deep?"
  ✅ "My General line is maxed out — buy machines or improve efficiency?"
```

## Gap Summary

| Feature | Capsim | BSG | SIMSIM Current | SIMSIM Needed |
|---------|--------|-----|---------------|---------------|
| Segment-specific capacity | ✅ Per product | ✅ Via % allocation | ❌ All machines = all segments | ✅ FIXED: per-line machine counting |
| Buy capacity | ✅ $ per unit | ✅ Build plants | ✅ machineryDecisions exists | ✅ Already works — just wire to specific lines |
| Sell capacity | ✅ At loss | ✅ Close plant | ❌ Not implemented | 🔧 Post-launch |
| Overtime/2nd shift | ✅ +50% at cost | ✅ +20% at cost | ❌ Not implemented | 🔧 Post-launch |
| Automation | ✅ Reduces workers | ❌ N/A | ✅ Factory upgrades exist | ✅ Already works |
| Capacity planning lag | ✅ 1 round build | ✅ 1 year build | ❌ Instant | 🔧 Post-launch |
| Worker staffing | ✅ Required for shifts | ✅ Affects productivity | ✅ WORKERS_PER_MACHINE | ✅ Already works |
| Starting capacity | ✅ ~1.2× demand | ✅ Established | ❌ Was 0 (no machines) | ✅ FIXED: demand-scaled starters |
