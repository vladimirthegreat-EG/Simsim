/**
 * Production Line Manager
 *
 * CRUD operations and validation for production lines within factories.
 * Each factory has a fixed number of line slots determined by its tier.
 * Lines can be assigned products, staffed with workers, and have target output set.
 */

import type { Factory, ProductionLine, Segment } from "../types/factory";
import type { TeamState } from "../types/state";
import type { EngineContext } from "../core/EngineContext";
import { isSharedMachineType } from "../machinery/types";
import type { Machine } from "../machinery/types";
import { CONSTANTS } from "../types";

// ============================================
// NORMALIZATION & AUTO-ASSIGNMENT
// ============================================

/**
 * Normalize legacy production lines to the full interface.
 * Fills missing fields so calculateLineOutput() works correctly.
 * Call at start of processRound() for each team.
 */
export function normalizeProductionLines(state: TeamState): void {
  for (const factory of state.factories) {
    if (!factory.productionLines) factory.productionLines = [];

    const activeLines = factory.productionLines.filter(l => l.productId != null);
    const lineCount = Math.max(1, activeLines.length);

    for (const line of factory.productionLines) {
      // Fill missing required fields
      if (!line.factoryId) line.factoryId = factory.id;
      if (line.assignedMachines === undefined) line.assignedMachines = [];
      if (line.status === undefined) line.status = line.productId ? "active" : "idle";
      if (line.changeoverRoundsRemaining === undefined) line.changeoverRoundsRemaining = 0;
      if (line.segment === undefined) line.segment = null;

      // Default target output: split factory capacity evenly across active lines
      if (line.targetOutput === undefined || line.targetOutput === 0) {
        if (line.productId && line.status === "active") {
          line.targetOutput = Math.floor((factory.baseCapacity || 25000) / lineCount);
        }
      }

      // Auto-scale targetOutput to match machine capacity (prevents wasted capacity)
      if (line.status === "active" && line.productId && line.assignedMachines.length > 0) {
        const lineMachineCap = getLineMachineCapacity(state, line.id);
        if (lineMachineCap > 0 && lineMachineCap > line.targetOutput) {
          line.targetOutput = lineMachineCap;
        }
      }

      // Default staffing: distribute factory workers evenly across active lines
      if (line.assignedWorkers === undefined || line.assignedWorkers === 0) {
        if (line.productId && line.status === "active") {
          line.assignedWorkers = Math.floor((factory.workers || 0) / lineCount);
          line.assignedEngineers = Math.floor((factory.engineers || 0) / lineCount);
          line.assignedSupervisors = Math.floor((factory.supervisors || 0) / lineCount);
        }
      }
    }
  }
}

/**
 * Auto-assign unassigned line-locked machines to active production lines.
 * Shared machines (packaging, scanner, testing_rig, conveyor, forklift) stay factory-wide.
 * Distributes machines round-robin across lines that have no machines assigned.
 */
export function autoAssignMachinesToLines(state: TeamState): void {
  for (const factory of state.factories) {
    const machines = getFactoryMachines(state, factory.id);
    if (machines.length === 0) continue;

    const activeLines = factory.productionLines.filter(
      l => l.status === "active" && l.productId != null
    );
    if (activeLines.length === 0) continue;

    // Find unassigned line-locked machines
    const unassigned = machines.filter(
      m => !isSharedMachineType(m.type) && (!m.assignedLineId || m.assignedLineId === null)
    );
    if (unassigned.length === 0) continue;

    // Assign to the line with fewest machines (balanced distribution, respects hard cap)
    for (const machine of unassigned) {
      // Find line with fewest machines that isn't at cap
      const eligible = activeLines.filter(l => l.assignedMachines.length < MAX_MACHINES_PER_LINE);
      if (eligible.length === 0) break;

      eligible.sort((a, b) => a.assignedMachines.length - b.assignedMachines.length);
      const targetLine = eligible[0];
      machine.assignedLineId = targetLine.id;
      if (!targetLine.assignedMachines.includes(machine.id)) {
        targetLine.assignedMachines.push(machine.id);
      }
    }
  }
}

// ============================================
// QUERIES
// ============================================

