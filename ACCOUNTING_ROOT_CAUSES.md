# SIMSIM Accounting Reconciliation — Root Cause Analysis

## What Capsim Does (Gold Standard)

Capsim uses a **single-ledger double-entry system:**

```
CAPSIM APPROACH:
  1. Every transaction is recorded ONCE as a journal entry
     Debit: Cash +$10M
     Credit: Long-Term Debt +$10M

  2. Income Statement = filtered view of revenue/expense entries
  3. Balance Sheet = sum of all asset/liability/equity accounts
  4. Cash Flow Statement = derived from changes in BS accounts

  Result: ALL THREE STATEMENTS come from the SAME data.
  They CANNOT disagree because they're different views of one ledger.
```

**SIMSIM's approach (the problem):**
```
SIMSIM APPROACH:
  1. SimulationEngine.processRound() modifies state.cash, state.revenue, etc.
  2. IncomeStatementEngine.generate(state) RECALCULATES revenue/costs from state
  3. BalanceSheetEngine.generate(state) RECALCULATES assets/liabilities from state
  4. CashFlowEngine.generate(state, IS, BS) DERIVES cash flows from IS + BS changes

  Result: THREE INDEPENDENT CALCULATIONS from the same state.
  They CAN disagree because each makes different assumptions.
```

## Root Cause #1: Equity Gap ($130M)

**The problem:**
```
BS calculates equity as:
  commonStock = sharesIssued × $10 par = $100,000,000
  + APIC = $0
  + retainedEarnings = IS.netIncome - dividends = $58M (ROUND 1 ONLY)
  + treasuryStock = $0
  = $158M

But actual equity should be:
  Starting equity = $175M cash + $50M factory + $225M
  + net income this round
  = ~$289M (matches state.shareholdersEquity)

MISSING: $130M = starting equity ($225M) - commonStock ($100M) + adjustments
```

**Root cause:** `retainedEarnings` starts from $0 on round 1 (no `previousBalance` to carry forward). But the company was FOUNDED with $225M equity — that founding equity should be the starting retained earnings (or APIC).

**Capsim fix:** Capsim initializes `retainedEarnings = startingCash + startingAssets - commonStock - debt` at game start. This captures the founding equity.

**SIMSIM fix:**
```typescript
// In BalanceSheetEngine.calculateEquity():
const previousRetainedEarnings = previousBalance?.equity.retainedEarnings
  || (state.totalAssets - state.totalLiabilities - commonStock - additionalPaidInCapital);
// ↑ On round 1, derive initial retained earnings from accounting equation
```

## Root Cause #2: State.netIncome ≠ IS.netIncome ($12.7M gap)

**The problem:**
```
State.netIncome = $45,495,112  (calculated during processRound)
IS.netIncome    = $58,176,578  (calculated by IncomeStatementEngine)
DIFF            = $12,681,466
```

**Root cause:** SimulationEngine calculates `state.netIncome` using its own logic during round processing:
- It sums module costs (factory, HR, marketing, R&D spending)
- Subtracts from revenue
- Stores result as `state.netIncome`

But IncomeStatementEngine.generate() recalculates from state fields:
- It derives COGS from `product.unitsSold × product.unitCost`
- It derives opex from employee counts × salary rates
- It calculates interest, taxes independently

These two calculations use DIFFERENT inputs and produce DIFFERENT results.

**Capsim fix:** Capsim has ONE net income calculation, not two. The IS IS the calculation — there's no separate `state.netIncome`.

**SIMSIM fix:** Either:
- Option A: Remove `state.netIncome` and always read from `financialStatements.incomeStatement.netIncome`
- Option B: Set `state.netIncome = IS.netIncome` after generating statements (make IS authoritative)

## Root Cause #3: State.revenue ≠ IS.revenue ($10.3M gap)

**The problem:**
```
State.revenue = $118,045,200  (set during market simulation)
IS.revenue    = $128,310,000  (recalculated from products)
```

**Root cause:** Market simulation sets `state.revenue` from `unitsSold × price` during market allocation. But IncomeStatementEngine recalculates it from `state.products[].unitsSold × state.products[].price`. If ANY product field was modified between market sim and IS generation (e.g., price changed by promotions), the totals differ.

**SIMSIM fix:** IS should READ `state.revenue` instead of recalculating, or revenue should be set from IS after generation.

## Root Cause #4: BS Liabilities ≠ State Liabilities ($238K vs $0)

**The problem:**
```
State.totalLiabilities = $0
BS.totalLiabilities    = $237,916 (accrued expenses)
```

**Root cause:** BS calculates `accruedExpenses` from employee salaries (monthly accrual). But `state.totalLiabilities` doesn't include accrued expenses — it only tracks debt. These are valid liabilities that the state doesn't know about.

**SIMSIM fix:** Either include accrued expenses in `state.totalLiabilities` during processing, or derive `state.totalLiabilities` from BS after generation.

## Root Cause #5: Cash Flow beginningCash is Wrong

**The problem:**
```
CF.beginningCash = $158,976,399  (calculated as state.cash - netCashChange)
Actual starting cash = $175,000,000
DIFF = $16,023,601
```

**Root cause:** On round 1, there's no `previousBalance` so CF derives beginning cash as `state.cash - netCashChange`. But `netCashChange` only captures what CF calculates (operating + investing + financing), not ALL cash movements that happened during the round (auto-funding, FX adjustments, etc.).

**SIMSIM fix:** Store `beginningCash` explicitly on the state at round start, before processing.

---

## The Capsim/BSG Way — Unified Ledger

The fundamental fix is to make financial statements AUTHORITATIVE, not derived:

```
CURRENT (BROKEN):
  processRound() → modifies state directly
  → generates IS from state (different calculation)
  → generates BS from state (different calculation)
  → generates CF from IS + BS (derived from different sources)
  → THREE different versions of "the truth"

CAPSIM WAY (CORRECT):
  processRound() → generates transactions
  → IS reads transactions directly → IS.netIncome IS the truth
  → BS reads IS + previous BS → BS.equity IS the truth
  → CF reads BS changes → CF.netCashChange IS the truth
  → state.netIncome = IS.netIncome (not calculated separately)
  → state.totalAssets = BS.totalAssets (not calculated separately)
  → ONE version of "the truth"
```

## Minimum Fix (Without Rewriting to Ledger System)

Instead of building a full double-entry ledger (weeks of work), we can make BS/IS/CF authoritative by setting state values FROM the statements:

```typescript
// In SimulationEngine.processRound(), AFTER generating financial statements:
const is = IncomeStatementEngine.generate(state, roundNumber);
const bs = BalanceSheetEngine.generate(state, is, previousBalance);
const cf = CashFlowEngine.generate(state, is, previousBalance, bs);

// Make statements authoritative — state reads FROM them, not vice versa
state.netIncome = is.netIncome;
state.revenue = is.revenue.total;
state.totalAssets = bs.assets.total;
state.totalLiabilities = bs.liabilities.total;
state.shareholdersEquity = bs.equity.total;
state.eps = is.eps ?? 0;
```

This ensures the state and statements always agree. The statements become the single source of truth.
