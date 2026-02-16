/**
 * Tariff Scenarios and Events
 * Defines all possible tariff events and geopolitical scenarios
 */

import type { Region } from "../materials/types";
import type {
  TariffEvent,
  GeopoliticalEvent,
  TariffScenario,
  TradeAgreement,
  Tariff,
  TradePolicy
} from "./types";

export const BASELINE_TARIFFS: Tariff[] = [
  // US-China tariffs (ongoing tension)
  {
    id: "us_china_electronics",
    name: "US-China Electronics Tariff",
    fromRegion: "Asia",
    toRegion: "North America",
    materialTypes: ["processor", "display", "memory"],
    tariffRate: 0.25,
    effectiveRound: 1,
    reason: "trade_war",
    volatility: 0.8,
    description: "Trade war tariffs on Chinese electronics"
  },
  {
    id: "china_us_retaliatory",
    name: "China-US Retaliatory Tariff",
    fromRegion: "North America",
    toRegion: "Asia",
    materialTypes: ["processor"],
    tariffRate: 0.20,
    effectiveRound: 1,
    reason: "retaliatory",
    volatility: 0.8,
    description: "Retaliatory tariffs on US semiconductors"
  },

  // Standard tariffs
  {
    id: "standard_electronics",
    name: "Standard Electronics Import Duty",
    fromRegion: "Asia",
    toRegion: "Europe",
    tariffRate: 0.10,
    effectiveRound: 1,
    reason: "revenue",
    volatility: 0.2,
    description: "Standard import duty on electronics"
  },
  {
    id: "africa_development",
    name: "African Development Protection",
    fromRegion: "Asia",
    toRegion: "Africa",
    tariffRate: 0.15,
    effectiveRound: 1,
    reason: "protectionism",
    volatility: 0.4,
    description: "Protective tariffs to support local industry"
  }
];

export const TRADE_AGREEMENTS: TradeAgreement[] = [
  {
    id: "usmca",
    name: "USMCA (North American Trade Agreement)",
    type: "free_trade",
    regions: ["North America"],
    tariffReduction: 0.95, // 95% reduction
    effectiveRound: 1,
    conditions: ["Minimum 75% North American content"],
    benefits: ["Duty-free electronics trade within North America"]
  },
  {
    id: "eu_single_market",
    name: "EU Single Market",
    type: "customs_union",
    regions: ["Europe"],
    tariffReduction: 1.0, // 100% reduction
    effectiveRound: 1,
    conditions: ["EU standards compliance"],
    benefits: ["Free movement of goods within EU"]
  },
  {
    id: "asean",
    name: "ASEAN Free Trade Area",
    type: "free_trade",
    regions: ["Asia"],
    tariffReduction: 0.85,
    effectiveRound: 1,
    conditions: ["Regional origin requirement"],
    benefits: ["Reduced tariffs on intra-Asian trade"]
  },
  {
    id: "gcc",
    name: "Gulf Cooperation Council",
    type: "customs_union",
    regions: ["Middle East"],
    tariffReduction: 1.0,
    effectiveRound: 1,
    conditions: ["GCC member states only"],
    benefits: ["Tariff-free trade among GCC countries"]
  }
];

