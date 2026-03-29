// ============================================================
// ProductionTab.tsx — "How much can I produce & what's limiting me?"
// One card per active segment. Simple surface, deep mechanics.
// ============================================================
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Factory as FactoryIcon, AlertTriangle, Package } from "lucide-react";
import type { TeamState, Factory as FactoryType } from "@/engine/types";
import { MACHINE_CONFIGS } from "@/engine/machinery";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_MACHINES_PER_LINE = 10;
const WORKER_UNITS_PER_HEAD = 5_000;
const DEFAULT_EFFICIENCY = 0.8;
const DEFAULT_PRODUCT_CAPACITY = 200_000;

const DEFAULT_DEMAND: Record<string, number> = {
  Budget: 700_000,
  General: 450_000,
  Enthusiast: 150_000,
  Professional: 80_000,
  "Active Lifestyle": 200_000,
};

// Only show production machines as inline buy options
const CAPACITY_MACHINES = MACHINE_CONFIGS.filter((m) => (m as any).category === "production" || m.bucket === "capacity");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SegmentDemandInfo {
  totalDemand: number;
}

interface ProductionTabProps {
  selectedFactory: FactoryType;
  state: TeamState | null;
  activeSegments: Set<string>;
  productionAllocations?: Record<string, number>;
  setProductionAllocations?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  setActiveTab: (tab: string) => void;
  toggleUpgradePurchase: (upgradeId: string) => void;
  factoryPreview: { previewState?: TeamState | null };
  marketState?: { demandBySegment?: Record<string, SegmentDemandInfo> } | null;
  materialsState?: any;
  cash?: number;
  gameId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProductionTab({
  selectedFactory,
  state,
  activeSegments,
  productionAllocations,
  setProductionAllocations,
  setActiveTab,
  toggleUpgradePurchase,
  factoryPreview,
  marketState,
  materialsState,
  cash,
}: ProductionTabProps) {
  // ---- Machines (prefer preview, fallback to saved) ----
  const previewMachines =
    factoryPreview.previewState?.machineryStates?.[selectedFactory.id]?.machines ?? [];
  const savedMachines =
    state?.machineryStates?.[selectedFactory.id]?.machines ?? [];
  const machines = previewMachines.length > 0 ? previewMachines : savedMachines;

  // ---- Capacity calculations ----
  const machineCapacity = useMemo(
    () =>
      machines.reduce(
        (sum: number, m: Record<string, unknown>) =>
          sum +
          (m.status === "operational"
            ? ((m.capacityUnits as number) ?? (m.capacity as number) ?? 0)
            : 0),
        0,
      ),
    [machines],
  );

  const workerEfficiency = selectedFactory.efficiency ?? DEFAULT_EFFICIENCY;
  const workerCapacity = Math.round(
    (selectedFactory.workers ?? 0) * WORKER_UNITS_PER_HEAD * workerEfficiency,
  );

  // Machines = hard capacity cap; workers = staffing efficiency (not a cap)
  const staffingRatio = workerCapacity > 0 ? Math.min(1, workerCapacity / (machineCapacity || 1)) : 0;
  const effectiveCapacity = Math.round(machineCapacity * staffingRatio);
  const isWorkerBottleneck = staffingRatio < 1;

  // ---- Factory slot math ----
  const numLines = selectedFactory.productionLines?.length ?? 1;
  const maxSlots = MAX_MACHINES_PER_LINE * numLines;
  const usedSlots = machines.length;
  const factoryFull = usedSlots >= maxSlots;

  // ---- Material remaining helper ----
  function getMaterialRounds(segment: string): string | null {
    if (!materialsState?.inventory) return null;
    const inv = materialsState.inventory;
    // Find materials tagged to this segment
    const segMaterials = Array.isArray(inv)
      ? inv.filter((m: any) => m.segment === segment || !m.segment)
      : [];
    if (segMaterials.length === 0) return null;
    const minQty = Math.min(...segMaterials.map((m: any) => m.quantity ?? 0));
    const rounds = Math.floor(minQty / DEFAULT_PRODUCT_CAPACITY);
    return rounds > 0 ? `${rounds} rounds remaining` : "Low stock";
  }

  // ---- Active segments list ----
  const segments = Array.from(activeSegments);

  const availableCash = cash ?? state?.cash ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Empty state */}
      {segments.length === 0 && (
        <Card className="bg-slate-800/80 border-slate-700/50">
          <CardContent className="py-16 text-center">
            <Package className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 text-lg">No active segments yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Launch a product in R&amp;D to start production planning.
            </p>
          </CardContent>
        </Card>
      )}