/** Get all production lines for a factory */
export function getFactoryLines(factory: Factory): ProductionLine[] {
  return factory.productionLines;
}

/** Get a specific line by ID across all factories */
export function getLineById(state: TeamState, lineId: string): ProductionLine | undefined {
  for (const factory of state.factories) {
    const line = factory.productionLines.find(l => l.id === lineId);
    if (line) return line;
  }
  return undefined;
}

/** Get the factory that contains a line */
export function getFactoryForLine(state: TeamState, lineId: string): Factory | undefined {
  return state.factories.find(f => f.productionLines.some(l => l.id === lineId));
}

/** Get all active lines (producing output) */
export function getActiveLines(factory: Factory): ProductionLine[] {
  return factory.productionLines.filter(l => l.status === "active" && l.productId != null);
}

/** Get all idle lines (available for assignment) */
export function getIdleLines(factory: Factory): ProductionLine[] {
  return factory.productionLines.filter(l => l.status === "idle");
}

/** Get lines in changeover */
export function getChangeoverLines(factory: Factory): ProductionLine[] {
  return factory.productionLines.filter(l => l.status === "changeover");
}

/** Check if a product is already assigned to any line in the same factory */
export function isProductAssignedInFactory(factory: Factory, productId: string): boolean {
  return factory.productionLines.some(l => l.productId === productId && l.status !== "idle");
}

// ============================================
// MUTATIONS
// ============================================

export interface LineOperationResult {
  success: boolean;
  message: string;
  cost?: number;
}

/**
 * Assign a product to a production line.
 * - If line is idle: free and instant, sets status to "active"
 * - If line has a different product: triggers changeover (cost + 1 round downtime)
 * - If line already has this product: no-op
 */
export function assignProductToLine(
  state: TeamState,
  lineId: string,
  productId: string,
  segment: Segment,
  ctx?: EngineContext
): LineOperationResult {
  const factory = getFactoryForLine(state, lineId);
  if (!factory) {
    return { success: false, message: `Line ${lineId} not found in any factory` };
  }

  const line = factory.productionLines.find(l => l.id === lineId);
  if (!line) {
    return { success: false, message: `Line ${lineId} not found` };
  }

  // Already assigned to this product — no-op
  if (line.productId === productId) {
    return { success: true, message: "Product already assigned to this line" };
  }

  // Check if product is already on another line in this factory
  if (isProductAssignedInFactory(factory, productId)) {
    return { success: false, message: `Product ${productId} already assigned to another line in this factory` };
  }

  // Idle line → free and instant assignment
  if (line.status === "idle" || line.productId == null) {
    line.productId = productId;
    line.segment = segment;
    line.status = "active";
    line.changeoverRoundsRemaining = 0;
    return { success: true, message: `Product assigned to line (instant, free)` };
  }

  // Active line with different product → changeover
  const lockedMachineCount = line.assignedMachines.length;
  const baseCost = 2_000_000;
  const perMachineCost = 500_000;
  let changeoverCost = baseCost + (perMachineCost * lockedMachineCount);
  let changeoverTime = 1;

  // Check for upgrades that reduce changeover
  const hasFlexible = factory.upgrades.includes("flexibleManufacturing");
  const hasModular = factory.upgrades.includes("modularLines");

  if (hasFlexible) {
    changeoverCost *= 0.5;
    changeoverTime = 0; // Instant changeover
  }
  if (hasModular) {
    changeoverCost *= 0.5;
  }

  // Check funds
  if (state.cash < changeoverCost) {
    return { success: false, message: `Insufficient funds for changeover ($${(changeoverCost / 1_000_000).toFixed(1)}M required)` };
  }

  // Apply changeover
  state.cash -= changeoverCost;
  line.productId = productId;
  line.segment = segment;

  if (changeoverTime === 0) {
    line.status = "active";
    line.changeoverRoundsRemaining = 0;
  } else {
    line.status = "changeover";
    line.changeoverRoundsRemaining = changeoverTime;
  }

  return {
    success: true,
    message: `Changeover initiated ($${(changeoverCost / 1_000_000).toFixed(1)}M, ${changeoverTime} round${changeoverTime !== 1 ? "s" : ""} downtime)`,
    cost: changeoverCost,
  };
}

