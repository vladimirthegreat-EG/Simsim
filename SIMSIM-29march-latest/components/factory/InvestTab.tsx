// ============================================================
// InvestTab.tsx
// Merged Efficiency Investment + Maintenance Management tabs.
// Displays: efficiency investment sliders (workers, engineers, equipment),
// efficiency breakdown, maintenance budget slider, and maintenance stats.
// ============================================================
"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { formatCurrency } from "@/lib/utils";
import {
  Zap,
  Users,
  Wrench,
  Cog,
  TrendingUp,
  CheckCircle2,
  Activity,
  AlertTriangle,
} from "lucide-react";
import type { Factory as FactoryType } from "@/engine/types";

interface InvestTabProps {
  selectedFactory: FactoryType;
  efficiencyInvestment: { workers: number; engineers: number; equipment: number; [key: string]: number };
  setEfficiencyInvestment: React.Dispatch<React.SetStateAction<{ workers: number; engineers: number; equipment: number; [key: string]: number }>>;
  maintenanceInvestment: number;
  setMaintenanceInvestment: React.Dispatch<React.SetStateAction<number>>;
  shiftMode: "single" | "double" | "overtime";
  setShiftMode: (mode: "single" | "double" | "overtime") => void;
  equipmentHealth: {
    health: number;
    breakdownRisk: number;
    maintenanceBacklog: number;
    burnoutRisk: number;
    utilization: number;
  };
}

