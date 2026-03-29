// ============================================================
// OutputTab.tsx — Visual, data-driven production dashboard
// Bars, proportions, sliders. No hand-holding.
// ============================================================
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { formatNumber } from "@/lib/utils";
import { Package } from "lucide-react";
import type { TeamState, Factory as FactoryType, FactoryUpgrade } from "@/engine/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORKER_UNITS_PER_HEAD = 5_000;
const DEFAULT_EFFICIENCY = 0.8;
const SLOTS_PER_LINE = 10;

const DEFAULT_DEMAND: Record<string, number> = {
  Budget: 700_000,
  General: 450_000,
  Enthusiast: 150_000,
  Professional: 80_000,
  "Active Lifestyle": 200_000,
};

const UPGRADE_CAPACITY_BONUSES: Partial<Record<FactoryUpgrade, { label: string; bonus: number }>> = {
  automation:             { label: "Automation",             bonus: 0.15 },
  advancedRobotics:      { label: "Advanced Robotics",      bonus: 0.15 },
  leanManufacturing:     { label: "Lean Manufacturing",     bonus: 0.10 },
  continuousImprovement: { label: "Continuous Improvement",  bonus: 0.10 },
  flexibleManufacturing: { label: "Flexible Manufacturing",  bonus: 0.10 },
};
const MAX_UPGRADE_BONUS = 0.5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SegmentDemandInfo { totalDemand: number }