/**
 * Set target output for a production line.
 * Capped at factory base capacity (total across all lines).
 */
export function setLineTarget(
  state: TeamState,
  lineId: string,
  targetOutput: number
): LineOperationResult {
  const factory = getFactoryForLine(state, lineId);
  if (!factory) {
    return { success: false, message: `Line ${lineId} not found` };
  }

  const line = factory.productionLines.find(l => l.id === lineId);
  if (!line) {
    return { success: false, message: `Line ${lineId} not found` };
  }

  if (targetOutput < 0) {
    return { success: false, message: "Target output cannot be negative" };
  }

  // Check total target across all lines doesn't exceed factory capacity
  const otherLinesTarget = factory.productionLines
    .filter(l => l.id !== lineId)
    .reduce((sum, l) => sum + l.targetOutput, 0);

  const totalTarget = otherLinesTarget + targetOutput;
  if (totalTarget > factory.baseCapacity) {
    const maxForThisLine = factory.baseCapacity - otherLinesTarget;
    return {
      success: false,
      message: `Total target (${totalTarget}) exceeds factory capacity (${factory.baseCapacity}). Max for this line: ${maxForThisLine}`,
    };
  }

  line.targetOutput = targetOutput;
  return { success: true, message: `Target output set to ${targetOutput}` };
}

/**
 * Assign staff to a production line.
 * Workers can only be on one line at a time.
 */
export function setLineStaffing(
  state: TeamState,
  lineId: string,
  workers: number,
  engineers: number,
  supervisors: number
): LineOperationResult {
  const factory = getFactoryForLine(state, lineId);
  if (!factory) {
    return { success: false, message: `Line ${lineId} not found` };
  }

  const line = factory.productionLines.find(l => l.id === lineId);
  if (!line) {
    return { success: false, message: `Line ${lineId} not found` };
  }

  if (workers < 0 || engineers < 0 || supervisors < 0) {
    return { success: false, message: "Staff counts cannot be negative" };
  }

  // Check total staff doesn't exceed factory headcount
  const otherLinesStaff = factory.productionLines
    .filter(l => l.id !== lineId)
    .reduce((acc, l) => ({
      workers: acc.workers + l.assignedWorkers,
      engineers: acc.engineers + l.assignedEngineers,
      supervisors: acc.supervisors + l.assignedSupervisors,
    }), { workers: 0, engineers: 0, supervisors: 0 });

  if (otherLinesStaff.workers + workers > factory.workers) {
    return { success: false, message: `Not enough workers (${factory.workers} total, ${otherLinesStaff.workers} already assigned)` };
  }
  if (otherLinesStaff.engineers + engineers > factory.engineers) {
    return { success: false, message: `Not enough engineers (${factory.engineers} total, ${otherLinesStaff.engineers} already assigned)` };
  }
  if (otherLinesStaff.supervisors + supervisors > factory.supervisors) {
    return { success: false, message: `Not enough supervisors (${factory.supervisors} total, ${otherLinesStaff.supervisors} already assigned)` };
  }

  line.assignedWorkers = workers;
  line.assignedEngineers = engineers;
  line.assignedSupervisors = supervisors;

  return { success: true, message: `Staffing set: ${workers}W / ${engineers}E / ${supervisors}S` };
}

// ============================================
// MACHINE ASSIGNMENT
// ============================================

/** Get all machines in a factory from the machinery state */
function getFactoryMachines(state: TeamState, factoryId: string): Machine[] {
  const fms = state.machineryStates?.[factoryId];
  return fms?.machines ?? [];
}

/**
 * Assign a line-locked machine to a production line.
 * - Shared machines cannot be assigned to lines (they serve all lines).
 * - A machine can only be on one line at a time.
 * - Machine must be in the same factory as the line.
 */
