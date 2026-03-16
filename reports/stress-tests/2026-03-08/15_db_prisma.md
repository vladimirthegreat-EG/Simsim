# 15_db_prisma — Integration Test Report

**Module**: DB / Prisma
**Date**: 2026-03-08
**Status**: TESTED ✅

## Summary

| Metric | Value |
|--------|-------|
| Total Tests | 40 |
| Passed | 40 |
| Failed | 0 |
| Skipped | 0 |
| Duration | ~1.1s |

## Test Files

### `db-lifecycle.test.ts` — 22 tests
Full game lifecycle through tRPC with real SQLite database.

| Category | Tests | Status |
|----------|-------|--------|
| Full game lifecycle | 12 | ✅ |
| Cascade deletes | 4 | ✅ |
| Unique constraints | 4 | ✅ |
| Edge cases | 2 | ✅ |

Key scenarios tested:
- Register facilitator → create game → join teams → start → submit decisions → lock → advance → verify results
- Delete game cascades to teams, rounds, decisions, round results
- Duplicate team names rejected
- Duplicate join codes rejected
- Cannot start game with < 2 teams
- Cannot join non-LOBBY game

### `mini-tournament.test.ts` — 18 tests
Full pipeline: tRPC → Prisma → SimulationEngine → Prisma write-back.

| Category | Tests | Status |
|----------|-------|--------|
| Setup phase | 4 | ✅ |
| Round 1 (submit, lock, advance, verify) | 6 | ✅ |
| Round 2 (submit, lock, advance, diff) | 3 | ✅ |
| Round 3 (submit, lock, advance) | 2 | ✅ |
| Verification (totals, market evolution, game status) | 3 | ✅ |

Key scenarios tested:
- 3 teams with varied strategies (alpha/beta/gamma) over 3 rounds
- Rankings 1-2-3 with no duplicates per round
- Team states updated after each simulation round
- Market state evolution across rounds
- 9 total round results (3 teams × 3 rounds)
- Game stays IN_PROGRESS after 3 of 4 rounds

## Test Infrastructure

- Each test file gets an isolated SQLite database
- Tables created via raw SQL (no `prisma db push`, avoids locking)
- Schema matches `prisma/schema.sqlite.prisma` (6 models)
- Full cleanup in `afterAll` (disconnect + delete DB files)

## Defects Found

| ID | Severity | Description |
|----|----------|-------------|
| FIN-001 | S2 | Financial statements NaN (pre-existing, logged as stderr warning during simulation) |

## Notes

- The `Financial statements do not reconcile: Operating cash flow net income (NaN)` warning appears in stderr during mini-tournament rounds — this is the same FIN-001 defect from engine stress tests
- All database operations (CRUD, cascades, constraints) work correctly
- SimulationEngine integrates cleanly with tRPC + Prisma pipeline
- Run via: `npm run test:integration`