interface OutputTabProps {
  selectedFactory: FactoryType;
  state: TeamState | null;
  activeSegments: Set<string>;
  setActiveTab: (tab: string) => void;
  factoryPreview: { previewState?: TeamState | null };
  marketState?: { demandBySegment?: Record<string, SegmentDemandInfo> } | null;
  shiftMode: "single" | "double" | "overtime";
  setShiftMode: (mode: "single" | "double" | "overtime") => void;
  productionAllocations?: Record<string, number>;
  setProductionAllocations?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

// ---------------------------------------------------------------------------
// Bar component
// ---------------------------------------------------------------------------

function Bar({ pct, color, label, sub }: { pct: number; color: string; label: string; sub?: string }) {
  const w = Math.max(1, Math.min(100, pct));
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex-1 h-5 bg-slate-700/60 rounded-sm overflow-hidden relative">
        <div className={`h-full ${color} rounded-sm transition-all`} style={{ width: `${w}%` }} />
      </div>
      <span className="text-white font-mono text-xs w-32 text-right shrink-0">{label}</span>
      {sub && <span className="text-slate-400 text-xs shrink-0">{sub}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OutputTab({
  selectedFactory,
  state,
  activeSegments,
  factoryPreview,
  marketState,
  shiftMode,
  setShiftMode,
  productionAllocations,
  setProductionAllocations,
}: OutputTabProps) {
  // ---- Machines ----
  const previewMachines = factoryPreview.previewState?.machineryStates?.[selectedFactory.id]?.machines ?? [];
  const savedMachines = state?.machineryStates?.[selectedFactory.id]?.machines ?? [];
  const machines = previewMachines.length > 0 ? previewMachines : savedMachines;

  // ---- Machine capacity (SUM of all operational machines) ----
  const { machineCapacity } = useMemo(() => {
    const operational = machines.filter((m: Record<string, unknown>) => m.status === "operational");
    if (operational.length === 0) return { machineCapacity: 0 };
    const total = operational.reduce((sum: number, m: Record<string, unknown>) => {
      const cap = (m.capacityUnits as number) ?? (m.capacity as number) ?? 0;
      return sum + cap;
    }, 0);
    return { machineCapacity: total };
  }, [machines]);

  // ---- Workers ----
  const workerCount = selectedFactory.workers ?? 0;
  const workerEfficiency = selectedFactory.efficiency ?? DEFAULT_EFFICIENCY;
  const workerCapacity = Math.round(workerCount * WORKER_UNITS_PER_HEAD * workerEfficiency);

  // ---- Upgrade bonus ----
  const { upgradeBonus, activeUpgradeCount } = useMemo(() => {
    let total = 0; let count = 0;
    for (const upg of selectedFactory.upgrades ?? []) {
      const info = UPGRADE_CAPACITY_BONUSES[upg];
      if (info) { total += info.bonus; count++; }
    }
    total = Math.min(total, MAX_UPGRADE_BONUS);
    return { upgradeBonus: total, activeUpgradeCount: count };
  }, [selectedFactory.upgrades]);

  // ---- Effective capacity (machines = hard cap, workers = staffing efficiency) ----
  const staffingRatio = workerCapacity > 0 ? Math.min(1, workerCapacity / (machineCapacity || 1)) : 0;
  const effectiveCapacity = Math.round(machineCapacity * staffingRatio * (1 + upgradeBonus));

  // ---- Machine slots ----
  const maxSlots = (selectedFactory.maxLines ?? 3) * SLOTS_PER_LINE;
  const usedSlots = machines.length;

  // ---- Per-segment last-round sold ----
  const lastRoundSoldBySegment = useMemo(() => {
    const result: Record<string, number> = {};
    if (!state?.products) return result;
    for (const product of state.products) {
      const seg = product.segment;
      if (seg) result[seg] = (result[seg] ?? 0) + (product.unitsSold ?? 0);
    }
    return result;
  }, [state?.products]);

  // ---- ESG ----
  const esgScore = (state as Record<string, unknown>)?.esgScore as number ?? 0;

  const segments = Array.from(activeSegments);

  // ================================================================
  // Render
  // ================================================================
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-3">
      {segments.length === 0 && (
        <div className="py-20 text-center">
          <Package className="w-10 h-10 mx-auto mb-2 text-slate-600" />
          <p className="text-slate-500 text-sm">Launch products in R&D</p>
        </div>
      )}

      {segments.map((segment) => {
        const totalDemand = marketState?.demandBySegment?.[segment]?.totalDemand ?? DEFAULT_DEMAND[segment] ?? 100_000;
        const lastSold = lastRoundSoldBySegment[segment] ?? 0;
        const unsold = Math.max(0, effectiveCapacity - lastSold);
        const utilPct = effectiveCapacity > 0 ? (lastSold / effectiveCapacity) * 100 : 0;
        const prodPct = totalDemand > 0 ? (effectiveCapacity / totalDemand) * 100 : 0;

        const segProduct = state?.products?.find(
          (p: { segment: string; developmentStatus?: string }) => p.segment === segment && p.developmentStatus === "launched",
        ) as { unitCost?: number } | undefined;
        const unitCost = segProduct?.unitCost ?? 0;
        const matCost = Math.round(unitCost * 0.5);
        const laborCost = Math.round(unitCost * 0.3);
        const ohCost = Math.round(unitCost * 0.2);

        const machinePct = machineCapacity > 0 ? 100 : 0;
        const workerStaffPct = staffingRatio * 100;

        return (
          <div key={segment} className="bg-slate-800/80 border border-slate-700/50 rounded-lg overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-2.5 bg-slate-700/30 border-b border-slate-700/50">
              <span className="text-white font-semibold">{segment}</span>
              <span className="text-slate-400 text-sm font-mono">Market: {formatNumber(totalDemand, { compact: true })}</span>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Production */}
              <div>
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1.5">Production</div>
                <div className="h-6 bg-slate-700/60 rounded-sm overflow-hidden relative">
                  <div className="h-full bg-violet-400/80 rounded-sm transition-all" style={{ width: `${Math.min(100, prodPct)}%` }} />
                  <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-mono">
                    {formatNumber(effectiveCapacity)} / {formatNumber(totalDemand, { compact: true })} ({prodPct.toFixed(1)}%)
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono">
                  Last: Sold {formatNumber(lastSold)} | Unsold {formatNumber(unsold)} | {utilPct.toFixed(0)}% util
                </div>
              </div>

              {/* Constraints */}
              <div>
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1.5">Constraints</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs w-16 shrink-0">Machines</span>
                    <div className="flex-1 h-4 bg-slate-700/60 rounded-sm overflow-hidden">
                      <div className="h-full rounded-sm bg-blue-400/80" style={{ width: `${machinePct}%` }} />
                    </div>
                    <span className="text-xs text-white font-mono w-28 text-right shrink-0">
                      {formatNumber(machineCapacity)} hard cap
                    </span>
                    <span className="text-xs text-slate-500 font-mono w-16 text-right shrink-0">
                      {usedSlots}/{maxSlots} slots
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs w-16 shrink-0">Workers</span>
                    <div className="flex-1 h-4 bg-slate-700/60 rounded-sm overflow-hidden">
                      <div className={`h-full rounded-sm ${workerStaffPct >= 100 ? "bg-emerald-400/80" : "bg-amber-400/80"}`} style={{ width: `${Math.min(100, workerStaffPct)}%` }} />
                    </div>
                    <span className="text-xs text-white font-mono w-28 text-right shrink-0">
                      {workerStaffPct.toFixed(0)}% staffing
                    </span>
                    <span className="text-xs text-slate-500 font-mono w-16 text-right shrink-0">
                      {workerCount} heads
                    </span>
                  </div>
                </div>
              </div>

              {/* Cost */}
              {unitCost > 0 && (
                <div>
                  <div className="text-slate-400 text-xs uppercase tracking-wider mb-1.5">Cost</div>
                  <div className="flex gap-1 h-5">
                    <div className="bg-violet-400/70 rounded-sm flex items-center justify-center text-[10px] text-white font-mono" style={{ width: "50%" }}>
                      Mat ${matCost}
                    </div>
                    <div className="bg-violet-400/50 rounded-sm flex items-center justify-center text-[10px] text-white font-mono" style={{ width: "30%" }}>
                      Lab ${laborCost}
                    </div>
                    <div className="bg-violet-400/30 rounded-sm flex items-center justify-center text-[10px] text-white font-mono" style={{ width: "20%" }}>
                      OH ${ohCost}
                    </div>
                  </div>
                  <div className="text-xs text-white font-mono mt-1 text-right">= ${unitCost.toFixed(0)}/unit</div>
                </div>
              )}

              {/* Unsold stock cost (Capsim/BSG show this) */}
              {unsold > 0 && unitCost > 0 && (
                <div className="text-xs text-amber-400/80 font-mono">
                  Unsold stock: {formatNumber(unsold)} units × ${unitCost.toFixed(0)} = ${formatNumber(Math.round(unsold * unitCost * 0.02))}/round carrying cost
                </div>
              )}

              {/* Workforce + Upgrades */}
              <div className="flex justify-between text-xs border-t border-slate-700/40 pt-2">
                <span className="text-slate-400 font-mono">
                  {workerCount} workers | {selectedFactory.engineers ?? 0} eng | {selectedFactory.supervisors ?? 0} sup
                </span>
                <span className="text-slate-400 font-mono">
                  {activeUpgradeCount} upgrades {upgradeBonus > 0 && `(+${(upgradeBonus * 100).toFixed(0)}%)`} | ESG: {Math.round(esgScore)}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      {/* Shift mode */}
      {segments.length > 0 && (
        <div className="flex gap-2 pt-1">
          {([
            { mode: "single" as const, label: "1st" },
            { mode: "double" as const, label: "2nd \u00d72" },
            { mode: "overtime" as const, label: "OT \u00d71.5" },
          ]).map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setShiftMode(opt.mode)}
              className={`px-4 py-2 rounded text-sm font-mono transition-all ${
                shiftMode === opt.mode
                  ? "bg-violet-400/20 border border-violet-400 text-white"
                  : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
