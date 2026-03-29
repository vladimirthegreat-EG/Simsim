// ============================================================
// ProductionLinesTab.tsx — Per-line management (Capsim/BSG model)
// Each line: 1 product, assigned machines, assigned workers
// Player controls: activate lines, assign products, allocate workers, assign machines
// ============================================================
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatNumber, formatCurrency } from "@/lib/utils";
import {
  Factory,
  Package,
  Users,
  Cog,
  AlertTriangle,
  Plus,
  ChevronRight,
  Gauge,
  Wrench,
} from "lucide-react";
import type { TeamState, Factory as FactoryType, Product } from "@/engine/types";
import type { ProductionLine, Segment } from "@/engine/types/factory";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SegmentDemandInfo { totalDemand: number }

interface ProductionLinesTabProps {
  selectedFactory: FactoryType;
  state: TeamState | null;
  factoryPreview: { previewState?: TeamState | null };
  // Decision handlers
  onAssignProduct: (lineId: string, productId: string, segment: Segment) => void;
  onSetWorkers: (lineId: string, workers: number) => void;
  onSetTarget: (lineId: string, target: number) => void;
  onActivateLine: (lineId: string) => void;
  // Shift mode
  shiftMode?: "single" | "double" | "overtime";
  setShiftMode?: (mode: "single" | "double" | "overtime") => void;
  // Market demand
  marketState?: { demandBySegment?: Record<string, SegmentDemandInfo> } | null;
  // Current pending decisions
  pendingWorkerChanges?: Record<string, number>;
  pendingTargetChanges?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLineMachineCapacity(
  state: TeamState | null,
  factoryId: string,
  lineId: string
): { totalCap: number; machineCount: number; machineNames: string[] } {
  if (!state?.machineryStates?.[factoryId]) return { totalCap: 0, machineCount: 0, machineNames: [] };
  const machines = state.machineryStates[factoryId].machines ?? [];
  const lineMachines = machines.filter(
    (m: any) => m.assignedLineId === lineId && m.status === "operational"
  );
  const totalCap = lineMachines.reduce((s: number, m: any) => s + (m.capacityUnits ?? 0), 0);
  const names = lineMachines.map((m: any) => m.name ?? m.type);
  return { totalCap, machineCount: lineMachines.length, machineNames: names };
}

function getStaffingInfo(workers: number, machineCapacity: number) {
  const BASE_WORKER_OUTPUT = 5_000;
  const efficiency = 0.8;
  const required = machineCapacity > 0
    ? Math.ceil(machineCapacity / (BASE_WORKER_OUTPUT * efficiency))
    : 0;
  const ratio = required > 0 ? Math.min(1.0, workers / required) : 1.0;
  let status: "full" | "understaffed" | "shutdown" | "idle" = "idle";
  if (required === 0) status = "idle";
  else if (ratio >= 1.0) status = "full";
  else if (ratio >= 0.5) status = "understaffed";
  else status = "shutdown";
  return { required, ratio, status };
}

function getBottleneck(machineCapacity: number, workers: number, target: number, staffing: ReturnType<typeof getStaffingInfo>) {
  if (staffing.status === "shutdown") return { label: `${workers}/${staffing.required} workers — line shut down`, color: "text-red-400" };
  if (staffing.status === "understaffed") {
    // Show actual output multiplier (stress cliff: below 80% staffing, output drops faster than linear)
    const effectiveRatio = staffing.ratio >= 0.8 ? staffing.ratio : staffing.ratio * 0.85;
    return { label: `${workers}/${staffing.required} workers — ${Math.floor(effectiveRatio * 100)}% effective output`, color: "text-amber-400" };
  }
  if (machineCapacity > 0 && machineCapacity <= target) return { label: `Machines: ${machineCapacity.toLocaleString()} cap`, color: "text-amber-400" };
  if (machineCapacity === 0) return { label: "No machines assigned", color: "text-red-400" };
  return { label: `${workers}/${staffing.required} workers`, color: "text-emerald-400" };
}

function estimateOutput(machineCapacity: number, staffingRatio: number, efficiency: number) {
  if (staffingRatio === 0) return 0;
  return Math.floor(machineCapacity * staffingRatio * efficiency * (1 - 0.06)); // 6% base defect
}

// ---------------------------------------------------------------------------
// Line Card Component
// ---------------------------------------------------------------------------

function LineCard({
  line,
  factory,
  state,
  products,
  onAssignProduct,
  onSetWorkers,
  onSetTarget,
  onActivateLine,
  pendingWorkers,
  pendingTarget,
}: {
  line: ProductionLine;
  factory: FactoryType;
  state: TeamState | null;
  products: Product[];
  onAssignProduct: (lineId: string, productId: string, segment: Segment) => void;
  onSetWorkers: (lineId: string, workers: number) => void;
  onSetTarget: (lineId: string, target: number) => void;
  onActivateLine: (lineId: string) => void;
  pendingWorkers?: number;
  pendingTarget?: number;
}) {
  const isActive = line.status === "active" && line.productId;
  const isIdle = line.status === "idle" || !line.productId;
  const isChangeover = line.status === "changeover";

  const { totalCap, machineCount, machineNames } = getLineMachineCapacity(state, factory.id, line.id);
  const workers = pendingWorkers ?? line.assignedWorkers ?? 0;
  const target = pendingTarget ?? line.targetOutput ?? 0;
  const staffing = getStaffingInfo(workers, totalCap);
  const bottleneck = getBottleneck(totalCap, workers, target, staffing);
  const projectedOutput = estimateOutput(Math.min(totalCap, target), staffing.ratio, factory.efficiency ?? 0.7);

  const product = products.find(p => p.id === line.productId);

  // Available workers = total factory workers - workers assigned to other lines
  const otherLinesWorkers = (factory.productionLines ?? [])
    .filter(l => l.id !== line.id)
    .reduce((s, l) => s + (l.assignedWorkers ?? 0), 0);
  const availableWorkers = Math.max(0, (factory.workers ?? 0) - otherLinesWorkers);
  const maxWorkersForLine = workers + availableWorkers;

  // Unassigned products (not on any active line in this factory)
  const assignedProductIds = new Set(
    (factory.productionLines ?? []).filter(l => l.productId && l.id !== line.id).map(l => l.productId)
  );
  const unassignedProducts = products.filter(
    p => p.developmentStatus === "launched" && !assignedProductIds.has(p.id)
  );

  // ---- IDLE LINE ----
  if (isIdle) {
    return (
      <Card className="bg-slate-800/40 border-slate-700/30 border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                <Plus className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-slate-400 font-medium">{line.id} — Idle</p>
                <p className="text-slate-500 text-xs">Assign a product to activate this line</p>
              </div>
            </div>
            {unassignedProducts.length > 0 ? (
              <div className="flex gap-2">
                {unassignedProducts.slice(0, 3).map(p => (
                  <Button
                    key={p.id}
                    size="sm"
                    variant="outline"
                    className="text-xs border-slate-600 hover:border-cyan-500"
                    onClick={() => onAssignProduct(line.id, p.id, p.segment as Segment)}
                  >
                    + {p.name}
                  </Button>
                ))}
              </div>
            ) : (
              <span className="text-slate-500 text-xs">No unassigned products — develop new ones in R&D</span>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- CHANGEOVER LINE ----
  if (isChangeover) {
    return (
      <Card className="bg-slate-800/60 border-amber-700/40">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <p className="text-white font-medium">{line.id} — Changeover</p>
              <p className="text-amber-400 text-sm">
                Switching to {product?.name ?? "new product"} — {line.changeoverRoundsRemaining ?? 1} round(s) remaining
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ---- ACTIVE LINE ----
  return (
    <Card className="bg-slate-800/80 border-slate-700/50">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-900/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-white font-medium">{product?.name ?? line.productId}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs border-slate-600 text-slate-300">
                  {line.segment}
                </Badge>
                <span className="text-slate-500 text-xs">{line.id}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-emerald-400 font-bold text-lg font-mono">
              {formatNumber(projectedOutput)}
            </p>
            <p className="text-slate-500 text-xs">projected output</p>
            {/* Fix 10: Per-line profitability estimate */}
            {(() => {
              const segProduct = (products as any[]).find(
                (p: any) => p.segment === line.segment && p.developmentStatus === "launched"
              );
              if (!segProduct?.price || !segProduct?.unitCost) return null;
              const margin = segProduct.price - segProduct.unitCost;
              const estProfit = Math.round(projectedOutput * margin);
              return (
                <p className={`text-xs font-mono mt-0.5 ${margin > 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                  ~${formatNumber(estProfit)} margin
                </p>
              );
            })()}
          </div>
        </div>

        {/* Machine + Worker bars */}
        <div className="grid grid-cols-2 gap-4">
          {/* Machines */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Cog className="w-3 h-3" /> Machines
              </span>
              <span className="text-white text-xs font-mono">{machineCount} = {formatNumber(totalCap)} cap</span>
            </div>
            <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, machineCount > 0 ? (machineCount / 6) * 100 : 0)}%` }}
              />
            </div>
            <div className="text-slate-500 text-[10px] mt-0.5">
              {machineNames.length > 0 ? machineNames.join(", ") : "No machines — assign in Capacity tab"}
            </div>
          </div>

          {/* Workers */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-xs flex items-center gap-1">
                <Users className="w-3 h-3" /> Workers
              </span>
              <span className="text-white text-xs font-mono">
                {workers}/{staffing.required} needed
                {staffing.status === "full" && <span className="text-emerald-400 ml-1">✓</span>}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={maxWorkersForLine}
                value={workers}
                onChange={(e) => onSetWorkers(line.id, parseInt(e.target.value))}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-violet-400"
              />
              <span className="text-white text-xs font-mono w-8 text-right">{workers}</span>
            </div>
            <div className="text-slate-500 text-[10px] mt-0.5">
              {staffing.status === "shutdown" && "⚠ Below 50% — line shut down!"}
              {staffing.status === "understaffed" && `⚠ ${Math.floor(staffing.ratio * 100)}% staffed — output reduced`}
              {staffing.status === "full" && "Fully staffed"}
              {staffing.status === "idle" && "Add machines first"}
            </div>
          </div>
        </div>

        {/* Target output */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs flex items-center gap-1">
              <Gauge className="w-3 h-3" /> Target Output
            </span>
            <span className="text-white text-xs font-mono">{formatNumber(target)} units</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(totalCap, target, 10000)}
            step={1000}
            value={target}
            onChange={(e) => onSetTarget(line.id, parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
            <span>0</span>
            <span>Machine cap: {formatNumber(totalCap)}</span>
          </div>
        </div>

        {/* Bottleneck + Material status */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 bg-slate-700/30 rounded px-3 py-1.5">
            <AlertTriangle className={`w-3 h-3 ${bottleneck.color}`} />
            <span className={bottleneck.color}>{bottleneck.label}</span>
          </div>
          {/* Fix 11: Material availability indicator */}
          {line.segment && (() => {
            const inv = state?.inventory?.finishedGoods as Record<string, number> | undefined;
            const rawMat = state?.inventory?.rawMaterials ?? 0;
            const hasInventory = rawMat > 0 || (inv && Object.values(inv).some(v => v > 0));
            return (
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${hasInventory ? 'bg-emerald-900/20 text-emerald-400' : 'bg-amber-900/20 text-amber-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${hasInventory ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {hasInventory ? 'Materials OK' : 'Materials low'}
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function ProductionLinesTab({
  selectedFactory,
  state,
  factoryPreview,
  onAssignProduct,
  onSetWorkers,
  onSetTarget,
  onActivateLine,
  shiftMode = "single",
  setShiftMode,
  marketState,
  pendingWorkerChanges = {},
  pendingTargetChanges = {},
}: ProductionLinesTabProps) {
  const effectiveState = factoryPreview.previewState ?? state;
  const products = effectiveState?.products ?? [];
  const lines = selectedFactory.productionLines ?? [];

  const activeLines = lines.filter(l => l.status === "active" && l.productId);
  const idleLines = lines.filter(l => l.status === "idle" || !l.productId);
  const changeoverLines = lines.filter(l => l.status === "changeover");

  // Factory-wide stats
  const totalWorkers = selectedFactory.workers ?? 0;
  const assignedWorkers = lines.reduce((s, l) => s + (pendingWorkerChanges[l.id] ?? l.assignedWorkers ?? 0), 0);
  const unassignedWorkers = Math.max(0, totalWorkers - assignedWorkers);

  const totalMachineCapacity = useMemo(() => {
    if (!effectiveState?.machineryStates?.[selectedFactory.id]) return 0;
    const machines = effectiveState.machineryStates[selectedFactory.id].machines ?? [];
    return machines.reduce((s: number, m: any) => s + (m.status === "operational" ? (m.capacityUnits ?? 0) : 0), 0);
  }, [effectiveState, selectedFactory.id]);

  const totalProjectedOutput = useMemo(() => {
    return activeLines.reduce((sum, line) => {
      const { totalCap } = getLineMachineCapacity(effectiveState, selectedFactory.id, line.id);
      const workers = pendingWorkerChanges[line.id] ?? line.assignedWorkers ?? 0;
      const target = pendingTargetChanges[line.id] ?? line.targetOutput ?? 0;
      const staffing = getStaffingInfo(workers, totalCap);
      return sum + estimateOutput(Math.min(totalCap, target), staffing.ratio, selectedFactory.efficiency ?? 0.7);
    }, 0);
  }, [activeLines, effectiveState, selectedFactory, pendingWorkerChanges, pendingTargetChanges]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* Factory summary bar */}
      <div className="bg-slate-800/60 border border-slate-700/40 rounded-lg px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-slate-400">Lines: </span>
              <span className="text-white font-mono">{activeLines.length} active / {lines.length} total</span>
            </div>
            <div>
              <span className="text-slate-400">Workers: </span>
              <span className="text-white font-mono">{assignedWorkers}/{totalWorkers}</span>
              {unassignedWorkers > 0 && (
                <span className="text-amber-400 font-mono ml-1">({unassignedWorkers} idle)</span>
              )}
            </div>
            <div>
              <span className="text-slate-400">Machine Cap: </span>
              <span className="text-white font-mono">{formatNumber(totalMachineCapacity)}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-400 text-sm">Est. Output: </span>
            <span className="text-emerald-400 font-bold font-mono">{formatNumber(totalProjectedOutput)}</span>
          </div>
        </div>
        {/* Fix 9: Demand vs output gap — let players see what they're missing */}
        {activeLines.length > 0 && (() => {
          const totalDemand = activeLines.reduce((sum, line) => {
            const seg = line.segment;
            const segDemand = seg ? (marketState?.demandBySegment?.[seg]?.totalDemand ?? 0) : 0;
            return sum + segDemand;
          }, 0);
          const gap = totalDemand - totalProjectedOutput;
          return totalDemand > 0 ? (
            <div className="flex items-center gap-4 text-xs border-t border-slate-700/40 pt-2">
              <span className="text-slate-400">Market demand: <span className="text-white font-mono">{formatNumber(totalDemand)}</span></span>
              <span className="text-slate-400">Your output: <span className="text-white font-mono">{formatNumber(totalProjectedOutput)}</span></span>
              {gap > 0 && <span className="text-amber-400 font-mono">Gap: {formatNumber(gap)} units (competitors take this)</span>}
              {gap <= 0 && <span className="text-emerald-400 font-mono">Capacity covers demand</span>}
            </div>
          ) : null;
        })()}
      </div>

      {/* Active lines */}
      {activeLines.map(line => (
        <LineCard
          key={line.id}
          line={line}
          factory={selectedFactory}
          state={effectiveState}
          products={products as Product[]}
          onAssignProduct={onAssignProduct}
          onSetWorkers={onSetWorkers}
          onSetTarget={onSetTarget}
          onActivateLine={onActivateLine}
          pendingWorkers={pendingWorkerChanges[line.id]}
          pendingTarget={pendingTargetChanges[line.id]}
        />
      ))}

      {/* Changeover lines */}
      {changeoverLines.map(line => (
        <LineCard
          key={line.id}
          line={line}
          factory={selectedFactory}
          state={effectiveState}
          products={products as Product[]}
          onAssignProduct={onAssignProduct}
          onSetWorkers={onSetWorkers}
          onSetTarget={onSetTarget}
          onActivateLine={onActivateLine}
        />
      ))}

      {/* Idle lines */}
      {idleLines.map(line => (
        <LineCard
          key={line.id}
          line={line}
          factory={selectedFactory}
          state={effectiveState}
          products={products as Product[]}
          onAssignProduct={onAssignProduct}
          onSetWorkers={onSetWorkers}
          onSetTarget={onSetTarget}
          onActivateLine={onActivateLine}
        />
      ))}

      {/* No lines message */}
      {lines.length === 0 && (
        <Card className="bg-slate-800/40 border-slate-700/30">
          <CardContent className="py-12 text-center">
            <Factory className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">No production lines in this factory</p>
          </CardContent>
        </Card>
      )}

      {/* Shift mode selector */}
      {activeLines.length > 0 && setShiftMode && (
        <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/40 rounded-lg px-4 py-3">
          <span className="text-slate-400 text-sm">Shift Mode:</span>
          {([
            { mode: "single" as const, label: "Single", desc: "1x output" },
            { mode: "overtime" as const, label: "Overtime", desc: "1.5x output, 1.6x labor cost" },
            { mode: "double" as const, label: "Double", desc: "2x output, 1.7x labor cost" },
          ]).map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setShiftMode(opt.mode)}
              className={`px-4 py-2 rounded text-sm font-mono transition-all ${
                shiftMode === opt.mode
                  ? "bg-violet-500/20 border border-violet-400 text-white"
                  : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:border-slate-500"
              }`}
              title={opt.desc}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Market demand reference */}
      {marketState?.demandBySegment && (
        <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-4 py-3">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Market Demand (this round)</p>
          <div className="flex flex-wrap gap-4 text-sm">
            {Object.entries(marketState.demandBySegment).map(([seg, info]) => (
              <div key={seg} className="flex items-center gap-1.5">
                <span className="text-slate-500">{seg}:</span>
                <span className="text-white font-mono">{formatNumber((info as SegmentDemandInfo).totalDemand)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
