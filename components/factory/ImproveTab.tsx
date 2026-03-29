// ============================================================
// ImproveTab.tsx
// "How do I make phones better/cheaper?"
// Merges: Efficiency sliders + Maintenance slider (from InvestTab),
// Factory Upgrades (from UpgradesTab), ESG & Sustainability (from ESGTab).
// ============================================================
"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/utils";
import {
  Zap,
  Users,
  Wrench,
  Cog,
  Leaf,
  CheckCircle2,
  Lock,
} from "lucide-react";
import type { TeamState, Factory as FactoryType } from "@/engine/types";

// ---- Upgrade definition type ----
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
interface ImproveTabProps {
  selectedFactory: FactoryType;
  state: TeamState | null;
  teamState: Record<string, unknown> | null;
  efficiencyInvestment: { workers: number; engineers: number; equipment: number; [key: string]: number };
  setEfficiencyInvestment: React.Dispatch<React.SetStateAction<{ workers: number; engineers: number; equipment: number; [key: string]: number }>>;
  maintenanceInvestment: number;
  setMaintenanceInvestment: React.Dispatch<React.SetStateAction<number>>;
  upgradePurchases: Array<{ factoryId: string; upgradeName: string }>;
  toggleUpgradePurchase: (upgradeId: string) => void;
  isUpgradePurchased: (upgradeId: string) => { installed: boolean; pending: boolean };
  activeEsgInitiatives: string[];
  toggleEsgInitiative: (id: string) => void;
  esgInvestment: number;
  setEsgInvestment: React.Dispatch<React.SetStateAction<number>>;
  upgrades: UpgradeDef[];
}

// ---- Tier config ----
const TIER_TECH: Record<number, { key: string; label: string; badge: string; color: string; btnClass: string }> = {
  1: { key: "", label: "No R&D Required", badge: "bg-green-600", color: "text-green-400", btnClass: "bg-orange-600 hover:bg-orange-700" },
  2: { key: "process_optimization", label: "Requires: Process Optimization", badge: "bg-blue-600", color: "text-blue-400", btnClass: "bg-blue-600 hover:bg-blue-700" },
  3: { key: "advanced_manufacturing", label: "Requires: Advanced Manufacturing", badge: "bg-purple-600", color: "text-purple-400", btnClass: "bg-purple-600 hover:bg-purple-700" },
  4: { key: "industry_4_0", label: "Requires: Industry 4.0", badge: "bg-amber-600", color: "text-amber-400", btnClass: "bg-amber-600 hover:bg-amber-700" },
  5: { key: "breakthrough_tech", label: "Requires: Breakthrough Tech", badge: "bg-red-600", color: "text-red-400", btnClass: "bg-red-600 hover:bg-red-700" },
};
const TIER_NAMES: Record<number, string> = { 1: "Foundation", 2: "Process Optimization", 3: "Advanced Manufacturing", 4: "Industry 4.0", 5: "Breakthrough Tech" };

