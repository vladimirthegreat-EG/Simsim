import { SimulationEngine } from './engine/core/SimulationEngine.js';
import { MarketSimulator } from './engine/market/MarketSimulator.js';
import { CONSTANTS } from './engine/types/index.js';

// Simulate Quick preset: 40 workers, 5 segments, starterMachines
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
    console.log(`  Factory ${fid}: ${fm.machines.length} machines, totalCapacity=${fm.totalCapacity}`);
  }
}
console.log("Products:", state.products?.length);
console.log("");

// Check production lines
console.log("=== PRODUCTION LINES ===");
for (const line of state.factories[0]?.productionLines || []) {
  console.log(`  ${line.id}: segment=${line.segment}, product=${line.productId}, capacity=${line.capacity}, status=${line.status ?? 'UNDEFINED'}`);
}
console.log("");

// Check capacity per segment
const segments = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
const demand = { Budget: 700000, General: 450000, Enthusiast: 150000, Professional: 80000, "Active Lifestyle": 200000 };

console.log("=== CAPACITY vs DEMAND (4 teams, 25% share each) ===");
for (const seg of segments) {
  const cap = MarketSimulator.getTeamProductionCapacity(state, seg);
  const capFromLines = MarketSimulator.getTeamProductionCapacityFromLines(state, seg);
  const demandPerTeam = Math.floor(demand[seg] / 4);
  const utilization = demandPerTeam > 0 ? (Math.min(cap, demandPerTeam) / demandPerTeam * 100).toFixed(1) : "N/A";
  console.log(`  ${seg.padEnd(18)} legacy=${cap.toString().padStart(8)} | fromLines=${capFromLines.toString().padStart(8)} | demand/team=${demandPerTeam.toString().padStart(8)} | util=${utilization}%`);
}
console.log("");

// Run 1 round with 2 teams to see actual revenue
const state2 = SimulationEngine.createInitialTeamState(
  { cash: 175_000_000 },
  { workers: 40, engineers: 8, supervisors: 5, includeProducts: true, startingSegments: 5, brandValue: 0.5, starterMachines: true }
);
const marketState = SimulationEngine.createInitialMarketState();

const output = SimulationEngine.processRound({
  roundNumber: 1,
  teams: [
    { id: "team-1", state: state, decisions: {} },
    { id: "team-2", state: state2, decisions: {} },
  ],
  marketState,
  matchSeed: "capacity-check",
});

console.log("=== ROUND 1 RESULTS (2 teams, no decisions) ===");
for (const r of output.results) {
  console.log(`  ${r.teamId}: revenue=$${(r.newState.revenue/1e6).toFixed(1)}M, cash=$${(r.newState.cash/1e6).toFixed(1)}M`);
  for (const p of r.newState.products || []) {
    console.log(`    ${p.segment}: sold=${p.unitsSold ?? 0}, price=$${p.price}`);
  }
}
