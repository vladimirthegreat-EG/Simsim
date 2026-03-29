# SIMSIM — Known Simplifications

Documented decisions about TODO stubs in the financial statements engine.
Each was reviewed as part of the Layer 8 Code Quality audit (CQ-05 through CQ-07).

## 1. Amortization = 0 (IncomeStatement.ts L200)

**Decision:** KEEP AS-IS
**Reason:** R&D is expensed immediately. This is more conservative than GAAP capitalization.
**Player impact:** Net income is slightly lower than it would be under full GAAP.
**Pedagogy:** Teaches conservative accounting. Acceptable simplification.

## 2. Tax Simplification (IncomeStatement.ts L263)

**Decision:** KEEP AS-IS
**Reason:** Flat corporate tax rate (21% federal + 5% state) is sufficient for simulation purposes.
**Player impact:** Tax is predictable, not a strategic variable.
**Pedagogy:** Removes tax planning complexity not central to the simulation's learning goals.

## 3. Accrued Interest = 0 (BalanceSheet.ts L282)

**Decision:** VERIFY FIRST (see CQ-07 test)
**Reason:** If interest appears in the Income Statement (it does — via `calculateInterestExpense`), then BS showing $0 accrued interest is an acceptable simplification.
**If interest does NOT appear in IS:** This would be a bug, not a simplification.
**Status:** Interest IS calculated in IS via `IncomeStatementEngine.calculateInterestExpense()` from active debt instruments. The BS zero is acceptable.

## 4. Change in Accrued Expenses = 0 (CashFlowStatement.ts L89)

**Decision:** KEEP AS-IS
**Reason:** CF statement is slightly inaccurate but does not affect cash, rankings, or gameplay.
**Player impact:** Indirect cash flow section may not reconcile perfectly with GAAP.
**Pedagogy:** Direct method cash flow is clearer for participants anyway.

---

*Documented 2026-03-18 as part of Layer 8 Code Quality audit.*
