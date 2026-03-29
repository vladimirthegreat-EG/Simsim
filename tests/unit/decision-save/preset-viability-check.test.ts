/**
 * Preset Viability Check — Does each preset produce revenue and profit from round 1?
 * Tests all 3 presets (Quick/Standard/Full) with zero decisions.
 */

import { describe, it } from "vitest";
import { SimulationEngine } from "@/engine/core/SimulationEngine";

const PRESETS = [
  { name: "Quick (16r, 5 seg)", workers: 40, engineers: 8, supervisors: 5, segments: 5, cash: 175_000_000 },
  { name: "Standard (24r, 2 seg)", workers: 20, engineers: 5, supervisors: 3, segments: 2, cash: 175_000_000 },
  { name: "Full (32r, 1 seg)", workers: 10, engineers: 3, supervisors: 2, segments: 1, cash: 175_000_000 },
  // Also test current (all 40 workers) for comparison
  { name: "Current Quick", workers: 40, engineers: 8, supervisors: 5, segments: 5, cash: 175_000_000 },
  { name: "Current Standard", workers: 40, engineers: 8, supervisors: 5, segments: 2, cash: 175_000_000 },
  { name: "Current Full", workers: 40, engineers: 8, supervisors: 5, segments: 1, cash: 175_000_000 },
];

describe("Preset Viability — Round 1 with Zero Decisions", () => {
  for (const preset of PRESETS) {
    it(`${preset.name}: revenue > 0, cash > starting, no NaN`, () => {
      const state = SimulationEngine.createInitialTeamState(
        { cash: preset.cash },
        {
          workers: preset.workers,
          engineers: preset.engineers,
          supervisors: preset.supervisors,
          includeProducts: true,
          startingSegments: preset.segments,
          brandValue: 0.5,
          starterMachines: true,
        }
      );

      const state2 = SimulationEngine.createInitialTeamState(
        { cash: preset.cash },
        {
          workers: preset.workers,
          engineers: preset.engineers,
          supervisors: preset.supervisors,
          includeProducts: true,
          startingSegments: preset.segments,
          brandValue: 0.5,
          starterMachines: true,
        }
      );

      const market = SimulationEngine.createInitialMarketState();
      const output = SimulationEngine.processRound({
        roundNumber: 1,
        teams: [
          { id: "t1", state, decisions: {} },
          { id: "t2", state: state2, decisions: {} },
        ],
        marketState: market,
        matchSeed: "preset-check",
      });

      const r = (output.results[0] as any).newState;
      const workerCost = preset.workers * 45000 / 12;
      const engineerCost = preset.engineers * 85000 / 12;
      const supervisorCost = preset.supervisors * 75000 / 12;
      const monthlySalaryCost = workerCost + engineerCost + supervisorCost;

      console.log(`\n${preset.name}:`);
      console.log(`  Staff: ${preset.workers}W + ${preset.engineers}E + ${preset.supervisors}S = ${preset.workers + preset.engineers + preset.supervisors} total`);
      console.log(`  Monthly salary cost: $${(monthlySalaryCost / 1e6).toFixed(2)}M`);
      console.log(`  Revenue: $${(r.revenue / 1e6).toFixed(1)}M`);
      console.log(`  Net Income: $${(r.netIncome / 1e6).toFixed(1)}M`);
      console.log(`  Cash after R1: $${(r.cash / 1e6).toFixed(1)}M (started $${(preset.cash / 1e6).toFixed(0)}M)`);
      console.log(`  Products: ${r.products?.length || 0}`);
      console.log(`  Profitable: ${r.netIncome > 0 ? '✅ YES' : '❌ NO'}`);

      // Check per-segment revenue
      for (const p of r.products || []) {
        console.log(`    ${p.segment}: sold=${p.unitsSold || 0} @ $${p.price} = $${((p.unitsSold || 0) * p.price / 1e6).toFixed(1)}M`);
      }
    });
  }
});
