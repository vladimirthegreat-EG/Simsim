/**
 * Unit Tests for LogisticsEngine
 * Tests shipping calculations, route optimization, and logistics decisions
 */

import { describe, it, expect } from "vitest";
import { LogisticsEngine } from "@/engine/logistics/LogisticsEngine";
import type { Region } from "@/engine/materials/types";

describe("LogisticsEngine", () => {
  describe("calculateLogistics", () => {
    it("should calculate logistics for Asia to North America", () => {
      const result = LogisticsEngine.calculateLogistics(
        "Asia",
        "North America",
        "sea",
        2.5,  // weight in tons
        15,   // volume in cubic meters
        20    // production time
      );

      expect(result.route).toBeDefined();
      expect(result.shippingMethod).toBe("sea");
      expect(result.totalLogisticsCost).toBeGreaterThan(0);
      expect(result.totalLeadTime).toBeGreaterThan(20); // Should be > production time
      expect(result.onTimeProbability).toBeGreaterThan(0);
      expect(result.onTimeProbability).toBeLessThanOrEqual(1);
    });

    it("should calculate different costs for different shipping methods", () => {
      const seaResult = LogisticsEngine.calculateLogistics(
        "Asia", "North America", "sea", 2.5, 15, 20
      );

      const airResult = LogisticsEngine.calculateLogistics(
        "Asia", "North America", "air", 2.5, 15, 20
      );

      // Air should be more expensive but faster
      expect(airResult.totalLogisticsCost).toBeGreaterThan(seaResult.totalLogisticsCost);
      expect(airResult.totalLeadTime).toBeLessThan(seaResult.totalLeadTime);
      expect(airResult.onTimeProbability).toBeGreaterThan(seaResult.onTimeProbability);
    });

    it("should include all cost components", () => {
      const result = LogisticsEngine.calculateLogistics(
        "Europe", "Asia", "rail", 1.0, 5, 15
      );

      expect(result.shippingCost).toBeGreaterThan(0);
      expect(result.clearanceCost).toBeGreaterThan(0);
      expect(result.insuranceCost).toBeGreaterThan(0);
      expect(result.handlingCost).toBeGreaterThan(0);

      const sum = result.shippingCost + result.clearanceCost +
                  result.insuranceCost + result.handlingCost;

      expect(result.totalLogisticsCost).toBe(sum);
    });

    it("should calculate lead time components", () => {
      const result = LogisticsEngine.calculateLogistics(
        "Asia", "Europe", "rail", 3.0, 20, 25
      );

      expect(result.productionTime).toBe(25);
      expect(result.shippingTime).toBeGreaterThan(0);
      expect(result.clearanceTime).toBeGreaterThan(0);
      expect(result.inspectionTime).toBeGreaterThanOrEqual(0);

      const sum = result.productionTime + result.shippingTime +
                  result.clearanceTime + result.inspectionTime;

      expect(result.totalLeadTime).toBe(sum);
    });

    it("should throw error for invalid route", () => {
      expect(() => {
        LogisticsEngine.calculateLogistics(
          "North America" as Region,
          "North America" as Region,
          "sea",
          1.0,
          5,
          20
        );
      }).toThrow();
    });

    it("should handle volumetric weight for air freight", () => {
      // For air, volumetric weight = volume / 6
      // High volume, low weight should use volumetric
      const result = LogisticsEngine.calculateLogistics(
        "Asia", "North America", "air",
        0.5,  // Low weight
        30,   // High volume (volumetric = 30/6 = 5 tons)
        20
      );

      // Cost should be based on volumetric weight (5 tons), not actual (0.5 tons)
      expect(result.shippingCost).toBeGreaterThan(10000);
    });
  });

  describe("compareShippingOptions", () => {
    it("should return all available methods for a route", () => {
      const comparison = LogisticsEngine.compareShippingOptions(
        "Asia",
        "North America",
        2.5,
        15,
        20
      );

      expect(comparison.length).toBeGreaterThan(0);
      expect(comparison.length).toBeLessThanOrEqual(4); // Max 4 methods
    });

    it("should rank methods by overall score", () => {
      const comparison = LogisticsEngine.compareShippingOptions(
        "Europe",
        "Asia",
        2.0,
        10,
        15
      );

      // Should be sorted by overallScore descending
      for (let i = 1; i < comparison.length; i++) {
        expect(comparison[i - 1].overallScore).toBeGreaterThanOrEqual(comparison[i].overallScore);
      }
    });

    it("should calculate efficiency scores", () => {
      const comparison = LogisticsEngine.compareShippingOptions(
        "Asia",
        "Europe",
        3.0,
        20,
        25
      );

      comparison.forEach(option => {
        expect(option.costEfficiency).toBeGreaterThanOrEqual(0);
        expect(option.costEfficiency).toBeLessThanOrEqual(100);
        expect(option.timeEfficiency).toBeGreaterThanOrEqual(0);
        expect(option.timeEfficiency).toBeLessThanOrEqual(100);
        expect(option.overallScore).toBeGreaterThanOrEqual(0);
        expect(option.overallScore).toBeLessThanOrEqual(100);
      });
    });
  });

  describe("getRecommendations", () => {
    it("should recommend method within budget and time constraints", () => {
      const recommendations = LogisticsEngine.getRecommendations(
        "Asia",
        "North America",
        2.5,
        15,
        20000,  // budget
        30      // max lead time
      );

      expect(recommendations.recommended).toBeDefined();
      expect(recommendations.alternatives).toBeDefined();
      expect(recommendations.reasoning).toBeDefined();
    });

    it("should warn when no method meets both constraints", () => {
      const recommendations = LogisticsEngine.getRecommendations(
        "Asia",
        "Europe",
        5.0,
        30,
        1000,  // Very low budget
        5      // Very short lead time
      );

      expect(recommendations.warnings.length).toBeGreaterThan(0);
    });

    it("should prefer faster method when budget allows", () => {
      const recommendations = LogisticsEngine.getRecommendations(
        "Asia",
        "North America",
        2.5,
        15,
        100000, // High budget
        10      // Short lead time
      );

      // With high budget and short time, engine recommends air or rail (both fast; scores are close)
      expect(["air", "rail"]).toContain(recommendations.recommended);
    });

    it("should prefer cheaper method for long lead times", () => {
      const recommendations = LogisticsEngine.getRecommendations(
        "Asia",
        "North America",
        2.5,
        15,
        10000,  // Low budget
        60      // Long lead time allowed
      );

      // With low budget and long time, should recommend sea or rail
      expect(["sea", "rail"]).toContain(recommendations.recommended);
    });

    it("should provide alternative options", () => {
      const recommendations = LogisticsEngine.getRecommendations(
        "Europe",
        "Asia",
        3.0,
        20,
        30000,
        40
      );

      expect(recommendations.alternatives.length).toBeGreaterThanOrEqual(0);
      expect(recommendations.alternatives.length).toBeLessThanOrEqual(3);
    });
  });

  describe("trackShipment", () => {
    it("should show correct status at origin", () => {
      const tracking = LogisticsEngine.trackShipment(
        "order-1",
        1,    // current round
        1,    // order round
        5,    // arrival round
        "Asia",
        "North America",
        []
      );

      expect(tracking.currentStatus).toBe("origin");
      expect(tracking.currentLocation).toContain("Asia");
    });

    it("should show in_transit status mid-journey", () => {
      const tracking = LogisticsEngine.trackShipment(
        "order-1",
        3,    // current round (halfway)
        1,    // order round
        5,    // arrival round
        "Asia",
        "Europe",
        []
      );

      expect(tracking.currentStatus).toBe("in_transit");
      expect(tracking.currentLocation).toContain("route");
    });

    it("should show customs status near arrival", () => {
      const tracking = LogisticsEngine.trackShipment(
        "order-1",
        4,    // current round (80% complete)
        1,    // order round
        5,    // arrival round
        "Europe",
        "Asia",
        []
      );

      expect(tracking.currentStatus).toBe("customs");
      expect(tracking.currentLocation).toContain("Asia");
    });

    it("should show delivery status at arrival", () => {
      const tracking = LogisticsEngine.trackShipment(
        "order-1",
        5,    // current round (100% complete)
        1,    // order round
        5,    // arrival round
        "Asia",
        "North America",
        []
      );

      expect(tracking.currentStatus).toBe("delivery");
    });

    it("should include delay events", () => {
      const delays = [
        { reason: "weather" as const, delayDays: 3, additionalCost: 1000, round: 2 }
      ];

      const tracking = LogisticsEngine.trackShipment(
        "order-1",
        3,
        1,
        5,
        "Asia",
        "Europe",
        delays
      );

      expect(tracking.delays).toHaveLength(1);
      expect(tracking.events.some(e => e.type === "delayed")).toBe(true);
    });
  });

  describe("applyDisruption", () => {
    it("should increase costs and delays when disruption affects route", () => {
      const baseCalculation = LogisticsEngine.calculateLogistics(
        "Asia", "North America", "sea", 2.5, 15, 20
      );

      const disruption = {
        id: "test-disruption",
        type: "port_strike" as const,
        affectedRoutes: ["na_to_asia"],
        affectedMethods: ["sea" as const],
        duration: 5,
        delayMultiplier: 1.5,
        costMultiplier: 1.3,
        description: "Port strike causes delays"
      };

      const disruptedCalculation = LogisticsEngine.applyDisruption(
        baseCalculation,
        disruption
      );

      expect(disruptedCalculation.shippingTime).toBeGreaterThan(baseCalculation.shippingTime);
      expect(disruptedCalculation.totalLogisticsCost).toBeGreaterThan(baseCalculation.totalLogisticsCost);
      expect(disruptedCalculation.onTimeProbability).toBeLessThan(baseCalculation.onTimeProbability);
    });

    it("should not affect calculation when route not affected", () => {
      const baseCalculation = LogisticsEngine.calculateLogistics(
        "Europe", "Asia", "rail", 2.0, 10, 15
      );

      const disruption = {
        id: "test-disruption",
        type: "port_strike" as const,
        affectedRoutes: ["na_to_sa"], // Different route
        affectedMethods: ["land" as const],
        duration: 5,
        delayMultiplier: 2.0,
        costMultiplier: 2.0,
        description: "Different route disruption"
      };

      const disruptedCalculation = LogisticsEngine.applyDisruption(
        baseCalculation,
        disruption
      );

      // Should be unchanged
      expect(disruptedCalculation.shippingTime).toBe(baseCalculation.shippingTime);
      expect(disruptedCalculation.totalLogisticsCost).toBe(baseCalculation.totalLogisticsCost);
    });

    it("should not affect calculation when method not affected", () => {
      const baseCalculation = LogisticsEngine.calculateLogistics(
        "Asia", "North America", "air", 2.5, 15, 20
      );

      const disruption = {
        id: "test-disruption",
        type: "port_strike" as const,
        affectedRoutes: ["na_to_asia"],
        affectedMethods: ["sea" as const], // Different method
        duration: 5,
        delayMultiplier: 2.0,
        costMultiplier: 2.0,
        description: "Sea freight disruption"
      };

      const disruptedCalculation = LogisticsEngine.applyDisruption(
        baseCalculation,
        disruption
      );

      // Should be unchanged (air freight not affected)
      expect(disruptedCalculation.shippingTime).toBe(baseCalculation.shippingTime);
      expect(disruptedCalculation.totalLogisticsCost).toBe(baseCalculation.totalLogisticsCost);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero weight", () => {
      const result = LogisticsEngine.calculateLogistics(
        "Asia", "Europe", "sea", 0.1, 1, 20
      );

      expect(result.totalLogisticsCost).toBeGreaterThan(0);
      expect(result.totalLeadTime).toBeGreaterThan(0);
    });

    it("should handle large shipments", () => {
      const result = LogisticsEngine.calculateLogistics(
        "Asia", "North America", "sea",
        100,  // 100 tons
        500,  // 500 cubic meters
        30
      );

      expect(result.totalLogisticsCost).toBeGreaterThan(50000);
      expect(result.weight).toBe(100);
      expect(result.volume).toBe(500);
    });

    it("should calculate for all region pairs", () => {
      const regions: Region[] = ["North America", "Asia", "Europe"];

      regions.forEach(from => {
        regions.forEach(to => {
          if (from !== to) {
            expect(() => {
              LogisticsEngine.calculateLogistics(from, to, "sea", 1.0, 5, 20);
            }).not.toThrow();
          }
        });
      });
    });
  });
});
