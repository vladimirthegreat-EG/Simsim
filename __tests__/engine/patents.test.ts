/**
 * Patent System Tests
 *
 * Tests patent types, constants, filing costs, durations, and blocking mechanics.
 */

import { describe, it, expect } from "vitest";
import {
  PATENT_FILING_COST,
  PATENT_DURATION,
  PATENT_EXCLUSIVE_BONUS,
  PATENT_BLOCKING_POWER,
  PATENT_CHALLENGE_COST,
  PATENT_CHALLENGE_SUCCESS_RATE,
  PATENT_LICENSE_FEE,
} from "../../engine/types/patents";
import type { Patent, PatentDecisions, PatentResolutionResult } from "../../engine/types/patents";

describe("Patent System", () => {
  describe("PATENT_FILING_COST", () => {
    it("should have costs for tiers 2-5", () => {
      expect(PATENT_FILING_COST[2]).toBeDefined();
      expect(PATENT_FILING_COST[3]).toBeDefined();
      expect(PATENT_FILING_COST[4]).toBeDefined();
      expect(PATENT_FILING_COST[5]).toBeDefined();
    });

    it("costs should increase with tier", () => {
      expect(PATENT_FILING_COST[3]).toBeGreaterThan(PATENT_FILING_COST[2]);
      expect(PATENT_FILING_COST[4]).toBeGreaterThan(PATENT_FILING_COST[3]);
      expect(PATENT_FILING_COST[5]).toBeGreaterThan(PATENT_FILING_COST[4]);
    });

    it("should have correct values ($5M-$15M)", () => {
      expect(PATENT_FILING_COST[2]).toBe(5_000_000);
      expect(PATENT_FILING_COST[5]).toBe(15_000_000);
    });
  });

  describe("PATENT_DURATION", () => {
    it("should have durations for tiers 2-5", () => {
      expect(PATENT_DURATION[2]).toBeDefined();
      expect(PATENT_DURATION[3]).toBeDefined();
      expect(PATENT_DURATION[4]).toBeDefined();
      expect(PATENT_DURATION[5]).toBeDefined();
    });

    it("should be 8-12 rounds", () => {
      for (const tier of [2, 3, 4, 5]) {
        expect(PATENT_DURATION[tier]).toBeGreaterThanOrEqual(8);
        expect(PATENT_DURATION[tier]).toBeLessThanOrEqual(12);
      }
    });
  });

  describe("PATENT_EXCLUSIVE_BONUS", () => {
    it("should increase with tier (5-15%)", () => {
      expect(PATENT_EXCLUSIVE_BONUS[2]).toBe(0.05);
      expect(PATENT_EXCLUSIVE_BONUS[5]).toBe(0.15);
      expect(PATENT_EXCLUSIVE_BONUS[3]).toBeGreaterThan(PATENT_EXCLUSIVE_BONUS[2]);
    });
  });

  describe("PATENT_BLOCKING_POWER", () => {
    it("should increase with tier (5-15%)", () => {
      expect(PATENT_BLOCKING_POWER[2]).toBe(0.05);
      expect(PATENT_BLOCKING_POWER[5]).toBe(0.15);
      expect(PATENT_BLOCKING_POWER[3]).toBeGreaterThan(PATENT_BLOCKING_POWER[2]);
    });
  });

  describe("PATENT_CHALLENGE_COST", () => {
    it("should be $10M", () => {
      expect(PATENT_CHALLENGE_COST).toBe(10_000_000);
    });
  });

  describe("PATENT_CHALLENGE_SUCCESS_RATE", () => {
    it("should be 50%", () => {
      expect(PATENT_CHALLENGE_SUCCESS_RATE).toBe(0.5);
    });
  });

  describe("PATENT_LICENSE_FEE", () => {
    it("should increase with tier", () => {
      expect(PATENT_LICENSE_FEE[3]).toBeGreaterThan(PATENT_LICENSE_FEE[2]);
      expect(PATENT_LICENSE_FEE[4]).toBeGreaterThan(PATENT_LICENSE_FEE[3]);
      expect(PATENT_LICENSE_FEE[5]).toBeGreaterThan(PATENT_LICENSE_FEE[4]);
    });

    it("should range from $1M to $4M", () => {
      expect(PATENT_LICENSE_FEE[2]).toBe(1_000_000);
      expect(PATENT_LICENSE_FEE[5]).toBe(4_000_000);
    });
  });

  describe("Patent type structure", () => {
    it("should create a valid patent object", () => {
      const patent: Patent = {
        id: "patent_bat_2a_team1",
        techId: "bat_2a",
        family: "battery",
        tier: 2,
        ownerId: "team1",
        roundFiled: 3,
        expiresRound: 3 + PATENT_DURATION[2],
        status: "active",
        licensedTo: [],
        licenseFeePerRound: PATENT_LICENSE_FEE[2],
        exclusiveBonus: PATENT_EXCLUSIVE_BONUS[2],
        blockingPower: PATENT_BLOCKING_POWER[2],
      };

      expect(patent.status).toBe("active");
      expect(patent.expiresRound).toBe(11);
      expect(patent.exclusiveBonus).toBe(0.05);
      expect(patent.blockingPower).toBe(0.05);
    });

    it("should support all patent statuses", () => {
      const statuses: Patent["status"][] = ["active", "licensed", "expired", "challenged"];
      for (const status of statuses) {
        const patent: Patent = {
          id: `test_${status}`,
          techId: "bat_2a",
          family: "battery",
          tier: 2,
          ownerId: "team1",
          roundFiled: 1,
          expiresRound: 9,
          status,
          licensedTo: [],
          licenseFeePerRound: 1_000_000,
          exclusiveBonus: 0.05,
          blockingPower: 0.05,
        };
        expect(patent.status).toBe(status);
      }
    });

    it("should track licensing relationships", () => {
      const patent: Patent = {
        id: "pat1",
        techId: "cam_3a",
        family: "camera",
        tier: 3,
        ownerId: "team1",
        roundFiled: 4,
        expiresRound: 14,
        status: "active",
        licensedTo: ["team2", "team3"],
        licenseFeePerRound: PATENT_LICENSE_FEE[3],
        exclusiveBonus: PATENT_EXCLUSIVE_BONUS[3],
        blockingPower: PATENT_BLOCKING_POWER[3],
      };

      expect(patent.licensedTo).toHaveLength(2);
      expect(patent.licensedTo).toContain("team2");
    });
  });

  describe("Patent decisions", () => {
    it("should support filing, licensing, and challenge decisions", () => {
      const decisions: PatentDecisions = {
        filings: [{ techId: "bat_2a" }],
        licenseRequests: [{ patentId: "pat1", fromTeamId: "team2" }],
        challenges: [{ patentId: "pat2" }],
      };

      expect(decisions.filings).toHaveLength(1);
      expect(decisions.licenseRequests).toHaveLength(1);
      expect(decisions.challenges).toHaveLength(1);
    });

    it("should allow empty decisions", () => {
      const decisions: PatentDecisions = {};
      expect(decisions.filings).toBeUndefined();
      expect(decisions.licenseRequests).toBeUndefined();
      expect(decisions.challenges).toBeUndefined();
    });
  });

  describe("Patent resolution", () => {
    it("should support all resolution result fields", () => {
      const result: PatentResolutionResult = {
        newPatents: [],
        expiredPatents: [],
        challengeResults: [
          { patentId: "pat1", challengerId: "team2", success: true, cost: PATENT_CHALLENGE_COST },
        ],
        licensingRevenue: { team1: 2_000_000, team2: -2_000_000 },
        blockingPenalties: { team3: { camera: 0.08 } },
        messages: ["Team 2 successfully challenged Team 1's patent"],
      };

      expect(result.challengeResults).toHaveLength(1);
      expect(result.licensingRevenue["team1"]).toBe(2_000_000);
      expect(result.blockingPenalties["team3"]?.camera).toBe(0.08);
    });
  });
});
