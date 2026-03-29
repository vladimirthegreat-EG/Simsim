/**
 * Decision Converters: Bridge UI decision types (decisionStore) → Engine decision types (engine/types/decisions.ts)
 */

import type { TeamState, Segment } from "@/engine/types";
import type {
  FactoryDecisions as EngineFactoryDecisions,
  HRDecisions as EngineHRDecisions,
  FinanceDecisions as EngineFinanceDecisions,
  MarketingDecisions as EngineMarketingDecisions,
  RDDecisions as EngineRDDecisions,
} from "@/engine/types/decisions";
import type {
  UIFactoryDecisions,
  UIHRDecisions,
  UIFinanceDecisions,
  UIMarketingDecisions,
  UIRDDecisions,
} from "@/lib/stores/decisionStore";
import type { EmployeeRole, EmployeeStats } from "@/engine/types/employee";
import type { MachineType } from "@/engine/machinery";

// All valid machine types for separating machine purchases from factory upgrades
const MACHINE_TYPES: Set<string> = new Set([
  "assembly_line", "cnc_machine", "robotic_arm", "conveyor_system",
  "quality_scanner", "3d_printer", "welding_station", "packaging_system",
  "injection_molder", "pcb_assembler", "paint_booth", "laser_cutter",
  "testing_rig", "clean_room_unit", "forklift_fleet",
]);

export function convertFactoryDecisions(
  ui: UIFactoryDecisions,
  state: TeamState
): EngineFactoryDecisions {
  const factories = state.factories ?? [];
  const firstFactoryId = factories[0]?.id ?? "factory-1";

  // Map UI efficiency investment to per-factory engine format
  const efficiencyInvestments: EngineFactoryDecisions["efficiencyInvestments"] = {};
  if (ui.efficiencyInvestment.workers > 0 || ui.efficiencyInvestment.engineers > 0 || ui.efficiencyInvestment.equipment > 0) {
    efficiencyInvestments[firstFactoryId] = {
      workers: ui.efficiencyInvestment.workers,
      engineers: ui.efficiencyInvestment.engineers,
      machinery: ui.efficiencyInvestment.equipment,
    };
  }

  // Map UI production allocations (segment → %) to engine format
  const productionAllocations: EngineFactoryDecisions["productionAllocations"] = [];
  for (const [segment, pct] of Object.entries(ui.productionAllocations)) {
    if (pct > 0) {
      productionAllocations.push({
        factoryId: firstFactoryId,
        lineId: factories[0]?.productionLines?.[0]?.id ?? "line-1",
        segment: segment as Segment,
        quantity: pct,
      });
    }
  }

  // Map ESG investment
  const greenInvestments: Record<string, number> = {};
  if (ui.esgInvestment > 0) {
    greenInvestments[firstFactoryId] = ui.esgInvestment;
  }

  // Separate machine purchases from factory upgrades
  const factoryUpgrades = ui.upgradePurchases.filter(u => !MACHINE_TYPES.has(u.upgradeName));
  const machinePurchases = ui.upgradePurchases.filter(u => MACHINE_TYPES.has(u.upgradeName));

  // Build machineryDecisions if there are machine purchases
  let machineryDecisions: EngineFactoryDecisions["machineryDecisions"];
  if (machinePurchases.length > 0) {
    machineryDecisions = {
      purchases: machinePurchases.map(u => ({
        factoryId: u.factoryId,
        machineType: u.upgradeName as MachineType,
        quantity: 1,
      })),
    };
  }

  // Pass through production line decisions if present
  const productionLineDecisions = ui.productionLineDecisions ? {
    assignments: ui.productionLineDecisions.assignments,
    targets: ui.productionLineDecisions.targets,
    staffing: ui.productionLineDecisions.staffing,
    machineAssignments: ui.productionLineDecisions.machineAssignments,
  } : undefined;

  // Pass through warehouse decisions if present
  const warehouseDecisions = ui.warehouseDecisions ? {
    build: ui.warehouseDecisions.build?.map(w => ({
      factoryId: w.factoryId,
      tier: w.tier as 0 | 1 | 2 | 3,
    })),
    rent: ui.warehouseDecisions.rent?.map(w => ({
      factoryId: w.factoryId,
      tier: w.tier as 0 | 1 | 2 | 3,
    })),
  } : undefined;

  // Convert ESG initiatives — UI sends string[] of active initiative IDs,
  // engine expects Record<string, boolean | number> with initiative IDs as keys
  const esgInitiatives = (() => {
    if (!ui.esgInitiatives) return undefined;
    // Handle both formats: string[] (from toggle buttons) or Record (legacy)
    if (Array.isArray(ui.esgInitiatives)) {
      const result: Record<string, boolean> = {};
      for (const id of ui.esgInitiatives as unknown as string[]) {
        result[id] = true;
      }
      return Object.keys(result).length > 0 ? result : undefined;
    }
    return { ...ui.esgInitiatives };
  })();

  return {
    efficiencyInvestments,
    greenInvestments,
    upgradePurchases: factoryUpgrades.map(u => ({
      factoryId: u.factoryId,
      upgrade: u.upgradeName as any,
    })),
    newFactories: ui.newFactories.map(f => ({
      name: f.name,
      region: f.region as any,
      tier: (f as { tier?: string }).tier as any,
    })),
    productionAllocations,
    productionLineDecisions,
    warehouseDecisions,
    esgInitiatives,
    machineryDecisions,
    // Pass through maintenance and shift mode to engine
    shiftMode: ui.shiftMode,
  } as EngineFactoryDecisions;
}