export function assignMachineToLine(
  state: TeamState,
  machineId: string,
  lineId: string
): LineOperationResult {
  // Find the factory and line
  const factory = getFactoryForLine(state, lineId);
  if (!factory) {
    return { success: false, message: `Line ${lineId} not found` };
  }

  const line = factory.productionLines.find(l => l.id === lineId);
  if (!line) {
    return { success: false, message: `Line ${lineId} not found` };
  }

  // Find the machine
  const machines = getFactoryMachines(state, factory.id);
  const machine = machines.find(m => m.id === machineId);
  if (!machine) {
    return { success: false, message: `Machine ${machineId} not found in factory ${factory.id}` };
  }

  // Shared machines cannot be assigned to lines
  if (isSharedMachineType(machine.type)) {
    return { success: false, message: `${machine.name} is a shared machine and serves all lines automatically` };
  }

  // Check if already assigned to another line
  if (machine.assignedLineId && machine.assignedLineId !== lineId) {
    return { success: false, message: `Machine ${machine.name} is already assigned to line ${machine.assignedLineId}` };
  }

  // Already assigned to this line
  if (machine.assignedLineId === lineId) {
    return { success: true, message: `Machine already assigned to this line` };
  }

  // Per-line machine hard cap
  if (line.assignedMachines.length >= MAX_MACHINES_PER_LINE) {
    return { success: false, message: `Line already has ${MAX_MACHINES_PER_LINE} machines (max). Remove a machine first.` };
  }

  // Assign
  machine.assignedLineId = lineId;
  if (!line.assignedMachines.includes(machineId)) {
    line.assignedMachines.push(machineId);
  }

  return { success: true, message: `${machine.name} assigned to line` };
}

/**
 * Unassign a machine from a production line.
 */
export function unassignMachineFromLine(
  state: TeamState,
  machineId: string,
  lineId: string
): LineOperationResult {
  const factory = getFactoryForLine(state, lineId);
  if (!factory) {
    return { success: false, message: `Line ${lineId} not found` };
  }

  const line = factory.productionLines.find(l => l.id === lineId);
  if (!line) {
    return { success: false, message: `Line ${lineId} not found` };
  }

  const machines = getFactoryMachines(state, factory.id);
  const machine = machines.find(m => m.id === machineId);
  if (machine) {
    machine.assignedLineId = null;
  }

  line.assignedMachines = line.assignedMachines.filter(id => id !== machineId);

  return { success: true, message: `Machine unassigned from line` };
}

/**
 * Per-line machine soft cap.
 * First MAX_FULL_EFFICIENCY_MACHINES get full capacity.
 * Each additional machine gets diminishing returns.
 */
const MAX_FULL_EFFICIENCY_MACHINES = 6;
const DIMINISHING_RETURNS = [0.75, 0.55, 0.40, 0.30, 0.20]; // 7th, 8th, 9th, 10th, 11th+ machine
const MAX_MACHINES_PER_LINE = 10; // Hard cap — prevents unlimited stacking

/**
 * Get the total capacity of line-locked machines assigned to a specific line.
 * Applies diminishing returns beyond MAX_FULL_EFFICIENCY_MACHINES (soft cap).
 * Also applies factory.capacityMultiplier from upgrades (e.g. advancedRobotics +50%).
 */
export function getLineMachineCapacity(state: TeamState, lineId: string): number {
  const factory = getFactoryForLine(state, lineId);
  if (!factory) return 0;

  const machines = getFactoryMachines(state, factory.id);
  const lineMachines = machines
    .filter(m => m.assignedLineId === lineId && !isSharedMachineType(m.type))
    .sort((a, b) => b.capacityUnits - a.capacityUnits); // Highest capacity first (full value)

  let totalCapacity = 0;
  for (let i = 0; i < lineMachines.length; i++) {
    const baseCap = lineMachines[i].capacityUnits;
    if (i < MAX_FULL_EFFICIENCY_MACHINES) {
      totalCapacity += baseCap; // Full capacity
    } else {
      const dimIdx = Math.min(i - MAX_FULL_EFFICIENCY_MACHINES, DIMINISHING_RETURNS.length - 1);
      totalCapacity += Math.floor(baseCap * DIMINISHING_RETURNS[dimIdx]);
    }
  }

  // Apply factory capacityMultiplier (from advancedRobotics upgrade: +50%)
  const capMultiplier = factory.capacityMultiplier ?? 1.0;
  return Math.floor(totalCapacity * capMultiplier);
}

