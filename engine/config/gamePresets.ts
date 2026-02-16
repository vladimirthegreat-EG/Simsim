/**
 * Game Presets - Define 3 game modes with different round counts,
 * starting states, and tutorial depth.
 *
 * Quick (16 rounds): Pre-built company, light tutorial
 * Standard (24 rounds): Pre-built company, medium tutorial
 * Full (32 rounds): Clean slate, full hand-holding tutorial
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

export const GAME_PRESETS: Record<string, GamePreset> = {
  quick: {
    id: "quick",
    name: "Quick Game",
    rounds: 16,
    description: "Jump right into a running company. Focus on strategy and optimization.",
    details: [
      "16 rounds (~40-80 min)",
      "Pre-built: 5 products, equipment, 63 staff",
      "All 5 market segments active",
      "Brief overview tutorial",
    ],
    startingCash: 175_000_000,
    startingWorkers: 50,
    startingEngineers: 8,
    startingSupervisors: 5,
    starterMachines: true,
    starterProducts: "all",
    startingSegments: 5,
    startingBrandValue: 0.5,
    tutorialDepth: "light",
    immediateFirstRound: true,
  },

  standard: {
    id: "standard",
    name: "Standard Game",
    rounds: 24,
    description: "Start with a small operation and grow into new segments.",
    details: [
      "24 rounds (~60-120 min)",
      "Starter company: 2 products, 26 staff",
      "General & Budget segments active",
      "Guided tutorial covering key mechanics",
    ],
    startingCash: 175_000_000,
    startingWorkers: 20,
    startingEngineers: 4,
    startingSupervisors: 2,
    starterMachines: true,
    starterProducts: "all",
    startingSegments: 2,
    startingBrandValue: 0.3,
    tutorialDepth: "medium",
    immediateFirstRound: true,
  },

  full: {
    id: "full",
    name: "Full Simulation",
    rounds: 32,
    description: "Build everything from scratch. Complete hand-holding tutorial walks you through every decision.",
    details: [
      "32 rounds (~80-160 min)",
      "Clean slate: no products, no equipment, no workers",
      "Full step-by-step tutorial",
      "Learn every game mechanic from the ground up",
    ],
    startingCash: 175_000_000,
    startingWorkers: 0,
    startingEngineers: 0,
    startingSupervisors: 0,
    starterMachines: false,
    starterProducts: "none",
    startingSegments: 0,
    startingBrandValue: 0,
    tutorialDepth: "full",
    immediateFirstRound: true,
  },
};

export const PRESET_LIST: GamePreset[] = [
  GAME_PRESETS.quick,
  GAME_PRESETS.standard,
  GAME_PRESETS.full,
];
