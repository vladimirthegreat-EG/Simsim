// ============================================================
// UpgradesTab.tsx
// Factory upgrades (5 tiers, R&D-gated), pending upgrade
// purchases, and new factory construction.
// ============================================================
"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/ui/section-header";
import { formatCurrency } from "@/lib/utils";
import {
  Factory,
  CheckCircle2,
  Lock,
} from "lucide-react";
import type { TeamState, Factory as FactoryType } from "@/engine/types";

// ---- Upgrade definition type (matches the const in page.tsx) ----
interface UpgradeDef {
  id: string;
  name: string;
  cost: number;
  description: string;
  benefits: string[];
  category: string;
  icon: React.ElementType;
  tier: number;
  rdRequired: string | null;
}

// ---- Props ----
interface UpgradesTabProps {
  state: TeamState | null;
  selectedFactory: FactoryType;
  upgradePurchases: Array<{ factoryId: string; upgradeName: string }>;
  toggleUpgradePurchase: (upgradeId: string) => void;
  isUpgradePurchased: (upgradeId: string) => { installed: boolean; pending: boolean };
  newFactories: Array<{ region: string; name: string }>;
  toggleNewFactory: (regionId: string) => void;
  upgrades: UpgradeDef[];
  regions: Array<{ id: string; name: string; laborCost: number; tariff: number }>;
}

// ---- Tier-to-tech mapping ----
const TIER_TECH: Record<number, { key: string; label: string; badge: string; color: string; btnClass: string }> = {
  1: { key: "", label: "No R&D Required - Always Available", badge: "bg-green-600", color: "text-green-400", btnClass: "bg-orange-600 hover:bg-orange-700" },
  2: { key: "process_optimization", label: "Requires R&D: Process Optimization", badge: "bg-blue-600", color: "text-blue-400", btnClass: "bg-blue-600 hover:bg-blue-700" },
  3: { key: "advanced_manufacturing", label: "Requires R&D: Advanced Manufacturing", badge: "bg-purple-600", color: "text-purple-400", btnClass: "bg-purple-600 hover:bg-purple-700" },
  4: { key: "industry_4_0", label: "Requires R&D: Industry 4.0", badge: "bg-amber-600", color: "text-amber-400", btnClass: "bg-amber-600 hover:bg-amber-700" },
  5: { key: "breakthrough_tech", label: "Requires R&D: Breakthrough Technology", badge: "bg-red-600", color: "text-red-400", btnClass: "bg-red-600 hover:bg-red-700" },
};
const TIER_NAMES: Record<number, string> = { 1: "Foundation Upgrades", 2: "Process Optimization", 3: "Advanced Manufacturing", 4: "Industry 4.0", 5: "Breakthrough Technology" };

