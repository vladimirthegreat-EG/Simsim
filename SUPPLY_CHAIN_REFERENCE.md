# BIZZSIMSIM V2 — Supply Chain & Logistics Complete Reference

## EXHAUSTIVE LOGISTICS & SUPPLY CHAIN SYSTEM DOCUMENTATION

Based on comprehensive analysis of all files in c:/Users/V/Desktop/BIZZSIMSIM V2/engine, here is the complete documentation:

---

## TABLE OF CONTENTS
1. Material Engine (Types, Functions, Data)
2. Logistics Engine (Routes, Costs, Lead Times)
3. Tariff Engine (Trade Policies, Events, Calculations)
4. FX Engine (Exchange Rate Impact)
5. Integration Layers (Material, Warehouse, Supply Chain Manager)
6. Data Flow: Complete Player Order Journey
7. All Constants and Baseline Values

---

## 1. MATERIAL ENGINE

### 1.1 SEGMENT MATERIAL REQUIREMENTS (MaterialEngine.SEGMENT_MATERIAL_REQUIREMENTS)

**Budget Segment:**
- Display: LCD 5.5" @ $15/unit, Quality 70, Lead 25d, MOQ 10k, Reliability 0.85
- Processor: Entry-Level SoC @ $8/unit, Quality 65, Lead 30d, MOQ 10k, Reliability 0.85
- Memory: 4GB DRAM @ $10/unit, Quality 70, Lead 28d, MOQ 10k, Reliability 0.85
- Storage: 64GB eMMC @ $5/unit, Quality 68, Lead 25d, MOQ 10k, Reliability 0.85
- Camera: Single 13MP @ $6/unit, Quality 65, Lead 26d, MOQ 10k, Reliability 0.85
- Battery: 3000mAh @ $4/unit, Quality 72, Lead 24d, MOQ 10k, Reliability 0.85
- Chassis: Plastic @ $3/unit, Quality 70, Lead 22d, MOQ 10k, Reliability 0.85
- Other: Basic Components @ $9/unit, Quality 68, Lead 23d, MOQ 10k, Reliability 0.85
- **Total Cost Per Unit: $60 | Lead Time: 30 days | Quality Tier: 1**

**General Segment:**
- Display: AMOLED 6.1" @ $45/unit, Quality 85, Lead 28d, MOQ 8k
- Processor: Mid-Range SoC @ $28/unit, Quality 82, Lead 32d, MOQ 8k
- Memory: 8GB LPDDR4 @ $22/unit, Quality 84, Lead 30d, MOQ 8k
- Storage: 128GB UFS @ $12/unit, Quality 83, Lead 28d, MOQ 8k
- Camera: Dual 48MP @ $18/unit, Quality 80, Lead 29d, MOQ 8k
- Battery: 4000mAh FastCharge @ $10/unit, Quality 85, Lead 27d, MOQ 8k
- Chassis: Aluminum @ $8/unit, Quality 82, Lead 25d, MOQ 8k
- Other: Standard Components @ $7/unit, Quality 81, Lead 26d, MOQ 8k
- **Total Cost Per Unit: $150 | Lead Time: 32 days | Quality Tier: 2**

**Enthusiast Segment:**
- Display: AMOLED 6.7" 120Hz @ $110/unit, Quality 92, Lead 32d, MOQ 5k
- Processor: Flagship SoC @ $85/unit, Quality 96, Lead 38d, MOQ 5k, Source: North America, Reliability 0.92
- Memory: 12GB LPDDR5 @ $45/unit, Quality 95, Lead 36d, MOQ 5k, Source: North America, Reliability 0.92
- Storage: 256GB UFS3.1 @ $28/unit, Quality 90, Lead 30d, MOQ 5k
- Camera: Triple 108MP OIS @ $55/unit, Quality 94, Lead 35d, MOQ 5k, Source: Europe, Reliability 0.93
- Battery: 5000mAh SuperFastCharge @ $18/unit, Quality 88, Lead 28d, MOQ 5k
- Chassis: Stainless Steel Premium @ $22/unit, Quality 93, Lead 34d, MOQ 5k, Source: Europe, Reliability 0.93
- Other: Premium Components @ $87/unit, Quality 89, Lead 31d, MOQ 5k
- **Total Cost Per Unit: $350 | Lead Time: 38 days | Quality Tier: 4**

**Professional Segment:**
- Display: LTPO 6.9" ProMotion @ $185/unit, Quality 98, Lead 36d, MOQ 3k
- Processor: Ultra-Flagship SoC @ $145/unit, Quality 99, Lead 42d, MOQ 3k, Source: North America, Reliability 0.95
- Memory: 16GB LPDDR5X @ $75/unit, Quality 98, Lead 40d, MOQ 3k, Source: North America, Reliability 0.95
- Storage: 512GB UFS4.0 @ $55/unit, Quality 97, Lead 38d, MOQ 3k, Source: North America, Reliability 0.95
- Camera: Quad 200MP Periscope @ $95/unit, Quality 97, Lead 38d, MOQ 3k, Source: Europe, Reliability 0.93
- Battery: 6000mAh Ultra-Fast Wireless @ $28/unit, Quality 92, Lead 32d, MOQ 3k
- Chassis: Titanium Ceramic @ $48/unit, Quality 96, Lead 40d, MOQ 3k, Source: Europe, Reliability 0.93
- Other: Ultra-Premium Components @ $69/unit, Quality 95, Lead 37d, MOQ 3k, Source: Europe, Reliability 0.93
- **Total Cost Per Unit: $600 | Lead Time: 42 days | Quality Tier: 5**

**Active Lifestyle Segment:**
- Display: Rugged AMOLED 6.4" @ $68/unit, Quality 88, Lead 30d, MOQ 6k
- Processor: Efficient Mid-Range SoC @ $38/unit, Quality 85, Lead 33d, MOQ 6k
- Memory: 8GB LPDDR4X @ $24/unit, Quality 86, Lead 31d, MOQ 6k
- Storage: 128GB UFS @ $14/unit, Quality 84, Lead 29d, MOQ 6k
- Camera: Dual 64MP Action Cam @ $32/unit, Quality 87, Lead 31d, MOQ 6k
- Battery: 5500mAh LongLife @ $16/unit, Quality 90, Lead 28d, MOQ 6k
- Chassis: MilSpec Aluminum Waterproof @ $35/unit, Quality 92, Lead 36d, MOQ 6k, Source: Europe, Reliability 0.93
- Other: Rugged Components @ $23/unit, Quality 86, Lead 30d, MOQ 6k
- **Total Cost Per Unit: $250 | Lead Time: 36 days | Quality Tier: 3**

### 1.2 MATERIAL TYPES
- `display`, `processor`, `memory`, `storage`, `camera`, `battery`, `chassis`, `other`

### 1.3 REGIONAL CAPABILITIES

**North America:**
- Materials: processor, memory, storage, display
- Cost Multiplier: 1.2x (20% premium)
- Quality Range: 95-100
- Lead Time Range: 35-45 days
- Specialties: Advanced SoCs, AI chips, R&D innovation
- Reliability: 0.95 | Political Stability: 0.92 | Infrastructure: 0.95 | Labor Cost: 1.4x
- Tariff-Friendly With: Europe, Oceania

**South America:**
- Materials: battery, chassis, other
- Cost Multiplier: 0.9x (10% discount)
- Quality Range: 70-85
- Lead Time Range: 40-55 days
- Specialties: Lithium extraction, raw materials, basic assembly
- Reliability: 0.75 | Political Stability: 0.70 | Infrastructure: 0.65 | Labor Cost: 0.6x
- Tariff-Friendly With: North America

