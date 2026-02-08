/**
 * Factory Module - Handles factory operations, efficiency, upgrades, and ESG
 *
 * DETERMINISM: This module uses EngineContext for deterministic ID generation.
 */

import {
  Factory,
  FactoryDecisions,
  FactoryUpgrade,
  TeamState,
  ModuleResult,
  CONSTANTS,
  Region,
} from "../types";
import { createErrorResult } from "../utils";
import { cloneTeamState } from "../utils/stateUtils";
import type { EngineContext } from "../core/EngineContext";
import { MachineryEngine } from "../machinery/MachineryEngine";

export class FactoryModule {
  /**
   * Process all factory decisions for a round
   * @param state Current team state
   * @param decisions Factory decisions for this round
   * @param ctx Engine context for deterministic execution (required for production)
   */
  static process(
    state: TeamState,
    decisions: FactoryDecisions & {
      // Support alternative decision formats from UI/tests
      investments?: {
        workerEfficiency?: number;
        supervisorEfficiency?: number;
        engineerEfficiency?: number;
        machineryEfficiency?: number;
        factoryEfficiency?: number;
      };
      greenEnergyInvestments?: Array<{ factoryId: string; amount: number }>;
    },
    ctx?: EngineContext
  ): { newState: TeamState; result: ModuleResult } {
    try {
      return this.processInternal(state, decisions, ctx);
    } catch (error) {
      return createErrorResult("FactoryModule", error, state);
    }
  }