/**
 * Get the total labor reduction from line-locked machines on a specific line.
 * Compounds: (1 - product of (1 - each reduction))
 */
export function getLineMachineLaborReduction(state: TeamState, lineId: string): number {
  const factory = getFactoryForLine(state, lineId);
  if (!factory) return 0;

  const machines = getFactoryMachines(state, factory.id);
  const lineMachines = machines.filter(m => m.assignedLineId === lineId && !isSharedMachineType(m.type));

  let retained = 1.0;
  for (const m of lineMachines) {
    const lr = (m as any).laborReduction ?? 0;
    if (lr > 0) retained *= (1 - lr);
  }

  // Also add factory-level labor reduction (from advancedRobotics upgrade)
  const factoryLR = factory.laborReduction ?? 0;
  if (factoryLR > 0) retained *= (1 - factoryLR);

  return Math.min(0.85, 1 - retained); // Cap at 85% reduction
}

/**
 * Get the total defect rate reduction from machines on a line.
 */
export function getLineMachineDefectReduction(state: TeamState, lineId: string): number {
  const factory = getFactoryForLine(state, lineId);
  if (!factory) return 0;

  const machines = getFactoryMachines(state, factory.id);
  // Include both line-locked and shared machines for defect reduction
  const relevantMachines = machines.filter(
    m => m.assignedLineId === lineId || isSharedMachineType(m.type)
  );

  let totalReduction = 0;
  for (const m of relevantMachines) {
    totalReduction += Math.abs(m.defectRateImpact ?? 0);
  }

  return Math.min(0.05, totalReduction); // Cap at 5% absolute reduction
}

/**
 * Get the total capacity of shared machines in a factory.
 * This capacity is shared across all active lines.
 */
export function getSharedMachineCapacity(state: TeamState, factoryId: string): number {
  const machines = getFactoryMachines(state, factoryId);
  return machines
    .filter(m => isSharedMachineType(m.type))
    .reduce((sum, m) => sum + m.capacityUnits, 0);
}

/**
 * Scale line outputs proportionally if total exceeds shared machine capacity.
 * Returns a map of lineId → scale factor (0 to 1).
 */
export function calculateSharedBottleneckScaling(
  state: TeamState,
  factoryId: string
): Record<string, number> {
  const factory = state.factories.find(f => f.id === factoryId);
  if (!factory) return {};

  const sharedCapacity = getSharedMachineCapacity(state, factoryId);
  if (sharedCapacity === 0) {
    // No shared machines — no bottleneck (shared machines are optional, not required)
    const scales: Record<string, number> = {};
    for (const line of factory.productionLines) {
      scales[line.id] = 1.0;
    }
    return scales;
  }

  // Sum machine capacity (not target!) across active lines — this is what actually needs shared processing
  const activeLines = factory.productionLines.filter(l => l.status === "active" && l.productId != null);
  let totalLineCapacity = 0;
  for (const line of activeLines) {
    const lineCap = getLineMachineCapacity(state, line.id);
    totalLineCapacity += lineCap > 0 ? Math.min(lineCap, line.targetOutput) : line.targetOutput;
  }

  const scales: Record<string, number> = {};
  if (totalLineCapacity <= sharedCapacity) {
    // Shared machines can handle all production — no bottleneck
    for (const line of factory.productionLines) {
      scales[line.id] = 1.0;
    }
  } else {
    // Shared machines are a bottleneck — scale proportionally
    // But floor at 0.5 (shared machines slow things down, don't shut them down)
    const scaleFactor = Math.max(0.5, sharedCapacity / totalLineCapacity);
    for (const line of factory.productionLines) {
      scales[line.id] = scaleFactor;
    }
  }

  return scales;
}

// ============================================
// OUTPUT FORMULA & BOTTLENECK ANALYSIS
// ============================================

export interface WorkerRequirements {
  requiredWorkers: number;
  requiredEngineers: number;
  requiredSupervisors: number;
}

