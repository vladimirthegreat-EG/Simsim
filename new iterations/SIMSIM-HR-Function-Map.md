# SIMSIM HR — Complete Function Map & Game Flow
## Every function, how they connect, and the player's decision flow

---

## GAME FLOW — WHAT HAPPENS EACH ROUND

```
ROUND START
│
├─ SimulationEngine resets per-round data
│   ├─ freeSearchUsed = {} (fresh searches)
│   └─ (training fatigue is per-role within round — no reset needed)
│
├─ PLAYER OPENS HR PAGE (4 tabs)
│   │
│   ├─ TAB 1: OVERVIEW (diagnosis)
│   │   ├─ Sees: Total Employees, Monthly Labor Cost, Avg Morale, Turnover Rate
│   │   ├─ Sees: Labor Cost Per Unit ($X.XX) + per-role breakdown
│   │   ├─ Sees: "This Round At A Glance" dashboard
│   │   ├─ Sees: Staffing requirements (dynamic, based on factory needs)
│   │   └─ Decides: "What needs attention?" → navigates to relevant tab
│   │
│   ├─ TAB 2: HIRE & FIRE (recruitment only — firing moved to Roster)
│   │   ├─ Step 1: Select role (Worker / Engineer / Supervisor)
│   │   ├─ Step 2: Select tier (Basic $5K / Premium $15K / Executive $50K)
│   │   │   └─ Shows: "1 free search remaining" or "Free used — next costs $X"
│   │   ├─ Step 3: Click "Search Candidates" → generates 4-8 candidates
│   │   │   └─ Engine call: HRModule.generateCandidates(role, tier, count, ctx)
│   │   ├─ Step 4: Review candidates (stats, salary, value score) → click "Hire"
│   │   └─ Pending Hires summary shows total cost
│   │
│   ├─ TAB 3: DEVELOP (training + salary + benefits)
│   │   ├─ Training: 4 programs to enroll (distinct stat effects)
│   │   ├─ Salary: Slider -20% to +20% with live Labor $/unit projection
│   │   ├─ Benefits: 7 sliders + 2 toggles (if enabled)
│   │   └─ Shows: Current Monthly Cost, Projected Cost, Projected Turnover
│   │
│   └─ TAB 4: ROSTER (firing hub)
│       ├─ Shows all employees with stats, morale, burnout, salary
│       ├─ "Terminate" button per employee
│       ├─ Pending Terminations summary with severance preview
│       └─ Decides: Who to fire (individual selection by name/stats)
│
├─ PLAYER SAVES DECISIONS
│   └─ DecisionSubmitBar → tRPC decision.submit → stores in DB
│
├─ ROUND PROCESSES (SimulationEngine.processRound)
│   │
│   ├─ Step 1: HRModule.process(state, decisions, ctx)
│   │   ├─ 1a. Calculate dynamic starting morale for new hires
│   │   ├─ 1b. Process hires (add employees, deduct hiring cost)
│   │   ├─ 1c. Process fires (remove employees, severance, survivor penalty)
│   │   ├─ 1d. Process training (per-person cost, per-role fatigue, distinct stats)
│   │   ├─ 1e. Process benefits (morale + turnover + loyalty + ESG)
│   │   ├─ 1f. Process salary changes (diminishing returns + loyalty)
│   │   ├─ 1g. Supervisor leadership → team morale (graduated penalty)
│   │   ├─ 1h. Burnout accumulation + recovery (stamina + executive resistance)
│   │   ├─ 1i. Process turnover (morale + loyalty + burnout + benefits)
│   │   ├─ 1j. Store severance cost for Finance
│   │   ├─ 1k. Update workforce summary (unified turnover formula)
│   │   └─ 1l. Deduct labor costs from cash
│   │
│   ├─ Step 2: Sync HR stats to factories
│   │   ├─ factory.avgWorkerAccuracy ← avg worker accuracy
│   │   ├─ factory.avgWorkerSpeed ← avg worker speed
│   │   ├─ factory.avgWorkerEfficiency ← avg worker efficiency
│   │   └─ factory.supervisorBoost ← avg calculateSupervisorBoost()
│   │
│   ├─ Step 3: Factory Module uses HR data
│   │   ├─ workerCapacity = workers × 100 × (efficiency/100) × (speed/100)
│   │   ├─ defectRate × (1.3 - accuracy/100 × 0.5)
│   │   └─ efficiency × supervisorBoost
│   │
│   ├─ Step 4: R&D Module uses engineer data
│   │   └─ rdPoints = 10 × (efficiency/100) × (speed/100) × (1+innovation/200) × (1-burnout/200)
│   │
│   ├─ Step 5: Finance Module uses HR costs
│   │   ├─ COGS: sum(worker.salary) as direct labor
│   │   ├─ OpEx: sum(engineer.salary) + sum(supervisor.salary)
│   │   ├─ OpEx: state.benefits.totalAnnualCost
│   │   └─ OpEx: state.lastRoundSeveranceCost
│   │
│   └─ Step 6: Market Simulator uses workforce health
│       └─ competitiveScore = morale × efficiency / 100 (10% of composite)
│
└─ ROUND END — state persisted, player sees results
```

