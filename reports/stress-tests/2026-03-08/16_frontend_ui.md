# 16_frontend_ui — Playwright E2E Report

**Module**: Frontend UI
**Date**: 2026-03-08
**Status**: WRITTEN (requires dev server to run)

## Summary

| Metric | Value |
|--------|-------|
| Total New Tests | 26 |
| Passed | — |
| Failed | — |
| Skipped | — |
| Duration | — |

## Test Files

### `e2e/smoke.spec.ts` — 6 tests (tagged @smoke)
Minimal happy-path for CI gating.

| Test | Description |
|------|-------------|
| Facilitator registers | Sign up flow → dashboard |
| Facilitator logs in | Login flow → dashboard |
| Creates a game | Game creation → join code displayed |
| Team joins with code | Join code entry → team dashboard |
| Game starts | Start button → game view loads |
| Team navigates departments | Department pages accessible |

### `e2e/resilience.spec.ts` — 8 tests
State recovery and accessibility basics.

| Category | Tests | Description |
|----------|-------|-------------|
| State Recovery | 4 | Page refresh preserves session, navigate away/back preserves context, expired session redirects, direct URL without session shows error |
| Accessibility Basics | 4 | Pages have h1 headings, forms have labels, navigation landmarks present, color contrast check |

## Notes

- Tests are written but require a running dev server (`npm run dev`) to execute
- Run smoke tests: `npm run e2e:smoke`
- Run all E2E: `npm run e2e`
- Existing E2E suite has 9 spec files with ~39 tests already in `e2e/`
- New tests follow existing patterns (page objects, `test.describe.serial`)