  /**
   * Internal processing logic (wrapped by error handler)
   */
  private static processInternal(
    state: TeamState,
    decisions: FactoryDecisions & {
      investments?: {
        workerEfficiency?: number;
        supervisorEfficiency?: number;
        engineerEfficiency?: number;
        machineryEfficiency?: number;
        factoryEfficiency?: number;
      };
      greenEnergyInvestments?: Array<{ factoryId: string; amount: number }>;
    },
    ctx?: EngineContext
  ): { newState: TeamState; result: ModuleResult } {
    let newState = cloneTeamState(state);
    let totalCosts = 0;
    const messages: string[] = [];

    // Process efficiency investments (standard format: efficiencyInvestments[factoryId])
    if (decisions.efficiencyInvestments) {
      for (const [factoryId, investments] of Object.entries(decisions.efficiencyInvestments)) {
        const factory = newState.factories.find(f => f.id === factoryId);
        if (factory) {
          const { newEfficiency, cost } = this.applyEfficiencyInvestment(factory, investments);
          factory.efficiency = newEfficiency;
          totalCosts += cost;
          messages.push(`Factory ${factory.name}: Efficiency improved to ${(newEfficiency * 100).toFixed(1)}%`);
        }
      }
    }

    // Support alternative format: investments.workerEfficiency, etc. (applies to first factory)
    if (decisions.investments && newState.factories.length > 0) {
      const factory = newState.factories[0];
      const mappedInvestments = {
        workers: decisions.investments.workerEfficiency || 0,
        supervisors: decisions.investments.supervisorEfficiency || 0,
        engineers: decisions.investments.engineerEfficiency || 0,
        machinery: decisions.investments.machineryEfficiency || 0,
        factory: decisions.investments.factoryEfficiency || 0,
      };

      // Only process if there are actual investments
      const totalInvested = Object.values(mappedInvestments).reduce((sum, v) => sum + v, 0);
      if (totalInvested > 0) {
        const { newEfficiency, cost } = this.applyEfficiencyInvestment(factory, mappedInvestments);
        factory.efficiency = newEfficiency;
        totalCosts += cost;
        messages.push(`Factory ${factory.name}: Efficiency improved to ${(newEfficiency * 100).toFixed(1)}%`);
      }
    }

    // Process green investments (standard format: greenInvestments[factoryId])
    if (decisions.greenInvestments) {
      for (const [factoryId, amount] of Object.entries(decisions.greenInvestments)) {
        const factory = newState.factories.find(f => f.id === factoryId);
        if (factory && amount > 0) {
          const co2Reduction = this.calculateCO2Reduction(amount);
          factory.co2Emissions = Math.max(0, factory.co2Emissions - co2Reduction);
          factory.greenInvestment += amount;
          totalCosts += amount;
          newState.brandValue += amount / 100_000_000; // Brand impact
          messages.push(`Factory ${factory.name}: CO2 reduced by ${co2Reduction} tons`);
        }
      }
    }

    // Support alternative format: greenEnergyInvestments array
    if (decisions.greenEnergyInvestments) {
      for (const { factoryId, amount } of decisions.greenEnergyInvestments) {
        const factory = newState.factories.find(f => f.id === factoryId) || newState.factories[0];
        if (factory && amount > 0) {
          const co2Reduction = this.calculateCO2Reduction(amount);
          factory.co2Emissions = Math.max(0, factory.co2Emissions - co2Reduction);
          factory.greenInvestment += amount;
          totalCosts += amount;
          newState.brandValue += amount / 100_000_000; // Brand impact
          messages.push(`Factory ${factory.name}: CO2 reduced by ${co2Reduction} tons`);
        }
      }
    }

    // Process upgrade purchases
    if (decisions.upgradePurchases) {
      for (const { factoryId, upgrade } of decisions.upgradePurchases) {
        const factory = newState.factories.find(f => f.id === factoryId);
        if (factory && !factory.upgrades.includes(upgrade)) {
          const cost = CONSTANTS.UPGRADE_COSTS[upgrade];
          if (newState.cash >= cost) {
            factory.upgrades.push(upgrade);
            this.applyUpgradeEffects(factory, upgrade);
            totalCosts += cost;
            messages.push(`Factory ${factory.name}: Purchased ${upgrade} upgrade`);
          } else {
            messages.push(`Factory ${factory.name}: Insufficient funds for ${upgrade}`);
          }
        }
      }
    }

    // Process new factory construction
    if (decisions.newFactories) {
      for (const { name, region } of decisions.newFactories) {
        if (newState.cash >= CONSTANTS.NEW_FACTORY_COST) {
          const newFactory = this.createNewFactory(name, region, newState.factories.length, ctx);
          newState.factories.push(newFactory);
          totalCosts += CONSTANTS.NEW_FACTORY_COST;
          messages.push(`New factory "${name}" constructed in ${region}`);
        } else {
          messages.push(`Insufficient funds to construct factory "${name}"`);
        }
      }
    }

    // Process ESG initiatives
    if (decisions.esgInitiatives) {
      const esgResult = this.processESGInitiatives(newState, decisions.esgInitiatives);
      newState.esgScore += esgResult.esgGain;
      totalCosts += esgResult.cost;
      messages.push(...esgResult.messages);
    }

    // Process machinery decisions
    if (decisions.machineryDecisions) {
      for (const factoryId of Object.keys(decisions.machineryDecisions)) {
        const factory = newState.factories.find(f => f.id === factoryId);
        if (!factory) continue;

        const factoryDecisions = decisions.machineryDecisions[factoryId];
        if (!factoryDecisions) continue;

        // Initialize machinery state if not present
        if (!newState.machineryStates) {
          newState.machineryStates = {};
        }
        if (!newState.machineryStates[factoryId]) {
          newState.machineryStates[factoryId] = {
            machines: [],
            totalCapacity: 0,
            totalMaintenanceCost: 0,
            totalOperatingCost: 0,
            defectRateReduction: 0,
            laborReduction: 0,
            shippingReduction: 0,
          };
        }

        const machineryState = newState.machineryStates[factoryId];

        // Process machinery using MachineryEngine
        const machineryResult = MachineryEngine.process(
          machineryState,
          factoryDecisions,
          newState.round,
          ctx
        );

        // Update machinery state
        newState.machineryStates[factoryId] = machineryResult.newState;

        // Apply machinery costs
        totalCosts += machineryResult.result.costs;

        // Apply machinery effects to factory
        factory.defectRate = Math.max(0, factory.defectRate - machineryResult.newState.defectRateReduction);

        messages.push(...machineryResult.result.messages);
      }
    }

    // Deduct costs from cash
    newState.cash -= totalCosts;

    // Update total CO2 emissions
    newState.co2Emissions = newState.factories.reduce((sum, f) => sum + f.co2Emissions, 0);

    return {
      newState,
      result: {
        success: true,
        changes: {
          factoriesUpdated: newState.factories.length,
          efficiencyChanges: decisions.efficiencyInvestments ? Object.keys(decisions.efficiencyInvestments).length : 0,
          upgradesPurchased: decisions.upgradePurchases?.length ?? 0,
          newFactoriesBuilt: decisions.newFactories?.length ?? 0,
        },
        costs: totalCosts,
        revenue: 0,
        messages,
      },
    };
  }

