// ============================================================
// ESGTab.tsx
// ESG & Sustainability tab.
// Displays: ESG overview stats, subscore breakdown, CO2 reduction
// investment, and tiered ESG initiatives (Tier 1-4).
// ============================================================
"use client";

import { motion } from "framer-motion";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { StatCard } from "@/components/ui/stat-card";
import {
  Leaf,
  TrendingUp,
  Activity,
  CheckCircle2,
} from "lucide-react";
import type { TeamState, Factory as FactoryType } from "@/engine/types";

interface ESGTabProps {
  selectedFactory: FactoryType;
  state: TeamState | null;
  teamState: Record<string, unknown> | null;
  esgInvestment: number;
  setEsgInvestment: React.Dispatch<React.SetStateAction<number>>;
  activeEsgInitiatives: string[];
  toggleEsgInitiative: (id: string) => void;
}

export function ESGTab({
  selectedFactory,
  state,
  teamState,
  esgInvestment,
  setEsgInvestment,
  activeEsgInitiatives,
  toggleEsgInitiative,
}: ESGTabProps) {
  const esgScore = (teamState as any)?.esgScore ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ESG Overview Stats */}
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-lg font-semibold text-white">ESG & Sustainability</h3>
        <HelpTooltip text="ESG score 700+ gives +5% revenue bonus. Below 300 incurs -8% penalty. Free initiatives like Code of Ethics give easy points." />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="ESG Score"
          value={esgScore}
          icon={<Leaf className="w-5 h-5" />}
          variant={esgScore >= 500 ? "success" : esgScore >= 300 ? "warning" : "default"}
        />
        <StatCard
          label="CO2 Emissions"
          value={selectedFactory.co2Emissions || 500}
          suffix="t"
          icon={<Activity className="w-5 h-5" />}
          variant="warning"
        />
        <StatCard
          label="Tier Unlocked"
          value={esgScore >= 500 ? "4" : esgScore >= 300 ? "3" : esgScore >= 100 ? "2" : "1"}
          icon={<TrendingUp className="w-5 h-5" />}
          variant="info"
        />
        <StatCard
          label="Green Certification"
          value={esgInvestment >= 2_000_000 ? "Level 1" : "None"}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant={esgInvestment >= 2_000_000 ? "success" : "default"}
        />
      </div>

      {/* ESG Subscore Breakdown */}
      {(() => {
        const subscores = state?.esgSubscores;
        const env = subscores?.environmental ?? 0;
        const soc = subscores?.social ?? 0;
        const gov = subscores?.governance ?? 0;
        const reachBonus = ((env / 333) * 0.15 * 100).toFixed(1);
        const effBonus = ((soc / 333) * 0.06 * 100).toFixed(1);
        const riskReduction = ((gov / 333) * 0.20 * 100).toFixed(1);

        return (
          <Card className="bg-slate-800/80 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                ESG Subscore Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Environmental</span>
                  <span className="text-xs text-emerald-400">+{reachBonus}% market reach</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, (env / 333) * 100)}%` }} />
                </div>
                <span className="text-xs text-slate-500">{env} / 333</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Social</span>
                  <span className="text-xs text-blue-400">+{effBonus}% production efficiency</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (soc / 333) * 100)}%` }} />
                </div>
                <span className="text-xs text-slate-500">{soc} / 333</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">Governance</span>
                  <span className="text-xs text-purple-400">-{riskReduction}% breakdown risk</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${Math.min(100, (gov / 333) * 100)}%` }} />
                </div>
                <span className="text-xs text-slate-500">{gov} / 333</span>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* CO2 Reduction Investment */}
      <Card className="bg-slate-800/80 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-400" />
            CO2 Reduction Investment
          </CardTitle>
          <CardDescription>10 tons reduction per $100K invested</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-300">Investment Amount</span>
            <Input
              type="number"
              value={esgInvestment}
              onChange={(e) => setEsgInvestment(Math.max(0, Math.min(5000000, Number(e.target.value) || 0)))}
              className="w-32 h-8 text-right bg-slate-700 border-slate-600 text-green-400 font-semibold"
            />
          </div>
          <Slider
            value={[esgInvestment]}
            onValueChange={(values) => setEsgInvestment(values[0])}
            max={5000000}
            step={100000}
            variant="success"
          />
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Current: {selectedFactory.co2Emissions}t</span>
            <span className="text-green-400">After: {Math.max(0, (selectedFactory.co2Emissions || 500) - Math.floor(esgInvestment / 100000) * 10)}t</span>
          </div>
        </CardContent>
      </Card>

      {/* Tier 1: Foundation Initiatives (Always Available) */}
      <Card className="bg-slate-800 border-green-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Badge className="bg-green-600">Tier 1</Badge>
              Foundation Initiatives
            </CardTitle>
            <Badge variant="outline" className="text-green-400 border-green-400">Unlocked</Badge>
          </div>
          <CardDescription>Basic ESG programs available from the start</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { id: "charitableDonation", name: "Charitable Donation", desc: "Donate to charitable causes", cost: "Variable", points: "Based on % of income" },
              { id: "communityInvestment", name: "Community Investment", desc: "Invest in local communities", cost: "Variable", points: "Based on % of revenue" },
              { id: "codeOfEthics", name: "Code of Ethics", desc: "Adopt formal ethical guidelines", cost: "$0", points: "+200 ESG" },
              { id: "employeeWellness", name: "Employee Wellness", desc: "Health and wellness programs", cost: "$500K/yr", points: "+60 ESG, -10% turnover" },
              { id: "communityEducation", name: "Community Education", desc: "Support local education", cost: "Variable", points: "+1 ESG per $2K" },
            ].map((init) => (
              <div key={init.id} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-green-500/50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="w-4 h-4 text-green-400" />
                  <span className="text-white font-medium text-sm">{init.name}</span>
                </div>
                <p className="text-slate-400 text-xs mb-2">{init.desc}</p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{init.cost}</span>
                  <span className="text-green-400">{init.points}</span>
                </div>
                <Button
                  size="sm"
                  variant={activeEsgInitiatives.includes(init.id) ? "default" : "outline"}
                  className={`w-full mt-2 h-7 text-xs ${activeEsgInitiatives.includes(init.id) ? "bg-green-600 hover:bg-green-700" : ""}`}
                  onClick={() => toggleEsgInitiative(init.id)}
                >
                  {activeEsgInitiatives.includes(init.id) ? "Active \u2713" : "Activate"}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tier 2: Growth Initiatives (ESG 100+) */}
      <EsgTierCard
        tier={2}
        title="Growth Initiatives"
        description="Enhanced ESG programs for growing companies"
        requiredScore={100}
        currentScore={esgScore}
        color="blue"
        initiatives={[
          { id: "workplaceHealthSafety", name: "Workplace Safety", desc: "Comprehensive safety programs", cost: "$2M/yr", points: "+200 ESG" },
          { id: "fairWageProgram", name: "Fair Wage Program", desc: "Above-market compensation", cost: "Varies", points: "+260 ESG" },
          { id: "carbonOffsetProgram", name: "Carbon Offset", desc: "Purchase carbon credits", cost: "$20/ton", points: "+1 ESG per 10 tons" },
          { id: "renewableEnergyCertificates", name: "Renewable Energy Certs", desc: "Green energy credits", cost: "Variable", points: "+1 ESG per $10K" },
          { id: "diversityInclusion", name: "Diversity & Inclusion", desc: "D&I programs and training", cost: "$1M/yr", points: "+90 ESG, +5% morale" },
          { id: "transparencyReport", name: "Transparency Report", desc: "Public sustainability reporting", cost: "$300K/yr", points: "+50 ESG" },
        ]}
        activeEsgInitiatives={activeEsgInitiatives}
        toggleEsgInitiative={toggleEsgInitiative}
      />

      {/* Tier 3: Leadership Initiatives (ESG 300+) */}
      <EsgTierCard
        tier={3}
        title="Leadership Initiatives"
        description="Advanced sustainability programs for industry leaders"
        requiredScore={300}
        currentScore={esgScore}
        color="purple"
        initiatives={[
          { id: "supplierEthicsProgram", name: "Supplier Ethics", desc: "Ethical supply chain audits", cost: "+20% material", points: "+150 ESG" },
          { id: "waterConservation", name: "Water Conservation", desc: "Closed-loop water systems", cost: "$1.5M/yr", points: "+80 ESG, -20% water" },
          { id: "zeroWasteCommitment", name: "Zero Waste", desc: "Zero landfill commitment", cost: "$2M/yr", points: "+100 ESG, -30% waste" },
          { id: "humanRightsAudit", name: "Human Rights Audit", desc: "Supply chain human rights", cost: "$800K/yr", points: "+70 ESG" },
          { id: "whistleblowerProtection", name: "Whistleblower Protection", desc: "Anonymous reporting system", cost: "$200K/yr", points: "+40 ESG" },
          { id: "biodiversityProtection", name: "Biodiversity Protection", desc: "Habitat restoration funding", cost: "Variable", points: "+1 ESG per $5K" },
        ]}
        activeEsgInitiatives={activeEsgInitiatives}
        toggleEsgInitiative={toggleEsgInitiative}
      />

      {/* Tier 4: Excellence Initiatives (ESG 500+) */}
      <EsgTierCard
        tier={4}
        title="Excellence Initiatives"
        description="Premium sustainability programs for ESG champions"
        requiredScore={500}
        currentScore={esgScore}
        color="amber"
        initiatives={[
          { id: "circularEconomy", name: "Circular Economy", desc: "Full product lifecycle management", cost: "$3M/yr", points: "+120 ESG, -20% material" },
          { id: "affordableHousing", name: "Affordable Housing", desc: "Employee housing assistance", cost: "Variable", points: "+1 ESG per $10K" },
          { id: "executivePayRatio", name: "Executive Pay Ratio", desc: "Cap exec pay at 50x average", cost: "$0", points: "+100 ESG" },
        ]}
        activeEsgInitiatives={activeEsgInitiatives}
        toggleEsgInitiative={toggleEsgInitiative}
      />
    </motion.div>
  );
}

// ---- Reusable ESG Tier Card ----
interface EsgTierCardProps {
  tier: number;
  title: string;
  description: string;
  requiredScore: number;
  currentScore: number;
  color: "blue" | "purple" | "amber";
  initiatives: Array<{ id: string; name: string; desc: string; cost: string; points: string }>;
  activeEsgInitiatives: string[];
  toggleEsgInitiative: (id: string) => void;
}

function EsgTierCard({ tier, title, description, requiredScore, currentScore, color, initiatives, activeEsgInitiatives, toggleEsgInitiative }: EsgTierCardProps) {
  const isUnlocked = currentScore >= requiredScore;
  const colorMap = {
    blue: { border: "border-blue-700/50", badge: "bg-blue-600", text: "text-blue-400", hoverBorder: "hover:border-blue-500/50", btnBg: "bg-blue-600 hover:bg-blue-700", badgeOutline: "text-blue-400 border-blue-400" },
    purple: { border: "border-purple-700/50", badge: "bg-purple-600", text: "text-purple-400", hoverBorder: "hover:border-purple-500/50", btnBg: "bg-purple-600 hover:bg-purple-700", badgeOutline: "text-purple-400 border-purple-400" },
    amber: { border: "border-amber-700/50", badge: "bg-amber-600", text: "text-amber-400", hoverBorder: "hover:border-amber-500/50", btnBg: "bg-amber-600 hover:bg-amber-700", badgeOutline: "text-amber-400 border-amber-400" },
  };
  const c = colorMap[color];

  return (
    <Card className={`bg-slate-800 ${isUnlocked ? c.border : "border-slate-700/50 opacity-60"}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Badge className={isUnlocked ? c.badge : "bg-slate-600"}>Tier {tier}</Badge>
            {title}
          </CardTitle>
          {isUnlocked ? (
            <Badge variant="outline" className={c.badgeOutline}>Unlocked</Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400">Requires ESG {requiredScore}+</Badge>
          )}
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`grid md:grid-cols-2 lg:grid-cols-3 gap-3`}>
          {initiatives.map((init) => (
            <div key={init.id} className={`p-3 rounded-lg border transition-colors ${isUnlocked ? `bg-slate-700/50 border-slate-600 ${c.hoverBorder}` : "bg-slate-800/50 border-slate-700"}`}>
              <div className="flex items-center gap-2 mb-2">
                <Leaf className={`w-4 h-4 ${isUnlocked ? c.text : "text-slate-500"}`} />
                <span className={`font-medium text-sm ${isUnlocked ? "text-white" : "text-slate-500"}`}>{init.name}</span>
              </div>
              <p className="text-slate-400 text-xs mb-2">{init.desc}</p>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">{init.cost}</span>
                <span className={isUnlocked ? c.text : "text-slate-500"}>{init.points}</span>
              </div>
              <Button
                size="sm"
                variant={activeEsgInitiatives.includes(init.id) ? "default" : "outline"}
                className={`w-full mt-2 h-7 text-xs ${activeEsgInitiatives.includes(init.id) ? c.btnBg : ""}`}
                disabled={!isUnlocked}
                onClick={() => toggleEsgInitiative(init.id)}
              >
                {!isUnlocked ? "Locked" : activeEsgInitiatives.includes(init.id) ? "Active \u2713" : "Activate"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
