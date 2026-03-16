/**
 * Event Engine
 *
 * Manages random events, crises, and opportunities that affect gameplay.
 * Events can be triggered by conditions, probability, or player actions.
 *
 * Phase 13: Crisis & Events System
 */

import type { Segment } from "../types/factory";
import type { TeamState } from "../types/state";
import type { EngineContext } from "../core/EngineContext";
import type { EngineConfig } from "../config/schema";

// ============================================
// TYPES
// ============================================

export type EventType = "opportunity" | "crisis" | "market_shift" | "regulatory" | "competitive";

export interface GameEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  triggerConditions: EventCondition[];
  baseProbability: number;
  duration: number; // Rounds
  effects: EventEffect[];
  playerChoices?: EventChoice[];
  icon?: string;
  severity?: "minor" | "moderate" | "major" | "critical";
}

export interface EventCondition {
  type: "metric" | "round" | "random" | "state";
  metric?: string;
  operator?: ">" | "<" | ">=" | "<=" | "==" | "!=";
  value?: number | string | boolean;
}

export interface EventEffect {
  type:
    | "revenue_modifier"
    | "cost_modifier"
    | "brand_modifier"
    | "demand_modifier"
    | "quality_modifier"
    | "cash_change"
    | "esg_modifier"
    | "morale_modifier"
    | "capacity_modifier"
    | "rd_bonus";
  target?: Segment | "all";
  value: number;
  duration?: number; // Rounds, if temporary
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  cost: number;
  requirements?: EventRequirement[];
  effects: EventEffect[];
  successProbability?: number; // For risky choices
}

export interface EventRequirement {
  type: "cash" | "brand" | "esg" | "employees" | "technology";
  minValue: number;
}

export interface ActiveEvent {
  event: GameEvent;
  roundTriggered: number;
  roundsRemaining: number;
  choiceMade?: string;
  activeEffects: EventEffect[];
}

export interface EventState {
  activeEvents: ActiveEvent[];
  eventHistory: EventHistoryEntry[];
  crisisLevel: number; // 0-100, accumulated crisis stress
  lastEventRound: number;
}

export interface EventHistoryEntry {
  eventId: string;
  eventTitle: string;
  round: number;
  choice?: string;
  outcome: "positive" | "negative" | "neutral";
}

export interface EventResult {
  state: EventState;
  newEvents: GameEvent[];
  resolvedEvents: ActiveEvent[];
  totalEffects: {
    revenueModifier: number;
    costModifier: number;
    brandModifier: number;
    demandModifier: number;
    cashChange: number;
  };
  messages: string[];
  pendingChoices: { event: GameEvent; choices: EventChoice[] }[];
}

// ============================================
// EVENT TEMPLATES
// ============================================