---

## ALL HR FUNCTIONS — COMPLETE MAP

### HRModule.ts (14 functions)

#### 1. `process(state, decisions, ctx)` → Main Entry Point
- **Called by:** SimulationEngine.ts line ~422
- **Input:** TeamState, HRDecisions, EngineContext
- **Output:** `{ newState: TeamState, result: ModuleResult }`
- **Does:** Wraps `processInternal()` in try-catch
- **Calls:** `processInternal()`

#### 2. `processInternal(state, decisions, ctx)` → Core Processing Loop
- **Called by:** `process()`
- **Input:** Same as process()
- **Output:** Same as process()
- **Does:** Runs ALL HR logic in order (see processing steps below)
- **Calls:** (in order)
  1. `calculateSalary()` — for dynamic start morale calc
  2. Hiring loop — creates employees, deducts cost
  3. Firing loop — removes employees, tracks severance
  4. Training loop — `calculateTrainingEffectiveness()`, applies stats
  5. `processBenefitChanges()` — costs + morale + turnover
  6. Benefits morale application loop
  7. Salary multiplier loop — diminishing returns
  8. Supervisor leadership loop
  9. Burnout accumulation/recovery loop
  10. `processTurnover()` — random departure check
  11. `calculateWorkforceSummary()` — aggregate metrics
  12. `calculateLaborCost()` — deduct from cash

#### 3. `generateCandidates(role, tier, count, ctx)` → Recruitment
- **Called by:** UI (HireFireTab.tsx line 245) — NOT by engine
- **Input:** Role, tier (basic/premium/executive), count, EngineContext
- **Output:** Array of candidate objects (without id/hiredRound/factoryId)
- **Does:**
  - Gets stat range from CONSTANTS: Basic 55-100, Premium 80-115, Executive 95-140
  - Applies stat cap: Basic 100, Premium 105, Executive 120
  - Calculates salary via `calculateSalary()`
  - Executive perks: loyalty 85-95, burnoutResistance 0.2, trainingGainMultiplier 1.25
- **Calls:** `generateStats()`, `calculateSalary()`, `generateName()`

#### 4. `generateStats(role, minStat, maxStat, ctx)` → Random Stats
- **Called by:** `generateCandidates()`, `createEmployee()`
- **Input:** Role, stat range, EngineContext
- **Output:** EmployeeStats | EngineerStats | SupervisorStats
- **Does:**
  - 8 base stats: efficiency, accuracy, speed, stamina, discipline, loyalty, teamCompatibility, health
  - Engineers add: innovation, problemSolving
  - Supervisors add: leadership, tacticalPlanning
  - Each stat: `round(min + random × (max - min))`, capped at 100

#### 5. `calculateSalary(role, stats)` → Salary From Stats
- **Called by:** `generateCandidates()`, `createEmployee()`
- **Input:** Role, stats object
- **Output:** Number (annual salary)
- **Formula:** `baseSalary × (0.8 + avgStat/100 × 1.4)`, capped at $500K
- **Base salaries:** Worker $45K, Engineer $85K, Supervisor $75K

