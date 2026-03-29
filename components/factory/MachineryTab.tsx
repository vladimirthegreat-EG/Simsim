// ============================================================
// MachineryTab.tsx
// Displays: required machinery for R&D products, machine stats,
// machine purchase by bucket (capacity/automation/quality),
// pending purchases, owned machines (grouped), maintenance schedule.
// Upgrades and new factory construction moved to UpgradesTab.
// ============================================================
"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { SectionHeader } from "@/components/ui/section-header";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Factory,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Boxes,
  Cog,
  Package,
  DollarSign,
  ShoppingCart,
  Clock,
  ArrowRight,
  Minus,
  Plus,
  Lightbulb,
} from "lucide-react";
import type { TeamState, Factory as FactoryType } from "@/engine/types";
import type { Machine, MachineConfig } from "@/engine/machinery";
import type { MachineStatus } from "@/lib/hooks/useMachineryAvailability";
import type { MachineryRequirement } from "@/engine/types/machineryRequirements";
import { getMachinesByBucket } from "@/engine/machinery/MachineCatalog";
import { MACHINE_CONFIGS } from "@/engine/machinery";

// ---- Props ----
interface MachineryTabProps {
  selectedFactory: FactoryType;
  state: TeamState | null;
  factoryPreview: { previewState?: TeamState | null };
  requiredMachinery: (MachineryRequirement & { installed: boolean; pending: boolean; productNames: string[] })[];
  machineStatusMap: Map<string, MachineStatus>;
  upgradePurchases: Array<{ factoryId: string; upgradeName: string }>;
  toggleUpgradePurchase: (upgradeId: string) => void;
  isUpgradePurchased: (upgradeId: string) => { installed: boolean; pending: boolean };
  setActiveTab: (tab: string) => void;
}

// ---- Bucket metadata ----
const BUCKET_META: Record<string, { title: string; description: string; icon: React.ElementType; color: string }> = {
  capacity: {
    title: "Production Capacity",
    description: "Buy these to increase how many phones you can produce.",
    icon: Factory,
    color: "text-blue-400",
  },
  automation: {
    title: "Automation",
    description: "Buy these to reduce worker requirements and add throughput.",
    icon: Settings,
    color: "text-purple-400",
  },
  quality: {
    title: "Quality",
    description: "Buy these to reduce defect rate and improve product quality.",
    icon: CheckCircle2,
    color: "text-emerald-400",
  },
};

// ---- Grouped machine type for owned machines display ----
interface MachineGroup {
  type: string;
  name: string;
  count: number;
  totalCapacity: number;
  avgHealth: number;
  avgAge: number;
  totalMaintenanceCost: number;
  totalCurrentValue: number;
  machines: Machine[];
  nextMaintenanceRound: number | null;
  maintenanceStatus: "on_schedule" | "due_soon" | "overdue";
}

// ---- Bottleneck recommendation ----
interface BottleneckRecommendation {
  machineType: string;
  machineName: string;
  currentCapacity: number;
  suggestedCapacityAfter: number;
}