const EVENT_TEMPLATES: GameEvent[] = [
  // OPPORTUNITIES
  {
    id: "tech_breakthrough",
    type: "opportunity",
    title: "Research Breakthrough",
    description: "Your R&D team has made a significant discovery that could accelerate product development.",
    triggerConditions: [{ type: "random" }],
    baseProbability: 0.05,
    duration: 1,
    effects: [{ type: "rd_bonus", value: 500 }],
    playerChoices: [
      {
        id: "patent",
        label: "Patent the Discovery",
        description: "Secure intellectual property rights for long-term advantage",
        cost: 1_000_000,
        effects: [
          { type: "rd_bonus", value: 200 },
          { type: "brand_modifier", value: 0.02, duration: 4 },
        ],
      },
      {
        id: "publish",
        label: "Publish Research",
        description: "Gain industry recognition and attract talent",
        cost: 0,
        effects: [
          { type: "brand_modifier", value: 0.03 },
          { type: "morale_modifier", value: 10 },
        ],
      },
      {
        id: "commercialize",
        label: "Fast-Track Commercialization",
        description: "Rush the discovery to market",
        cost: 5_000_000,
        effects: [
          { type: "quality_modifier", value: 5, target: "all", duration: 3 },
        ],
        successProbability: 0.7,
      },
    ],
    icon: "lightbulb",
  },
  {
    id: "market_expansion",
    type: "opportunity",
    title: "New Market Opportunity",
    description: "A major retailer wants to feature your products prominently.",
    triggerConditions: [{ type: "metric", metric: "brandValue", operator: ">", value: 0.3 }],
    baseProbability: 0.08,
    duration: 2,
    effects: [{ type: "demand_modifier", value: 1.15, duration: 2 }],
    playerChoices: [
      {
        id: "exclusive",
        label: "Exclusive Partnership",
        description: "Higher margins but limited reach",
        cost: 2_000_000,
        effects: [
          { type: "revenue_modifier", value: 1.2, duration: 4 },
          { type: "demand_modifier", value: 0.9, duration: 4 },
        ],
      },
      {
        id: "standard",
        label: "Standard Distribution Deal",
        description: "Balanced approach with moderate benefits",
        cost: 500_000,
        effects: [
          { type: "demand_modifier", value: 1.15, duration: 3 },
        ],
      },
    ],
    icon: "store",
  },
  {
    id: "talent_pool",
    type: "opportunity",
    title: "Talent Acquisition Opportunity",
    description: "A competitor is downsizing, making top talent available.",
    triggerConditions: [{ type: "random" }],
    baseProbability: 0.06,
    duration: 1,
    effects: [],
    playerChoices: [
      {
        id: "hire_engineers",
        label: "Recruit Engineers",
        description: "Boost R&D capabilities significantly",
        cost: 3_000_000,
        effects: [
          { type: "rd_bonus", value: 300 },
          { type: "morale_modifier", value: -5 }, // Existing staff jealousy
        ],
      },
      {
        id: "hire_workers",
        label: "Recruit Production Staff",
        description: "Increase production efficiency",
        cost: 1_500_000,
        effects: [
          { type: "capacity_modifier", value: 1.1, duration: 4 },
        ],
      },
      {
        id: "pass",
        label: "Pass on Opportunity",
        description: "Focus on current team development",
        cost: 0,
        effects: [
          { type: "morale_modifier", value: 5 },
        ],
      },
    ],
    icon: "users",
  },

  // CRISES
  {
    id: "product_recall",
    type: "crisis",
    title: "Product Safety Issue",
    description: "A safety defect has been discovered in your products requiring immediate action.",
    triggerConditions: [{ type: "metric", metric: "defectRate", operator: ">", value: 0.08 }],
    baseProbability: 0.3,
    duration: 2,
    severity: "major",
    effects: [
      { type: "brand_modifier", value: -0.1 },
      { type: "cash_change", value: -10_000_000 },
    ],
    playerChoices: [
      {
        id: "full_recall",
        label: "Full Product Recall",
        description: "Most expensive but protects brand long-term",
        cost: 25_000_000,
        effects: [
          { type: "brand_modifier", value: 0.05, duration: 2 },
        ],
      },
      {
        id: "limited_recall",
        label: "Limited Recall",
        description: "Address only confirmed defective units",
        cost: 10_000_000,
        effects: [
          { type: "brand_modifier", value: -0.03 },
        ],
      },
      {
        id: "advisory",
        label: "Issue Advisory Only",
        description: "Minimal cost but significant reputation risk",
        cost: 0,
        effects: [
          { type: "brand_modifier", value: -0.08 },
          { type: "cash_change", value: -5_000_000 }, // Potential lawsuits
        ],
        successProbability: 0.4,
      },
    ],
    icon: "alert-triangle",
  },
  {
    id: "labor_dispute",
    type: "crisis",
    title: "Labor Dispute",
    description: "Workers are threatening to strike over working conditions.",
    triggerConditions: [{ type: "metric", metric: "morale", operator: "<", value: 40 }],
    baseProbability: 0.4,
    duration: 2,
    severity: "moderate",
    effects: [
      { type: "capacity_modifier", value: 0.7, duration: 2 },
      { type: "morale_modifier", value: -10 },
    ],
    playerChoices: [
      {
        id: "negotiate",
        label: "Negotiate Settlement",
        description: "Increase wages and improve conditions",
        cost: 5_000_000,
        effects: [
          { type: "morale_modifier", value: 20 },
          { type: "capacity_modifier", value: 1.0 },
        ],
      },
      {
        id: "hardline",
        label: "Take Hard Line",
        description: "Refuse demands and risk extended disruption",
        cost: 0,
        effects: [
          { type: "capacity_modifier", value: 0.5, duration: 3 },
          { type: "morale_modifier", value: -15 },
        ],
        successProbability: 0.3,
      },
      {
        id: "mediation",
        label: "Third-Party Mediation",
        description: "Bring in neutral mediator",
        cost: 1_000_000,
        effects: [
          { type: "morale_modifier", value: 10 },
          { type: "capacity_modifier", value: 0.9, duration: 1 },
        ],
      },
    ],
    icon: "users-x",
  },
  {
    id: "cyber_attack",
    type: "crisis",
    title: "Cybersecurity Breach",
    description: "A data breach has compromised customer information.",
    triggerConditions: [{ type: "random" }],
    baseProbability: 0.04,
    duration: 2,
    severity: "major",
    effects: [
      { type: "brand_modifier", value: -0.08 },
      { type: "cash_change", value: -5_000_000 },
    ],
    playerChoices: [
      {
        id: "transparent",
        label: "Full Transparency",
        description: "Immediate public disclosure and credit monitoring",
        cost: 8_000_000,
        effects: [
          { type: "brand_modifier", value: 0.03, duration: 2 },
          { type: "esg_modifier", value: 50 },
        ],
      },
      {
        id: "minimal",
        label: "Minimal Disclosure",
        description: "Meet legal requirements only",
        cost: 2_000_000,
        effects: [
          { type: "brand_modifier", value: -0.05 },
          { type: "esg_modifier", value: -100 },
        ],
      },
    ],
    icon: "shield-x",
  },

  // MARKET SHIFTS
  {
    id: "trend_shift",
    type: "market_shift",
    title: "Consumer Trend Shift",
    description: "Consumer preferences are shifting toward sustainability.",
    triggerConditions: [{ type: "random" }],
    baseProbability: 0.1,
    duration: 4,
    effects: [
      { type: "esg_modifier", value: 100 },
    ],
    playerChoices: [
      {
        id: "embrace",
        label: "Embrace Sustainability",
        description: "Invest heavily in green initiatives",
        cost: 10_000_000,
        effects: [
          { type: "esg_modifier", value: 200 },
          { type: "brand_modifier", value: 0.05, duration: 4 },
          { type: "demand_modifier", value: 1.1, target: "all", duration: 4 },
        ],
      },
      {
        id: "gradual",
        label: "Gradual Transition",
        description: "Slow adoption of sustainable practices",
        cost: 3_000_000,
        effects: [
          { type: "esg_modifier", value: 100 },
        ],
      },
      {
        id: "ignore",
        label: "Stay the Course",
        description: "Focus on current strategy",
        cost: 0,
        effects: [
          { type: "demand_modifier", value: 0.95, target: "all", duration: 4 },
        ],
      },
    ],
    icon: "leaf",
  },

  // REGULATORY
  {
    id: "new_regulation",
    type: "regulatory",
    title: "New Industry Regulation",
    description: "New environmental regulations will increase compliance costs.",
    triggerConditions: [{ type: "random" }],
    baseProbability: 0.06,
    duration: 0, // Permanent
    effects: [
      { type: "cost_modifier", value: 1.05 },
    ],
    playerChoices: [
      {
        id: "exceed",
        label: "Exceed Requirements",
        description: "Go beyond compliance for competitive advantage",
        cost: 8_000_000,
        effects: [
          { type: "cost_modifier", value: 1.02 }, // Lower ongoing cost
          { type: "esg_modifier", value: 150 },
          { type: "brand_modifier", value: 0.03 },
        ],
      },
      {
        id: "comply",
        label: "Minimum Compliance",
        description: "Meet requirements at lowest cost",
        cost: 2_000_000,
        effects: [
          { type: "cost_modifier", value: 1.05 },
        ],
      },
    ],
    icon: "gavel",
  },

  // COMPETITIVE
  {
    id: "competitor_exit",
    type: "competitive",
    title: "Competitor Exits Market",
    description: "A major competitor is leaving your primary market segment.",
    triggerConditions: [{ type: "random" }],
    baseProbability: 0.04,
    duration: 1,
    effects: [
      { type: "demand_modifier", value: 1.2, duration: 2 },
    ],
    playerChoices: [
      {
        id: "aggressive",
        label: "Aggressive Expansion",
        description: "Capture maximum market share quickly",
        cost: 15_000_000,
        effects: [
          { type: "demand_modifier", value: 1.4, duration: 3 },
          { type: "brand_modifier", value: 0.05 },
        ],
      },
      {
        id: "selective",
        label: "Selective Targeting",
        description: "Focus on profitable customer segments",
        cost: 5_000_000,
        effects: [
          { type: "revenue_modifier", value: 1.15, duration: 3 },
        ],
      },
      {
        id: "acquire",
        label: "Acquire Assets",
        description: "Buy competitor's customer base and IP",
        cost: 30_000_000,
        requirements: [{ type: "cash", minValue: 50_000_000 }],
        effects: [
          { type: "demand_modifier", value: 1.5, duration: 4 },
          { type: "rd_bonus", value: 400 },
        ],
      },
    ],
    icon: "trending-up",
  },
];

