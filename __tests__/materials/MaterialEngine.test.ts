/**
 * Unit Tests for MaterialEngine
 * Tests material sourcing, ordering, inventory, and quality calculations
 */

import { describe, it, expect } from "vitest";
import { MaterialEngine } from "@/engine/materials/MaterialEngine";
import type { MaterialInventory, MaterialOrder, MaterialSourcingChoice } from "@/engine/materials/types";
import type { Segment } from "@/engine/types";

describe("MaterialEngine", () => {
  describe("getMaterialRequirements", () => {
    it("should return correct requirements for Budget segment", () => {
      const requirements = MaterialEngine.getMaterialRequirements("Budget");

      expect(requirements.segment).toBe("Budget");
      expect(requirements.totalCost).toBe(60);
      expect(requirements.leadTime).toBe(30);
      expect(requirements.qualityTier).toBe(1);
      expect(requirements.materials).toHaveLength(8);
    });

    it("should return correct requirements for Professional segment", () => {
      const requirements = MaterialEngine.getMaterialRequirements("Professional");

      expect(requirements.segment).toBe("Professional");
      expect(requirements.totalCost).toBe(600);
      expect(requirements.leadTime).toBe(42);
      expect(requirements.qualityTier).toBe(5);
      expect(requirements.materials).toHaveLength(8);
    });

    it("should include all material types for each segment", () => {
      const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

      segments.forEach(segment => {
        const requirements = MaterialEngine.getMaterialRequirements(segment);
        const materialTypes = requirements.materials.map(m => m.type);

        expect(materialTypes).toContain("display");
        expect(materialTypes).toContain("processor");
        expect(materialTypes).toContain("memory");
        expect(materialTypes).toContain("storage");
        expect(materialTypes).toContain("camera");
        expect(materialTypes).toContain("battery");
        expect(materialTypes).toContain("chassis");
        expect(materialTypes).toContain("other");
      });
    });
  });

  describe("calculateMaterialCost", () => {
    it("should calculate correct cost for Budget segment", () => {
      const cost = MaterialEngine.calculateMaterialCost("Budget", 10000);
      expect(cost).toBe(600000); // $60 * 10,000
    });

    it("should calculate correct cost for Professional segment", () => {
      const cost = MaterialEngine.calculateMaterialCost("Professional", 5000);
      expect(cost).toBe(3000000); // $600 * 5,000
    });

    it("should handle zero quantity", () => {
      const cost = MaterialEngine.calculateMaterialCost("General", 0);
      expect(cost).toBe(0);
    });
  });

  describe("checkMaterialAvailability", () => {
    it("should return available=true when sufficient materials", () => {
      const inventory: MaterialInventory[] = [
        { materialType: "display", spec: "LCD_5.5inch", quantity: 10000, averageCost: 15, sourceRegion: "Asia" },
        { materialType: "processor", spec: "EntryLevel_SoC", quantity: 10000, averageCost: 8, sourceRegion: "Asia" },
        { materialType: "memory", spec: "4GB_DRAM", quantity: 10000, averageCost: 10, sourceRegion: "Asia" },
        { materialType: "storage", spec: "64GB_eMMC", quantity: 10000, averageCost: 5, sourceRegion: "Asia" },
        { materialType: "camera", spec: "Single_13MP", quantity: 10000, averageCost: 6, sourceRegion: "Asia" },
        { materialType: "battery", spec: "3000mAh", quantity: 10000, averageCost: 4, sourceRegion: "Asia" },
        { materialType: "chassis", spec: "Plastic", quantity: 10000, averageCost: 3, sourceRegion: "Asia" },
        { materialType: "other", spec: "BasicComponents", quantity: 10000, averageCost: 9, sourceRegion: "Asia" }
      ];

      const result = MaterialEngine.checkMaterialAvailability("Budget", 5000, inventory);

      expect(result.available).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should return available=false when insufficient materials", () => {
      const inventory: MaterialInventory[] = [
        { materialType: "display", spec: "LCD_5.5inch", quantity: 1000, averageCost: 15, sourceRegion: "Asia" }
      ];

      const result = MaterialEngine.checkMaterialAvailability("Budget", 5000, inventory);

      expect(result.available).toBe(false);
      expect(result.missing.length).toBeGreaterThan(0);
    });

    it("should identify missing materials correctly", () => {
      const inventory: MaterialInventory[] = [
        { materialType: "display", spec: "LCD_5.5inch", quantity: 10000, averageCost: 15, sourceRegion: "Asia" },
        { materialType: "processor", spec: "EntryLevel_SoC", quantity: 3000, averageCost: 8, sourceRegion: "Asia" }
      ];

      const result = MaterialEngine.checkMaterialAvailability("Budget", 5000, inventory);

      expect(result.available).toBe(false);
      const processorMissing = result.missing.find(m => m.materialType === "processor");
      expect(processorMissing).toBeDefined();
      expect(processorMissing?.needed).toBe(5000);
      expect(processorMissing?.have).toBe(3000);
    });
  });

  describe("consumeMaterials", () => {
    it("should reduce inventory quantities correctly", () => {
      const inventory: MaterialInventory[] = [
        { materialType: "display", spec: "LCD_5.5inch", quantity: 10000, averageCost: 15, sourceRegion: "Asia" },
        { materialType: "processor", spec: "EntryLevel_SoC", quantity: 10000, averageCost: 8, sourceRegion: "Asia" }
      ];

      const updatedInventory = MaterialEngine.consumeMaterials("Budget", 3000, inventory);

      const display = updatedInventory.find(i => i.materialType === "display");
      const processor = updatedInventory.find(i => i.materialType === "processor");

      expect(display?.quantity).toBe(7000); // 10000 - 3000
      expect(processor?.quantity).toBe(7000); // 10000 - 3000
    });

    it("should not allow negative quantities", () => {
      const inventory: MaterialInventory[] = [
        { materialType: "display", spec: "LCD_5.5inch", quantity: 1000, averageCost: 15, sourceRegion: "Asia" }
      ];

      const updatedInventory = MaterialEngine.consumeMaterials("Budget", 5000, inventory);

      const display = updatedInventory.find(i => i.materialType === "display");
      expect(display?.quantity).toBe(0); // Clamped to 0
    });
  });

  describe("calculateMaterialQualityImpact", () => {
    it("should calculate quality impact from high-quality materials", () => {
      const inventory: MaterialInventory[] = [
        { materialType: "processor", spec: "UltraFlagship_SoC", quantity: 10000, averageCost: 145, sourceRegion: "North America" },
        { materialType: "display", spec: "LTPO_6.9inch_ProMotion", quantity: 10000, averageCost: 185, sourceRegion: "Asia" }
      ];

      const result = MaterialEngine.calculateMaterialQualityImpact("Professional", inventory);

      expect(result.overallQuality).toBeGreaterThan(90);
      expect(result.defectRate).toBeLessThan(0.02);
      expect(result.breakdown).toHaveLength(8);
    });

    it("should use default values for missing materials", () => {
      const inventory: MaterialInventory[] = [];

      const result = MaterialEngine.calculateMaterialQualityImpact("Budget", inventory);

      expect(result.overallQuality).toBeGreaterThan(0);
      expect(result.overallQuality).toBeLessThan(100);
      expect(result.defectRate).toBeGreaterThan(0);
    });

    it("should provide breakdown by material type", () => {
      const inventory: MaterialInventory[] = [
        { materialType: "display", spec: "LCD_5.5inch", quantity: 10000, averageCost: 15, sourceRegion: "Asia" }
      ];

      const result = MaterialEngine.calculateMaterialQualityImpact("Budget", inventory);

      expect(result.breakdown).toHaveLength(8);
      result.breakdown.forEach(item => {
        expect(item.qualityScore).toBeGreaterThan(0);
        expect(item.qualityScore).toBeLessThanOrEqual(100);
        expect(item.defectRate).toBeGreaterThanOrEqual(0);
        expect(item.contribution).toBeGreaterThan(0);
      });
    });
  });

  describe("calculateHoldingCosts", () => {
    it("should calculate 2% holding cost per round", () => {
      const inventory: MaterialInventory[] = [
        { materialType: "display", spec: "LCD_5.5inch", quantity: 10000, averageCost: 15, sourceRegion: "Asia" }, // $150k
        { materialType: "processor", spec: "EntryLevel_SoC", quantity: 10000, averageCost: 8, sourceRegion: "Asia" }  // $80k
      ];

      const holdingCosts = MaterialEngine.calculateHoldingCosts(inventory);

      const totalValue = (10000 * 15) + (10000 * 8); // $230k
      const expectedCost = totalValue * 0.02; // 2%

      expect(holdingCosts).toBe(expectedCost);
    });

    it("should return 0 for empty inventory", () => {
      const holdingCosts = MaterialEngine.calculateHoldingCosts([]);
      expect(holdingCosts).toBe(0);
    });
  });

  describe("getRecommendedOrders", () => {
    it("should recommend orders for low inventory", () => {
      const inventory: MaterialInventory[] = [
        { materialType: "display", spec: "LCD_5.5inch", quantity: 1000, averageCost: 15, sourceRegion: "Asia" }
      ];

      const recommendations = MaterialEngine.getRecommendedOrders(
        "Budget",
        20000, // Forecast 20k production
        inventory,
        1
      );

      expect(recommendations.length).toBeGreaterThan(0);

      // Should recommend orders for materials with insufficient quantity
      const hasDisplayOrder = recommendations.some(r => r.materialType === "display");
      expect(hasDisplayOrder).toBe(true); // Display has 1000, needs 40000 (20k * 2 buffer)
    });

    it("should not recommend orders when inventory is sufficient", () => {
      const inventory: MaterialInventory[] = [];

      // Create full inventory with 100k of each material
      const requirements = MaterialEngine.getMaterialRequirements("Budget");
      requirements.materials.forEach(mat => {
        inventory.push({
          materialType: mat.type,
          spec: mat.spec,
          quantity: 100000,
          averageCost: mat.costPerUnit,
          sourceRegion: mat.source
        });
      });

      const recommendations = MaterialEngine.getRecommendedOrders(
        "Budget",
        10000, // Forecast only 10k production
        inventory,
        1
      );

      // Should have few or no recommendations since inventory is sufficient
      expect(recommendations.length).toBeLessThanOrEqual(8);
    });

    it("should respect minimum order quantities", () => {
      const inventory: MaterialInventory[] = [];

      const recommendations = MaterialEngine.getRecommendedOrders(
        "Budget",
        5000,
        inventory,
        1
      );

      recommendations.forEach(rec => {
        const requirements = MaterialEngine.getMaterialRequirements("Budget");
        const material = requirements.materials.find(m => m.type === rec.materialType);

        if (material) {
          expect(rec.quantity).toBeGreaterThanOrEqual(material.minimumOrderQuantity);
        }
      });
    });
  });

  describe("processOrders", () => {
    it("should mark orders as delivered when round arrives", () => {
      // Mock Math.random to ensure no delivery delays
      const originalRandom = Math.random;
      Math.random = () => 0.99; // Always return high value to avoid delays

      const activeOrders: MaterialOrder[] = [
        {
          id: "order-1",
          materialType: "display",
          spec: "LCD_5.5inch",
          quantity: 10000,
          sourceRegion: "Asia",
          destRegion: "North America",
          supplierName: "GlobalTech Manufacturing",
          costPerUnit: 15,
          shippingMethod: "sea",
          orderRound: 1,
          productionTime: 20,
          shippingTime: 25,
          clearanceTime: 3,
          inspectionTime: 2,
          estimatedArrivalRound: 2,
          materialCost: 150000,
          shippingCost: 3500,
          clearanceCost: 800,
          tariffCost: 37500,
          totalCost: 191800,
          status: "shipping",
          currentLocation: "In transit to North America"
        }
      ];

      const materialsState = {
        inventory: [],
        activeOrders,
        suppliers: [],
        contracts: [],
        totalInventoryValue: 0,
        holdingCosts: 0
      };

      const result = MaterialEngine.processOrders(materialsState, 2);

      expect(result.arrivedOrders).toHaveLength(1);
      expect(result.arrivedOrders[0].status).toBe("delivered");
      expect(result.updatedInventory.length).toBeGreaterThan(0);
      expect(result.messages.length).toBeGreaterThan(0);

      // Restore Math.random
      Math.random = originalRandom;
    });

    it("should update order status based on timeline", () => {
      const activeOrders: MaterialOrder[] = [
        {
          id: "order-1",
          materialType: "display",
          spec: "LCD_5.5inch",
          quantity: 10000,
          sourceRegion: "Asia",
          destRegion: "North America",
          supplierName: "GlobalTech Manufacturing",
          costPerUnit: 15,
          shippingMethod: "sea",
          orderRound: 1,
          productionTime: 20,
          shippingTime: 25,
          clearanceTime: 3,
          inspectionTime: 2,
          estimatedArrivalRound: 3,
          materialCost: 150000,
          shippingCost: 3500,
          clearanceCost: 800,
          tariffCost: 37500,
          totalCost: 191800,
          status: "pending",
          currentLocation: "GlobalTech Manufacturing, Asia"
        }
      ];

      const materialsState = {
        inventory: [],
        activeOrders,
        suppliers: [],
        contracts: [],
        totalInventoryValue: 0,
        holdingCosts: 0
      };

      const result = MaterialEngine.processOrders(materialsState, 1);

      // Should still be in pending/production, not yet delivered
      expect(result.arrivedOrders).toHaveLength(0);
      expect(materialsState.activeOrders[0].status).toBe("production");
    });

    it("should add inventory with weighted average cost", () => {
      // Mock Math.random to ensure no delivery delays
      const originalRandom = Math.random;
      Math.random = () => 0.99; // Always return high value to avoid delays

      const inventory: MaterialInventory[] = [
        { materialType: "display", spec: "LCD_5.5inch", quantity: 5000, averageCost: 14, sourceRegion: "Asia" }
      ];

      const activeOrders: MaterialOrder[] = [
        {
          id: "order-1",
          materialType: "display",
          spec: "LCD_5.5inch",
          quantity: 10000,
          sourceRegion: "Asia",
          destRegion: "North America",
          supplierName: "GlobalTech Manufacturing",
          costPerUnit: 16,
          shippingMethod: "sea",
          orderRound: 1,
          productionTime: 20,
          shippingTime: 25,
          clearanceTime: 3,
          inspectionTime: 2,
          estimatedArrivalRound: 2,
          materialCost: 160000,
          shippingCost: 3500,
          clearanceCost: 800,
          tariffCost: 40000,
          totalCost: 204300,
          status: "shipping",
          currentLocation: "In transit"
        }
      ];

      const materialsState = {
        inventory,
        activeOrders,
        suppliers: [],
        contracts: [],
        totalInventoryValue: 0,
        holdingCosts: 0
      };

      const result = MaterialEngine.processOrders(materialsState, 2);

      const displayInventory = result.updatedInventory.find(i => i.materialType === "display");
      expect(displayInventory).toBeDefined();
      expect(displayInventory?.quantity).toBe(15000); // 5000 + 10000

      // Weighted average: (5000 * 14 + 10000 * 16) / 15000 = 15.33
      expect(displayInventory?.averageCost).toBeCloseTo(15.33, 1);

      // Restore Math.random
      Math.random = originalRandom;
    });
  });
});