export function MachineryTab({
  selectedFactory,
  state,
  factoryPreview,
  requiredMachinery,
  machineStatusMap,
  upgradePurchases,
  toggleUpgradePurchase,
  isUpgradePurchased,
  setActiveTab,
}: MachineryTabProps) {
  const buckets = useMemo(() => getMachinesByBucket(), []);

  // ---- Quantity selector state ----
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const incrementQty = useCallback((machineType: string) => {
    setQuantities((prev) => ({ ...prev, [machineType]: (prev[machineType] ?? 0) + 1 }));
  }, []);

  const decrementQty = useCallback((machineType: string) => {
    setQuantities((prev) => {
      const current = prev[machineType] ?? 0;
      if (current <= 0) return prev;
      return { ...prev, [machineType]: current - 1 };
    });
  }, []);

  const addToCart = useCallback(
    (machineType: string) => {
      const qty = quantities[machineType] ?? 0;
      for (let i = 0; i < qty; i++) {
        toggleUpgradePurchase(machineType);
      }
      setQuantities((prev) => ({ ...prev, [machineType]: 0 }));
    },
    [quantities, toggleUpgradePurchase]
  );

  // ---- Owned machines grouped by type ----
  const machineGroups = useMemo((): MachineGroup[] => {
    const machines = state?.machineryStates?.[selectedFactory.id]?.machines ?? [];
    if (machines.length === 0) return [];

    const groupMap = new Map<string, Machine[]>();
    for (const machine of machines) {
      const existing = groupMap.get(machine.type) ?? [];
      existing.push(machine);
      groupMap.set(machine.type, existing);
    }

    const groups: MachineGroup[] = [];
    for (const [type, groupMachines] of groupMap.entries()) {
      const count = groupMachines.length;
      const totalCapacity = groupMachines.reduce((sum, m) => sum + (m.capacityUnits ?? 0), 0);
      const avgHealth = Math.round(groupMachines.reduce((sum, m) => sum + (m.healthPercent ?? 100), 0) / count);
      const avgAge = Math.round(groupMachines.reduce((sum, m) => sum + (m.ageRounds ?? 0), 0) / count);
      const totalMaintenanceCost = groupMachines.reduce((sum, m) => sum + (m.maintenanceCostPerRound ?? 0), 0);
      const totalCurrentValue = groupMachines.reduce((sum, m) => sum + (m.currentValue ?? m.purchaseCost ?? 0), 0);

      // Find the earliest scheduled maintenance round in the group
      const scheduledRounds = groupMachines
        .map((m) => m.scheduledMaintenanceRound)
        .filter((r): r is number => r !== null && r !== undefined);
      const nextMaintenanceRound = scheduledRounds.length > 0 ? Math.min(...scheduledRounds) : null;

      // Determine maintenance status based on health and overdue maintenance
      const hasBreakdown = groupMachines.some((m) => m.status === "breakdown");
      const hasLowHealth = groupMachines.some((m) => (m.healthPercent ?? 100) < 50);
      const hasDueSoon = groupMachines.some((m) => (m.healthPercent ?? 100) < 70);

      let maintenanceStatus: "on_schedule" | "due_soon" | "overdue" = "on_schedule";
      if (hasBreakdown || hasLowHealth) {
        maintenanceStatus = "overdue";
      } else if (hasDueSoon) {
        maintenanceStatus = "due_soon";
      }

      groups.push({
        type,
        name: groupMachines[0].name.replace(/\s*#\d+(-\d+)?$/, ""), // Strip "#1-2" suffix
        count,
        totalCapacity,
        avgHealth,
        avgAge,
        totalMaintenanceCost,
        totalCurrentValue,
        machines: groupMachines,
        nextMaintenanceRound,
        maintenanceStatus,
      });
    }

    // Sort: production machines first, then by count descending
    groups.sort((a, b) => b.totalCapacity - a.totalCapacity || b.count - a.count);
    return groups;
  }, [state, selectedFactory.id]);

  // ---- Bottleneck recommendations (SUM model: suggest adding more of any production machine) ----
  const recommendations = useMemo((): BottleneckRecommendation[] => {
    const machines = state?.machineryStates?.[selectedFactory.id]?.machines ?? [];
    if (machines.length === 0) return [];

    // Total capacity across all operational machines
    const totalCapacity = machines
      .filter((m) => m.status === "operational")
      .reduce((sum, m) => sum + (m.capacityUnits ?? 0), 0);

    if (totalCapacity === 0) return [];

    // Find the most common production machine type to recommend adding more of
    const countByType = new Map<string, { count: number; name: string; unitCap: number }>();
    for (const machine of machines) {
      if ((machine.capacityUnits ?? 0) > 0) {
        const existing = countByType.get(machine.type);
        const name = machine.name.replace(/\s*#\d+(-\d+)?$/, "");
        if (existing) {
          existing.count++;
        } else {
          countByType.set(machine.type, { count: 1, name, unitCap: machine.capacityUnits ?? 0 });
        }
      }
    }

    if (countByType.size === 0) return [];

    // Recommend adding one more of the most-used production machine type
    let bestType = "";
    let bestInfo = { count: 0, name: "", unitCap: 0 };
    for (const [type, info] of countByType.entries()) {
      if (info.count > bestInfo.count) {
        bestType = type;
        bestInfo = info;
      }
    }

    if (!bestType) return [];

    const cfg = MACHINE_CONFIGS.find((c) => c.type === bestType);
    if (!cfg || cfg.baseCapacity <= 0) return [];

    return [
      {
        machineType: bestType,
        machineName: bestInfo.name,
        currentCapacity: totalCapacity,
        suggestedCapacityAfter: totalCapacity + cfg.baseCapacity,
      },
    ];
  }, [state, selectedFactory.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Machinery Overview */}
      <SectionHeader
        title="Machinery Management"
        description="Purchase, maintain, and manage your factory machines"
      />

      {/* Required Machinery for R&D Products */}
      {requiredMachinery.length > 0 && (
        <Card className="bg-purple-900/20 border-purple-600/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-purple-400" />
              Required Machinery for Your Products
            </CardTitle>
            <CardDescription className="text-purple-300/70">
              Your R&D queue includes: {requiredMachinery[0]?.productNames?.join(", ")}. These machines are needed to produce them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requiredMachinery.map((req) => (
                <div
                  key={req.machineType}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    req.installed
                      ? "bg-green-900/20 border-green-600/30"
                      : req.pending
                      ? "bg-orange-900/20 border-orange-600/30"
                      : "bg-red-900/20 border-red-600/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {req.installed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : req.pending ? (
                      <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <div>
                      <span className="text-white text-sm font-medium">
                        {req.machineType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </span>
                      <p className="text-slate-400 text-xs">{req.reason}</p>
                    </div>
                  </div>
                  <div>
                    {req.installed ? (
                      <Badge className="bg-green-500/20 text-green-400 text-xs">Owned</Badge>
                    ) : req.pending ? (
                      <Badge className="bg-orange-500/20 text-orange-400 text-xs">Queued</Badge>
                    ) : (
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 h-7 text-xs"
                        onClick={() => toggleUpgradePurchase(req.machineType)}
                      >
                        Purchase
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {requiredMachinery.some((r) => !r.installed && !r.pending) && (
              <p className="text-red-400/80 text-xs mt-3">
                Missing machinery will reduce production quality and capacity for your products.
              </p>
            )}
            {requiredMachinery.every((r) => r.installed || r.pending) && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-green-400/80 text-xs">
                  All required machinery is ready.
                </p>
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 h-7 text-xs gap-1"
                  onClick={() => setActiveTab("production")}
                >
                  Next: Set Production
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Machine Stats */}
      {(() => {
        const previewMachinery = factoryPreview.previewState?.machineryStates?.[selectedFactory.id];
        const baseMachinery = state?.machineryStates?.[selectedFactory.id];
        const machineryState = previewMachinery ?? baseMachinery;
        const totalMachines = machineryState?.machines?.length ?? 0;
        const totalCap = machineryState?.totalCapacity ?? 0;
        const maintenanceCost = machineryState?.totalMaintenanceCost ?? 0;
        const operatingCost = machineryState?.totalOperatingCost ?? 0;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Machines" value={`${totalMachines}`} icon={<Cog className="w-5 h-5" />} variant="default" />
            <StatCard label="Total Capacity" value={`${formatNumber(totalCap)} units`} icon={<Package className="w-5 h-5" />} variant="default" />
            <StatCard label="Maintenance Cost" value={`${formatCurrency(maintenanceCost)}/round`} icon={<Wrench className="w-5 h-5" />} variant="warning" />
            <StatCard label="Operating Cost" value={`${formatCurrency(operatingCost)}/round`} icon={<DollarSign className="w-5 h-5" />} variant="info" />
          </div>
        );
      })()}

      {/* Bottleneck Recommendations Banner */}
      {recommendations.length > 0 && (
        <Card className="bg-amber-900/20 border-amber-600/50">
          <CardContent className="py-3 px-4">
            {recommendations.map((rec) => (
              <div key={rec.machineType} className="flex items-center gap-3">
                <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <p className="text-amber-200 text-sm">
                  <span className="font-semibold">Recommended:</span> Buy 1 more{" "}
                  <span className="text-white font-medium">{rec.machineName}</span> to increase line capacity from{" "}
                  <span className="text-amber-400 font-medium">{formatNumber(rec.currentCapacity)}</span> to{" "}
                  <span className="text-green-400 font-medium">{formatNumber(rec.suggestedCapacityAfter)}</span> units.
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Machine Buckets (capacity / automation / quality) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["capacity", "automation", "quality"] as const).map((bucket) => {
          const meta = BUCKET_META[bucket];
          const machines = buckets[bucket] ?? [];
          const BucketIcon = meta.icon;
          return (
            <Card key={bucket} className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <BucketIcon className={`w-5 h-5 ${meta.color}`} />
                  {meta.title}
                </CardTitle>
                <CardDescription>{meta.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {machines.map((cfg: MachineConfig) => {
                  const { installed, pending } = isUpgradePurchased(cfg.type);
                  const status = machineStatusMap.get(cfg.type);
                  const isLocked = status && status.availability.startsWith("locked_");
                  const isNotRelevant = status?.availability === "not_relevant";
                  const qty = quantities[cfg.type] ?? 0;

                  const costLabel = formatCurrency(cfg.baseCost);
                  const benefitParts: string[] = [];
                  if (cfg.baseCapacity > 0) benefitParts.push(`${formatNumber(cfg.baseCapacity)} units`);
                  if (cfg.defectRateReduction > 0) benefitParts.push(`-${(cfg.defectRateReduction * 100).toFixed(0)}% defects`);
                  if (cfg.laborReduction > 0) benefitParts.push(`-${(cfg.laborReduction * 100).toFixed(0)}% labor`);
                  if (cfg.shippingReduction > 0) benefitParts.push(`-${(cfg.shippingReduction * 100).toFixed(0)}% shipping`);
                  const benefitLabel = benefitParts.join(" · ") || "Utility";

                  return (
                    <div key={cfg.type} className={`p-3 rounded-lg ${isLocked ? "bg-slate-700/30 opacity-60" : isNotRelevant ? "bg-slate-700/20 opacity-40" : "bg-slate-700/50"}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium">{cfg.name}</p>
                          <p className="text-slate-400 text-sm">{benefitLabel}</p>
                          {isLocked && status?.reason && (
                            <p className="text-amber-400/80 text-xs mt-0.5">{status.reason}</p>
                          )}
                          {isNotRelevant && (
                            <p className="text-slate-500 text-xs mt-0.5">Not needed for current segments</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-medium">{costLabel}</p>
                          {installed && (
                            <Badge className="mt-1 bg-green-500/20 text-green-400 text-xs">Owned</Badge>
                          )}
                          {isLocked && !installed && (
                            <Badge className="mt-1 bg-amber-500/20 text-amber-400 text-xs">Locked</Badge>
                          )}
                        </div>
                      </div>

                      {/* Quantity selector for purchasable machines */}
                      {!installed && !isLocked && (
                        <div className="mt-3 space-y-2">
                          {pending ? (
                            <div className="flex justify-between items-center">
                              <Badge className="bg-orange-500/20 text-orange-400 text-xs">In Cart</Badge>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                onClick={() => toggleUpgradePurchase(cfg.type)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-7 p-0 text-white border-slate-600 hover:bg-slate-600"
                                    onClick={() => decrementQty(cfg.type)}
                                    disabled={qty <= 0}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="text-white font-medium w-8 text-center">{qty}</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 w-7 p-0 text-white border-slate-600 hover:bg-slate-600"
                                    onClick={() => incrementQty(cfg.type)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                                {qty > 0 && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 gap-1"
                                    onClick={() => addToCart(cfg.type)}
                                  >
                                    <ShoppingCart className="w-3 h-3" />
                                    Add to Cart
                                  </Button>
                                )}
                              </div>
                              {qty > 0 && (
                                <div className="text-xs text-slate-300 bg-slate-800/80 rounded px-2 py-1.5 space-y-0.5">
                                  <div className="flex justify-between">
                                    <span>Total cost:</span>
                                    <span className="text-emerald-400 font-medium">{formatCurrency(qty * cfg.baseCost)}</span>
                                  </div>
                                  {cfg.baseCapacity > 0 && (
                                    <div className="flex justify-between">
                                      <span>Total capacity:</span>
                                      <span className="text-blue-400 font-medium">+{formatNumber(qty * cfg.baseCapacity)} units</span>
                                    </div>
                                  )}
                                  {cfg.defectRateReduction > 0 && (
                                    <div className="flex justify-between">
                                      <span>Total defect reduction:</span>
                                      <span className="text-green-400 font-medium">-{(qty * cfg.defectRateReduction * 100).toFixed(0)}%</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pending Purchases */}
      {upgradePurchases.filter(u => u.factoryId === selectedFactory.id).length > 0 && (
        <Card className="bg-slate-800 border-green-700/50">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-green-400" />
              Pending Purchases
              <Badge className="bg-green-500/20 text-green-400 text-xs ml-auto">
                {upgradePurchases.filter(u => u.factoryId === selectedFactory.id).length} machine(s)
              </Badge>
            </CardTitle>
            <CardDescription>Machines that will be purchased when you save decisions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upgradePurchases
              .filter(u => u.factoryId === selectedFactory.id)
              .map((purchase, idx) => {
                const cfg = MACHINE_CONFIGS.find(c => c.type === purchase.upgradeName);
                return (
                  <div key={idx} className="flex justify-between items-center p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{cfg?.name ?? purchase.upgradeName}</p>
                      <p className="text-slate-400 text-sm">
                        {cfg?.baseCapacity ? `${formatNumber(cfg.baseCapacity)} units capacity` : "Utility machine"}
                        {cfg?.defectRateReduction ? ` · -${(cfg.defectRateReduction * 100).toFixed(0)}% defects` : ""}
                        {cfg?.laborReduction ? ` · -${(cfg.laborReduction * 100).toFixed(0)}% labor` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-emerald-400 font-medium">{formatCurrency(cfg?.baseCost ?? 0)}</p>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() => toggleUpgradePurchase(purchase.upgradeName)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                );
              })}
            <div className="flex justify-between items-center pt-2 border-t border-slate-700">
              <p className="text-slate-400 text-sm font-medium">Total Purchase Cost</p>
              <p className="text-emerald-400 font-bold">
                {formatCurrency(
                  upgradePurchases
                    .filter(u => u.factoryId === selectedFactory.id)
                    .reduce((sum, u) => {
                      const cfg = MACHINE_CONFIGS.find(c => c.type === u.upgradeName);
                      return sum + (cfg?.baseCost ?? 0);
                    }, 0)
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Owned Machines -- Grouped by Type */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-400" />
            Owned Machines
          </CardTitle>
          <CardDescription>Your factory&apos;s current machinery grouped by type</CardDescription>
        </CardHeader>
        <CardContent>
          {machineGroups.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Cog className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No machines owned yet</p>
              <p className="text-sm mt-2">Purchase machines above and save decisions to add them to your factory</p>
            </div>
          ) : (
            <div className="space-y-3">
              {machineGroups.map((group) => (
                <div key={group.type} className="p-4 bg-slate-700/50 rounded-lg">
                  {/* Group header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold text-lg">{group.count}x</span>
                      <div>
                        <p className="text-white font-medium">{group.name}</p>
                        <div className="flex gap-4 mt-1 text-xs text-slate-400">
                          {group.totalCapacity > 0 && (
                            <span className="text-blue-400">{formatNumber(group.totalCapacity)} total units</span>
                          )}
                          <span>
                            {group.count === 1 ? "Health" : "Avg Health"}:{" "}
                            <span className={
                              group.avgHealth >= 80 ? "text-green-400" :
                              group.avgHealth >= 50 ? "text-yellow-400" :
                              "text-red-400"
                            }>
                              {group.avgHealth}%
                            </span>
                          </span>
                          <span>
                            {group.count === 1 ? "Age" : "Avg Age"}: {group.avgAge} round{group.avgAge !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-sm">{formatCurrency(group.totalCurrentValue)}</p>
                      <p className="text-xs text-slate-500">current value</p>
                    </div>
                  </div>

                  {/* Maintenance info row */}
                  <div className="mt-2 pt-2 border-t border-slate-600/50 flex items-center justify-between text-xs">
                    <div className="flex gap-4 text-slate-400">
                      <span>
                        <Wrench className="w-3 h-3 inline mr-1" />
                        Maintenance: {formatCurrency(group.totalMaintenanceCost)}/round
                      </span>
                      {group.nextMaintenanceRound !== null && (
                        <span>
                          <Clock className="w-3 h-3 inline mr-1" />
                          Next service: Round {group.nextMaintenanceRound}
                        </span>
                      )}
                    </div>
                    <Badge className={`text-xs ${
                      group.maintenanceStatus === "on_schedule"
                        ? "bg-green-500/20 text-green-400"
                        : group.maintenanceStatus === "due_soon"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-red-500/20 text-red-400"
                    }`}>
                      {group.maintenanceStatus === "on_schedule"
                        ? "On Schedule"
                        : group.maintenanceStatus === "due_soon"
                        ? "Due Soon"
                        : "Overdue"}
                    </Badge>
                  </div>

                  {/* Schedule Maintenance button if overdue */}
                  {group.maintenanceStatus === "overdue" && (
                    <div className="mt-2 pt-2 border-t border-red-600/30">
                      <div className="flex items-center justify-between">
                        <p className="text-red-400 text-xs">
                          {group.machines.filter((m) => m.status === "breakdown").length > 0
                            ? `${group.machines.filter((m) => m.status === "breakdown").length} machine(s) broken down -- needs immediate repair`
                            : "Health below safe threshold -- maintenance recommended"}
                        </p>
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-red-600 hover:bg-red-700 gap-1"
                          onClick={() => {
                            // Schedule maintenance for all machines in the group that need it
                            for (const machine of group.machines) {
                              if ((machine.healthPercent ?? 100) < 70 || machine.status === "breakdown") {
                                toggleUpgradePurchase(`maintenance_${machine.id}`);
                              }
                            }
                          }}
                        >
                          <Wrench className="w-3 h-3" />
                          Schedule Maintenance
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Maintenance Schedule */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-yellow-400" />
            Maintenance Schedule
          </CardTitle>
          <CardDescription>Schedule preventive maintenance for your machines</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const previewMachines = factoryPreview.previewState?.machineryStates?.[selectedFactory.id]?.machines ?? [];
            const savedMachines = state?.machineryStates?.[selectedFactory.id]?.machines ?? [];
            const machines = previewMachines.length > 0 ? previewMachines : savedMachines;
            if (machines.length === 0) {
              return (
                <div className="text-center py-8 text-slate-400">
                  <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No machines to maintain</p>
                  <p className="text-sm mt-2">Machines will appear here once purchased</p>
                </div>
              );
            }
            const needsMaintenance = machines.filter(
              (m: Machine) => m.healthPercent < 70 || m.status === "maintenance" || m.status === "breakdown"
            );
            return (
              <div className="space-y-2">
                {needsMaintenance.length > 0 ? (
                  needsMaintenance.map((machine: Machine) => (
                    <div key={machine.id} className="flex justify-between items-center p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{machine.name}</p>
                        <p className="text-yellow-400 text-xs">
                          {machine.status === "breakdown" ? "Broken down -- needs repair" :
                           machine.status === "maintenance" ? "Currently under maintenance" :
                           `Health at ${machine.healthPercent}% -- maintenance recommended`}
                        </p>
                      </div>
                      <Badge className={`text-xs ${
                        machine.status === "breakdown" ? "bg-red-500/20 text-red-400" :
                        machine.healthPercent < 50 ? "bg-orange-500/20 text-orange-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {machine.status === "breakdown" ? "Urgent" :
                         machine.healthPercent < 50 ? "High Priority" : "Recommended"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-400/50" />
                    <p className="text-green-400/80">All machines in good condition</p>
                    <p className="text-sm mt-1">{machines.length} machine(s) operational</p>
                  </div>
                )}
              </div>
            );
          })()}
        </CardContent>
      </Card>

    </motion.div>
  );
}