export const TARIFF_EVENTS: TariffEvent[] = [
  {
    id: "trade_war_escalation",
    name: "US-China Trade War Escalation",
    type: "tariff_increase",
    affectedRoutes: [
      { from: "North America", to: "Asia", increase: 0.25 },
      { from: "Asia", to: "North America", increase: 0.25 }
    ],
    materials: ["processor", "display", "memory", "storage"],
    duration: 8,
    probability: 0.05,
    severity: 0.8,
    effects: [
      {
        type: "cost_increase",
        value: 0.25,
        duration: 8,
        description: "25% tariff increase on electronics"
      },
      {
        type: "delay",
        value: 3,
        duration: 8,
        description: "Additional customs scrutiny causing delays"
      }
    ],
    description: "Escalating trade tensions result in additional tariffs on technology products"
  },

  {
    id: "eu_digital_tax",
    name: "EU Digital Services Tax",
    type: "new_tariff",
    affectedRoutes: [
      { from: "North America", to: "Europe", increase: 0.15 },
      { from: "Asia", to: "Europe", increase: 0.15 }
    ],
    materials: ["processor", "display"],
    duration: 12,
    probability: 0.03,
    severity: 0.5,
    effects: [
      {
        type: "cost_increase",
        value: 0.15,
        duration: 12,
        description: "Digital services tax on tech imports"
      }
    ],
    description: "EU implements digital services tax affecting tech imports"
  },

  {
    id: "usmca_expansion",
    name: "USMCA Benefits Expansion",
    type: "trade_agreement",
    affectedRoutes: [
      { from: "North America", to: "South America", decrease: 0.20 },
      { from: "South America", to: "North America", decrease: 0.20 }
    ],
    duration: 20,
    probability: 0.04,
    severity: 0.3,
    effects: [
      {
        type: "cost_decrease",
        value: 0.20,
        duration: 20,
        description: "Expanded trade benefits with South America"
      }
    ],
    description: "USMCA expands to include South American partners"
  },

  {
    id: "rare_earth_export_restriction",
    name: "Rare Earth Export Restrictions",
    type: "sanctions",
    affectedRoutes: [
      { from: "Africa", to: "Asia", increase: 0.30 },
      { from: "Africa", to: "North America", increase: 0.30 }
    ],
    materials: ["battery"],
    duration: 6,
    probability: 0.06,
    severity: 0.7,
    effects: [
      {
        type: "cost_increase",
        value: 0.30,
        duration: 6,
        description: "Export restrictions on rare earth materials"
      },
      {
        type: "restriction",
        value: 0.5,
        duration: 6,
        description: "Volume restrictions on exports"
      }
    ],
    description: "African nations restrict rare earth mineral exports"
  },

  {
    id: "green_technology_incentive",
    name: "Green Technology Trade Incentive",
    type: "tariff_decrease",
    affectedRoutes: [
      { from: "Europe", to: "Asia", decrease: 0.10 },
      { from: "Europe", to: "North America", decrease: 0.10 }
    ],
    materials: ["battery"],
    duration: 15,
    probability: 0.04,
    severity: 0.2,
    effects: [
      {
        type: "cost_decrease",
        value: 0.10,
        duration: 15,
        description: "Reduced tariffs on eco-friendly battery tech"
      }
    ],
    description: "Incentives for green battery technology imports"
  },

  {
    id: "regional_conflict_sanctions",
    name: "Regional Conflict Sanctions",
    type: "sanctions",
    affectedRoutes: [
      { from: "Middle East", to: "North America", increase: 0.35 },
      { from: "Middle East", to: "Europe", increase: 0.35 },
      { from: "North America", to: "Middle East", increase: 0.25 },
      { from: "Europe", to: "Middle East", increase: 0.25 }
    ],
    duration: 10,
    probability: 0.03,
    severity: 0.9,
    effects: [
      {
        type: "cost_increase",
        value: 0.35,
        duration: 10,
        description: "Sanctions-related tariffs"
      },
      {
        type: "delay",
        value: 5,
        duration: 10,
        description: "Enhanced security screening"
      },
      {
        type: "restriction",
        value: 0.3,
        duration: 10,
        description: "Volume restrictions due to sanctions"
      }
    ],
    description: "Regional conflict triggers international sanctions"
  },

  {
    id: "anti_dumping_investigation",
    name: "Anti-Dumping Investigation",
    type: "new_tariff",
    affectedRoutes: [
      { from: "Asia", to: "North America", increase: 0.40 },
      { from: "Asia", to: "Europe", increase: 0.35 }
    ],
    materials: ["display", "memory"],
    duration: 12,
    probability: 0.04,
    severity: 0.6,
    triggers: [
      { type: "market_share", threshold: 0.4, region: "North America" }
    ],
    effects: [
      {
        type: "cost_increase",
        value: 0.40,
        duration: 12,
        description: "Anti-dumping duties on displays and memory"
      }
    ],
    description: "Anti-dumping investigation results in punitive tariffs"
  },

  {
    id: "free_trade_breakthrough",
    name: "Global Free Trade Breakthrough",
    type: "trade_agreement",
    affectedRoutes: [
      { from: "Asia", to: "Europe", decrease: 0.15 },
      { from: "Asia", to: "Oceania", decrease: 0.20 },
      { from: "Europe", to: "Oceania", decrease: 0.18 }
    ],
    duration: 25,
    probability: 0.02,
    severity: 0.3,
    effects: [
      {
        type: "cost_decrease",
        value: 0.15,
        duration: 25,
        description: "Comprehensive trade agreement reduces tariffs"
      }
    ],
    description: "Major breakthrough in global trade negotiations"
  },

  {
    id: "supply_chain_security_act",
    name: "Supply Chain Security Act",
    type: "new_tariff",
    affectedRoutes: [
      { from: "Asia", to: "North America", increase: 0.20 }
    ],
    materials: ["processor", "memory"],
    duration: 16,
    probability: 0.05,
    severity: 0.7,
    effects: [
      {
        type: "cost_increase",
        value: 0.20,
        duration: 16,
        description: "Security-related tariffs on semiconductors"
      },
      {
        type: "delay",
        value: 4,
        duration: 16,
        description: "Enhanced security verification"
      }
    ],
    description: "National security concerns trigger semiconductor tariffs"
  },

  {
    id: "climate_carbon_border_tax",
    name: "Carbon Border Adjustment",
    type: "new_tariff",
    affectedRoutes: [
      { from: "Asia", to: "Europe", increase: 0.12 },
      { from: "Africa", to: "Europe", increase: 0.10 }
    ],
    duration: 18,
    probability: 0.06,
    severity: 0.4,
    effects: [
      {
        type: "cost_increase",
        value: 0.12,
        duration: 18,
        description: "Carbon border tax on imports"
      }
    ],
    description: "EU implements carbon border adjustment mechanism"
  }
];