#### 6. `createEmployee(role, factoryId, defaultFactoryId, ctx)` → Fallback Hire
- **Called by:** `processInternal()` when no candidateData provided
- **Input:** Role, factory assignment, EngineContext
- **Output:** Complete Employee object
- **Does:** Generates basic-tier stats, calculates salary, assigns IDs
- **Note:** Morale overridden to `dynamicStartMorale` in processInternal after creation

#### 7. `generateName(ctx)` → Random Name
- **Called by:** `generateCandidates()`, `createEmployee()`
- **Output:** String (e.g., "Maria Chen")
- **Does:** Picks from 32 first names × 32 last names deterministically

#### 8. `calculateWorkerOutput(stats, burnout)` → Per-Worker Production
- **Called by:** Available for production pipeline (blended via calculateEmployeeValue)
- **Input:** EmployeeStats, burnout (0-100)
- **Output:** Number (units per round)
- **Formula:** `2000 × (efficiency/100) × (speed/100) × burnoutPenalty × disciplineBonus × healthFactor`
  - burnoutPenalty: `max(0.7, 1 - burnout/300)` → 0-30% reduction
  - disciplineBonus: `1 + discipline/1000` → 0-10% bonus
  - healthFactor: `0.85 + health/100 × 0.15` → 85-100% attendance

#### 9. `calculateEngineerRDOutput(stats)` → Per-Engineer R&D Points
- **Called by:** RDModule.calculateTotalRDOutput()
- **Input:** EngineerStats
- **Output:** Number (R&D points per round)
- **Formula:** `10 × (efficiency/100) × (speed/100) × (1 + innovation/200)`

#### 10. `calculateSupervisorBoost(stats, burnout)` → Leadership Multiplier
- **Called by:** SimulationEngine.ts line ~443 (synced to factory.supervisorBoost)
- **Input:** SupervisorStats, burnout
- **Output:** Number (1.0 to 1.2 multiplier)
- **Formula:** `(1.0 + leadership/500) × max(0.7, 1 - burnout/300)`

#### 11. `processTurnover(state, ctx)` → Random Departures
- **Called by:** `processInternal()`
- **Input:** TeamState, EngineContext
- **Output:** `{ newState, departed, messages }`
- **Formula per employee:**
  ```
  rate = 12.5%/12 (base monthly)
  + if morale < 50: +15%/12
  × (150 - loyalty) / 100
  + if burnout > 50: +10%/12
  × (1 - benefits.turnoverReduction)
  if random() < rate → employee leaves
  ```

#### 12. `calculateWorkforceSummary(employees, state?)` → Aggregate Metrics
- **Called by:** `processInternal()`
- **Input:** Employee array, optional TeamState (for benefits)
- **Output:** `{ totalHeadcount, averageMorale, averageEfficiency, laborCost, turnoverRate }`
- **Note:** Turnover formula now matches processTurnover exactly (includes burnout + benefits)

#### 13. `calculateLaborCost(employees)` → Total Salary Sum
- **Called by:** `processInternal()`
- **Output:** Number (annual total)

#### 14. `calculateEmployeeValue(stats)` → Composite Score
- **Called by:** SimulationEngine.ts line ~1060 (blended into workforce.averageEfficiency)
- **Weights:** efficiency 25%, accuracy 20%, speed 15%, stamina 10%, discipline 10%, loyalty 10%, teamCompat 10%
- **Used for:** Blending into workforce.averageEfficiency at 30% weight

#### 15. `calculateTrainingEffectiveness(employee, roleTrainingCount)` → Fatigue
- **Called by:** Training loop in `processInternal()`
- **Input:** Employee, how many times this ROLE has been trained this round
- **Output:** `{ effectiveness: 0.2-1.0, fatigueApplied: boolean }`
- **Formula:** Programs 1-2 = 100%. Program 3 = 85%. Program 4 = 70%. Floor 20%.

#### 16. `processBenefitChanges(state, changes)` → Benefits Costs & Impacts
- **Called by:** `processInternal()`
- **Input:** TeamState, partial BenefitsPackage changes
- **Output:** `{ newBenefits: CompanyBenefits, additionalCost, messages }`
- **Calculates:** totalAnnualCost, moraleImpact (cap 50%), turnoverReduction (cap 40%), esgContribution

