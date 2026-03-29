/**
 * Facilitator Report Types Tests
 *
 * Tests the facilitator report type structures and validates
 * that all interfaces can be properly constructed.
 * FacilitatorReportEngine integration tests will be added once the engine is created.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setRandomSeed } from "../../engine/utils";
import { SimulationEngine } from "../../engine/core/SimulationEngine";
import type {
  FacilitatorBrief,
  FacilitatorKeyDecision,
  ConceptSpotlight,
  PostGameReport,
  TeamJourney,
  ConceptMapEntry,
  TeamAchievementAnalysis,
  MarketTimelineEntry,
  WhatIfScenario,
  DiscussionGuide,
  DiscussionQuestion,
  DiscussionCategory,
  ParticipantScorecard,
  TeamHealthSummary,
  CompetitiveTension,
} from "../../engine/types/facilitator";

beforeEach(() => {
  setRandomSeed("test-seed-facilitator");
});

describe("Facilitator Report Types", () => {
  describe("FacilitatorBrief", () => {
    it("should construct a valid round brief", () => {
      const brief: FacilitatorBrief = {
        round: 3,
        headline: "Round 3: Alpha Corp dominates Budget with aggressive pricing",
        winnerOfRound: { teamId: "team1", teamName: "Alpha Corp", reason: "Gained 15% Budget market share" },
        loserOfRound: { teamId: "team2", teamName: "Beta Inc", reason: "Lost 10% share in General" },
        keyDecisions: [
          {
            teamId: "team1",
            teamName: "Alpha Corp",
            description: "Launched Ultra Endurance phone",
            consequence: "Gained 15% Budget share",
          },
        ],
        conceptSpotlight: {
          concept: "First-Mover Advantage",
          explanation: "Alpha Corp entered Budget early and earned a 15% bonus",
        },
        lookAhead: "Watch for Beta Inc's response in the General segment",
      };

      expect(brief.round).toBe(3);
      expect(brief.keyDecisions).toHaveLength(1);
      expect(brief.conceptSpotlight.concept).toBe("First-Mover Advantage");
    });
  });

  describe("PostGameReport", () => {
    it("should construct a valid post-game report", () => {
      const report: PostGameReport = {
        executiveSummary: "Alpha Corp won with 150 achievement points. Key turning point: Round 5 patent filing.",
        teamJourneys: [
          {
            teamId: "team1",
            teamName: "Alpha Corp",
            strategyArc: "Started budget-focused, pivoted to premium in Round 8",
            keyDecisions: "Filed 3 patents, launched flagship in Round 10",
            competitiveInteractions: "Blocked Beta Inc from camera tech via patent",
            learningSummary: "Demonstrated successful market timing and IP strategy",
          },
        ],
        conceptMap: [
          {
            concept: "Price War",
            whereAppeared: "Budget segment, Rounds 4-6 (Alpha vs Beta)",
            whatHappened: "Both teams cut prices below $200, eroding margins",
          },
        ],
        achievementAnalysis: [
          {
            teamId: "team1",
            teamName: "Alpha Corp",
            earned: [{ id: "tech_first_t1", roundUnlocked: 2, points: 5 }],
            missed: ["tech_tier5"],
            strategicInsight: "Focused on market breadth over tech depth",
          },
        ],
        marketTimeline: [
          {
            round: 1,
            segment: "Budget",
            event: "Alpha Corp entered Budget",
            sharesBefore: {},
            sharesAfter: { team1: 0.25 },
          },
        ],
        whatIfScenarios: [
          {
            teamId: "team2",
            teamName: "Beta Inc",
            decisionRound: 5,
            actualDecision: "Invested in AI research",
            alternativeDecision: "Could have filed a camera patent to block Alpha",
            estimatedImpact: "Estimated +20 achievement points",
            caveat: "This is an estimate, not a definitive prediction",
          },
        ],
      };

      expect(report.teamJourneys).toHaveLength(1);
      expect(report.conceptMap).toHaveLength(1);
      expect(report.whatIfScenarios[0].caveat).toContain("estimate");
    });
  });

  describe("DiscussionGuide", () => {
    it("should support all 7 discussion categories", () => {
      const categories: DiscussionCategory[] = [
        "strategic",
        "competitive",
        "resource",
        "market_signals",
        "ethics",
        "adaptability",
        "real_world",
      ];

      const questions: DiscussionQuestion[] = categories.map((cat) => ({
        category: cat,
        question: `What did you learn about ${cat}?`,
        context: "Based on game events",
      }));

      const guide: DiscussionGuide = { questions };
      expect(guide.questions).toHaveLength(7);

      const foundCategories = new Set(guide.questions.map((q) => q.category));
      for (const cat of categories) {
        expect(foundCategories.has(cat)).toBe(true);
      }
    });
  });

  describe("ParticipantScorecard", () => {
    it("should construct a valid scorecard", () => {
      const scorecard: ParticipantScorecard = {
        teamId: "team1",
        teamName: "Alpha Corp",
        strategySummary: "Tech-focused strategy emphasizing battery and camera innovations",
        strengths: ["R&D investment", "Patent strategy", "Market timing"],
        growthAreas: ["Cost management", "Segment diversification"],
        keyDecisionsAndConsequences: [
          {
            round: 3,
            decision: "Filed battery patent",
            consequence: "Blocked 2 competitors, earned $5M licensing revenue",
          },
          {
            round: 8,
            decision: "Launched flagship phone",
            consequence: "Captured 25% Enthusiast share",
          },
        ],
        achievements: [
          { id: "tech_first_t1", roundUnlocked: 2, points: 5 },
          { id: "pat_first_filed", roundUnlocked: 3, points: 10 },
        ],
        achievementsByCategory: {
          Innovation: 2,
          Strategic: 1,
        },
        learningOutcomes: [
          { concept: "Competitive Advantage", demonstrated: true, evidence: "Filed patents to block competitors" },
          { concept: "Price Elasticity", demonstrated: false },
          { concept: "First-Mover Advantage", demonstrated: true, evidence: "Entered Budget early" },
        ],
      };

      expect(scorecard.strengths).toHaveLength(3);
      expect(scorecard.growthAreas).toHaveLength(2);
      expect(scorecard.keyDecisionsAndConsequences).toHaveLength(2);
      expect(scorecard.learningOutcomes.filter((l) => l.demonstrated)).toHaveLength(2);
    });
  });

  describe("TeamHealthSummary", () => {
    it("should classify team health correctly", () => {
      const healthy: TeamHealthSummary = {
        teamId: "team1",
        teamName: "Alpha",
        cash: 150_000_000,
        revenue: 50_000_000,
        productCount: 3,
        techsResearched: 5,
        achievementScore: 30,
        status: "healthy",
      };

      const struggling: TeamHealthSummary = {
        ...healthy,
        teamId: "team2",
        teamName: "Beta",
        cash: 30_000_000,
        productCount: 0,
        status: "struggling",
      };

      const critical: TeamHealthSummary = {
        ...healthy,
        teamId: "team3",
        teamName: "Gamma",
        cash: -5_000_000,
        status: "critical",
      };

      expect(healthy.status).toBe("healthy");
      expect(struggling.status).toBe("struggling");
      expect(critical.status).toBe("critical");
    });
  });

  describe("CompetitiveTension", () => {
    it("should support all tension types", () => {
      const types: CompetitiveTension["type"][] = [
        "price_war",
        "head_to_head",
        "patent_blocking",
        "share_battle",
      ];

      for (const type of types) {
        const tension: CompetitiveTension = {
          teamA: "team1",
          teamB: "team2",
          segment: "Budget",
          type,
          description: `${type} in Budget segment`,
          severity: "medium",
        };
        expect(tension.type).toBe(type);
      }
    });

    it("should support all severity levels", () => {
      const severities: CompetitiveTension["severity"][] = ["low", "medium", "high"];
      for (const severity of severities) {
        const tension: CompetitiveTension = {
          teamA: "t1",
          teamB: "t2",
          segment: "General",
          type: "price_war",
          description: "test",
          severity,
        };
        expect(tension.severity).toBe(severity);
      }
    });
  });
});
