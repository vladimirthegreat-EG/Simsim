// CapacityTab.tsx — "How do I make more?"
// Machine slots, buy machines by bucket, owned machines, build new factory.
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Factory,
  Settings,
  CheckCircle2,
  Cog,
  Package,
  Boxes,
  AlertTriangle,
  Globe,
  Plus,
  MapPin,
} from "lucide-react";
import type { TeamState, Factory as FactoryType } from "@/engine/types";
import type { MachineConfig } from "@/engine/machinery";
import { getMachinesByBucket } from "@/engine/machinery/MachineCatalog";

const MAX_MACHINES_PER_LINE = 10;

const BUCKET_META: Record<string, { title: string; desc: string; icon: React.ElementType; color: string }> = {
  capacity: { title: "Production Capacity", desc: "Increase how many phones you can produce.", icon: Factory, color: "text-blue-400" },
  automation: { title: "Automation", desc: "Reduce worker requirements and add throughput.", icon: Settings, color: "text-purple-400" },
  quality: { title: "Quality", desc: "Reduce defect rate and improve product quality.", icon: CheckCircle2, color: "text-emerald-400" },
};

const REGION_CARDS = [
  { id: "north-america", name: "North America", cost: "$150M", laborMultiplier: "1.0x", tariff: "0%", color: "border-blue-500/40 hover:border-blue-400" },
  { id: "europe", name: "Europe", cost: "$175M", laborMultiplier: "1.2x", tariff: "5%", color: "border-emerald-500/40 hover:border-emerald-400" },
  { id: "asia", name: "Asia", cost: "$100M", laborMultiplier: "0.6x", tariff: "15%", color: "border-amber-500/40 hover:border-amber-400" },
  { id: "latin-america", name: "Latin America", cost: "$120M", laborMultiplier: "0.7x", tariff: "10%", color: "border-orange-500/40 hover:border-orange-400" },
];

// ---- Types ----

interface CapacityTabProps {
  selectedFactory: FactoryType;
  state: TeamState | null;
  toggleUpgradePurchase: (upgradeId: string) => void;
  isUpgradePurchased: (upgradeId: string) => { installed: boolean; pending: boolean };
  newFactories: Array<{ region: string; name: string }>;
  toggleNewFactory: (regionId: string) => void;
  setActiveTab: (tab: string) => void;
  upgradePurchases: Array<{ factoryId: string; upgradeName: string }>;
}

interface OwnedGroup { type: string; name: string; count: number; totalCapacity: number; avgHealth: number }

// ---- Component ----