// ============================================
// SUPPLY CHAIN EVENT TEMPLATES
// (Converted from data/supplyChainEvents.ts for engine integration)
// ============================================

const SUPPLY_CHAIN_EVENT_TEMPLATES: GameEvent[] = [
  {
    id: "sc_port_congestion",
    type: "crisis",
    title: "Port Congestion",
    description: "Major shipping delays at Asian ports cause component shortages. Production output reduced for 2 rounds.",
    triggerConditions: [{ type: "round", operator: ">=", value: 3 }],
    baseProbability: 0.08,
    duration: 2,
    severity: "moderate",
    effects: [
      { type: "capacity_modifier", value: 0.85, duration: 2 },
      { type: "cost_modifier", value: 1.05 },
    ],
    icon: "ship",
  },
  {
    id: "sc_chip_shortage",
    type: "crisis",
    title: "Semiconductor Shortage",
    description: "Global chip shortage drives processor costs up 40%. Premium segments hit hardest.",
    triggerConditions: [{ type: "round", operator: ">=", value: 5 }],
    baseProbability: 0.06,
    duration: 3,
    severity: "major",
    effects: [
      { type: "cost_modifier", value: 1.4, duration: 3 },
    ],
    playerChoices: [
      {
        id: "stockpile",
        label: "Emergency Stockpile",
        description: "Buy chips at premium prices to maintain production",
        cost: 8_000_000,
        effects: [{ type: "cost_modifier", value: 1.15, duration: 2 }],
      },
      {
        id: "redesign",
        label: "Redesign with Alternatives",
        description: "Use alternative chips — slower but cheaper long-term",
        cost: 3_000_000,
        effects: [
          { type: "capacity_modifier", value: 0.8, duration: 2 },
          { type: "quality_modifier", value: -3, target: "all", duration: 2 },
        ],
      },
    ],
    icon: "cpu",
  },
  {
    id: "sc_display_defect",
    type: "crisis",
    title: "Display Panel Quality Issue",
    description: "A batch of display panels from your supplier has quality defects. Defect rate increases until resolved.",
    triggerConditions: [{ type: "round", operator: ">=", value: 2 }],
    baseProbability: 0.10,
    duration: 2,
    severity: "moderate",
    effects: [
      { type: "quality_modifier", value: -8, target: "all", duration: 2 },
    ],
    playerChoices: [
      {
        id: "switch_supplier",
        label: "Switch Supplier",
        description: "Find a new supplier — costs money but fixes quality",
        cost: 4_000_000,
        effects: [{ type: "quality_modifier", value: 2, target: "all", duration: 3 }],
      },
      {
        id: "extra_qa",
        label: "Extra QA Testing",
        description: "Add inspection step — slows production but catches defects",
        cost: 1_500_000,
        effects: [{ type: "capacity_modifier", value: 0.9, duration: 2 }],
      },
    ],
    icon: "monitor-x",
  },
  {
    id: "sc_rare_earth_spike",
    type: "crisis",
    title: "Rare Earth Price Spike",
    description: "Export restrictions on rare earth minerals drive battery and display costs up 25%.",
    triggerConditions: [{ type: "round", operator: ">=", value: 4 }],
    baseProbability: 0.07,
    duration: 2,
    severity: "moderate",
    effects: [
      { type: "cost_modifier", value: 1.25, duration: 2 },
    ],
    icon: "gem",
  },
  {
    id: "sc_supplier_improvement",
    type: "opportunity",
    title: "Supplier Quality Improvement",
    description: "Your primary supplier invests in new equipment. Material quality improves, reducing defect rates.",
    triggerConditions: [{ type: "round", operator: ">=", value: 6 }],
    baseProbability: 0.05,
    duration: 3,
    effects: [
      { type: "quality_modifier", value: 5, target: "all", duration: 3 },
    ],
    icon: "sparkles",
  },
];