/**
 * Calculate worker/engineer/supervisor requirements for a production line.
 *
 * Capsim/BSG aligned:
 * - requiredWorkers based on machine capacity (not target output) — you need workers to run machines
 * - laborReduction from machines + upgrades reduces workers needed
 * - 1 engineer per 3 machines, 1 supervisor per 15 total staff
 */
export function getLineWorkerRequirements(
  line: ProductionLine,
  avgWorkerEfficiency: number = 80,
  machineCapacity: number = 0,
  laborReduction: number = 0
): WorkerRequirements {
  const eff = Math.max(1, avgWorkerEfficiency);
  const machineCount = line.assignedMachines.length;

  // Component 1: Machine operators — each machine needs workers to run it
  // 2 base operators per machine, reduced by automation (laborReduction)
  const operatorsNeeded = Math.ceil(machineCount * 2 * (1 - laborReduction));

  // Component 2: Capacity-based — output volume needs workers
  const capacityBasis = machineCapacity > 0 ? machineCapacity : line.targetOutput;
  const capacityWorkers = Math.ceil(capacityBasis / (CONSTANTS.BASE_WORKER_OUTPUT * (eff / 100)));

  // Workers needed = higher of machine operators vs capacity demand
  const requiredWorkers = Math.max(1, Math.max(operatorsNeeded, capacityWorkers));

  const requiredEngineers = Math.ceil(machineCount / 3);
  const totalStaff = line.assignedWorkers + line.assignedEngineers + line.assignedSupervisors;
  const requiredSupervisors = Math.ceil(Math.max(totalStaff, requiredWorkers + requiredEngineers) / 15);
  return { requiredWorkers, requiredEngineers, requiredSupervisors };
}

/** Calculate understaffing penalty ratio (0 = shutdown, 1 = full output) */
export function getUnderstaffingRatio(assigned: number, required: number): number {
  if (required === 0) return 1.0;
  const ratio = assigned / required;
  if (ratio >= 1.0) return 1.0;
  if (ratio < 0.5) return 0; // Line shuts down
  if (ratio < 0.8) return ratio * 0.85; // Compounding stress penalty
  return ratio; // Linear degradation 0.8-0.99
}

export interface BottleneckResult {
  bottleneck: "machines" | "workers" | "engineers" | "shared_machines" | "materials" | "target" | "none";
  details: string;
  projectedOutput: number;
  machineCapacity: number;
  workerCapacity: number;
  staffingRatio: number;
  engineerRatio: number;
  sharedScale: number;
  efficiency: number;
}

/**
 * Calculate per-line output and identify bottleneck.
 *
 * Capsim/BSG aligned formula:
 *   output = min(machine_capacity, target_output)
 *          × staffingRatio
 *          × efficiency × (1 + bonuses)
 *          × sharedScale
 *          × (1 - defectRate)
 *
 * Where:
 *   machine_capacity = SUM(machine.capacityUnits) × capacityMultiplier × diminishing returns
 *   staffingRatio    = f(assigned_workers / required_workers) with laborReduction applied
 *   efficiency       = factory.efficiency + continuousImprovementBonus
 *   defectRate       = factory.defectRate - machine defect reductions
 */
