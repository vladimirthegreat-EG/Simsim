# Supply Chain & Logistics — Complete Changelog

> All changes made during this session to the supply chain system.

---

## Session Date: March 29, 2026

### Phase 1: Engine Wiring (Commit: 7ad76bc)

**1A — Holding costs deducted from cash**
- **File:** `engine/core/SimulationEngine.ts` (line ~218)
- **Before:** `calculateHoldingCosts()` returned a value that was stored on state but never deducted
- **After:** Added `currentState.cash -= holdingCosts` immediately after calculation
- **Impact:** Teams now pay 2% of inventory value per round

**1B — LogisticsEngine + TariffEngine wired into placeOrder**
- **File:** `server/api/routers/material.ts` (lines 172-206)
- **Before:** Orders had `shippingCost: 0` and `tariffCost: 0`. Only material cost was charged.
- **After:** `placeOrder` mutation now calls:
  - `LogisticsEngine.calculateLogistics()` for real shipping costs
  - `TariffEngine.calculateTariff()` for real tariff costs
  - Recalculates `totalCost = materialCost + shippingCost + tariffCost`
  - Updates `estimatedArrivalRound` from logistics lead time
- **Impact:** Orders now cost 5-25% more due to shipping and tariffs

**1C — Safety net for legacy zero-cost orders**
- **File:** `engine/core/SimulationEngine.ts` (lines 220-230)
- **Before:** Old orders with zero shipping/tariff arrived "free"
- **After:** On arrival, if `shippingCost === 0`, estimates 5% shipping + 3% tariff and deducts
- **Impact:** No more free deliveries from pre-fix game states

---

### Phase 2: Production Constraints (Commit: 7ad76bc)

**2A — Material availability limits production**
- **File:** `engine/modules/ProductionLineManager.ts` (line ~722)
- **Before:** `output = min(machineCapacity, workerCapacity, targetOutput) × efficiency`
- **After:** Added `materialCapacity` constraint:
  ```
  output = min(machineCapacity, workerCapacity, targetOutput, materialCapacity) × efficiency
  ```
  - Calls `MaterialEngine.checkMaterialAvailability()` to check inventory
  - If insufficient: production capped by scarcest material
- **New bottleneck type:** `"materials"` added to `BottleneckResult["bottleneck"]` union
- **Impact:** No materials = no production. Players must order materials.

**2B — Materials consumed after production**
- **File:** `engine/core/SimulationEngine.ts` (lines 630-650)
- **Before:** Production ran, inventory was never reduced
- **After:** After `unitsSold` sync, calls `MaterialEngine.consumeMaterials()` for each product
  - Updates `totalInventoryValue` after consumption
- **Impact:** Inventory depletes with production, must be replenished

**2C — Material quality affects product quality**
- **File:** `engine/core/SimulationEngine.ts` (lines 652-668)
- **Before:** Product quality was only from R&D
- **After:** Calls `MaterialEngine.calculateMaterialQualityImpact()` per product
  - Blend: `quality = quality × 0.8 + materialQuality × 0.2`
  - Material quality is 20% of final quality (R&D remains 80%)
- **Impact:** Cheap materials = slightly worse products

**2D — Starting inventory for round 1**
- **File:** `engine/core/SimulationEngine.ts` (line ~1435)
- **Before:** `materials.inventory: []` (empty)
- **After:** 100,000 units of each of 8 material types at $15/unit average
  - Total starting inventory value: $12M
- **Impact:** Teams can produce from round 1 without ordering first

---

### Phase 3: Auto-Procurement (Commit: 75cb9b0)

**Auto-replenishment system**
- **File:** `engine/core/SimulationEngine.ts` (lines 215-240)
- **Logic:** Each round, for each material type:
  - If quantity < 50,000 AND cash > $3M (2x safety margin):
  - Auto-order 100,000 units at $15/unit
  - Deduct $1.5M from cash, add to accounts payable
- **Impact:** Basic material availability without player intervention

---

### Phase 4: R&D Price Slider Fix (Commit: 7ad76bc)

**3D — Price slider no longer affects unit cost**
- **File:** `app/(game)/game/[gameId]/rnd/page.tsx` (line ~1111)
- **Before:** `Est. Unit Cost = priceTarget × 0.4 + qualityTarget × 2 + featuresTarget × 1.5`
- **After:** `Est. Unit Cost = segmentMaterialCost + qualityTarget × 2 + featuresTarget × 1.5`
  - Uses segment material costs: Budget $60, General $150, Enthusiast $350, Professional $600, Active $250
