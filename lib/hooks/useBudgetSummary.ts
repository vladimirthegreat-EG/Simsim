"use client";

import { useMemo } from "react";
import { useDecisionStore } from "@/lib/stores/decisionStore";
import { CONSTANTS } from "@/engine/types";
import { BRAND_ACTIVITY_MAP } from "@/lib/converters/decisionConverters";
import { getMachinePurchaseInfo } from "@/engine/machinery/MachineCatalog";
import type { MachineType } from "@/engine/machinery/types";

// All valid machine types for separating machine purchases from factory upgrades
const MACHINE_TYPES = new Set([
  "assembly_line", "cnc_machine", "robotic_arm", "conveyor_system",
  "quality_scanner", "3d_printer", "welding_station", "packaging_system",
  "injection_molder", "pcb_assembler", "paint_booth", "laser_cutter",
  "testing_rig", "clean_room_unit", "forklift_fleet",
]);

export interface ModuleCostEntry {
  module: "RD" | "FACTORY" | "FINANCE" | "HR" | "MARKETING";
  label: string;
  cost: number; // negative = spend, positive = cash inflow (e.g., bonds)
  status: "submitted" | "dirty" | "pending" | "estimate";
}

export interface BudgetSummary {
  startingCash: number;
  modules: ModuleCostEntry[];
  totalCommitted: number;
  remaining: number;
}

/**
 * Compute per-module costs from the Zustand decision store.
 * This does NOT call the engine — it uses CONSTANTS and decision store data.
 * Module order: R&D → Factory → HR → Finance → Marketing
 */
export function useBudgetSummary(startingCash: number): BudgetSummary {
  const rd = useDecisionStore((s) => s.rd);
  const factory = useDecisionStore((s) => s.factory);
  const finance = useDecisionStore((s) => s.finance);
  const hr = useDecisionStore((s) => s.hr);
  const marketing = useDecisionStore((s) => s.marketing);
  const status = useDecisionStore((s) => s.submissionStatus);

  return useMemo(() => {
    // Module order matches decision flow: R&D → Factory → HR → Finance → Marketing
    const modules: ModuleCostEntry[] = [];

    // --- 1. R&D costs ---
    const rdStatus = getModuleStatus(status.RD);
    if (rdStatus !== "pending") {
      const rdCost = rd.rdInvestment ?? 0;
      modules.push({ module: "RD", label: "R&D", cost: -rdCost, status: rdStatus });
    } else {
      modules.push({ module: "RD", label: "R&D", cost: 0, status: "pending" });
    }

    // --- 2. Factory costs ---
    const factoryStatus = getModuleStatus(status.FACTORY);
    if (factoryStatus !== "pending") {
      let factoryCost = 0;
      // Efficiency investments
      const eff = factory.efficiencyInvestment;
      factoryCost += (eff?.workers ?? 0) + (eff?.engineers ?? 0) + (eff?.equipment ?? 0);
      // ESG investment
      factoryCost += factory.esgInvestment ?? 0;
      // Upgrade purchases
      for (const up of factory.upgradePurchases ?? []) {
        if (MACHINE_TYPES.has(up.upgradeName)) {
          // Machine purchase — look up cost from catalog
          try {
            const info = getMachinePurchaseInfo(up.upgradeName as MachineType);
            factoryCost += info?.cost ?? 5_000_000;
          } catch {
            factoryCost += 5_000_000; // fallback estimate
          }
        } else {
          // Factory upgrade — look up cost from CONSTANTS
          const upgradeCost = (CONSTANTS.UPGRADE_COSTS as Record<string, number>)[up.upgradeName];
          factoryCost += upgradeCost ?? 0;
        }
      }
      // New factories
      factoryCost += (factory.newFactories?.length ?? 0) * CONSTANTS.NEW_FACTORY_COST;
      modules.push({ module: "FACTORY", label: "Factory", cost: -factoryCost, status: factoryStatus });
    } else {
      modules.push({ module: "FACTORY", label: "Factory", cost: 0, status: "pending" });
    }

    // --- 3. HR costs ---
    const hrStatus = getModuleStatus(status.HR);
    if (hrStatus !== "pending") {
      let hrCost = 0;
      // Recruitment search costs
      for (const search of hr.recruitmentSearches ?? []) {
        const tier = search.tier as keyof typeof CONSTANTS.RECRUITMENT_COSTS;
        hrCost += CONSTANTS.RECRUITMENT_COSTS[tier] ?? 0;
      }
      // Hiring costs (HIRING_COST_MULTIPLIER × salary)
      for (const hire of hr.hires ?? []) {
        const salary = hire.candidateData?.salary ?? 45_000; // fallback to worker salary
        hrCost += salary * CONSTANTS.HIRING_COST_MULTIPLIER;
      }
      // Training program costs
      for (const program of hr.trainingPrograms ?? []) {
        const role = program.role as keyof typeof CONSTANTS.TRAINING_COSTS;
        hrCost += CONSTANTS.TRAINING_COSTS[role] ?? 50_000;
      }
      modules.push({ module: "HR", label: "HR", cost: -hrCost, status: hrStatus });
    } else {
      modules.push({ module: "HR", label: "HR", cost: 0, status: "pending" });
    }

    // --- 5. Finance (special: can add or remove cash) ---
    const financeStatus = getModuleStatus(status.FINANCE);
    if (financeStatus !== "pending") {
      let financeNet = 0;
      financeNet += finance.issueTBills ?? 0;
      financeNet += finance.issueBonds ?? 0;
      if (finance.issueShares) {
        financeNet += (finance.issueShares.count ?? 0) * (finance.issueShares.pricePerShare ?? 0);
      }
      financeNet -= finance.sharesBuyback ?? 0;
      modules.push({ module: "FINANCE", label: "Finance", cost: financeNet, status: financeStatus });
    } else {
      modules.push({ module: "FINANCE", label: "Finance", cost: 0, status: "pending" });
    }

    // --- 6. Marketing costs ---
    const mktStatus = getModuleStatus(status.MARKETING);
    if (mktStatus !== "pending") {
      let mktCost = 0;
      // Ad budgets
      if (marketing.adBudgets) {
        for (const channels of Object.values(marketing.adBudgets)) {
          for (const amount of Object.values(channels as Record<string, number>)) {
            mktCost += amount;
          }
        }
      }
      // Brand investment
      mktCost += marketing.brandInvestment ?? 0;
      // Brand activities
      for (const actId of marketing.brandActivities ?? []) {
        mktCost += BRAND_ACTIVITY_MAP[actId]?.cost ?? 0;
      }
      modules.push({ module: "MARKETING", label: "Marketing", cost: -mktCost, status: mktStatus });
    } else {
      modules.push({ module: "MARKETING", label: "Marketing", cost: 0, status: "pending" });
    }

    // Total committed (negative values are spending)
    const totalCommitted = modules.reduce((sum, m) => sum + m.cost, 0);
    const remaining = startingCash + totalCommitted;

    return { startingCash, modules, totalCommitted, remaining };
  }, [rd, factory, finance, hr, marketing, status, startingCash]);
}

function getModuleStatus(
  s: { isSubmitted: boolean; isDirty: boolean }
): "submitted" | "dirty" | "pending" {
  if (s.isSubmitted && !s.isDirty) return "submitted";
  if (s.isDirty) return "dirty";
  return "pending";
}
