// ============================================================
// EfficiencyTab.tsx
// Efficiency sliders: worker training, engineer training,
// equipment modernization, maintenance budget + total summary.
// Also shows Automation Level from installed upgrades.
// ============================================================
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { formatCurrency } from "@/lib/utils";
import {
  Zap,
  Users,
  Wrench,
  Cog,
  Bot,
} from "lucide-react";
import type { Factory as FactoryType } from "@/engine/types";

// ---- Props ----
interface EfficiencyTabProps {
  selectedFactory: FactoryType;
  efficiencyInvestment: { workers: number; engineers: number; equipment: number; [key: string]: number };
  setEfficiencyInvestment: React.Dispatch<React.SetStateAction<{ workers: number; engineers: number; equipment: number; [key: string]: number }>>;
  maintenanceInvestment: number;
  setMaintenanceInvestment: React.Dispatch<React.SetStateAction<number>>;
  equipmentHealth: { health: number; breakdownRisk: number; maintenanceBacklog: number; burnoutRisk: number; utilization: number };
}

// Upgrades that contribute to the automation level
const AUTOMATION_UPGRADES: Record<string, { label: string; bonus: number }> = {
  leanManufacturing: { label: "Lean Manufacturing", bonus: 5 },
  continuousImprovement: { label: "Continuous Improvement", bonus: 5 },
  automation: { label: "Full Automation", bonus: 15 },
  modularLines: { label: "Modular Production Lines", bonus: 10 },
  digitalTwin: { label: "Digital Twin", bonus: 10 },
  iotIntegration: { label: "IoT Integration", bonus: 10 },
  advancedRobotics: { label: "Advanced Robotics", bonus: 20 },
  flexibleManufacturing: { label: "Flexible Manufacturing", bonus: 15 },
  sixSigma: { label: "Six Sigma Quality", bonus: 5 },
  cleanRoom: { label: "Clean Room", bonus: 5 },
};

export function EfficiencyTab({
  selectedFactory,
  efficiencyInvestment,
  setEfficiencyInvestment,
  maintenanceInvestment,
  setMaintenanceInvestment,
  equipmentHealth,
}: EfficiencyTabProps) {
  // Compute automation level from installed upgrades
  const automationInfo = useMemo(() => {
    const installed = selectedFactory.upgrades || [];
    let totalBonus = 0;
    let count = 0;
    for (const upgradeId of installed) {
      const entry = AUTOMATION_UPGRADES[upgradeId as string];
      if (entry) {
        totalBonus += entry.bonus;
        count++;
      }
    }
    const maxLevel = 10;
    const level = Math.min(maxLevel, count);
    return { level, maxLevel, totalBonus };
  }, [selectedFactory.upgrades]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Automation Level Display */}
      <Card className="bg-gradient-to-r from-yellow-900/20 to-slate-800/80 border-yellow-700/50 backdrop-blur-sm">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-yellow-400" />
              <div>
                <h3 className="text-white font-semibold text-base">Automation Level</h3>
                <p className="text-slate-400 text-sm">Based on installed factory upgrades</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold text-xl">
                  Level {automationInfo.level}/{automationInfo.maxLevel}
                </span>
                <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600">
                  +{automationInfo.totalBonus}% production bonus
                </Badge>
              </div>
              <div className="flex gap-1 mt-1.5 justify-end">
                {Array.from({ length: automationInfo.maxLevel }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-2 rounded-sm ${
                      i < automationInfo.level ? "bg-yellow-400" : "bg-slate-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Sliders */}
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
                <span className="ml-auto text-slate-400 text-xs">
                  Preventive maintenance reduces unplanned downtime
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

      {/* Equipment Health Summary */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-cyan-400" />
            Equipment Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-xs mb-1">Health Score</p>
              <p className={`text-xl font-bold ${equipmentHealth.health >= 70 ? "text-green-400" : equipmentHealth.health >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                {equipmentHealth.health.toFixed(0)}%
              </p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-xs mb-1">Breakdown Risk</p>
              <p className={`text-xl font-bold ${equipmentHealth.breakdownRisk <= 10 ? "text-green-400" : equipmentHealth.breakdownRisk <= 25 ? "text-yellow-400" : "text-red-400"}`}>
                {equipmentHealth.breakdownRisk.toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-xs mb-1">Utilization</p>
              <p className="text-xl font-bold text-cyan-400">
                {(equipmentHealth.utilization * 100).toFixed(0)}%
              </p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-lg text-center">
              <p className="text-slate-400 text-xs mb-1">Burnout Risk</p>
              <p className={`text-xl font-bold ${equipmentHealth.burnoutRisk <= 0.1 ? "text-green-400" : equipmentHealth.burnoutRisk <= 0.3 ? "text-yellow-400" : "text-red-400"}`}>
                {(equipmentHealth.burnoutRisk * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