export function convertHRDecisions(ui: UIHRDecisions): EngineHRDecisions {
  return {
    hires: ui.hires.map(h => ({
      factoryId: "factory-1", // Default factory — multi-factory support TODO
      role: h.role as EmployeeRole,
      candidateId: h.candidateId,
      candidateData: h.candidateData ? {
        name: h.candidateData.name,
        stats: h.candidateData.stats as unknown as EmployeeStats,
        salary: h.candidateData.salary,
      } : undefined,
    })),
    fires: ui.fires,
    recruitmentSearches: ui.recruitmentSearches.map(r => ({
      role: r.role as EmployeeRole,
      tier: r.tier as "basic" | "premium" | "executive",
      factoryId: "factory-1", // Default factory — multi-factory support TODO
    })),
    salaryMultiplierChanges: ui.salaryAdjustment !== 0
      ? {
          workers: 1 + ui.salaryAdjustment / 100,
          engineers: 1 + ui.salaryAdjustment / 100,
          supervisors: 1 + ui.salaryAdjustment / 100,
        }
      : undefined,
    trainingPrograms: ui.trainingPrograms.map(t => ({
      role: t.role as EmployeeRole,
      programType: t.programType,
    })),
    // Wire benefits changes to engine
    benefitChanges: ui.benefitChanges && Object.keys(ui.benefitChanges).length > 0
      ? ui.benefitChanges as unknown as EngineHRDecisions["benefitChanges"]
      : undefined,
  };
}

export function convertFinanceDecisions(ui: UIFinanceDecisions): EngineFinanceDecisions {
  return {
    treasuryBillsIssue: ui.issueTBills || undefined,
    corporateBondsIssue: ui.issueBonds || undefined,
    stockIssuance: ui.issueShares
      ? { shares: ui.issueShares.count, pricePerShare: ui.issueShares.pricePerShare }
      : undefined,
    sharesBuyback: ui.sharesBuyback || undefined,
    dividendPerShare: ui.dividendPerShare || undefined,
    // Wire FX hedging to engine (was captured in UI but never sent)
    fxHedging: ui.fxHedging && Object.keys(ui.fxHedging).length > 0
      ? ui.fxHedging
      : undefined,
  };
}

// Brand activity definitions: id → { name, cost, brandImpact }
export const BRAND_ACTIVITY_MAP: Record<string, { name: string; cost: number; brandImpact: number }> = {
  celebrity: { name: "Celebrity Endorsement", cost: 15_000_000, brandImpact: 0.10 },
  sponsorship: { name: "Major Event Sponsorship", cost: 20_000_000, brandImpact: 0.08 },
  csr: { name: "CSR Initiative", cost: 10_000_000, brandImpact: 0.05 },
  refresh: { name: "Brand Refresh", cost: 8_000_000, brandImpact: 0.07 },
};

export function convertMarketingDecisions(ui: UIMarketingDecisions): EngineMarketingDecisions {
  // Flatten adBudgets: Record<segment, Record<channel, amount>> → Record<segment, total>
  const advertisingBudget: Partial<Record<Segment, number>> = {};
  for (const [segment, channels] of Object.entries(ui.adBudgets)) {
    const total = Object.values(channels).reduce((sum, v) => sum + v, 0);
    if (total > 0) {
      advertisingBudget[segment as Segment] = total;
    }
  }

  // Map brand activities to engine sponsorships
  const sponsorships = (ui.brandActivities ?? [])
    .map(id => BRAND_ACTIVITY_MAP[id])
    .filter((a): a is { name: string; cost: number; brandImpact: number } => !!a);

  // Map product pricing: Record<productId, price> → array format
  const productPricing = ui.productPricing && Object.keys(ui.productPricing).length > 0
    ? Object.entries(ui.productPricing).map(([productId, newPrice]) => ({ productId, newPrice }))
    : undefined;

  return {
    advertisingBudget,
    brandingInvestment: ui.brandInvestment || undefined,
    promotions: ui.promotions.map(p => ({
      segment: p.type as Segment,
      discountPercent: p.intensity,
      duration: 1,
    })),
    sponsorships: sponsorships.length > 0 ? sponsorships : undefined,
    productPricing,
  };
}

export function convertRDDecisions(ui: UIRDDecisions): EngineRDDecisions {
  return {
    rdBudget: ui.rdInvestment || undefined,
    newProducts: ui.newProducts.map(p => ({
      name: p.name,
      segment: p.segment as Segment,
      targetQuality: p.qualityTarget,
      targetFeatures: p.featuresTarget,
      archetypeId: p.archetypeId,
    })),
    // Fix: wire tech upgrades, product improvements, and patent decisions to engine
    productImprovements: (ui as unknown as Record<string, unknown>).productImprovements as EngineRDDecisions["productImprovements"] ?? undefined,
    patentFilings: ui.patentFilings?.length ? ui.patentFilings : undefined,
    patentLicenseRequests: ui.patentLicenseRequests?.length ? ui.patentLicenseRequests : undefined,
    patentChallenges: ui.patentChallenges?.length ? ui.patentChallenges : undefined,
  };
}