export function calculateLineOutput(
  state: TeamState,
  line: ProductionLine,
  factoryEfficiency: number = 0.8,
  bonuses: {
    trainingBonus?: number;
    rdBonus?: number;
    modernizationBonus?: number;
    esgSocialBonus?: number;
  } = {},
  sharedScale: number = 1.0,
  avgWorkerEfficiency: number = 80,
  avgWorkerSpeed: number = 80
): BottleneckResult {
  if (line.status !== "active" || line.productId == null) {
    return {
      bottleneck: "none",
      details: line.status === "changeover" ? "Line in changeover" : "Line idle",
      projectedOutput: 0,
      machineCapacity: 0,
      workerCapacity: 0,
      staffingRatio: 0,
      engineerRatio: 0,
      sharedScale,
      efficiency: 0,
    };
  }

  const factory = getFactoryForLine(state, line.id);

  // ── Machine capacity (with capacityMultiplier + diminishing returns) ──
  const machineCapacity = getLineMachineCapacity(state, line.id);

  // ── Labor reduction from machines + factory upgrades (compounds) ──
  const laborReduction = getLineMachineLaborReduction(state, line.id);

  // ── Worker requirements (Capsim: based on machine capacity, reduced by automation) ──
  const requirements = getLineWorkerRequirements(line, avgWorkerEfficiency, machineCapacity, laborReduction);
  const workerCapacity = line.assignedWorkers * CONSTANTS.BASE_WORKER_OUTPUT * (avgWorkerEfficiency / 100) * (avgWorkerSpeed / 100);
  const staffingRatio = getUnderstaffingRatio(line.assignedWorkers, requirements.requiredWorkers);

  // ── Engineer ratio ──
  const engineerRatio = requirements.requiredEngineers > 0
    ? Math.min(1.0, line.assignedEngineers / requirements.requiredEngineers)
    : 1.0;

  // ── Efficiency: factory base + continuousImprovement + bonuses ──
  const ciBonus = factory?.continuousImprovementBonus ?? 0;
  const baseEfficiency = Math.min(1.0, factoryEfficiency + ciBonus);
  const bonusMultiplier = 1.0
    + (bonuses.trainingBonus ?? 0)
    + (bonuses.rdBonus ?? 0)
    + (bonuses.modernizationBonus ?? 0)
    + (bonuses.esgSocialBonus ?? 0);
  const efficiency = baseEfficiency * bonusMultiplier;

  // ── Defect rate (factory base - machine reductions) ──
  const baseDefectRate = factory?.defectRate ?? CONSTANTS.BASE_DEFECT_RATE;
  const machineDefectReduction = getLineMachineDefectReduction(state, line.id);
  const effectiveDefectRate = Math.max(0.005, baseDefectRate - machineDefectReduction);
  const qualityYield = 1 - effectiveDefectRate; // Good units ratio

  // ── Raw capacity = min(machine_capacity, target_output) — Capsim pattern ──
  const rawCapacity = Math.min(
    machineCapacity > 0 ? machineCapacity : Infinity,
    line.targetOutput
  );

  // 2A FIX: Material availability constraint — production limited by inventory
  let materialCapacity = Infinity;
  const lineSegment = (line as any).segment as string | undefined;
  if (state.materials?.inventory?.length > 0 && lineSegment) {
    try {
      const { MaterialEngine } = require("../materials/MaterialEngine");
      const avail = MaterialEngine.checkMaterialAvailability(
        lineSegment, Math.floor(rawCapacity), state.materials.inventory
      );
      if (!avail.available && avail.missing.length > 0) {
        materialCapacity = Math.min(...avail.missing.map((m: any) => m.have as number));
      }
    } catch {
      // MaterialEngine not available — skip constraint
    }
  }
  const constrainedCapacity = Math.min(rawCapacity, materialCapacity);

  // ── Final output ──
  let projectedOutput = constrainedCapacity * staffingRatio * efficiency * sharedScale * qualityYield;

  if (staffingRatio === 0) {
    projectedOutput = 0;
  }

  // ── Bottleneck identification ──
  let bottleneck: BottleneckResult["bottleneck"] = "none";
  let details = "No bottleneck";

  if (staffingRatio === 0) {
    bottleneck = "workers";
    details = `Line shutdown: only ${line.assignedWorkers}/${requirements.requiredWorkers} workers (< 50% staffed)`;
  } else if (staffingRatio < 1.0) {
    bottleneck = "workers";
    details = `Understaffed: ${line.assignedWorkers}/${requirements.requiredWorkers} workers (${Math.floor(staffingRatio * 100)}% — output reduced by ${Math.floor((1 - staffingRatio) * 100)}%)`;
  } else if (materialCapacity < rawCapacity && materialCapacity < Infinity) {
    bottleneck = "materials";
    details = `Material shortage: only ${materialCapacity.toLocaleString()} units of materials available — order more on Supply Chain page`;
  } else if (machineCapacity > 0 && machineCapacity <= line.targetOutput) {
    bottleneck = "machines";
    details = `Machine capacity (${machineCapacity.toLocaleString()}) is the limiting factor — buy more machines`;
  } else if (sharedScale < 1.0) {
    bottleneck = "shared_machines";
    details = `Shared machines at ${Math.floor(sharedScale * 100)}% capacity — scaling all lines`;
  } else if (engineerRatio < 1.0) {
    bottleneck = "engineers";
    details = `Only ${line.assignedEngineers}/${requirements.requiredEngineers} engineers — increased breakdown/defect risk`;
  } else {
    bottleneck = "target";
    details = `Output matches target (${line.targetOutput.toLocaleString()})`;
  }

  return {
    bottleneck,
    details,
    projectedOutput: Math.floor(Math.max(0, projectedOutput)),
    machineCapacity,
    workerCapacity: Math.floor(workerCapacity),
    staffingRatio,
    engineerRatio,
    sharedScale,
    efficiency,
  };
}