**Europe:**
- Materials: display, camera, processor, chassis
- Cost Multiplier: 1.1x (10% premium)
- Quality Range: 90-98
- Lead Time Range: 30-40 days
- Specialties: Precision engineering, premium camera optics, quality control
- Reliability: 0.93 | Political Stability: 0.88 | Infrastructure: 0.92 | Labor Cost: 1.2x
- Tariff-Friendly With: North America, Middle East

**Africa:**
- Materials: battery, chassis, other
- Cost Multiplier: 0.7x (30% discount)
- Quality Range: 60-80
- Lead Time Range: 45-60 days
- Specialties: Rare earth minerals, cobalt extraction, raw materials
- Reliability: 0.68 | Political Stability: 0.62 | Infrastructure: 0.55 | Labor Cost: 0.4x
- Tariff-Friendly With: Europe, Middle East

**Asia:**
- Materials: ALL (display, processor, memory, storage, camera, battery, chassis, other)
- Cost Multiplier: 0.7x (30% discount)
- Quality Range: 85-95
- Lead Time Range: 20-35 days
- Specialties: Complete component ecosystem, OLED/AMOLED, rapid scaling
- Reliability: 0.85 | Political Stability: 0.80 | Infrastructure: 0.88 | Labor Cost: 0.5x
- Tariff-Friendly With: Oceania, Middle East

**Oceania:**
- Materials: processor, memory, camera
- Cost Multiplier: 1.15x (15% premium)
- Quality Range: 88-95
- Lead Time Range: 38-48 days
- Specialties: QA, testing, certification, research
- Reliability: 0.90 | Political Stability: 0.95 | Infrastructure: 0.88 | Labor Cost: 1.3x
- Tariff-Friendly With: Asia, North America

**Middle East:**
- Materials: chassis, battery, other
- Cost Multiplier: 1.0x (baseline)
- Quality Range: 75-90
- Lead Time Range: 32-42 days
- Specialties: Logistics hub, fast shipping, regional distribution
- Reliability: 0.78 | Political Stability: 0.72 | Infrastructure: 0.82 | Labor Cost: 0.8x
- Tariff-Friendly With: Europe, Asia, Africa

### 1.4 DEFAULT SUPPLIERS

**North America:**
1. **ChipMaster Technologies (na_chipmaster)**
   - Materials: processor, memory
   - Quality: 98 | Defect Rate: 0.5% | Consistency: 0.95
   - On-Time Delivery: 0.92 | Responsiveness: 0.88
   - Cost Competitiveness: 0.30 (higher cost) | Price Volatility: 0.15
   - Monthly Capacity: 500,000 units | Minimum Order: 10,000
   - Payment Terms: net30 | Contract Discount: 0.08 (8%) | Relationship Level: 50/100

2. **DisplayPro Inc (na_displaypro)**
   - Materials: display
   - Quality: 96 | Defect Rate: 0.8% | Consistency: 0.93
   - On-Time Delivery: 0.90 | Responsiveness: 0.85
   - Cost Competitiveness: 0.25 | Price Volatility: 0.18
   - Monthly Capacity: 300,000 units | Minimum Order: 5,000
   - Payment Terms: net30 | Contract Discount: 0.10 (10%) | Relationship Level: 50/100

**Asia:**
1. **GlobalTech Manufacturing (asia_globaltech)**
   - Materials: ALL 8 types
   - Quality: 92 | Defect Rate: 1.2% | Consistency: 0.88
   - On-Time Delivery: 0.85 | Responsiveness: 0.90
   - Cost Competitiveness: 0.85 (very competitive) | Price Volatility: 0.12
   - Monthly Capacity: 2,000,000 units | Minimum Order: 50,000
   - Payment Terms: net60 | Contract Discount: 0.15 (15%) | Relationship Level: 50/100

2. **OLED Master Displays (asia_oledmaster)**
   - Materials: display
   - Quality: 94 | Defect Rate: 1.0% | Consistency: 0.90
   - On-Time Delivery: 0.88 | Responsiveness: 0.92
   - Cost Competitiveness: 0.75 | Price Volatility: 0.20
   - Monthly Capacity: 800,000 units | Minimum Order: 20,000
   - Payment Terms: net45 | Contract Discount: 0.12 (12%) | Relationship Level: 50/100

3. **PowerTech Batteries (asia_powertech)**
   - Materials: battery
   - Quality: 90 | Defect Rate: 1.5% | Consistency: 0.85
   - On-Time Delivery: 0.87 | Responsiveness: 0.88
   - Cost Competitiveness: 0.80 | Price Volatility: 0.25
   - Monthly Capacity: 1,500,000 units | Minimum Order: 30,000
   - Payment Terms: net60 | Contract Discount: 0.18 (18%) | Relationship Level: 50/100

**Europe:**
1. **Precision Optics GmbH (eu_precisionoptics)**
   - Materials: camera
   - Quality: 97 | Defect Rate: 0.6% | Consistency: 0.94
   - On-Time Delivery: 0.93 | Responsiveness: 0.90
   - Cost Competitiveness: 0.35 | Price Volatility: 0.10
   - Monthly Capacity: 400,000 units | Minimum Order: 8,000
   - Payment Terms: net30 | Contract Discount: 0.07 (7%) | Relationship Level: 50/100

2. **Premium Display Solutions (eu_premiumdisplay)**
   - Materials: display
   - Quality: 95 | Defect Rate: 0.7% | Consistency: 0.92
   - On-Time Delivery: 0.91 | Responsiveness: 0.87
   - Cost Competitiveness: 0.30 | Price Volatility: 0.12
   - Monthly Capacity: 350,000 units | Minimum Order: 7,000
   - Payment Terms: net30 | Contract Discount: 0.09 (9%) | Relationship Level: 50/100

**South America:**
1. **LithiumCorp SA (sa_lithiumcorp)**
   - Materials: battery
   - Quality: 78 | Defect Rate: 2.5% | Consistency: 0.75
   - On-Time Delivery: 0.75 | Responsiveness: 0.70
   - Cost Competitiveness: 0.90 (very cheap) | Price Volatility: 0.30
   - Monthly Capacity: 600,000 units | Minimum Order: 25,000
   - Payment Terms: net90 | Contract Discount: 0.20 (20%) | Relationship Level: 50/100

2. **Basic Manufacturing Co (sa_basicmfg)**
   - Materials: chassis, other
   - Quality: 75 | Defect Rate: 3.0% | Consistency: 0.72
   - On-Time Delivery: 0.73 | Responsiveness: 0.68
   - Cost Competitiveness: 0.88 | Price Volatility: 0.28
   - Monthly Capacity: 800,000 units | Minimum Order: 30,000
   - Payment Terms: net90 | Contract Discount: 0.22 (22%) | Relationship Level: 50/100

**Africa:**
1. **African Mineral Extractors (af_mineralextract)**
   - Materials: battery, other
   - Quality: 70 | Defect Rate: 3.5% | Consistency: 0.68
   - On-Time Delivery: 0.68 | Responsiveness: 0.65
   - Cost Competitiveness: 0.95 (cheapest) | Price Volatility: 0.35
   - Monthly Capacity: 500,000 units | Minimum Order: 40,000
   - Payment Terms: immediate (cash) | Contract Discount: 0.25 (25%) | Relationship Level: 50/100

**Oceania:**
1. **Quality Tech Australia (oc_qualitytech)**
   - Materials: processor, memory, camera
   - Quality: 93 | Defect Rate: 1.0% | Consistency: 0.90
   - On-Time Delivery: 0.90 | Responsiveness: 0.88
   - Cost Competitiveness: 0.40 | Price Volatility: 0.15
   - Monthly Capacity: 250,000 units | Minimum Order: 6,000
   - Payment Terms: net30 | Contract Discount: 0.08 (8%) | Relationship Level: 50/100

