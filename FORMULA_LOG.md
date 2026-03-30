# FORMULA LOG — Supply Chain Integration

> Single source of truth for all supply chain implementation decisions.
> Updated after every task completion.

---

## SESSION START — March 30, 2026

### Current State Assessment
- BillOfMaterials.ts EXISTS (~500 lines) with generateBOM(), aggregateProductionRequirements(), detectDeprecatedInventory()
- Supplier tiers (Bronze/Silver/Gold) EXIST and are classified
- SHIPPING_METHOD_ROUND_DELAYS EXIST (sea=2, air=0, land=1, rail=1)
- LandedCost.ts does NOT exist (cost calculation is inline in BillOfMaterials.ts)
- UPGRADE_PATHS do NOT exist (tech tier → material spec mapping missing)
- Material quality → product quality is WEAK (20% blend, often overwritten)
- COGS uses inventory avgCost but FinanceIntegration.calculateMaterialCOGS() is hardcoded at 10%

### Decision: Extend existing files, don't recreate
BillOfMaterials.ts already has most Phase 1 functionality. Tasks 1.1-1.4 will EXTEND it, not replace it. LandedCost.ts will be a NEW utility file. UPGRADE_PATHS will be added to BillOfMaterials.ts.

---

## TASK 1.3 + 2.1 + 3.2 — Tier System + LandedCost + UPGRADE_PATHS
**Status:** COMPLETE

### Files Created
- `engine/materials/LandedCost.ts` — Pure utility: baseCost × regionMult × fxMult + shipping + tariff = landed cost per unit. Includes contractDiscount support.

### Files Modified
- `engine/materials/BillOfMaterials.ts` — Added UPGRADE_PATHS (8 materials × 5 tiers = 40 entries) + getUpgradedMaterialSpec() function
- `engine/materials/suppliers.ts` — 5-tier system (bronze/silver/gold/platinum/diamond) replacing old 3-tier. MATERIAL_TIER_CONFIG with UI classes.
- `engine/materials/types.ts` — SupplierTier expanded to include platinum/diamond
- `app/(game)/game/[gameId]/supply-chain/page.tsx` — Added platinum/diamond to TIER_COLORS

### Key Formulas
```
landedCostPerUnit = (baseCost × regionMult × fxMult × (1 - contractDiscount)) + shippingPerUnit + tariffPerUnit
tariff calculated on POST-FX value, NOT base cost

UPGRADE_PATHS per material per tier:
  tier 1: base spec, +0 quality, 1.0x cost
  tier 2: enhanced, +5 quality, 1.2-1.5x cost
  tier 3: premium, +10 quality, 1.6-2.0x cost
  tier 4: professional, +15 quality, 2.0-3.0x cost
  tier 5: quantum/ultimate, +20 quality, 3.0-5.0x cost

5-tier classification:
  bronze: quality 0-74
  silver: quality 75-84
  gold: quality 85-89
  platinum: quality 90-95
  diamond: quality 96-100
```

### Verification
- [x] TypeScript compiles (no new errors)
- [x] Next.js build: successful
- [x] Engine tests: 40/40 files, 1414/1414 tests passed

---
