# Materials & Supply Chain Expansion System

## Overview

This document outlines the expanded materials and supply chain system, adding strategic depth through regional sourcing, logistics management, tariffs, and segment-specific material requirements.

---

## Table of Contents
1. [Material Types by Segment](#material-types-by-segment)
2. [Regional Sourcing System](#regional-sourcing-system)
3. [Logistics & Lead Times](#logistics--lead-times)
4. [Tariff System](#tariff-system)
5. [Strategic Decisions](#strategic-decisions)
6. [Implementation Plan](#implementation-plan)

---

## Material Types by Segment

Each phone segment requires specific materials with different quality grades and costs.

### Material Categories

**1. Display Components**
- LCD panels (Budget, General)
- AMOLED panels (Enthusiast, Professional, Active Lifestyle)
- Gorilla Glass / Sapphire (protection)
- Touch sensors

**2. Processors & Chips**
- Entry-level SoCs (Budget)
- Mid-range SoCs (General, Active Lifestyle)
- Flagship SoCs (Enthusiast, Professional)
- 5G modems
- AI accelerators

**3. Memory & Storage**
- DRAM (4GB, 6GB, 8GB, 12GB, 16GB)
- NAND Flash (64GB, 128GB, 256GB, 512GB, 1TB)
- UFS vs eMMC storage

**4. Camera Systems**
- Basic cameras (Budget)
- Dual/Triple camera systems (General, Active Lifestyle)
- Advanced multi-lens systems (Enthusiast, Professional)
- Sensor quality tiers

**5. Battery & Power**
- Battery cells (mAh rating)
- Fast charging controllers
- Wireless charging coils

**6. Structural Materials**
- Plastic (Budget)
- Aluminum (General, Active Lifestyle)
- Stainless steel (Enthusiast)
- Titanium (Professional)
- Ceramic (Premium option)

**7. Other Components**
- PCB materials
- Connectors
- Antennas
- Speakers
- Vibration motors

### Segment Material Requirements

```typescript
interface SegmentMaterials {
  segment: Segment;
  materials: MaterialRequirement[];
  totalCost: number;
  leadTime: number; // Days
  qualityTier: 1 | 2 | 3 | 4 | 5;
}

const SEGMENT_MATERIALS: Record<Segment, SegmentMaterials> = {
  Budget: {
    segment: "Budget",
    materials: [
      { type: "display", spec: "LCD_5.5inch", costPerUnit: 15, source: "Asia" },
      { type: "processor", spec: "EntryLevel_SoC", costPerUnit: 8, source: "Asia" },
      { type: "memory", spec: "4GB_DRAM", costPerUnit: 10, source: "Asia" },
      { type: "storage", spec: "64GB_eMMC", costPerUnit: 5, source: "Asia" },
      { type: "camera", spec: "Single_13MP", costPerUnit: 6, source: "Asia" },
      { type: "battery", spec: "3000mAh", costPerUnit: 4, source: "Asia" },
      { type: "chassis", spec: "Plastic", costPerUnit: 3, source: "Asia" },
      { type: "other", spec: "BasicComponents", costPerUnit: 9, source: "Asia" }
    ],
    totalCost: 60,
    leadTime: 30,
    qualityTier: 1
  },

  General: {
    segment: "General",
    materials: [
      { type: "display", spec: "AMOLED_6.1inch", costPerUnit: 35, source: "Asia" },
      { type: "processor", spec: "MidRange_SoC", costPerUnit: 25, source: "Asia" },
      { type: "memory", spec: "6GB_DRAM", costPerUnit: 18, source: "Asia" },
      { type: "storage", spec: "128GB_UFS", costPerUnit: 12, source: "Asia" },
      { type: "camera", spec: "Dual_48MP", costPerUnit: 22, source: "Asia" },
      { type: "battery", spec: "4000mAh_FastCharge", costPerUnit: 10, source: "Asia" },
      { type: "chassis", spec: "Aluminum", costPerUnit: 12, source: "Europe" },
      { type: "other", spec: "StandardComponents", costPerUnit: 16, source: "Asia" }
    ],
    totalCost: 150,
    leadTime: 35,
    qualityTier: 2
  },

  Enthusiast: {
    segment: "Enthusiast",
    materials: [
      { type: "display", spec: "AMOLED_6.5inch_120Hz", costPerUnit: 70, source: "Asia" },
      { type: "processor", spec: "Flagship_SoC", costPerUnit: 65, source: "Asia" },
      { type: "memory", spec: "12GB_DRAM", costPerUnit: 40, source: "Asia" },
      { type: "storage", spec: "256GB_UFS3.1", costPerUnit: 30, source: "Asia" },
      { type: "camera", spec: "Triple_108MP_OIS", costPerUnit: 55, source: "Europe" },
      { type: "battery", spec: "5000mAh_FastWireless", costPerUnit: 18, source: "Asia" },
      { type: "chassis", spec: "StainlessSteel_Glass", costPerUnit: 35, source: "Europe" },
      { type: "other", spec: "PremiumComponents", costPerUnit: 37, source: "North America" }
    ],
    totalCost: 350,
    leadTime: 45,
    qualityTier: 4
  },

  Professional: {
    segment: "Professional",
    materials: [
      { type: "display", spec: "LTPO_AMOLED_6.7inch_ProMotion", costPerUnit: 120, source: "Asia" },
      { type: "processor", spec: "Ultra_Flagship_SoC_AI", costPerUnit: 95, source: "North America" },
      { type: "memory", spec: "16GB_LPDDR5", costPerUnit: 65, source: "Asia" },
      { type: "storage", spec: "512GB_UFS4.0", costPerUnit: 60, source: "Asia" },
      { type: "camera", spec: "Quad_200MP_Periscope", costPerUnit: 90, source: "Europe" },
      { type: "battery", spec: "5500mAh_UltraFast_Wireless", costPerUnit: 28, source: "Asia" },
      { type: "chassis", spec: "Titanium_Ceramic", costPerUnit: 80, source: "Europe" },
      { type: "other", spec: "UltraPremiumComponents", costPerUnit: 62, source: "North America" }
    ],
    totalCost: 600,
    leadTime: 60,
    qualityTier: 5
  },

  "Active Lifestyle": {
    segment: "Active Lifestyle",
    materials: [
      { type: "display", spec: "Rugged_AMOLED_6.3inch", costPerUnit: 50, source: "Asia" },
      { type: "processor", spec: "Efficient_SoC", costPerUnit: 35, source: "Asia" },
      { type: "memory", spec: "8GB_DRAM", costPerUnit: 25, source: "Asia" },
      { type: "storage", spec: "256GB_UFS3.0", costPerUnit: 25, source: "Asia" },
      { type: "camera", spec: "ActionCam_64MP", costPerUnit: 40, source: "Europe" },
      { type: "battery", spec: "6000mAh_Extended", costPerUnit: 22, source: "Asia" },
      { type: "chassis", spec: "MilSpec_Aluminum_Rubber", costPerUnit: 28, source: "North America" },
      { type: "other", spec: "RuggedComponents", costPerUnit: 25, source: "Europe" }
    ],
    totalCost: 250,
    leadTime: 40,
    qualityTier: 3
  }
};
```

---

## Regional Sourcing System

### Global Regions

**7 Major Regions for Sourcing:**

1. **North America** (USA, Canada, Mexico)
   - Specialties: Advanced processors, software, premium components
   - Cost: Very High (1.2x base)
   - Quality: Excellent (95-100)
   - Lead Time: Medium (35-45 days)

2. **South America** (Brazil, Argentina, Chile)
   - Specialties: Raw materials, batteries, basic assembly
   - Cost: Medium (0.9x base)
   - Quality: Good (70-85)
   - Lead Time: Medium (40-50 days)

3. **Europe** (EU, UK, Scandinavia)
   - Specialties: Premium materials, cameras, precision components
   - Cost: High (1.1x base)
   - Quality: Excellent (90-98)
   - Lead Time: Medium (30-40 days)

4. **Africa** (South Africa, Egypt, Morocco)
   - Specialties: Rare earth minerals, batteries, raw materials
   - Cost: Low (0.7x base)
   - Quality: Variable (60-80)
   - Lead Time: Long (50-70 days)

5. **Asia** (China, Taiwan, Korea, Japan, India, Vietnam)
   - Specialties: All components, assembly, displays, chips
   - Cost: Low to Medium (0.6-0.8x base)
   - Quality: High (85-95)
   - Lead Time: Short to Medium (20-35 days)

6. **Oceania** (Australia, New Zealand)
   - Specialties: Rare materials, quality control, testing
   - Cost: High (1.15x base)
   - Quality: Excellent (88-95)
   - Lead Time: Long (45-60 days)

7. **Middle East** (UAE, Israel, Saudi Arabia)
   - Specialties: Logistics hub, specialized components
   - Cost: Medium-High (1.0x base)
   - Quality: Good (75-90)
   - Lead Time: Medium (35-45 days)

### Regional Capabilities

```typescript
interface RegionalCapabilities {
  region: string;
  materials: MaterialType[];
  costMultiplier: number;
  qualityRange: [number, number];
  leadTimeRange: [number, number];
  specialties: string[];
  reliability: number; // 0-1, affects disruption risk
  politicalStability: number; // 0-1
  infrastructureQuality: number; // 0-1
}

const REGIONAL_CAPABILITIES: RegionalCapabilities[] = [
  {
    region: "North America",
    materials: ["processor", "software", "premium_components"],
    costMultiplier: 1.2,
    qualityRange: [95, 100],
    leadTimeRange: [35, 45],
    specialties: ["Advanced SoCs", "AI chips", "Premium assembly"],
    reliability: 0.95,
    politicalStability: 0.90,
    infrastructureQuality: 0.95
  },
  {
    region: "Asia",
    materials: ["display", "processor", "memory", "storage", "camera", "battery", "chassis"],
    costMultiplier: 0.7,
    qualityRange: [85, 95],
    leadTimeRange: [20, 35],
    specialties: ["Displays", "Memory", "Complete assembly", "High volume"],
    reliability: 0.85,
    politicalStability: 0.80,
    infrastructureQuality: 0.90
  },
  {
    region: "Europe",
    materials: ["camera", "chassis", "premium_components"],
    costMultiplier: 1.1,
    qualityRange: [90, 98],
    leadTimeRange: [30, 40],
    specialties: ["Camera lenses", "Precision engineering", "Premium materials"],
    reliability: 0.92,
    politicalStability: 0.88,
    infrastructureQuality: 0.93
  },
  // ... more regions
];
```

---

## Logistics & Lead Times

### Shipping Routes

```typescript
interface ShippingRoute {
  from: string;
  to: string;
  distance: number; // km
  baseLeadTime: number; // days
  baseCost: number; // $ per kg
  methods: ShippingMethod[];
}

type ShippingMethod = "sea" | "air" | "land" | "rail";

interface ShippingMethodDetails {
  method: ShippingMethod;
  costMultiplier: number;
  timeMultiplier: number;
  reliability: number;
  carbonEmissions: number; // kg CO2 per ton-km
}

const SHIPPING_METHODS: Record<ShippingMethod, ShippingMethodDetails> = {
  sea: {
    method: "sea",
    costMultiplier: 1.0,
    timeMultiplier: 1.0,
    reliability: 0.85,
    carbonEmissions: 10
  },
  air: {
    method: "air",
    costMultiplier: 5.0,
    timeMultiplier: 0.2,
    reliability: 0.95,
    carbonEmissions: 500
  },
  land: {
    method: "land",
    costMultiplier: 2.0,
    timeMultiplier: 0.6,
    reliability: 0.90,
    carbonEmissions: 60
  },
  rail: {
    method: "rail",
    costMultiplier: 1.3,
    timeMultiplier: 0.7,
    reliability: 0.88,
    carbonEmissions: 30
  }
};
```

### Lead Time Calculation

```typescript
function calculateLeadTime(
  sourceRegion: string,
  destRegion: string,
  shippingMethod: ShippingMethod,
  materialType: string
): number {
  const route = getRoute(sourceRegion, destRegion);
  const baseTime = route.baseLeadTime;
  const methodMultiplier = SHIPPING_METHODS[shippingMethod].timeMultiplier;

  // Base production time
  const productionTime = getMaterialProductionTime(materialType);

  // Clearance and customs
  const clearanceTime = getClearanceTime(sourceRegion, destRegion);

  // Quality inspection time
  const inspectionTime = 2; // 2 days

  // Random variation (±20%)
  const variation = 1 + (Math.random() * 0.4 - 0.2);

  return Math.ceil(
    (productionTime + baseTime * methodMultiplier + clearanceTime + inspectionTime) * variation
  );
}
```

### Customs & Clearance

```typescript
interface CustomsClearance {
  fromRegion: string;
  toRegion: string;
  clearanceTime: number; // days
  clearanceCost: number; // $ per shipment
  documentationRequired: string[];
  inspectionProbability: number; // 0-1
}

const CUSTOMS_COMPLEXITY: Record<string, number> = {
  "North America -> North America": 1,
  "North America -> Europe": 3,
  "North America -> Asia": 4,
  "Asia -> North America": 5,
  "Asia -> Europe": 4,
  "Europe -> Europe": 2,
  // ... more routes
};
```

---

## Tariff System

### Dynamic Tariff Model

```typescript
interface Tariff {
  id: string;
  fromRegion: string;
  toRegion: string;
  materialType?: string; // undefined = all materials
  tariffRate: number; // percentage (0-1)
  effectiveDate: number; // round number
  expiryDate?: number; // round number
  reason: TariffReason;
  volatility: number; // how much it can change
}

type TariffReason =
  | "trade_war"
  | "political_tension"
  | "economic_protection"
  | "retaliation"
  | "environmental"
  | "security"
  | "dumping_prevention";

interface TariffState {
  activeTariffs: Tariff[];
  historicalRates: TariffHistoryEntry[];
  tradeAgreements: TradeAgreement[];
}
```

### Tariff Generation System

```typescript
class TariffEngine {
  /**
   * Generate randomized tariffs each round
   */
  static generateRoundTariffs(
    round: number,
    previousTariffs: Tariff[],
    geopoliticalState: GeopoliticalState,
    ctx: EngineContext
  ): Tariff[] {
    const newTariffs: Tariff[] = [];

    // Base tariff rates by region pair
    const baseTariffs = this.getBaseTariffs();

    // Random events that affect tariffs
    if (ctx.rng.general.chance(0.15)) { // 15% chance per round
      const event = this.generateTariffEvent(geopoliticalState, ctx);
      newTariffs.push(...this.applyTariffEvent(event, round));
    }

    // Update existing tariffs
    for (const tariff of previousTariffs) {
      if (tariff.expiryDate && tariff.expiryDate <= round) {
        continue; // Tariff expired
      }

      // Tariff may change
      if (ctx.rng.general.chance(tariff.volatility)) {
        tariff.tariffRate *= 1 + ctx.rng.general.gaussian(0, 0.15);
        tariff.tariffRate = Math.max(0, Math.min(0.50, tariff.tariffRate));
      }

      newTariffs.push(tariff);
    }

    return newTariffs;
  }

  /**
   * Calculate total tariff cost for a material shipment
   */
  static calculateTariffCost(
    material: Material,
    quantity: number,
    fromRegion: string,
    toRegion: string,
    tariffs: Tariff[]
  ): number {
    let totalRate = 0;

    // Find applicable tariffs
    for (const tariff of tariffs) {
      if (
        tariff.fromRegion === fromRegion &&
        tariff.toRegion === toRegion &&
        (!tariff.materialType || tariff.materialType === material.type)
      ) {
        totalRate += tariff.tariffRate;
      }
    }

    // Apply tariff to material cost
    const materialValue = material.costPerUnit * quantity;
    return materialValue * totalRate;
  }
}
```

### Example Tariff Scenarios

```typescript
const TARIFF_SCENARIOS: TariffEvent[] = [
  {
    id: "trade_war_us_china",
    name: "US-China Trade War Escalation",
    affectedRoutes: [
      { from: "North America", to: "Asia", increase: 0.25 },
      { from: "Asia", to: "North America", increase: 0.25 }
    ],
    materials: ["processor", "display", "memory"],
    duration: 8, // rounds
    probability: 0.05
  },
  {
    id: "eu_tech_tariff",
    name: "EU Digital Sovereignty Tariffs",
    affectedRoutes: [
      { from: "Asia", to: "Europe", increase: 0.15 },
      { from: "North America", to: "Europe", increase: 0.10 }
    ],
    materials: ["processor", "software"],
    duration: 12,
    probability: 0.03
  },
  {
    id: "rare_earth_export_restriction",
    name: "Rare Earth Export Restrictions",
    affectedRoutes: [
      { from: "Asia", to: "all", increase: 0.20 },
      { from: "Africa", to: "all", increase: 0.15 }
    ],
    materials: ["battery", "display"],
    duration: 6,
    probability: 0.04
  },
  {
    id: "trade_agreement",
    name: "Regional Trade Agreement Signed",
    affectedRoutes: [
      { from: "North America", to: "South America", increase: -0.10 },
      { from: "South America", to: "North America", increase: -0.10 }
    ],
    materials: undefined, // All materials
    duration: 20,
    probability: 0.02
  }
];
```

### Tariff Mitigation Strategies

Players can mitigate tariff impacts through:

1. **Trade Agreements** - Negotiate reduced tariffs (investment required)
2. **Regional Factories** - Build factories in target markets to avoid tariffs
3. **Material Substitution** - Use alternative materials from different regions
4. **Stockpiling** - Buy materials before tariffs increase
5. **Vertical Integration** - Own supply chain to reduce external costs

---

## Strategic Decisions

### Sourcing Strategy Interface

```typescript
interface SourcingDecision {
  segment: Segment;
  materials: MaterialSourcingChoice[];
  shippingMethod: ShippingMethod;
  expeditedShipping: boolean; // Pay 2x for 50% faster
  qualityInspection: "none" | "basic" | "thorough";
  stockpileAmount: number; // Units to keep in inventory
  hedgeStrategy: "spot" | "forward_contract" | "multi_source";
}

interface MaterialSourcingChoice {
  materialType: string;
  sourceRegion: string;
  supplier: string;
  contractLength: number; // rounds
  priceProtection: boolean; // Lock in price
  qualityRequirement: number; // 0-100
}
```

### Decision Trade-offs

**Cost vs Speed**
- Sea shipping: Cheap but slow (30-60 days)
- Air shipping: Expensive but fast (5-10 days)
- Impact: Inventory costs vs stockout risk

**Quality vs Cost**
- Premium regions: Higher quality, higher cost
- Budget regions: Lower cost, variable quality
- Impact: Defect rates, brand perception

**Diversification vs Efficiency**
- Single source: Economies of scale, lower cost
- Multi-source: Resilience, higher cost
- Impact: Disruption vulnerability

**Tariff Avoidance**
- Local sourcing: Avoid tariffs, possibly higher cost
- Import: Access cheaper materials, pay tariffs
- Impact: Total landed cost

---

## Implementation Plan

### Phase 1: Data Models (Week 1)

**Files to Create:**
```
src/engine/materials/
  index.ts
  MaterialEngine.ts
  types.ts
  suppliers.ts

src/engine/logistics/
  index.ts
  LogisticsEngine.ts
  ShippingCalculator.ts
  routes.ts

src/engine/tariffs/
  index.ts
  TariffEngine.ts
  scenarios.ts
```

**Core Types:**
```typescript
// src/engine/materials/types.ts
export interface Material {
  id: string;
  type: MaterialType;
  spec: string;
  costPerUnit: number;
  qualityGrade: number;
  sourceRegion: string;
  leadTime: number;
}

export interface MaterialInventory {
  material: Material;
  quantity: number;
  location: string;
  arrivalDate: number;
  cost: number;
}

export interface MaterialOrder {
  id: string;
  materials: Material[];
  quantity: number;
  sourceRegion: string;
  destRegion: string;
  shippingMethod: ShippingMethod;
  orderDate: number;
  estimatedArrival: number;
  totalCost: number;
  tariffCost: number;
  shippingCost: number;
  clearanceCost: number;
}
```

### Phase 2: Core Engines (Week 2)

**MaterialEngine Implementation:**
```typescript
export class MaterialEngine {
  static calculateMaterialCost(
    segment: Segment,
    sourceRegions: Map<MaterialType, string>,
    quantity: number
  ): MaterialCostBreakdown {
    // Calculate base material costs
    // Apply regional multipliers
    // Calculate tariffs
    // Calculate logistics costs
    // Return total breakdown
  }

  static orderMaterials(
    decision: SourcingDecision,
    currentRound: number,
    tariffState: TariffState
  ): MaterialOrder {
    // Create order
    // Calculate all costs
    // Determine arrival date
    // Return order confirmation
  }

  static processMaterialArrivals(
    orders: MaterialOrder[],
    currentRound: number
  ): MaterialInventory[] {
    // Check which orders have arrived
    // Add to inventory
    // Apply quality checks
    // Handle delays/issues
  }
}
```

### Phase 3: UI Integration (Week 3)

**New Pages:**
```
src/app/(game)/game/[gameId]/supply-chain/page.tsx
  - Material sourcing interface
  - Supplier selection
  - Order tracking
  - Tariff overview

src/app/(game)/game/[gameId]/logistics/page.tsx
  - Shipping route visualization
  - Lead time calculator
  - Cost comparison tool
```

**Components:**
```
src/components/game/materials/
  MaterialSelector.tsx
  SupplierCard.tsx
  TariffAlert.tsx
  ShippingCalculator.tsx
  InventoryTracker.tsx
```

### Phase 4: Integration with Existing Systems (Week 4)

**Connect to:**
- Factory module (material requirements)
- Finance module (costs and cash flow)
- Market simulator (production constraints)
- Supply chain disruptions (material delays)

---

## Example Gameplay Flow

### Round 1: Planning
```
Player decides to produce 10,000 Enthusiast phones

Material Requirements:
- Displays: 10,000 units @ $70 each = $700K
- Processors: 10,000 units @ $65 each = $650K
- Memory: 10,000 units @ $40 each = $400K
... (total $3.5M in materials)

Sourcing Decisions:
- Displays from Asia (lead time: 25 days, tariff: 10%)
- Processors from Asia (lead time: 30 days, tariff: 25% due to trade war!)
- Camera modules from Europe (lead time: 35 days, tariff: 5%)
- Chassis from Europe (lead time: 30 days, tariff: 5%)

Shipping Choice: Sea freight ($50K vs air freight $250K)

Total Cost:
- Materials: $3.5M
- Tariffs: $350K (10% average)
- Shipping: $50K
- Clearance: $25K
Total: $3.925M

Lead Time: 35 days (longest material)
```

### Round 2: Material Arrives
```
Materials arrive at factory
Quality inspection: 98% pass rate
Production can begin

Meanwhile, new tariff announced:
"Europe increases camera tariff to 15%"

Player must decide:
- Accept higher cost (+10% on future orders)
- Switch to Asia supplier (lower quality, lower cost)
- Build European factory (huge investment, no tariffs)
```

---

## Balance Considerations

**Material Cost Impact:**
- Budget segment: 40% of final price
- General segment: 50% of final price
- Premium segments: 55-60% of final price

**Tariff Impact:**
- Low tariff era: 0-5% average
- Normal: 5-15% average
- Trade war: 15-30% on affected routes

**Lead Time Impact:**
- Just-in-time: Risky but low inventory cost
- Safety stock: Safe but high carrying cost
- Optimal: 1-2 weeks buffer inventory

**Strategic Depth:**
- Early game: Accept default sourcing
- Mid game: Optimize shipping and suppliers
- Late game: Build regional factories, negotiate agreements

---

## Success Metrics

### Player Engagement
- ✅ Sourcing decisions matter (5-15% cost impact)
- ✅ Multiple viable strategies
- ✅ Tariffs create meaningful choices
- ✅ Lead times affect production planning

### Game Balance
- ✅ No single "best" region for all materials
- ✅ Tariffs don't make any strategy impossible
- ✅ Diversification rewarded but not required
- ✅ Complexity scales with game progression

### Performance
- ✅ Material calculations < 50ms
- ✅ Tariff updates < 10ms
- ✅ UI responsive with 100+ active orders

---

## Next Steps

1. **Review & Approve** this design document
2. **Implement Phase 1** (data models and types)
3. **Build Phase 2** (core engine logic)
4. **Create Phase 3** (UI components)
5. **Integrate Phase 4** (connect to existing systems)
6. **Balance & Test** (validate costs and gameplay)

**Estimated Timeline:** 4-6 weeks for full implementation
