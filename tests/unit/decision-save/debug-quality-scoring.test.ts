/**
 * Debug test: Trace quality scoring through MarketSimulator.calculateTeamPosition
 * and through processRound to identify where quality differences are lost.
 */
import { describe, it, expect } from "vitest";

import { SimulationEngine } from "@/engine/core/SimulationEngine";
import type { SimulationInput } from "@/engine/core/SimulationEngine";
import { MarketSimulator } from "@/engine/market/MarketSimulator";
import { CONSTANTS } from "@/engine/types";
import type { Segment } from "@/engine/types/factory";
import {
  createGamePreset,
  createMinimalMarketState,
} from "@/engine/testkit/scenarioGenerator";

const SEGMENTS: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

describe("Debug: Quality scoring trace", () => {
  it("direct call to calculateTeamPosition shows quality difference", () => {
    const { teamState: stateA } = createGamePreset("quick");
    const { teamState: stateB } = createGamePreset("quick");

    stateA.round = 1;
    stateB.round = 1;

    // Set quality on ALL products
    for (const product of stateA.products) {
      product.quality = 90;
    }
    for (const product of stateB.products) {
      product.quality = 60;
    }

    // Make brand and ESG identical
    stateA.brandValue = 0.5;
    stateB.brandValue = 0.5;
    stateA.esgScore = 100;
    stateB.esgScore = 100;

    const marketState = createMinimalMarketState();

    console.log("=== DIRECT calculateTeamPosition (bypassing processRound) ===");
    console.log("Team A products quality:", stateA.products.map(p => `${p.segment}: q=${p.quality}`));
    console.log("Team B products quality:", stateB.products.map(p => `${p.segment}: q=${p.quality}`));

    for (const segment of SEGMENTS) {
      const productA = stateA.products.find(p => p.segment === segment);
      const productB = stateB.products.find(p => p.segment === segment);

      if (!productA || !productB) {
        console.log(`  ${segment}: missing product (A=${!!productA}, B=${!!productB})`);
        continue;
      }

      const posA = MarketSimulator.calculateTeamPosition("team-A", stateA, productA, segment, marketState);
      const posB = MarketSimulator.calculateTeamPosition("team-B", stateB, productB, segment, marketState);

      const qualityExp = MarketSimulator.getQualityExpectation(segment, 1);
      const ratioA = productA.quality / qualityExp;
      const ratioB = productB.quality / qualityExp;

      console.log(`\n  ${segment}:`);
      console.log(`    qualityExpectation = ${qualityExp}`);
      console.log(`    Team A: quality=${productA.quality}, ratio=${ratioA.toFixed(4)}, qualityScore=${posA.qualityScore.toFixed(4)}, totalScore=${posA.totalScore.toFixed(4)}`);
      console.log(`    Team B: quality=${productB.quality}, ratio=${ratioB.toFixed(4)}, qualityScore=${posB.qualityScore.toFixed(4)}, totalScore=${posB.totalScore.toFixed(4)}`);
      console.log(`    priceScoreA=${posA.priceScore.toFixed(4)}, priceScoreB=${posB.priceScore.toFixed(4)}`);
      console.log(`    brandScoreA=${posA.brandScore.toFixed(4)}, brandScoreB=${posB.brandScore.toFixed(4)}`);
      console.log(`    esgScoreA=${posA.esgScore.toFixed(4)}, esgScoreB=${posB.esgScore.toFixed(4)}`);
      console.log(`    featureScoreA=${posA.featureScore.toFixed(4)}, featureScoreB=${posB.featureScore.toFixed(4)}`);

      expect(posA.qualityScore).toBeGreaterThan(posB.qualityScore);
      expect(posA.totalScore).toBeGreaterThan(posB.totalScore);
    }
  });

  it("processRound: trace product quality before and after modules", () => {
    const { teamState: stateA } = createGamePreset("quick");
    const { teamState: stateB } = createGamePreset("quick");

    stateA.round = 1;
    stateB.round = 1;

    for (const product of stateA.products) {
      product.quality = 90;
    }
    for (const product of stateB.products) {
      product.quality = 60;
    }

    stateA.brandValue = 0.5;
    stateB.brandValue = 0.5;
    stateA.esgScore = 100;
    stateB.esgScore = 100;

    console.log("\n=== BEFORE processRound ===");
    console.log("Team A quality:", stateA.products.map(p => `${p.segment}:${p.quality}`));
    console.log("Team B quality:", stateB.products.map(p => `${p.segment}:${p.quality}`));

    const marketState = createMinimalMarketState();

    const input: SimulationInput = {
      roundNumber: 1,
      teams: [
        { id: "team-A", state: stateA, decisions: {} },
        { id: "team-B", state: stateB, decisions: {} },
      ],
      marketState,
      matchSeed: "debug-quality-test",
    };

    const output = SimulationEngine.processRound(input);

    console.log("\n=== AFTER processRound: marketPositions ===");
    for (const segment of SEGMENTS) {
      const posA = output.marketPositions.find(p => p.teamId === "team-A" && p.segment === segment);
      const posB = output.marketPositions.find(p => p.teamId === "team-B" && p.segment === segment);

      if (posA && posB) {
        console.log(`\n  ${segment}:`);
        console.log(`    Team A: productQuality=${posA.product?.quality ?? "null"}, qualityScore=${posA.qualityScore}, totalScore=${posA.totalScore}`);
        console.log(`    Team B: productQuality=${posB.product?.quality ?? "null"}, qualityScore=${posB.qualityScore}, totalScore=${posB.totalScore}`);
        console.log(`    priceA=${posA.priceScore}, priceB=${posB.priceScore}`);
        console.log(`    brandA=${posA.brandScore}, brandB=${posB.brandScore}`);
        console.log(`    featA=${posA.featureScore}, featB=${posB.featureScore}`);
        console.log(`    esgA=${posA.esgScore}, esgB=${posB.esgScore}`);
      }
    }

    // Check post-round product qualities in newState
    const resultA = output.results.find(r => r.teamId === "team-A")!;
    const resultB = output.results.find(r => r.teamId === "team-B")!;
    console.log("\n=== Post-round product quality in newState ===");
    console.log("Team A:", resultA.newState.products.map(p => `${p.segment}:${p.quality}`));
    console.log("Team B:", resultB.newState.products.map(p => `${p.segment}:${p.quality}`));

    // The real assertion: quality should produce different scores
    for (const segment of SEGMENTS) {
      const posA = output.marketPositions.find(p => p.teamId === "team-A" && p.segment === segment);
      const posB = output.marketPositions.find(p => p.teamId === "team-B" && p.segment === segment);
      if (posA && posB && posA.product && posB.product) {
        console.log(`\n  ASSERT ${segment}: A.totalScore(${posA.totalScore}) > B.totalScore(${posB.totalScore})?`);
      }
    }
  });
});