#### 17. `getStatColor(value)` → UI Color
- **Called by:** UI components
- **Output:** Color string based on stat value (90+=purple, 80+=green, 70+=blue, 60+=yellow, <60=red)

#### 18. `getEmployeesByFactory(employees, factoryId)` → Factory Filter
- **Called by:** Various modules
- **Output:** `{ workers, engineers, supervisors }` filtered by factory

---

## PROCESSING ORDER INSIDE processInternal()

```
processInternal(state, decisions, ctx)
│
├─ 1. DYNAMIC START MORALE (lines 89-97)
│   Formula: max(50, min(90, round(companyAvg × 0.6 + 75 × 0.4)))
│   Used by: all new hires this round
│
├─ 2. PROCESS HIRES (lines 100-150)
│   For each hire:
│   ├─ Create employee from candidateData OR createEmployee() fallback
│   ├─ Set morale = dynamicStartMorale
│   ├─ hiringCost = salary × 0.15 × (1 - rubberBanding relief)
│   ├─ Check cash >= hiringCost
│   └─ Add to employees array, deduct cost
│
├─ 3. PROCESS FIRES (lines 152-190)
│   For each fire:
│   ├─ Find employee by real ID
│   ├─ severanceCost = salary / 12
│   ├─ Track totalSeveranceCost for Finance
│   ├─ Remove from array, deduct severance
│   └─ After all fires:
│       ├─ Survivor morale: -3 per fire (max -15)
│       ├─ Survivor loyalty: -4 same role, -2 others per fire
│       └─ Mass layoff (3+): additional -5 loyalty company-wide
│
├─ 4. PROCESS TRAINING (lines 192-273)
│   roleTrainingCount = {} (fresh per round)
│   For each program:
│   ├─ Increment roleTrainingCount[role]
│   ├─ Per-person cost: Basic $500, Advanced $2K, Leadership $5K, Safety $300
│   ├─ Check cash >= totalProgramCost
│   ├─ For each affected employee:
│   │   ├─ Calculate effectiveness (per-role fatigue: threshold 2, penalty 15%)
│   │   ├─ Base improvement: 5-10% × effectiveness × executiveMultiplier
│   │   ├─ Apply to targeted stats:
│   │   │   ├─ basic-skills → efficiency + speed
│   │   │   ├─ advanced-tech → efficiency + accuracy + innovation
│   │   │   ├─ leadership → leadership
│   │   │   └─ safety → health
│   │   ├─ Morale: leadership/safety give +5
│   │   ├─ Burnout: safety gives -10
│   │   └─ Loyalty: +1.5 per program
│   └─ Deduct total cost
│
├─ 5. PROCESS BENEFITS (lines 276-300)
│   ├─ processBenefitChanges() → new package, cost, moraleImpact, turnoverReduction
│   ├─ Apply moraleImpact to each employee (gap formula: min(boost, gap × 0.3))
│   └─ Apply loyalty: +1.5 per round when benefits active
│
├─ 6. PROCESS SALARY (lines 302-336)
│   For each employee:
│   ├─ salary = round(salary × multiplier)
│   ├─ Morale impact (DIMINISHING RETURNS):
│   │   ├─ Raise 0-5%: full 0.3 per 1%
│   │   ├─ Raise 5-10%: 0.21 per 1%
│   │   ├─ Raise 10-15%: 0.15 per 1%
│   │   ├─ Raise 15%+: 0.09 per 1%
│   │   └─ Cuts: full 0.4 per 1% (no diminishing)
│   ├─ Loyalty: +0.3 per 1% raise, -1.5 per 1% cut
│   └─ Cost: (newSalary - oldSalary) / 12
│
├─ 7. SUPERVISOR LEADERSHIP (lines 338-373)
│   If supervisors exist:
│   ├─ avgLeadership → morale effect: (avgLeadership - 50) / 10
│   ├─ Staffing ratio penalty:
│   │   ├─ 1:12 or better → +1 morale
│   │   ├─ 1:13 to 1:15 → neutral
│   │   ├─ 1:16 to 1:20 → -3 morale
│   │   ├─ 1:21 to 1:25 → -5 morale
│   │   └─ 1:25+ → -8 morale
│   └─ Apply to all non-supervisors
│   If NO supervisors: -8 morale to all
│
├─ 8. BURNOUT (lines 375-395)
│   For each employee:
│   ├─ moraleStress = (50 - morale) / 100 if morale < 50, else 0
│   ├─ baseBurnoutGain = 1 + moraleStress × 8 (range 1-5)
│   ├─ × staminaResistance (1 - stamina/200, range 0.5-1.0)
│   ├─ × executiveResistance (1 - burnoutResistance, 0.8 for executive)
│   ├─ burnout += gain (capped at 100)
│   └─ If morale > 50: recovery = (morale - 50) / 5 (range 0-10)
│       burnout -= recovery (min 0)
│
├─ 9. TURNOVER (lines 397-400)
│   processTurnover() → random departure check per employee
│   Rate = base + morale + loyalty + burnout + benefits
│
├─ 10. SEVERANCE → FINANCE (line 403)
│   state.lastRoundSeveranceCost = totalSeveranceCost
│
├─ 11. WORKFORCE SUMMARY (lines 405-406)
│   calculateWorkforceSummary(employees, state)
│   → totalHeadcount, avgMorale, avgEfficiency, laborCost, turnoverRate
│
└─ 12. LABOR COST DEDUCTION (lines 408-414)
    totalCosts += sum(all salaries)
    state.cash -= totalCosts
```

