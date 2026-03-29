/**
 * L1 Apple — Patent Engine & FacilitatorReportEngine Tests (v2)
 *
 * Part A: PatentEngine direct tests (filing, blocking)
 * Part B: FacilitatorReportEngine direct tests (round brief, team health)
 */

import { describe, it, expect } from "vitest";
import {
  PatentEngine,
  initializePatentRegistry,
  type PatentRegistry,
} from "@/engine/modules/PatentEngine";
import { FacilitatorReportEngine } from "@/engine/modules/FacilitatorReportEngine";
import {
  createMinimalTeamState,
  createMinimalEngineContext,
} from "@/engine/testkit/scenarioGenerator";
import { PATENT_FILING_COST, PATENT_BLOCKING_POWER } from "@/engine/types/patents";
import type { TeamState } from "@/engine/types/state";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a TeamState with a specific tech unlocked and plenty of cash. */
function stateWithTech(techId: string = "bat_2a", cash: number = 500_000_000): TeamState {
  const base = createMinimalTeamState();
  return {
    ...base,
    cash,
    unlockedTechnologies: [...(base.unlockedTechnologies ?? []), techId],
  };
}

/** Shorthand: file one patent and return result + registry. */
function fileSinglePatent(
  registry: PatentRegistry,
  teamId: string,
  techId: string,
  state: TeamState,
  round: number = 1,
) {
  const ctx = createMinimalEngineContext("patent-v2", round, teamId);
  return PatentEngine.processRound(
    registry,
    [{ teamId, state, decisions: { filings: [{ techId }] } }],
    round,
    ctx,
  );
}

// ===========================================================================
// PART A — Patent Engine Direct Tests
// ===========================================================================

