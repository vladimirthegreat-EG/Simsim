/**
 * Supply Chain Engine
 *
 * Models supplier relationships, vulnerabilities, and disruption events.
 * Supports tiered suppliers, geographic diversity, and risk management.
 *
 * Phase 11: Supply Chain System
 */

import type { EngineContext } from "../core/EngineContext";
import type { EngineConfig } from "../config/schema";

// ============================================
// TYPES
// ============================================

export type Region = "North America" | "Europe" | "Asia" | "MENA" | "South America" | "Africa";
export type SupplierTier = 1 | 2 | 3; // Tier 1 = direct, Tier 2 = indirect, Tier 3 = commodity
export type DisruptionType = "natural_disaster" | "supplier_failure" | "logistics" | "trade_war" | "pandemic";

export interface Supplier {
  id: string;
  name: string;
  tier: SupplierTier;
  reliability: number; // 0-100
  qualityRating: number; // 0-100
  costRating: number; // 0-100 (lower = cheaper)
  leadTime: number; // Rounds
  capacity: number; // Units per round
  region: Region;
  ethicalScore: number; // 0-100
  relationshipStrength: number; // 0-100, built over time
}

export interface SupplyChainState {
  suppliers: Supplier[];
  primarySupplierId: string | null;
  supplyConcentration: number; // % from top supplier
  geographicDiversity: number; // 0-1
  inventoryBuffer: number; // Safety stock rounds
  disruptions: Disruption[];
  activeContracts: SupplierContract[];
  vulnerabilities: Vulnerability[];
}

export interface SupplierContract {
  supplierId: string;
  volumeCommitment: number;
  pricePerUnit: number;
  duration: number; // Rounds
  roundsRemaining: number;
  exclusivity: boolean;
}

export interface Disruption {
  id: string;
  type: DisruptionType;
  affectedRegions: Region[];
  severity: number; // 0-1
  duration: number; // Rounds
  roundsRemaining: number;
  costImpact: number; // Multiplier
  supplyImpact: number; // % reduction
  warningGiven: boolean;
}

export interface Vulnerability {
  type: "concentration" | "geographic" | "capacity" | "quality" | "ethical";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedSuppliers: string[];
  mitigationCost: number;
  mitigationAction: string;
}

export interface SupplyChainResult {
  state: SupplyChainState;
  effectiveCapacity: number;
  costMultiplier: number;
  qualityImpact: number;
  newDisruptions: Disruption[];
  resolvedDisruptions: Disruption[];
  messages: string[];
  warnings: string[];
}

export interface SupplyChainDecisions {
  supplierSelection: { supplierId: string; volume: number }[];
  inventoryBufferTarget: number; // Rounds of safety stock
  diversificationInvestment: number; // $ spent on new suppliers
  contingencyPlanning: number; // $ spent on backup plans
}

// ============================================
// CONSTANTS
// ============================================

const DISRUPTION_BASE_PROBABILITIES: Record<DisruptionType, number> = {
  natural_disaster: 0.02, // 2% per round
  supplier_failure: 0.03, // 3% per round
  logistics: 0.05, // 5% per round
  trade_war: 0.01, // 1% per round
  pandemic: 0.005, // 0.5% per round
};

const DISRUPTION_SEVERITIES: Record<DisruptionType, { min: number; max: number }> = {
  natural_disaster: { min: 0.3, max: 0.8 },
  supplier_failure: { min: 0.2, max: 0.5 },
  logistics: { min: 0.1, max: 0.4 },
  trade_war: { min: 0.2, max: 0.6 },
  pandemic: { min: 0.4, max: 0.9 },
};

const DISRUPTION_DURATIONS: Record<DisruptionType, { min: number; max: number }> = {
  natural_disaster: { min: 1, max: 3 },
  supplier_failure: { min: 2, max: 4 },
  logistics: { min: 1, max: 2 },
  trade_war: { min: 4, max: 8 },
  pandemic: { min: 4, max: 12 },
};

// ============================================
// ENGINE
// ============================================

