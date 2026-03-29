/**
 * Breakthrough Events - Rare, high-cost research nodes that unlock
 * entirely new product categories or market segments.
 *
 * Triggered by reaching specific tech levels. Game-changing moments
 * that transform the business loop.
 */

export interface BreakthroughEvent {
  id: string;
  name: string;
  description: string;
  /** Tech prerequisites (all must be unlocked) */
  requiredTechs: string[];
  /** Minimum R&D level required */
  minRdLevel: number;
  /** Cost to research this breakthrough */
  researchCost: number;
  /** Rounds to complete once funded */
  researchRounds: number;
  /** Effects when completed */
  effects: BreakthroughEffect;
  /** Rarity tier: how likely this is to appear once prerequisites are met */
  rarity: "uncommon" | "rare" | "legendary";
  /** Business concept taught */
  businessConcept: string;
}

export interface BreakthroughEffect {
  /** Unlock new archetype IDs */
  unlockArchetypes?: string[];
  /** Global quality bonus to all products */
  qualityBonus?: number;
  /** Global cost reduction percentage */
  costReduction?: number;
  /** New segment access */
  unlockSegment?: string;
  /** Production speed multiplier */
  productionSpeedMultiplier?: number;
  /** Brand value boost */
  brandBoost?: number;
  /** Achievement triggered */
  achievementId?: string;
}

export const BREAKTHROUGH_EVENTS: BreakthroughEvent[] = [
  {
    id: "nano_materials",
    name: "Nano-Material Synthesis",
    description:
      "Your research team discovers a method to synthesize carbon nanotubes at scale. " +
      "This unlocks ultra-durable, ultra-light phone construction that transforms the Active Lifestyle segment.",
    requiredTechs: ["advanced_materials", "nanotechnology"],
    minRdLevel: 3,
    researchCost: 45_000_000,
    researchRounds: 3,
    effects: {
      qualityBonus: 8,
      costReduction: 0.1,
      unlockArchetypes: ["fitness_pro"],
    },
    rarity: "rare",
    businessConcept: "Disruptive Innovation",
  },
  {
    id: "ai_chip_design",
    name: "Neural Processing Architecture",
    description:
      "A breakthrough in on-device AI processing enables phones that learn and adapt to users. " +
      "Professional segment customers will pay premium prices for AI-powered productivity features.",
    requiredTechs: ["machine_learning", "chip_design"],
    minRdLevel: 3,
    researchCost: 50_000_000,
    researchRounds: 4,
    effects: {
      qualityBonus: 10,
      unlockArchetypes: ["ai_powerhouse", "quantum_phone"],
      brandBoost: 0.05,
    },
    rarity: "rare",
    businessConcept: "R&D ROI",
  },
  {
    id: "flexible_display",
    name: "Flexible Display Technology",
    description:
      "Your team perfects a foldable OLED display that does not crease. This opens up an entirely " +
      "new product category that commands ultra-premium pricing in the Enthusiast segment.",
    requiredTechs: ["display_tech", "advanced_manufacturing"],
    minRdLevel: 3,
    researchCost: 55_000_000,
    researchRounds: 4,
    effects: {
      unlockArchetypes: ["foldable_phone"],
      brandBoost: 0.08,
    },
    rarity: "legendary",
    businessConcept: "Market Entry",
  },
  {
    id: "green_manufacturing",
    name: "Zero-Waste Manufacturing",
    description:
      "A closed-loop manufacturing process that recycles 98% of production waste. " +
      "Dramatically reduces disposal costs and boosts ESG score.",
    requiredTechs: ["lean_process", "recycling_tech"],
    minRdLevel: 2,
    researchCost: 30_000_000,
    researchRounds: 2,
    effects: {
      costReduction: 0.15,
      productionSpeedMultiplier: 1.1,
    },
    rarity: "uncommon",
    businessConcept: "Sustainable Manufacturing",
  },
  {
    id: "quantum_encryption",
    name: "Quantum-Secure Communication",
    description:
      "First-of-its-kind quantum encryption for mobile devices. " +
      "Government and enterprise clients will pay enormous premiums for unhackable communications.",
    requiredTechs: ["quantum_computing", "security_tech"],
    minRdLevel: 4,
    researchCost: 65_000_000,
    researchRounds: 5,
    effects: {
      unlockArchetypes: ["quantum_phone"],
      qualityBonus: 12,
      brandBoost: 0.10,
    },
    rarity: "legendary",
    businessConcept: "First-Mover Advantage",
  },
  {
    id: "solid_state_battery",
    name: "Solid-State Battery",
    description:
      "A solid-state battery that charges in 5 minutes and lasts 3 days. " +
      "Transforms the Budget and Active Lifestyle segments with unprecedented battery life.",
    requiredTechs: ["battery_tech", "materials_science"],
    minRdLevel: 3,
    researchCost: 40_000_000,
    researchRounds: 3,
    effects: {
      qualityBonus: 6,
      costReduction: 0.08,
      unlockArchetypes: ["budget_cam_pro"],
    },
    rarity: "rare",
    businessConcept: "Technology Lifecycle",
  },
];
