import type { TeamState, Segment } from "@/engine/types";
import { CONSTANTS } from "@/engine/types";
import { MaterialEngine } from "@/engine/materials/MaterialEngine";

// ========== R&D LEVEL (0-4) ==========
const RD_TECH_LEVEL_MAP: Record<string, number> = {
  process_optimization: 1,
  advanced_manufacturing: 2,
  industry_4_0: 3,
  breakthrough_tech: 4,
};

export function getRdLevel(state: TeamState): number {
  if (!state.unlockedTechnologies?.length) return 0;
  let max = 0;
  for (const tech of state.unlockedTechnologies) {
    const level = RD_TECH_LEVEL_MAP[tech];
    if (level !== undefined && level > max) max = level;
  }
  return max;
}

export function getRdProgressToNextLevel(state: TeamState) {
  const currentLevel = getRdLevel(state);
  const levels = [
    { level: 1, key: "process_optimization", ...CONSTANTS.RD_TECH_TREE.process_optimization },
    { level: 2, key: "advanced_manufacturing", ...CONSTANTS.RD_TECH_TREE.advanced_manufacturing },
    { level: 3, key: "industry_4_0", ...CONSTANTS.RD_TECH_TREE.industry_4_0 },
    { level: 4, key: "breakthrough_tech", ...CONSTANTS.RD_TECH_TREE.breakthrough_tech },
  ];
  const next = levels.find((l) => l.level === currentLevel + 1);
  if (!next) return { currentLevel, nextLevel: null, pointsRequired: 0, pointsAccumulated: state.rdProgress, pointsRemaining: 0, estimatedRounds: null };
  const remaining = Math.max(0, next.rdPointsRequired - state.rdProgress);
  const ptsPerRound = state.rdBudget / CONSTANTS.RD_BUDGET_TO_POINTS_RATIO;
  return {
    currentLevel,
    nextLevel: next.level,
    pointsRequired: next.rdPointsRequired,
    pointsAccumulated: state.rdProgress,
    pointsRemaining: remaining,
    estimatedRounds: ptsPerRound > 0 ? Math.ceil(remaining / ptsPerRound) : null,
  };
}

// ========== ACTIVE SEGMENTS ==========
export function getActiveSegments(state: TeamState): Segment[] {
  const segs = new Set<Segment>();
  for (const p of state.products) {
    if (p.developmentStatus === "launched") segs.add(p.segment);
  }
  return [...segs];
}

export function getDevelopingSegments(state: TeamState): Segment[] {
  const segs = new Set<Segment>();
  for (const p of state.products) {
    if (p.developmentStatus !== "launched") segs.add(p.segment);
  }
  return [...segs];
}

// ========== MATERIAL QUALITY TIER (1-5) ==========
export function getMaterialQualityTier(state: TeamState): number {
  const active = getActiveSegments(state);
  if (active.length === 0) return 1;
  let maxTier = 1;
  for (const seg of active) {
    const req = MaterialEngine.SEGMENT_MATERIAL_REQUIREMENTS[seg];
    if (req && req.qualityTier > maxTier) maxTier = req.qualityTier;
  }
  return maxTier;
}

// ========== WORKFORCE ==========
export function getEmployeeCounts(state: TeamState) {
  let workers = 0,
    engineers = 0,
    supervisors = 0;
  for (const e of state.employees) {
    if (e.role === "worker") workers++;
    else if (e.role === "engineer") engineers++;
    else if (e.role === "supervisor") supervisors++;
  }
  return { workers, engineers, supervisors, total: workers + engineers + supervisors };
}

export function getWorkersRequired(state: TeamState): number {
  if (!state.machineryStates) return 0;
  let machines = 0;
  let automationReduction = 0;
  for (const fm of Object.values(state.machineryStates)) {
    for (const m of fm.machines) {
      if (m.status === "operational") {
        machines++;
        if (m.laborReduction) automationReduction += m.laborReduction;
      }
    }
  }
  const base = Math.ceil(machines * CONSTANTS.WORKERS_PER_MACHINE);
  return Math.max(1, Math.ceil(base * (1 - Math.min(automationReduction, 0.8))));
}

export function getEngineersRequired(state: TeamState): number {
  const factoryCount = state.factories.length;
  return factoryCount * CONSTANTS.ENGINEERS_PER_FACTORY;
}

export function getSupervisorsRequired(state: TeamState): number {
  const { workers, engineers } = getEmployeeCounts(state);
  return Math.ceil((workers + engineers) / CONSTANTS.WORKERS_PER_SUPERVISOR);
}

// ========== MACHINERY ==========
export function getOwnedMachineTypes(state: TeamState): string[] {
  if (!state.machineryStates) return [];
  const types = new Set<string>();
  for (const fm of Object.values(state.machineryStates)) {
    for (const m of fm.machines) types.add(m.type);
  }
  return [...types];
}

export function getFactoryUpgrades(state: TeamState): string[] {
  const upgrades: string[] = [];
  for (const f of state.factories) {
    if (f.upgrades) upgrades.push(...f.upgrades);
  }
  return [...new Set(upgrades)];
}