export class SupplyChainEngine {
  /**
   * Process supply chain for a round
   */
  static processSupplyChain(
    previousState: SupplyChainState | null,
    decisions: SupplyChainDecisions,
    config: EngineConfig,
    ctx: EngineContext
  ): SupplyChainResult {
    const messages: string[] = [];
    const warnings: string[] = [];

    // Initialize or copy state
    const state: SupplyChainState = previousState
      ? { ...previousState }
      : this.initializeState();

    // Update supplier relationships based on decisions
    this.updateSupplierRelationships(state, decisions);

    // Check for new disruptions
    const newDisruptions = this.checkForDisruptions(state, config, ctx);
    for (const disruption of newDisruptions) {
      state.disruptions.push(disruption);
      warnings.push(this.getDisruptionWarning(disruption));
    }

    // Process existing disruptions
    const resolvedDisruptions: Disruption[] = [];
    state.disruptions = state.disruptions.filter((d) => {
      d.roundsRemaining--;
      if (d.roundsRemaining <= 0) {
        resolvedDisruptions.push(d);
        messages.push(`${this.getDisruptionTypeName(d.type)} disruption has been resolved`);
        return false;
      }
      return true;
    });

    // Calculate supply chain metrics
    state.supplyConcentration = this.calculateConcentration(state);
    state.geographicDiversity = this.calculateGeographicDiversity(state);

    // Assess vulnerabilities
    state.vulnerabilities = this.assessVulnerabilities(state);
    for (const vuln of state.vulnerabilities) {
      if (vuln.severity === "critical") {
        warnings.push(`Critical vulnerability: ${vuln.description}`);
      } else if (vuln.severity === "high") {
        messages.push(`High-risk vulnerability: ${vuln.description}`);
      }
    }

    // Calculate effective capacity and cost impacts
    const effectiveCapacity = this.calculateEffectiveCapacity(state);
    const costMultiplier = this.calculateCostMultiplier(state);
    const qualityImpact = this.calculateQualityImpact(state);

    // Update inventory buffer
    state.inventoryBuffer = decisions.inventoryBufferTarget;

    return {
      state,
      effectiveCapacity,
      costMultiplier,
      qualityImpact,
      newDisruptions,
      resolvedDisruptions,
      messages,
      warnings,
    };
  }

  /**
   * Initialize supply chain state with default suppliers
   */
  static initializeState(): SupplyChainState {
    const defaultSuppliers: Supplier[] = [
      {
        id: "sup_primary",
        name: "Primary Components Ltd",
        tier: 1,
        reliability: 85,
        qualityRating: 80,
        costRating: 60,
        leadTime: 1,
        capacity: 100000,
        region: "Asia",
        ethicalScore: 70,
        relationshipStrength: 50,
      },
      {
        id: "sup_secondary",
        name: "Secondary Electronics",
        tier: 1,
        reliability: 75,
        qualityRating: 75,
        costRating: 50,
        leadTime: 1,
        capacity: 50000,
        region: "Asia",
        ethicalScore: 65,
        relationshipStrength: 30,
      },
      {
        id: "sup_backup",
        name: "European Parts GmbH",
        tier: 1,
        reliability: 90,
        qualityRating: 85,
        costRating: 80,
        leadTime: 2,
        capacity: 30000,
        region: "Europe",
        ethicalScore: 90,
        relationshipStrength: 20,
      },
    ];

    return {
      suppliers: defaultSuppliers,
      primarySupplierId: "sup_primary",
      supplyConcentration: 0.67,
      geographicDiversity: 0.33,
      inventoryBuffer: 1,
      disruptions: [],
      activeContracts: [],
      vulnerabilities: [],
    };
  }

  /**
   * Check for new disruptions
   */
  private static checkForDisruptions(
    state: SupplyChainState,
    config: EngineConfig,
    ctx: EngineContext
  ): Disruption[] {
    const disruptions: Disruption[] = [];

    // Skip if disruptions are disabled
    if (!config.difficulty.disruptions.enabled) {
      return disruptions;
    }

    const frequencyMultiplier = config.difficulty.disruptions.frequencyMultiplier;
    const severityMultiplier = config.difficulty.disruptions.severityMultiplier;

    for (const [type, baseProb] of Object.entries(DISRUPTION_BASE_PROBABILITIES)) {
      const adjustedProb = baseProb * frequencyMultiplier;

      if (ctx.rng.general.chance(adjustedProb)) {
        const disruptionType = type as DisruptionType;
        const severityRange = DISRUPTION_SEVERITIES[disruptionType];
        const durationRange = DISRUPTION_DURATIONS[disruptionType];

        const severity = ctx.rng.general.range(severityRange.min, severityRange.max) * severityMultiplier;
        const duration = Math.ceil(
          ctx.rng.general.range(durationRange.min, durationRange.max) *
            config.difficulty.disruptions.recoveryTimeMultiplier
        );

        // Determine affected regions
        const affectedRegions = this.determineAffectedRegions(disruptionType, ctx);

        disruptions.push({
          id: `disruption-${ctx.roundNumber}-${type}`,
          type: disruptionType,
          affectedRegions,
          severity: Math.min(1, severity),
          duration,
          roundsRemaining: duration,
          costImpact: 1 + severity * 0.5, // Up to 50% cost increase
          supplyImpact: severity, // Severity = % reduction
          warningGiven: config.difficulty.disruptions.warningTime > 0,
        });
      }
    }

    return disruptions;
  }

