/**
 * L1 Apple — Patent Engine & FacilitatorReportEngine Tests
 *
 * Part A: PatentEngine direct tests (filing, blocking, licensing)
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
  createMinimalMarketState,
  createMinimalEngineContext,
} from "@/engine/testkit/scenarioGenerator";
import { PATENT_FILING_COST, PATENT_BLOCKING_POWER } from "@/engine/types/patents";
import type { TeamState } from "@/engine/types/state";
import type { Patent } from "@/engine/types/patents";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a TeamState that has a specific tech already unlocked so we can
 * file a patent on it. Uses "bat_2a" (Fast Charging, tier 2) by default.
 */
function stateWithUnlockedTech(
  techId: string = "bat_2a",
  cashOverride?: number,
): TeamState {
  const base = createMinimalTeamState();
  return {
    ...base,
    cash: cashOverride ?? 500_000_000,
    unlockedTechnologies: [...(base.unlockedTechnologies ?? []), techId],
  };
}

/**
 * Convenience: file a patent and return the updated registry + result.
 */
function fileSinglePatent(
  registry: PatentRegistry,
  teamId: string,
  techId: string,
  state: TeamState,
  round: number = 1,
  ctx = createMinimalEngineContext("patent-test", round, teamId),
) {
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
  // PAT-01 — File a patent
  // -------------------------------------------------------------------------
  describe("PAT-01 — File a patent", () => {
    it("successfully files a patent on a tier-2 unlocked tech", () => {
      const registry = initializePatentRegistry();
      const state = stateWithUnlockedTech("bat_2a");
      const initialCash = state.cash;

      const { updatedRegistry, result } = fileSinglePatent(
        registry,
        "team-A",
        "bat_2a",
        state,
      );

      // A new patent should appear
      expect(result.newPatents).toHaveLength(1);
      const patent = result.newPatents[0];
      expect(patent.techId).toBe("bat_2a");
      expect(patent.ownerId).toBe("team-A");
      expect(patent.status).toBe("active");
      expect(patent.family).toBe("battery");
      expect(patent.tier).toBe(2);
      expect(patent.blockingPower).toBeGreaterThan(0);
      expect(patent.exclusiveBonus).toBeGreaterThan(0);

      // Registry should now list this tech as filed
      expect(updatedRegistry.filedTechs["bat_2a"]).toBe("team-A");
      expect(updatedRegistry.patents).toHaveLength(1);

      // Filing cost should be deducted via licensingRevenue (negative = cost)
      const filingCost = PATENT_FILING_COST[2]; // tier 2 = $5M
      expect(result.licensingRevenue["team-A"]).toBe(-filingCost);

      // Messages should mention the filing
      expect(result.messages.some(m => m.includes("filed patent"))).toBe(true);
    });

    it("rejects filing on a tier-1 tech (not patentable)", () => {
      const registry = initializePatentRegistry();
      // bat_1a is tier 1
      const state = stateWithUnlockedTech("bat_1a");

      const { result } = fileSinglePatent(
        registry,
        "team-A",
        "bat_1a",
        state,
      );

      expect(result.newPatents).toHaveLength(0);
      expect(result.messages.some(m => m.includes("Tier 1"))).toBe(true);
    });

    it("rejects filing if team has not researched the tech", () => {
      const registry = initializePatentRegistry();
      const state = createMinimalTeamState(); // no extra unlocked techs

      const { result } = PatentEngine.processRound(
        registry,
        [{ teamId: "team-A", state, decisions: { filings: [{ techId: "bat_2a" }] } }],
        1,
      );

      expect(result.newPatents).toHaveLength(0);
      expect(result.messages.some(m => m.includes("not researched"))).toBe(true);
    });

    it("rejects filing if team cannot afford the cost", () => {
      const registry = initializePatentRegistry();
      // Give team only $1 cash — well below the $5M tier-2 filing cost
      const state = stateWithUnlockedTech("bat_2a", 1);

      const { result } = fileSinglePatent(
        registry,
        "team-A",
        "bat_2a",
        state,
      );

      expect(result.newPatents).toHaveLength(0);
      expect(result.messages.some(m => m.includes("Cannot afford"))).toBe(true);
    });

    it("enforces first-to-file: second team cannot patent the same tech", () => {
      let registry = initializePatentRegistry();
      const stateA = stateWithUnlockedTech("bat_2a");
      const stateB = stateWithUnlockedTech("bat_2a");

      // Team A files first
      const r1 = fileSinglePatent(registry, "team-A", "bat_2a", stateA, 1);
      registry = r1.updatedRegistry;
      expect(r1.result.newPatents).toHaveLength(1);

      // Team B tries to file on the same tech
      const r2 = fileSinglePatent(registry, "team-B", "bat_2a", stateB, 2);
      expect(r2.result.newPatents).toHaveLength(0);
      expect(r2.result.messages.some(m => m.includes("already filed"))).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // PAT-02 — Patent blocking
  // -------------------------------------------------------------------------
  describe("PAT-02 — Patent blocking", () => {
    it("Team B receives blocking penalty when Team A holds patent on shared tech", () => {
      const registry = initializePatentRegistry();
      const stateA = stateWithUnlockedTech("bat_2a");
      const stateB = stateWithUnlockedTech("bat_2a"); // B also has the tech unlocked

      // Process both teams together: A files, B does nothing
      const ctx = createMinimalEngineContext("blocking-test", 1, "team-A");
      const { updatedRegistry, result } = PatentEngine.processRound(
        registry,
        [
          { teamId: "team-A", state: stateA, decisions: { filings: [{ techId: "bat_2a" }] } },
          { teamId: "team-B", state: stateB, decisions: {} },
        ],
        1,
        ctx,
      );

      // Patent should be filed by A
      expect(result.newPatents).toHaveLength(1);
      expect(result.newPatents[0].ownerId).toBe("team-A");

      // Blocking penalties: B should be penalized in the "battery" family
      const penaltyB = result.blockingPenalties["team-B"];
      expect(penaltyB).toBeDefined();
      expect(penaltyB.battery).toBeGreaterThan(0);
      expect(penaltyB.battery).toBe(PATENT_BLOCKING_POWER[2]); // tier 2 blocking power = 5%

      // A should NOT be blocked by its own patent
      const penaltyA = result.blockingPenalties["team-A"];
      expect(penaltyA.battery ?? 0).toBe(0);
    });

    it("licensing removes the blocking penalty", () => {
      let registry = initializePatentRegistry();
      const stateA = stateWithUnlockedTech("bat_2a");
      const stateB = stateWithUnlockedTech("bat_2a");

      // Round 1: A files patent
      const ctx1 = createMinimalEngineContext("lic-test", 1, "team-A");
      const r1 = PatentEngine.processRound(
        registry,
        [
          { teamId: "team-A", state: stateA, decisions: { filings: [{ techId: "bat_2a" }] } },
          { teamId: "team-B", state: stateB, decisions: {} },
        ],
        1,
        ctx1,
      );
      registry = r1.updatedRegistry;
      const patentId = r1.result.newPatents[0].id;

      // Confirm B is blocked
      expect(r1.result.blockingPenalties["team-B"].battery).toBeGreaterThan(0);

      // Round 2: B requests license
      const ctx2 = createMinimalEngineContext("lic-test-r2", 2, "team-A");
      const r2 = PatentEngine.processRound(
        registry,
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
        ctx2,
      );

      // After licensing, B should not have a battery blocking penalty
      const penaltyB = r2.result.blockingPenalties["team-B"];
      expect(penaltyB.battery ?? 0).toBe(0);

      // Licensing revenue: A earns fee, B pays fee
      expect(r2.result.licensingRevenue["team-A"]).toBeGreaterThan(0);
      expect(r2.result.licensingRevenue["team-B"]).toBeLessThan(0);
    });

    it("patent expires after its duration", () => {
      let registry = initializePatentRegistry();
      const stateA = stateWithUnlockedTech("bat_2a");
      const stateB = stateWithUnlockedTech("bat_2a");

      // File at round 1 — tier-2 patents last 8 rounds (expires round 9)
      const ctx1 = createMinimalEngineContext("expire-test", 1, "team-A");
      const r1 = PatentEngine.processRound(
        registry,
        [
          { teamId: "team-A", state: stateA, decisions: { filings: [{ techId: "bat_2a" }] } },
          { teamId: "team-B", state: stateB, decisions: {} },
        ],
        1,
        ctx1,
      );
      registry = r1.updatedRegistry;
      const patent = r1.result.newPatents[0];
      expect(patent.expiresRound).toBe(1 + 8); // round 9

      // Process round at expiry time
      const ctx9 = createMinimalEngineContext("expire-test-r9", 9, "team-A");
      const r9 = PatentEngine.processRound(
        registry,
        [
          { teamId: "team-A", state: stateA, decisions: {} },
          { teamId: "team-B", state: stateB, decisions: {} },
        ],
        9,
        ctx9,
      );

      expect(r9.result.expiredPatents).toHaveLength(1);
      expect(r9.result.expiredPatents[0].techId).toBe("bat_2a");

      // After expiry, B should no longer be blocked
      const penaltyB = r9.result.blockingPenalties["team-B"];
      expect(penaltyB.battery ?? 0).toBe(0);
    });

    it("patent challenge can invalidate a patent", () => {
      let registry = initializePatentRegistry();
      const stateA = stateWithUnlockedTech("bat_2a");
      const stateB = stateWithUnlockedTech("bat_2a");

      // Round 1: A files
      const ctx1 = createMinimalEngineContext("chal-test", 1, "team-A");
      const r1 = PatentEngine.processRound(
        registry,
        [
          { teamId: "team-A", state: stateA, decisions: { filings: [{ techId: "bat_2a" }] } },
          { teamId: "team-B", state: stateB, decisions: {} },
        ],
        1,
        ctx1,
      );
      registry = r1.updatedRegistry;
      const patentId = r1.result.newPatents[0].id;

      // Round 2: B challenges — use a seeded context so roll is deterministic
      const ctx2 = createMinimalEngineContext("chal-test-r2", 2, "team-B");
      const r2 = PatentEngine.processRound(
        registry,
        [
          { teamId: "team-A", state: stateA, decisions: {} },
          {
            teamId: "team-B",
            state: stateB,
            decisions: { challenges: [{ patentId }] },
          },
        ],
        2,
        ctx2,
      );

      // Challenge should have been processed (success or fail based on RNG)
      expect(r2.result.challengeResults).toHaveLength(1);
      expect(r2.result.challengeResults[0].patentId).toBe(patentId);
      expect(r2.result.challengeResults[0].challengerId).toBe("team-B");
      expect(typeof r2.result.challengeResults[0].success).toBe("boolean");
      // Cost is always deducted regardless of outcome
      expect(r2.result.challengeResults[0].cost).toBe(10_000_000);
    });
  });

  // -------------------------------------------------------------------------
  // Utility method tests
  // -------------------------------------------------------------------------
  describe("Utility methods", () => {
    it("getTeamPatents returns only active patents for the team", () => {
      let registry = initializePatentRegistry();
      const stateA = stateWithUnlockedTech("bat_2a");

      const ctx = createMinimalEngineContext("util-test", 1, "team-A");
      const { updatedRegistry } = fileSinglePatent(registry, "team-A", "bat_2a", stateA, 1, ctx);

      const teamPatents = PatentEngine.getTeamPatents(updatedRegistry, "team-A");
      expect(teamPatents).toHaveLength(1);
      expect(teamPatents[0].ownerId).toBe("team-A");

      // Other team should have none
      expect(PatentEngine.getTeamPatents(updatedRegistry, "team-B")).toHaveLength(0);
    });

    it("getPatentableTechs excludes already-filed techs", () => {
      let registry = initializePatentRegistry();
      const stateA = stateWithUnlockedTech("bat_2a");

      const ctx = createMinimalEngineContext("pat-techs", 1, "team-A");
      const { updatedRegistry } = fileSinglePatent(registry, "team-A", "bat_2a", stateA, 1, ctx);

      // bat_2a is now filed, so should not appear in patentable list
      const patentable = PatentEngine.getPatentableTechs(updatedRegistry, ["bat_2a", "cam_2a"]);
      expect(patentable).not.toContain("bat_2a");
      expect(patentable).toContain("cam_2a");
    });
  });
});

// ===========================================================================
// PART B — FacilitatorReportEngine Direct Tests
// ===========================================================================

describe("FacilitatorReportEngine — Direct Tests", () => {
  // -------------------------------------------------------------------------
  // Helpers to build team inputs for FacilitatorReportEngine
  // -------------------------------------------------------------------------
  function makeTeamInput(
    id: string,
    name: string,
    stateOverrides?: Partial<TeamState>,
    previousStates?: TeamState[],
  ) {
    const state = createMinimalTeamState(stateOverrides);
    return { id, name, state, previousStates };
  }

  // -------------------------------------------------------------------------
  // FAC-01 — generateRoundBrief
  // -------------------------------------------------------------------------
  describe("FAC-01 — generateRoundBrief", () => {
    it("produces a valid brief for a 2-team round", () => {
      const teamA = makeTeamInput("t1", "Alpha Corp", {
        revenue: 50_000_000,
        cash: 200_000_000,
      });
      const teamB = makeTeamInput("t2", "Beta Inc", {
        revenue: 30_000_000,
        cash: 150_000_000,
      });

      const brief = FacilitatorReportEngine.generateRoundBrief(
        1,
        [teamA, teamB],
      );

      // headline is non-empty
      expect(brief.headline).toBeTruthy();
      expect(typeof brief.headline).toBe("string");
      expect(brief.headline.length).toBeGreaterThan(0);

      // winnerOfRound.teamId is one of the team IDs
      expect(["t1", "t2"]).toContain(brief.winnerOfRound.teamId);
      expect(brief.winnerOfRound.teamName).toBeTruthy();
      expect(brief.winnerOfRound.reason).toBeTruthy();

      // loserOfRound present
      expect(["t1", "t2"]).toContain(brief.loserOfRound.teamId);

      // conceptSpotlight is present with concept and explanation
      expect(brief.conceptSpotlight).toBeDefined();
      expect(brief.conceptSpotlight.concept).toBeTruthy();
      expect(brief.conceptSpotlight.explanation).toBeTruthy();

      // lookAhead is a non-empty string
      expect(typeof brief.lookAhead).toBe("string");
      expect(brief.lookAhead.length).toBeGreaterThan(0);

      // round number matches
      expect(brief.round).toBe(1);
    });

    it("winner is the team with higher revenue when no previous state exists", () => {
      const highRev = makeTeamInput("t1", "High Revenue Co", {
        revenue: 100_000_000,
        cash: 300_000_000,
      });
      const lowRev = makeTeamInput("t2", "Low Revenue Co", {
        revenue: 10_000_000,
        cash: 300_000_000,
      });

      const brief = FacilitatorReportEngine.generateRoundBrief(
        1,
        [highRev, lowRev],
      );

      // Higher revenue team should be the winner (revenue is the main score driver)
      expect(brief.winnerOfRound.teamId).toBe("t1");
      expect(brief.loserOfRound.teamId).toBe("t2");
    });

    it("handles empty team list gracefully", () => {
      const brief = FacilitatorReportEngine.generateRoundBrief(1, []);

      expect(brief.headline).toContain("No teams");
      expect(brief.winnerOfRound.teamId).toBe("");
      expect(brief.conceptSpotlight.concept).toBe("N/A");
    });

    it("detects key decisions: heavy R&D spending", () => {
      const rdHeavy = makeTeamInput("t1", "R&D Corp", {
        revenue: 100_000_000,
        rdBudget: 40_000_000, // 40% of revenue — triggers key decision
        cash: 200_000_000,
      });
      const normal = makeTeamInput("t2", "Normal Co", {
        revenue: 50_000_000,
        rdBudget: 5_000_000,
        cash: 200_000_000,
      });

      const brief = FacilitatorReportEngine.generateRoundBrief(
        1,
        [rdHeavy, normal],
      );

      // Should have a key decision about R&D
      const rdDecision = brief.keyDecisions.find(
        kd => kd.teamId === "t1" && kd.description.includes("R&D"),
      );
      expect(rdDecision).toBeDefined();
      expect(rdDecision!.consequence).toContain("R&D");
    });

    it("detects revenue growth across rounds with previousStates", () => {
      const prevState = createMinimalTeamState({ revenue: 20_000_000, cash: 200_000_000 });
      const teamA = makeTeamInput(
        "t1",
        "Growing Co",
        { revenue: 80_000_000, cash: 300_000_000 },
        [prevState],
      );
      const teamB = makeTeamInput("t2", "Stable Co", {
        revenue: 30_000_000,
        cash: 200_000_000,
      });

      const brief = FacilitatorReportEngine.generateRoundBrief(
        2,
        [teamA, teamB],
      );

      // A should be winner due to $60M revenue growth
      expect(brief.winnerOfRound.teamId).toBe("t1");
      expect(brief.winnerOfRound.reason).toContain("revenue growth");
    });
  });

  // -------------------------------------------------------------------------
  // FAC-02 — generateTeamHealthSummaries
  // -------------------------------------------------------------------------
  describe("FAC-02 — generateTeamHealthSummaries", () => {
    it("identifies healthy teams (high cash, launched products)", () => {
      const teams = [
        { id: "t1", name: "Healthy Corp", state: createMinimalTeamState({ cash: 200_000_000, revenue: 50_000_000 }) },
      ];

      const summaries = FacilitatorReportEngine.generateTeamHealthSummaries(teams);

      expect(summaries).toHaveLength(1);
      expect(summaries[0].teamId).toBe("t1");
      expect(summaries[0].status).toBe("healthy");
      expect(summaries[0].cash).toBe(200_000_000);
      expect(summaries[0].revenue).toBe(50_000_000);
      expect(summaries[0].productCount).toBeGreaterThan(0);
    });

    it("identifies struggling teams (low cash)", () => {
      const teams = [
        { id: "t1", name: "Low Cash Co", state: createMinimalTeamState({ cash: 10_000_000 }) },
      ];

      const summaries = FacilitatorReportEngine.generateTeamHealthSummaries(teams);

      // cash < 50M triggers struggling
      expect(summaries[0].status).toBe("struggling");
    });

    it("identifies critical teams (negative cash)", () => {
      const teams = [
        { id: "t1", name: "Bankrupt Co", state: createMinimalTeamState({ cash: -5_000_000 }) },
      ];

      const summaries = FacilitatorReportEngine.generateTeamHealthSummaries(teams);

      expect(summaries[0].status).toBe("critical");
    });

    it("identifies struggling teams (no launched products)", () => {
      const state = createMinimalTeamState({ cash: 200_000_000 });
      // Remove all launched products by marking them as in_development
      state.products = state.products.map(p => ({
        ...p,
        developmentStatus: "in_development" as const,
      }));

      const teams = [{ id: "t1", name: "No Products Co", state }];

      const summaries = FacilitatorReportEngine.generateTeamHealthSummaries(teams);

      // productCount === 0 (launched) triggers struggling even with high cash
      expect(summaries[0].status).toBe("struggling");
      expect(summaries[0].productCount).toBe(0);
    });

    it("correctly ranks multiple teams with different health levels", () => {
      const teams = [
        { id: "t1", name: "Healthy", state: createMinimalTeamState({ cash: 200_000_000, revenue: 80_000_000 }) },
        { id: "t2", name: "Struggling", state: createMinimalTeamState({ cash: 20_000_000, revenue: 10_000_000 }) },
        { id: "t3", name: "Critical", state: createMinimalTeamState({ cash: -10_000_000, revenue: 5_000_000 }) },
      ];

      const summaries = FacilitatorReportEngine.generateTeamHealthSummaries(teams);

      expect(summaries).toHaveLength(3);

      const byId = Object.fromEntries(summaries.map(s => [s.teamId, s]));
      expect(byId["t1"].status).toBe("healthy");
      expect(byId["t2"].status).toBe("struggling");
      expect(byId["t3"].status).toBe("critical");
    });

    it("includes techsResearched and achievementScore in summaries", () => {
      const state = createMinimalTeamState({
        cash: 200_000_000,
        unlockedTechnologies: ["bat_1a", "bat_2a", "cam_1a"],
      });

      const teams = [{ id: "t1", name: "Tech Leader", state }];
      const summaries = FacilitatorReportEngine.generateTeamHealthSummaries(teams);

      expect(summaries[0].techsResearched).toBe(3);
      expect(typeof summaries[0].achievementScore).toBe("number");
    });
  });
});
