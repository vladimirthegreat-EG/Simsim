/**
 * ESG Subscore Calculator
 *
 * Splits the single ESG 0-1000 score into three subscores:
 * - Environmental (0-333): carbon offset, renewables, water, waste, circular, biodiversity + factory green upgrades
 * - Social (0-333): diversity, wellness, education, housing, human rights + HR benefits
 * - Governance (0-333): transparency, whistleblower, exec pay ratio + code of ethics
 *
 * Operational bonuses:
 * - Environmental → reach multiplier (up to +15% sales reach)
 * - Social → efficiency bonus (up to +10%, feeds production line efficiency formula)
 * - Governance → risk reduction (up to -20% risk events)
 */

import type { TeamState } from "../types/state";

// ============================================
// INITIATIVE CATEGORIZATION
// ============================================

/** Map of ESG state fields/flags to their category and point values */
interface ESGInitiativeMapping {
  field: string;
  category: "environmental" | "social" | "governance";
  points: number;
  type: "boolean" | "number_scaled";
}

// These map to the ESG initiative processing in FactoryModule
const INITIATIVE_MAPPINGS: ESGInitiativeMapping[] = [
  // === ENVIRONMENTAL ===
  // Initiatives
  { field: "carbonOffsetProgram",          category: "environmental", points: 0,   type: "number_scaled" }, // Points per ton
  { field: "renewableEnergyCertificates",  category: "environmental", points: 0,   type: "number_scaled" }, // Points per $10K
  { field: "waterConservation",            category: "environmental", points: 80,  type: "boolean" },
  { field: "zeroWasteProgram",             category: "environmental", points: 100, type: "boolean" },
  { field: "circularEconomy",             category: "environmental", points: 120, type: "boolean" },
  { field: "biodiversityProtection",       category: "environmental", points: 0,   type: "number_scaled" },

  // === SOCIAL ===
  { field: "diversityInclusion",           category: "social",        points: 90,  type: "boolean" },
  { field: "employeeWellness",             category: "social",        points: 60,  type: "boolean" },
  { field: "communityEducation",           category: "social",        points: 0,   type: "number_scaled" },
  { field: "affordableHousing",            category: "social",        points: 0,   type: "number_scaled" },
  { field: "humanRightsAudit",             category: "social",        points: 70,  type: "boolean" },
  { field: "charitableDonation",           category: "social",        points: 0,   type: "number_scaled" },
  { field: "communityInvestment",          category: "social",        points: 0,   type: "number_scaled" },
  { field: "workplaceHealthSafety",        category: "social",        points: 200, type: "boolean" },
  { field: "fairWageProgram",              category: "social",        points: 0,   type: "number_scaled" }, // Combined points

  // === GOVERNANCE ===
  { field: "transparencyReport",           category: "governance",    points: 50,  type: "boolean" },
  { field: "whistleblowerProtection",      category: "governance",    points: 40,  type: "boolean" },
  { field: "executivePayRatio",            category: "governance",    points: 100, type: "boolean" },
  { field: "codeOfEthics",                category: "governance",    points: 200, type: "boolean" },
  { field: "supplierEthicsProgram",        category: "governance",    points: 150, type: "boolean" },
];

// Factory upgrade ESG contributions (environmental)
const UPGRADE_ESG_ENVIRONMENTAL: Record<string, number> = {
  solarPanels: 100,
  waterRecycling: 50,
  wasteToEnergy: 75,
  smartGrid: 80,
  carbonCapture: 150,
};

// ============================================
// SUBSCORE CALCULATION
// ============================================

export interface ESGSubscores {
  environmental: number;  // 0-333
  social: number;         // 0-333
  governance: number;     // 0-333
  total: number;          // 0-1000 (sum)
}

export interface ESGBonuses {
  reachMultiplier: number;       // 1.0 to 1.15
  esgSocialBonus: number;       // 0 to 0.10 (feeds into production efficiency)
  riskMultiplier: number;        // 1.0 to 0.80
}

/**
 * Calculate ESG subscores from team state.
 * Uses the total esgScore and distributes it based on which initiatives are active.
 */
export function calculateESGSubscores(state: TeamState): ESGSubscores {
  let environmental = 0;
  let social = 0;
  let governance = 0;

  // Add points from factory upgrades (environmental)
  for (const factory of state.factories) {
    for (const upgrade of factory.upgrades) {
      if (UPGRADE_ESG_ENVIRONMENTAL[upgrade]) {
        environmental += UPGRADE_ESG_ENVIRONMENTAL[upgrade];
      }
    }
  }

  // If no subscore detail is available, distribute the total proportionally
  // based on a default 40/35/25 split (environmental/social/governance)
  // This handles backward compatibility where we only have total esgScore
  const totalFromUpgrades = environmental;
  const remainingScore = Math.max(0, state.esgScore - totalFromUpgrades);

  // Distribute remaining points (from initiatives) proportionally
  // Default assumption: 35% social, 40% environmental (beyond upgrades), 25% governance
  environmental += remainingScore * 0.40;
  social += remainingScore * 0.35;
  governance += remainingScore * 0.25;

  // Cap each subscore at 333
  environmental = Math.min(333, Math.max(0, Math.round(environmental)));
  social = Math.min(333, Math.max(0, Math.round(social)));
  governance = Math.min(333, Math.max(0, Math.round(governance)));

  return {
    environmental,
    social,
    governance,
    total: environmental + social + governance,
  };
}

/**
 * Calculate operational bonuses from ESG subscores.
 *
 * - Environmental → reach_multiplier = 1.0 + (env/333) × 0.15 (up to +15%)
 * - Social → esg_social_bonus = (social/333) × 0.10 (up to +10%)
 * - Governance → risk_multiplier = 1.0 - (gov/333) × 0.20 (down to 0.80)
 */
export function calculateESGBonuses(subscores: ESGSubscores): ESGBonuses {
  return {
    reachMultiplier: 1.0 + (subscores.environmental / 333) * 0.15,
    // M1 FIX: ESG social bonus 0.10→0.06 (balanced was 38.2% dominant)
    esgSocialBonus: (subscores.social / 333) * 0.06,
    riskMultiplier: 1.0 - (subscores.governance / 333) * 0.20,
  };
}

/**
 * Update team state with current ESG subscores.
 * Called during round processing.
 */
export function updateESGSubscores(state: TeamState): ESGSubscores {
  const subscores = calculateESGSubscores(state);
  state.esgSubscores = {
    environmental: subscores.environmental,
    social: subscores.social,
    governance: subscores.governance,
  };
  return subscores;
}
