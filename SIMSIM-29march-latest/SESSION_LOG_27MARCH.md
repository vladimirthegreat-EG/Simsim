# SIMSIM — Session Log 27 March 2026

## Goals
- Port 14 HR overhaul fixes from Downloads audit into 26MARCH engine
- Port 4 factory fixes from 25MARCH (construction delay, defect floor, automation cap, MIN capacity)
- Fix HR page crash (temporal dead zone — state used before declaration)
- Full factory module deep-dive audit
- Factory UX overhaul (pedagogy: stop spoon-feeding, add depth)
- Investigate machine/upgrade/demand/capacity balance

---

## Work Log

| Time | Action | Details | Files Changed |
|------|--------|---------|---------------|
| Start | Fixed HR page crash | useEffect referenced `state?.employees` before `state` was declared (temporal dead zone). Moved useEffect after useMemo declaration. | hr/page.tsx |
| +10m | Ported 14 HR overhaul fixes | Fix #1: Benefits morale+turnover wired. Fix #2: Firing survivor penalties. Fix #3: Burnout→output. Fix #4: Per-person training costs + program stats. Fix #5: Stamina/discipline/health wired. Fix #6: Training fatigue softened (1→2, 30%→15%). Fix #7: Salary diminishing returns. Fix #8: IncomeStatement actual salaries. Fix #9: Worker accuracy→defects. Fix #10: Supervisor leadership. Fix #11: Loyalty responds to decisions. Fix #12: At A Glance dashboard. Fix #13: Free search per tier. Fix #15: Dynamic staffing thresholds. | HRModule.ts, index.ts, FactoryModule.ts, SimulationEngine.ts, IncomeStatement.ts, OverviewTab.tsx, HireFireTab.tsx, hr/page.tsx |
| +30m | Ported 4 factory fixes from 25MARCH | 1) 1-round construction delay. 2) Defect rate 0.5% floor. 3) Automation multiplier cap 1.50x. 4) Capacity = MIN(workers, machines). | FactoryModule.ts, SimulationEngine.ts |
| +45m | Factory deep-dive audit | Full audit of production formula, line system, machine mechanics, worker allocation, capacity vs demand, supply chain integration, Capsim/BSG comparison. | Analysis only |
| +60m | Pedagogical audit | Identified 8 items SIMSIM over-teaches (bottleneck labels, health %, staffing ratios). Identified 5 missing items. Identified 6 depth mechanics. | Analysis only |
| +70m | Fix 1: Wire production line decisions | Replaced TODO console.logs with real decision store integration (setLineTargets, setLineProductAssignments, staffing decisions). | factory/page.tsx |
| +75m | Fix 2: Restore Output tab | Added Output tab back to navigation with full prop wiring. Cost bar, demand comparison, allocation sliders now accessible. | factory/page.tsx |
| +80m | Fix 3: Continuous improvement | Added per-round +1% efficiency increment (capped +10%) for factories with continuousImprovement upgrade. Was set to 0 and never incremented. | FactoryModule.ts |
| +85m | Fix 4-8: UX tone-down | StatusTab: Replaced Equipment Health/Breakdown Risk/Burnout Risk/Utilization stat cards with Efficiency/Defect Rate/Workers/CO2. Replaced prescriptive "Recommendations" with incident-based "Factory Events" (only reports actual breakdowns, not risk predictions). | StatusTab.tsx |
| +90m | Fix 13: New hire ramp-up | Workers hired in last 2 rounds produce at 70% output. Added `roundsSinceHire` parameter to calculateWorkerOutput(). | HRModule.ts |
| +95m | Fix 15: Stress cliff visibility | Updated bottleneck display to show actual effective output % (including 0.85 stress multiplier below 80% staffing). Shows "15/17 workers — 63% effective output" instead of "output reduced". | ProductionLinesTab.tsx |

## HR Fixes Applied (14 total — skipped #14 Executive tier, #16 Cash display)
- All engine fixes: HRModule.ts, types/index.ts, FactoryModule.ts, SimulationEngine.ts, IncomeStatement.ts
- All UI fixes: OverviewTab.tsx, HireFireTab.tsx, hr/page.tsx
- Type-check: 0 new errors in modified files

## Factory Fixes Applied (4 total — from 25MARCH delta)
- Construction delay, defect floor, automation cap, MIN(workers,machines) capacity
- Type-check: 0 new errors

## Factory UX Overhaul — 15 Fixes

### Must-Fix (Done)
1. Wire production line decisions — factory/page.tsx
2. Restore Output tab to navigation — factory/page.tsx
3. Fix continuous improvement increment — FactoryModule.ts

### UX Tone-Down (Done)
4-8. StatusTab: Replaced health/risk/burnout/utilization with efficiency/defect/workers/CO2. Replaced recommendations with incident-based events.

### Missing Decision Info (Done)
9. Demand vs output summary in ProductionLinesTab — shows market demand, your output, gap
10. Per-line profitability — shows ~$X margin per active line
11. Material status indicator — green/amber dot per line
14. Maintenance budget — removed prescriptive "−X% risk" label, now just describes the trade-off

### Depth Mechanics (Done)
13. New hire ramp-up — 70% output for 2 rounds after hire (HRModule.ts)
15. Stress cliff visibility — shows actual effective output % including 0.85 stress multiplier

### Remaining
- Fix 12 (Historical trend chart) — deferred to next session (needs round history data)
- Machine-per-line buying mechanics investigation
- Factory upgrades balance audit
- Capacity vs demand vs teams vs rounds analysis

---