describe("Patent Engine — Direct Tests", () => {
  // -------------------------------------------------------------------------
  // PAT-01 — File a patent: verify patent appears in state after filing
  // -------------------------------------------------------------------------
  describe("PAT-01 — File a patent", () => {
    it("patent appears in the registry after filing on a tier-2 tech", () => {
      const registry = initializePatentRegistry();
      const state = stateWithTech("bat_2a");

      const { updatedRegistry, result } = fileSinglePatent(
        registry,
        "team-alpha",
        "bat_2a",
        state,
        1,
      );

      // A new patent should exist in the registry
      expect(updatedRegistry.patents).toHaveLength(1);
      expect(result.newPatents).toHaveLength(1);

      const patent = updatedRegistry.patents[0];
      expect(patent.techId).toBe("bat_2a");
      expect(patent.ownerId).toBe("team-alpha");
      expect(patent.status).toBe("active");
      expect(patent.roundFiled).toBe(1);
      expect(patent.blockingPower).toBeGreaterThan(0);
      expect(patent.exclusiveBonus).toBeGreaterThan(0);

      // The tech should be registered in filedTechs
      expect(updatedRegistry.filedTechs["bat_2a"]).toBe("team-alpha");
    });

    it("filing cost is deducted from licensing revenue", () => {
      const registry = initializePatentRegistry();
      const state = stateWithTech("bat_2a");

      const { result } = fileSinglePatent(registry, "team-alpha", "bat_2a", state, 1);

      // Filing cost should show as negative licensing revenue
      const cost = PATENT_FILING_COST[2]; // tier 2
      expect(result.licensingRevenue["team-alpha"]).toBe(-cost);
    });

    it("messages mention the filing", () => {
      const registry = initializePatentRegistry();
      const state = stateWithTech("bat_2a");

      const { result } = fileSinglePatent(registry, "team-alpha", "bat_2a", state, 1);

      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages.some(m => m.includes("team-alpha") && m.includes("Fast Charging"))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // PAT-02 — Patent blocking: verify blocking effect on competitors
  // -------------------------------------------------------------------------
  describe("PAT-02 — Patent blocking", () => {
    it("competitor who has the patented tech unlocked receives a blocking penalty", () => {
      const registry = initializePatentRegistry();
      const techId = "bat_2a";

      // Team A files patent on bat_2a
      const stateA = stateWithTech(techId);
      const ctxA = createMinimalEngineContext("block-test", 1, "team-A");
      const { updatedRegistry } = PatentEngine.processRound(
        registry,
        [{ teamId: "team-A", state: stateA, decisions: { filings: [{ techId }] } }],
        1,
        ctxA,
      );

      // Now process round 2 with both teams — team B also has bat_2a unlocked
      const stateB = stateWithTech(techId);
      const ctxRound2 = createMinimalEngineContext("block-test", 2, "team-A");

      const round2 = PatentEngine.processRound(
        updatedRegistry,
        [
          { teamId: "team-A", state: stateA, decisions: {} },
          { teamId: "team-B", state: stateB, decisions: {} },
        ],
        2,
        ctxRound2,
      );

      // Team B should have a blocking penalty in the "battery" family
      const penalties = round2.result.blockingPenalties;
      expect(penalties["team-B"]).toBeDefined();
      expect(penalties["team-B"]["battery"]).toBeDefined();
      expect(penalties["team-B"]["battery"]).toBeGreaterThan(0);
      expect(penalties["team-B"]["battery"]).toBe(PATENT_BLOCKING_POWER[2]);

      // Team A (the owner) should NOT have a penalty
      expect(penalties["team-A"]["battery"] ?? 0).toBe(0);
    });

    it("licensed competitor does NOT receive a blocking penalty", () => {
      const registry = initializePatentRegistry();
      const techId = "bat_2a";

      // Team A files patent
      const stateA = stateWithTech(techId);
      const ctxA = createMinimalEngineContext("license-test", 1, "team-A");
      const { updatedRegistry } = PatentEngine.processRound(
        registry,
        [{ teamId: "team-A", state: stateA, decisions: { filings: [{ techId }] } }],
        1,
        ctxA,
      );

      // Team B licenses the patent in round 2
      const patentId = updatedRegistry.patents[0].id;
      const stateB = stateWithTech(techId);
      const ctxRound2 = createMinimalEngineContext("license-test", 2, "team-A");

      const round2 = PatentEngine.processRound(
        updatedRegistry,
        [
          { teamId: "team-A", state: stateA, decisions: {} },
          {
            teamId: "team-B",
            state: stateB,
            decisions: {
              licenseRequests: [{ patentId, fromTeamId: "team-A" }],
            },
          },
        ],
        2,
        ctxRound2,
      );

      // Team B should have NO blocking penalty since they licensed it
      const penalties = round2.result.blockingPenalties;
      expect(penalties["team-B"]["battery"] ?? 0).toBe(0);
    });
  });
});

// ===========================================================================
// PART B — FacilitatorReportEngine Direct Tests
// ===========================================================================

describe("FacilitatorReportEngine — Direct Tests", () => {
  // -------------------------------------------------------------------------
  // FAC-01 — generateRoundBrief
  // -------------------------------------------------------------------------
  describe("FAC-01 — generateRoundBrief", () => {
    it("headline is non-empty, winner is populated, conceptSpotlight is present", () => {
      // Build two teams with different revenues so winner/loser are distinct
      const stateA: TeamState = {
        ...createMinimalTeamState(),
        cash: 300_000_000,
        revenue: 80_000_000,
      };
      const stateB: TeamState = {
        ...createMinimalTeamState(),
        cash: 100_000_000,
        revenue: 20_000_000,
      };

      const teams = [
        { id: "team-A", name: "Alpha Corp", state: stateA },
        { id: "team-B", name: "Beta Inc", state: stateB },
      ];

      const brief = FacilitatorReportEngine.generateRoundBrief(1, teams);

      // Headline should be non-empty
      expect(brief.headline).toBeTruthy();
      expect(brief.headline.length).toBeGreaterThan(0);

      // Round number
      expect(brief.round).toBe(1);

      // Winner should be populated (Alpha Corp has higher revenue)
      expect(brief.winnerOfRound).toBeDefined();
      expect(brief.winnerOfRound.teamId).toBeTruthy();
      expect(brief.winnerOfRound.teamName).toBeTruthy();
      expect(brief.winnerOfRound.reason).toBeTruthy();

      // Loser should be populated
      expect(brief.loserOfRound).toBeDefined();
      expect(brief.loserOfRound.teamId).toBeTruthy();
      expect(brief.loserOfRound.teamName).toBeTruthy();

      // Concept spotlight should be present with non-empty fields
      expect(brief.conceptSpotlight).toBeDefined();
      expect(brief.conceptSpotlight.concept).toBeTruthy();
      expect(brief.conceptSpotlight.explanation).toBeTruthy();
    });

    it("winner has higher revenue than loser when no previous states", () => {
      const stateA: TeamState = {
        ...createMinimalTeamState(),
        cash: 300_000_000,
        revenue: 100_000_000,
      };
      const stateB: TeamState = {
        ...createMinimalTeamState(),
        cash: 100_000_000,
        revenue: 5_000_000,
      };

      const teams = [
        { id: "team-A", name: "Alpha Corp", state: stateA },
        { id: "team-B", name: "Beta Inc", state: stateB },
      ];

      const brief = FacilitatorReportEngine.generateRoundBrief(1, teams);

      // Alpha should win (higher revenue = higher score in first round)
      expect(brief.winnerOfRound.teamName).toBe("Alpha Corp");
      expect(brief.loserOfRound.teamName).toBe("Beta Inc");
    });

    it("returns safe defaults when no teams provided", () => {
      const brief = FacilitatorReportEngine.generateRoundBrief(1, []);

      expect(brief.headline).toContain("No teams active");
      expect(brief.winnerOfRound.teamName).toBe("N/A");
      expect(brief.conceptSpotlight.concept).toBe("N/A");
    });
  });

  // -------------------------------------------------------------------------
  // FAC-02 — generateTeamHealthSummaries
  // -------------------------------------------------------------------------
  describe("FAC-02 — generateTeamHealthSummaries", () => {
    it("classifies a wealthy team with products as healthy", () => {
      const state: TeamState = {
        ...createMinimalTeamState(),
        cash: 200_000_000,
        revenue: 50_000_000,
        products: [
          {
            id: "p1",
            name: "Phone X",
            segment: "General" as any,
            price: 300,
            quality: 60,
            features: 50,
            developmentStatus: "launched",
            developmentProgress: 100,
            developmentCost: 10_000_000,
            marketingBudget: 5_000_000,
            unitsSold: 100_000,
            productionCost: 150,
            inventory: 10_000,
          } as any,
        ],
      };

      const summaries = FacilitatorReportEngine.generateTeamHealthSummaries([
        { id: "team-H", name: "Healthy Co", state },
      ]);

      expect(summaries).toHaveLength(1);
      expect(summaries[0].status).toBe("healthy");
      expect(summaries[0].teamName).toBe("Healthy Co");
      expect(summaries[0].cash).toBe(200_000_000);
      expect(summaries[0].productCount).toBe(1);
    });

    it("classifies a team with negative cash as critical", () => {
      const state: TeamState = {
        ...createMinimalTeamState(),
        cash: -10_000_000,
        revenue: 1_000_000,
      };

      const summaries = FacilitatorReportEngine.generateTeamHealthSummaries([
        { id: "team-C", name: "Critical Co", state },
      ]);

      expect(summaries).toHaveLength(1);
      expect(summaries[0].status).toBe("critical");
    });

    it("classifies a low-cash team with no products as struggling", () => {
      const state: TeamState = {
        ...createMinimalTeamState(),
        cash: 30_000_000, // below 50M threshold
        revenue: 0,
        products: [], // no launched products
      };

      const summaries = FacilitatorReportEngine.generateTeamHealthSummaries([
        { id: "team-S", name: "Struggling Co", state },
      ]);

      expect(summaries).toHaveLength(1);
      expect(summaries[0].status).toBe("struggling");
    });

    it("correctly classifies a mixed set of teams", () => {
      const healthy: TeamState = {
        ...createMinimalTeamState(),
        cash: 200_000_000,
        products: [
          {
            id: "p1", name: "Phone", segment: "General" as any,
            price: 300, quality: 60, features: 50,
            developmentStatus: "launched", developmentProgress: 100,
            developmentCost: 10_000_000, marketingBudget: 5_000_000,
            unitsSold: 100_000, productionCost: 150, inventory: 10_000,
          } as any,
        ],
      };
      const struggling: TeamState = {
        ...createMinimalTeamState(),
        cash: 20_000_000,
        products: [],
      };
      const critical: TeamState = {
        ...createMinimalTeamState(),
        cash: -5_000_000,
      };

      const summaries = FacilitatorReportEngine.generateTeamHealthSummaries([
        { id: "t1", name: "Healthy", state: healthy },
        { id: "t2", name: "Struggling", state: struggling },
        { id: "t3", name: "Critical", state: critical },
      ]);

      const statusMap = Object.fromEntries(summaries.map(s => [s.teamName, s.status]));
      expect(statusMap["Healthy"]).toBe("healthy");
      expect(statusMap["Struggling"]).toBe("struggling");
      expect(statusMap["Critical"]).toBe("critical");
    });
  });
});