export function UpgradesTab({
  state,
  selectedFactory,
  upgradePurchases,
  toggleUpgradePurchase,
  isUpgradePurchased,
  newFactories,
  toggleNewFactory,
  upgrades,
  regions,
}: UpgradesTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Upgrades Overview */}
      <SectionHeader
        title="Factory Upgrades"
        description="Purchase upgrades to improve efficiency, quality, and sustainability"
      />

      {/* Recommendation Banner */}
      <div className="p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg text-sm text-slate-300">
        Recommended: Start with efficiency upgrades (Six Sigma, Lean Manufacturing) to reduce costs, then add sustainability upgrades (Solar Panels) for ESG score.
      </div>

      {/* Pending Upgrade Purchases */}
      {upgradePurchases.length > 0 && (
        <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
          <p className="text-green-400 text-sm font-medium mb-2">Pending Upgrade Purchases:</p>
          <div className="space-y-1">
            {upgradePurchases.map((purchase, idx) => {
              const upgrade = upgrades.find(u => u.id === purchase.upgradeName);
              return (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-slate-300">{upgrade?.name} - {formatCurrency(upgrade?.cost || 0)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 h-6 px-2"
                    onClick={() => toggleUpgradePurchase(purchase.upgradeName)}
                  >
                    Cancel
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tier Legend */}
      <div className="flex flex-wrap gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <span className="text-slate-400 text-sm font-medium">R&D Prerequisites:</span>
        <Badge className="bg-green-600/20 text-green-400 border-green-600">Tier 1: No R&D</Badge>
        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600">Tier 2: Process Optimization</Badge>
        <Badge className="bg-purple-600/20 text-purple-400 border-purple-600">Tier 3: Advanced Manufacturing</Badge>
        <Badge className="bg-amber-600/20 text-amber-400 border-amber-600">Tier 4: Industry 4.0</Badge>
        <Badge className="bg-red-600/20 text-red-400 border-red-600">Tier 5: Breakthrough Tech</Badge>
      </div>

      {/* Render each upgrade tier */}
      {[1, 2, 3, 4, 5].map((tier) => {
        const tierConfig = TIER_TECH[tier];
        const tierUpgrades = upgrades.filter(u => u.tier === tier);
        if (tierUpgrades.length === 0) return null;
        const isUnlocked = tier === 1 || (state?.unlockedTechnologies || []).includes(tierConfig.key);
        return (
          <div key={tier} className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className={tierConfig.badge}>Tier {tier}</Badge>
              <h3 className="text-lg font-semibold text-white">{TIER_NAMES[tier]}</h3>
              {tier === 1 ? (
                <span className="text-green-400 text-sm">No R&D Required - Always Available</span>
              ) : isUnlocked ? (
                <span className={`${tierConfig.color} text-sm flex items-center gap-1`}><CheckCircle2 className="w-4 h-4" />Unlocked</span>
              ) : (
                <span className="text-slate-500 text-sm flex items-center gap-1"><Lock className="w-4 h-4" />{tierConfig.label}</span>
              )}
            </div>
            <div className={`grid md:grid-cols-2 gap-4 ${!isUnlocked ? "opacity-60" : ""}`}>
              {tierUpgrades.map((upgrade) => {
                const { installed, pending } = isUpgradePurchased(upgrade.id);
                const isLocked = !isUnlocked;
                const UpgradeIcon = upgrade.icon;
                const borderClass = isLocked ? "border-slate-600" : installed ? "border-green-700" : pending ? "border-orange-500" : `border-${tier === 1 ? "slate" : tier === 2 ? "blue" : tier === 3 ? "purple" : tier === 4 ? "amber" : "red"}-700/50`;
                const iconColor = isLocked ? "text-slate-500" : installed ? "text-green-400" : pending ? "text-orange-400" : tierConfig.color;
                const checkColor = isLocked ? "text-slate-500" : tierConfig.color;
                return (
                  <Card key={upgrade.id} className={`bg-slate-800 ${borderClass}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <UpgradeIcon className={`w-5 h-5 ${iconColor}`} />
                        <CardTitle className={`text-base ${isLocked ? "text-slate-400" : "text-white"}`}>{upgrade.name}</CardTitle>
                        {isLocked && <Lock className="w-4 h-4 text-slate-500" />}
                      </div>
                      <CardDescription className="text-slate-400 text-sm">{upgrade.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1 mb-3">
                        {upgrade.benefits.map((benefit, idx) => (
                          <li key={idx} className={`flex items-center gap-2 text-xs ${isLocked ? "text-slate-500" : "text-slate-300"}`}>
                            <CheckCircle2 className={`w-3 h-3 ${checkColor}`} />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <span className={`text-lg font-bold ${isLocked ? "text-slate-500" : "text-white"}`}>{formatCurrency(upgrade.cost)}</span>
                        {installed ? (
                          <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Installed</Badge>
                        ) : pending ? (
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8" onClick={() => toggleUpgradePurchase(upgrade.id)}>Cancel</Button>
                        ) : (
                          <Button size="sm" className={`${tierConfig.btnClass} h-8`} onClick={() => toggleUpgradePurchase(upgrade.id)} disabled={isLocked}>
                            {isLocked ? "Locked" : "Purchase"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* New Factory Construction — strategic investment, lives here not in Capacity */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Factory className="w-5 h-5 text-orange-400" />
            Build New Factory
          </CardTitle>
          <CardDescription className="text-slate-400">
            Expand into new regions. 1 round to build. Each factory has its own production lines.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {newFactories.length > 0 && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-400 text-sm font-medium mb-2">Pending Construction:</p>
              <div className="space-y-1">
                {newFactories.map((factory, idx) => {
                  const region = regions.find(r => r.id === factory.region);
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">{region?.name} - {formatCurrency(50_000_000)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 h-6 px-2"
                        onClick={() => toggleNewFactory(factory.region)}
                      >
                        Cancel
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-4 gap-4">
            {regions.map((region) => {
              const isPending = newFactories.some(f => f.region === region.id);
              return (
                <Card
                  key={region.id}
                  className={`bg-slate-700 border-slate-600 hover:border-orange-500 cursor-pointer transition-colors ${
                    isPending ? "border-orange-500" : ""
                  }`}
                  onClick={() => toggleNewFactory(region.id)}
                >
                  <CardContent className="p-4">
                    <h3 className="text-white font-medium mb-2">{region.name}</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Labor Cost</span>
                        <span className="text-white">{(region.laborCost * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tariff</span>
                        <span className="text-white">{(region.tariff * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-orange-400 font-medium">{formatCurrency(50_000_000)}</p>
                      {isPending && <Badge className="bg-orange-600 text-xs">Pending</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