export const GEOPOLITICAL_EVENTS: GeopoliticalEvent[] = [
  {
    id: "pandemic_disruption",
    name: "Global Pandemic",
    type: "conflict",
    affectedRegions: ["Asia", "Europe", "North America", "South America", "Africa", "Middle East", "Oceania"],
    round: 0, // Can trigger any round
    duration: 12,
    severity: "critical",
    effects: [
      {
        type: "delay_increase",
        regions: ["Asia", "Europe", "North America", "South America", "Africa", "Middle East", "Oceania"],
        magnitude: 2.0,
        description: "Massive supply chain disruptions"
      },
      {
        type: "cost_increase",
        regions: ["Asia", "Europe", "North America", "South America", "Africa", "Middle East", "Oceania"],
        magnitude: 0.15,
        description: "Increased logistics costs"
      }
    ],
    description: "Global pandemic causes widespread supply chain disruptions"
  },

  {
    id: "strait_closure",
    name: "Strategic Strait Closure",
    type: "conflict",
    affectedRegions: ["Asia", "Europe", "Middle East"],
    round: 0,
    duration: 6,
    severity: "high",
    effects: [
      {
        type: "route_closure",
        regions: ["Asia", "Europe", "Middle East"],
        magnitude: 0.5,
        description: "Major shipping route disrupted"
      },
      {
        type: "cost_increase",
        regions: ["Asia", "Europe"],
        magnitude: 0.40,
        description: "Rerouting costs"
      },
      {
        type: "delay_increase",
        regions: ["Asia", "Europe"],
        magnitude: 1.5,
        description: "Extended shipping routes"
      }
    ],
    description: "Conflict closes strategic shipping strait"
  },

  {
    id: "regional_alliance",
    name: "New Regional Alliance Formation",
    type: "alliance",
    affectedRegions: ["Asia", "Oceania"],
    round: 0,
    duration: 20,
    severity: "low",
    effects: [
      {
        type: "tariff_change",
        regions: ["Asia", "Oceania"],
        magnitude: -0.15,
        description: "Reduced tariffs between allied regions"
      },
      {
        type: "cost_increase",
        regions: ["North America", "Europe"],
        magnitude: 0.08,
        description: "Preferential treatment creates cost disadvantage for others"
      }
    ],
    description: "New trade alliance forms in Asia-Pacific region"
  },

  {
    id: "commodity_crisis",
    name: "Rare Materials Crisis",
    type: "dispute",
    affectedRegions: ["Africa", "Asia"],
    round: 0,
    duration: 8,
    severity: "high",
    effects: [
      {
        type: "cost_increase",
        regions: ["Africa", "Asia"],
        magnitude: 0.50,
        description: "Rare material prices spike"
      },
      {
        type: "quality_impact",
        regions: ["Africa"],
        magnitude: -0.10,
        description: "Rush orders compromise quality"
      }
    ],
    description: "Dispute over rare earth materials causes price surge"
  }
];