/**
 * Get bottleneck analysis for all lines in a factory.
 */
export function getFactoryBottleneckAnalysis(
  state: TeamState,
  factoryId: string,
  bonuses: {
    trainingBonus?: number;
    rdBonus?: number;
    modernizationBonus?: number;
    esgSocialBonus?: number;
  } = {}
): Record<string, BottleneckResult> {
  const factory = state.factories.find(f => f.id === factoryId);
  if (!factory) return {};

  const sharedScales = calculateSharedBottleneckScaling(state, factoryId);
  const results: Record<string, BottleneckResult> = {};

  for (const line of factory.productionLines) {
    results[line.id] = calculateLineOutput(
      state,
      line,
      factory.efficiency,
      bonuses,
      sharedScales[line.id] ?? 1.0
    );
  }

  return results;
}

// ============================================
// ROUND PROCESSING
// ============================================

/**
 * Process changeover countdowns at start of round.
 * Lines that complete changeover become active.
 */
export function processChangeoverCountdowns(factory: Factory): string[] {
  const messages: string[] = [];

  for (const line of factory.productionLines) {
    if (line.status === "changeover") {
      line.changeoverRoundsRemaining--;
      if (line.changeoverRoundsRemaining <= 0) {
        line.status = "active";
        line.changeoverRoundsRemaining = 0;
        messages.push(`Line ${line.id}: Changeover complete, now producing ${line.productId}`);
      } else {
        messages.push(`Line ${line.id}: Changeover in progress (${line.changeoverRoundsRemaining} round(s) remaining)`);
      }
    }
  }

  return messages;
}

/**
 * Process production line decisions from player input.
 */
export function processProductionLineDecisions(
  state: TeamState,
  decisions: {
    assignments?: { lineId: string; productId: string; segment?: Segment }[];
    targets?: { lineId: string; targetOutput: number }[];
    staffing?: { lineId: string; workers: number; engineers: number; supervisors: number }[];
    machineAssignments?: { machineId: string; lineId: string }[];
  },
  ctx?: EngineContext
): { messages: string[]; totalCost: number } {
  const messages: string[] = [];
  let totalCost = 0;

  // Process product assignments
  if (decisions.assignments) {
    for (const { lineId, productId, segment } of decisions.assignments) {
      const product = state.products.find(p => p.id === productId);
      const seg = segment || product?.segment || null;
      if (!seg) {
        messages.push(`Cannot assign product ${productId}: segment unknown`);
        continue;
      }
      const result = assignProductToLine(state, lineId, productId, seg, ctx);
      messages.push(result.message);
      if (result.cost) totalCost += result.cost;
    }
  }

  // Process machine assignments
  if (decisions.machineAssignments) {
    for (const { machineId, lineId } of decisions.machineAssignments) {
      const result = assignMachineToLine(state, machineId, lineId);
      messages.push(result.message);
    }
  }

  // Process targets
  if (decisions.targets) {
    for (const { lineId, targetOutput } of decisions.targets) {
      const result = setLineTarget(state, lineId, targetOutput);
      messages.push(result.message);
    }
  }

  // Process staffing
  if (decisions.staffing) {
    for (const { lineId, workers, engineers, supervisors } of decisions.staffing) {
      const result = setLineStaffing(state, lineId, workers, engineers, supervisors);
      messages.push(result.message);
    }
  }

  return { messages, totalCost };
}