export function CapacityTab({
  selectedFactory,
  state,
  toggleUpgradePurchase,
  isUpgradePurchased,
  newFactories,
  toggleNewFactory,
  setActiveTab,
  upgradePurchases,
}: CapacityTabProps) {
  const buckets = useMemo(() => getMachinesByBucket(), []);

  const machines = state?.machineryStates?.[selectedFactory.id]?.machines ?? [];
  const numLines = selectedFactory.productionLines?.length ?? 1;
  const maxSlots = MAX_MACHINES_PER_LINE * numLines;
  const usedSlots = machines.length;
  const factoryFull = usedSlots >= maxSlots;
  const factoryTier = (selectedFactory.tier ?? "medium").charAt(0).toUpperCase() +
    (selectedFactory.tier ?? "medium").slice(1);

  const ownedGroups = useMemo((): OwnedGroup[] => {
    if (machines.length === 0) return [];
    const gm = new Map<string, { type: string; name: string; count: number; cap: number; hp: number }>();
    for (const m of machines) {
      const e = gm.get(m.type);
      const cap = m.capacityUnits ?? 0, hp = m.healthPercent ?? 100;
      const name = m.name.replace(/\s*#\d+(-\d+)?$/, "");
      if (e) { e.count++; e.cap += cap; e.hp += hp; }
      else gm.set(m.type, { type: m.type, name, count: 1, cap, hp });
    }
    return Array.from(gm.values())
      .map((g) => ({ type: g.type, name: g.name, count: g.count, totalCapacity: g.cap, avgHealth: Math.round(g.hp / g.count) }))
      .sort((a, b) => b.totalCapacity - a.totalCapacity || b.count - a.count);
  }, [machines]);

  const pendingForFactory = upgradePurchases.filter((u) => u.factoryId === selectedFactory.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ====== Machine Slots Counter ====== */}
      <Card
        className={`border ${
          factoryFull
            ? "bg-orange-900/20 border-orange-600/50"
            : "bg-slate-800/80 border-slate-700/50"
        } backdrop-blur-sm`}
      >
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Factory className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-white font-semibold">
                  {usedSlots}/{maxSlots} slots used
                </p>
                <p className="text-slate-400 text-sm">
                  {factoryTier} factory, {numLines} line{numLines !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {factoryFull && (
              <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1 inline" />
                Factory full &mdash; build a new factory below
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ====== Buy Machines — 3 Buckets ====== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(["capacity", "automation", "quality"] as const).map((bucket) => {
          const meta = BUCKET_META[bucket];
          const configs = buckets[bucket] ?? [];
          const BucketIcon = meta.icon;
          return (
            <Card key={bucket} className="bg-slate-800 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <BucketIcon className={`w-5 h-5 ${meta.color}`} />
                  {meta.title}
                </CardTitle>
                <CardDescription className="text-xs">{meta.desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {configs.map((cfg: MachineConfig) => {
                  const { installed, pending } = isUpgradePurchased(cfg.type);

                  // Build benefit label
                  const parts: string[] = [];
                  if (cfg.baseCapacity > 0) parts.push(`+${formatNumber(cfg.baseCapacity)} units`);
                  if (cfg.defectRateReduction > 0)
                    parts.push(`-${(cfg.defectRateReduction * 100).toFixed(0)}% defects`);
                  if (cfg.laborReduction > 0)
                    parts.push(`-${(cfg.laborReduction * 100).toFixed(0)}% labor`);
                  if (cfg.shippingReduction > 0)
                    parts.push(`-${(cfg.shippingReduction * 100).toFixed(0)}% shipping`);
                  const benefitLabel = parts.join(" \u00b7 ") || "Utility";

                  return (
                    <div
                      key={cfg.type}
                      className="p-3 rounded-lg bg-slate-700/50"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium text-sm">{cfg.name}</p>
                          <p className="text-slate-400 text-xs mt-0.5">{benefitLabel}</p>
                        </div>
                        <p className="text-emerald-400 font-medium text-sm">
                          {formatCurrency(cfg.baseCost, { compact: true })}
                        </p>
                      </div>

                      <div className="mt-2">
                        {pending ? (
                          <div className="flex items-center justify-between">
                            <Badge className="bg-orange-500/20 text-orange-400 text-xs">
                              Pending
                            </Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => toggleUpgradePurchase(cfg.type)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-xs w-full bg-slate-600 hover:bg-slate-500 gap-1"
                            disabled={factoryFull}
                            onClick={() => toggleUpgradePurchase(cfg.type)}
                          >
                            <Plus className="w-3 h-3" />
                            Purchase
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ====== Owned Machines ====== */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-400" />
            Owned Machines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ownedGroups.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Cog className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p>No machines owned yet</p>
              <p className="text-sm mt-1">Purchase machines above to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ownedGroups.map((group) => (
                <div
                  key={group.type}
                  className="flex items-center justify-between p-3 bg-slate-700/40 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">{group.count}&times;</span>
                    <span className="text-white font-medium">{group.name}</span>
                    {group.totalCapacity > 0 && (
                      <span className="text-blue-400 text-sm">
                        &mdash; {formatNumber(group.totalCapacity)} total
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-sm font-medium ${
                        group.avgHealth >= 80
                          ? "text-green-400"
                          : group.avgHealth >= 50
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      Health {group.avgHealth}%
                    </span>
                    {group.count > 1 && (
                      <button
                        onClick={() => toggleUpgradePurchase(`sell-${group.type}`)}
                        className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                      >
                        Sell 1
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====== Pending Purchases Summary ====== */}
      {pendingForFactory.length > 0 && (
        <Card className="bg-slate-800 border-green-700/50">
          <CardContent className="py-3 px-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-green-400" />
                <span className="text-white text-sm font-medium">
                  {pendingForFactory.length} machine{pendingForFactory.length !== 1 ? "s" : ""} in
                  cart
                </span>
              </div>
              <span className="text-emerald-400 text-sm font-bold">
                {formatCurrency(
                  pendingForFactory.reduce((sum, u) => {
                    const cfg = (buckets.capacity ?? [])
                      .concat(buckets.automation ?? [])
                      .concat(buckets.quality ?? [])
                      .find((c: MachineConfig) => c.type === u.upgradeName);
                    return sum + (cfg?.baseCost ?? 0);
                  }, 0),
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====== Build New Factory ====== */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" />
            Build New Factory
          </CardTitle>
          <CardDescription className="text-xs">
            Expand into new regions. Each factory ships to its own market at local costs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {REGION_CARDS.map((region) => {
              const isSelected = newFactories.some((f) => f.region === region.id);
              return (
                <button
                  key={region.id}
                  onClick={() => toggleNewFactory(region.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-400/30"
                      : `border-slate-700 bg-slate-800/50 ${region.color}`
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4 text-slate-400" />
                    <span className="text-white font-semibold text-sm">{region.name}</span>
                    {isSelected && (
                      <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px] ml-auto">
                        In Cart
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-slate-400">
                    <div className="flex justify-between">
                      <span>Build cost:</span>
                      <span className="text-white font-medium">{region.cost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Labor multiplier:</span>
                      <span className="text-white font-medium">{region.laborMultiplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Import tariff:</span>
                      <span className="text-white font-medium">{region.tariff}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