  /**
   * Calculate efficiency improvement from investment
   * Formula: 1% per $1M, with diminishing returns after $10M cumulative
   */
  static applyEfficiencyInvestment(
    factory: Factory,
    investments: {
      workers?: number;
      supervisors?: number;
      engineers?: number;
      machinery?: number;
      factory?: number;
    }
  ): { newEfficiency: number; cost: number } {
    const multipliers = {
      workers: 0.01,        // 1% per $1M
      supervisors: 0.015,   // 1.5% per $1M
      engineers: 0.02,      // 2% per $1M
      machinery: 0.012,     // 1.2% per $1M
      factory: 0.008,       // 0.8% per $1M
    };

    let totalInvestment = 0;
    let efficiencyGain = 0;

    for (const [type, amount] of Object.entries(investments)) {
      if (amount && amount > 0) {
        const multiplier = multipliers[type as keyof typeof multipliers] || 0.01;
        const previousInvestment = factory.efficiencyInvestment[type as keyof typeof factory.efficiencyInvestment] || 0;
        const newTotal = previousInvestment + amount;

        // Apply diminishing returns after $10M threshold
        let gain = 0;
        if (previousInvestment >= CONSTANTS.EFFICIENCY_DIMINISH_THRESHOLD) {
          // Already past threshold - all new investment has diminishing returns
          gain = (amount / 1_000_000) * multiplier * 0.5;
        } else if (newTotal > CONSTANTS.EFFICIENCY_DIMINISH_THRESHOLD) {
          // Crosses threshold
          const beforeThreshold = CONSTANTS.EFFICIENCY_DIMINISH_THRESHOLD - previousInvestment;
          const afterThreshold = newTotal - CONSTANTS.EFFICIENCY_DIMINISH_THRESHOLD;
          gain = (beforeThreshold / 1_000_000) * multiplier + (afterThreshold / 1_000_000) * multiplier * 0.5;
        } else {
          // Under threshold - full returns
          gain = (amount / 1_000_000) * multiplier;
        }

        efficiencyGain += gain;
        totalInvestment += amount;

        // Update tracked investment
        factory.efficiencyInvestment[type as keyof typeof factory.efficiencyInvestment] =
          (factory.efficiencyInvestment[type as keyof typeof factory.efficiencyInvestment] || 0) + amount;
      }
    }

    const newEfficiency = Math.min(CONSTANTS.MAX_EFFICIENCY, factory.efficiency + efficiencyGain);

    return { newEfficiency, cost: totalInvestment };
  }

  /**
   * Calculate CO2 reduction from green investment
   * Formula: 10 tons per $100K invested
   */
  static calculateCO2Reduction(investmentAmount: number): number {
    return (investmentAmount / 100_000) * 10;
  }