export const TARIFF_SCENARIOS: TariffScenario[] = [
  {
    id: "protectionist_wave",
    name: "Global Protectionist Wave",
    description: "Multiple countries adopt protectionist policies simultaneously",
    probability: 0.02,
    events: [
      TARIFF_EVENTS.find(e => e.id === "trade_war_escalation")!,
      TARIFF_EVENTS.find(e => e.id === "anti_dumping_investigation")!,
      TARIFF_EVENTS.find(e => e.id === "supply_chain_security_act")!
    ],
    geopoliticalEvents: [],
    duration: 12,
    playerImpact: {
      affectedRoutes: 8,
      estimatedCostIncrease: 0.35,
      estimatedDelay: 5
    }
  },

  {
    id: "trade_liberalization",
    name: "Trade Liberalization Period",
    description: "Multiple trade agreements reduce global tariffs",
    probability: 0.03,
    events: [
      TARIFF_EVENTS.find(e => e.id === "usmca_expansion")!,
      TARIFF_EVENTS.find(e => e.id === "free_trade_breakthrough")!,
      TARIFF_EVENTS.find(e => e.id === "green_technology_incentive")!
    ],
    geopoliticalEvents: [
      GEOPOLITICAL_EVENTS.find(e => e.id === "regional_alliance")!
    ],
    duration: 20,
    playerImpact: {
      affectedRoutes: 12,
      estimatedCostIncrease: -0.15,
      estimatedDelay: -2
    }
  },

  {
    id: "supply_chain_crisis",
    name: "Global Supply Chain Crisis",
    description: "Multiple disruptions cause widespread supply chain chaos",
    probability: 0.015,
    events: [
      TARIFF_EVENTS.find(e => e.id === "rare_earth_export_restriction")!,
      TARIFF_EVENTS.find(e => e.id === "regional_conflict_sanctions")!
    ],
    geopoliticalEvents: [
      GEOPOLITICAL_EVENTS.find(e => e.id === "pandemic_disruption")!,
      GEOPOLITICAL_EVENTS.find(e => e.id === "commodity_crisis")!
    ],
    duration: 10,
    playerImpact: {
      affectedRoutes: 15,
      estimatedCostIncrease: 0.55,
      estimatedDelay: 12
    }
  }
];

export const TRADE_POLICIES: Map<Region, TradePolicy> = new Map([
  ["North America", {
    region: "North America",
    stance: "mixed",
    priorityIndustries: ["Semiconductors", "Advanced Manufacturing", "AI"],
    restrictedMaterials: ["processor"],
    incentivizedMaterials: ["battery"],
    localContentRequirement: 0.50
  }],
  ["Europe", {
    region: "Europe",
    stance: "free_trade",
    priorityIndustries: ["Green Technology", "Precision Engineering"],
    restrictedMaterials: [],
    incentivizedMaterials: ["battery", "display"],
    localContentRequirement: 0.45
  }],
  ["Asia", {
    region: "Asia",
    stance: "mixed",
    priorityIndustries: ["Electronics", "Manufacturing", "Assembly"],
    restrictedMaterials: [],
    incentivizedMaterials: ["display", "memory", "processor"],
    localContentRequirement: 0.30
  }],
  ["Africa", {
    region: "Africa",
    stance: "protectionist",
    priorityIndustries: ["Mining", "Raw Materials"],
    restrictedMaterials: ["battery", "other"],
    incentivizedMaterials: [],
    localContentRequirement: 0.20
  }],
  ["South America", {
    region: "South America",
    stance: "protectionist",
    priorityIndustries: ["Mining", "Agriculture", "Basic Manufacturing"],
    restrictedMaterials: ["battery"],
    incentivizedMaterials: [],
    localContentRequirement: 0.25
  }],
  ["Middle East", {
    region: "Middle East",
    stance: "free_trade",
    priorityIndustries: ["Logistics", "Trade Hub", "Assembly"],
    restrictedMaterials: [],
    incentivizedMaterials: ["chassis", "battery"],
    localContentRequirement: 0.15
  }],
  ["Oceania", {
    region: "Oceania",
    stance: "free_trade",
    priorityIndustries: ["Quality Assurance", "R&D", "Tech Services"],
    restrictedMaterials: [],
    incentivizedMaterials: ["processor", "camera"],
    localContentRequirement: 0.35
  }]
]);

/**
 * Check if a tariff event should trigger this round
 */
export function shouldTriggerEvent(event: TariffEvent, round: number, playerState?: any): boolean {
  // Base probability check
  if (Math.random() > event.probability) return false;

  // Check triggers if any
  if (event.triggers && event.triggers.length > 0) {
    return event.triggers.some(trigger => {
      if (!playerState) return false;

      switch (trigger.type) {
        case "market_share":
          return playerState.marketShare >= trigger.threshold;
        case "revenue":
          return playerState.revenue >= trigger.threshold;
        case "production_volume":
          return playerState.productionVolume >= trigger.threshold;
        default:
          return false;
      }
    });
  }

  return true;
}