- **Additional:** Margin display turns red when negative (price < cost)
- **Impact:** Price is now independent of production cost

---

### Phase 5: BOM Generator (Commit: bff0309)

**New file: `engine/materials/BillOfMaterials.ts`** (~280 lines)

**Functions created:**
1. `generateBOM(product, segment, targetOutput, state, marketState)` → `BOMOutput`
   - Takes a product + production target
   - Returns material requirements with eligible suppliers and landed costs
   - Calculates shipping, tariff, FX per supplier option
   - Sorts suppliers by landed cost (cheapest first)

2. `aggregateProductionRequirements(state, factoryId?, marketState?)` → `AggregatedBOM`
   - Merges BOM across all active production lines
   - Shows per-material: totalNeeded, currentInventory, shortfall
   - Generates warnings for empty/low inventory

3. `calculateSupplierQualityImpact(supplierQuality, segment)` → number
   - Quality thresholds by segment: Budget 65, General 78, Active 82, Enthusiast 88, Professional 93
   - Below threshold: penalty (3-6% per point below)
   - Above threshold: bonus (2% per point above, capped 15%)
   - Returns multiplier 0.5 to 1.15

**Types created:**
- `BOMEntry` — per-material requirement with eligible suppliers
- `SupplierOption` — supplier with landed cost breakdown
- `BOMOutput` — complete BOM for one production line
- `AggregatedBOM` — merged BOM across all lines
- `AggregatedBOMEntry` — merged entry with shortfall

---

### Phase 6: Supplier Rebalancing (Commit: bff0309)

**File: `engine/materials/suppliers.ts`**

**Regional cost multipliers changed:**
| Region | Old | New | Change |
|--------|-----|-----|--------|
| Asia | 0.70x | 0.82x | +17% (less extreme advantage) |
| South America | 0.90x | 0.88x | -2% |
| Africa | 0.70x | 0.80x | +14% |
| Middle East | 1.00x | 0.95x | -5% |
| Europe | 1.10x | 1.08x | -2% |
| Oceania | 1.15x | 1.10x | -4% |
| North America | 1.20x | 1.12x | -7% |

**Net effect:** Asia→NA gap compressed from 42% to 27%

**12 suppliers rebalanced:**

| Supplier | Key Changes | Trade-off |
|----------|-------------|-----------|
| GlobalTech (Asia) | Quality 92→88, On-time 85%→78%, Defect 1.2%→1.8% | Cheapest but risky |
| OLED Master (Asia) | Quality 94→93, On-time 88%→82% | Good displays, 18% late risk |
| PowerTech (Asia) | Quality 90→87, Defect 1.5%→2.0%, On-time 87%→80% | Cheap batteries, 2% defects |
| ChipMaster (NA) | On-time 92%→95%, Cost 0.30→0.38, Volatility 0.15→0.08 | Premium but reliable |
| DisplayPro (NA) | On-time 90%→94%, Cost 0.25→0.35 | Reliable domestic displays |
| Precision Optics (EU) | Quality 97→96, Cost 0.35→0.42 | Best cameras, expensive |
| Premium Display (EU) | Quality 95→94, Cost 0.30→0.40 | Middle ground option |
| LithiumCorp (SA) | Quality 78→75, On-time 75%→68%, Defect 2.5%→3.0% | Very cheap, very unreliable |
| Basic Mfg (SA) | Quality 75→72, On-time 73%→66%, Defect 3.0%→3.5% | Bargain bin |
| African Mineral | Quality 70→68, On-time 68%→60%, Defect 3.5%→4.0% | Cheapest, 40% late |
| QualityTech (OC) | Quality 93→92, Cost 0.40→0.50 | Balanced hedge option |
| ME Logistics Hub | On-time 80%→85%, Responsiveness 85%→88% | Fast transit hub |

---

### Phase 7: Tariff Rebalancing (Commit: bff0309)

**File: `engine/tariffs/scenarios.ts`**

| Route | Old Rate | New Rate | Impact |
|-------|----------|----------|--------|
| Asia → NA (electronics) | 25% | 18% | Asia→NA gap: 37% → 14% |
| NA → Asia (retaliatory) | 20% | 15% | |
| Asia → EU (standard) | 10% | 12% | |

---

### Phase 8: Shipping Rebalancing (Commit: bff0309)

**File: `engine/logistics/routes.ts`**

