/**
 * Game Presets - Define 3 game modes with different round counts.
 *
 * Capsim/BSG pattern: ALL presets start with the SAME company.
 * Only round count and tutorial depth differ.
 * Equal footing — differentiation comes from decisions, not starting conditions.
 *
 * Starting config: 2 segments (General + Budget), 1 machine per line,
 * 12 workers, 4 engineers, 2 supervisors. $175M cash, 0.3 brand.
 */

export interface GamePreset {
  id: "quick" | "standard" | "full";
  name: string;
  rounds: number;
  description: string;
  details: string[];
  startingCash: number;
  startingWorkers: number;
  startingEngineers: number;
  startingSupervisors: number;
  starterMachines: boolean;
  starterProducts: "all" | "none";
  /** How many segments the team starts with production lines & products for (0-5) */
  startingSegments: number;
  startingBrandValue: number;
  tutorialDepth: "light" | "medium" | "full";
  immediateFirstRound: boolean;
}

// Shared starting config — Capsim/BSG: identical start for all game modes
// Shared starting config — Capsim/BSG: identical start for all game modes
// 2 lines × 3 machines each = 6 machines total
// Each machine needs ~5 workers to run → 15 per line × 2 = 30 workers
const SHARED_START = {
  startingCash: 125_000_000,     // Tight but workable — ~8 rounds runway before must be profitable
  startingWorkers: 30,         // 2 lines × 15 needed = 30 (fully staffed at start)
  startingEngineers: 4,        // 2 per line
  startingSupervisors: 3,      // ceil(30+4+3)/15 = 3
  starterMachines: true,       // 3 Assembly Lines per active line
  starterProducts: "all" as const,
  startingSegments: 2,         // General + Budget (must R&D to unlock others)
  startingBrandValue: 0.3,     // Earn brand through decisions
  immediateFirstRound: true,
};

export const GAME_PRESETS: Record<string, GamePreset> = {
  quick: {
    id: "quick",
    name: "Quick Game",
    rounds: 16,
    description: "Fast-paced strategy game. Same starting company, fewer rounds to execute.",
    details: [
      "16 rounds (~40-80 min)",
      "2 products (General + Budget), 37 staff, 6 machines, 1 factory",
      "Expand to 5 segments through R&D",
      "Brief overview tutorial",
    ],
    ...SHARED_START,
    tutorialDepth: "light",
  },

  standard: {
    id: "standard",
    name: "Standard Game",
    rounds: 24,
    description: "Balanced pace. Enough time for 2-3 strategic pivots.",
    details: [
      "24 rounds (~60-120 min)",
      "2 products (General + Budget), 37 staff, 6 machines, 1 factory",
      "Expand to 5 segments through R&D",
      "Guided tutorial covering key mechanics",
    ],
    ...SHARED_START,
    tutorialDepth: "medium",
  },

  full: {
    id: "full",
    name: "Full Simulation",
    rounds: 32,
    description: "Marathon game. Deep strategy with time for long-term investments to pay off.",
    details: [
      "32 rounds (~80-160 min)",
      "2 products (General + Budget), 37 staff, 6 machines, 1 factory",
      "Expand to 5 segments through R&D",
      "Full step-by-step tutorial",
    ],
    ...SHARED_START,
    tutorialDepth: "full",
  },
};

export const PRESET_LIST: GamePreset[] = [
  GAME_PRESETS.quick,
  GAME_PRESETS.standard,
  GAME_PRESETS.full,
];