// ============================================
// BREAKTHROUGH EVENT TEMPLATES
// (Converted from data/breakthroughEvents.ts for engine integration)
// ============================================

const BREAKTHROUGH_EVENT_TEMPLATES: GameEvent[] = [
  {
    id: "bt_nano_materials",
    type: "opportunity",
    title: "Nano-Material Synthesis Breakthrough",
    description: "Your R&D team discovers a method to synthesize carbon nanotubes at scale. Ultra-durable, ultra-light construction unlocked.",
    triggerConditions: [{ type: "metric", metric: "rdProgress", operator: ">=", value: 300 }],
    baseProbability: 0.03,
    duration: 0,
    effects: [
      { type: "quality_modifier", value: 8, target: "all" },
      { type: "cost_modifier", value: 0.9 },
    ],
    playerChoices: [
      {
        id: "invest",
        label: "Full Investment",
        description: "Commit $45M to scale nano-material production",
        cost: 45_000_000,
        effects: [
          { type: "quality_modifier", value: 12, target: "all" },
          { type: "cost_modifier", value: 0.85 },
          { type: "brand_modifier", value: 0.05 },
        ],
      },
      {
        id: "license",
        label: "License the Technology",
        description: "License to others for immediate revenue",
        cost: 0,
        effects: [
          { type: "cash_change", value: 20_000_000 },
          { type: "brand_modifier", value: 0.02 },
        ],
      },
    ],
    icon: "atom",
  },
  {
    id: "bt_ai_chip",
    type: "opportunity",
    title: "Neural Processing Architecture",
    description: "A breakthrough in on-device AI processing enables phones that learn and adapt to users.",
    triggerConditions: [{ type: "metric", metric: "rdProgress", operator: ">=", value: 400 }],
    baseProbability: 0.02,
    duration: 0,
    effects: [
      { type: "quality_modifier", value: 10, target: "all" },
      { type: "brand_modifier", value: 0.05 },
    ],
    icon: "brain",
  },
  {
    id: "bt_solid_state_battery",
    type: "opportunity",
    title: "Solid-State Battery Breakthrough",
    description: "A solid-state battery that charges in 5 minutes and lasts 3 days. Transforms battery performance.",
    triggerConditions: [{ type: "metric", metric: "rdProgress", operator: ">=", value: 250 }],
    baseProbability: 0.03,
    duration: 0,
    effects: [
      { type: "quality_modifier", value: 6, target: "all" },
      { type: "cost_modifier", value: 0.92 },
    ],
    playerChoices: [
      {
        id: "exclusive",
        label: "Exclusive Production",
        description: "Keep the technology proprietary for competitive edge",
        cost: 40_000_000,
        effects: [
          { type: "quality_modifier", value: 10, target: "all" },
          { type: "brand_modifier", value: 0.08 },
        ],
      },
      {
        id: "partnership",
        label: "Industry Partnership",
        description: "Share costs and accelerate adoption",
        cost: 15_000_000,
        effects: [
          { type: "quality_modifier", value: 6, target: "all" },
          { type: "esg_modifier", value: 100 },
        ],
      },
    ],
    icon: "battery-charging",
  },
];

