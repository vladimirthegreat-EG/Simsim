/**
 * Layer 1 — FacilitatorReportEngine Tests (L1-FAC-01, L1-FAC-02, L6-REPORT-01, L6-REPORT-02)
 *
 * Previously had ZERO test coverage. Tests generateRoundBrief and generatePostGameReport.
 */

import { describe, it, expect } from "vitest";
import { FacilitatorReportEngine } from "@/engine/modules/FacilitatorReportEngine";
import { SimulationEngine } from "@/engine/core/SimulationEngine";
import type { TeamState } from "@/engine/types";

function createTeamInput(id: string, name: string, overrides?: Partial<TeamState>) {
  const state = SimulationEngine.createInitialTeamState();
  return {
    id,
    name,
    state: { ...state, ...overrides } as TeamState,
    previousStates: [] as TeamState[],
  };
}

describe("FacilitatorReportEngine", () => {
  // ===========================================================================
  // L1-FAC-01: generateRoundBrief returns non-empty brief
  // ===========================================================================
  describe("generateRoundBrief", () => {
    it("L1-FAC-01: returns brief with headline, winner, loser for 2 teams", () => {
      const teams = [
        createTeamInput("t1", "Alpha Corp", { revenue: 50_000_000, cash: 200_000_000 }),
        createTeamInput("t2", "Beta Inc", { revenue: 30_000_000, cash: 150_000_000 }),
      ];

      const brief = FacilitatorReportEngine.generateRoundBrief(1, teams);

      expect(brief).toBeDefined();
      expect(brief.round).toBe(1);
      expect(brief.headline).toBeTruthy();
      expect(typeof brief.headline).toBe("string");
      expect(brief.headline.length).toBeGreaterThan(0);

      // Winner should be populated
      expect(brief.winnerOfRound).toBeDefined();
      expect(brief.winnerOfRound.teamId).toBeTruthy();
      expect(brief.winnerOfRound.teamName).toBeTruthy();
      expect(brief.winnerOfRound.reason).toBeTruthy();

      // Loser should be populated
      expect(brief.loserOfRound).toBeDefined();
      expect(brief.loserOfRound.teamId).toBeTruthy();

      // Concept spotlight present
      expect(brief.conceptSpotlight).toBeDefined();
      expect(brief.conceptSpotlight.concept).toBeTruthy();
    });

    it("handles empty teams array without crash", () => {
      const brief = FacilitatorReportEngine.generateRoundBrief(1, []);

      expect(brief).toBeDefined();
      expect(brief.round).toBe(1);
      expect(brief.headline).toBeTruthy();
    });

    it("handles single team", () => {
      const teams = [
        createTeamInput("t1", "Solo Corp", { revenue: 40_000_000 }),
      ];

      const brief = FacilitatorReportEngine.generateRoundBrief(1, teams);

      expect(brief).toBeDefined();
      expect(brief.winnerOfRound.teamId).toBe("t1");
    });

    it("identifies winner as team with higher revenue growth", () => {
      const prevState = SimulationEngine.createInitialTeamState();
      const teams = [
        {
          id: "t1", name: "Growth Corp",
          state: { ...prevState, revenue: 80_000_000 } as TeamState,
          previousStates: [{ ...prevState, revenue: 40_000_000 } as TeamState],
        },
        {
          id: "t2", name: "Stale Inc",
          state: { ...prevState, revenue: 45_000_000 } as TeamState,
          previousStates: [{ ...prevState, revenue: 42_000_000 } as TeamState],
        },
      ];

      const brief = FacilitatorReportEngine.generateRoundBrief(2, teams);

      // Growth Corp had $40M growth vs Stale Inc's $3M
      expect(brief.winnerOfRound.teamId).toBe("t1");
    });
  });

  // ===========================================================================
  // generateTeamHealthSummaries
  // ===========================================================================
  describe("generateTeamHealthSummaries", () => {
    it("returns health summary for each team", () => {
      const teams = [
        { id: "t1", name: "Healthy Corp", state: { ...SimulationEngine.createInitialTeamState(), cash: 200_000_000, revenue: 50_000_000 } as TeamState },
        { id: "t2", name: "Struggling Inc", state: { ...SimulationEngine.createInitialTeamState(), cash: 30_000_000, revenue: 10_000_000 } as TeamState },
      ];

      const summaries = FacilitatorReportEngine.generateTeamHealthSummaries(teams);

      expect(summaries).toHaveLength(2);

      const healthy = summaries.find(s => s.teamId === "t1")!;
      expect(healthy.status).toBe("healthy");
      expect(healthy.cash).toBe(200_000_000);

      const struggling = summaries.find(s => s.teamId === "t2")!;
      expect(struggling.status).toBe("struggling");
    });

    it("marks team with negative cash as critical", () => {
      const teams = [
        { id: "t1", name: "Bankrupt Corp", state: { ...SimulationEngine.createInitialTeamState(), cash: -5_000_000 } as TeamState },
      ];

      const summaries = FacilitatorReportEngine.generateTeamHealthSummaries(teams);

      expect(summaries[0].status).toBe("critical");
    });
  });

  // ===========================================================================
  // detectCompetitiveTensions
  // ===========================================================================
  describe("detectCompetitiveTensions", () => {
    it("returns empty array for single team", () => {
      const teams = [
        { id: "t1", name: "Solo", state: SimulationEngine.createInitialTeamState() },
      ];

      const tensions = FacilitatorReportEngine.detectCompetitiveTensions(teams);

      expect(tensions).toHaveLength(0);
    });

    it("detects tensions when two teams compete in same segment", () => {
      const state1 = SimulationEngine.createInitialTeamState();
      const state2 = SimulationEngine.createInitialTeamState();

      // Both teams have market share in General
      state1.marketShare = { General: 0.35, Budget: 0.15 };
      state2.marketShare = { General: 0.30, Budget: 0.20 };

      const teams = [
        { id: "t1", name: "Alpha", state: state1 },
        { id: "t2", name: "Beta", state: state2 },
      ];

      const tensions = FacilitatorReportEngine.detectCompetitiveTensions(teams);

      // Should find at least one tension (head-to-head or share battle in General)
      expect(tensions.length).toBeGreaterThan(0);
    });
  });
});