      {/* One card per active segment */}
      {segments.map((segment) => {
        const totalDemand =
          marketState?.demandBySegment?.[segment]?.totalDemand ??
          DEFAULT_DEMAND[segment] ??
          100_000;
        const marketShare =
          totalDemand > 0 ? (effectiveCapacity / totalDemand) * 100 : 0;
        const materialInfo = getMaterialRounds(segment);

        return (
          <Card
            key={segment}
            className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm"
          >
            <CardContent className="p-5 space-y-4">
              {/* Header: segment name + market demand */}
              <div className="flex justify-between items-baseline">
                <h3 className="text-white text-lg font-semibold">{segment}</h3>
                <span className="text-slate-400 text-sm">
                  Market: {formatNumber(totalDemand)} units
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-600/60" />

              {/* Output headline */}
              <p className="text-white text-base">
                Your Output:{" "}
                <span className="text-emerald-400 font-bold">
                  {formatNumber(effectiveCapacity)} units/round
                </span>
                <span className="text-slate-500 ml-2">
                  ({marketShare.toFixed(1)}% of market)
                </span>
              </p>

              {/* Capacity breakdown */}
              <div className="space-y-1.5 text-sm pl-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 w-24">Machines:</span>
                  <span className="text-white font-medium">
                    {formatNumber(machineCapacity)} cap
                  </span>
                  {!isWorkerBottleneck && machineCapacity <= workerCapacity ? (
                    <span className="text-yellow-400 text-xs">&#x26A0; limiting</span>
                  ) : (
                    <span className="text-green-400 text-xs">&#x2713;</span>
                  )}
                  <span className="text-slate-500 ml-auto text-xs">
                    {usedSlots}/{maxSlots} slots used
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 w-24">Workers:</span>
                  <span className="text-white font-medium">
                    {(staffingRatio * 100).toFixed(0)}% staffing
                  </span>
                  {isWorkerBottleneck ? (
                    <span className="text-yellow-400 text-xs">&#x26A0; understaffed</span>
                  ) : (
                    <span className="text-green-400 text-xs">&#x2713;</span>
                  )}
                </div>

                {materialInfo && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-24">Materials:</span>
                    <span className="text-white font-medium">{materialInfo}</span>
                  </div>
                )}
                {!materialInfo && materialsState && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 w-24">Materials:</span>
                    <button
                      className="text-cyan-400 text-xs underline"
                      onClick={() => setActiveTab("supply-chain")}
                    >
                      Order materials &rarr; Supply Chain
                    </button>
                  </div>
                )}
              </div>

              {/* Bottleneck callout */}
              <div className="flex items-center gap-2 bg-slate-700/40 rounded-lg px-3 py-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                {isWorkerBottleneck ? (
                  <span className="text-slate-300">
                    <span className="text-yellow-400 font-medium">Understaffed: Workers at {(staffingRatio * 100).toFixed(0)}%</span>
                    {" — "}
                    <button
                      className="text-cyan-400 underline"
                      onClick={() => setActiveTab("hr")}
                    >
                      hire more in HR tab
                    </button>
                  </span>
                ) : (
                  <span className="text-slate-300">
                    <span className="text-yellow-400 font-medium">Bottleneck: Machines</span>
                    {" — add capacity below"}
                  </span>
                )}
              </div>

              {/* Inline purchase buttons */}
              {!factoryFull ? (
                <div className="space-y-2">
                  <p className="text-slate-400 text-xs uppercase tracking-wider">
                    Increase Capacity
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {CAPACITY_MACHINES.map((mc) => {
                      const tooExpensive = mc.baseCost > availableCash;
                      return (
                        <button
                          key={mc.type}
                          disabled={tooExpensive}
                          onClick={() => toggleUpgradePurchase(mc.type)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            tooExpensive
                              ? "bg-slate-800/40 border-slate-700 text-slate-600 cursor-not-allowed"
                              : "bg-slate-700/60 border-slate-600 text-white hover:bg-slate-600/60 hover:border-cyan-500/40"
                          }`}
                        >
                          + {mc.name} {formatCurrency(mc.baseCost, { compact: true })}{" "}
                          +{formatNumber(mc.baseCapacity)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2 text-sm">
                  <FactoryIcon className="w-4 h-4 text-orange-400" />
                  <span className="text-orange-300">
                    Factory full &mdash;{" "}
                    <button
                      className="text-cyan-400 underline"
                      onClick={() => setActiveTab("upgrades")}
                    >
                      Build New Factory &rarr; Upgrades tab
                    </button>
                  </span>
                </div>
              )}

              {/* Factory slots counter */}
              <div className="text-xs text-slate-500 pl-2">
                Factory: {usedSlots}/{maxSlots} machine slots used (
                {(selectedFactory.tier ?? "medium").charAt(0).toUpperCase() +
                  (selectedFactory.tier ?? "medium").slice(1)}{" "}
                factory, {numLines} line{numLines !== 1 ? "s" : ""})
              </div>
            </CardContent>
          </Card>
        );
      })}
    </motion.div>
  );
}