// ============================================
// CONTRACT ORDER EVENT TEMPLATES
// (NPC bulk purchase contracts offering guaranteed revenue)
// ============================================

const CONTRACT_EVENT_TEMPLATES: GameEvent[] = [
  {
    id: "contract_govt_school",
    type: "opportunity",
    title: "Government School Device Order",
    description: "The National Education Board needs affordable devices for a nationwide school programme. High volume, tight deadline.",
    triggerConditions: [{ type: "round", operator: ">=", value: 4 }],
    baseProbability: 0.12,
    duration: 3,
    effects: [],
    playerChoices: [
      {
        id: "accept",
        label: "Accept Contract",
        description: "Commit to delivering 5,000-15,000 Budget phones at 5% premium",
        cost: 0,
        effects: [
          { type: "revenue_modifier", value: 1.05, duration: 3 },
          { type: "demand_modifier", value: 1.1, duration: 3 },
        ],
      },
      {
        id: "decline",
        label: "Decline Order",
        description: "Focus on retail sales instead",
        cost: 0,
        effects: [],
      },
    ],
    icon: "file-text",
  },
  {
    id: "contract_telecom_bundle",
    type: "opportunity",
    title: "Telecom Bundle Partnership",
    description: "TeleCom Corp wants to bundle your phones with their new plan. High volume, decent premium.",
    triggerConditions: [{ type: "round", operator: ">=", value: 3 }],
    baseProbability: 0.10,
    duration: 4,
    effects: [],
    playerChoices: [
      {
        id: "accept",
        label: "Accept Partnership",
        description: "Supply 8,000-20,000 Budget phones at 8% premium",
        cost: 0,
        effects: [
          { type: "revenue_modifier", value: 1.08, duration: 4 },
          { type: "brand_modifier", value: 0.02 },
        ],
      },
      {
        id: "decline",
        label: "Pass",
        description: "Maintain pricing independence",
        cost: 0,
        effects: [],
      },
    ],
    icon: "phone",
  },
  {
    id: "contract_enterprise_rollout",
    type: "opportunity",
    title: "Enterprise Device Rollout",
    description: "FinServ Holdings is deploying secure devices to their global workforce. Premium price, strict SLA.",
    triggerConditions: [
      { type: "round", operator: ">=", value: 8 },
      { type: "metric", metric: "brandValue", operator: ">", value: 0.3 },
    ],
    baseProbability: 0.07,
    duration: 4,
    effects: [],
    playerChoices: [
      {
        id: "accept",
        label: "Accept Enterprise Contract",
        description: "Deliver 1,000-4,000 Professional phones at 18% premium. Steep failure penalty.",
        cost: 0,
        effects: [
          { type: "revenue_modifier", value: 1.18, duration: 4 },
          { type: "brand_modifier", value: 0.04 },
        ],
      },
      {
        id: "decline",
        label: "Decline",
        description: "Too risky for current capacity",
        cost: 0,
        effects: [],
      },
    ],
    icon: "building-2",
  },
  {
    id: "contract_retail_chain",
    type: "opportunity",
    title: "MegaMart Holiday Promotion",
    description: "MegaMart wants an exclusive run of your General segment phone for their holiday promotion.",
    triggerConditions: [{ type: "round", operator: ">=", value: 5 }],
    baseProbability: 0.10,
    duration: 3,
    effects: [],
    playerChoices: [
      {
        id: "accept",
        label: "Accept Retail Deal",
        description: "Supply 3,000-10,000 General phones at 10% premium",
        cost: 0,
        effects: [
          { type: "revenue_modifier", value: 1.10, duration: 3 },
          { type: "demand_modifier", value: 1.15, duration: 2 },
        ],
      },
      {
        id: "decline",
        label: "Pass",
        description: "Keep inventory for direct sales",
        cost: 0,
        effects: [],
      },
    ],
    icon: "store",
  },
];