  /**
   * Apply effects of factory upgrades (PATCH 7: Added economic payoffs)
   * Expanded: 5 -> 20 upgrades
   */
  static applyUpgradeEffects(factory: Factory, upgrade: FactoryUpgrade): void {
    switch (upgrade) {
      // === EXISTING (5) ===
      case "sixSigma":
        // 40% defect reduction
        factory.defectRate *= 0.6;
        factory.warrantyReduction = 0.50;
        factory.recallProbability *= 0.25;
        break;

      case "automation":
        // 80% worker reduction needed (handled in HR module)
        factory.costVolatility *= 0.40;
        break;

      case "materialRefinement":
        factory.materialLevel = Math.min(5, factory.materialLevel + 1);
        break;

      case "supplyChain":
        factory.shippingCost *= 0.3;
        factory.stockoutReduction = 0.70;
        break;

      case "warehousing":
        factory.storageCost *= 0.1;
        factory.demandSpikeCapture = 0.90;
        break;

      // === QUALITY & EFFICIENCY (5 new) ===
      case "leanManufacturing":
        // +15% efficiency, -10% operating costs
        factory.efficiency = Math.min(1.0, factory.efficiency + 0.15);
        factory.operatingCostReduction = (factory.operatingCostReduction ?? 0) + 0.10;
        break;

      case "digitalTwin":
        // -20% maintenance costs, predictive alerts
        factory.maintenanceCostReduction = (factory.maintenanceCostReduction ?? 0) + 0.20;
        factory.predictiveMaintenanceEnabled = true;
        break;

      case "iotIntegration":
        // Real-time monitoring, -15% breakdown probability
        factory.breakdownReduction = (factory.breakdownReduction ?? 0) + 0.15;
        factory.realTimeMonitoringEnabled = true;
        break;

      case "modularLines":
        // -50% changeover time
        factory.changeoverTimeReduction = (factory.changeoverTimeReduction ?? 0) + 0.50;
        break;

      case "continuousImprovement":
        // +1% efficiency per round (tracked separately)
        factory.continuousImprovementEnabled = true;
        factory.continuousImprovementBonus = 0; // Starts at 0, grows each round
        break;

      // === SUSTAINABILITY (5 new) ===
      case "solarPanels":
        // -40% energy costs, +100 ESG
        factory.energyCostReduction = (factory.energyCostReduction ?? 0) + 0.40;
        factory.esgFromUpgrades = (factory.esgFromUpgrades ?? 0) + 100;
        break;

      case "waterRecycling":
        // -30% water costs, +50 ESG
        factory.waterCostReduction = (factory.waterCostReduction ?? 0) + 0.30;
        factory.esgFromUpgrades = (factory.esgFromUpgrades ?? 0) + 50;
        break;

      case "wasteToEnergy":
        // -20% waste disposal, +75 ESG
        factory.wasteCostReduction = (factory.wasteCostReduction ?? 0) + 0.20;
        factory.esgFromUpgrades = (factory.esgFromUpgrades ?? 0) + 75;
        break;

      case "smartGrid":
        // -25% energy usage, +80 ESG
        factory.energyCostReduction = (factory.energyCostReduction ?? 0) + 0.25;
        factory.esgFromUpgrades = (factory.esgFromUpgrades ?? 0) + 80;
        break;

      case "carbonCapture":
        // -50% CO2, +150 ESG
        factory.co2Emissions *= 0.5;
        factory.esgFromUpgrades = (factory.esgFromUpgrades ?? 0) + 150;
        break;

      // === CAPACITY & SPECIALIZATION (5 new) ===
      case "cleanRoom":
        // Enables high-purity production (+20% price for Professional)
        factory.cleanRoomEnabled = true;
        factory.professionalPriceBonus = (factory.professionalPriceBonus ?? 0) + 0.20;
        break;

      case "rapidPrototyping":
        // -50% R&D prototype time
        factory.rdSpeedBonus = (factory.rdSpeedBonus ?? 0) + 0.50;
        break;

      case "advancedRobotics":
        // +50% capacity, -30% labor needs
        factory.capacityMultiplier = (factory.capacityMultiplier ?? 1.0) * 1.50;
        factory.laborReduction = (factory.laborReduction ?? 0) + 0.30;
        break;

      case "qualityLab":
        // -50% defect rate, +30% QA speed
        factory.defectRate *= 0.5;
        factory.qaSpeedBonus = (factory.qaSpeedBonus ?? 0) + 0.30;
        break;

      case "flexibleManufacturing":
        // Can produce all segments efficiently
        factory.flexibleManufacturingEnabled = true;
        factory.changeoverTimeReduction = (factory.changeoverTimeReduction ?? 0) + 0.30;
        break;
    }
  }

