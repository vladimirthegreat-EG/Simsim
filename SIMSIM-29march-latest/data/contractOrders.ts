/**
 * Contract Orders - NPC bulk purchase contracts.
 *
 * NPCs occasionally offer guaranteed revenue in exchange for guaranteed delivery.
 * Teaches B2B sales, SLA management, and revenue certainty vs. flexibility.
 */

import type { Segment } from "@/engine/types";

export interface ContractTemplate {
  id: string;
  buyerName: string;
  segment: Segment;
  /** Volume range (min-max units) */
  volumeRange: { min: number; max: number };
  /** Price premium over market rate (e.g. 1.1 = 10% above market) */
  pricePremium: number;
  /** Deadline in rounds from offer */
  deadlineRounds: number;
  /** Penalty for failure as fraction of contract value */
  failurePenalty: number;
  /** Minimum round before this contract can appear */
  minRound: number;
  /** Probability per round of being offered */
  offerChance: number;
  /** Description shown to player */
  description: string;
}

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  // Budget segment contracts - high volume, thin margins
  {
    id: "govt_school_order",
    buyerName: "National Education Board",
    segment: "Budget",
    volumeRange: { min: 5000, max: 15000 },
    pricePremium: 1.05,
    deadlineRounds: 3,
    failurePenalty: 0.15,
    minRound: 4,
    offerChance: 0.12,
    description: "The National Education Board needs affordable devices for a nationwide school programme. Guaranteed volume, tight deadline.",
  },
  {
    id: "telecom_bundle",
    buyerName: "TeleCom Corp",
    segment: "Budget",
    volumeRange: { min: 8000, max: 20000 },
    pricePremium: 1.08,
    deadlineRounds: 4,
    failurePenalty: 0.10,
    minRound: 3,
    offerChance: 0.10,
    description: "TeleCom Corp wants to bundle your phones with their new plan. High volume, decent premium.",
  },

  // General segment contracts
  {
    id: "retail_chain_order",
    buyerName: "MegaMart Retail",
    segment: "General",
    volumeRange: { min: 3000, max: 10000 },
    pricePremium: 1.10,
    deadlineRounds: 3,
    failurePenalty: 0.12,
    minRound: 5,
    offerChance: 0.10,
    description: "MegaMart wants an exclusive run of your General segment phone for their holiday promotion.",
  },
  {
    id: "corporate_fleet",
    buyerName: "Global Logistics Inc.",
    segment: "General",
    volumeRange: { min: 2000, max: 6000 },
    pricePremium: 1.12,
    deadlineRounds: 4,
    failurePenalty: 0.15,
    minRound: 6,
    offerChance: 0.08,
    description: "Global Logistics is refreshing their entire fleet. Premium price for reliable, on-time delivery.",
  },

  // Enthusiast segment contracts - lower volume, higher premium
  {
    id: "tech_reviewer_batch",
    buyerName: "TechReview Network",
    segment: "Enthusiast",
    volumeRange: { min: 500, max: 2000 },
    pricePremium: 1.15,
    deadlineRounds: 2,
    failurePenalty: 0.20,
    minRound: 7,
    offerChance: 0.08,
    description: "TechReview Network wants early access units for their global review event. High premium, tight deadline, brand exposure.",
  },

  // Professional segment contracts
  {
    id: "enterprise_rollout",
    buyerName: "FinServ Holdings",
    segment: "Professional",
    volumeRange: { min: 1000, max: 4000 },
    pricePremium: 1.18,
    deadlineRounds: 4,
    failurePenalty: 0.25,
    minRound: 8,
    offerChance: 0.07,
    description: "FinServ Holdings is deploying secure devices to their global workforce. Premium price, strict SLA, steep failure penalty.",
  },

  // Active lifestyle contracts
  {
    id: "fitness_chain_deal",
    buyerName: "FitLife Gyms",
    segment: "Active Lifestyle",
    volumeRange: { min: 1500, max: 5000 },
    pricePremium: 1.12,
    deadlineRounds: 3,
    failurePenalty: 0.10,
    minRound: 6,
    offerChance: 0.09,
    description: "FitLife Gyms wants to offer your rugged phone as part of their premium membership package.",
  },
];