// ============================================
// ENGINE
// ============================================

export class EventEngine {
  /**
   * Process events for a round
   */
  static processEvents(
    state: TeamState,
    previousEventState: EventState | null,
    round: number,
    config: EngineConfig,
    ctx: EngineContext
  ): EventResult {
    const messages: string[] = [];
    const eventState: EventState = previousEventState
      ? { ...previousEventState, activeEvents: [...previousEventState.activeEvents] }
      : this.initializeState();

    // Update active events
    const resolvedEvents: ActiveEvent[] = [];
    eventState.activeEvents = eventState.activeEvents.filter((ae) => {
      ae.roundsRemaining--;
      if (ae.roundsRemaining <= 0) {
        resolvedEvents.push(ae);
        messages.push(`Event resolved: ${ae.event.title}`);
        return false;
      }
      return true;
    });

    // Check for new events
    const newEvents: GameEvent[] = [];
    const pendingChoices: { event: GameEvent; choices: EventChoice[] }[] = [];

    // Combine all event template sources
    const allTemplates = [
      ...EVENT_TEMPLATES,
      ...SUPPLY_CHAIN_EVENT_TEMPLATES,
      ...BREAKTHROUGH_EVENT_TEMPLATES,
      ...CONTRACT_EVENT_TEMPLATES,
    ];

    for (const template of allTemplates) {
      if (this.shouldTriggerEvent(template, state, round, config, ctx)) {
        // Check if event is already active
        const isActive = eventState.activeEvents.some(
          (ae) => ae.event.id === template.id
        );
        if (isActive) continue;

        newEvents.push(template);

        if (template.playerChoices && template.playerChoices.length > 0) {
          pendingChoices.push({
            event: template,
            choices: template.playerChoices,
          });
        } else {
          // Apply effects immediately for events without choices
          eventState.activeEvents.push({
            event: template,
            roundTriggered: round,
            roundsRemaining: template.duration,
            activeEffects: template.effects,
          });
        }

        messages.push(`New event: ${template.title}`);
        eventState.lastEventRound = round;

        // Update crisis level
        if (template.type === "crisis") {
          const severityValue =
            template.severity === "critical" ? 30 :
            template.severity === "major" ? 20 :
            template.severity === "moderate" ? 10 : 5;
          eventState.crisisLevel = Math.min(100, eventState.crisisLevel + severityValue);
        }
      }
    }

    // Decay crisis level over time
    eventState.crisisLevel = Math.max(0, eventState.crisisLevel - 5);

    // Calculate total effects
    const totalEffects = this.calculateTotalEffects(eventState.activeEvents);

    return {
      state: eventState,
      newEvents,
      resolvedEvents,
      totalEffects,
      messages,
      pendingChoices,
    };
  }

