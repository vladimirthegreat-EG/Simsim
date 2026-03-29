import { describe, it } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import { MarketSimulator } from "@/engine/market/MarketSimulator";
import { CONSTANTS } from "@/engine/types";

describe("Capacity Check", () => {
  it("prints capacity numbers for review", () => {
    const state = SimulationEngine.createInitialTeamState(
      { cash: 175_000_000 },
      { workers: 40, engineers: 8, supervisors: 5, includeProducts: true, startingSegments: 5, brandValue: 0.5, starterMachines: true }
    );

    console.log("=== STARTING STATE ===");
    console.log("Workers:", state.employees.filter(e => e.role === "worker").length);
    console.log("Engineers:", state.employees.filter(e => e.role === "engineer").length);
    console.log("Factories:", state.factories.length);
    console.log("Production lines:", state.factories[0]?.productionLines?.length);
    console.log("Has machineryStates:", !!state.machineryStates);
    if (state.machineryStates) {
      for (const [fid, fm] of Object.entries(state.machineryStates)) {
        console.log(`  Factory ${fid}: ${(fm as any).machines.length} machines, totalCapacity=${(fm as any).totalCapacity}`);
      }
    }
    console.log("Products:", state.products?.length);

    console.log("\n=== PRODUCTION LINES ===");
    for (const line of state.factories[0]?.productionLines || []) {
      console.log(`  ${(line as any).id}: segment=${(line as any).segment}, status=${(line as any).status ?? 'UNDEFINED'}, capacity=${(line as any).capacity}`);
    }

    const segments = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"] as const;
    const demand: Record<string, number> = { Budget: 700000, General: 450000, Enthusiast: 150000, Professional: 80000, "Active Lifestyle": 200000 };

    console.log("\n=== CAPACITY vs DEMAND (4 teams, 25% share) ===");
    for (const seg of segments) {
      const capLegacy = MarketSimulator.getTeamProductionCapacity(state, seg);
      const capLines = MarketSimulator.getTeamProductionCapacityFromLines(state, seg);
      const demandPerTeam = Math.floor(demand[seg] / 4);
      console.log(`  ${seg.padEnd(18)} legacy=${String(capLegacy).padStart(8)} | fromLines=${String(capLines).padStart(8)} | demand/team=${String(demandPerTeam).padStart(8)} | util=${(Math.min(capLines, demandPerTeam) / demandPerTeam * 100).toFixed(0)}%`);
    }

    // Run actual round
    const state2 = SimulationEngine.createInitialTeamState(
      { cash: 175_000_000 },
      { workers: 40, engineers: 8, supervisors: 5, includeProducts: true, startingSegments: 5, brandValue: 0.5, starterMachines: true }
    );
    const marketState = SimulationEngine.createInitialMarketState();

    const output = SimulationEngine.processRound({
      roundNumber: 1,
      teams: [
        { id: "team-1", state, decisions: {} },
        { id: "team-2", state: state2, decisions: {} },
      ],
      marketState,
      matchSeed: "capacity-check",
    });

    console.log("\n=== ROUND 1 RESULTS (2 teams, no decisions) ===");
    for (const r of output.results) {
      console.log(`  ${r.teamId}: revenue=$${((r as any).newState.revenue / 1e6).toFixed(1)}M, cash=$${((r as any).newState.cash / 1e6).toFixed(1)}M`);
      for (const p of (r as any).newState.products || []) {
        console.log(`    ${p.segment}: sold=${p.unitsSold ?? 0}, price=$${p.price}`);
      }
    }
  });
});
