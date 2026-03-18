/**
 * L1-FAC: FacilitatorReportEngine Tests
 *
 * Tests generateRoundBrief and generatePostGameReport with real engine data.
 */
import { describe, it, expect } from "vitest";
import { FacilitatorReportEngine } from "@/engine/modules/FacilitatorReportEngine";
import { SimulationEngine } from "@/engine/core/SimulationEngine";

function createTeamInput(id: string, name: string) {
  const state = SimulationEngine.createInitialTeamState();
  state.revenue = 50_000_000;
  state.cash = 150_000_000;
  state.brandValue = 0.4;
  return { id, name, state };
}

describe("L1-FAC-01: generateRoundBrief", () => {
  it("returns non-empty brief with valid fields", () => {
    const teams = [
      createTeamInput("team-1", "Alpha Corp"),
      createTeamInput("team-2", "Beta Inc"),
    ];
    // Give team-1 higher revenue to create a winner
    teams[0].state.revenue = 80_000_000;
    teams[1].state.revenue = 40_000_000;

    const brief = FacilitatorReportEngine.generateRoundBrief(1, teams);

    expect(brief).toBeDefined();
    expect(brief.round).toBe(1);
    expect(typeof brief.headline).toBe("string");
    expect(brief.headline.length).toBeGreaterThan(0);
    expect(brief.winnerOfRound).toBeDefined();
    expect(brief.winnerOfRound.teamId).toBeTruthy();
  });

  it("handles empty teams array gracefully", () => {
    const brief = FacilitatorReportEngine.generateRoundBrief(1, []);

    expect(brief).toBeDefined();
    expect(brief.round).toBe(1);
    expect(typeof brief.headline).toBe("string");
  });
});

describe("L1-FAC-02: generatePostGameReport", () => {
  it("returns report with team journeys matching team count", () => {
    const teams = [
      createTeamInput("team-1", "Alpha Corp"),
      createTeamInput("team-2", "Beta Inc"),
    ];
    teams[0].state.revenue = 100_000_000;
    teams[1].state.revenue = 60_000_000;

    // Simulate round history
    const roundHistory = [
      { round: 1, teams: teams.map(t => ({ id: t.id, state: { ...t.state } })) },
      { round: 2, teams: teams.map(t => ({ id: t.id, state: { ...t.state, revenue: t.state.revenue * 1.2 } })) },
    ];

    const report = FacilitatorReportEngine.generatePostGameReport(teams, roundHistory);

    expect(report).toBeDefined();
    expect(typeof report.executiveSummary).toBe("string");
    expect(report.executiveSummary.length).toBeGreaterThan(0);
    expect(report.teamJourneys.length).toBe(2);
  });

  it("handles empty teams gracefully", () => {
    const report = FacilitatorReportEngine.generatePostGameReport([], []);

    expect(report).toBeDefined();
    expect(typeof report.executiveSummary).toBe("string");
    expect(report.teamJourneys.length).toBe(0);
  });

  it("no field in report is null", () => {
    const teams = [createTeamInput("team-1", "Alpha")];
    const report = FacilitatorReportEngine.generatePostGameReport(teams, []);

    expect(report.executiveSummary).not.toBeNull();
    expect(report.teamJourneys).not.toBeNull();
    expect(report.conceptMap).not.toBeNull();
  });
});