---

## CROSS-MODULE DATA FLOW

```
┌──────────────────────────────────────────────────────────┐
│                    HR MODULE OUTPUT                       │
│                                                          │
│  state.employees[] ─── individual employee objects       │
│  state.workforce ───── aggregate metrics                 │
│  state.benefits ────── package + moraleImpact + turnover │
│  state.lastRoundSeveranceCost ─── for Finance            │
└──────────────┬───────────────────────────────────────────┘
               │
    ┌──────────┼──────────────────────────────────┐
    │          │                                  │
    ▼          ▼                                  ▼
┌─────────┐ ┌──────────────────────┐  ┌──────────────────┐
│SimEngine│ │   SimEngine SYNC     │  │   R&D Module     │
│ (post)  │ │                      │  │                  │
│         │ │ For each factory:    │  │ engineers =      │
│employee │ │ .avgWorkerAccuracy   │  │  employees.filter│
│Value()  │ │ .avgWorkerSpeed      │  │  (role=engineer) │
│ × 0.3   │ │ .avgWorkerEfficiency │  │                  │
│ + 0.7   │ │ .supervisorBoost     │  │ rdPoints =       │
│ = avg   │ │                      │  │  Σ(10 × eff ×   │
│Efficiency│ │                      │  │  speed × innov)  │
└────┬────┘ └──────────┬───────────┘  └────────┬─────────┘
     │                 │                        │
     │                 ▼                        ▼
     │    ┌───────────────────────┐    ┌──────────────┐
     │    │  ProductionLineManager│    │ rdProgress   │
     │    │                       │    │ += rdPoints  │
     │    │ workerCapacity =      │    │              │
     │    │  workers × 100 ×     │    │ → unlocks    │
     │    │  (efficiency/100) ×  │    │   products   │
     │    │  (speed/100)         │    │   patents    │
     │    │                       │    │   tech       │
     │    │ efficiency =          │    └──────────────┘
     │    │  factoryEff ×        │
     │    │  bonusMult ×         │
     │    │  supervisorBoost     │
     │    └──────────┬────────────┘
     │               │
     │               ▼
     │    ┌───────────────────────┐
     │    │   Factory Module      │
     │    │                       │
     │    │ defectRate =          │
     │    │  base × (1.3 -       │
     │    │  accuracy/100 × 0.5) │
     │    │                       │
     │    │ unitsProduced =       │
     │    │  output - defects     │
     │    └──────────┬────────────┘
     │               │
     ▼               ▼
┌─────────────────────────────────────┐
│         Finance Module              │
│                                     │
│ Income Statement:                   │
│ ├─ COGS:                            │
│ │   directLabor = Σ(worker.salary)  │
│ │   × (1 - laborReduction)          │
│ │                                   │
│ ├─ Operating Expenses:              │
│ │   salaries = Σ(eng.salary) +      │
│ │              Σ(sup.salary) +      │
│ │              overhead             │
│ │   benefits = state.benefits.cost  │
│ │   severance = state.severanceCost │
│ │                                   │
│ └─ Gross Profit = Revenue - COGS   │
│    Net Income = GP - OpEx - Tax    │
└─────────────────────────────────────┘
```

