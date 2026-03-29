/**
 * Dynamic Demand System — Seasonal cycles + Segment lifecycle (Capsim pattern)
 *
 * Two layers:
 * 1. SEASONAL CYCLES: Repeat every N rounds (scaled to game length). Fluctuation around baseline.
 * 2. LIFECYCLE CURVE: Growth → Maturity → Decline over the full game.
 *    Some segments peak early (Budget), others peak late (Active Lifestyle).
 *    Forces players to plan segment entry/exit — not just grow forever.
 *
 * Capsim reference: Low Tech grows slowly then matures. High Tech grows fast then fragments.
 * BSG reference: Markets have natural ceilings. Overinvestment leads to price wars.
 */

import type { Segment } from "@/engine/types";

export interface DemandCyclePoint {
  /** Round number within the cycle (wraps around) */
  roundInCycle: number;
  /** Demand multiplier (1.0 = baseline, >1 = surge, <1 = slump) */
  multiplier: number;
  /** Optional label for the seasonal event */
  label?: string;
}

export interface SegmentDemandCycle {
  segment: Segment;
  /** Number of rounds per full cycle — scales with game length */
  cycleLength: number;
  /** Points defining the demand curve within a cycle */
  points: DemandCyclePoint[];
  /** Description for Market Intelligence panel */
  description: string;
}

/**
 * Segment lifecycle: defines how each segment's growth rate changes over the game.
 * Returns a growth multiplier based on what % of the game has elapsed.
 *
 * Capsim pattern:
 *   - Budget: steady then slowly declines (mature market)
 *   - General: grows then plateaus (mainstream adoption)
 *   - Enthusiast: volatile — grows fast, peaks mid-game, then fragments
 *   - Professional: slow steady growth, never declines (enterprise sticky)
 *   - Active Lifestyle: late bloomer — grows throughout, peaks late game
 */
export function getLifecycleMultiplier(segment: Segment, round: number, maxRounds: number): number {
  // What % of the game has elapsed (0.0 to 1.0)
  const progress = Math.min(1.0, (round - 1) / Math.max(1, maxRounds - 1));

  switch (segment) {
    case "Budget":
      // Mature market: grows early, peaks at 40% of game, then slowly declines
      // Forces players to plan exit or pivot
      if (progress < 0.4) return 1.0 + progress * 0.15;       // 1.0 → 1.06 (slow growth)
      if (progress < 0.7) return 1.06;                         // plateau
      return 1.06 - (progress - 0.7) * 0.40;                   // 1.06 → 0.94 (decline)

    case "General":
      // Mainstream: steady growth, plateaus at 60%, slight decline end
      if (progress < 0.6) return 1.0 + progress * 0.20;       // 1.0 → 1.12 (moderate growth)
      if (progress < 0.8) return 1.12;                         // plateau
      return 1.12 - (progress - 0.8) * 0.30;                   // 1.12 → 1.06 (slight decline)

    case "Enthusiast":
      // Volatile: fast growth, peaks at 50%, then drops (tech moves on)
      // Highest risk/reward segment
      if (progress < 0.3) return 1.0 + progress * 0.50;       // 1.0 → 1.15 (fast growth)
      if (progress < 0.5) return 1.15 + (progress - 0.3) * 0.25; // 1.15 → 1.20 (peak)
      if (progress < 0.7) return 1.20;                         // brief plateau
      return 1.20 - (progress - 0.7) * 0.80;                   // 1.20 → 0.96 (sharp decline)

    case "Professional":
      // Enterprise: slow and steady, never really declines (sticky contracts)
      // Safest segment but lowest growth
      return 1.0 + progress * 0.10;                            // 1.0 → 1.10 (slow steady)

    case "Active Lifestyle":
      // Late bloomer: slow start, accelerates mid-game, peaks at 80%
      // Rewards patient players who invest early
      if (progress < 0.3) return 1.0 + progress * 0.10;       // 1.0 → 1.03 (slow)
      if (progress < 0.6) return 1.03 + (progress - 0.3) * 0.40; // 1.03 → 1.15 (accelerating)
      if (progress < 0.8) return 1.15 + (progress - 0.6) * 0.30; // 1.15 → 1.21 (peak)
      return 1.21 - (progress - 0.8) * 0.25;                   // 1.21 → 1.16 (slight decline)

    default:
      return 1.0;
  }
}

/**
 * Get the demand multiplier for a given segment and round.
 * Combines seasonal cycle × lifecycle curve.
 *
 * @param segment - Market segment
 * @param round - Current round number
 * @param maxRounds - Total rounds in the game (for lifecycle scaling). Defaults to 24.
 */
