import { describe, it, expect } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";

describe("New Standardized Preset — All 3 modes identical start", () => {
  it("2 segments, 25W+5E+3S, brand 0.4 — profitable from round 1", () => {
    const state = SimulationEngine.createInitialTeamState(
      { cash: 175_000_000 },
      { workers: 25, engineers: 5, supervisors: 3, includeProducts: true, startingSegments: 2, brandValue: 0.4, starterMachines: true }
    );
    const state2 = SimulationEngine.createInitialTeamState(
      { cash: 175_000_000 },
      { workers: 25, engineers: 5, supervisors: 3, includeProducts: true, startingSegments: 2, brandValue: 0.4, starterMachines: true }
    );
    const market = SimulationEngine.createInitialMarketState();

    const output = SimulationEngine.processRound({
      roundNumber: 1,
      teams: [
        { id: "t1", state, decisions: {} },
        { id: "t2", state: state2, decisions: {} },
      ],
      marketState: market,
      matchSeed: "new-preset",
    });

    const r = (output.results[0] as any).newState;

    console.log("\n=== NEW STANDARDIZED PRESET (ALL 3 MODES) ===");
    console.log(`Staff: 25W + 5E + 3S = 33 total`);
    console.log(`Segments: 2 (General + Budget)`);
    console.log(`Brand: 0.4 (moderate — must invest to grow)`);
    console.log(`Revenue: $${(r.revenue / 1e6).toFixed(1)}M`);
    console.log(`Net Income: $${(r.netIncome / 1e6).toFixed(1)}M`);
    console.log(`Cash: $${(r.cash / 1e6).toFixed(1)}M (started $175M)`);
    console.log(`Profitable: ${r.netIncome > 0 ? '✅ YES' : '❌ NO'}`);
    for (const p of r.products || []) {
      console.log(`  ${p.segment}: sold=${p.unitsSold || 0} @ $${p.price} = $${((p.unitsSold || 0) * p.price / 1e6).toFixed(1)}M`);
    }

    expect(r.revenue).toBeGreaterThan(0);
    expect(r.netIncome).toBeGreaterThan(0);
    expect(r.cash).toBeGreaterThan(175_000_000); // Cash grew (profitable)
    expect(isFinite(r.cash)).toBe(true);
  });
});
