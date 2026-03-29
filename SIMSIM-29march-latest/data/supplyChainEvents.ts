/**
 * Supply Chain Events - Random events that force players to adapt their supply chain.
 *
 * Events create production disruptions that teach supply chain risk management:
 * - Supplier delays reduce material availability
 * - Material shortages cause price spikes
 * - Quality issues increase defect rates
 */

import type { Segment } from "@/engine/types";

export interface SupplyChainEvent {
  id: string;
  name: string;
  description: string;
  category: "supplier_delay" | "material_shortage" | "quality_issue";
  /** Which segments are affected */
  affectedSegments: Segment[] | "all";
  /** Duration in rounds */
  durationRounds: number;
  /** Effects applied while active */
  effects: SupplyChainEventEffect;
  /** Minimum round before this event can trigger */
  minRound: number;
  /** Probability of triggering per round (0-1) */
  triggerChance: number;
  /** Business concept this teaches */
  businessConcept: string;
}

export interface SupplyChainEventEffect {
  /** Material cost multiplier (e.g. 1.3 = 30% more expensive) */
  materialCostMultiplier?: number;
  /** Production output reduction (e.g. 0.8 = 20% less output) */
  productionMultiplier?: number;
  /** Defect rate increase (absolute, e.g. 0.05 = +5%) */
  defectRateIncrease?: number;
  /** Delivery delay in rounds */
  deliveryDelay?: number;
}

export const SUPPLY_CHAIN_EVENTS: SupplyChainEvent[] = [
  {
    id: "port_congestion",
    name: "Port Congestion",
    description: "Major shipping delays at Asian ports cause component shortages. Production output reduced by 15% for 2 rounds.",
    category: "supplier_delay",
    affectedSegments: "all",
    durationRounds: 2,
    effects: {
      productionMultiplier: 0.85,
      deliveryDelay: 1,
    },
    minRound: 3,
    triggerChance: 0.08,
    businessConcept: "JIT vs. Buffer Stock",
  },
  {
    id: "chip_shortage",
    name: "Semiconductor Shortage",
    description: "Global chip shortage drives processor costs up 40%. Premium segments hit hardest.",
    category: "material_shortage",
    affectedSegments: ["Enthusiast", "Professional"],
    durationRounds: 3,
    effects: {
      materialCostMultiplier: 1.4,
    },
    minRound: 5,
    triggerChance: 0.06,
    businessConcept: "Supply Chain Diversification",
  },
  {
    id: "display_defect",
    name: "Display Panel Quality Issue",
    description: "A batch of display panels from your supplier has quality defects. Defect rate increases by 8% until resolved.",
    category: "quality_issue",
    affectedSegments: ["General", "Enthusiast"],
    durationRounds: 2,
    effects: {
      defectRateIncrease: 0.08,
    },
    minRound: 2,
    triggerChance: 0.10,
    businessConcept: "Quality Assurance",
  },
  {
    id: "rare_earth_spike",
    name: "Rare Earth Price Spike",
    description: "Export restrictions on rare earth minerals drive battery and display costs up 25%.",
    category: "material_shortage",
    affectedSegments: "all",
    durationRounds: 2,
    effects: {
      materialCostMultiplier: 1.25,
    },
    minRound: 4,
    triggerChance: 0.07,
    businessConcept: "Commodity Risk",
  },
  {
    id: "logistics_strike",
    name: "Transport Workers Strike",
    description: "Logistics workers strike halts deliveries. All material orders delayed by 1 round.",
    category: "supplier_delay",
    affectedSegments: "all",
    durationRounds: 1,
    effects: {
      deliveryDelay: 1,
      productionMultiplier: 0.9,
    },
    minRound: 3,
    triggerChance: 0.05,
    businessConcept: "Supply Chain Risk",
  },
  {
    id: "battery_recall_scare",
    name: "Battery Safety Concern",
    description: "Industry-wide battery safety investigation. Additional QC testing slows production and increases defects by 5%.",
    category: "quality_issue",
    affectedSegments: ["Active Lifestyle", "Budget"],
    durationRounds: 2,
    effects: {
      defectRateIncrease: 0.05,
      productionMultiplier: 0.92,
    },
    minRound: 4,
    triggerChance: 0.06,
    businessConcept: "Product Safety & Liability",
  },
  {
    id: "supplier_bankruptcy",
    name: "Key Supplier Goes Bankrupt",
    description: "A critical component supplier files for bankruptcy. Production severely disrupted while finding alternatives.",
    category: "supplier_delay",
    affectedSegments: ["Professional", "Enthusiast"],
    durationRounds: 3,
    effects: {
      productionMultiplier: 0.7,
      materialCostMultiplier: 1.2,
    },
    minRound: 8,
    triggerChance: 0.04,
    businessConcept: "Supplier Diversification",
  },
  {
    id: "quality_improvement",
    name: "Supplier Quality Improvement",
    description: "Your primary supplier invests in new equipment. Material quality improves, reducing defect rates.",
    category: "quality_issue",
    affectedSegments: "all",
    durationRounds: 3,
    effects: {
      defectRateIncrease: -0.03, // Positive event - reduces defects
    },
    minRound: 6,
    triggerChance: 0.05,
    businessConcept: "Supplier Relationship Management",
  },
];