  /**
   * Create a new factory with default values
   * @param name Factory name
   * @param region Factory region
   * @param index Factory index (for fallback ID generation)
   * @param ctx Engine context for deterministic ID generation
   */
  static createNewFactory(name: string, region: Region, index: number, ctx?: EngineContext): Factory {
    // Deterministic ID generation using context, or fallback pattern
    const id = ctx
      ? ctx.idGenerator.next("factory")
      : `factory-r0-${Date.now().toString(36)}-${index}`;

    return {
      id,
      name,
      region,
      productionLines: [],
      workers: 0,
      engineers: 0,
      supervisors: 0,
      efficiency: 0.7,     // Starting efficiency (worker/machine effectiveness)
      utilization: 0,      // PATCH 3: Actual demand / max capacity
      defectRate: CONSTANTS.BASE_DEFECT_RATE,
      materialLevel: 1,
      shippingCost: 100_000 * CONSTANTS.REGIONAL_COST_MODIFIER[region],
      storageCost: 50_000 * CONSTANTS.REGIONAL_COST_MODIFIER[region],
      efficiencyInvestment: {
        workers: 0,
        supervisors: 0,
        engineers: 0,
        machinery: 0,
        factory: 0,
      },
      upgrades: [],
      // PATCH 7: Upgrade economic benefits (initialized to baseline)
      warrantyReduction: 0,         // No reduction initially
      recallProbability: 0.05,      // 5% base recall risk
      stockoutReduction: 0,         // No benefit initially
      demandSpikeCapture: 0,        // No spike handling initially
      costVolatility: 0.15,         // 15% base cost variance
      co2Emissions: 1000, // Base emissions
      greenInvestment: 0,
      burnoutRisk: 0,           // PATCH 3: Accumulates when utilization > 95%
      maintenanceBacklog: 0,    // PATCH 3: Deferred maintenance hours
    };
  }

