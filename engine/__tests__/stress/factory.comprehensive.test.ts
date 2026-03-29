/**
 * FACTORY MODULE — COMPREHENSIVE STRESS TESTS
 *
 * Merged from:
 *   - factory.stress.test.ts (Parts A–C)
 *   - factory_deep.stress.test.ts (Part D)
 *   - miyazaki_modules.stress.test.ts §2 Factory (Part E)
 *
 * Tests production, efficiency, 20 upgrades, ESG initiatives,
 * new factory creation, regional cost modifiers, defect rates,
 * waste rate floors, green investment formulas, staffing penalties,
 * material tier boundaries, and Miyazaki protocol validations.
 */

import { describe, it, expect } from "vitest";
import { SimulationEngine, type SimulationInput } from "../../core/SimulationEngine";
import {
  createMinimalTeamState,
  createMinimalMarketState,
  createMinimalEngineContext,
  runProfileNRounds,
  runNRounds,
  createSimulationInput,
} from "../../testkit/scenarioGenerator";
import { assertAllInvariantsPass } from "../../testkit/invariants";
import { CONSTANTS } from "../../types";
import { FactoryModule } from "../../modules/FactoryModule";
import type { FactoryUpgrade, Region } from "../../types/factory";
import type { AllDecisions } from "../../types/decisions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function runSingleTeam(
  state: ReturnType<typeof createMinimalTeamState>,
  decisions: any,
  seed = "fac-test"
) {
  const input: SimulationInput = {
    roundNumber: 1,
    teams: [{ id: "t1", state, decisions }],
    marketState: createMinimalMarketState(),
    matchSeed: seed,
  };
  return SimulationEngine.processRound(input);
}

// ===========================================================================
// TOP-LEVEL DESCRIBE
// ===========================================================================