  /**
   * Determine which regions are affected by a disruption
   */
  private static determineAffectedRegions(
    type: DisruptionType,
    ctx: EngineContext
  ): Region[] {
    const allRegions: Region[] = ["North America", "Europe", "Asia", "MENA", "South America", "Africa"];

    switch (type) {
      case "natural_disaster":
        // Usually affects 1-2 regions
        return ctx.rng.general.shuffle([...allRegions]).slice(0, ctx.rng.general.int(1, 2));

      case "supplier_failure":
        // Usually just one region
        return [ctx.rng.general.pick(allRegions)];

      case "logistics":
        // Can affect multiple regions
        return ctx.rng.general.shuffle([...allRegions]).slice(0, ctx.rng.general.int(1, 3));

      case "trade_war":
        // Typically affects specific trade corridors
        return ctx.rng.general.shuffle([...allRegions]).slice(0, ctx.rng.general.int(2, 3));

      case "pandemic":
        // Global impact
        return allRegions;

      default:
        return [ctx.rng.general.pick(allRegions)];
    }
  }

  /**
   * Update supplier relationships based on decisions
   */
  private static updateSupplierRelationships(
    state: SupplyChainState,
    decisions: SupplyChainDecisions
  ): void {
    for (const selection of decisions.supplierSelection) {
      const supplier = state.suppliers.find((s) => s.id === selection.supplierId);
      if (supplier) {
        // Strengthen relationship with active suppliers
        supplier.relationshipStrength = Math.min(
          100,
          supplier.relationshipStrength + 5
        );
      }
    }

    // Decay relationships with inactive suppliers
    for (const supplier of state.suppliers) {
      const isActive = decisions.supplierSelection.some(
        (s) => s.supplierId === supplier.id
      );
      if (!isActive) {
        supplier.relationshipStrength = Math.max(
          0,
          supplier.relationshipStrength - 2
        );
      }
    }
  }

  /**
   * Calculate supply concentration risk
   */
  private static calculateConcentration(state: SupplyChainState): number {
    if (state.activeContracts.length === 0) {
      return state.primarySupplierId ? 1.0 : 0;
    }

    const totalVolume = state.activeContracts.reduce(
      (sum, c) => sum + c.volumeCommitment,
      0
    );

    if (totalVolume === 0) return 0;

    const maxVolume = Math.max(
      ...state.activeContracts.map((c) => c.volumeCommitment)
    );

    return maxVolume / totalVolume;
  }

  /**
   * Calculate geographic diversity score
   */
  private static calculateGeographicDiversity(state: SupplyChainState): number {
    const regions = new Set(state.suppliers.map((s) => s.region));
    const totalRegions = 6; // All possible regions
    return regions.size / totalRegions;
  }