  /**
   * Process ESG initiatives (Expanded: 6 -> 20)
   */
  static processESGInitiatives(
    state: TeamState,
    initiatives: NonNullable<FactoryDecisions["esgInitiatives"]>
  ): { esgGain: number; cost: number; messages: string[] } {
    let esgGain = 0;
    let cost = 0;
    const messages: string[] = [];
    const esgConfig = CONSTANTS.ESG_INITIATIVES;

    // === EXISTING INITIATIVES (6) ===

    // Charitable Donation
    // ESG = Math.round((donation / netIncome) × 100 × 6.28)
    if (initiatives.charitableDonation && initiatives.charitableDonation > 0) {
      const donation = initiatives.charitableDonation;
      const esg = state.netIncome > 0
        ? Math.round((donation / state.netIncome) * 100 * 6.28)
        : Math.round(donation / 1_000_000); // Fallback if no net income
      esgGain += esg;
      cost += donation;
      messages.push(`Charitable donation: $${(donation / 1_000_000).toFixed(1)}M → +${esg} ESG`);
    }

    // Community Investment
    // ESG = Math.round((investment / revenue) × 100 × 9.5)
    if (initiatives.communityInvestment && initiatives.communityInvestment > 0) {
      const investment = initiatives.communityInvestment;
      const esg = state.revenue > 0
        ? Math.round((investment / state.revenue) * 100 * 9.5)
        : Math.round(investment / 1_000_000);
      esgGain += esg;
      cost += investment;
      messages.push(`Community investment: $${(investment / 1_000_000).toFixed(1)}M → +${esg} ESG`);
    }

    // Workplace Health & Safety - $2M annual, +200 ESG
    if (initiatives.workplaceHealthSafety) {
      esgGain += CONSTANTS.ESG_WORKPLACE_SAFETY_POINTS;
      cost += CONSTANTS.ESG_WORKPLACE_SAFETY_COST;
      messages.push(`Workplace Health & Safety program: +${CONSTANTS.ESG_WORKPLACE_SAFETY_POINTS} ESG`);
    }

    // Code of Ethics - +200 ESG (no direct cost, but commitment)
    if (initiatives.codeOfEthics) {
      esgGain += CONSTANTS.ESG_CODE_OF_ETHICS_POINTS;
      messages.push(`Code of Ethics adopted: +${CONSTANTS.ESG_CODE_OF_ETHICS_POINTS} ESG`);
    }

    // Fair Wage Program - ESG based on worker/supervisor wages above average
    if (initiatives.fairWageProgram) {
      esgGain += CONSTANTS.ESG_FAIR_WAGE_WORKER_POINTS + CONSTANTS.ESG_FAIR_WAGE_SUPERVISOR_POINTS;
      messages.push(`Fair Wage Program: +${CONSTANTS.ESG_FAIR_WAGE_WORKER_POINTS + CONSTANTS.ESG_FAIR_WAGE_SUPERVISOR_POINTS} ESG`);
    }

    // Supplier Ethics Program - +20% material costs but ESG benefit
    if (initiatives.supplierEthicsProgram) {
      esgGain += 150; // Base ESG for supplier ethics
      messages.push(`Supplier Ethics Program: +150 ESG (20% material cost increase)`);
    }

    // === ENVIRONMENTAL INITIATIVES (6 new) ===

    // Carbon Offset Program - $20/ton CO2, +1 ESG per 10 tons offset
    if (initiatives.carbonOffsetProgram && initiatives.carbonOffsetProgram > 0) {
      const amount = initiatives.carbonOffsetProgram;
      const tonsOffset = Math.floor(amount / esgConfig.carbonOffsetProgram.costPerTon);
      const esg = Math.floor(tonsOffset / 10) * esgConfig.carbonOffsetProgram.pointsPer10Tons;
      esgGain += esg;
      cost += amount;
      messages.push(`Carbon Offset: ${tonsOffset} tons offset → +${esg} ESG`);
    }

    // Renewable Energy Certificates - +1 ESG per $10K
    if (initiatives.renewableEnergyCertificates && initiatives.renewableEnergyCertificates > 0) {
      const amount = initiatives.renewableEnergyCertificates;
      const esg = Math.floor(amount / 10_000) * esgConfig.renewableEnergyCertificates.pointsPer10K;
      esgGain += esg;
      cost += amount;
      messages.push(`Renewable Energy Certs: $${(amount / 1_000_000).toFixed(2)}M → +${esg} ESG`);
    }

    // Water Conservation - $1.5M/year, +80 ESG
    if (initiatives.waterConservation) {
      const config = esgConfig.waterConservation;
      esgGain += config.points;
      cost += config.cost;
      messages.push(`Water Conservation program: +${config.points} ESG, -20% water costs`);
    }

    // Zero Waste Commitment - $2M/year, +100 ESG
    if (initiatives.zeroWasteCommitment) {
      const config = esgConfig.zeroWasteCommitment;
      esgGain += config.points;
      cost += config.cost;
      messages.push(`Zero Waste Commitment: +${config.points} ESG, -30% waste costs`);
    }

    // Circular Economy - $3M/year, +120 ESG, -20% material costs
    if (initiatives.circularEconomy) {
      const config = esgConfig.circularEconomy;
      esgGain += config.points;
      cost += config.cost;
      messages.push(`Circular Economy program: +${config.points} ESG, -20% material costs`);
    }

    // Biodiversity Protection - Variable $, +1 ESG per $5K
    if (initiatives.biodiversityProtection && initiatives.biodiversityProtection > 0) {
      const amount = initiatives.biodiversityProtection;
      const esg = Math.floor(amount / 5_000) * esgConfig.biodiversityProtection.pointsPer5K;
      esgGain += esg;
      cost += amount;
      messages.push(`Biodiversity Protection: $${(amount / 1_000).toFixed(0)}K → +${esg} ESG`);
    }

    // === SOCIAL INITIATIVES (5 new) ===

    // Diversity & Inclusion - $1M/year, +90 ESG, +5% morale
    if (initiatives.diversityInclusion) {
      const config = esgConfig.diversityInclusion;
      esgGain += config.points;
      cost += config.cost;
      messages.push(`Diversity & Inclusion program: +${config.points} ESG, +5% employee morale`);
    }

    // Employee Wellness - $500K/year, +60 ESG, -10% turnover
    if (initiatives.employeeWellness) {
      const config = esgConfig.employeeWellness;
      esgGain += config.points;
      cost += config.cost;
      messages.push(`Employee Wellness program: +${config.points} ESG, -10% turnover`);
    }

    // Community Education - Variable $, +1 ESG per $2K
    if (initiatives.communityEducation && initiatives.communityEducation > 0) {
      const amount = initiatives.communityEducation;
      const esg = Math.floor(amount / 2_000) * esgConfig.communityEducation.pointsPer2K;
      esgGain += esg;
      cost += amount;
      messages.push(`Community Education: $${(amount / 1_000).toFixed(0)}K → +${esg} ESG`);
    }

    // Affordable Housing - Variable $, +1 ESG per $10K
    if (initiatives.affordableHousing && initiatives.affordableHousing > 0) {
      const amount = initiatives.affordableHousing;
      const esg = Math.floor(amount / 10_000) * esgConfig.affordableHousing.pointsPer10K;
      esgGain += esg;
      cost += amount;
      messages.push(`Affordable Housing assistance: $${(amount / 1_000_000).toFixed(2)}M → +${esg} ESG`);
    }

    // Human Rights Audit - $800K/year, +70 ESG
    if (initiatives.humanRightsAudit) {
      const config = esgConfig.humanRightsAudit;
      esgGain += config.points;
      cost += config.cost;
      messages.push(`Human Rights Audit: +${config.points} ESG`);
    }

    // === GOVERNANCE INITIATIVES (3 new) ===

    // Transparency Report - $300K/year, +50 ESG, +10% investor trust
    if (initiatives.transparencyReport) {
      const config = esgConfig.transparencyReport;
      esgGain += config.points;
      cost += config.cost;
      messages.push(`Transparency Report: +${config.points} ESG, +10% investor sentiment`);
    }

    // Whistleblower Protection - $200K/year, +40 ESG
    if (initiatives.whistleblowerProtection) {
      const config = esgConfig.whistleblowerProtection;
      esgGain += config.points;
      cost += config.cost;
      messages.push(`Whistleblower Protection: +${config.points} ESG, -25% scandal risk`);
    }

    // Executive Pay Ratio - No cost, +100 ESG (limits exec compensation)
    if (initiatives.executivePayRatio) {
      const config = esgConfig.executivePayRatio;
      esgGain += config.points;
      cost += config.cost;
      messages.push(`Executive Pay Ratio policy: +${config.points} ESG (exec pay capped at 50x avg)`);
    }

    return { esgGain, cost, messages };
  }