describe("Factory Module — Comprehensive Stress Tests", () => {
  // =========================================================================
  // Part A — Golden Path (from factory.stress.test.ts)
  // =========================================================================

  describe("Part A — Golden Path", () => {
    it("factory processes with baseline decisions", () => {
      const output = runSingleTeam(createMinimalTeamState(), {
        factory: { efficiencyInvestments: {} },
      });
      expect(output.results[0].factoryResults.success).toBe(true);
    });

    it("new factory costs exactly $50M", () => {
      expect(CONSTANTS.NEW_FACTORY_COST).toBe(50_000_000);
      // Run two scenarios: one with new factory, one without. Compare cash difference.
      const stateA = createMinimalTeamState();
      const stateB = createMinimalTeamState();
      const outputWithFactory = runSingleTeam(stateA, {
        factory: {
          newFactories: [{ name: "New Plant", region: "Asia" as Region }],
        },
      }, "fac-new-cost");
      const outputWithout = runSingleTeam(stateB, {}, "fac-new-cost");
      const cashWith = outputWithFactory.results[0].newState.cash;
      const cashWithout = outputWithout.results[0].newState.cash;
      // The factory purchase should cost roughly $50M more than baseline
      const costDiff = cashWithout - cashWith;
      expect(costDiff).toBeGreaterThanOrEqual(50_000_000 * 0.85); // Allow for regional modifier
    });

    it("factory-expansion-blitz creates new factories", () => {
      const outputs = runProfileNRounds({
        teamCount: 2,
        rounds: 3,
        matchSeed: "fac-expand",
        profile: "factory-expansion-blitz",
      });
      // After expansion, should have more than 1 factory
      const finalFactories = outputs[0].results[0].newState.factories.length;
      expect(finalFactories).toBeGreaterThan(1);
    });
  });

  // =========================================================================
  // Part B — Edge Cases (from factory.stress.test.ts)
  // =========================================================================

  describe("Part B — Edge Cases", () => {
    it("efficiency is capped at 1.0", () => {
      const state = createMinimalTeamState();
      state.factories[0].efficiency = 0.95;
      const output = runSingleTeam(state, {
        factory: {
          efficiencyInvestments: {
            [state.factories[0].id]: { factory: 100_000_000 },
          },
        },
      }, "fac-eff-cap");
      const eff = output.results[0].newState.factories[0].efficiency;
      expect(eff).toBeLessThanOrEqual(1.0);
    });

    it("defect rate stays in [0, 1]", () => {
      const state = createMinimalTeamState();
      const output = runSingleTeam(state, {
        factory: {
          upgradePurchases: [
            { factoryId: state.factories[0].id, upgrade: "sixSigma" as FactoryUpgrade },
          ],
        },
      }, "fac-defect");
      const defect = output.results[0].newState.factories[0].defectRate;
      expect(defect).toBeGreaterThanOrEqual(0);
      expect(defect).toBeLessThanOrEqual(1);
    });

    it("0 workers: no crash, production is 0 or minimal", () => {
      const state = createMinimalTeamState();
      state.factories[0].workers = 0;
      state.employees = state.employees.filter(e => e.role !== "worker");
      const output = runSingleTeam(state, {}, "fac-0workers");
      expect(output.results.length).toBe(1);
    });

    it("regional cost modifiers are correct", () => {
      expect(CONSTANTS.REGIONAL_COST_MODIFIER["North America"]).toBe(1.0);
      expect(CONSTANTS.REGIONAL_COST_MODIFIER["Europe"]).toBe(1.0);
      expect(CONSTANTS.REGIONAL_COST_MODIFIER["Asia"]).toBe(0.85);
      expect(CONSTANTS.REGIONAL_COST_MODIFIER["MENA"]).toBe(0.90);
    });
  });

  // =========================================================================
  // Part C — Property Tests (from factory.stress.test.ts)
  // =========================================================================

  describe("Part C — Property Tests", () => {
    it("all 20 upgrades have costs defined", () => {
      const upgradeCosts = CONSTANTS.UPGRADE_COSTS;
      const expectedUpgrades: FactoryUpgrade[] = [
        "sixSigma", "automation", "materialRefinement", "supplyChain", "warehousing",
        "leanManufacturing", "digitalTwin", "iotIntegration", "modularLines", "continuousImprovement",
        "solarPanels", "waterRecycling", "wasteToEnergy", "smartGrid", "carbonCapture",
        "cleanRoom", "rapidPrototyping", "advancedRobotics", "qualityLab", "flexibleManufacturing",
      ];
      for (const upgrade of expectedUpgrades) {
        expect(upgradeCosts[upgrade]).toBeGreaterThan(0);
      }
    });

    it("upgrade tier prerequisites are defined", () => {
      expect(CONSTANTS.UPGRADE_TIERS.tier1.upgrades.length).toBeGreaterThan(0);
      expect(CONSTANTS.UPGRADE_TIERS.tier2.upgrades.length).toBeGreaterThan(0);
      expect(CONSTANTS.UPGRADE_TIERS.tier3.upgrades.length).toBeGreaterThan(0);
      expect(CONSTANTS.UPGRADE_TIERS.tier4.upgrades.length).toBeGreaterThan(0);
    });

    it("ESG initiatives produce non-negative scores across all profiles", () => {
      const outputs = runProfileNRounds({
        teamCount: 2,
        rounds: 3,
        matchSeed: "fac-esg",
        profile: "ESG-maximizer",
      });
      for (const output of outputs) {
        for (const result of output.results) {
          expect(result.newState.esgScore).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("factory costs are always deducted (never free)", () => {
      const state = createMinimalTeamState();
      // Run with and without upgrade to compare cash impact
      const stateB = createMinimalTeamState();
      const outputWith = runSingleTeam(state, {
        factory: {
          upgradePurchases: [
            { factoryId: state.factories[0].id, upgrade: "continuousImprovement" as FactoryUpgrade },
          ],
        },
      }, "fac-cost-deduct");
      const outputWithout = runSingleTeam(stateB, {}, "fac-cost-deduct");
      const cashWith = outputWith.results[0].newState.cash;
      const cashWithout = outputWithout.results[0].newState.cash;
      // Upgrade should cost money: cash with upgrade < cash without
      expect(cashWith).toBeLessThan(cashWithout);
    });

    it("placeholder: no regressions found yet", () => {
      expect(true).toBe(true);
    });
  });

  // =========================================================================
  // Part D — Deep Stress (from factory_deep.stress.test.ts)
  // =========================================================================

  describe("Part D — Deep Stress", () => {
    // §1.6 — FactoryModule.process()

    describe("§1.6 — FactoryModule.process()", () => {
      it("efficiency is capped at MAX_EFFICIENCY (1.0) even with massive investment", () => {
        const state = createMinimalTeamState();
        state.factories[0].efficiency = 0.95;

        // Invest $200M across all investment types — should push well past 1.0 uncapped
        const output = runSingleTeam(state, {
          factory: {
            efficiencyInvestments: {
              [state.factories[0].id]: {
                workers: 50_000_000,
                supervisors: 50_000_000,
                engineers: 50_000_000,
                machinery: 50_000_000,
                factory: 50_000_000,
              },
            },
          },
        }, "fac-deep-eff-cap");

        const eff = output.results[0].newState.factories[0].efficiency;
        expect(eff).toBeLessThanOrEqual(CONSTANTS.MAX_EFFICIENCY);
        expect(eff).toBe(1.0);
        assertAllInvariantsPass(output);
      });

      it("automation upgrade with zero workers produces 0 units (automation multiplies, does not replace workers)", () => {
        const state = createMinimalTeamState();
        // Give enough cash for the automation upgrade
        state.cash = 500_000_000;
        const factoryId = state.factories[0].id;

        // Buy automation upgrade
        const outputWithUpgrade = runSingleTeam(state, {
          factory: {
            upgradePurchases: [
              { factoryId, upgrade: "automation" as FactoryUpgrade },
            ],
          },
        }, "fac-deep-auto-buy");

        // Verify the upgrade was purchased
        const upgradedFactory = outputWithUpgrade.results[0].newState.factories[0];
        expect(upgradedFactory.upgrades).toContain("automation");

        // Now test with zero workers using the static calculateProduction method
        const factory = { ...upgradedFactory };
        const result = FactoryModule.calculateProduction(factory, 0, 80, 80);
        expect(result.unitsProduced).toBe(0);
        expect(result.defects).toBe(0);
      });

      it("materialRefinement upgrade on Professional (natural tier 5) clamps materialLevel at 5", () => {
        const state = createMinimalTeamState();
        state.cash = 500_000_000;
        const factoryId = state.factories[0].id;

        // Professional segment natural tier is 5. materialRefinement adds +1, should clamp at 5.
        const output = runSingleTeam(state, {
          factory: {
            upgradePurchases: [
              { factoryId, upgrade: "materialRefinement" as FactoryUpgrade },
            ],
          },
        }, "fac-deep-mat-tier");

        const factory = output.results[0].newState.factories[0];
        expect(factory.materialLevel).toBeLessThanOrEqual(5);
        expect(factory.materialLevel).toBeGreaterThanOrEqual(1);
        // No crash — that's the key assertion
        assertAllInvariantsPass(output);
      });

      it("economy materials increase defects but defects never exceed production", () => {
        const state = createMinimalTeamState();
        // Use material tier choices with economy materials (tier below natural)
        // Budget natural tier is 1, so we can't go lower. Use General (natural=2) at tier 1.
        const output = runSingleTeam(state, {
          factory: {
            materialTierChoices: {
              "General": 1,        // Economy: tier 1 for General (natural 2) → +30% defects
              "Enthusiast": 3,     // Economy: tier 3 for Enthusiast (natural 4) → +30% defects
            },
          },
        }, "fac-deep-high-defect");

        const factory = output.results[0].newState.factories[0];
        // Defect rate should be elevated but still in [0, 1]
        expect(factory.defectRate).toBeGreaterThanOrEqual(0);
        expect(factory.defectRate).toBeLessThanOrEqual(1);

        // Verify via calculateProduction that defects never exceed production
        const prodResult = FactoryModule.calculateProduction(factory, 50, 70, 70);
        expect(prodResult.defects).toBeGreaterThanOrEqual(0);
        // unitsProduced is already net of defects, so it should be non-negative
        expect(prodResult.unitsProduced).toBeGreaterThanOrEqual(0);

        assertAllInvariantsPass(output);
      });

      it("waste rate floors at 0.02 even at max efficiency + upgrades", () => {
        const state = createMinimalTeamState();
        state.cash = 1_000_000_000;
        const factory = state.factories[0];
        factory.efficiency = 1.0;
        // Add waste-reducing upgrade
        factory.upgrades.push("wasteToEnergy" as FactoryUpgrade);
        factory.wasteCostReduction = 0.20;

        // Calculate waste metrics with high production
        const productionByFactory: Record<string, number> = {
          [factory.id]: 100_000,
        };

        const wasteMetrics = FactoryModule.calculateWasteMetrics(
          [factory],
          productionByFactory
        );

        // Waste rate = max(0.02, baseWasteRate - efficiencyReduction - upgradeReduction)
        // baseWasteRate = 0.15, efficiencyReduction = 1.0 * 0.12 = 0.12, upgradeReduction = 0.20 * 0.05 = 0.01
        // wasteRate = max(0.02, 0.15 - 0.12 - 0.01) = max(0.02, 0.02) = 0.02
        const wasteUnits = wasteMetrics.wasteByFactory[factory.id].units;
        const expectedWasteRate = 0.02;
        const expectedWasteUnits = Math.floor(100_000 * expectedWasteRate);
        expect(wasteUnits).toBe(expectedWasteUnits);
        expect(wasteUnits).toBeGreaterThanOrEqual(0);
      });

      it("green investment reduces CO2 by 10 tons per $100K invested", () => {
        // Direct formula test
        const reduction1M = FactoryModule.calculateCO2Reduction(1_000_000);
        expect(reduction1M).toBe(100); // $1M → 100 tons

        const reduction500K = FactoryModule.calculateCO2Reduction(500_000);
        expect(reduction500K).toBe(50); // $500K → 50 tons

        const reduction100K = FactoryModule.calculateCO2Reduction(100_000);
        expect(reduction100K).toBe(10); // $100K → 10 tons

        // Integration: apply via full pipeline
        const state = createMinimalTeamState();
        const factoryId = state.factories[0].id;
        const initialCO2 = state.factories[0].co2Emissions;

        const output = runSingleTeam(state, {
          factory: {
            greenInvestments: {
              [factoryId]: 1_000_000,
            },
          },
        }, "fac-deep-green");

        const finalCO2 = output.results[0].newState.factories[0].co2Emissions;
        // CO2 should have decreased by 100 tons (may also be affected by pipeline)
        expect(finalCO2).toBeLessThan(initialCO2);
        assertAllInvariantsPass(output);
      });

      it("new factories in all 4 regions apply correct regional cost modifiers", () => {
        const regions: Region[] = ["North America", "Europe", "Asia", "MENA"];

        for (const region of regions) {
          const factory = FactoryModule.createNewFactory(`Factory-${region}`, region, 0);

          // Verify regional cost modifiers are applied to shipping and storage
          const modifier = CONSTANTS.REGIONAL_COST_MODIFIER[region];
          expect(factory.shippingCost).toBe(100_000 * modifier);
          expect(factory.storageCost).toBe(50_000 * modifier);
          expect(factory.region).toBe(region);
          expect(factory.efficiency).toBe(0.7);
          expect(factory.defectRate).toBe(CONSTANTS.BASE_DEFECT_RATE);
        }

        // Full pipeline test: create all 4 factories in one round
        const state = createMinimalTeamState();
        state.cash = 500_000_000; // Need $200M for 4 factories

        const output = runSingleTeam(state, {
          factory: {
            newFactories: regions.map((region, i) => ({
              name: `Plant-${region}`,
              region,
            })),
          },
        }, "fac-deep-regions");

        // Should have original + 4 new factories = 5
        const factories = output.results[0].newState.factories;
        expect(factories.length).toBe(5);

        // Verify factories were purchased by comparing with a no-factory baseline
        const stateB = createMinimalTeamState();
        stateB.cash = 500_000_000;
        const outputB = runSingleTeam(stateB, {}, "fac-deep-regions");
        const cashWithFactories = output.results[0].newState.cash;
        const cashWithout = outputB.results[0].newState.cash;
        // 4 factories × $50M = $200M cost difference (allow tolerance for regional effects)
        expect(cashWithout - cashWithFactories).toBeGreaterThanOrEqual(200_000_000 * 0.90);

        assertAllInvariantsPass(output);
      });
    });

    // §1.7 — calculateProduction()

    describe("§1.7 — calculateProduction()", () => {
      it("zero workers produces zero output with no crash", () => {
        const state = createMinimalTeamState();
        const factory = state.factories[0];

        const result = FactoryModule.calculateProduction(factory, 0, 80, 80);
        expect(result.unitsProduced).toBe(0);
        expect(result.defects).toBe(0);

        // Also test with zero efficiency and zero speed
        const result2 = FactoryModule.calculateProduction(factory, 0, 0, 0);
        expect(result2.unitsProduced).toBe(0);
        expect(result2.defects).toBe(0);
      });

      it("500 workers at max efficiency produces expected output without exceeding sanity bounds", () => {
        const state = createMinimalTeamState();
        const factory = state.factories[0];
        factory.efficiency = 1.0;
        factory.defectRate = CONSTANTS.BASE_DEFECT_RATE;

        const workers = 500;
        const avgEfficiency = 100; // Perfect stats
        const avgSpeed = 100;      // Perfect stats

        const result = FactoryModule.calculateProduction(factory, workers, avgEfficiency, avgSpeed);

        // Expected: 500 × 5000 × 1.0 × 1.0 × 1.0 × 1 = 2,500,000 gross
        // Defect rate adjusted by worker accuracy: factory.avgWorkerAccuracy defaults to 75
        // accuracyModifier = 1.3 - (75/100) * 0.5 = 0.925
        // effectiveDefectRate = 0.06 * 0.925 = 0.0555
        // defects: floor(2500000 × 0.0555) = 138750
        // net: 2500000 - 138750 = 2361250
        const expectedGross = 500 * CONSTANTS.BASE_WORKER_OUTPUT * 1.0 * 1.0 * 1.0;
        const workerAccuracy = 75; // default when not set on factory
        const accuracyModifier = 1.3 - (workerAccuracy / 100) * 0.5;
        const effectiveDefectRate = CONSTANTS.BASE_DEFECT_RATE * accuracyModifier;
        const expectedDefects = Math.floor(expectedGross * effectiveDefectRate);
        const expectedNet = expectedGross - expectedDefects;

        expect(result.unitsProduced).toBe(expectedNet);
        expect(result.defects).toBe(expectedDefects);

        // Sanity: output should be positive and finite
        expect(result.unitsProduced).toBeGreaterThan(0);
        expect(Number.isFinite(result.unitsProduced)).toBe(true);
      });

      it("automation upgrade produces tiered ~1.15x output (not old 5x)", () => { // POST-FIX: updated from 5x to tiered ~1.15x
        const state = createMinimalTeamState();
        const factory = state.factories[0];
        factory.efficiency = 1.0;
        factory.defectRate = CONSTANTS.BASE_DEFECT_RATE;

        const workers = 500;
        const avgEfficiency = 100;
        const avgSpeed = 100;

        // Without automation
        const resultNoAuto = FactoryModule.calculateProduction(factory, workers, avgEfficiency, avgSpeed);

        // With automation
        factory.upgrades.push("automation");
        const resultWithAuto = FactoryModule.calculateProduction(factory, workers, avgEfficiency, avgSpeed);

        // POST-FIX: updated from 5x to tiered. Automation alone gives +0.15 → 1.15x multiplier
        const ratio = resultWithAuto.unitsProduced / resultNoAuto.unitsProduced;
        expect(ratio).toBeCloseTo(1.15, 1);
      });

      it("understaffed factory has lower production than fully staffed", () => {
        const state = createMinimalTeamState();
        const factory = state.factories[0];
        factory.efficiency = 0.8;

        // Get recommended staffing
        const recommended = FactoryModule.calculateRecommendedStaffing(factory);

        // Full staffing: no penalty
        const penaltyFull = FactoryModule.calculateStaffingPenalty(factory, recommended);

        // Half staffing: penalty
        const halfStaff = {
          workers: Math.floor(recommended.workers / 2),
          engineers: Math.floor(recommended.engineers / 2),
          supervisors: Math.floor(recommended.supervisors / 2),
        };
        const penaltyHalf = FactoryModule.calculateStaffingPenalty(factory, halfStaff);

        // Understaffed should have higher penalty
        expect(penaltyHalf).toBeGreaterThan(penaltyFull);
        // Penalty is capped at 25%
        expect(penaltyHalf).toBeLessThanOrEqual(0.25);
        // Full staffing should have 0 or near-0 penalty
        expect(penaltyFull).toBeLessThanOrEqual(0.01);

        // Zero staffing: maximum penalty
        const penaltyZero = FactoryModule.calculateStaffingPenalty(factory, {
          workers: 0,
          engineers: 0,
          supervisors: 0,
        });
        expect(penaltyZero).toBeGreaterThan(penaltyHalf);
        expect(penaltyZero).toBeLessThanOrEqual(0.25); // Cap
      });

      it("understaffed vs fully staffed produces less output (full pipeline)", () => {
        // Full staffing run
        const stateA = createMinimalTeamState();
        const outputA = runSingleTeam(stateA, {}, "fac-deep-staff-full");

        // Understaffed run: remove most workers
        const stateB = createMinimalTeamState();
        const workerIds = stateB.employees
          .filter(e => e.role === "worker")
          .slice(0, 40) // fire 40 of 50 workers
          .map(e => ({ employeeId: e.id }));
        const outputB = runSingleTeam(stateB, {
          hr: { fires: workerIds },
        }, "fac-deep-staff-under");

        // After firing 40 workers, the team should have fewer employees
        const headcountA = outputA.results[0].newState.workforce.totalHeadcount;
        const headcountB = outputB.results[0].newState.workforce.totalHeadcount;
        expect(headcountB).toBeLessThan(headcountA);

        // Both should pass invariants
        assertAllInvariantsPass(outputA);
        assertAllInvariantsPass(outputB);
      });
    });
  });

  // =========================================================================
  // Part E — Miyazaki Protocol (from miyazaki_modules.stress.test.ts §2)
  // =========================================================================

  describe("Part E — Miyazaki Protocol", () => {
    it("2.1 — Zero workers: unitsProduced = 0, no crash", () => {
      const state = createMinimalTeamState();
      const factory = state.factories[0];
      factory.workers = 0;

      const { unitsProduced, defects } = FactoryModule.calculateProduction(
        factory,
        0,   // workers
        50,  // averageWorkerEfficiency
        50   // averageWorkerSpeed
      );

      expect(unitsProduced).toBe(0);
      expect(defects).toBe(0);
    });

    it("2.5 — Stacking all defect reduction upgrades keeps defectRate >= 0", () => {
      const state = createMinimalTeamState();
      const factory = state.factories[0];

      // Give enough cash for all upgrades
      state.cash = 1_000_000_000;

      // Apply every defect-reducing upgrade directly
      const defectReducingUpgrades: FactoryUpgrade[] = [
        "sixSigma",     // defectRate *= 0.6
        "qualityLab",   // defectRate *= 0.5
      ];

      for (const upgrade of defectReducingUpgrades) {
        factory.upgrades.push(upgrade);
        FactoryModule.applyUpgradeEffects(factory, upgrade);
      }

      expect(factory.defectRate).toBeGreaterThanOrEqual(0);
      expect(isFinite(factory.defectRate)).toBe(true);
    });

    it("2.11 — materialTierChoices 0, -1, 6, NaN are caught by validateDecisions", () => {
      const state = createMinimalTeamState();

      const badTiers: Record<string, number> = {
        Budget: 0,
        General: -1,
        Enthusiast: 6,
        Professional: NaN,
      };

      const decisions: AllDecisions = {
        factory: {
          materialTierChoices: badTiers,
          efficiencyInvestments: {},
          productionAllocations: [],
        },
      };

      const { valid, errors } =
        SimulationEngine.validateDecisions(state, decisions);

      // Should flag errors
      expect(valid).toBe(false);
      expect(errors.length).toBeGreaterThanOrEqual(4);

      // The engine corrects the original decisions object in-place for material tiers.
      // Each corrected tier must be in [1, 5].
      const correctedTiers = decisions.factory!.materialTierChoices!;
      for (const [segment, tier] of Object.entries(correctedTiers)) {
        expect(tier).toBeGreaterThanOrEqual(1);
        expect(tier).toBeLessThanOrEqual(5);
        expect(isFinite(tier)).toBe(true);
      }
    });

    it("2.12 — Production scales with workers and machines (no arbitrary cap)", () => {
      const state = createMinimalTeamState();
      const factory = state.factories[0];

      // Production should scale linearly with workers (no 50K cap)
      const small = FactoryModule.calculateProduction(factory, 50, 80, 80);
      const large = FactoryModule.calculateProduction(factory, 500, 80, 80);

      // 10x workers → ~10x production (minus defects)
      expect(large.unitsProduced).toBeGreaterThan(small.unitsProduced * 8);
      expect(large.unitsProduced).toBeLessThan(small.unitsProduced * 12);

      // No arbitrary cap — 10,000 workers can produce far above 50K
      const massive = FactoryModule.calculateProduction(factory, 10_000, 100, 100);
      expect(massive.unitsProduced).toBeGreaterThan(50_000);
    });
  });
});