  /**
   * Assess supply chain vulnerabilities
   */
  private static assessVulnerabilities(state: SupplyChainState): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];

    // Concentration risk
    if (state.supplyConcentration > 0.5) {
      vulnerabilities.push({
        type: "concentration",
        severity: state.supplyConcentration > 0.7 ? "critical" : "high",
        description: `${(state.supplyConcentration * 100).toFixed(0)}% of supply from single source`,
        affectedSuppliers: [state.primarySupplierId ?? ""],
        mitigationCost: 10_000_000,
        mitigationAction: "Diversify supplier base with additional contracts",
      });
    }

    // Geographic risk
    if (state.geographicDiversity < 0.3) {
      vulnerabilities.push({
        type: "geographic",
        severity: "medium",
        description: "Supply concentrated in single region",
        affectedSuppliers: state.suppliers.map((s) => s.id),
        mitigationCost: 5_000_000,
        mitigationAction: "Establish suppliers in additional regions",
      });
    }

    // Quality risk
    const lowQualitySuppliers = state.suppliers.filter((s) => s.qualityRating < 60);
    if (lowQualitySuppliers.length > 0) {
      vulnerabilities.push({
        type: "quality",
        severity: "medium",
        description: `${lowQualitySuppliers.length} supplier(s) with quality concerns`,
        affectedSuppliers: lowQualitySuppliers.map((s) => s.id),
        mitigationCost: 2_000_000,
        mitigationAction: "Implement supplier quality improvement programs",
      });
    }

    // Ethical risk
    const lowEthicalSuppliers = state.suppliers.filter((s) => s.ethicalScore < 50);
    if (lowEthicalSuppliers.length > 0) {
      vulnerabilities.push({
        type: "ethical",
        severity: "high",
        description: `${lowEthicalSuppliers.length} supplier(s) with ethical concerns`,
        affectedSuppliers: lowEthicalSuppliers.map((s) => s.id),
        mitigationCost: 3_000_000,
        mitigationAction: "Conduct ethical audits and require compliance improvements",
      });
    }

    // Capacity risk
    const totalCapacity = state.suppliers.reduce((sum, s) => sum + s.capacity, 0);
    if (totalCapacity < 150000) {
      vulnerabilities.push({
        type: "capacity",
        severity: "medium",
        description: "Limited supplier capacity may constrain growth",
        affectedSuppliers: state.suppliers.map((s) => s.id),
        mitigationCost: 8_000_000,
        mitigationAction: "Negotiate capacity expansion or add new suppliers",
      });
    }

    return vulnerabilities;
  }

  /**
   * Calculate effective capacity considering disruptions
   */
  private static calculateEffectiveCapacity(state: SupplyChainState): number {
    let totalCapacity = state.suppliers.reduce((sum, s) => sum + s.capacity, 0);

    // Apply disruption impacts
    for (const disruption of state.disruptions) {
      const affectedSuppliers = state.suppliers.filter((s) =>
        disruption.affectedRegions.includes(s.region)
      );

      for (const supplier of affectedSuppliers) {
        totalCapacity -= supplier.capacity * disruption.supplyImpact;
      }
    }

    // Account for safety stock buffer
    const effectiveCapacity = totalCapacity * (1 + state.inventoryBuffer * 0.1);

    return Math.max(0, effectiveCapacity);
  }

  /**
   * Calculate cost multiplier from supply chain issues
   */
  private static calculateCostMultiplier(state: SupplyChainState): number {
    let multiplier = 1.0;

    // Disruption cost impacts
    for (const disruption of state.disruptions) {
      const affectedRatio =
        state.suppliers.filter((s) =>
          disruption.affectedRegions.includes(s.region)
        ).length / state.suppliers.length;

      multiplier += (disruption.costImpact - 1) * affectedRatio;
    }

    // Concentration premium
    if (state.supplyConcentration > 0.7) {
      multiplier *= 1.05; // 5% premium for concentrated supply
    }

    // Low diversity premium
    if (state.geographicDiversity < 0.2) {
      multiplier *= 1.03; // 3% premium for low diversity
    }

    return multiplier;
  }

  /**
   * Calculate quality impact from supply chain issues
   */
  private static calculateQualityImpact(state: SupplyChainState): number {
    // Average supplier quality weighted by relationship strength
    let totalWeight = 0;
    let weightedQuality = 0;

    for (const supplier of state.suppliers) {
      const weight = supplier.relationshipStrength / 100;
      weightedQuality += supplier.qualityRating * weight;
      totalWeight += weight;
    }

    const avgQuality = totalWeight > 0 ? weightedQuality / totalWeight : 70;

    // Disruption quality impacts
    let qualityPenalty = 0;
    for (const disruption of state.disruptions) {
      qualityPenalty += disruption.severity * 5; // Up to 5 quality points per disruption
    }

    return avgQuality - qualityPenalty;
  }

  /**
   * Get human-readable disruption type name
   */
  private static getDisruptionTypeName(type: DisruptionType): string {
    const names: Record<DisruptionType, string> = {
      natural_disaster: "Natural disaster",
      supplier_failure: "Supplier failure",
      logistics: "Logistics",
      trade_war: "Trade war",
      pandemic: "Pandemic",
    };
    return names[type];
  }

  /**
   * Get warning message for a disruption
   */
  private static getDisruptionWarning(disruption: Disruption): string {
    const typeName = this.getDisruptionTypeName(disruption.type);
    const regions = disruption.affectedRegions.join(", ");
    const severity = disruption.severity > 0.6 ? "severe" : disruption.severity > 0.3 ? "moderate" : "minor";

    return `${typeName} affecting ${regions} - ${severity} impact expected for ${disruption.duration} rounds`;
  }
}