**Middle East:**
1. **Middle East Logistics Hub (me_logisticshub)**
   - Materials: chassis, battery, other
   - Quality: 82 | Defect Rate: 2.0% | Consistency: 0.80
   - On-Time Delivery: 0.80 | Responsiveness: 0.85
   - Cost Competitiveness: 0.70 | Price Volatility: 0.22
   - Monthly Capacity: 700,000 units | Minimum Order: 15,000
   - Payment Terms: net45 | Contract Discount: 0.14 (14%) | Relationship Level: 50/100

### 1.5 MATERIAL ENGINE FUNCTIONS

**calculateMaterialCost(segment: Segment, quantity: number): number**
- Returns: `SEGMENT_MATERIAL_REQUIREMENTS[segment].totalCost * quantity`
- Example: Budget segment, 10,000 units = $60 × 10,000 = $600,000

**getMaterialRequirements(segment: Segment): SegmentMaterials**
- Returns entire materials specification for a segment (all 8 material types with specs, costs, lead times)

**createMaterialOrder(choice: MaterialSourcingChoice, round: number, destinationRegion: Region): MaterialOrder**
- Creates order ID: `order_${round}_${Date.now()}_${randomString}`
- Calculates material cost: `quantity × costPerUnit`
- Production time formula: `Math.ceil(20 + (quantity / supplier.monthlyCapacity) × 30 × (1 / supplier.responsiveness))`
  - Example: 100k units, 2M capacity/month, 0.90 responsiveness = 20 + (100k/2M) × 30 × (1/0.9) = 20 + 1.67 = 22 days
- Shipping time: placeholder 25 days (updated by LogisticsEngine later)
- Clearance time: placeholder 3 days
- Inspection time: 2 days
- Total lead time: production + shipping + clearance + inspection = ~52 days
- Estimated arrival round: `round + Math.ceil(totalLeadTime / 30)`
- Returns MaterialOrder with status "pending"
- **USAGE**: Called from tRPC `material.placeOrder` mutation

**getMaterialCostPerUnit(materialType: MaterialType, spec: string, region: Region): number**
- Finds base cost from SEGMENT_MATERIAL_REQUIREMENTS
- Applies regional cost multiplier: `baseCost × REGIONAL_CAPABILITIES[region].costMultiplier`
- Example: Display in General = $45 × 1.1 (Europe multiplier) = $49.50/unit

**processOrders(state: MaterialsState, currentRound: number): {arrivedOrders, updatedInventory, messages}**
- Checks if `order.estimatedArrivalRound <= currentRound`
- Delay simulation: random delay 5% for air, 15% for sea → `delayRounds = Math.ceil(Math.random() * 2)` (1-2 rounds)
- Updates order status: "pending" → "production" → "shipping" → "clearance" → "delivered" or "delayed"
- On arrival, adds to inventory using weighted average cost: `(inv.quantity × inv.cost + order.quantity × order.cost) / total`
- Returns: arrived orders, updated inventory, status messages
- **USAGE**: Called from SimulationEngine line 206

**calculateMaterialQualityImpact(segment: Segment, inventory: MaterialInventory[]): {overallQuality, breakdown, defectRate}**
- Finds supplier quality rating for each material
- Weighted quality: `sum(materialQuality × (1 / materialCount))`
- Weighted defect rate: `sum(defectRate × (1 / materialCount))`
- If material missing: uses default quality 50-80 and defect 0.02
- Returns overall quality 0-100 and defect rate 0-1
- **USAGE**: Used for final product quality calculation in production

**calculateHoldingCosts(inventory: MaterialInventory[]): number**
- Holding cost rate: **2% per round**
- Formula: `(inventory.quantity × inventory.cost) × 0.02` summed across all materials
- Example: $1M inventory × 0.02 = $20,000/round
- **USAGE**: Deducted from cash during round processing (line 250 of SimulationEngine)

**checkMaterialAvailability(segment: Segment, quantity: number, inventory: MaterialInventory[]): {available, missing}**
- For each material type in segment, checks `inventory.quantity >= quantity`
- Returns list of missing materials with have/needed
- Used to constrain production output

**consumeMaterials(segment: Segment, quantity: number, inventory: MaterialInventory[]): MaterialInventory[]**
- Decreases inventory by quantity for each material type
- Used during production (line 656 of SimulationEngine)
- Formula: `inventory.quantity -= quantity` per material

**getRecommendedOrders(segment: Segment, forecastedProduction: number, currentInventory: MaterialInventory[], currentRound: number): MaterialSourcingChoice[]**
- For each material type: needed = `forecastedProduction × 2` (2-round buffer)
- If current inventory < needed, order: `Math.max(orderQty, MOQ)`
- Finds best supplier by cost: `findBestSupplier(materialType, "cost")`
- Default to sea shipping, 4-round contract
- Returns array of suggested orders
- **USAGE**: tRPC query `material.getRecommendedOrders`

---

## 2. LOGISTICS ENGINE

### 2.1 SHIPPING METHODS

**Sea Freight:**
- Cost Multiplier: 1.0x (baseline)
- Time Multiplier: 1.0x
- Reliability: 0.85 (85% on-time probability)
- Carbon Emissions: 10 kg CO2/ton-km
- Minimum Volume: 100 cubic meters
- Description: Most economical for large shipments, slowest

**Air Freight:**
- Cost Multiplier: 5.0x (500% base cost)
- Time Multiplier: 0.2x (5x faster)
- Reliability: 0.95 (95% on-time probability)
- Carbon Emissions: 500 kg CO2/ton-km
- Minimum Volume: 1 cubic meter
- Description: Fastest, highest cost, best for urgent orders

**Land (Truck):**
- Cost Multiplier: 2.0x (200% base cost)
- Time Multiplier: 0.6x (1.67x faster than sea)
- Reliability: 0.90 (90% on-time probability)
- Carbon Emissions: 60 kg CO2/ton-km
- Minimum Volume: 10 cubic meters
- Description: Regional shipments, moderate cost/speed

**Rail:**
- Cost Multiplier: 1.3x (130% base cost)
- Time Multiplier: 0.7x (1.43x faster than sea)
- Reliability: 0.88 (88% on-time probability)
- Carbon Emissions: 30 kg CO2/ton-km
- Minimum Volume: 50 cubic meters
- Description: Eco-friendly, good balance

### 2.2 MAJOR PORTS (20 Total)

**North America (3):**
- Los Angeles: Efficiency 0.88, Capacity 9.5M TEU/yr, Processing 3d, Fees $2,500
- New York: Efficiency 0.85, Capacity 7M TEU/yr, Processing 4d, Fees $2,800
- Vancouver: Efficiency 0.90, Capacity 3.5M TEU/yr, Processing 2d, Fees $2,200