export function InvestTab({
  selectedFactory,
  efficiencyInvestment,
  setEfficiencyInvestment,
  maintenanceInvestment,
  setMaintenanceInvestment,
  shiftMode,
  setShiftMode,
  equipmentHealth,
}: InvestTabProps) {
  return (
    <>
      {/* Shift Mode — Capsim-style capacity flexibility */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            Production Shift
          </CardTitle>
          <CardDescription className="text-slate-400">
            Run additional shifts to increase capacity. Higher shifts cost more per unit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {([
              { mode: "single" as const, label: "1st Shift", desc: "Standard hours", capacity: "1.0x", cost: "Base cost", color: "border-green-500/30 bg-green-500/5" },
              { mode: "double" as const, label: "2nd Shift", desc: "+100% capacity, +50% labor cost", capacity: "2.0x", cost: "+50% labor", color: "border-amber-500/30 bg-amber-500/5" },
              { mode: "overtime" as const, label: "Overtime", desc: "+50% capacity, +75% labor cost", capacity: "1.5x", cost: "+75% labor", color: "border-red-500/30 bg-red-500/5" },
            ]).map((opt) => (
              <button
                key={opt.mode}
                onClick={() => setShiftMode(opt.mode)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  shiftMode === opt.mode
                    ? `${opt.color} ring-1 ring-white/20`
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                <div className="text-white text-sm font-medium">{opt.label}</div>
                <div className="text-slate-400 text-xs mt-1">{opt.desc}</div>
                <div className="flex justify-between mt-2">
                  <Badge className={`text-[10px] ${shiftMode === opt.mode ? "bg-white/10 text-white" : "bg-slate-700 text-slate-400"}`}>
                    {opt.capacity} capacity
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Efficiency Investment (TabsContent value="efficiency") */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-400" />
              Efficiency Investment
            </CardTitle>
            <CardDescription className="text-slate-400">
              Invest in training and equipment to improve factory efficiency.
              <span className="text-orange-400"> 1% efficiency gain per $1M invested</span> (diminishing returns after $10M).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg text-xs text-slate-400">
              Each $1M invested → approximately +2% factory efficiency (diminishing returns above $10M)
            </div>
            {/* Worker Training */}
            <div className="p-5 bg-gradient-to-br from-blue-900/20 to-slate-800/50 rounded-lg border border-blue-700/30">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-white font-semibold">Worker Training Program</h3>
                  <p className="text-slate-400 text-sm">Upskill production workers for better output quality</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 text-sm font-medium">Investment Amount</label>
                  <Input
                    type="number"
                    value={efficiencyInvestment.workers}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(20000000, Number(e.target.value) || 0));
                      setEfficiencyInvestment(prev => ({ ...prev, workers: v }));
                    }}
                    className="w-32 h-8 text-right bg-slate-700 border-slate-600 text-blue-400 font-semibold"
                  />
                </div>
                <Slider
                  data-testid="slider-efficiency-workers"
                  value={[efficiencyInvestment.workers]}
                  onValueChange={(values) => setEfficiencyInvestment(prev => ({
                    ...prev,
                    workers: values[0]
                  }))}
                  max={20000000}
                  step={1000000}
                  variant="info"
                />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-400">Efficiency Gain</span>
                  <span className="text-blue-400 font-bold">
                    +{Math.min(10, Math.floor(efficiencyInvestment.workers / 1_000_000))}%
                  </span>
                </div>
              </div>
            </div>

            {/* Engineer Training */}
            <div className="p-5 bg-gradient-to-br from-purple-900/20 to-slate-800/50 rounded-lg border border-purple-700/30">
              <div className="flex items-center gap-3 mb-4">
                <Wrench className="w-6 h-6 text-purple-400" />
                <div>
                  <h3 className="text-white font-semibold">Engineer Training Program</h3>
                  <p className="text-slate-400 text-sm">Advanced technical training for engineering staff</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 text-sm font-medium">Investment Amount</label>
                  <Input
                    type="number"
                    value={efficiencyInvestment.engineers}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(20000000, Number(e.target.value) || 0));
                      setEfficiencyInvestment(prev => ({ ...prev, engineers: v }));
                    }}
                    className="w-32 h-8 text-right bg-slate-700 border-slate-600 text-purple-400 font-semibold"
                  />
                </div>
                <Slider
                  data-testid="slider-efficiency-engineers"
                  value={[efficiencyInvestment.engineers]}
                  onValueChange={(values) => setEfficiencyInvestment(prev => ({
                    ...prev,
                    engineers: values[0]
                  }))}
                  max={20000000}
                  step={1000000}
                  variant="purple"
                />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-400">Efficiency Gain</span>
                  <span className="text-purple-400 font-bold">
                    +{Math.min(10, Math.floor(efficiencyInvestment.engineers / 1_000_000))}%
                  </span>
                </div>
              </div>
            </div>

            {/* Equipment Upgrades */}
            <div className="p-5 bg-gradient-to-br from-orange-900/20 to-slate-800/50 rounded-lg border border-orange-700/30">
              <div className="flex items-center gap-3 mb-4">
                <Cog className="w-6 h-6 text-orange-400" />
                <div>
                  <h3 className="text-white font-semibold">Equipment Modernization</h3>
                  <p className="text-slate-400 text-sm">Upgrade machinery and production equipment</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 text-sm font-medium">Investment Amount</label>
                  <Input
                    type="number"
                    value={efficiencyInvestment.equipment}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(20000000, Number(e.target.value) || 0));
                      setEfficiencyInvestment(prev => ({ ...prev, equipment: v }));
                    }}
                    className="w-32 h-8 text-right bg-slate-700 border-slate-600 text-orange-400 font-semibold"
                  />
                </div>
                <Slider
                  data-testid="slider-efficiency-equipment"
                  value={[efficiencyInvestment.equipment]}
                  onValueChange={(values) => setEfficiencyInvestment(prev => ({
                    ...prev,
                    equipment: values[0]
                  }))}
                  max={20000000}
                  step={1000000}
                  variant="orange"
                />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-400">Efficiency Gain</span>
                  <span className="text-orange-400 font-bold">
                    +{Math.min(10, Math.floor(efficiencyInvestment.equipment / 1_000_000))}%
                  </span>
                </div>
              </div>
            </div>

            {/* Total Investment Summary */}
            <div className="p-5 bg-gradient-to-br from-green-900/20 to-slate-800/50 rounded-lg border border-green-700/30">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-slate-400 text-sm">Total Investment</span>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(
                      efficiencyInvestment.workers +
                      efficiencyInvestment.engineers +
                      efficiencyInvestment.equipment
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-sm">Total Efficiency Gain</span>
                  <p className="text-3xl font-bold text-green-400">
                    +{Math.min(
                      30,
                      Math.floor((efficiencyInvestment.workers + efficiencyInvestment.engineers + efficiencyInvestment.equipment) / 1_000_000)
                    )}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Efficiency Breakdown */}
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Efficiency Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <EnhancedProgress
                value={Math.round((selectedFactory.efficiency || 0.7) * 100)}
                variant="default"
                size="md"
                showLabel
                showValue
                label="Base Efficiency"
                formatValue={(v) => `${v}%`}
              />
              <EnhancedProgress
                value={Math.min(10, Math.floor(efficiencyInvestment.workers / 1_000_000))}
                max={10}
                variant="info"
                size="md"
                showLabel
                showValue
                label="Worker Training Bonus"
                formatValue={(v) => `+${v}%`}
              />
              <EnhancedProgress
                value={Math.min(10, Math.floor(efficiencyInvestment.engineers / 1_000_000))}
                max={10}
                variant="purple"
                size="md"
                showLabel
                showValue
                label="Engineer Training Bonus"
                formatValue={(v) => `+${v}%`}
              />
              <EnhancedProgress
                value={Math.min(10, Math.floor(efficiencyInvestment.equipment / 1_000_000))}
                max={10}
                variant="orange"
                size="md"
                showLabel
                showValue
                label="Equipment Upgrade Bonus"
                formatValue={(v) => `+${v}%`}
              />
              <div className="border-t border-slate-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Total Efficiency</span>
                  <span className="text-3xl font-bold text-green-400">
                    {Math.min(100, 70 + Math.floor((efficiencyInvestment.workers + efficiencyInvestment.engineers + efficiencyInvestment.equipment) / 1_000_000))}%
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Maintenance Management (TabsContent value="maintenance") */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="space-y-6 mt-6"
      >
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-400" />
              Maintenance Management
            </CardTitle>
            <CardDescription className="text-slate-400">
              Schedule maintenance to prevent equipment breakdowns and extend lifespan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Maintenance Investment Slider */}
            <div className="p-5 bg-gradient-to-br from-blue-900/20 to-slate-800/50 rounded-lg border border-blue-700/30">
              <div className="flex items-center gap-3 mb-4">
                <Wrench className="w-6 h-6 text-blue-400" />
                <div>
                  <h3 className="text-white font-semibold">Preventive Maintenance Budget</h3>
                  <p className="text-slate-400 text-sm">Schedule regular maintenance to reduce breakdown risk</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 text-sm font-medium">Investment Amount</label>
                  <Input
                    type="number"
                    value={maintenanceInvestment}
                    onChange={(e) => setMaintenanceInvestment(Math.max(0, Math.min(5000000, Number(e.target.value) || 0)))}
                    className="w-32 h-8 text-right bg-slate-700 border-slate-600 text-blue-400 font-semibold"
                  />
                </div>
                <Slider
                  value={[maintenanceInvestment]}
                  onValueChange={(values) => setMaintenanceInvestment(values[0])}
                  max={5000000}
                  step={100000}
                  variant="info"
                />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-slate-400">Breakdown Risk Reduction</span>
                  <span className="text-blue-400 font-bold">
                    -{Math.min(15, Math.floor(maintenanceInvestment / 1_000_000) * 2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Maintenance Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                <div className="text-slate-400 text-sm mb-2">Current Backlog</div>
                <div className={`text-2xl font-bold ${
                  equipmentHealth.maintenanceBacklog <= 200 ? 'text-green-400' :
                  equipmentHealth.maintenanceBacklog <= 500 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {equipmentHealth.maintenanceBacklog.toFixed(0)}
                </div>
                <div className="text-xs text-slate-500 mt-1">hours</div>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                <div className="text-slate-400 text-sm mb-2">Estimated Reduction</div>
                <div className="text-2xl font-bold text-blue-400">
                  {Math.min(equipmentHealth.maintenanceBacklog, Math.floor(maintenanceInvestment / 10000))}
                </div>
                <div className="text-xs text-slate-500 mt-1">hours cleared</div>
              </div>
              <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                <div className="text-slate-400 text-sm mb-2">After Maintenance</div>
                <div className="text-2xl font-bold text-green-400">
                  {Math.max(0, equipmentHealth.maintenanceBacklog - Math.floor(maintenanceInvestment / 10000)).toFixed(0)}
                </div>
                <div className="text-xs text-slate-500 mt-1">hours remaining</div>
              </div>
            </div>

            {/* Maintenance Schedule */}
            <div className="space-y-3">
              <h4 className="text-white font-medium">Recommended Maintenance Schedule</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-slate-300">Daily Equipment Inspection</span>
                  </div>
                  <Badge className="bg-green-600">Active</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-slate-300">Weekly Cleaning & Lubrication</span>
                  </div>
                  <Badge className="bg-green-600">Active</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-yellow-400" />
                    <span className="text-slate-300">Monthly System Calibration</span>
                  </div>
                  <Badge className="bg-yellow-600">Due Soon</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    <span className="text-slate-300">Quarterly Major Service</span>
                  </div>
                  <Badge className="bg-orange-600">Overdue</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}
