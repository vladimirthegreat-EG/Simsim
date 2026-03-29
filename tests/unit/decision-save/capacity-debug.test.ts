import { describe, it } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import { MarketSimulator } from "@/engine/market/MarketSimulator";
import { getFactoryBottleneckAnalysis, normalizeProductionLines, autoAssignMachinesToLines } from "@/engine/modules/ProductionLineManager";
import { cloneTeamState } from "@/engine/utils/stateUtils";

describe("Capacity Debug", () => {
  it("traces exactly what happens in capacity calculation", () => {
    const state = SimulationEngine.createInitialTeamState(
      { cash: 175_000_000 },
      { workers: 40, engineers: 8, supervisors: 5, includeProducts: true, startingSegments: 5, brandValue: 0.5, starterMachines: true }
    );

    // Simulate what processRound Step 0.5 does
    const cloned = cloneTeamState(state);
    normalizeProductionLines(cloned);
    autoAssignMachinesToLines(cloned);

    console.log("=== AFTER NORMALIZE + AUTO-ASSIGN ===");
    for (const line of cloned.factories[0]?.productionLines || []) {
      console.log(`  ${(line as any).id}: segment=${(line as any).segment}, status=${(line as any).status}, assignedMachines=${JSON.stringify((line as any).assignedMachines)}`);
    }

    // Try bottleneck analysis
    console.log("\n=== BOTTLENECK ANALYSIS ===");
    try {
      const analysis = getFactoryBottleneckAnalysis(cloned, cloned.factories[0].id);
      for (const [lineId, result] of Object.entries(analysis)) {
        const r = result as any;
        console.log(`  ${lineId}: projectedOutput=${r.projectedOutput}, machineCapacity=${r.machineCapacity}, workerCapacity=${r.workerCapacity}, bottleneck=${r.bottleneck}`);
      }
    } catch (e: any) {
      console.log("  ERROR:", e.message);
    }

    // Check fromLines for each segment
    console.log("\n=== fromLines per segment (on cloned state) ===");
    for (const seg of ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] as const) {
      const cap = MarketSimulator.getTeamProductionCapacityFromLines(cloned, seg);
      console.log(`  ${seg}: ${cap}`);
    }
  });
});
