/**
 * Material & Supply Chain tRPC Router
 * Handles material orders, inventory, and supplier interactions
 */

import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { MaterialEngine, DEFAULT_SUPPLIERS, type Region, type MaterialType } from "@/engine/materials";
import { LogisticsEngine } from "@/engine/logistics";
import { TariffEngine } from "@/engine/tariffs";
import type { TeamState } from "@/engine/types/state";

export const materialRouter = createTRPCRouter({
  /**
   * Get current materials state for the team
   */
  getMaterialsState: teamProcedure.query(async ({ ctx }) => {
    const state = ctx.team.currentState as unknown as TeamState;

    // Initialize materials state if it doesn't exist
    if (!state.materials) {
      return {
        inventory: [],
        activeOrders: [],
        totalInventoryValue: 0,
        holdingCosts: 0,
        region: "North America" as Region,
      };
    }

    return state.materials;
  }),

  /**
   * Get all available suppliers
   */
  getSuppliers: teamProcedure.query(() => {
    return DEFAULT_SUPPLIERS;
  }),

  /**
   * Get material requirements for a segment
   */
  getMaterialRequirements: teamProcedure
    .input(
      z.object({
        segment: z.enum(["Budget", "General", "Active Lifestyle", "Enthusiast", "Professional"]),
      })
    )
    .query(({ input }) => {
      return MaterialEngine.getMaterialRequirements(input.segment);
    }),

  /**
   * Get recommended orders based on forecast
   */
  getRecommendedOrders: teamProcedure
    .input(
      z.object({
        segment: z.enum(["Budget", "General", "Active Lifestyle", "Enthusiast", "Professional"]),
        forecastedProduction: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const state = ctx.team.currentState as unknown as TeamState;
      const currentRound = ctx.game.currentRound;
      const inventory = state.materials?.inventory || [];

      return MaterialEngine.getRecommendedOrders(
        input.segment,
        input.forecastedProduction,
        inventory,
        currentRound
      );
    }),

  /**
   * Calculate logistics for a potential order
   */
  calculateLogistics: teamProcedure
    .input(
      z.object({
        fromRegion: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        toRegion: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        shippingMethod: z.enum(["sea", "air", "land", "rail"]),
        weight: z.number(),
        volume: z.number(),
        productionTime: z.number(),
      })
    )
    .query(({ input }) => {
      return LogisticsEngine.calculateLogistics(
        input.fromRegion,
        input.toRegion,
        input.shippingMethod,
        input.weight,
        input.volume,
        input.productionTime
      );
    }),

  /**
   * Calculate tariff for a shipment
   */
  calculateTariff: teamProcedure
    .input(
      z.object({
        fromRegion: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        toRegion: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        materialType: z.enum(["display", "processor", "memory", "storage", "camera", "battery", "chassis", "other"]),
        materialCost: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const state = ctx.team.currentState as unknown as TeamState;
      const currentRound = ctx.game.currentRound;
      const tariffState = state.tariffs || TariffEngine.initializeTariffState();

      return TariffEngine.calculateTariff(
        input.fromRegion,
        input.toRegion,
        input.materialType,
        input.materialCost,
        currentRound,
        tariffState
      );
    }),

  /**
   * Place a material order
   */
  placeOrder: teamProcedure
    .input(
      z.object({
        materialType: z.enum(["display", "processor", "memory", "storage", "camera", "battery", "chassis", "other"]),
        spec: z.string(),
        supplierId: z.string(),
        region: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        quantity: z.number().positive(),
        shippingMethod: z.enum(["sea", "air", "land", "rail"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.game.status !== "IN_PROGRESS") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot place orders when game is not in progress",
        });
      }

      const state = ctx.team.currentState as unknown as TeamState;
      const currentRound = ctx.game.currentRound;
      const teamRegion = state.materials?.region || "North America";

      // Create order
      const order = MaterialEngine.createMaterialOrder(
        {
          materialType: input.materialType as MaterialType,
          spec: input.spec,
          supplierId: input.supplierId,
          region: input.region,
          quantity: input.quantity,
          shippingMethod: input.shippingMethod,
          contractLength: 1,
        },
        currentRound,
        teamRegion
      );

      // Check if team has enough cash
      const totalCost = order.totalCost;
      if (state.cash < totalCost) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Insufficient funds. Order costs $${totalCost.toLocaleString()} but you have $${state.cash.toLocaleString()}`,
        });
      }

      // Initialize materials state if needed
      if (!state.materials) {
        state.materials = {
          inventory: [],
          activeOrders: [],
          totalInventoryValue: 0,
          holdingCosts: 0,
          region: teamRegion,
        };
      }

      // Add order to active orders
      state.materials.activeOrders.push(order);

      // Deduct cash
      state.cash -= totalCost;

      // Update accounts payable
      state.accountsPayable += totalCost;

      // Save updated state
      await ctx.prisma.team.update({
        where: { id: ctx.team.id },
        data: { currentState: state as any },
      });

      return {
        success: true,
        order,
        message: `Order placed successfully! Materials will arrive in round ${order.estimatedArrivalRound}`,
      };
    }),

  /**
   * Get tariff forecast
   */
  getTariffForecast: teamProcedure
    .input(
      z.object({
        fromRegion: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        toRegion: z.enum(["North America", "South America", "Europe", "Africa", "Asia", "Oceania", "Middle East"]),
        materialType: z.enum(["display", "processor", "memory", "storage", "camera", "battery", "chassis", "other"]),
        forecastRounds: z.number().default(4),
      })
    )
    .query(async ({ ctx, input }) => {
      const state = ctx.team.currentState as unknown as TeamState;
      const currentRound = ctx.game.currentRound;
      const tariffState = state.tariffs || TariffEngine.initializeTariffState();

      return TariffEngine.forecastTariffs(
        input.fromRegion,
        input.toRegion,
        input.materialType,
        currentRound,
        tariffState,
        input.forecastRounds
      );
    }),
});