---

## WHAT THE PLAYER SEES ON EACH TAB

### OVERVIEW TAB
| Metric | Source | Updates When |
|--------|--------|-------------|
| Total Employees | `state.workforce.totalHeadcount` | After round processes |
| Monthly Labor Cost | `state.workforce.laborCost / 12` | After round processes |
| Avg Morale | `state.workforce.averageMorale` | After round processes |
| Turnover Rate | `state.workforce.turnoverRate` | After round processes |
| **Labor Cost/Unit** | `(laborCost + benefitsCost) / totalProductionOutput` | Calculated from current state |
| Per-role $/unit | Worker/Engineer/Supervisor/Benefits breakdown | Same |
| HR Spend | `laborCost/12 + benefits/12` | Same |
| Est. Departures | `totalHeadcount × turnoverRate / 4` | Same |
| Morale Trend | Color: green ≥70, yellow ≥50, red <50 | Same |
| Staffing Needs | From `calculateHiringRequirements()` | Dynamic per factory config |

### HIRE & FIRE TAB
| Element | Source | Action |
|---------|--------|--------|
| Position type buttons | Static (worker/engineer/supervisor) | Sets role for search |
| Tier cards | CONSTANTS.RECRUITMENT_STAT_RANGE + costs | Sets tier |
| Free search pill | `state.freeSearchUsed[tier]` | Green=available, Red=used |
| Search button | Calls `HRModule.generateCandidates()` | Generates candidate cards |
| Candidate stats | From generateStats() with tier range | Color coded by value |
| Value score | UI-side weighted sum | Comparable across candidates |
| Hire button | Adds to `selectedCandidates` | Syncs to store via useEffect |
| Pending hires | selectedCandidates array | Shows total cost |

### DEVELOP TAB
| Element | Source | Action |
|---------|--------|--------|
| Training cards (4) | Hardcoded programs | Enroll/cancel toggle |
| Per-person cost | TRAINING_PER_PERSON_COSTS constant | Shown on card |
| Fatigue badges | `trainingHistory.programsThisYear` avg by role | Fresh/Moderate/Fatigued |
| Salary slider | -20 to +20 range | Updates salaryAdjustment |
| Current Monthly | `laborCost / 12` | Static |
| Projected Monthly | `(laborCost/12) × (1 + adj/100)` | Live as slider moves |
| **Labor $/unit** | `projectedLaborAnnual / totalOutput` | **Live as slider moves** |
| Projected Turnover | `max(2, min(25, rate - adj × 0.3))` | Live |
| Benefits sliders | 7 dimensions + 2 toggles | Updates benefitChanges |

### ROSTER TAB
| Element | Source | Action |
|---------|--------|--------|
| Employee rows | `state.employees` (first 20) | Read-only display |
| Name | `employee.name` | Display |
| Role icon | `employee.role` | Blue/purple/green |
| Morale % | `employee.morale` | Color: green≥70, yellow≥50, red<50 |
| Efficiency % | `employee.stats.efficiency` | Blue |
| Burnout | `employee.burnout` | Color coded |
| Salary | `employee.salary` | Green |
| **Terminate button** | Sets `pendingFires` with real `employee.id` | Red button per row |
| Pending summary | Count + total severance | Shows below list |

---

## WHAT ACCUMULATES vs RESETS