  /**
   * Initialize event state
   */
  static initializeState(): EventState {
    return {
      activeEvents: [],
      eventHistory: [],
      crisisLevel: 0,
      lastEventRound: 0,
    };
  }

  /**
   * Check if an event should trigger
   */
  private static shouldTriggerEvent(
    event: GameEvent,
    state: TeamState,
    round: number,
    config: EngineConfig,
    ctx: EngineContext
  ): boolean {
    // Check trigger conditions
    for (const condition of event.triggerConditions) {
      if (!this.evaluateCondition(condition, state, round)) {
        return false;
      }
    }

    // Apply probability with difficulty modifiers
    let adjustedProb = event.baseProbability;

    if (event.type === "crisis") {
      adjustedProb *= config.difficulty.events.crisisFrequency;
    } else if (event.type === "opportunity") {
      adjustedProb *= config.difficulty.events.opportunityFrequency;
    }

    return ctx.rng.general.chance(adjustedProb);
  }

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(
    condition: EventCondition,
    state: TeamState,
    round: number
  ): boolean {
    switch (condition.type) {
      case "random":
        return true; // Random events always pass condition check

      case "round":
        return this.compareValues(round, condition.operator!, condition.value as number);

      case "metric": {
        const value = this.getMetricValue(condition.metric!, state);
        return this.compareValues(value, condition.operator!, condition.value as number);
      }

      case "state":
        // Custom state checks
        return true;

      default:
        return false;
    }
  }