// ---- ESG tier data ----
const ESG_TIERS = [
  {
    tier: 1, title: "Foundation", requiredScore: 0, color: "green" as const,
    initiatives: [
      { id: "charitableDonation", name: "Charitable Donation", desc: "Donate to charitable causes", cost: "Variable", points: "Based on % of income" },
      { id: "communityInvestment", name: "Community Investment", desc: "Invest in local communities", cost: "Variable", points: "Based on % of revenue" },
      { id: "codeOfEthics", name: "Code of Ethics", desc: "Adopt formal ethical guidelines", cost: "$0", points: "+200 ESG" },
      { id: "employeeWellness", name: "Employee Wellness", desc: "Health and wellness programs", cost: "$500K/yr", points: "+60 ESG, -10% turnover" },
      { id: "communityEducation", name: "Community Education", desc: "Support local education", cost: "Variable", points: "+1 ESG per $2K" },
    ],
  },
  {
    tier: 2, title: "Growth", requiredScore: 100, color: "blue" as const,
    initiatives: [
      { id: "workplaceHealthSafety", name: "Workplace Safety", desc: "Comprehensive safety programs", cost: "$2M/yr", points: "+200 ESG" },
      { id: "fairWageProgram", name: "Fair Wage Program", desc: "Above-market compensation", cost: "Varies", points: "+260 ESG" },
      { id: "carbonOffsetProgram", name: "Carbon Offset", desc: "Purchase carbon credits", cost: "$20/ton", points: "+1 ESG per 10 tons" },
      { id: "renewableEnergyCertificates", name: "Renewable Energy Certs", desc: "Green energy credits", cost: "Variable", points: "+1 ESG per $10K" },
      { id: "diversityInclusion", name: "Diversity & Inclusion", desc: "D&I programs and training", cost: "$1M/yr", points: "+90 ESG, +5% morale" },
      { id: "transparencyReport", name: "Transparency Report", desc: "Public sustainability reporting", cost: "$300K/yr", points: "+50 ESG" },
    ],
  },
  {
    tier: 3, title: "Leadership", requiredScore: 300, color: "purple" as const,
    initiatives: [
      { id: "supplierEthicsProgram", name: "Supplier Ethics", desc: "Ethical supply chain audits", cost: "+20% material", points: "+150 ESG" },
      { id: "waterConservation", name: "Water Conservation", desc: "Closed-loop water systems", cost: "$1.5M/yr", points: "+80 ESG, -20% water" },
      { id: "zeroWasteCommitment", name: "Zero Waste", desc: "Zero landfill commitment", cost: "$2M/yr", points: "+100 ESG, -30% waste" },
      { id: "humanRightsAudit", name: "Human Rights Audit", desc: "Supply chain human rights", cost: "$800K/yr", points: "+70 ESG" },
      { id: "whistleblowerProtection", name: "Whistleblower Protection", desc: "Anonymous reporting system", cost: "$200K/yr", points: "+40 ESG" },
      { id: "biodiversityProtection", name: "Biodiversity Protection", desc: "Habitat restoration funding", cost: "Variable", points: "+1 ESG per $5K" },
    ],
  },
  {
    tier: 4, title: "Excellence", requiredScore: 500, color: "amber" as const,
    initiatives: [
      { id: "circularEconomy", name: "Circular Economy", desc: "Full product lifecycle management", cost: "$3M/yr", points: "+120 ESG, -20% material" },
      { id: "affordableHousing", name: "Affordable Housing", desc: "Employee housing assistance", cost: "Variable", points: "+1 ESG per $10K" },
      { id: "executivePayRatio", name: "Executive Pay Ratio", desc: "Cap exec pay at 50x average", cost: "$0", points: "+100 ESG" },
    ],
  },
];

const ESG_COLOR_MAP = {
  green: { border: "border-green-700/50", badge: "bg-green-600", text: "text-green-400", hover: "hover:border-green-500/50", btn: "bg-green-600 hover:bg-green-700" },
  blue: { border: "border-blue-700/50", badge: "bg-blue-600", text: "text-blue-400", hover: "hover:border-blue-500/50", btn: "bg-blue-600 hover:bg-blue-700" },
  purple: { border: "border-purple-700/50", badge: "bg-purple-600", text: "text-purple-400", hover: "hover:border-purple-500/50", btn: "bg-purple-600 hover:bg-purple-700" },
  amber: { border: "border-amber-700/50", badge: "bg-amber-600", text: "text-amber-400", hover: "hover:border-amber-500/50", btn: "bg-amber-600 hover:bg-amber-700" },
};

