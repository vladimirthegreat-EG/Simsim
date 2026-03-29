/**
 * Supply Chain Disruption Events
 *
 * Random logistics events that affect shipping costs, delivery times,
 * and material availability. Uses SeededRNG for deterministic results.
 */

import type { ShippingMethod } from "./types";

export interface LogisticsDisruptionEvent {
  id: string;
  name: string;
  description: string;
  probability: number; // per round
  affectedMethods: ShippingMethod[];
  costMultiplier: number;
  timeMultiplier: number;
  duration: number; // rounds
}

export interface ActiveDisruption extends LogisticsDisruptionEvent {
  triggeredRound: number;
  expiresRound: number;
}

export const LOGISTICS_DISRUPTION_EVENTS: LogisticsDisruptionEvent[] = [
  {
    id: "port_congestion",
    name: "Port Congestion",
    description: "Major port congestion delays sea shipments",
    probability: 0.10,
    affectedMethods: ["sea"],
    costMultiplier: 1.15,
    timeMultiplier: 1.6,
    duration: 2,
  },
  {
    id: "fuel_spike",
    name: "Global Fuel Price Surge",
    description: "Fuel costs spike across all shipping",
    probability: 0.06,
    affectedMethods: ["sea", "air", "land", "rail"],
    costMultiplier: 1.25,
    timeMultiplier: 1.0,
    duration: 3,
  },
  {
    id: "canal_closure",
    name: "Shipping Lane Disruption",
    description: "Key waterway temporarily closed",
    probability: 0.04,
    affectedMethods: ["sea"],
    costMultiplier: 1.40,
    timeMultiplier: 2.0,
    duration: 1,
  },
  {
    id: "customs_strike",
    name: "Customs Workers Strike",
    description: "Clearance delays at major ports",
    probability: 0.05,
    affectedMethods: ["sea", "air", "land", "rail"],
    costMultiplier: 1.08,
    timeMultiplier: 1.3,
    duration: 1,
  },
  {
    id: "natural_disaster",
    name: "Regional Natural Disaster",
    description: "Infrastructure disrupted by natural event",
    probability: 0.03,
    affectedMethods: ["sea", "land", "rail"],
    costMultiplier: 1.50,
    timeMultiplier: 2.5,
    duration: 2,
  },
  {
    id: "component_shortage",
    name: "Global Component Shortage",
    description: "Chip shortage increases processor/memory costs",
    probability: 0.05,
    affectedMethods: [],
    costMultiplier: 1.0,
    timeMultiplier: 1.0,
    duration: 3,
  },
];

/**
 * Check for new disruption events this round.
 * Uses SeededRNG for deterministic results — never Math.random().
 *
 * @param rng - SeededRNG instance with next() and chance() methods
 * @param currentRound - Current round number
 * @param activeDisruptions - Currently active disruptions (to avoid duplicates)
 * @returns Array of newly triggered disruptions
 */
export function checkDisruptions(
  rng: { next: () => number; chance: (p: number) => boolean },
  currentRound: number,
  activeDisruptions: ActiveDisruption[]
): ActiveDisruption[] {
  const newDisruptions: ActiveDisruption[] = [];

  for (const event of LOGISTICS_DISRUPTION_EVENTS) {
    // Don't trigger if the same event is already active
    if (activeDisruptions.some(d => d.id === event.id && d.expiresRound > currentRound)) {
      continue;
    }

    if (rng.chance(event.probability)) {
      newDisruptions.push({
        ...event,
        triggeredRound: currentRound,
        expiresRound: currentRound + event.duration,
      });
    }
  }

  return newDisruptions;
}
