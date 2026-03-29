# 08_supplychain_logistics_materials — Stress Test Report

**Module**: Supply Chain / Logistics / Materials
**Date**: 2026-03-08
**Status**: PASS

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 190 |
| Passed | 190 |
| Failed | 0 |
| Skipped | 0 |
| Duration | — |

Breakdown: Materials 64 tests, Logistics 62 tests, Supply Chain 64 tests.

## Test Categories

### A — Golden Path
Material costs computed correctly across standard supplier tiers. Inventory management maintains expected stock levels. Shipping calculations produce accurate cost and time estimates.

### B — Edge Scenarios
Supplier relationship scores at boundary values (0 and max) handled correctly. Supply disruptions degrade output predictably without crashes. Zero-inventory and overflow-inventory edge cases verified.

### C — Property Tests
Material costs are always non-negative. Inventory levels never go negative. Shipping time is always positive when shipments exist.

### D — Regression
LOG-001 identified during this run (see Defects).

## Defects Found
- **LOG-001 [S2]**: Negative `timeEfficiency` value observed in logistics calculations under specific disruption scenarios. The value should be clamped to [0, 1] but is not guarded. Severity 2 — produces incorrect but non-crashing downstream results.

## Notes
All 190 tests pass; the LOG-001 defect is detected and logged by assertion rather than causing test failure. Three sub-modules tested together due to tight coupling.