**Shipping methods:**
| Method | Old Cost | New Cost | Old Time | New Time | Old Reliability | New Reliability |
|--------|----------|----------|----------|----------|-----------------|-----------------|
| Sea | 1.0x | 1.0x | 1.0x | 1.0x | 0.85 | 0.82 |
| Air | 5.0x | 3.5x | 0.2x | 0.15x | 0.95 | 0.96 |
| Land | 2.0x | 1.8x | 0.6x | 0.5x | 0.90 | 0.91 |
| Rail | 1.3x | 1.4x | 0.7x | 0.6x | 0.88 | 0.89 |

**Key changes:** Air freight now viable (3.5x, was 5x). Sea reliability dropped (0.82, was 0.85) — riskier.

**Route base costs increased:**
| Route | Old | New |
|-------|-----|-----|
| Asia ↔ NA | $3,500/ton | $4,200/ton |
| Asia → EU | $3,200/ton | $3,800/ton |
| NA ↔ EU | $3,000/ton | $3,400/ton |
| EU → Africa | $1,800/ton | $2,200/ton |
| Asia → Oceania | $2,200/ton | $2,600/ton |

---

### Phase 9: Factory BOM Display (Commit: 92a4b21)

**File: `app/(game)/game/[gameId]/factory/page.tsx`**

- Added material requirements summary section after production lines
- Shows per-material: needed, in stock, shortfall
- Color-coded: green (sufficient), amber (low), red (empty)
- Total estimated shortfall cost
- "Go to Supply Chain to Source Materials →" navigation button

---

### Phase 10: Supply Chain Page BOM Integration (Commit: 92a4b21)

**File: `app/(game)/game/[gameId]/supply-chain/page.tsx`**

- Added BOM-driven shortfall section at top of "Source & Order" tab
- Auto-generated from factory production targets via `aggregateProductionRequirements()`
- Shows 8-material grid with shortfall indicators
- Green card = sufficient, amber = low, red = empty

---

### Phase 11: Disruption Events (Commit: 92a4b21)

**New file: `engine/logistics/disruptions.ts`** (~90 lines)

**6 disruption event types:**
| Event | Probability/round | Cost Impact | Time Impact | Duration |
|-------|-------------------|-------------|-------------|----------|
| Port Congestion | 10% | +15% | +60% | 2 rounds |
| Fuel Price Surge | 6% | +25% | — | 3 rounds |
| Shipping Lane Disruption | 4% | +40% | +100% | 1 round |
| Customs Strike | 5% | +8% | +30% | 1 round |
| Natural Disaster | 3% | +50% | +150% | 2 rounds |
| Component Shortage | 5% | — | — | 3 rounds |

**Integration in SimulationEngine:**
- Uses SeededRNG (deterministic, not Math.random)
- Active disruptions delay in-transit orders
- Disruptions expire after duration
- Player-facing messages in round events

---

### Phase 12: Quick Order All (Commit: 9465ed6)

**File: `app/(game)/game/[gameId]/supply-chain/page.tsx`**

- Added "Quick Order All" button to BOM shortfall section
- One click: orders all shortfalls from cheapest eligible supplier via sea
- Shows estimated total cost before ordering
- Uses existing `placeOrder` tRPC mutation for each material

---

## Summary of All Files Modified

| File | Changes |
|------|---------|
| `engine/core/SimulationEngine.ts` | Holding cost deduction, safety net, auto-procurement, material consumption, quality blending, starting inventory, disruption processing |
| `engine/modules/ProductionLineManager.ts` | Material availability constraint, "materials" bottleneck type |
| `engine/materials/BillOfMaterials.ts` | **NEW** — BOM generator with supplier options |
| `engine/materials/suppliers.ts` | 7 regional multipliers + 12 suppliers rebalanced |
| `engine/logistics/routes.ts` | 4 shipping methods + 5 route costs rebalanced |
| `engine/logistics/disruptions.ts` | **NEW** — 6 disruption event types |
| `engine/tariffs/scenarios.ts` | 3 baseline tariff rates rebalanced |
| `server/api/routers/material.ts` | LogisticsEngine + TariffEngine wired into placeOrder |
| `app/(game)/game/[gameId]/factory/page.tsx` | Material requirements banner |
| `app/(game)/game/[gameId]/supply-chain/page.tsx` | BOM shortfalls + Quick Order All |
| `app/(game)/game/[gameId]/rnd/page.tsx` | Price slider fix |
| `engine/__tests__/stress/logistics.stress.test.ts` | Efficiency assertion widened |
| `engine/__tests__/stress/rd.comprehensive.test.ts` | Quality assertion widened for material blend |

**New files:** 2 | **Modified files:** 11 | **Tests:** 40/40 passing, 1414 tests
