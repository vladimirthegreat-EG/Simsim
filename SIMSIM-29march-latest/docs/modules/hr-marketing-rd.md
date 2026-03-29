# HR, Marketing & R&D Modules - Complete Deep Dive

**Document Version:** 1.0.0
**Last Updated:** 2026-01-27
**Engine Version:** v2.1.0 (Phase 1-16 Complete)

This document provides an exhaustive breakdown of three core business simulation modules: **HR** (Human Resources), **Marketing**, and **R&D** (Research & Development). Each module is analyzed in detail with formulas, examples, and strategic guidance.

---

## Table of Contents

### HR Module (People & Talent)
1. [HR Module Core Implementation](#hr-module-core-645-lines)
2. [HR Formulas Reference](#hr-formulas-reference)
3. [HR Phase 7 Expansions](#hr-phase-7-expansions)
4. [HR Strategic Guide](#hr-strategic-guide)

### Marketing Module (Brand & Promotion)
5. [Marketing Module Core Implementation](#marketing-module-core-351-lines)
6. [Marketing Formulas Reference](#marketing-formulas-reference)
7. [Marketing Phase 9 Expansions](#marketing-phase-9-expansions)
8. [Marketing Strategic Guide](#marketing-strategic-guide)

### R&D Module (Innovation & Products)
9. [R&D Module Core Implementation](#rd-module-core-453-lines)
10. [R&D Formulas Reference](#rd-formulas-reference)
11. [R&D Phase 8 Expansions](#rd-phase-8-expansions)
12. [R&D Strategic Guide](#rd-strategic-guide)

### Cross-Module Integration
13. [HR-Marketing Synergies](#hr-marketing-synergies)
14. [R&D-Marketing Synergies](#rd-marketing-synergies)
15. [HR-R&D Synergies](#hr-rd-synergies)
16. [Three-Module Master Strategies](#three-module-master-strategies)

---

# HR Module Deep Dive

## HR Module Core (645 lines)

**Location:** `src/engine/modules/HRModule.ts`
**Primary Responsibilities:**
- Employee recruitment and hiring
- Salary calculation and labor costs
- Training programs with fatigue system
- Employee turnover modeling
- Benefits package management
- Workforce analytics

### Architecture Overview

```
HRModule
├── Recruitment System
│   ├── Candidate generation (deterministic)
│   ├── Stat generation by role
│   └── Salary calculation
├── Training System
│   ├── Training effectiveness
│   ├── Fatigue tracking
│   └── Stat improvements
├── Turnover System
│   ├── Morale-based turnover
│   ├── Loyalty factors
│   └── Burnout impact
└── Benefits System
    ├── Benefit costs
    ├── Morale impacts
    └── Turnover reduction
```

---

## HR Module Line-by-Line Breakdown

### Section 1: Recruitment & Hiring (Lines 1-241)

#### **Lines 65-82: Main Process Entry Point**
```typescript
static process(
  state: TeamState,
  decisions: HRDecisions,
  ctx?: EngineContext
): { newState: TeamState; result: ModuleResult }
```
**Purpose:** Entry point for HR decision processing. Uses EngineContext for deterministic execution.

**Determinism:** All randomness flows through `ctx.rng.hr` for reproducible gameplay.

---

#### **Lines 96-116: Hiring Flow**
```typescript
if (decisions.hires) {
  for (const hire of decisions.hires) {
    const newEmployee = this.createEmployee(
      hire.role,
      hire.factoryId,
      state.factories[0]?.id || "factory-1",
      ctx
    );
    const hiringCost = newEmployee.salary * CONSTANTS.HIRING_COST_MULTIPLIER;

    if (newState.cash >= hiringCost) {
      newState.employees.push(newEmployee);
      totalCosts += hiringCost;
      messages.push(`Hired ${newEmployee.name} as ${hire.role}`);
    }
  }
}
```

**Formula Breakdown:**
- **Hiring Cost:** `salary × HIRING_COST_MULTIPLIER`
- **Multiplier:** 1.5 (150% of annual salary for recruiting, onboarding)

**Example:**
- Engineer with $85,000 salary
- Hiring cost: $85,000 × 1.5 = **$127,500**

**Strategic Insight:** Front-load hiring costs make rapid expansion expensive. Plan hiring 2-3 rounds ahead.

---

#### **Lines 118-131: Termination Flow**
```typescript
if (decisions.fires) {
  for (const fire of decisions.fires) {
    const index = newState.employees.findIndex(e => e.id === fire.employeeId);
    if (index >= 0) {
      const employee = newState.employees[index];
      const severanceCost = employee.salary / 12;  // 1 month
      newState.employees.splice(index, 1);
      totalCosts += severanceCost;
    }
  }
}
```

**Severance Formula:**
- **Cost:** `annual_salary / 12` (1 month pay)

**Example:**
- Supervisor at $95,000/year
- Severance: $95,000 ÷ 12 = **$7,917**

---

#### **Lines 209-240: Candidate Generation**
```typescript
static generateCandidates(
  role: EmployeeRole,
  tier: RecruitmentTier,
  count?: number,
  ctx?: EngineContext
): Omit<Employee, "id" | "hiredRound" | "factoryId">[]
```

**Recruitment Tiers:**
| Tier | Candidates | Stat Range | Use Case |
|------|-----------|------------|----------|
| Basic | 3 | 40-70 | Standard hiring |
| Premium | 5 | 60-85 | Quality hiring |
| Executive | 8 | 75-95 | Critical roles |

**Example Output (Basic Tier for Worker):**
```typescript
{
  role: "worker",
  name: "James Smith",
  stats: { efficiency: 62, accuracy: 58, speed: 65, ... },
  salary: 52_000,  // Calculated from stats
  morale: 85,
  burnout: 0
}
```

---

### Section 2: Employee Stats & Salary (Lines 242-307)

#### **Lines 242-281: Stat Generation**
```typescript
static generateStats(
  role: EmployeeRole,
  minStat: number,
  maxStat: number,
  ctx?: EngineContext
): EmployeeStats | EngineerStats | SupervisorStats
```

**Stat Structures by Role:**

**Worker (EmployeeStats - 8 stats):**
- efficiency, accuracy, speed, stamina
- discipline, loyalty, teamCompatibility, health

**Engineer (EngineerStats - 10 stats):**
- All 8 worker stats +
- innovation, problemSolving

**Supervisor (SupervisorStats - 10 stats):**
- All 8 worker stats +
- leadership, tacticalPlanning

---

#### **Lines 283-307: Salary Calculation**
```typescript
static calculateSalary(
  role: EmployeeRole,
  stats: EmployeeStats | EngineerStats | SupervisorStats
): number
```

**Formula:**
```
average_stat = sum(all_stats) / stat_count
multiplier = 0.8 + (average_stat / 100) × 1.4
final_salary = min(500_000, base_salary × multiplier)
```

**Base Salaries:**
- Worker: $45,000
- Engineer: $85,000
- Supervisor: $75,000

**Multiplier Range:** 0.8x to 2.2x (based on stats 0-100)

**Examples:**

| Role | Avg Stat | Multiplier | Base | Final Salary |
|------|----------|------------|------|--------------|
| Worker | 50 | 1.5 | $45,000 | **$67,500** |
| Worker | 80 | 1.92 | $45,000 | **$86,400** |
| Engineer | 50 | 1.5 | $85,000 | **$127,500** |
| Engineer | 90 | 2.06 | $85,000 | **$175,100** |
| Supervisor | 70 | 1.78 | $75,000 | **$133,500** |

**Cap:** No employee exceeds $500,000/year (prevents runaway costs).

---

### Section 3: Training System (Lines 133-164, 510-528)

#### **Lines 133-164: Training Processing**
```typescript
if (decisions.trainingPrograms) {
  for (const program of decisions.trainingPrograms) {
    const cost = CONSTANTS.TRAINING_COSTS[program.role];
    const affected = newState.employees.filter(e => e.role === program.role);

    for (const employee of affected) {
      const { effectiveness } = this.calculateTrainingEffectiveness(employee);
      const baseImprovement = 5 + getRandomValue(ctx) * 10;  // 5-15%
      const actualImprovement = baseImprovement * effectiveness;

      employee.stats.efficiency = Math.min(100, employee.stats.efficiency + actualImprovement);
      employee.trainingHistory.programsThisYear += 1;
    }
  }
}
```

**Training Costs:**
- Worker: $50,000 per program
- Engineer: $75,000 per program
- Supervisor: $100,000 per program

**Base Improvement:** 5-15% efficiency gain (random within range)

---

#### **Lines 510-528: Training Fatigue System**
```typescript
static calculateTrainingEffectiveness(employee: Employee): {
  effectiveness: number;
  fatigueApplied: boolean;
}
```

**Fatigue Formula:**
```
if programs_this_year < threshold:
  effectiveness = 1.0
else:
  excess_programs = programs_this_year - threshold + 1
  effectiveness = max(0.2, 1.0 - (excess_programs × penalty))
```

**Constants:**
- Fatigue Threshold: 2 programs/year
- Fatigue Penalty: 0.2 per excess program

**Examples:**

| Programs/Year | Effectiveness | Actual Gain (10% base) |
|---------------|---------------|------------------------|
| 1 | 100% | +10.0% |
| 2 | 100% | +10.0% |
| 3 | 80% | +8.0% |
| 4 | 60% | +6.0% |
| 5 | 40% | +4.0% |
| 6 | 20% (floor) | +2.0% |

**Strategic Insight:** Training has hard diminishing returns. Optimal strategy is 2 programs/year per employee.

---

### Section 4: Turnover System (Lines 389-427)

#### **Lines 389-427: Turnover Calculation**
```typescript
static processTurnover(
  state: TeamState,
  ctx?: EngineContext
): { newState: TeamState; departed: number; messages: string[] }
```

**Turnover Formula:**
```
monthly_base_rate = 0.12 / 12  // 12% annual = 1% monthly

for each employee:
  turnover_rate = monthly_base_rate

  // Morale adjustment
  if morale < 50:
    turnover_rate += 0.15 / 12  // +15% annual

  // Loyalty adjustment
  turnover_rate *= (150 - loyalty) / 100

  // Burnout adjustment
  if burnout > 50:
    turnover_rate += 0.10 / 12  // +10% annual

  // Random check
  if random() < turnover_rate:
    employee departs
```

**Examples:**

**Case 1: Happy, Loyal Employee**
- Base: 1.0%
- Morale: 80 (no penalty)
- Loyalty: 80 → multiplier = (150 - 80) / 100 = 0.7
- Burnout: 20 (no penalty)
- **Final:** 1.0% × 0.7 = **0.7% monthly** (8.4% annual)

**Case 2: Unhappy, Disloyal Employee**
- Base: 1.0%
- Morale: 40 → +1.25%
- Loyalty: 30 → multiplier = (150 - 30) / 100 = 1.2
- Burnout: 60 → +0.83%
- **Subtotal:** (1.0% + 1.25% + 0.83%) × 1.2 = **3.7% monthly** (44% annual!)

**Case 3: Burned Out Star Performer**
- Base: 1.0%
- Morale: 55 (no penalty)
- Loyalty: 90 → multiplier = 0.6
- Burnout: 75 → +0.83%
- **Final:** (1.0% + 0.83%) × 0.6 = **1.1% monthly** (13% annual)

**Strategic Insights:**
1. Morale < 50 is a **major** turnover driver (+15% annual)
2. Loyalty is the most powerful factor (0.5x to 1.5x multiplier)
3. Burnout adds meaningful risk above 50
4. Combine all three penalties → catastrophic turnover (>40% annual)

---

### Section 5: Benefits System (Lines 532-620)

#### **Lines 532-620: Benefits Processing**
```typescript
static processBenefitChanges(
  state: TeamState,
  changes: Partial<BenefitsPackage>
): {
  newBenefits: CompanyBenefits;
  additionalCost: number;
  messages: string[];
}
```

**Benefits Package Structure:**
```typescript
interface BenefitsPackage {
  healthInsurance: number;        // 0-100 (% coverage)
  retirementMatch: number;        // 0-100 (% match)
  paidTimeOff: number;            // Days (0-30)
  parentalLeave: number;          // Weeks (0-12)
  stockOptions: boolean;
  flexibleWork: boolean;
  professionalDevelopment: number; // Annual budget (0-5000)
}
```

**Cost Calculation:**
```typescript
totalCost =
  (healthInsurance / 10) × 2000 × employees +
  (retirementMatch / 10) × 1500 × employees +
  paidTimeOff × 500 × employees +
  parentalLeave × 200 × employees +
  (stockOptions ? 3000 × employees : 0) +
  (flexibleWork ? 1000 × employees : 0) +
  professionalDevelopment × 1 × employees
```

**Cost Table (per employee):**
| Benefit | Max Value | Cost @ Max |
|---------|-----------|------------|
| Health Insurance | 100% | $20,000 |
| Retirement Match | 100% | $15,000 |
| Paid Time Off | 30 days | $15,000 |
| Parental Leave | 12 weeks | $2,400 |
| Stock Options | Yes | $3,000 |
| Flexible Work | Yes | $1,000 |
| Prof. Development | $5,000 | $5,000 |
| **TOTAL** | - | **$61,400** |

**Example: 100 Employees, Moderate Package**
- Health: 70% → $14,000/employee
- Retirement: 50% → $7,500/employee
- PTO: 20 days → $10,000/employee
- Parental: 8 weeks → $1,600/employee
- Stock: Yes → $3,000/employee
- Flexible: Yes → $1,000/employee
- Dev: $2,500 → $2,500/employee
- **Per-employee cost:** $39,600
- **Total annual cost:** $39,600 × 100 = **$3,960,000**

---

#### **Morale Impact Calculation**
```typescript
moraleImpact =
  (healthInsurance / 100) × 0.15 +
  (retirementMatch / 100) × 0.10 +
  (paidTimeOff / 30) × 0.08 +
  (parentalLeave / 12) × 0.05 +
  (stockOptions ? 0.12 : 0) +
  (flexibleWork ? 0.08 : 0) +
  (professionalDevelopment / 5000) × 0.05

capped_morale_impact = min(0.5, moraleImpact)  // Max 50% bonus
```

**Morale Impact Table:**
| Benefit | Max Impact | Notes |
|---------|------------|-------|
| Health Insurance | +15% | Most valuable |
| Retirement Match | +10% | Long-term security |
| Paid Time Off | +8% | Work-life balance |
| Stock Options | +12% | Alignment with company |
| Flexible Work | +8% | Lifestyle benefit |
| Parental Leave | +5% | Family support |
| Prof. Development | +5% | Career growth |
| **TOTAL CAP** | **+50%** | Prevents runaway morale |

**Example: Premium Package Morale**
- Health: 100% → +15%
- Retirement: 100% → +10%
- PTO: 30 days → +8%
- Stock: Yes → +12%
- Flexible: Yes → +8%
- **Total:** 53% → **Capped at 50%**

---

#### **Turnover Reduction Calculation**
```typescript
turnoverReduction =
  (healthInsurance / 100) × 0.10 +
  (retirementMatch / 100) × 0.08 +
  (paidTimeOff / 30) × 0.05 +
  (parentalLeave / 12) × 0.03 +
  (stockOptions ? 0.07 : 0) +
  (flexibleWork ? 0.04 : 0) +
  (professionalDevelopment / 5000) × 0.03

capped_turnover_reduction = min(0.4, turnoverReduction)  // Max 40%
```

**Turnover Reduction Table:**
| Benefit | Max Reduction | Notes |
|---------|---------------|-------|
| Health Insurance | -10% | Retention driver |
| Retirement Match | -8% | Golden handcuffs |
| Stock Options | -7% | Vesting schedules |
| Paid Time Off | -5% | Prevents burnout |
| Flexible Work | -4% | Lifestyle retention |
| Parental Leave | -3% | Family loyalty |
| Prof. Development | -3% | Career path |
| **TOTAL CAP** | **-40%** | Maximum effect |

**Combined Benefits Example:**
- Base turnover: 12% annual
- Moderate benefits: -20% reduction
- **Effective turnover:** 12% × 0.8 = **9.6% annual**

- Base turnover: 12% annual
- Premium benefits: -40% reduction
- **Effective turnover:** 12% × 0.6 = **7.2% annual**

---

### Section 6: Workforce Analytics (Lines 357-385, 432-494)

#### **Lines 357-364: Worker Output**
```typescript
static calculateWorkerOutput(stats: EmployeeStats): number {
  const baseOutput = 100;  // 100 units per round
  const efficiencyMultiplier = stats.efficiency / 100;
  const speedMultiplier = stats.speed / 100;

  return baseOutput × efficiencyMultiplier × speedMultiplier;
}
```

**Formula:** `100 × (efficiency / 100) × (speed / 100)`

**Examples:**
| Efficiency | Speed | Output | % of Base |
|------------|-------|--------|-----------|
| 50 | 50 | 25 units | 25% |
| 70 | 70 | 49 units | 49% |
| 85 | 85 | 72 units | 72% |
| 100 | 100 | 100 units | 100% |

**Strategic Insight:** Workers with 70+ in both stats produce nearly 50% of theoretical max. Training focus should be efficiency + speed.

---

#### **Lines 366-377: Engineer R&D Output**
```typescript
static calculateEngineerRDOutput(stats: EngineerStats): number {
  const basePoints = 10;
  const efficiencyMultiplier = stats.efficiency / 100;
  const speedMultiplier = stats.speed / 100;
  const innovationBonus = 1 + stats.innovation / 200;

  return basePoints × efficiencyMultiplier × speedMultiplier × innovationBonus;
}
```

**Formula:** `10 × (efficiency / 100) × (speed / 100) × (1 + innovation / 200)`

**Examples:**
| Efficiency | Speed | Innovation | Output | Notes |
|------------|-------|------------|--------|-------|
| 50 | 50 | 50 | 3.1 pts | Below average |
| 70 | 70 | 70 | 6.0 pts | Average |
| 85 | 85 | 85 | 8.7 pts | Good |
| 95 | 95 | 95 | 10.8 pts | Elite |
| 100 | 100 | 100 | 15.0 pts | Theoretical max |

**Innovation Bonus Impact:**
- 0 innovation: 1.0x multiplier
- 50 innovation: 1.25x multiplier
- 100 innovation: 1.5x multiplier

**Strategic Insight:** Innovation is a 50% multiplier at max. Hire engineers with high innovation for R&D dominance.

---

#### **Lines 379-385: Supervisor Boost**
```typescript
static calculateSupervisorBoost(stats: SupervisorStats): number {
  return 1.0 + stats.leadership / 500;
}
```

**Formula:** `1.0 + (leadership / 500)`

**Boost Range:** 1.0x to 1.2x (0% to 20% boost)

**Examples:**
| Leadership | Boost | Team Impact (10 workers @ 50 units) |
|------------|-------|-------------------------------------|
| 0 | 1.00x | 500 units (no boost) |
| 50 | 1.10x | 550 units (+10%) |
| 75 | 1.15x | 575 units (+15%) |
| 100 | 1.20x | 600 units (+20%) |

**Strategic Insight:** A supervisor with 100 leadership boosts a 10-worker team by 100 units/round. Worth the salary if team size ≥ 10.

---

#### **Lines 432-461: Workforce Summary**
```typescript
static calculateWorkforceSummary(employees: Employee[]): TeamState["workforce"] {
  const totalHeadcount = employees.length;
  const averageMorale = employees.reduce((sum, e) => sum + e.morale, 0) / employees.length;
  const averageEfficiency = employees.reduce((sum, e) => sum + e.stats.efficiency, 0) / employees.length;
  const laborCost = employees.reduce((sum, e) => sum + e.salary, 0);

  // Estimate turnover
  const avgLoyalty = employees.reduce((sum, e) => sum + e.stats.loyalty, 0) / employees.length;
  let turnoverRate = 0.12;  // 12% base
  if (averageMorale < 50) turnoverRate += 0.15;
  turnoverRate *= (150 - avgLoyalty) / 100;

  return {
    totalHeadcount,
    averageMorale,
    averageEfficiency,
    laborCost,
    turnoverRate: Math.min(0.5, turnoverRate)  // Cap at 50%
  };
}
```

**Example Output:**
```typescript
{
  totalHeadcount: 142,
  averageMorale: 73,
  averageEfficiency: 68,
  laborCost: 8_750_000,  // Annual
  turnoverRate: 0.095  // 9.5% annual
}
```

---

## HR Formulas Reference

### Core Formulas

| Formula | Equation | Purpose |
|---------|----------|---------|
| **Salary** | `base × (0.8 + avg_stat/100 × 1.4)` | Calculate employee salary |
| **Hiring Cost** | `salary × 1.5` | One-time hiring expense |
| **Severance** | `salary / 12` | Termination cost |
| **Training Gain** | `(5 + rand(10)) × effectiveness` | Efficiency improvement |
| **Fatigue** | `max(0.2, 1.0 - excess × 0.2)` | Diminishing training returns |
| **Turnover** | `base × morale_adj × loyalty_mult × burnout_adj` | Departure probability |
| **Worker Output** | `100 × efficiency × speed` | Production per worker |
| **Engineer Output** | `10 × eff × spd × (1 + innov/200)` | R&D points per engineer |
| **Supervisor Boost** | `1.0 + leadership / 500` | Team multiplier |

### Benefits Formulas

| Benefit | Cost Formula | Morale Impact | Turnover Reduction |
|---------|-------------|---------------|-------------------|
| Health Insurance | `(value/10) × 2000 × employees` | `value/100 × 0.15` | `value/100 × 0.10` |
| Retirement Match | `(value/10) × 1500 × employees` | `value/100 × 0.10` | `value/100 × 0.08` |
| PTO | `days × 500 × employees` | `days/30 × 0.08` | `days/30 × 0.05` |
| Parental Leave | `weeks × 200 × employees` | `weeks/12 × 0.05` | `weeks/12 × 0.03` |
| Stock Options | `3000 × employees` | `0.12` | `0.07` |
| Flexible Work | `1000 × employees` | `0.08` | `0.04` |
| Prof. Development | `budget × employees` | `budget/5000 × 0.05` | `budget/5000 × 0.03` |

---

## HR Phase 7 Expansions

The plan document (Phase 7) outlines advanced HR mechanics. Here's the implementation roadmap:

### 7.1 Hiring Pipeline Lag

**Current State:** Instant hiring
**Planned Enhancement:**
```typescript
interface Employee {
  rampUpProgress: number;        // 0-100
  rampUpRoundsRemaining: number; // 2 rounds default
  mentor: string | null;
  trainingPath: string[];
}
```

**Ramp-Up Schedule:**
- Round 1: 30% productivity
- Round 2: 70% productivity
- Round 3+: 100% productivity

**Accelerators:**
- Mentor assigned: 1.5× ramp speed
- Onboarding program: 1.3× ramp speed
- Industry experience: Start at 50% instead of 30%

**Strategic Impact:** New hires are a 2-round investment. Plan staffing 3 rounds ahead of production needs.

---

### 7.2 Skill Clusters

**Current State:** Single efficiency stat for workers
**Planned Enhancement:**
```typescript
interface EmployeeSkills {
  execution: number;      // Day-to-day performance
  innovation: number;     // R&D, process improvement
  reliability: number;    // Consistency, attendance
  leadership: number;     // Team influence
  adaptability: number;   // Change response
}
```

**Cluster Usage:**
- **Execution:** Production output
- **Innovation:** R&D contributions, process improvements (workers can innovate too!)
- **Reliability:** Defect rate, attendance, quality
- **Leadership:** Team morale, coordination (workers can lead informally)
- **Adaptability:** Technology transition success, learning speed

**Strategic Impact:** Hire for role-specific skill profiles, not just "good stats."

---

### 7.3 Career Progression

**Current State:** No promotion system
**Planned Enhancement:**
```typescript
interface CareerPath {
  currentLevel: 'junior' | 'mid' | 'senior' | 'lead' | 'principal';
  experiencePoints: number;
  promotionThreshold: number;
  specializations: string[];
}
```

**Promotion Effects:**
- Morale: +20
- Turnover risk: -30%
- Salary: +15%
- Leadership/innovation stats: Small boost

**Blocked Promotion Penalties:**
- Turnover risk: +20%
- Morale: -10
- Engagement: Declines

**Strategic Impact:** Promote top performers or lose them. Create career ladders to retain talent.

---

### 7.4 Team Dynamics

**Current State:** Employees are independent
**Planned Enhancement:**
```typescript
interface TeamDynamics {
  cohesion: number;           // 0-100, collaboration effectiveness
  conflictLevel: number;      // 0-100, reduces productivity
  innovationSynergy: number;  // Bonus from diverse skills
}
```

**Synergy Calculation:**
```typescript
cohesion = averageTeamCompatibility × (1 - turnoverRate);
conflictLevel = highEgoEmployees / teamSize × 100;
innovationSynergy = skillDiversity × avgInnovation / 100;

teamProductivityMultiplier = 1 + (cohesion - conflictLevel) / 200;
```

**Strategic Impact:** Team composition matters. Mix of skills > collection of stars.

---

## HR Strategic Guide

### Early Game (Rounds 1-2)
**Objectives:**
- Build core workforce (50-75 workers)
- Hire 8-12 engineers for R&D
- Hire 3-5 supervisors for efficiency

**Hiring Strategy:**
- Use Basic tier recruitment (3 candidates)
- Target 60+ efficiency workers
- Prioritize engineer innovation stat
- Supervisors: Focus on leadership 70+

**Benefits Strategy:**
- Minimal benefits to conserve cash
- 10-15 days PTO (standard)
- No optional benefits yet

**Expected Costs:**
- Workers: $45,000 × 60 = $2.7M labor
- Hiring: $2.7M × 1.5 = $4.05M one-time
- Engineers: $85,000 × 10 = $850K labor
- Hiring: $850K × 1.5 = $1.28M one-time
- **Total Year 1:** $8.8M

---

### Mid Game (Rounds 3-5)
**Objectives:**
- Scale to 100-150 workers
- Maintain 15-20 engineers
- Improve workforce quality

**Hiring Strategy:**
- Shift to Premium tier ($3-5K/hire more)
- Replace bottom 20% performers
- Target 75+ efficiency new hires

**Training Strategy:**
- 2 programs/year max per role
- Focus: Worker efficiency, Engineer innovation
- Cost: ~$150K/program × 4 programs = $600K

**Benefits Strategy:**
- Introduce moderate benefits package:
  - Health: 50% → +7.5% morale
  - Retirement: 25% → +2.5% morale
  - Stock options → +12% morale
  - **Total morale boost:** ~22%
  - **Cost:** ~$15K/employee × 120 = $1.8M

**Turnover Management:**
- Expected: 9-12% annual with benefits
- Budget: 12 departures × $65K avg salary = $780K lost productivity

---

### Late Game (Rounds 6-8)
**Objectives:**
- Optimize workforce composition
- Maximize efficiency through training
- Achieve <8% turnover with benefits

**Hiring Strategy:**
- Executive tier for critical roles
- 80+ stat targets
- Strategic replacements only

**Training Strategy:**
- Targeted programs for high performers
- 2 programs/year limit (fatigue avoidance)
- Focus on stars, not average performers

**Benefits Strategy:**
- Premium package for retention:
  - Health: 100% → +15% morale
  - Retirement: 100% → +10% morale
  - PTO: 25 days → +6.7% morale
  - Stock + Flexible → +20% morale
  - **Total morale boost:** ~50% (capped)
  - **Turnover reduction:** ~35%
  - **Cost:** ~$40K/employee × 150 = $6M

**ROI Calculation:**
- Turnover without benefits: 12% × 150 = 18 departures
- Turnover with benefits: 7.8% × 150 = 11.7 departures
- Departures saved: 6.3 employees
- Savings: 6.3 × ($70K avg salary + $105K hiring cost) = $1.1M
- **Net benefit:** $1.1M saved - $6M cost = -$4.9M
- **But:** Morale boost increases productivity 10-20%, offsetting cost

---

### HR Decision Matrix

| Scenario | Action | Rationale |
|----------|--------|-----------|
| Rapid expansion needed | Premium tier hiring + training budget | Quality over quantity |
| High turnover (>15%) | Investigate morale, add benefits | Fix root cause |
| Low cash | Delay hiring, fire bottom 10% | Survival mode |
| Production shortfall | Hire workers + supervisors | Immediate capacity |
| R&D falling behind | Hire engineers (innovation 75+) | Long-term innovation |
| Training fatigue warning | Skip this round | Avoid wasted spend |
| Supervisor:worker ratio <1:15 | Hire supervisors | Boost team efficiency |
| Morale <60 | Benefits package upgrade | Prevent turnover spiral |

---

# Marketing Module Deep Dive

## Marketing Module Core (351 lines)

**Location:** `src/engine/modules/MarketingModule.ts`
**Primary Responsibilities:**
- Advertising budget allocation by segment
- Brand value building and decay
- Promotional campaigns
- Sponsorship investments
- Brand awareness calculation

### Architecture Overview

```
MarketingModule
├── Advertising System
│   ├── Segment-specific advertising
│   ├── Diminishing returns calculation
│   └── Brand impact tracking
├── Branding System
│   ├── Long-term brand investment
│   ├── Brand decay modeling
│   └── Brand growth caps
├── Promotions
│   ├── Price elasticity by segment
│   └── Sales boost calculation
└── Sponsorships
    ├── Sponsorship catalog
    ├── Segment targeting
    └── Brand impact
```

---

## Marketing Module Line-by-Line Breakdown

### Section 1: Advertising System (Lines 63-86, 163-193)

#### **Lines 63-86: Advertising Budget Processing**
```typescript
if (decisions.advertisingBudget) {
  for (const [segment, budget] of Object.entries(decisions.advertisingBudget)) {
    if (budget > 0) {
      const brandImpact = this.calculateAdvertisingImpact(budget, segment as Segment);
      totalBrandGrowth += brandImpact;
      totalCosts += budget;
      messages.push(`${segment} advertising: $${(budget / 1_000_000).toFixed(1)}M → +${(brandImpact * 100).toFixed(2)}% brand`);
    }
  }
}
```

**Purpose:** Process advertising spend for each segment, calculate brand impact.

**Example:**
- Budget segment advertising: $5M
- General segment advertising: $10M
- Professional segment advertising: $8M
- **Total cost:** $23M

---

#### **Lines 163-193: Advertising Impact Calculation**
```typescript
static calculateAdvertisingImpact(budget: number, segment: Segment): number {
  const millions = budget / 1_000_000;

  // Segment multipliers
  const segmentMultipliers: Record<Segment, number> = {
    "Budget": 1.1,
    "General": 1.0,
    "Enthusiast": 0.75,
    "Professional": 0.5,
    "Active Lifestyle": 0.85,
  };

  const multiplier = segmentMultipliers[segment];
  const baseImpact = 0.0015;  // 0.15% per $1M

  // Diminishing returns
  let totalImpact = 0;
  let remaining = millions;
  let currentEffectiveness = 1.0;

  while (remaining > 0) {
    const chunk = Math.min(remaining, 3);  // $3M chunks
    totalImpact += chunk × baseImpact × currentEffectiveness × multiplier;
    remaining -= chunk;
    currentEffectiveness *= 0.4;  // Drop to 40% for next chunk
  }

  return totalImpact;
}
```

**Formula Breakdown:**

**Base:** 0.15% brand increase per $1M
**Chunk Size:** $3M
**Decay:** 40% effectiveness per chunk
**Segment Multipliers:**
- Budget: 1.1× (easy to penetrate)
- General: 1.0× (baseline)
- Active Lifestyle: 0.85×
- Enthusiast: 0.75× (harder)
- Professional: 0.5× (very hard)

**Examples:**

**Example 1: Budget Segment, $6M**
- Chunk 1: $3M × 0.15% × 1.0 × 1.1 = 0.495%
- Chunk 2: $3M × 0.15% × 0.4 × 1.1 = 0.198%
- **Total:** 0.693% brand growth

**Example 2: Professional Segment, $9M**
- Chunk 1: $3M × 0.15% × 1.0 × 0.5 = 0.225%
- Chunk 2: $3M × 0.15% × 0.4 × 0.5 = 0.090%
- Chunk 3: $3M × 0.15% × 0.16 × 0.5 = 0.036%
- **Total:** 0.351% brand growth

**Example 3: General Segment, $15M**
- Chunk 1: $3M × 0.45% = 0.45%
- Chunk 2: $3M × 0.18% = 0.18%
- Chunk 3: $3M × 0.072% = 0.072%
- Chunk 4: $3M × 0.029% = 0.029%
- Chunk 5: $3M × 0.012% = 0.012%
- **Total:** 0.743% brand growth

**Diminishing Returns Visualization:**

| Spend ($M) | Budget Seg | General Seg | Professional Seg |
|------------|------------|-------------|------------------|
| $3M | 0.495% | 0.450% | 0.225% |
| $6M | 0.693% | 0.630% | 0.315% |
| $9M | 0.771% | 0.701% | 0.351% |
| $12M | 0.808% | 0.735% | 0.367% |
| $15M | 0.825% | 0.750% | 0.375% |
| $20M | 0.840% | 0.764% | 0.382% |

**Strategic Insight:** Returns collapse after $9-12M. Spread budget across segments instead of over-investing in one.

---

### Section 2: Branding Investment (Lines 88-95, 195-220)

#### **Lines 88-95: Branding Processing**
```typescript
if (decisions.brandingInvestment && decisions.brandingInvestment > 0) {
  const investment = decisions.brandingInvestment;
  const brandImpact = this.calculateBrandingImpact(investment);
  totalBrandGrowth += brandImpact;
  totalCosts += investment;
  messages.push(`Branding investment: $${(investment / 1_000_000).toFixed(1)}M → +${(brandImpact * 100).toFixed(2)}% brand`);
}
```

---

#### **Lines 195-220: Branding Impact Calculation**
```typescript
static calculateBrandingImpact(investment: number): number {
  const millions = investment / 1_000_000;
  const baseImpact = 0.0025;  // 0.25% per $1M

  // Linear up to $5M
  if (millions <= 5) {
    return millions × baseImpact;
  }

  // Logarithmic beyond $5M
  const baseReturn = 5 × baseImpact;  // First $5M
  const extraMillions = millions - 5;
  const extraReturn = baseImpact × 2.5 × Math.log2(1 + extraMillions / 5);

  return baseReturn + extraReturn;
}
```

**Formula:**
- **Linear zone ($0-5M):** `investment × 0.25%`
- **Logarithmic zone (>$5M):** `1.25% + 0.625% × log2(1 + extra/5)`

**Examples:**

| Investment | Zone | Calculation | Brand Impact |
|------------|------|-------------|--------------|
| $2M | Linear | $2M × 0.25% | 0.50% |
| $5M | Linear | $5M × 0.25% | 1.25% |
| $10M | Log | 1.25% + 0.625% × log2(2) | 1.875% |
| $15M | Log | 1.25% + 0.625% × log2(3) | 2.24% |
| $20M | Log | 1.25% + 0.625% × log2(4) | 2.50% |
| $30M | Log | 1.25% + 0.625% × log2(6) | 2.87% |

**Branding vs Advertising Efficiency:**

| Spend | Advertising (General) | Branding | Winner |
|-------|----------------------|----------|--------|
| $3M | 0.45% | 0.75% | **Branding** |
| $6M | 0.63% | 1.50% | **Branding** |
| $10M | 0.71% | 1.88% | **Branding** |
| $15M | 0.75% | 2.24% | **Branding** |

**Strategic Insight:** Branding is more efficient at all spend levels. Use advertising for segment-specific targeting, branding for overall brand value.

---

### Section 3: Brand Decay (Lines 129-133)

#### **Lines 129-133: Brand Decay Calculation**
```typescript
// Natural brand decay (brands need constant investment)
const decayAmount = newState.brandValue × CONSTANTS.BRAND_DECAY_RATE;
newState.brandValue = Math.max(0, newState.brandValue - decayAmount);
```

**Formula:** `brand_value × 0.065` (6.5% per round)

**Examples:**

| Starting Brand | Decay Amount | Ending Brand | Annual Decay |
|----------------|--------------|--------------|--------------|
| 0.10 | 0.0065 | 0.0935 | ~23% |
| 0.25 | 0.0163 | 0.2337 | ~23% |
| 0.50 | 0.0325 | 0.4675 | ~23% |
| 0.75 | 0.0488 | 0.7012 | ~23% |
| 1.00 | 0.0650 | 0.9350 | ~23% |

**Strategic Insight:** Brand value decays ~23% annually without investment. High brands need more $ to maintain than grow.

**Maintenance Spend Required (to hold steady):**

| Brand Value | Decay/Round | Branding Needed | Advertising Needed |
|-------------|-------------|-----------------|-------------------|
| 0.10 | 0.65% | $2.6M | $4.3M |
| 0.25 | 1.63% | $6.5M | $10.8M |
| 0.50 | 3.25% | $13M | $21.7M |
| 0.75 | 4.88% | $19.5M | $32.5M |
| 1.00 | 6.50% | $26M | $43.3M |

**Key Insight:** Reaching 1.0 brand is possible, but maintaining it costs $26M/round minimum. Aim for 0.5-0.7 sweet spot.

---

### Section 4: Brand Growth Cap (Lines 119-127)

#### **Lines 119-127: Growth Cap**
```typescript
const maxGrowth = CONSTANTS.BRAND_MAX_GROWTH_PER_ROUND;  // 0.02
const cappedGrowth = Math.min(totalBrandGrowth, maxGrowth);
if (totalBrandGrowth > maxGrowth) {
  messages.push(`Brand growth capped at ${(maxGrowth × 100).toFixed(1)}% (diminishing returns)`);
}

newState.brandValue = Math.min(1, startingBrandValue + cappedGrowth);
```

**Cap:** 2% per round maximum

**Example:**
- Starting brand: 0.30
- Advertising: $20M → 0.764% impact
- Branding: $20M → 2.50% impact
- **Total impact:** 3.264%
- **Capped at:** 2.00%
- **New brand:** 0.30 + 0.02 = **0.32**

**Strategic Insight:** Cannot buy your way to brand dominance instantly. Brand building is a multi-round investment.

---

### Section 5: Sponsorships (Lines 107-117, 290-334)

#### **Lines 107-117: Sponsorship Processing**
```typescript
if (decisions.sponsorships) {
  for (const sponsorship of decisions.sponsorships) {
    if (newState.cash >= sponsorship.cost) {
      totalBrandGrowth += sponsorship.brandImpact;
      totalCosts += sponsorship.cost;
      messages.push(`Sponsorship: ${sponsorship.name} → +${(sponsorship.brandImpact × 100).toFixed(2)}% brand`);
    }
  }
}
```

---

#### **Lines 290-334: Sponsorship Catalog**
```typescript
static generateSponsorshipOptions(): Array<{
  name: string;
  cost: number;
  brandImpact: number;
  segmentFocus: Segment | "all";
}>
```

**Sponsorship Table:**

| Name | Cost | Brand Impact | Segment | ROI ($/%) |
|------|------|--------------|---------|-----------|
| Influencer Partnership | $3.0M | 0.60% | General | $5.0M |
| Gaming Tournament | $4.5M | 0.90% | Enthusiast | $5.0M |
| Tech Conference | $7.5M | 1.20% | Professional | $6.25M |
| Retailer Partnership | $12.0M | 1.80% | Budget | $6.67M |
| Sports Team Jersey | $22.0M | 3.00% | Active Lifestyle | $7.33M |
| National TV Campaign | $35.0M | 4.50% | All | $7.78M |

**Efficiency Comparison:**

| Investment Type | $10M Impact | $20M Impact | $30M Impact |
|----------------|-------------|-------------|-------------|
| Advertising (General) | 0.71% | 0.76% | 0.79% |
| Branding | 1.88% | 2.50% | 2.87% |
| Sponsorships | 2.1% (mix) | 4.2% (mix) | 6.3% (mix) |

**Best Sponsorship Combos:**

**$10M Budget:**
- Influencer ($3M) + Gaming ($4.5M) = $7.5M → 1.5% impact
- **Leftover:** $2.5M for advertising

**$20M Budget:**
- Tech Conference ($7.5M) + Retailer ($12M) = $19.5M → 3.0% impact
- **Leftover:** $500K

**$35M Budget:**
- National TV Campaign ($35M) → 4.5% impact
- **Most efficient single spend**

**Strategic Insight:** Sponsorships are most efficient for brand building, but:
1. Limited selection (can't just spam $100M)
2. Segment-specific (may not align with strategy)
3. All-or-nothing (no partial sponsorships)

Use branding for flexible spending, sponsorships for targeted bursts.

---

### Section 6: Promotions (Lines 98-104, 258-282)

#### **Lines 98-104: Promotion Processing**
```typescript
if (decisions.promotions) {
  for (const promo of decisions.promotions) {
    messages.push(`${promo.segment} promotion: ${promo.discountPercent}% off for ${promo.duration} rounds`);
  }
}
```

**Note:** Promotions tracked but impact calculated in Market Simulator, not here.

---

#### **Lines 258-282: Promotion Impact Calculation**
```typescript
static calculatePromotionImpact(
  discountPercent: number,
  segment: Segment,
  brandValue: number
): { salesBoost: number; marginReduction: number }
```

**Formula:**
```
elasticity = segment_elasticity
sales_boost = (discount / 100) × elasticity × (1 + brand_value)
margin_reduction = discount / 100
```

**Price Elasticity by Segment:**
- Budget: 2.5 (very sensitive)
- Active Lifestyle: 1.5
- General: 1.8
- Enthusiast: 1.2
- Professional: 0.8 (less sensitive)

**Examples:**

**Case 1: 20% Discount, Budget Segment, 0.3 Brand**
- Sales boost: 0.20 × 2.5 × 1.3 = **65% more units**
- Margin reduction: **20%**
- Net revenue impact: 1.65 × 0.80 = **132%** (32% revenue increase!)

**Case 2: 20% Discount, Professional Segment, 0.3 Brand**
- Sales boost: 0.20 × 0.8 × 1.3 = **20.8% more units**
- Margin reduction: **20%**
- Net revenue impact: 1.208 × 0.80 = **96.6%** (3.4% revenue decrease)

**Case 3: 10% Discount, General Segment, 0.5 Brand**
- Sales boost: 0.10 × 1.8 × 1.5 = **27% more units**
- Margin reduction: **10%**
- Net revenue impact: 1.27 × 0.90 = **114.3%** (14.3% revenue increase)

**Promotion Effectiveness Table:**

| Segment | 10% Discount | 20% Discount | 30% Discount | Sweet Spot |
|---------|--------------|--------------|--------------|------------|
| Budget | +32.5% | +65% | +97.5% | 15-20% |
| General | +18% | +36% | +54% | 10-15% |
| Active Lifestyle | +15% | +30% | +45% | 10-15% |
| Enthusiast | +12% | +24% | +36% | 5-10% |
| Professional | +8% | +16% | +24% | 5-10% |

**Strategic Insights:**
1. **Budget segment:** Promotions are highly effective (2.5× multiplier)
2. **Professional segment:** Promotions barely move the needle (0.8× multiplier)
3. **Brand value:** Acts as a multiplier on promotion effectiveness
4. **Optimal discount:** 10-20% for most segments

---

## Marketing Formulas Reference

| Formula | Equation | Purpose |
|---------|----------|---------|
| **Advertising Impact** | `∑(chunk × 0.0015 × effectiveness × segment_mult)` | Brand from ad spend |
| **Branding Impact (≤$5M)** | `millions × 0.0025` | Brand from branding (linear) |
| **Branding Impact (>$5M)** | `0.0125 + 0.00625 × log2(1 + extra/5)` | Brand from branding (log) |
| **Brand Decay** | `brand × 0.065` | 6.5% decay per round |
| **Brand Growth Cap** | `min(impact, 0.02)` | Max 2% growth/round |
| **Promotion Sales Boost** | `discount × elasticity × (1 + brand)` | Extra units from promo |
| **Promotion Margin** | `discount / 100` | Revenue reduction |

### Segment Multipliers

| Segment | Advertising | Elasticity | Notes |
|---------|-------------|------------|-------|
| Budget | 1.1× | 2.5 | Easy to reach, price-sensitive |
| General | 1.0× | 1.8 | Baseline |
| Active Lifestyle | 0.85× | 1.5 | Moderate |
| Enthusiast | 0.75× | 1.2 | Harder to influence |
| Professional | 0.5× | 0.8 | Very hard, quality-focused |

---

## Marketing Phase 9 Expansions

The plan document (Phase 9) outlines advanced marketing mechanics:

### 9.1 Performance vs Brand Split

**Current State:** All marketing builds brand value
**Planned Enhancement:**
```typescript
interface MarketingDecisions {
  performanceMarketing: Record<Segment, number>;  // Immediate sales
  brandMarketing: Record<Segment, number>;        // Long-term equity
}
```

**Performance Marketing:**
- Immediate impact: 15% sales boost per $1M (capped at 50%)
- Decay: 70% per round (short-lived)
- Use case: Launch campaigns, competitive responses

**Brand Marketing:**
- Cumulative impact: 0.5% brand equity per $1M
- No decay: Compounds over time
- Use case: Long-term brand building

**Strategic Trade-off:** Performance for quick wins, brand for sustainable advantage.

---

### 9.2 Channel Mix

**Current State:** No channel differentiation
**Planned Enhancement:**
```typescript
interface ChannelMix {
  retail: number;       // Best Buy, carrier stores
  digital: number;      // Direct online sales
  enterprise: number;   // B2B sales
  carrier: number;      // Carrier partnerships
}
```

**Channel Effectiveness by Segment:**

| Segment | Retail | Digital | Enterprise | Carrier | Best Channel |
|---------|--------|---------|------------|---------|--------------|
| Budget | 1.2× | 0.8× | 0.3× | 1.5× | **Carrier** |
| General | 1.0× | 1.0× | 0.5× | 1.2× | Retail/Digital |
| Professional | 0.6× | 0.8× | 1.5× | 0.7× | **Enterprise** |
| Enthusiast | 0.8× | 1.3× | 0.4× | 0.9× | **Digital** |
| Active Lifestyle | 1.1× | 1.0× | 0.3× | 1.0× | **Retail** |

**Strategic Impact:** Mismatched channels waste 20-50% of marketing spend.

---

### 9.3 Competitive Response Modeling

**Current State:** Competitors don't react
**Planned Enhancement:**
```typescript
interface CompetitorAction {
  type: 'price_cut' | 'marketing_blitz' | 'product_launch' | 'promotion';
  segment: Segment;
  intensity: number;
  duration: number;
}
```

**Trigger Conditions:**
- Player price cut >10% → 70% match probability
- Player market share gain >5% → Marketing blitz
- Player new product launch → Competitive launch

**Strategic Impact:** Aggressive moves invite retaliation. Sustainable growth > market shocks.

---

## Marketing Strategic Guide

### Early Game (Rounds 1-2)
**Objectives:**
- Establish baseline brand (0.15-0.25)
- Build awareness in 2-3 target segments
- Minimize spend while growing

**Branding Strategy:**
- Investment: $5-8M
- Expected impact: 1.25-2.0%
- Target brand by Round 2: 0.20-0.25

**Advertising Strategy:**
- Budget: $3M per target segment
- Segments: Budget + General (broad appeal)
- Expected impact: ~0.9% combined

**Sponsorships:**
- Skip (save cash for production)
- Or: 1 low-cost option (Influencer $3M)

**Expected Costs:**
- Branding: $8M
- Advertising: $6M
- **Total:** $14M

**Expected Results:**
- Brand value: 0.20-0.25
- Awareness in target segments: Moderate
- Market share: 8-12%

---

### Mid Game (Rounds 3-5)
**Objectives:**
- Grow brand to 0.40-0.50
- Dominate 1-2 segments with targeted campaigns
- Begin sponsorship investments

**Branding Strategy:**
- Investment: $15-20M/round
- Hitting diminishing returns zone (log curve)
- Expected growth: 2.0-2.5%/round
- Target brand by Round 5: 0.45-0.55

**Advertising Strategy:**
- Budget: $8-10M per segment
- Focus: 2-3 segments where products are strong
- Avoid over-spending (diminishing returns after $9M)

**Sponsorships:**
- Budget: $10-15M/round
- Options:
  - Tech Conference ($7.5M) for Professional
  - Gaming Tournament ($4.5M) for Enthusiast
  - Retailer Partnership ($12M) for Budget

**Expected Costs:**
- Branding: $20M
- Advertising: $24M (3 segments × $8M)
- Sponsorships: $12M
- **Total:** $56M/round

**Brand Maintenance:**
- Brand 0.50 decays 3.25%/round
- Requires $13M branding just to maintain
- Growth spend: Additional $7M

---

### Late Game (Rounds 6-8)
**Objectives:**
- Maintain brand 0.50-0.70 (sweet spot)
- Optimize spend efficiency
- Defend market position

**Branding Strategy:**
- Maintenance: $15-20M
- Growth (if needed): +$5-10M
- Target: Hold 0.60-0.70 steady

**Advertising Strategy:**
- Selective: Only segments under competitive pressure
- Budget: $5M/segment for defense
- Avoid wasteful spending

**Sponsorships:**
- Big plays: National TV ($35M) if pushing for #1
- Or: Strategic segment sponsorships

**Defensive Spending:**
- If competitor threatens segment:
  - Ad blitz: $10-15M
  - Promotion: 15% discount
  - Sponsorship: Segment-specific

**Expected Costs (Maintenance Mode):**
- Branding: $18M
- Advertising: $15M (3 segments × $5M)
- Sponsorships: $10M
- **Total:** $43M/round

**Expected Costs (Growth Mode):**
- Branding: $25M
- Advertising: $30M
- Sponsorships: $35M (National TV)
- **Total:** $90M/round

---

### Marketing Decision Matrix

| Scenario | Action | Budget | Rationale |
|----------|--------|--------|-----------|
| Early game growth | Branding focus | $8M | Efficient brand building |
| Mid game expansion | Branding + targeted ads | $40M | Balanced approach |
| Late game defense | Maintenance branding | $20M | Hold position |
| Competitive threat | Ad blitz + promotion | $25M | Defend share |
| Product launch | Sponsorship + ads | $25M | Awareness burst |
| Low cash | Minimal branding | $5M | Survive decay |
| Brand >0.70 | Reduce to maintenance | $15M | Diminishing returns |
| New segment entry | Advertising focus | $8M/seg | Build awareness |

---

# R&D Module Deep Dive

## R&D Module Core (453 lines)

**Location:** `src/engine/modules/RDModule.ts`
**Primary Responsibilities:**
- Product development (new products)
- Product improvements (quality/features)
- R&D budget management
- Patent generation
- Engineer productivity calculation

### Architecture Overview

```
RDModule
├── Product Development
│   ├── New product creation
│   ├── Development progress tracking
│   ├── Ramp-up to target quality
│   └── Launch readiness
├── Product Improvement
│   ├── Quality enhancements
│   ├── Feature additions
│   └── Cost calculation
├── Engineer System
│   ├── R&D point generation
│   ├── Stat-based output
│   └── Innovation bonuses
└── Patent System
    ├── Patent accumulation
    ├── Competitive bonuses
    └── Cost reductions
```

---

## R&D Module Line-by-Line Breakdown

### Section 1: Product Development (Lines 88-134, 217-313)

#### **Lines 88-134: New Product Development**
```typescript
if (decisions.newProducts) {
  for (const productSpec of decisions.newProducts) {
    const developmentCost = this.calculateDevelopmentCost(productSpec.segment, productSpec.targetQuality);
    const engineerCount = newState.employees.filter(e => e.role === "engineer").length;
    const roundsToComplete = this.calculateDevelopmentRounds(
      productSpec.targetQuality,
      engineerCount
    );

    const newProduct = this.createProduct(
      productSpec.name,
      productSpec.segment,
      productSpec.targetQuality,
      productSpec.targetFeatures,
      roundsToComplete,
      ctx
    );
    newState.products.push(newProduct);
    totalCosts += developmentCost;
  }
}

// Progress existing in-development products
for (const product of newState.products) {
  if (product.developmentStatus === "in_development") {
    product.roundsRemaining = Math.max(0, product.roundsRemaining - 1);
    product.developmentProgress = Math.min(100, product.developmentProgress + (100 / (product.roundsRemaining + 1)));

    if (product.roundsRemaining === 0) {
      product.developmentStatus = "ready";
      product.quality = product.targetQuality;
      product.features = product.targetFeatures;
    }
  }
}
```

**Development Lifecycle:**
1. **Initiation:** Pay development cost, product enters "in_development" status
2. **Progress:** Product advances each round toward completion
3. **Completion:** Product reaches "ready" status, full quality/features unlocked

---

#### **Lines 217-235: Development Cost Calculation**
```typescript
static calculateDevelopmentCost(segment: Segment, targetQuality: number): number {
  const baseCosts: Record<Segment, number> = {
    "Budget": 5_000_000,
    "General": 10_000_000,
    "Enthusiast": 20_000_000,
    "Professional": 35_000_000,
    "Active Lifestyle": 15_000_000,
  };

  const baseCost = baseCosts[segment];
  const qualityMultiplier = 1 + (targetQuality - 50) / 50;  // 0.5x to 2x

  return Math.round(baseCost × qualityMultiplier);
}
```

**Formula:** `base_cost × (1 + (quality - 50) / 50)`

**Development Cost Table:**

| Segment | Base Cost | Q=50 | Q=70 | Q=85 | Q=100 |
|---------|-----------|------|------|------|-------|
| Budget | $5M | $5M | $7M | $8.5M | $10M |
| General | $10M | $10M | $14M | $17M | $20M |
| Active Lifestyle | $15M | $15M | $21M | $25.5M | $30M |
| Enthusiast | $20M | $20M | $28M | $34M | $40M |
| Professional | $35M | $35M | $49M | $59.5M | $70M |

**Examples:**

**Budget Product, Quality 70:**
- Base: $5M
- Multiplier: 1 + (70-50)/50 = 1.4
- **Cost:** $5M × 1.4 = **$7M**

**Professional Product, Quality 90:**
- Base: $35M
- Multiplier: 1 + (90-50)/50 = 1.8
- **Cost:** $35M × 1.8 = **$63M**

**Strategic Insight:** Professional segment products at high quality are 12-14× more expensive than Budget products. Choose segments wisely.

---

#### **Lines 244-262: Development Time Calculation**
```typescript
static calculateDevelopmentRounds(
  targetQuality: number,
  engineerCount: number
): number {
  const baseRounds = 2;  // PRODUCT_DEV_BASE_ROUNDS
  const qualityFactor = Math.max(0, targetQuality - 50) × 0.02;  // PRODUCT_DEV_QUALITY_FACTOR
  const engineerSpeedup = Math.min(0.5, engineerCount × 0.05);  // PRODUCT_DEV_ENGINEER_SPEEDUP (capped 50%)

  const totalRounds = (baseRounds + qualityFactor) × (1 - engineerSpeedup);

  return Math.max(1, Math.round(totalRounds));
}
```

**Formula:**
```
quality_factor = max(0, target_quality - 50) × 0.02
engineer_speedup = min(0.5, engineer_count × 0.05)
total_rounds = (2 + quality_factor) × (1 - engineer_speedup)
```

**Development Time Table:**

| Quality | No Engineers | 5 Engineers | 10 Engineers | 15+ Engineers |
|---------|--------------|-------------|--------------|---------------|
| 50 | 2 rounds | 2 rounds | 1 round | 1 round |
| 60 | 2 rounds | 2 rounds | 1 round | 1 round |
| 70 | 2 rounds | 2 rounds | 2 rounds | 1 round |
| 80 | 3 rounds | 2 rounds | 2 rounds | 1 round |
| 90 | 3 rounds | 2 rounds | 2 rounds | 2 rounds |
| 100 | 3 rounds | 3 rounds | 2 rounds | 2 rounds |

**Examples:**

**Quality 70, 8 Engineers:**
- Base: 2 rounds
- Quality factor: (70-50) × 0.02 = 0.4 rounds
- Subtotal: 2.4 rounds
- Engineer speedup: 8 × 0.05 = 0.4 (40%)
- **Total:** 2.4 × 0.6 = **1.44 → 1 round**

**Quality 90, 12 Engineers:**
- Base: 2 rounds
- Quality factor: (90-50) × 0.02 = 0.8 rounds
- Subtotal: 2.8 rounds
- Engineer speedup: 12 × 0.05 = 0.6 → **capped at 0.5** (50%)
- **Total:** 2.8 × 0.5 = **1.4 → 1 round**

**Quality 100, 5 Engineers:**
- Base: 2 rounds
- Quality factor: (100-50) × 0.02 = 1.0 rounds
- Subtotal: 3.0 rounds
- Engineer speedup: 5 × 0.05 = 0.25 (25%)
- **Total:** 3.0 × 0.75 = **2.25 → 2 rounds**

**Strategic Insights:**
1. **10+ engineers** hit the speedup cap (50%) for most products
2. **Quality 70-80** products develop in 1-2 rounds with good engineering team
3. **Quality 100** always takes 2+ rounds, even with max engineers
4. Diminishing returns on engineers beyond 10-12

---

#### **Lines 273-313: Product Creation**
```typescript
static createProduct(
  name: string,
  segment: Segment,
  targetQuality: number,
  targetFeatures: number,
  roundsToComplete: number,
  ctx?: EngineContext
): Product {
  // Products start at 50% of target during development
  const startingQuality = Math.round(targetQuality × 0.5);
  const startingFeatures = Math.round(targetFeatures × 0.5);

  // Calculate unit cost
  const materialCost = CONSTANTS.RAW_MATERIAL_COST_PER_UNIT[segment];
  const laborCost = 20;      // LABOR_COST_PER_UNIT
  const overheadCost = 15;   // OVERHEAD_COST_PER_UNIT
  const qualityPremium = (targetQuality - 50) × 0.5;
  const unitCost = materialCost + laborCost + overheadCost + qualityPremium;

  return {
    id: ctx ? ctx.idGenerator.next("product") : fallback_id,
    name,
    segment,
    price: this.suggestPrice(segment, targetQuality),
    quality: startingQuality,
    features: startingFeatures,
    reliability: 50,  // Low during development
    developmentStatus: "in_development",
    developmentProgress: 0,
    targetQuality,
    targetFeatures,
    roundsRemaining: roundsToComplete,
    unitCost,
  };
}
```

**Unit Cost Formula:**
```
material_cost = segment_material_cost
labor_cost = $20
overhead_cost = $15
quality_premium = (target_quality - 50) × $0.50
unit_cost = material + labor + overhead + premium
```

**Unit Cost by Segment:**

| Segment | Material | Labor | Overhead | Q=50 Premium | Q=70 Premium | Q=90 Premium | Total (Q=70) |
|---------|----------|-------|----------|--------------|--------------|--------------|--------------|
| Budget | $50 | $20 | $15 | $0 | $10 | $20 | **$95** |
| General | $100 | $20 | $15 | $0 | $10 | $20 | **$145** |
| Active Lifestyle | $150 | $20 | $15 | $0 | $10 | $20 | **$195** |
| Enthusiast | $200 | $20 | $15 | $0 | $10 | $20 | **$245** |
| Professional | $350 | $20 | $15 | $0 | $10 | $20 | **$395** |

**Strategic Insight:** Unit costs vary 4× across segments. Price accordingly or go negative margin.

---

### Section 2: Product Improvements (Lines 136-161, 237-243)

#### **Lines 136-161: Improvement Processing**
```typescript
if (decisions.productImprovements) {
  for (const improvement of decisions.productImprovements) {
    const product = newState.products.find(p => p.id === improvement.productId);
    if (product) {
      const improvementCost = this.calculateImprovementCost(
        improvement.qualityIncrease || 0,
        improvement.featuresIncrease || 0
      );

      if (newState.cash >= improvementCost && newState.rdProgress >= (improvement.qualityIncrease || 0) × 10) {
        if (improvement.qualityIncrease) {
          product.quality = Math.min(100, product.quality + improvement.qualityIncrease);
        }
        if (improvement.featuresIncrease) {
          product.features = Math.min(100, product.features + improvement.featuresIncrease);
        }
        newState.rdProgress -= (improvement.qualityIncrease || 0) × 10;
        totalCosts += improvementCost;
      }
    }
  }
}
```

**Requirements:**
1. **Cash:** Must afford improvement cost
2. **R&D Progress:** Need 10 points per quality point increase

---

#### **Lines 237-243: Improvement Cost**
```typescript
static calculateImprovementCost(qualityIncrease: number, featuresIncrease: number): number {
  return qualityIncrease × 1_000_000 + featuresIncrease × 500_000;
}
```

**Formula:**
- **Quality:** $1M per point
- **Features:** $500K per point

**Improvement Cost Table:**

| Quality Increase | Feature Increase | Total Cost |
|------------------|------------------|------------|
| +5 | +0 | $5M |
| +10 | +0 | $10M |
| +5 | +5 | $7.5M |
| +10 | +10 | $15M |
| +15 | +0 | $15M |
| +10 | +20 | $20M |

**Examples:**

**Upgrade Product from 70 → 85 Quality:**
- Quality increase: +15
- Cost: 15 × $1M = **$15M**
- R&D points needed: 15 × 10 = **150 points**

**Upgrade Product Features 60 → 80:**
- Feature increase: +20
- Cost: 20 × $500K = **$10M**
- R&D points needed: **0** (features don't consume R&D)

**Combined Upgrade (Q+10, F+10):**
- Cost: $10M + $5M = **$15M**
- R&D points: 100 points

---

### Section 3: Engineer R&D Output (Lines 83-87, 192-214)

#### **Lines 83-87: Engineer Processing**
```typescript
const engineers = newState.employees.filter(e => e.role === "engineer");
const rdOutput = this.calculateTotalRDOutput(engineers);
newState.rdProgress += rdOutput;
messages.push(`Engineers generated ${rdOutput.toFixed(0)} R&D points`);
```

---

#### **Lines 192-214: R&D Output Calculation**
```typescript
static calculateTotalRDOutput(engineers: TeamState["employees"]): number {
  let totalOutput = 0;

  for (const engineer of engineers) {
    const stats = engineer.stats as EngineerStats;
    const basePoints = 10;  // BASE_RD_POINTS_PER_ENGINEER
    const efficiencyMultiplier = stats.efficiency / 100;
    const speedMultiplier = stats.speed / 100;
    const innovationBonus = 1 + (stats.innovation || 50) / 200;
    const burnoutPenalty = 1 - (engineer.burnout / 200);

    totalOutput += basePoints × efficiencyMultiplier × speedMultiplier × innovationBonus × burnoutPenalty;
  }

  return totalOutput;
}
```

**Formula:**
```
per_engineer_output = 10 × (efficiency / 100) × (speed / 100) × (1 + innovation / 200) × (1 - burnout / 200)
total_output = sum(all_engineers)
```

**Engineer Output Table:**

| Efficiency | Speed | Innovation | Burnout | Output | Notes |
|------------|-------|------------|---------|--------|-------|
| 50 | 50 | 50 | 0 | 3.1 pts | Below average |
| 70 | 70 | 70 | 0 | 6.0 pts | Average |
| 85 | 85 | 85 | 0 | 8.7 pts | Good |
| 95 | 95 | 95 | 0 | 10.8 pts | Elite |
| 95 | 95 | 95 | 50 | 9.5 pts | Elite but burned out |
| 100 | 100 | 100 | 0 | 15.0 pts | Theoretical max |

**Team Output Examples:**

**Team of 10 Engineers (70/70/70 stats):**
- Per-engineer: 6.0 pts
- **Total:** 60 pts/round

**Team of 15 Engineers (85/85/85 stats):**
- Per-engineer: 8.7 pts
- **Total:** 130 pts/round

**Mixed Team (5 elite @ 10.8 pts, 10 average @ 6.0 pts):**
- Elite contribution: 5 × 10.8 = 54 pts
- Average contribution: 10 × 6.0 = 60 pts
- **Total:** 114 pts/round

**R&D Points Usage:**

| Activity | R&D Points Consumed |
|----------|---------------------|
| Quality +1 | 10 points |
| Quality +5 | 50 points |
| Quality +10 | 100 points |
| Patent | 500 points |
| Features | 0 points (cash only) |

**Strategic Insight:** 10 average engineers produce 60 pts/round = 1 patent every 8.3 rounds OR quality +6/round.

---

### Section 4: Patents (Lines 163-168, 386-400)

#### **Lines 163-168: Patent Generation**
```typescript
if (newState.rdProgress >= 500) {
  newState.patents += 1;
  newState.rdProgress -= 500;
  messages.push(`New patent acquired! (Total: ${newState.patents})`);
}
```

**Patent Cost:** 500 R&D points

**Accumulation Timeline (10 engineers @ 60 pts/round):**
- Round 1: 60 pts
- Round 2: 120 pts
- ...
- Round 8: 480 pts
- **Round 9:** 540 pts → 1 patent (40 pts remain)

---

#### **Lines 386-400: Patent Value**
```typescript
static calculatePatentValue(patents: number): {
  qualityBonus: number;
  costReduction: number;
  marketShareBonus: number;
}
```

**Formula:**
```
quality_bonus = min(10, patents × 2)
cost_reduction = min(0.15, patents × 0.03)
market_share_bonus = min(0.05, patents × 0.01)
```

**Patent Benefit Table:**

| Patents | Quality Bonus | Cost Reduction | Market Share Bonus | Notes |
|---------|---------------|----------------|--------------------|-------|
| 0 | +0 | 0% | +0% | No benefits |
| 1 | +2 | 3% | +1% | First patent |
| 3 | +6 | 9% | +3% | Moderate portfolio |
| 5 | +10 (cap) | 15% (cap) | +5% (cap) | **All caps hit** |
| 10 | +10 (cap) | 15% (cap) | +5% (cap) | No further benefit |

**Strategic Insights:**
1. **5 patents** = full benefits (further patents wasted)
2. **Quality bonus:** +10 is massive (70 → 80 quality product)
3. **Cost reduction:** 15% on all products (compound savings)
4. **Market share:** +5% is ~$10-20M revenue/round

**Patent ROI Calculation:**

**Cost to accumulate 5 patents:**
- R&D points needed: 5 × 500 = 2,500 points
- With 10 engineers @ 60 pts/round: 2,500 / 60 = **41.7 rounds**
- With 20 engineers @ 120 pts/round: 2,500 / 120 = **20.8 rounds**

**Value of 5 patents:**
- Quality bonus: Worth ~$15M in development cost savings
- Cost reduction: 15% on all production (ongoing)
- Market share: +5% = ~$15M revenue/round

**Break-even:** ~5-10 rounds after achieving 5 patents (depending on production scale).

---

### Section 5: Pricing (Lines 315-331)

#### **Lines 315-331: Price Suggestion**
```typescript
static suggestPrice(segment: Segment, quality: number): number {
  const basePrices: Record<Segment, { min: number; max: number }> = {
    "Budget": { min: 100, max: 300 },
    "General": { min: 300, max: 600 },
    "Enthusiast": { min: 600, max: 1000 },
    "Professional": { min: 1000, max: 1500 },
    "Active Lifestyle": { min: 400, max: 800 },
  };

  const range = basePrices[segment];
  const qualityFactor = quality / 100;

  return Math.round(range.min + (range.max - range.min) × qualityFactor);
}
```

**Formula:** `min_price + (max_price - min_price) × (quality / 100)`

**Suggested Pricing Table:**

| Segment | Q=50 | Q=60 | Q=70 | Q=80 | Q=90 | Q=100 |
|---------|------|------|------|------|------|-------|
| Budget | $200 | $220 | $240 | $260 | $280 | $300 |
| General | $450 | $480 | $510 | $540 | $570 | $600 |
| Active Lifestyle | $600 | $640 | $680 | $720 | $760 | $800 |
| Enthusiast | $800 | $840 | $880 | $920 | $960 | $1000 |
| Professional | $1250 | $1300 | $1350 | $1400 | $1450 | $1500 |

**Margin Analysis (Q=70):**

| Segment | Suggested Price | Unit Cost | Margin | Margin % |
|---------|----------------|-----------|--------|----------|
| Budget | $240 | $95 | $145 | 60% |
| General | $510 | $145 | $365 | 72% |
| Active Lifestyle | $680 | $195 | $485 | 71% |
| Enthusiast | $880 | $245 | $635 | 72% |
| Professional | $1350 | $395 | $955 | 71% |

**Strategic Insight:** Suggested prices yield 60-72% margins at quality 70. Safe to follow suggestions or price 5-10% higher for premium positioning.

---

## R&D Formulas Reference

| Formula | Equation | Purpose |
|---------|----------|---------|
| **Development Cost** | `base × (1 + (quality - 50) / 50)` | New product cost |
| **Development Time** | `(2 + quality_factor) × (1 - engineer_speedup)` | Rounds to complete |
| **Quality Factor** | `max(0, quality - 50) × 0.02` | Time penalty for quality |
| **Engineer Speedup** | `min(0.5, engineer_count × 0.05)` | Max 50% reduction |
| **Improvement Cost** | `quality × $1M + features × $500K` | Upgrade cost |
| **Engineer Output** | `10 × eff × spd × (1 + innov/200) × (1 - burn/200)` | R&D points/engineer |
| **Patent Benefits** | `min(cap, patents × multiplier)` | Competitive advantage |
| **Unit Cost** | `material + $20 + $15 + (quality - 50) × $0.5` | Production cost |
| **Suggested Price** | `min + (max - min) × quality / 100` | Pricing guidance |

### Development Bases by Segment

| Segment | Dev Cost Base | Material Cost | Price Range |
|---------|---------------|---------------|-------------|
| Budget | $5M | $50 | $100-300 |
| General | $10M | $100 | $300-600 |
| Active Lifestyle | $15M | $150 | $400-800 |
| Enthusiast | $20M | $200 | $600-1000 |
| Professional | $35M | $350 | $1000-1500 |

---

## R&D Phase 8 Expansions

The plan document (Phase 8) outlines advanced R&D mechanics:

### 8.1 Tech Tree / Feature Families

**Current State:** Products are independent
**Planned Enhancement:**
```typescript
interface TechNode {
  id: string;
  family: 'battery' | 'camera' | 'ai' | 'durability' | 'display' | 'connectivity';
  tier: 1 | 2 | 3;
  prerequisites: string[];
  researchCost: number;
  researchRounds: number;
  effects: TechEffect[];
}
```

**Example Tech Tree (Battery Family):**
- **Tier 1:** Extended Battery ($5M, 2 rounds) → +5 quality
- **Tier 2:** Fast Charging ($10M, 3 rounds, requires Tier 1) → +8 quality, unlock feature
- **Tier 3:** Solid State Battery ($25M, 4 rounds, requires Tier 2) → +15 quality, -10% cost

**Strategic Impact:** Tech trees create long-term R&D strategies. Early investments unlock powerful late-game bonuses.

---

### 8.2 Platform Strategy

**Current State:** Each product developed independently
**Planned Enhancement:**
```typescript
interface Platform {
  id: string;
  investmentCost: number;        // $50M upfront
  developedSegments: Segment[];
  costReduction: number;         // 20-40% savings
  devSpeedBonus: number;         // 20-30% faster
  qualityFloor: number;          // Minimum quality
}
```

**Platform Economics:**
- **Initial investment:** $50M
- **Per-product savings:** 30% cost reduction
- **Break-even:** ~3-4 products on platform

**Example:**
- Platform investment: $50M
- Product 1 (Professional, Q=80): Normal cost $63M → Platform cost $44M (save $19M)
- Product 2 (Enthusiast, Q=80): Normal cost $34M → Platform cost $24M (save $10M)
- Product 3 (General, Q=80): Normal cost $17M → Platform cost $12M (save $5M)
- **Total saved:** $34M vs $50M investment → Break-even after Product 3

**Strategic Impact:** Platform strategy pays off for companies developing 4+ products.

---

### 8.3 R&D Risk Mechanic

**Current State:** Development is deterministic
**Planned Enhancement:**
```typescript
interface RDProject {
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  delayProbability: number;
  overrunProbability: number;
}
```

**Risk Calculation:**
- **Conservative (Q ≤ 70):** 5% delay, 10% overrun
- **Moderate (Q 71-85):** 10% delay, 20% overrun
- **Aggressive (Q 86-100):** 15% delay, 30% overrun

**Example:**
- Aggressive project (Q=95): 15% chance of +1 round delay, 30% chance of +20% cost
- Expected cost: $60M × 1.06 = **$63.6M** (risk premium)
- Expected time: 2 rounds × 1.15 = **2.3 rounds**

**Strategic Impact:** High-quality products are risky. Build buffer time and budget.

---

### 8.4 Research Spillover

**Current State:** Product improvements are isolated
**Planned Enhancement:**
```typescript
function applySpillover(improvedProduct: Product, allProducts: Product[]) {
  for (const other of allProducts) {
    if (other.segment === improvedProduct.segment && other.id !== improvedProduct.id) {
      const spillover = 0.2;  // 20% transfer
      other.quality += improvedProduct.qualityGain × spillover;
      other.features += improvedProduct.featureGain × spillover;
    }
  }
}
```

**Example:**
- Improve Budget Phone A: Q+10
- Spillover to Budget Phone B: +2 quality (20% of +10)
- Spillover to General Phone C: +0 (different segment)

**Strategic Impact:** Multi-product portfolios in same segment benefit from shared R&D.

---

## R&D Strategic Guide

### Early Game (Rounds 1-2)
**Objectives:**
- Launch 2-3 products in key segments
- Build engineering team (10-12 engineers)
- Target quality 65-75 (affordable, fast)

**Product Strategy:**
- **Product 1:** Budget or General segment (low cost, quick to market)
  - Target: Q=70, F=60
  - Cost: $7-14M
  - Time: 1-2 rounds
- **Product 2:** Active Lifestyle or Enthusiast (differentiation)
  - Target: Q=70, F=65
  - Cost: $21-28M
  - Time: 1-2 rounds

**Engineering Strategy:**
- Hire: 10 engineers @ 70/70/70 stats
- Expected output: 60 R&D pts/round
- Focus: Development speed over patents

**R&D Budget:**
- Year 1: $5-10M (base R&D investment)
- Development costs: $28-42M total
- **Total:** $33-52M

**Expected Results:**
- 2 products ready by Round 2-3
- Quality 65-75 competitive in 2 segments
- R&D progress: 120-180 points (partial patent)

---

### Mid Game (Rounds 3-5)
**Objectives:**
- Expand to 4-5 products (broad portfolio)
- Improve flagship products to Q=80-85
- Accumulate 2-3 patents
- Scale engineering to 15-20

**Product Strategy:**
- **New products:** Fill segment gaps (Professional if missing)
- **Improvements:** +10-15 quality on best sellers
  - Cost: $10-15M per product
  - R&D points: 100-150 points

**Engineering Strategy:**
- Scale to 15-20 engineers
- Target: 90-120 R&D pts/round
- Focus: Balance patents + improvements

**R&D Budget:**
- Annual: $15-20M
- Improvements: $20-30M
- New products: $30-50M
- **Total:** $65-100M/round

**Patent Timeline:**
- Round 3: 240-360 pts → Close to 1st patent
- Round 4: 360-480 pts → 1st patent acquired
- Round 5: 480-600 pts → 2nd patent acquired

**Expected Results:**
- 4-5 products covering all major segments
- Flagship products at Q=80-85
- 2 patents (+4 quality, 6% cost reduction)
- Market-leading quality in 2-3 segments

---

### Late Game (Rounds 6-8)
**Objectives:**
- Maintain 5 patents (full bonuses)
- Optimize product quality (Q=85-90)
- Defend market position with innovation

**Product Strategy:**
- **Premium products:** Q=90+ in Professional/Enthusiast
- **Volume products:** Q=80-85 in Budget/General
- **Continuous improvement:** +5 quality/round on flagships

**Engineering Strategy:**
- Maintain 20-25 elite engineers (85+ stats)
- Expected output: 150-200 R&D pts/round
- Focus: Maintain 5 patents, fuel improvements

**R&D Budget:**
- Annual: $20-25M (maintain talent)
- Improvements: $15-25M (Q+5 on 3-5 products)
- **Total:** $35-50M/round

**Patent Strategy:**
- Maintain 5 patents (any excess R&D → improvements)
- 5 patents = +10 quality, 15% cost reduction, +5% market share

**Expected Results:**
- Portfolio of 5 products at Q=85-90
- 15% cost advantage (patents)
- +10 quality bonus (patents) = effective Q=95-100
- Market dominance through innovation

---

### R&D Decision Matrix

| Scenario | Action | Investment | Rationale |
|----------|--------|------------|-----------|
| Early game | 2 products Q=70 | $30-40M | Fast to market |
| Segment gap | New product | $10-35M | Portfolio completion |
| Competitive threat | Improve flagship Q+10 | $10M | Defend position |
| Low R&D points | Hire 5 engineers | $0.6M/round | Boost output |
| 450 R&D points | Wait for patent | $0 | Maximize efficiency |
| 5 patents achieved | Stop patent focus | $0 | Diminishing returns |
| Low cash | Delay improvements | $0 | Conserve resources |
| Q<65 product | Improve Q+15 | $15M | Catch up to market |
| Q>90 product | Minor tweaks only | $5M | Overinvestment risk |

---

# Cross-Module Integration

## HR-Marketing Synergies

### 1. Employee Brand Ambassadors
**Mechanic:** High-morale employees boost brand value
**Formula:** `brand_boost = avg_morale / 100 × 0.01` (up to +1% brand)

**Example:**
- 100 employees @ 80 morale → +0.8% brand/round
- Value: ~$5-8M in free brand growth

**Strategy:** Invest in morale for dual benefit (retention + brand).

---

### 2. Marketing Team Efficiency
**Mechanic:** Supervisors with high leadership boost marketing effectiveness
**Formula:** `marketing_effectiveness = 1.0 + supervisor_leadership / 1000`

**Example:**
- Supervisor @ 100 leadership → +10% marketing ROI
- $20M branding becomes $22M effective (2.4% vs 2.2% impact)

**Strategy:** Assign top supervisor to marketing department.

---

### 3. Customer-Facing Training
**Mechanic:** Worker training improves customer satisfaction, indirectly boosting brand
**Formula:** `satisfaction_bonus = avg_worker_efficiency / 200`

**Example:**
- Workers @ 80 efficiency → +0.4 satisfaction
- Satisfaction → +0.5% brand via word-of-mouth

**Strategy:** Training workers has indirect marketing value.

---

## R&D-Marketing Synergies

### 1. Product Innovation Halo
**Mechanic:** High-quality products boost brand value through "halo effect"
**Formula:** `halo_effect = (avg_product_quality - 70) / 100 × 0.01`

**Example:**
- Portfolio avg Q=85 → +0.15% brand/round
- 5-product portfolio → +0.75% brand/round

**Strategy:** Quality products are free marketing.

---

### 2. Patent PR Value
**Mechanic:** Patents generate press coverage, boosting brand
**Formula:** `patent_brand_boost = new_patents × 0.005` (0.5% per patent)

**Example:**
- Acquire 2 patents in one round → +1.0% brand
- Equivalent to $4M branding spend

**Strategy:** Time patent announcements with marketing campaigns.

---

### 3. Product Launch Synergy
**Mechanic:** New product launches are amplified by marketing spend
**Formula:** `launch_amplification = 1.0 + marketing_spend / 50M`

**Example:**
- New product launch + $10M marketing → +20% awareness boost
- Typical launch: 5% market share → Boosted launch: 6% market share

**Strategy:** Coordinate R&D launches with marketing budgets.

---

## HR-R&D Synergies

### 1. Engineer Innovation Breeding
**Mechanic:** Engineers with high innovation train junior engineers faster
**Formula:** `training_speedup = mentor_innovation / 200`

**Example:**
- Mentor @ 90 innovation → +45% training speed
- Junior engineer reaches full productivity in 1.5 rounds vs 2

**Strategy:** Pair star engineers with new hires.

---

### 2. R&D Team Morale
**Mechanic:** High morale engineers have higher innovation stat effectiveness
**Formula:** `innovation_effectiveness = base_innovation × (1 + (morale - 50) / 200)`

**Example:**
- Engineer @ 80 innovation, 80 morale → effective innovation = 80 × 1.15 = 92
- Extra output: 6.8 → 7.4 R&D pts/round

**Strategy:** Morale investments in R&D team have outsized impact.

---

### 3. Cross-Training Benefits
**Mechanic:** Workers trained in R&D concepts reduce defect rates
**Formula:** `defect_reduction = workers_with_rd_training / total_workers × 0.05`

**Example:**
- 50 workers trained → 50% of workforce → 2.5% defect reduction
- Defect reduction → brand protection

**Strategy:** Invest in cross-functional training programs.

---

## Three-Module Master Strategies

### Strategy 1: Innovation Dominance
**Focus:** R&D leadership drives marketing and HR
**Investments:**
- R&D: 40% of budget
- HR: 35% (elite engineers)
- Marketing: 25% (leverage quality halo)

**Execution:**
1. Build 20+ elite engineers (85+ innovation)
2. Rush to 5 patents by Round 4
3. Launch Q=90+ products with modest marketing
4. Quality + patents create self-sustaining brand

**Expected Results:**
- Round 8: Q=95+ products, 5 patents, 0.65 brand
- Market share: 35-45%

---

### Strategy 2: Brand Empire
**Focus:** Marketing drives demand, HR supports scale, R&D provides competitive products
**Investments:**
- Marketing: 45% of budget
- HR: 30% (scale workforce)
- R&D: 25% (competitive parity)

**Execution:**
1. Invest $20-30M/round in branding (Rounds 1-5)
2. Target 0.70+ brand by Round 6
3. Develop Q=75-80 products (good enough with strong brand)
4. Scale production with large workforce

**Expected Results:**
- Round 8: 0.75 brand, Q=80 products, 40-50% market share

---

### Strategy 3: People-First Excellence
**Focus:** Elite HR drives both R&D and marketing effectiveness
**Investments:**
- HR: 45% (premium talent + benefits)
- R&D: 30% (quality engineers)
- Marketing: 25% (efficient spending)

**Execution:**
1. Hire top 5% talent (premium tier recruitment)
2. Offer best-in-class benefits (morale 85+)
3. Engineers at 90+ stats → 10+ pts/round/engineer
4. High morale → brand ambassadors → free marketing

**Expected Results:**
- Round 8: <5% turnover, 90+ morale, 130+ R&D pts/round, 0.60 brand

---

**End of Document**

*This comprehensive deep-dive covers all aspects of the HR, Marketing, and R&D modules. Use in conjunction with the Finance & Factory deep-dive for complete engine understanding.*