export function ImproveTab({
  selectedFactory,
  state,
  teamState,
  efficiencyInvestment,
  setEfficiencyInvestment,
  maintenanceInvestment,
  setMaintenanceInvestment,
  upgradePurchases,
  toggleUpgradePurchase,
  isUpgradePurchased,
  activeEsgInitiatives,
  toggleEsgInitiative,
  esgInvestment,
  setEsgInvestment,
  upgrades,
}: ImproveTabProps) {
  const esgScore = (teamState as any)?.esgScore ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      {/* ================================================================
          SECTION 1: Efficiency
          ================================================================ */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Efficiency
          </CardTitle>
          <CardDescription className="text-slate-400">
            Training and maintenance investments. ~+2% efficiency per $1M (diminishing above $10M).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Worker Training */}
            <div className="p-4 bg-gradient-to-br from-blue-900/20 to-slate-800/50 rounded-lg border border-blue-700/30">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-400" />
                <h4 className="text-white font-semibold text-sm">Worker Training</h4>
                <span className="ml-auto text-blue-400 font-bold text-sm">
                  +{Math.min(10, Math.floor(efficiencyInvestment.workers / 1_000_000))}%
                </span>
              </div>
              <Slider
                data-testid="slider-efficiency-workers"
                value={[efficiencyInvestment.workers]}
                onValueChange={(v) => setEfficiencyInvestment((prev) => ({ ...prev, workers: v[0] }))}
                max={20000000}
                step={1000000}
                variant="info"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-slate-500">$0</span>
                <Input
                  type="number"
                  value={efficiencyInvestment.workers}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(20000000, Number(e.target.value) || 0));
                    setEfficiencyInvestment((prev) => ({ ...prev, workers: v }));
                  }}
                  className="w-28 h-7 text-right bg-slate-700 border-slate-600 text-blue-400 font-semibold text-xs"
                />
              </div>
            </div>

            {/* Engineer Training */}
            <div className="p-4 bg-gradient-to-br from-purple-900/20 to-slate-800/50 rounded-lg border border-purple-700/30">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-5 h-5 text-purple-400" />
                <h4 className="text-white font-semibold text-sm">Engineer Training</h4>
                <span className="ml-auto text-purple-400 font-bold text-sm">
                  +{Math.min(10, Math.floor(efficiencyInvestment.engineers / 1_000_000))}%
                </span>
              </div>
              <Slider
                data-testid="slider-efficiency-engineers"
                value={[efficiencyInvestment.engineers]}
                onValueChange={(v) => setEfficiencyInvestment((prev) => ({ ...prev, engineers: v[0] }))}
                max={20000000}
                step={1000000}
                variant="purple"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-slate-500">$0</span>
                <Input
                  type="number"
                  value={efficiencyInvestment.engineers}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(20000000, Number(e.target.value) || 0));
                    setEfficiencyInvestment((prev) => ({ ...prev, engineers: v }));
                  }}
                  className="w-28 h-7 text-right bg-slate-700 border-slate-600 text-purple-400 font-semibold text-xs"
                />
              </div>
            </div>

            {/* Equipment Modernization */}
            <div className="p-4 bg-gradient-to-br from-orange-900/20 to-slate-800/50 rounded-lg border border-orange-700/30">
              <div className="flex items-center gap-2 mb-3">
                <Cog className="w-5 h-5 text-orange-400" />
                <h4 className="text-white font-semibold text-sm">Equipment Modernization</h4>
                <span className="ml-auto text-orange-400 font-bold text-sm">
                  +{Math.min(10, Math.floor(efficiencyInvestment.equipment / 1_000_000))}%
                </span>
              </div>
              <Slider
                data-testid="slider-efficiency-equipment"
                value={[efficiencyInvestment.equipment]}
                onValueChange={(v) => setEfficiencyInvestment((prev) => ({ ...prev, equipment: v[0] }))}
                max={20000000}
                step={1000000}
                variant="orange"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-slate-500">$0</span>
                <Input
                  type="number"
                  value={efficiencyInvestment.equipment}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(20000000, Number(e.target.value) || 0));
                    setEfficiencyInvestment((prev) => ({ ...prev, equipment: v }));
                  }}
                  className="w-28 h-7 text-right bg-slate-700 border-slate-600 text-orange-400 font-semibold text-xs"
                />
              </div>
            </div>

            {/* Maintenance Budget */}
            <div className="p-4 bg-gradient-to-br from-cyan-900/20 to-slate-800/50 rounded-lg border border-cyan-700/30">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-5 h-5 text-cyan-400" />
                <h4 className="text-white font-semibold text-sm">Maintenance Budget</h4>
                <span className="ml-auto text-cyan-400 font-bold text-sm">
                  -{Math.min(15, Math.floor(maintenanceInvestment / 1_000_000) * 2)}% risk
                </span>
              </div>
              <Slider
                value={[maintenanceInvestment]}
                onValueChange={(v) => setMaintenanceInvestment(v[0])}
                max={5000000}
                step={100000}
                variant="info"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-slate-500">$0</span>
                <Input
                  type="number"
                  value={maintenanceInvestment}
                  onChange={(e) => setMaintenanceInvestment(Math.max(0, Math.min(5000000, Number(e.target.value) || 0)))}
                  className="w-28 h-7 text-right bg-slate-700 border-slate-600 text-cyan-400 font-semibold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Total summary bar */}
          <div className="mt-4 p-3 bg-slate-700/50 rounded-lg flex justify-between items-center">
            <div>
              <span className="text-slate-400 text-sm">Total Efficiency Spend</span>
              <p className="text-white font-bold">
                {formatCurrency(efficiencyInvestment.workers + efficiencyInvestment.engineers + efficiencyInvestment.equipment + maintenanceInvestment)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-sm">Total Efficiency Gain</span>
              <p className="text-green-400 font-bold text-xl">
                +{Math.min(30, Math.floor((efficiencyInvestment.workers + efficiencyInvestment.engineers + efficiencyInvestment.equipment) / 1_000_000))}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================
          SECTION 2: Factory Upgrades (5 tiers, R&D-gated)
          ================================================================ */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Cog className="w-5 h-5 text-yellow-400" />
            Factory Upgrades
          </CardTitle>
          <CardDescription className="text-slate-400">
            Purchase upgrades to improve efficiency, quality, and sustainability. Higher tiers require R&D.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pending purchases banner */}
          {upgradePurchases.length > 0 && (
            <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-400 text-sm font-medium mb-2">Pending Purchases:</p>
              <div className="space-y-1">
                {upgradePurchases.map((purchase, idx) => {
                  const upgrade = upgrades.find((u) => u.id === purchase.upgradeName);
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">{upgrade?.name ?? purchase.upgradeName} - {formatCurrency(upgrade?.cost || 0)}</span>
                      <Button size="sm" variant="ghost" className="text-red-400 h-6 px-2" onClick={() => toggleUpgradePurchase(purchase.upgradeName)}>
                        Cancel
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Render each tier */}
          {[1, 2, 3, 4, 5].map((tier) => {
            const tierConfig = TIER_TECH[tier];
            const tierUpgrades = upgrades.filter((u) => u.tier === tier);
            if (tierUpgrades.length === 0) return null;
            const isUnlocked = tier === 1 || (state?.unlockedTechnologies || []).includes(tierConfig.key);
            return (
              <div key={tier}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={tierConfig.badge}>Tier {tier}</Badge>
                  <span className="text-white font-medium text-sm">{TIER_NAMES[tier]}</span>
                  {!isUnlocked && tier > 1 && <span className="text-slate-500 text-xs flex items-center gap-1"><Lock className="w-3 h-3" />{tierConfig.label}</span>}
                  {isUnlocked && tier > 1 && <Badge variant="outline" className={`${tierConfig.color} text-xs`}>Unlocked</Badge>}
                </div>
                <div className={`grid md:grid-cols-2 gap-3 ${!isUnlocked ? "opacity-50" : ""}`}>
                  {tierUpgrades.map((upgrade) => {
                    const { installed, pending } = isUpgradePurchased(upgrade.id);
                    const UpgradeIcon = upgrade.icon;
                    return (
                      <div key={upgrade.id} className={`p-3 rounded-lg border ${installed ? "bg-green-900/20 border-green-700/50" : pending ? "bg-orange-900/10 border-orange-600/50" : "bg-slate-700/50 border-slate-600"}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <UpgradeIcon className={`w-4 h-4 ${installed ? "text-green-400" : pending ? "text-orange-400" : tierConfig.color}`} />
                            <div>
                              <span className="text-white text-sm font-medium">{upgrade.name}</span>
                              <p className="text-slate-400 text-xs">{upgrade.description}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <span className="text-white text-sm font-bold">{formatCurrency(upgrade.cost)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {upgrade.benefits.map((b, i) => (
                            <span key={i} className="text-[10px] bg-slate-600/50 text-slate-300 px-1.5 py-0.5 rounded">{b}</span>
                          ))}
                        </div>
                        <div className="mt-2">
                          {installed ? (
                            <Badge className="bg-green-600 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Installed</Badge>
                          ) : pending ? (
                            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-7 text-xs" onClick={() => toggleUpgradePurchase(upgrade.id)}>Cancel</Button>
                          ) : (
                            <Button size="sm" className={`${tierConfig.btnClass} h-7 text-xs`} onClick={() => toggleUpgradePurchase(upgrade.id)} disabled={!isUnlocked}>
                              {isUnlocked ? "Purchase" : "Locked"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* ================================================================
          SECTION 3: ESG & Sustainability
          ================================================================ */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-400" />
            ESG & Sustainability
          </CardTitle>
          <CardDescription className="text-slate-400">
            ESG score 700+ gives +5% revenue bonus. Below 300 incurs -8% penalty. Current score: <span className={esgScore >= 500 ? "text-green-400" : esgScore >= 300 ? "text-yellow-400" : "text-red-400"}>{esgScore}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* CO2 reduction slider */}
          <div className="p-4 bg-gradient-to-br from-green-900/20 to-slate-800/50 rounded-lg border border-green-700/30">
            <div className="flex items-center gap-2 mb-3">
              <Leaf className="w-5 h-5 text-green-400" />
              <h4 className="text-white font-semibold text-sm">CO2 Reduction Investment</h4>
              <span className="ml-auto text-green-400 text-xs">10 tons / $100K</span>
            </div>
            <Slider
              value={[esgInvestment]}
              onValueChange={(v) => setEsgInvestment(v[0])}
              max={5000000}
              step={100000}
              variant="success"
            />
            <div className="flex justify-between mt-2 items-center">
              <span className="text-xs text-slate-400">Current: {selectedFactory.co2Emissions}t &rarr; After: {Math.max(0, (selectedFactory.co2Emissions || 500) - Math.floor(esgInvestment / 100000) * 10)}t</span>
              <Input
                type="number"
                value={esgInvestment}
                onChange={(e) => setEsgInvestment(Math.max(0, Math.min(5000000, Number(e.target.value) || 0)))}
                className="w-28 h-7 text-right bg-slate-700 border-slate-600 text-green-400 font-semibold text-xs"
              />
            </div>
          </div>

          {/* ESG Initiative tiers */}
          {ESG_TIERS.map((tierData) => {
            const c = ESG_COLOR_MAP[tierData.color];
            const isUnlocked = esgScore >= tierData.requiredScore;
            return (
              <div key={tierData.tier} className={!isUnlocked ? "opacity-50" : ""}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={c.badge}>Tier {tierData.tier}</Badge>
                  <span className="text-white font-medium text-sm">{tierData.title}</span>
                  {!isUnlocked && <span className="text-slate-500 text-xs">Requires ESG {tierData.requiredScore}+</span>}
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {tierData.initiatives.map((init) => (
                    <div key={init.id} className={`p-2.5 rounded-lg border ${isUnlocked ? `bg-slate-700/50 border-slate-600 ${c.hover}` : "bg-slate-800/50 border-slate-700"}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Leaf className={`w-3.5 h-3.5 ${isUnlocked ? c.text : "text-slate-500"}`} />
                        <span className={`font-medium text-xs ${isUnlocked ? "text-white" : "text-slate-500"}`}>{init.name}</span>
                      </div>
                      <p className="text-slate-400 text-[10px] mb-1.5">{init.desc}</p>
                      <div className="flex justify-between text-[10px] mb-1.5">
                        <span className="text-slate-500">{init.cost}</span>
                        <span className={isUnlocked ? c.text : "text-slate-500"}>{init.points}</span>
                      </div>
                      <Button
                        size="sm"
                        variant={activeEsgInitiatives.includes(init.id) ? "default" : "outline"}
                        className={`w-full h-6 text-[10px] ${activeEsgInitiatives.includes(init.id) ? c.btn : ""}`}
                        disabled={!isUnlocked}
                        onClick={() => toggleEsgInitiative(init.id)}
                      >
                        {!isUnlocked ? "Locked" : activeEsgInitiatives.includes(init.id) ? "Active \u2713" : "Activate"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </motion.div>
  );
}