  /**
   * Calculate production output for a factory
   */
  static calculateProduction(
    factory: Factory,
    workers: number,
    averageWorkerEfficiency: number,
    averageWorkerSpeed: number
  ): { unitsProduced: number; defects: number } {
    // Base production: 100 units per worker per day
    // Adjusted by efficiency and speed
    const baseOutput = workers * CONSTANTS.BASE_WORKER_OUTPUT;

    // Apply factory efficiency
    const factoryMultiplier = factory.efficiency;

    // Apply worker stats (normalized to 0-1 range from 0-100)
    const workerEfficiencyMultiplier = averageWorkerEfficiency / 100;
    const workerSpeedMultiplier = averageWorkerSpeed / 100;

    // Check for automation upgrade (80% fewer workers needed)
    const automationMultiplier = factory.upgrades.includes("automation") ? 5 : 1; // Each worker is 5x as productive

    const unitsProduced = Math.floor(
      baseOutput * factoryMultiplier * workerEfficiencyMultiplier * workerSpeedMultiplier * automationMultiplier
    );

    // Calculate defects
    const defectRate = factory.defectRate;
    const defects = Math.floor(unitsProduced * defectRate);

    return { unitsProduced: unitsProduced - defects, defects };
  }

  /**
   * Calculate recommended staffing for a factory
   */
  static calculateRecommendedStaffing(factory: Factory): {
    workers: number;
    engineers: number;
    supervisors: number;
  } {
    const machines = factory.productionLines.reduce((sum, line) => sum + Math.ceil(line.capacity / 1000), 0) || 10;

    // Workers = machines × 2.5
    let workers = Math.ceil(machines * CONSTANTS.WORKERS_PER_MACHINE);

    // Automation reduces worker needs by 80%
    if (factory.upgrades.includes("automation")) {
      workers = Math.ceil(workers * 0.2);
    }

    // Supervisors = workers / 15
    const supervisors = Math.ceil(workers / CONSTANTS.WORKERS_PER_SUPERVISOR);

    // Engineers = 8 per factory
    const engineers = CONSTANTS.ENGINEERS_PER_FACTORY;

    return { workers, engineers, supervisors };
  }

