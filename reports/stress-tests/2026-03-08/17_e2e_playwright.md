# 17_e2e_playwright — Playwright E2E Report

**Module**: E2E Playwright
**Date**: 2026-03-08
**Status**: WRITTEN (requires dev server to run)

## Summary

| Metric | Value |
|--------|-------|
| Total New Tests | 26 |
| Smoke (@smoke) | 6 |
| Deep (@deep) | 12 |
| Resilience | 8 |
| Passed | — |
| Failed | — |
| Duration | — |

## Test Files

### `e2e/smoke.spec.ts` — 6 tests (@smoke tag)
Minimal happy-path designed for CI gating. Fast execution, sequential flow.

### `e2e/deep-gameplay.spec.ts` — 12 tests (@deep tag)
Extended multi-round gameplay with 3 teams.

| Category | Tests | Description |
|----------|-------|-------------|
| Setup | 3 | Facilitator creates game, 3 teams join, game starts |
| Round 1 | 4 | Navigate departments, submit decisions, check readiness, advance round |
| Results | 2 | Rankings displayed, team metrics shown |
| Rounds 2-3 | 3 | Varied strategies, dashboard reflects state changes |

### `e2e/resilience.spec.ts` — 8 tests
Non-happy-path conditions and accessibility.

| Category | Tests | Description |
|----------|-------|-------------|
| State Recovery | 4 | Session persistence across refresh/navigation, expired session handling |
| Accessibility | 4 | Headings, labels, landmarks, contrast |

## Combined E2E Coverage

| Suite | Files | Tests |
|-------|-------|-------|
| Existing E2E | 9 | ~39 |
| New: Smoke | 1 | 6 |
| New: Deep Gameplay | 1 | 12 |
| New: Resilience | 1 | 8 |
| **Total** | **12** | **~65** |

## Running

```bash
# Smoke only (CI)
npm run e2e:smoke

# Deep gameplay
npm run e2e:deep

# All E2E
npm run e2e
```

## Notes

- All new tests require a running dev server (`npm run dev` or `webServer` config in `playwright.config.ts`)
- Tests use `test.describe.serial` for stateful flows (game creation → join → play)
- Deep gameplay tests have extended timeouts for simulation processing
- Resilience tests verify state recovery without server restart