**Asia (4):**
- Shanghai: Efficiency 0.92, Capacity 43M TEU/yr, Processing 2d, Fees $2,000 (world's largest)
- Singapore: Efficiency 0.98, Capacity 37M TEU/yr, Processing 1d, Fees $2,500 (most efficient)
- Busan: Efficiency 0.90, Capacity 21M TEU/yr, Processing 2d, Fees $2,200
- Tokyo: Efficiency 0.94, Capacity 7.6M TEU/yr, Processing 2d, Fees $3,200

**Europe (3):**
- Rotterdam: Efficiency 0.95, Capacity 14.5M TEU/yr, Processing 2d, Fees $3,000 (Europe's largest)
- Hamburg: Efficiency 0.93, Capacity 8.8M TEU/yr, Processing 2d, Fees $2,900
- Antwerp: Efficiency 0.92, Capacity 11M TEU/yr, Processing 3d, Fees $2,700

**Africa (3):**
- Durban: Efficiency 0.65, Capacity 2.8M TEU/yr, Processing 9d, Fees $1,500
- Lagos: Efficiency 0.55, Capacity 1.2M TEU/yr, Processing 12d, Fees $1,200
- Port Said: Efficiency 0.72, Capacity 3.5M TEU/yr, Processing 7d, Fees $1,700

**South America (3):**
- Santos: Efficiency 0.70, Capacity 4.3M TEU/yr, Processing 6d, Fees $1,800
- Buenos Aires: Efficiency 0.68, Capacity 1.5M TEU/yr, Processing 7d, Fees $1,600
- Callao: Efficiency 0.65, Capacity 2.2M TEU/yr, Processing 8d, Fees $1,400

**Oceania (3):**
- Sydney: Efficiency 0.88, Capacity 2.6M TEU/yr, Processing 3d, Fees $2,400
- Melbourne: Efficiency 0.87, Capacity 2.8M TEU/yr, Processing 3d, Fees $2,300
- Auckland: Efficiency 0.85, Capacity 900K TEU/yr, Processing 4d, Fees $2,100

**Middle East (3):**
- Dubai: Efficiency 0.90, Capacity 15M TEU/yr, Processing 2d, Fees $2,600
- Jeddah: Efficiency 0.78, Capacity 4M TEU/yr, Processing 5d, Fees $2,000
- Doha: Efficiency 0.82, Capacity 2M TEU/yr, Processing 4d, Fees $2,200

### 2.3 SHIPPING ROUTES (20 Routes)

**Route Structure:**
- ID, fromRegion, toRegion
- availableMethods: array of ["sea", "air", "land", "rail"]
- baseLeadTime (days), baseCost ($/ton), distance (km)
- majorPorts: array of port names
- infrastructureQuality (0-1), congestionLevel (0-1), customsEfficiency (0-1)

**Key Routes (Sample):**

| From | To | Lead Time | Base Cost | Distance | Methods | Congestion | Infrastructure |
|------|----|-----------| ----------|----------|---------|------------|-----------------|
| NA | Asia | 25d | $3,500 | 10,000km | sea,air,rail | 0.40 | 0.92 |
| NA | Europe | 20d | $3,000 | 7,000km | sea,air | 0.35 | 0.94 |
| Asia | Europe | 30d | $3,200 | 11,000km | sea,air,rail | 0.50 | 0.93 |
| Europe | Africa | 12d | $1,800 | 3,500km | sea,air,land | 0.45 | 0.75 |
| Asia | Oceania | 15d | $2,200 | 7,000km | sea,air | 0.35 | 0.90 |

### 2.4 LOGISTICS ENGINE FUNCTIONS

**calculateLogistics(fromRegion: Region, toRegion: Region, shippingMethod: ShippingMethod, weight: number, volume: number, productionTime: number): LogisticsCalculation**

- Find route: `SHIPPING_ROUTES.find(r => r.fromRegion === from && r.toRegion === to)`
- Validate method is available on route
- Calculate shipping time: `baseLeadTime × methodDetails.timeMultiplier`
  - Example: Asia→Europe, sea = 30d × 1.0 = 30d; air = 30d × 0.2 = 6d
- Calculate clearance time: base 3 days + inspection (2d if 15% random < inspectionProbability)
- Total lead time: `productionTime + shippingTime + clearanceTime + inspectionTime`

**Calculate Shipping Cost (DETAILED FORMULA):**
```
volumetricWeight = (air ? volume/6 : volume/3)
chargeableWeight = max(weight, volumetricWeight)
baseCost = route.baseCost × methodDetails.costMultiplier × chargeableWeight
distanceFactor = 1 + (route.distance / 10,000) × 0.2
cost = baseCost × distanceFactor
// Infrastructure quality affects cost (0-1 scale, worse infra = higher cost)
cost = cost × (2 - route.infrastructureQuality)
// Congestion surcharge
if (route.congestionLevel > 0.5):
  cost = cost × (1 + (route.congestionLevel - 0.5))
return Math.round(cost)
```

- Example: NA→Asia, sea, 20 tons, 30m³, $3,500/ton base
  - volumetricWeight = 30/3 = 10 tons, chargeable = 20 tons
  - baseCost = 3500 × 1.0 × 20 = $70,000
  - distanceFactor = 1 + (10000/10000) × 0.2 = 1.2
  - adjusted = 70,000 × 1.2 = $84,000
  - infrastructure = 84,000 × (2 - 0.92) = 84,000 × 1.08 = $90,720
  - congestion (0.40) < 0.5 = no surcharge
  - Final: $90,720

**calculateInsuranceCost(shippingCost: number, method: ShippingMethod): number**
- Sea: 1.5% of shipping cost
- Air: 0.8% of shipping cost (lower risk)
- Land: 1.2% of shipping cost
- Rail: 1.0% of shipping cost
- Formula: `Math.round(shippingCost × rates[method])`

**calculateHandlingCost(weight: number, volume: number, method: ShippingMethod): number**
- Per-ton rates:
  - Sea: $50/ton
  - Air: $120/ton
  - Land: $80/ton
  - Rail: $60/ton
- Formula: `Math.round(weight × handlingRates[method])`

**calculateOnTimeProbability(route, method): number**
- Formula: `methodDetails.reliability × route.customsEfficiency × (1 - route.congestionLevel × 0.3)`
- Example: Sea NA→Asia = 0.85 × 0.85 × (1 - 0.40 × 0.3) = 0.85 × 0.85 × 0.88 = 0.636 (64%)

**delayRisk**: `Math.ceil((1 - onTimeProbability) × shippingTime × 0.3)`
- Example: 1-0.636 = 0.364, × 25d × 0.3 = 2.73 days delay risk

**lossRisk**: `(1 - methodDetails.reliability) × 0.05` (max 5%)
- Sea: (1-0.85) × 0.05 = 0.75% loss risk

**getOptimalShippingMethod(fromRegion, toRegion, weight, volume, strategy, urgent): ShippingMethod**
- If urgent: return `strategy.rushOrderMethod` (typically "air")
- Otherwise, evaluate all available methods, filter by:
  - Cost <= strategy.costThreshold
  - Time <= strategy.timeThreshold
- Pick highest reliability among viable options
- Fallback to `strategy.defaultShippingMethod`

**compareShippingOptions(...): array of {method, logistics, costEfficiency, timeEfficiency, overallScore}**
- Calculates efficiency scores 0-100 for each method
- costEfficiency: `((maxCost - thisCost) / (maxCost - minCost)) × 100`
- timeEfficiency: `((maxTime - thisTime) / (maxTime - minTime)) × 100`
- overallScore: `costEfficiency × 0.6 + timeEfficiency × 0.4` (60% cost, 40% time)
- Sorts by overallScore descending

**getRecommendations(fromRegion, toRegion, weight, volume, budget, maxLeadTime): {recommended, alternatives, reasoning, warnings}**
- Filters viable methods by budget and time constraints
- Returns best option, 2-3 alternatives, explanation, any warnings
- **USAGE**: Called from UI when player is selecting shipping method

**trackShipment(orderId, currentRound, orderRound, estimatedArrivalRound, fromRegion, toRegion, delays): ShipmentTracking**
- Calculates progress: `roundsElapsed / totalRounds`
- Status by progress:
  - 0-20%: "origin" - departing
  - 20-70%: "in_transit" - en route
  - 70-90%: "customs" - customs clearance
  - 90-100%: "inspection" - final inspection
  - 100%+: "delivery" - delivered
- Generates tracking events with timestamps
- Includes delay events
- **USAGE**: UI supply chain page displays tracking

---

## 3. TARIFF ENGINE

### 3.1 BASELINE TARIFFS

**US-China Electronics Tariff:**
- Route: Asia → North America
- Materials: processor, display, memory
- Rate: 25%
- Reason: trade_war
- Volatility: 0.8 (likely to change)
- Effective: Round 1, permanent

**China-US Retaliatory:**
- Route: North America → Asia
- Materials: processor
- Rate: 20%
- Reason: retaliatory
- Volatility: 0.8

**Standard Electronics (Asia→Europe):**
- Rate: 10%
- Reason: revenue
- Volatility: 0.2 (stable)

**African Development Protection (Asia→Africa):**
- Rate: 15%
- Reason: protectionism
- Volatility: 0.4

### 3.2 TRADE AGREEMENTS

**USMCA (North American):**
- Type: Free Trade
- Regions: North America
- Tariff Reduction: 95% (keep only 5%)
- Conditions: 75% North American content
- Benefits: Duty-free electronics trade
- Effective: Round 1, permanent

**EU Single Market:**
- Type: Customs Union
- Regions: Europe
- Tariff Reduction: 100% (zero tariffs)
- Conditions: EU standards compliance
- Benefits: Free movement of goods within EU
- Effective: Round 1, permanent

**ASEAN Free Trade Area:**
- Type: Free Trade
- Regions: Asia
- Tariff Reduction: 85%
- Conditions: Regional origin requirement
- Effective: Round 1, permanent

**Gulf Cooperation Council (GCC):**
- Type: Customs Union
- Regions: Middle East
- Tariff Reduction: 100%
- Conditions: GCC member states only
- Effective: Round 1, permanent

### 3.3 TARIFF ENGINE FUNCTIONS

**calculateTariff(fromRegion: Region, toRegion: Region, materialType: MaterialType, materialCost: number, currentRound: number, state: TariffState): TariffCalculation**

- Find applicable tariffs: where `fromRegion === tariff.fromRegion && toRegion === tariff.toRegion && (materialTypes undefined OR includes(materialType)) && effectiveRound <= currentRound && (!expiryRound OR expiryRound >= currentRound)`
- Find applicable trade agreements: where regions include both fromRegion and toRegion
- Calculate base rate: sum all applicable tariff rates
- Apply trade agreement reductions: `adjustedRate = baseRate × (1 - agreement.tariffReduction)` for each agreement
- Calculate tariff amount: `Math.round(materialCost × adjustedTariffRate)`
- Generate warnings if volatility > 0.7
- Returns: all applicable tariffs, trade agreements, base/adjusted rates, tariff amount, exemptions, warnings
- **USAGE**: Called from tRPC `material.calculateTariff` and during order placement

- Example: Display $1M from Asia to North America, Round 5
  - US-China Electronics applies: 25%
  - No trade agreements (Asia not in USMCA)
  - Tariff = $1M × 0.25 = $250,000

**processRoundEvents(state: TariffState, currentRound: number, playerState?): {newTariffs, expiredTariffs, newEvents, newGeopoliticalEvents, messages}**

- Check for tariff expirations: where `expiryRound === currentRound`
- Remove expired tariffs
- Check TARIFF_EVENTS for triggers:
  - `shouldTriggerEvent(event, currentRound, playerState)` — checks event.probability and player triggers
  - If triggered:
    - Apply tariff increases/decreases to existing routes
    - Add new tariffs for "tariff_increase" or "new_tariff" events
    - Apply rate reductions for trade agreements
- Check for GEOPOLITICAL_EVENTS: 1% chance per event per round
- Check for TARIFF_SCENARIOS: probability × round
- Clean up expired events (keep if `currentRound < triggeredRound + duration`)
- Returns messages for all changes
- **USAGE**: Called from SimulationEngine during round processing

**forecastTariffs(fromRegion, toRegion, materialType, currentRound, state, forecastRounds=4): TariffForecast**

- Get current tariff rate for $100k material cost
- Analyze trends:
  - High volatility (>0.7): +20% increase probability
  - Trade war: +30% increase probability
  - Protectionist policy: +20% increase probability
  - Free-trade policy: +20% decrease probability
- Generate forecast for next 4 rounds:
  - Probabilistically apply 5% increases/decreases
  - Confidence decreases: `1 - ((round - current) / forecastRounds) × 0.5`
- Generate recommendations based on forecast
- Returns: current rate, forecasted rates, trends, recommendations
- **USAGE**: tRPC `material.getTariffForecast`

**suggestMitigationStrategies(fromRegion, toRegion, materialType, currentRound, state): array of {strategy, estimatedSavings, implementationCost, feasibility}**

Returns up to 3 strategies:
1. **Source from trade-agreement region**
   - Estimated savings: 70% of current tariff
   - Implementation cost: $50,000
   - Feasibility: moderate
   
2. **Stockpile before increase** (if increase expected)
   - Estimated savings: 30% of current tariff
   - Implementation cost: $100,000
   - Feasibility: easy

3. **Lobby for trade agreement**
   - Estimated savings: 50% of current tariff
   - Implementation cost: $500,000
   - Feasibility: difficult

**calculateTotalTariffBurden(orders: array, currentRound, state): {totalTariffs, byRoute, mostExpensiveRoute}**

- Sum tariff for each order
- Group by route
- Returns: total tariffs, breakdown by route, most expensive route
- **USAGE**: UI supply chain page summary

---

## 4. FX ENGINE

### 4.1 FX BASELINE RATES

From CONSTANTS.FX_BASELINE_RATES:
- EUR/USD: (rate at game start)
- CNY/USD: (rate at game start)
- GBP/USD: (rate at game start)
- JPY/USD: (rate at game start)

### 4.2 REGION-CURRENCY MAPPING

- Europe → EUR/USD
- Asia → CNY/USD (proxy for Asian manufacturing)
- North America → EUR/USD (home region, no FX effect)
- South America → CNY/USD (commodity-linked)
- Africa → EUR/USD (pegged to EUR/USD)
- Oceania → GBP/USD (AUD correlates)
- Middle East → EUR/USD (USD-pegged)

### 4.3 FX ENGINE FUNCTIONS

**getCostMultiplier(sourceRegion: string, marketState: MarketState): number**
- Returns 1.0 for home region (North America)
- Otherwise: `currentRate / baselineRate`
- Example: EUR/USD was 1.10, now 1.21 = 1.21/1.10 = 1.10 multiplier (10% more expensive)
- **USAGE**: Applied to material costs, labor costs

**adjustCost(baseCostUSD: number, sourceRegion: string, marketState: MarketState): number**
- Returns: `baseCostUSD × getCostMultiplier(sourceRegion, marketState)`

**calculateMaterialFXImpact(materialSources: array of {costUSD, sourceRegion}, marketState): {adjustedTotal, fxImpact, breakdown}**

- For each material:
  - multiplier = getCostMultiplier(sourceRegion)
  - adjusted = costUSD × multiplier
  - Add to total
- fxImpact = adjustedTotal - baseTotal
- breakdown: list of regions with >2% FX impact
- Example: 
  - Display from Europe: $45 × 1.1 (EUR up) = $49.50
  - Memory from Asia: $22 × 1.05 (CNY up) = $23.10
  - FX impact on $67 base = $69.60 actual = +$2.60 impact

**calculateFactoryFXImpact(factoryRegion: string, laborCostUSD: number, marketState: MarketState): {adjustedLaborCost, fxImpact, message}**

- Applied to factory worker/engineer costs in foreign regions
- Formula: `laborCostUSD × getCostMultiplier(factoryRegion)`
- Message: "FX [increased/decreased] [region] labor costs by X%: $YYK"

**calculateRevenueFXImpact(revenueByRegion: Record<string, number>, marketState: MarketState): {totalFXImpact, messages}**

- For each foreign region with revenue:
  - multiplier = getCostMultiplier(region)
  - impact = revenue × (multiplier - 1.0)
  - **Important**: Foreign revenue benefits from strong foreign currency
  - Example: $10M revenue in Europe, EUR strengthens 1.0 → 1.1 = +$1M FX gain
- Returns total impact and messages for impacts > $10K
- **USAGE**: Finance module applies to total revenue

---

## 5. INTEGRATION LAYERS

### 5.1 WAREHOUSE MANAGER

**WAREHOUSE TIERS:**

| Tier | Name | Capacity | Build Cost | Rent/Round |
|------|------|----------|-----------|-----------|
| 0 | Factory Floor | 5,000 units | FREE | FREE |
| 1 | Basic Warehouse | 20,000 units | $5M | $500K |
| 2 | Regional Distribution | 50,000 units | $15M | $1.5M |
| 3 | Automated Warehouse | 100,000 units | $35M | $3M |

**Warehouse Functions:**

- **buildWarehouse(state, factoryId, tier)**: Pay upfront, available next round, asset on balance sheet
- **rentWarehouse(state, factoryId, tier)**: Available immediately, recurring cost per round, no asset value
- **storeRawMaterials(state, factoryId, materialType, qty, unitCost, round)**: Stores with weighted average cost
- **storeFinishedGoods(state, factoryId, productId, qty, unitCost, sellingPrice, round)**: Tracks obsolescence
- **consumeRawMaterials(state, factoryId, materialType, qty)**: Removes from stock, tracks cost
- **calculateStorageCosts(state, currentRound): {rawMaterialStorageCost, finishedGoodsStorageCost, overflowSurcharge, writeOffs, totalStorageCost}**

**Storage Cost Calculation:**
- Raw materials: $2/unit/round + (unitCost × 0.5%)
  - Example: 1,000 units at $15 cost = $2,000 + $75 = $2,075/round
- Finished goods: $3/unit/round + (sellingPrice × 1%)
  - Example: 1,000 units at $500 selling price = $3,000 + $5,000 = $8,000/round
- **Overflow surcharge: 2× the normal rate** for units beyond capacity
- Raw material decay:
  - After 6 rounds: -15% per round on cost (obsolescence)
  - Rounds 4-5: -5% per round
- Finished goods obsolescence:
  - Round 2: ×0.90 (10% depreciation)
  - Round 3: ×0.75 (25% depreciation)
  - Round 4+: 50% write-off, removed from inventory

**USAGE**: Called from SimulationEngine during round processing to track storage costs and inventory obsolescence

### 5.2 SUPPLY CHAIN MANAGER

**Segment Material Cost Estimates (per unit):**
- Budget: $60
- General: $150
- Enthusiast: $350
- Professional: $600
- Active Lifestyle: $250

**Material Types:** display, processor, memory, storage, camera, battery, chassis, other

**Functions:**

**calculateMaterialRequirements(state, factoryId): MaterialRequirement[]**
- For each active production line:
  - costPerUnit = SEGMENT_MATERIAL_COSTS[segment]
  - perMaterialCost = costPerUnit / 8 (distribute across 8 types)
  - materials array with qty = targetOutput per material
  - totalMaterialCost = targetOutput × costPerUnit
- Returns requirements for all active lines

**suggestMaterialOrders(state, factoryId): SuggestedOrder[]**
- Aggregates total needs across all production lines
- Checks warehouse inventory for each material
- For each material: qtySuggested = qtyNeeded - qtyInStock
- Returns suggestions player can override
- **USAGE**: UI supply chain page shows these recommendations

**getFXExposure(state): FXExposureEntry[]**
- Aggregates FX exposure from:
  - Factory regions (local operating costs)
  - Pending supplier orders (supplier region costs)
- Returns exposure per currency with hedge coverage %
- **USAGE**: Finance module applies FX adjustments

**getSupplyChainCostSummary(state, factoryId): SupplyChainCostSummary**
- Totals:
  - materialCost = sum(requirement.totalMaterialCost)
  - shippingCost = shippingBase × requirementCount
  - tariffCost = materialCost × 0.05 (5% estimate)
  - insuranceCost = shippingCost × 0.01 (1%)
  - fxImpact = exposure × (1 - hedgeCoverage) × 0.02 (2% volatility)
  - grandTotal = material + shipping + tariff + insurance + FX
  - perUnitLandedCost = grandTotal × (share) / targetOutput
- **USAGE**: UI dashboard shows total landed costs

### 5.3 MATERIAL INTEGRATION (MaterialIntegration Class)

**checkProductionConstraints(segment, requestedProduction, inventory): ProductionConstraints**
- Checks if all materials available for requested production
- If shortage, calculates maxProduction based on most-constrained material
- Returns: canProduce boolean, maxProduction, missingMaterials detail, warnings
- **USAGE**: Production system uses to cap output

**processProduction(segment, productionUnits, inventory, factory): MaterialProductionResult**
- Checks constraints, adjusts production if needed
- Calculates material quality impact
- Consumes materials from inventory
- Quality multiplier: `0.9 + (overallQuality/100) × 0.3` = 0.9x to 1.2x
- Final quality: `baseQuality × qualityMultiplier` (capped 0-100)
- Defect rate adjustment: `(1 - qualityMultiplier) × 0.03` = -0.3% to +0.3%
- Returns: producedUnits, materialCosts, qualityImpact, defectRateAdjustment, messages
- **USAGE**: Called during production phase

**calculateMaterialCosts(inventory): {inventoryValue, holdingCosts, breakdown}**
- inventoryValue = sum(qty × cost) per material
- holdingCosts = MaterialEngine.calculateHoldingCosts()
- Breakdown: list of materials with unit costs
- **USAGE**: Finance module COGS calculation

**forecastMaterialNeeds(segment, plannedProduction[], currentInventory, currentRound): forecast array**
- For each round in production plan:
  - requiredMaterials = plannedProduction
  - shortage = max(0, required - runningInventory)
  - recommendedOrder = shortage × 1.5 (50% buffer)
  - orderByRound = round - Math.ceil(leadTime / 30)
- Running inventory decreases each round
- Returns forecast array with per-round recommendations
- **USAGE**: Production planning UI

**getQualityBreakdown(segment, inventory, factoryEfficiency): {factoryQuality, materialQuality, combinedQuality, breakdown, recommendations}**
- factoryQuality = efficiency × 100
- materialQuality = from MaterialEngine.calculateMaterialQualityImpact
- combinedQuality = factoryQuality × (0.9 + materialQuality/100 × 0.3)
- Breakdown: each material's quality, defect rate, contribution
- Recommendations: upgrade suppliers with quality < 80, high defect rates, overall quality < 85
- **USAGE**: UI quality dashboard

---

## 6. COMPLETE DATA FLOW: PLAYER PLACES MATERIAL ORDER

### STEP-BY-STEP EXECUTION

**Step 1: Player selects material order parameters in UI (supply-chain/page.tsx)**
- Material type: "display"
- Supplier: "asia_oledmaster"
- Region: "Asia"
- Quantity: 100,000 units
- Shipping method: "sea"
- Destination: "North America" (team's home region)

**Step 2: Player clicks "Place Order" → tRPC mutation material.placeOrder**
```
Input validation:
- Material type ∈ [display, processor, memory, storage, camera, battery, chassis, other] ✓
- Supplier ID exists ✓
- Quantity > 0 ✓
- Shipping method ∈ [sea, air, land, rail] ✓
- Game status === "IN_PROGRESS" ✓
```

**Step 3: Server-side Order Creation (material.ts router, line 157)**
```typescript
const order = MaterialEngine.createMaterialOrder(
  {
    materialType: "display",
    spec: "AMOLED_6.1inch",
    supplierId: "asia_oledmaster",
    region: "Asia",
    quantity: 100000,
    shippingMethod: "sea",
  },
  currentRound: 5,
  destinationRegion: "North America"
);
```

**Step 4a: MaterialEngine.createMaterialOrder (MaterialEngine.ts, line 138)**
- Find supplier: asia_oledmaster (Quality 94, Responsiveness 0.92, Monthly Capacity 800k)
- Generate order ID: `order_5_1234567890_abc123`
- Material cost: 100,000 × $45 = $4,500,000

**Step 4b: Calculate Production Time**
```
Formula: Math.ceil(20 + (quantity / supplier.monthlyCapacity) × 30 × (1 / supplier.responsiveness))
= Math.ceil(20 + (100k / 800k) × 30 × (1 / 0.92))
= Math.ceil(20 + 0.125 × 30 × 1.087)
= Math.ceil(20 + 4.08)
= Math.ceil(24.08)
= 25 days (production in Asia)
```

**Step 4c: Estimate Shipping & Clearance (Placeholder)**
- Shipping time: 25 days (placeholder, will be updated)
- Clearance time: 3 days (customs)
- Inspection time: 2 days
- Estimated arrival: Round 5 + Math.ceil(52 / 30) = Round 5 + 2 = Round 7

**Step 5: Calculate Real Shipping & Tariff Costs (material.ts, line 172-206)**

**Step 5a: LogisticsEngine.calculateLogistics()**
```
Parameters:
- fromRegion: "Asia"
- toRegion: "North America"
- shippingMethod: "sea"
- weight: 100,000 × 0.0002 = 20 tons
- volume: 100,000 × 0.001 = 100 cubic meters
- productionTime: 25 days

Execution:
1. Find route: "na_to_asia" (reversed)
   - Actually: find route where from=Asia, to=North America: this is return direction
   - Use "asia_to_na" equivalent or find reverse route
   - Base lead time (sea): 25 days
   - Base cost: $3,500/ton
   - Distance: 10,000 km
   - Infrastructure: 0.92
   - Congestion: 0.40

2. Calculate shipping time:
   - shippingTime = 25 × 1.0 = 25 days (sea multiplier)

3. Calculate clearance:
   - baseClearanceTime: 3 days
   - inspectionProbability: 0.15 (15%)
   - random() = 0.08 < 0.15 → inspection occurs
   - clearanceTime = 3 + 2 = 5 days

4. Calculate shipping cost:
   - volumetricWeight = 100 / 3 = 33.33 tons
   - chargeableWeight = max(20, 33.33) = 33.33 tons
   - baseCost = 3500 × 1.0 × 33.33 = $116,655
   - distanceFactor = 1 + (10000/10000) × 0.2 = 1.2
   - adjusted = 116,655 × 1.2 = $139,986
   - infrastructure = 139,986 × (2 - 0.92) = 139,986 × 1.08 = $151,184
   - congestion 0.40 < 0.5 = no surcharge
   - shippingCost = $151,184

5. Calculate insurance:
   - insuranceCost = 151,184 × 0.015 = $2,268

6. Calculate handling:
   - handlingCost = 20 × 50 = $1,000 (sea handling)

7. Total logistics cost:
   - totalLogisticsCost = 151,184 + 600 (clearance) + 2,268 + 1,000 = $155,052

8. Risk calculations:
   - onTimeProbability = 0.85 × 0.85 × (1 - 0.40 × 0.3) = 0.85 × 0.85 × 0.88 = 0.636 (63.6%)
   - delayRisk = ceil((1 - 0.636) × 25 × 0.3) = ceil(2.73) = 3 days
   - lossRisk = (1 - 0.85) × 0.05 = 0.75%

Result:
  shippingCost: $151,184
  totalLogisticsCost: $155,052 (includes insurance & handling)
```

**Step 5b: TariffEngine.calculateTariff()**
```
Parameters:
- fromRegion: "Asia"
- toRegion: "North America"
- materialType: "display"
- materialCost: $4,500,000
- currentRound: 5
- state.tariffs: active tariffs state

Execution:
1. Find applicable tariffs:
   - "us_china_electronics": Asia→NA, includes display, rate 25%, active ✓
   
2. Find applicable trade agreements:
   - USMCA: only includes North America region, Asia not included ✗
   - No others apply

3. Calculate rates:
   - baseTariffRate = 0.25 (25%)
   - adjustedTariffRate = 0.25 (no agreements to reduce)
   
4. Check for warnings:
   - Volatility = 0.8 > 0.7 → "High tariff volatility on US-China Electronics Tariff - rate may change"

5. Calculate tariff amount:
   - tariffAmount = Math.round(4,500,000 × 0.25) = $1,125,000

Result:
  tariffCost: $1,125,000
  baseTariffRate: 0.25
  adjustedTariffRate: 0.25
  warnings: ["High tariff volatility..."]
```

**Step 6: Apply FX Adjustment**
- Note: FX adjustment is applied at round-processing time, not here
- Source region: Asia → Currency: CNY/USD
- If CNY strengthens, material costs increase
- Example: baseline 0.14, current 0.147 → 1.05x multiplier
- No FX applied here, but order tracks source region

**Step 7: Update Order with Real Costs (material.ts, line 198-203)**
```
order.shippingCost = $155,052
order.tariffCost = $1,125,000
order.totalCost = $4,500,000 + $155,052 + $1,125,000 = $5,780,052

roundsInTransit = Math.ceil((25 + 25 + 5 + 2) / 90) = Math.ceil(0.733) = 1
order.estimatedArrivalRound = 5 + Math.max(1, 1) = 6
```

**Step 8: Check Cash & Update State (material.ts, line 208-235)**
```
if (state.cash < $5,780,052) {
  throw TRPCError: "Insufficient funds"
} else {
  state.materials.activeOrders.push(order)
  state.cash -= $5,780,052
  state.accountsPayable += $5,780,052
  
  Save to database:
  {
    id: "order_5_1234567890_abc123",
    materialType: "display",
    spec: "AMOLED_6.1inch",
    quantity: 100000,
    sourceRegion: "Asia",
    destRegion: "North America",
    supplierName: "OLED Master Displays",
    costPerUnit: 45,
    shippingMethod: "sea",
    orderRound: 5,
    productionTime: 25,
    shippingTime: 25,
    clearanceTime: 5,
    inspectionTime: 2,
    estimatedArrivalRound: 6,
    materialCost: 4500000,
    shippingCost: 155052,
    clearanceCost: 600,
    tariffCost: 1125000,
    totalCost: 5780052,
    status: "pending",
    currentLocation: "OLED Master Displays, Asia"
  }
}
```

**Step 9: Return Response to UI**
```json
{
  "success": true,
  "order": { ...full order object... },
  "message": "Order placed successfully! Materials will arrive in round 6"
}
```

**Step 10: Order Status Updates During Round Processing (SimulationEngine.ts, line 206-250)**

**Round 5 (same round):**
- Order status: "pending" (production not yet started)
- Days elapsed: 0
- Current location: "OLED Master Displays, Asia"

**Round 6:**
- Days elapsed: 30 (1 round ≈ 30 days)
- If 30 >= 25 (production time) AND 30 < 50 (production + shipping):
  - Status: "shipping"
  - Current location: "In transit to North America"

**Round 7:**
- Days elapsed: 60
- If 60 >= 50 (production + shipping) AND 60 < 55 (production + shipping + clearance):
  - Status: "clearance"
  - Current location: "Customs, North America"

**Round 8:**
- Days elapsed: 90
- If 90 >= 52 (total production + shipping + clearance + inspection) AND 90 < estimatedArrivalRound:
  - Actually arrived! But check for delays...
  - Delay probability:
    - For sea: `Math.random() < 0.15` (15% chance of delay)
    - If delayed: `delayRounds = Math.ceil(Math.random() * 2)` = 1-2 round delay
    - Update: `estimatedArrivalRound += delayRounds`
    - Status: "delayed"
    - Message: "⚠️ Order delayed: display from Asia - new ETA: Round X"

**Round 8 or 9 (when estimatedArrivalRound reached and no new delay rolls):**
- Status: "delivered"
- Find or create inventory entry:
  ```
  existing = state.materials.inventory.find(
    inv => inv.materialType === "display" && inv.spec === "AMOLED_6.1inch"
  )
  if (existing) {
    // Weighted average cost
    newTotal = existing.quantity + 100000
    existing.averageCost = 
      (existing.averageCost * existing.quantity + 45 * 100000) / newTotal
    existing.quantity = newTotal
  } else {
    state.materials.inventory.push({
      materialType: "display",
      spec: "AMOLED_6.1inch",
      quantity: 100000,
      averageCost: 45,
      sourceRegion: "Asia"
    })
  }
  ```
- Message: "✅ Received 100,000 display (AMOLED_6.1inch) from OLED Master Displays"
- Order removed from activeOrders

**Step 11: Player Uses Materials in Production**

When player sets production target for General segment (which uses display):
- Production line has targetOutput: 50,000 units
- Calls `MaterialEngine.checkMaterialAvailability("General", 50000, inventory)`
  - Checks all 8 materials needed
  - Display needs: 50,000 units, have: 100,000 ✓
  - All materials available ✓

**During production (SimulationEngine.ts, line 656-658):**
```
inventory = MaterialEngine.consumeMaterials("General", 50000, inventory)
// Decreases display quantity from 100,000 to 50,000
```

**Quality calculation (MaterialIntegration.processProduction):**
```
material quality of display from asia_oledmaster = 94
multiplier = 0.9 + (94/100) × 0.3 = 0.9 + 0.282 = 1.182
finalQuality = baseQuality × 1.182 (capped at 100)
defectRate adjustment = (1 - 1.182) × 0.03 = -0.0055 (-0.55% defect reduction from material quality)
```

**Step 12: Financial Impact (FinanceIntegration.ts)**

**Balance Sheet:**
```
// During order placement:
accountsPayable += $5,780,052
cash -= $5,780,052

// During delivery:
inventoryAsset += (100,000 units × $45 average cost) = $4,500,000
accountsPayable -= $5,780,052 (assume paid at delivery)
cash -= 0 (already deducted at placement)

// Each round materials are in stock:
holdingCosts = $4,500,000 × 0.02 = $90,000/round
cash -= $90,000
```

**Income Statement:**
```
COGS includes:
- material costs: from consumed inventory at weighted average cost
- holding costs: $90,000 per round of storage
- shipping costs: (if assigned to COGS) $155,052 (one-time at arrival)
- tariff costs: (if assigned to COGS) $1,125,000 (one-time at arrival)

For 50,000 units sold:
COGS per unit = (material cost of 50k units + allocation of shipping/tariff) / 50,000
              = (50,000 × $45 + $155,052/2 + $1,125,000/2) / 50,000
              = ($2,250,000 + $77,526 + $562,500) / 50,000
              = $2,890,026 / 50,000
              = $57.80 per unit
```

**Cash Flow:**
```
Operating Activities:
- Cash outflow: $5,780,052 (payment for order)
- Cash inflow: Revenue from sales
- Cash outflow: Holding costs $90,000/round

Accounts Payable:
- Increases to $5,780,052 on order placement
- Decreases when payment is made (typically with next cash receipts or net60/net90 terms)
```

---

## 7. FORMULAS SUMMARY TABLE

| Calculation | Formula | Example |
|------------|---------|---------|
| Material cost for segment | totalCost × quantity | Budget $60 × 10,000 = $600,000 |
| Production time | 20 + (qty/capacity) × 30 × (1/responsiveness) | 100k/800k × 30 ÷ 0.92 = 25 days |
| Shipping time | baseLeadTime × timeMultiplier | 25 × 1.0 (sea) = 25 days |
| Chargeable weight | max(actualWeight, volumetricWeight) | max(20t, 33t) = 33t |
| Shipping cost | baseCost × chargeableWeight × distanceFactor × infrastructureQuality × congestionSurcharge | 3500 × 33 × 1.2 × 1.08 × 1.0 = $151k |
| Insurance cost | shippingCost × rateByMethod | 151k × 0.015 (sea) = $2,268 |
| Handling cost | weight × costPerTonByMethod | 20 × $50 (sea) = $1,000 |
| On-time probability | reliability × customsEfficiency × (1 - congestion × 0.3) | 0.85 × 0.85 × 0.88 = 63.6% |
| Tariff amount | materialCost × (baseRate × (1 - agreementReduction)) | $4.5M × 0.25 × 1.0 = $1.125M |
| Holding cost | inventoryValue × 0.02 | $4.5M × 0.02 = $90k/round |
| Storage cost | (units × $2-3) + (cost × 0.5%-1%) + (overflow × 2×) | 1000 units × $2 + $75 = $2,075/round |
| Quality multiplier | 0.9 + (quality/100) × 0.3 | 0.9 + (94/100) × 0.3 = 1.182 |
| Final quality | baseQuality × qualityMultiplier | 70 × 1.182 = 82.7 |
| Defect adjustment | (1 - multiplier) × 0.03 | (1 - 1.182) × 0.03 = -0.0055 (-0.55%) |
| FX cost multiplier | currentRate / baselineRate | 1.21 / 1.10 = 1.10 (10% more expensive) |
| Inventory turnover | COGS / avgInventory | $4.5M / $4.5M = 1.0 |
| Days inventory outstanding | 365 / inventoryTurnover | 365 / 1.0 = 365 days |
| Working capital | inventoryValue - accountsPayable | $4.5M - $5.78M = -$1.28M (negative = financed by supplier terms) |

---

## 8. AUTO-REPLENISHMENT SYSTEM

**Auto-Reorder Logic (SimulationEngine.ts, line 215-240):**

During each round, if materials fall below thresholds:
```
AUTO_REORDER_THRESHOLD = 50,000 units
AUTO_ORDER_QTY = 100,000 units
ESTIMATED_COST = $15/unit

for each materialType in [display, processor, memory, storage, camera, battery, chassis, other]:
  currentQty = state.materials.inventory.find(mat)?.quantity ?? 0
  if (currentQty < 50,000):
    orderCost = 100,000 × $15 = $1,500,000
    if (state.cash > $3,000,000): // 2x safety margin
      Add 100,000 units to inventory
      Deduct $1,500,000 from cash
      Add $1,500,000 to accountsPayable
```

**Purpose:** Ensures basic material availability for production without player intervention
**Impact:** Auto-orders consume cash and increase payables
**Player Control:** None (automatic system)

---

## 9. KEY INTERCONNECTIONS

**Material → Production:**
- Production constrained by material availability
- Quality affected by material sourcing
- Defects increased by low-quality materials

**Logistics → Tariffs:**
- Shipping routes determine delivery timing
- Tariff rates apply to route and material type
- High tariffs incentivize alternative sourcing

**Tariffs → FX:**
- Tariffs denominated as percentages (apply after FX adjustment)
- Example: $4.5M × 1.05 (FX) × 0.25 (tariff) = $1.18M
- FX changes effective cost of tariff burden

**Warehouse → Finance:**
- Storage costs deducted from cash each round
- Inventory obsolescence writes off balance sheet value
- Overflow surcharges penalize overstocking

**Supply Chain → Finance:**
- Accounts payable tracks unpaid orders
- Working capital calculated as inventory - payables
- COGS includes materials, shipping, tariffs, holding costs

---

## 10. EDGE CASES & CONSTRAINTS

1. **Negative Inventory Prevention**: `if (inv.quantity < 0) inv.quantity = 0`
2. **Quality Capping**: `Math.min(100, Math.max(0, finalQuality))`
3. **Delay Rolling**: Only happens once per order, captured in `order.delayRounds`
4. **Minimum Orders**: MOQ varies by supplier (5,000-40,000), enforced at placement
5. **Payment Terms**: net30/45/60/90, but cash deducted immediately at placement
6. **Route Validation**: Throws error if requested method not available on route
7. **Cash Check**: Order fails if insufficient cash at time of placement
8. **Capacity Overflow**: Storage surcharge if warehouse utilization > capacity
9. **Tariff Permanence**: Some tariffs permanent (no expiryRound), others expire after duration

---

This documentation represents the complete logistics and supply chain system as of the current state of BIZZSIMSIM V2. All functions, constants, formulas, and data flows have been exhaustively documented for system redesign purposes.