  /**
   * Calculate staffing efficiency penalties
   */
  static calculateStaffingPenalty(
    factory: Factory,
    actualStaff: { workers: number; engineers: number; supervisors: number }
  ): number {
    const recommended = this.calculateRecommendedStaffing(factory);
    let penalty = 0;

    // Worker understaffing: -5% to -15%
    if (actualStaff.workers < recommended.workers) {
      const ratio = actualStaff.workers / recommended.workers;
      penalty += (1 - ratio) * 0.15;
    }
    // Worker overstaffing: -3% to -8%
    else if (actualStaff.workers > recommended.workers * 1.2) {
      const overRatio = (actualStaff.workers - recommended.workers) / recommended.workers;
      penalty += Math.min(0.08, overRatio * 0.04);
    }

    // Similar for other roles (smaller impact)
    if (actualStaff.supervisors < recommended.supervisors) {
      const ratio = actualStaff.supervisors / recommended.supervisors;
      penalty += (1 - ratio) * 0.05;
    }

    return Math.min(0.25, penalty); // Cap at 25% total penalty
  }

  /**
   * PATCH 3: Update factory utilization and burnout risk based on actual production demand
   * This should be called after market simulation to update utilization metrics
   *
   * @param factory Factory to update
   * @param actualDemand Units demanded by market
   * @param maxCapacity Maximum production capacity
   */
  static updateUtilizationAndBurnout(
    factory: Factory,
    actualDemand: number,
    maxCapacity: number
  ): void {
    // PATCH 3: Calculate utilization as demand / capacity
    factory.utilization = maxCapacity > 0 ? actualDemand / maxCapacity : 0;

    // PATCH 3: Burnout risk accumulates only when overproducing (utilization > 95%)
    if (factory.utilization > CONSTANTS.UTILIZATION_PENALTY_THRESHOLD) {
      factory.burnoutRisk += CONSTANTS.BURNOUT_RISK_PER_ROUND;
      factory.maintenanceBacklog += CONSTANTS.MAINTENANCE_BACKLOG_PER_ROUND;

      // High utilization also increases defect rate
      factory.defectRate += CONSTANTS.DEFECT_RATE_INCREASE_AT_HIGH_UTIL;
    } else {
      // Burnout risk decays when not overproducing
      factory.burnoutRisk = Math.max(0, factory.burnoutRisk - 0.05);
      // Maintenance backlog can be addressed during low utilization
      factory.maintenanceBacklog = Math.max(0, factory.maintenanceBacklog - 20);
    }

    // Cap values
    factory.burnoutRisk = Math.min(1.0, factory.burnoutRisk);
    factory.defectRate = Math.min(0.25, factory.defectRate); // Cap at 25%
  }
}