| Data | Round 1 | Round 2 | Round 3 | Behavior |
|------|---------|---------|---------|----------|
| Employee.stats.efficiency | 75 | 80 (trained) | 85 (trained again) | **Accumulates** via training |
| Employee.salary | $45K | $49.5K (+10%) | $54.5K (+10%) | **Compounds** each raise |
| Employee.morale | 75 | 78 (benefits) | 72 (no supervisor) | **Continuous** — all levers push/pull |
| Employee.burnout | 0 | 3 (natural) | 1 (recovered, morale>55) | **Continuous** — accumulates/recovers |
| Employee.loyalty | 80 | 82 (trained+benefits) | 78 (fired coworker) | **Continuous** — all actions modify |
| Training fatigue | 0 | 2 (trained twice) | 0 (**resets**) | **Per-round** — fresh each round |
| Free searches | {} | {basic: true} | {} (**resets**) | **Per-round** — fresh each round |
| Severance cost | 0 | $4K (fired 1) | 0 (**resets**) | **Per-round** — only when fires happen |
| Benefits package | none | health=50, flex=true | same (persists) | **Persists** until player changes |
| Factory HR stats | eff=80, spd=80 | eff=82, spd=79 | eff=85, spd=81 | **Recalculated** from current employees |

---

## DECISION → ENGINE → OUTCOME CHAIN

### "I hire a premium worker"
```
UI: Select Premium tier → Search → Pick candidate (eff:92, speed:88, acc:85)
                ↓
Engine: salary = $45K × (0.8 + 88/100 × 1.4) = $45K × 2.03 = $91,350
        hiringCost = $91,350 × 0.15 = $13,703
        morale = dynamicStartMorale (e.g., 78 if company avg is 80)
                ↓
Factory: avgWorkerEfficiency goes up (new worker has 92 vs team avg 80)
         avgWorkerSpeed goes up (88 vs avg 78)
         avgWorkerAccuracy goes up (85 vs avg 75) → fewer defects
                ↓
Production: workerCapacity increases → more units produced
            defectRate decreases → better quality
                ↓
Finance: directLabor += $91,350/12 per month
         Revenue up from more + better units
         Net impact: positive if worker produces enough to cover salary
```

### "I fire 3 workers"
```
UI: Roster → Terminate Worker 1, Worker 2, Worker 3
                ↓
Engine: severance = 3 × (salary/12) → Finance line item
        survivors: morale -9 (3×3), loyalty -12 same role (-4×3)
        mass layoff: additional -5 loyalty company-wide
                ↓
Factory: fewer workers → lower workerCapacity
         avgEfficiency may change (depends on who was fired)
                ↓
Production: output drops proportional to lost workers
                ↓
Finance: salary savings vs lost production revenue
         severance appears as OpEx line item
         morale drop → future turnover risk → more replacement costs
```

### "I raise salary 10%"
```
UI: Develop tab → slide to +10%
                ↓
Engine: each employee.salary × 1.10
        morale: +1.5 (first 5%) + +1.05 (next 5% at 70%) = +2.55 total
        loyalty: +3.0 (10% × 0.3)
        cost: +10% of total labor cost / 12 per round
                ↓
Labor $/unit: increases by ~10% (visible on Develop tab LIVE)
                ↓
Turnover: decreases (higher morale + loyalty)
          fewer replacements needed → lower hiring costs
                ↓
Finance: OpEx up 10% on salaries
         But: fewer defects (retained skilled workers)
              less turnover (lower replacement cost)
              Net impact: depends on team composition
```

### "I max out benefits"
```
UI: Develop tab → all 7 sliders + 2 toggles maxed
                ↓
Engine: totalAnnualCost = ~$105K/employee/year
        moraleImpact = 0.50 (capped)
        turnoverReduction = 0.40 (capped)
        esgContribution = +160
        loyalty: +1.5 per round (accumulates)
                ↓
Each employee: morale boosted by min(50, gap × 0.3)
               Example: morale 60 → gap=40, boost=12 → morale 72
                ↓
Turnover: rate × 0.6 (40% fewer departures)
                ↓
Finance: OpEx += $105K × headcount / 12 per month
         But: dramatically lower turnover → lower replacement cost
              higher morale → less burnout → more output
              ESG boost → brand value
```
