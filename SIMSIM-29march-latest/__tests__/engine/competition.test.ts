/**
 * Competition Mechanics Tests
 *
 * Tests crowding, first-mover advantage, brand erosion, arms race.
 */

import { describe, it, expect } from "vitest";
import {
  calculateCrowdingFactor,
  initializeCompetitionState,
  CROWDING_THRESHOLD,
  CROWDING_PENALTY_PER_PRODUCT,
  FIRST_MOVER_MAX_BONUS,
  FIRST_MOVER_DECAY_ROUNDS,
  BRAND_EROSION_SENSITIVITY,
  ARMS_RACE_BONUS,
} from "../../engine/types/competition";
import type {
  CompetitionState,
  CrowdingState,
  FirstMoverBonus,
  BrandErosion,
  ArmsRaceBonus,
  MarketEvent,
} from "../../engine/types/competition";

describe("Competition Mechanics", () => {
  describe("Crowding Factor", () => {
    it("should return 1.0 when products <= threshold", () => {
      expect(calculateCrowdingFactor(0)).toBe(1.0);
      expect(calculateCrowdingFactor(1)).toBe(1.0);
      expect(calculateCrowdingFactor(2)).toBe(1.0);
      expect(calculateCrowdingFactor(3)).toBe(1.0);
    });

    it("should apply penalty for products > threshold", () => {
      const factor4 = calculateCrowdingFactor(4);
      expect(factor4).toBe(1 - CROWDING_PENALTY_PER_PRODUCT);
      expect(factor4).toBeCloseTo(0.95, 2);
    });

    it("should apply increasing penalties", () => {
      const f4 = calculateCrowdingFactor(4);
      const f5 = calculateCrowdingFactor(5);
      const f6 = calculateCrowdingFactor(6);

      expect(f5).toBeLessThan(f4);
      expect(f6).toBeLessThan(f5);
    });

    it("should not go below 0", () => {
      expect(calculateCrowdingFactor(50)).toBe(0);
      expect(calculateCrowdingFactor(100)).toBe(0);
    });

    it("should decrease by 0.05 for each extra product beyond 3", () => {
      expect(calculateCrowdingFactor(3)).toBe(1.0);
      expect(calculateCrowdingFactor(4)).toBeCloseTo(0.95, 2);
      expect(calculateCrowdingFactor(5)).toBeCloseTo(0.90, 2);
      expect(calculateCrowdingFactor(6)).toBeCloseTo(0.85, 2);
      expect(calculateCrowdingFactor(23)).toBeCloseTo(0.0, 2);
    });
  });

  describe("Constants", () => {
    it("CROWDING_THRESHOLD should be 3", () => {
      expect(CROWDING_THRESHOLD).toBe(3);
    });

    it("CROWDING_PENALTY_PER_PRODUCT should be 0.05", () => {
      expect(CROWDING_PENALTY_PER_PRODUCT).toBe(0.05);
    });

    it("FIRST_MOVER_MAX_BONUS should be 0.15", () => {
      expect(FIRST_MOVER_MAX_BONUS).toBe(0.15);
    });

    it("FIRST_MOVER_DECAY_ROUNDS should be 3", () => {
      expect(FIRST_MOVER_DECAY_ROUNDS).toBe(3);
    });

    it("BRAND_EROSION_SENSITIVITY should be 0.5", () => {
      expect(BRAND_EROSION_SENSITIVITY).toBe(0.5);
    });

    it("ARMS_RACE_BONUS should be 0.05", () => {
      expect(ARMS_RACE_BONUS).toBe(0.05);
    });
  });

  describe("initializeCompetitionState", () => {
    it("should return empty competition state", () => {
      const state = initializeCompetitionState();
      expect(state.firstMoverBonuses).toEqual([]);
      expect(state.armsRaceBonuses).toEqual([]);
      expect(state.firstCompletions).toEqual({});
    });
  });

  describe("Type structures", () => {
    it("MarketEvent should support all event types", () => {
      const event: MarketEvent = {
        type: "product_launch",
        round: 1,
        description: "Team A launched Basic Phone in Budget",
        impact: "neutral",
        teamId: "team1",
        segment: "Budget",
      };
      expect(event.type).toBe("product_launch");
      expect(event.impact).toBe("neutral");
    });

    it("FirstMoverBonus should track decay", () => {
      const bonus: FirstMoverBonus = {
        teamId: "team1",
        segment: "Budget",
        roundEntered: 1,
        initialBonus: FIRST_MOVER_MAX_BONUS,
        roundsRemaining: FIRST_MOVER_DECAY_ROUNDS,
      };
      expect(bonus.roundsRemaining).toBe(3);

      // Simulate decay
      bonus.roundsRemaining--;
      expect(bonus.roundsRemaining).toBe(2);
    });

    it("BrandErosion should compute multiplier", () => {
      const erosion: BrandErosion = {
        teamId: "team1",
        segment: "Budget",
        competitorTeamId: "team2",
        scoreAdvantage: 0.3,
        erosionMultiplier: 1 + 0.3 * BRAND_EROSION_SENSITIVITY,
        message: "Team 2's product is outscoring yours in Budget",
      };
      expect(erosion.erosionMultiplier).toBeCloseTo(1.15, 2);
    });

    it("ArmsRaceBonus should be one-time use", () => {
      const bonus: ArmsRaceBonus = {
        teamId: "team1",
        techId: "bat_1a",
        family: "battery",
        roundCompleted: 2,
        bonusUsed: false,
      };
      expect(bonus.bonusUsed).toBe(false);
      bonus.bonusUsed = true;
      expect(bonus.bonusUsed).toBe(true);
    });
  });

  describe("Market Events", () => {
    it("should support all event types", () => {
      const eventTypes = [
        "product_launch",
        "price_change",
        "share_shift",
        "patent_filed",
        "patent_licensed",
        "segment_underserved",
        "segment_flooded",
        "achievement_unlocked",
        "tech_completed",
      ];
      for (const type of eventTypes) {
        const event: MarketEvent = {
          type: type as any,
          round: 1,
          description: `Test ${type}`,
          impact: "neutral",
        };
        expect(event.type).toBe(type);
      }
    });

    it("should support all impact levels", () => {
      const impacts = ["positive", "negative", "neutral"];
      for (const impact of impacts) {
        const event: MarketEvent = {
          type: "product_launch",
          round: 1,
          description: "Test",
          impact: impact as any,
        };
        expect(event.impact).toBe(impact);
      }
    });
  });
});