  /**
   * Get metric value from state
   */
  private static getMetricValue(metric: string, state: TeamState): number {
    switch (metric) {
      case "brandValue":
        return state.brandValue;
      case "cash":
        return state.cash;
      case "esg":
        return state.esgScore ?? 0;
      case "morale":
        return state.workforce?.averageMorale ?? 70;
      case "defectRate":
        return state.factories?.[0]?.defectRate ?? 0.05;
      case "rdProgress":
        return state.rdProgress ?? 0;
      default:
        return 0;
    }
  }

  /**
   * Compare values with operator
   */
  private static compareValues(
    actual: number,
    operator: string,
    expected: number
  ): boolean {
    switch (operator) {
      case ">": return actual > expected;
      case "<": return actual < expected;
      case ">=": return actual >= expected;
      case "<=": return actual <= expected;
      case "==": return actual === expected;
      case "!=": return actual !== expected;
      default: return false;
    }
  }

  /**
   * Apply player choice to an event
   */
  static applyChoice(
    eventState: EventState,
    eventId: string,
    choiceId: string,
    round: number,
    ctx: EngineContext
  ): { success: boolean; effects: EventEffect[]; message: string } {
    const allTemplates = [
      ...EVENT_TEMPLATES,
      ...SUPPLY_CHAIN_EVENT_TEMPLATES,
      ...BREAKTHROUGH_EVENT_TEMPLATES,
      ...CONTRACT_EVENT_TEMPLATES,
    ];
    const event = allTemplates.find((e) => e.id === eventId);
    if (!event || !event.playerChoices) {
      return { success: false, effects: [], message: "Event not found" };
    }

    const choice = event.playerChoices.find((c) => c.id === choiceId);
    if (!choice) {
      return { success: false, effects: [], message: "Choice not found" };
    }

    // Check success probability for risky choices
    let success = true;
    if (choice.successProbability !== undefined) {
      success = ctx.rng.general.chance(choice.successProbability);
    }

    const effects = success ? choice.effects : [];

    // Add to active events
    eventState.activeEvents.push({
      event,
      roundTriggered: round,
      roundsRemaining: event.duration,
      choiceMade: choiceId,
      activeEffects: effects,
    });

    // Record in history
    eventState.eventHistory.push({
      eventId: event.id,
      eventTitle: event.title,
      round,
      choice: choiceId,
      outcome: success ? "positive" : "negative",
    });

    const message = success
      ? `${event.title}: ${choice.label} - Success!`
      : `${event.title}: ${choice.label} - Did not go as planned`;

    return { success, effects, message };
  }

  /**
   * Calculate total effects from all active events
   */
  private static calculateTotalEffects(activeEvents: ActiveEvent[]): {
    revenueModifier: number;
    costModifier: number;
    brandModifier: number;
    demandModifier: number;
    cashChange: number;
  } {
    const totals = {
      revenueModifier: 1.0,
      costModifier: 1.0,
      brandModifier: 0,
      demandModifier: 1.0,
      cashChange: 0,
    };

    for (const ae of activeEvents) {
      for (const effect of ae.activeEffects) {
        switch (effect.type) {
          case "revenue_modifier":
            totals.revenueModifier *= effect.value;
            break;
          case "cost_modifier":
            totals.costModifier *= effect.value;
            break;
          case "brand_modifier":
            totals.brandModifier += effect.value;
            break;
          case "demand_modifier":
            totals.demandModifier *= effect.value;
            break;
          case "cash_change":
            totals.cashChange += effect.value;
            break;
        }
      }
    }

    return totals;
  }

  /**
   * Get all available event templates
   */
  static getEventTemplates(): GameEvent[] {
    return [
      ...EVENT_TEMPLATES,
      ...SUPPLY_CHAIN_EVENT_TEMPLATES,
      ...BREAKTHROUGH_EVENT_TEMPLATES,
      ...CONTRACT_EVENT_TEMPLATES,
    ];
  }
}

// Types are exported with their interface/type declarations above