export function getDemandMultiplier(segment: Segment, round: number, maxRounds: number = 24): number {
  // Layer 1: Seasonal cycle (repeating)
  const cycle = SEGMENT_DEMAND_CYCLES[segment];
  let seasonalMultiplier = 1.0;

  if (cycle) {
    const roundInCycle = ((round - 1) % cycle.cycleLength);

    const sorted = [...cycle.points].sort((a, b) => a.roundInCycle - b.roundInCycle);
    let before = sorted[sorted.length - 1];
    let after = sorted[0];

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].roundInCycle <= roundInCycle) {
        before = sorted[i];
        after = sorted[(i + 1) % sorted.length];
      }
    }

    if (before.roundInCycle === after.roundInCycle) {
      seasonalMultiplier = before.multiplier;
    } else {
      let range = after.roundInCycle - before.roundInCycle;
      if (range <= 0) range += cycle.cycleLength;
      let progress = roundInCycle - before.roundInCycle;
      if (progress < 0) progress += cycle.cycleLength;
      const t = progress / range;
      seasonalMultiplier = before.multiplier + (after.multiplier - before.multiplier) * t;
    }
  }

  // Layer 2: Lifecycle curve (one-time arc over full game)
  const lifecycleMultiplier = getLifecycleMultiplier(segment, round, maxRounds);

  return seasonalMultiplier * lifecycleMultiplier;
}

/**
 * Seasonal demand cycles — short-term fluctuations that repeat.
 * Cycle length should be ~25-33% of game length for 3-4 full cycles.
 * Currently set to 8 rounds = 2 cycles in 16-round game, 4 cycles in 32-round game.
 */
export const SEGMENT_DEMAND_CYCLES: Record<Segment, SegmentDemandCycle> = {
  "Budget": {
    segment: "Budget",
    cycleLength: 8,
    description: "Steady demand with slight holiday surge. Most predictable segment.",
    points: [
      { roundInCycle: 0, multiplier: 1.0 },
      { roundInCycle: 2, multiplier: 0.95 },
      { roundInCycle: 4, multiplier: 1.0 },
      { roundInCycle: 6, multiplier: 1.15, label: "Holiday Season" },
      { roundInCycle: 7, multiplier: 1.05 },
    ],
  },
  "General": {
    segment: "General",
    cycleLength: 8,
    description: "Moderate seasonal variance. Peaks during product launch windows.",
    points: [
      { roundInCycle: 0, multiplier: 0.9 },
      { roundInCycle: 2, multiplier: 1.1, label: "Spring Launch" },
      { roundInCycle: 4, multiplier: 0.85, label: "Summer Lull" },
      { roundInCycle: 6, multiplier: 1.2, label: "Holiday Season" },
      { roundInCycle: 7, multiplier: 1.0 },
    ],
  },
  "Enthusiast": {
    segment: "Enthusiast",
    cycleLength: 6,
    description: "Tech event driven. Demand spikes during launch cycles, crashes between.",
    points: [
      { roundInCycle: 0, multiplier: 0.8 },
      { roundInCycle: 1, multiplier: 1.3, label: "Tech Launch Event" },
      { roundInCycle: 2, multiplier: 1.1 },
      { roundInCycle: 3, multiplier: 0.75, label: "Post-Launch Slump" },
      { roundInCycle: 5, multiplier: 0.9 },
    ],
  },
  "Professional": {
    segment: "Professional",
    cycleLength: 8,
    description: "Business purchasing cycles. Q1 and Q3 budget allocations drive demand.",
    points: [
      { roundInCycle: 0, multiplier: 1.2, label: "Q1 Budget Cycle" },
      { roundInCycle: 2, multiplier: 0.85 },
      { roundInCycle: 4, multiplier: 1.15, label: "Q3 Refresh" },
      { roundInCycle: 6, multiplier: 0.9, label: "Year-End Freeze" },
      { roundInCycle: 7, multiplier: 0.95 },
    ],
  },
  "Active Lifestyle": {
    segment: "Active Lifestyle",
    cycleLength: 8,
    description: "Fitness-driven peaks. Summer and New Year resolutions drive demand.",
    points: [
      { roundInCycle: 0, multiplier: 1.25, label: "New Year Resolutions" },
      { roundInCycle: 2, multiplier: 0.9 },
      { roundInCycle: 4, multiplier: 1.2, label: "Summer Fitness" },
      { roundInCycle: 6, multiplier: 0.85, label: "Autumn Lull" },
      { roundInCycle: 7, multiplier: 1.0 },
    ],
  },
};
