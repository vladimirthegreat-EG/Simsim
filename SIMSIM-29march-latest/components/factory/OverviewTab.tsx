// ============================================================
// OverviewTab.tsx
// Merged Overview + Equipment tabs.
// Displays: stat cards (health, efficiency, utilization, breakdown risk),
// inventory status, workforce summary, production metrics,
// installed upgrades, equipment health dashboard, equipment status,
// and recommendations.
// ============================================================
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import {
  Factory,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Boxes,
  Activity,
  Gauge,
  Users,
  Cog,
  BarChart3,
  Zap,
} from "lucide-react";
import type { TeamState, Factory as FactoryType, Segment } from "@/engine/types";
import { useFeatureFlag } from "@/lib/contexts/ComplexityContext";

interface OverviewTabProps {
  selectedFactory: FactoryType;
  equipmentHealth: {
    health: number;
    breakdownRisk: number;
    maintenanceBacklog: number;
    burnoutRisk: number;
    utilization: number;
  };
  state: TeamState | null;
  currentRound: number;
  activeSegments: Set<string>;
  isUpgradePurchased: (upgradeId: string) => { installed: boolean; pending: boolean };
  getHealthColor: (health: number) => string;
  getRiskColor: (risk: number) => string;
  totalCapacity: number;
  inventoryTotals: { finishedGoods: number; rawMaterials: number; workInProgress: number };
  upgrades: Array<{
    id: string;
    name: string;
    cost: number;
    description: string;
    benefits: string[];
    category: string;
    icon: React.ElementType;
    tier: number;
    rdRequired: string | null;
  }>;
}

export function OverviewTab({
  selectedFactory,
  equipmentHealth,
  state,
  currentRound,
  activeSegments,
  isUpgradePurchased,
  getHealthColor,
  getRiskColor,
  totalCapacity,
  inventoryTotals,
  upgrades,
}: OverviewTabProps) {
  const hasInventoryManagement = useFeatureFlag("inventoryManagement");

  // HR warning: check if any active line is understaffed
  // BASE_WORKER_OUTPUT = 5000, so requiredWorkers = ceil(machineCapacity / (5000 * 0.8))
  const hrWarnings = useMemo(() => {
    const warnings: string[] = [];
    for (const line of selectedFactory.productionLines ?? []) {
      if (line.status !== "active" || !line.productId) continue;
      const machCap = line.targetOutput ?? 0; // Approximate — real calc uses getLineMachineCapacity
      const needed = Math.ceil(machCap / (5000 * 0.8));
      if ((line.assignedWorkers ?? 0) < needed && needed > 0) {
        warnings.push(`Line "${line.segment ?? line.id}": ${line.assignedWorkers ?? 0}/${needed} workers assigned`);
      }
    }
    return warnings;
  }, [selectedFactory.productionLines]);

  return (
    <>
      {/* Overview content inside TabsContent */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* HR Warning Banner */}
        {hrWarnings.length > 0 && (
          <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Understaffed Production Lines</p>
                {hrWarnings.map((w, i) => (
                  <p key={i} className="text-slate-400 text-sm mt-1">{w}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Equipment Health"
            value={`${equipmentHealth.health.toFixed(0)}%`}
            icon={<Activity className="w-5 h-5" />}
            variant={equipmentHealth.health >= 80 ? "success" : equipmentHealth.health >= 60 ? "warning" : "danger"}
          />
          <StatCard
            label="Efficiency"
            value={`${((selectedFactory.efficiency || 0.7) * 100).toFixed(0)}%`}
            icon={<Zap className="w-5 h-5" />}
            variant="success"
          />
          <StatCard
            label="Utilization"
            value={`${(equipmentHealth.utilization * 100).toFixed(0)}%`}
            icon={<Gauge className="w-5 h-5" />}
            variant="info"
          />
          <StatCard
            label="Breakdown Risk"
            value={`${equipmentHealth.breakdownRisk.toFixed(1)}%`}
            icon={<AlertTriangle className="w-5 h-5" />}
            variant={equipmentHealth.breakdownRisk <= 10 ? "success" : equipmentHealth.breakdownRisk <= 20 ? "warning" : "danger"}
          />
        </div>

        {/* Inventory Card - Only shown when feature is enabled */}
        {hasInventoryManagement && (
          <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Boxes className="w-5 h-5" />
                Inventory Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <div className="text-slate-400 text-sm mb-1">Raw Materials</div>
                  <div className="text-xl font-bold text-white">
                    {formatCurrency(inventoryTotals.rawMaterials)}
                  </div>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <div className="text-slate-400 text-sm mb-1">Work in Progress</div>
                  <div className="text-xl font-bold text-white">
                    {formatCurrency(inventoryTotals.workInProgress)}
                  </div>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <div className="text-slate-400 text-sm mb-1">Finished Goods</div>
                  <div className="text-xl font-bold text-green-400">
                    {inventoryTotals.finishedGoods.toLocaleString()} units
                  </div>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <div className="text-slate-400 text-sm mb-1">COGS (This Round)</div>
                  <div className="text-xl font-bold text-orange-400">
                    {formatCurrency(state?.cogs || 0)}
                  </div>
                </div>
              </div>
              {state?.inventory?.finishedGoods && Object.keys(state.inventory.finishedGoods).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-sm mb-3">Finished Goods by Segment</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {(Object.entries(state.inventory.finishedGoods) as [Segment, number][]).map(([segment, units]) => (
                      <div key={segment} className="p-2 bg-slate-700/30 rounded text-center">
                        <div className="text-xs text-slate-400">{segment}</div>
                        <div className="text-sm font-medium text-white">{units.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Factory Details */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Workforce
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Region</span>
                <Badge className="bg-blue-600">{selectedFactory.region}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Workers</span>
                <span className="text-white font-medium">{selectedFactory.workers || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Engineers</span>
                <span className="text-white font-medium">{selectedFactory.engineers || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Supervisors</span>
                <span className="text-white font-medium">{selectedFactory.supervisors || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Total Headcount</span>
                <span className="text-blue-400 font-bold">
                  {(selectedFactory.workers || 0) + (selectedFactory.engineers || 0) + (selectedFactory.supervisors || 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Cog className="w-5 h-5 text-orange-400" />
                Production Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Capacity</span>
                <span className="text-white font-medium">{totalCapacity.toLocaleString()} units</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Material Level</span>
                <Badge className={`${
                  (selectedFactory.materialLevel || 1) >= 4 ? 'bg-purple-600' :
                  (selectedFactory.materialLevel || 1) >= 2 ? 'bg-blue-600' : 'bg-slate-600'
                }`}>
                  Level {selectedFactory.materialLevel || 1}
                </Badge>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">Defect Rate</span>
                <span className={`font-medium ${
                  (selectedFactory.defectRate || 0.05) <= 0.02 ? 'text-green-400' :
                  (selectedFactory.defectRate || 0.05) <= 0.05 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {((selectedFactory.defectRate || 0.05) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                <span className="text-slate-300">CO2 Emissions</span>
                <span className="text-yellow-400 font-medium">{selectedFactory.co2Emissions || 500} tons</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Installed Upgrades Summary */}
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              Installed Upgrades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upgrades.filter(u => (selectedFactory.upgrades || []).includes(u.id as any)).length > 0 ? (
              <div className="grid md:grid-cols-3 gap-3">
                {upgrades.filter(u => (selectedFactory.upgrades || []).includes(u.id as any)).map((upgrade) => (
                  <div
                    key={upgrade.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-green-900/30 border border-green-700"
                  >
                    <upgrade.icon className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">{upgrade.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upgrades installed yet</p>
                <p className="text-sm mt-2">Visit the Upgrades tab to purchase improvements</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Equipment section — merged into Overview */}
      <div className="space-y-6 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Equipment Health Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-400">Equipment Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-4xl font-bold ${getHealthColor(equipmentHealth.health)}`}>
                    {equipmentHealth.health.toFixed(0)}%
                  </span>
                  <Activity className={`w-8 h-8 ${getHealthColor(equipmentHealth.health)}`} />
                </div>
                <EnhancedProgress
                  value={equipmentHealth.health}
                  variant={equipmentHealth.health >= 80 ? "success" : equipmentHealth.health >= 60 ? "warning" : "danger"}
                  size="md"
                />
                <p className="text-slate-400 text-xs mt-2">
                  {equipmentHealth.health >= 80 && "Excellent condition"}
                  {equipmentHealth.health >= 60 && equipmentHealth.health < 80 && "Good condition"}
                  {equipmentHealth.health >= 40 && equipmentHealth.health < 60 && "Needs attention"}
                  {equipmentHealth.health < 40 && "Critical condition"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-400">Breakdown Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-4xl font-bold ${getRiskColor(equipmentHealth.breakdownRisk)}`}>
                    {equipmentHealth.breakdownRisk.toFixed(1)}%
                  </span>
                  <AlertTriangle className={`w-8 h-8 ${getRiskColor(equipmentHealth.breakdownRisk)}`} />
                </div>
                <EnhancedProgress
                  value={equipmentHealth.breakdownRisk}
                  max={50}
                  variant={equipmentHealth.breakdownRisk <= 10 ? "success" : equipmentHealth.breakdownRisk <= 20 ? "warning" : "danger"}
                  size="md"
                />
                <p className="text-slate-400 text-xs mt-2">
                  {equipmentHealth.breakdownRisk <= 10 && "Low risk"}
                  {equipmentHealth.breakdownRisk > 10 && equipmentHealth.breakdownRisk <= 20 && "Moderate risk"}
                  {equipmentHealth.breakdownRisk > 20 && equipmentHealth.breakdownRisk <= 35 && "High risk"}
                  {equipmentHealth.breakdownRisk > 35 && "Critical risk"}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-400">Capacity Utilization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-4xl font-bold ${
                    equipmentHealth.utilization > 0.95 ? 'text-red-400' :
                    equipmentHealth.utilization > 0.85 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {(equipmentHealth.utilization * 100).toFixed(0)}%
                  </span>
                  <Gauge className={`w-8 h-8 ${
                    equipmentHealth.utilization > 0.95 ? 'text-red-400' :
                    equipmentHealth.utilization > 0.85 ? 'text-yellow-400' : 'text-green-400'
                  }`} />
                </div>
                <EnhancedProgress
                  value={equipmentHealth.utilization * 100}
                  variant={equipmentHealth.utilization > 0.95 ? "danger" : equipmentHealth.utilization > 0.85 ? "warning" : "success"}
                  size="md"
                />
                <p className="text-slate-400 text-xs mt-2">
                  {equipmentHealth.utilization > 0.95 && "Overworked - burnout risk!"}
                  {equipmentHealth.utilization > 0.85 && equipmentHealth.utilization <= 0.95 && "High utilization"}
                  {equipmentHealth.utilization <= 0.85 && "Healthy utilization"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Equipment Issues */}
          <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-400" />
                Equipment Status
                <HelpTooltip text="Each machine adds production capacity. Assembly Lines are versatile, CNC Machines excel at precision. Workers needed: ~2.5 per machine." />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Burnout Risk Alert */}
              {equipmentHealth.burnoutRisk > 0.5 && (
                <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-400 font-medium">High Burnout Risk</p>
                      <p className="text-slate-400 text-sm mt-1">
                        Equipment is operating above recommended utilization. Risk of catastrophic failure: {(equipmentHealth.burnoutRisk * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Maintenance Backlog Alert */}
              {equipmentHealth.maintenanceBacklog > 500 && (
                <div className="p-4 bg-orange-900/20 border border-orange-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-orange-400 font-medium">Maintenance Backlog</p>
                      <p className="text-slate-400 text-sm mt-1">
                        {equipmentHealth.maintenanceBacklog} hours of deferred maintenance. Schedule maintenance soon to prevent breakdowns.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Good Status */}
              {equipmentHealth.burnoutRisk <= 0.5 && equipmentHealth.maintenanceBacklog <= 500 && (
                <div className="p-4 bg-green-900/20 border border-green-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-green-400 font-medium">Equipment in Good Condition</p>
                      <p className="text-slate-400 text-sm mt-1">
                        All equipment is operating within normal parameters. Continue regular maintenance schedule.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Detailed Metrics */}
              <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-slate-700">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-300">Burnout Risk Level</span>
                    <span className={`font-medium ${
                      equipmentHealth.burnoutRisk <= 0.3 ? 'text-green-400' :
                      equipmentHealth.burnoutRisk <= 0.6 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {(equipmentHealth.burnoutRisk * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-300">Maintenance Backlog</span>
                    <span className={`font-medium ${
                      equipmentHealth.maintenanceBacklog <= 200 ? 'text-green-400' :
                      equipmentHealth.maintenanceBacklog <= 500 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {equipmentHealth.maintenanceBacklog.toFixed(0)} hours
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-300">Equipment Age</span>
                    <span className="text-white font-medium">
                      {Math.floor(((state?.round || 1) * 3) / 12)} years
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                    <span className="text-slate-300">Last Major Service</span>
                    <span className="text-white font-medium">
                      {Math.max(1, (state?.round || 1) - 2)} rounds ago
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Equipment Recommendations */}
          <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {equipmentHealth.health < 60 && (
                  <div className="p-3 bg-slate-700/50 rounded-lg flex items-start gap-3">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Schedule Emergency Maintenance</p>
                      <p className="text-slate-400 text-sm">Equipment health is below 60%. Immediate maintenance required.</p>
                    </div>
                  </div>
                )}
                {equipmentHealth.utilization > 0.95 && (
                  <div className="p-3 bg-slate-700/50 rounded-lg flex items-start gap-3">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Reduce Production Load</p>
                      <p className="text-slate-400 text-sm">Utilization above 95% increases breakdown risk and reduces equipment lifespan.</p>
                    </div>
                  </div>
                )}
                {!isUpgradePurchased("predictiveMaintenance").installed && (
                  <div className="p-3 bg-slate-700/50 rounded-lg flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Consider Predictive Maintenance Upgrade</p>
                      <p className="text-slate-400 text-sm">Reduces breakdown risk by 70% and extends equipment lifespan by 30%.</p>
                    </div>
                  </div>
                )}
                {equipmentHealth.health >= 80 && equipmentHealth.utilization <= 0.85 && (
                  <div className="p-3 bg-slate-700/50 rounded-lg flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Equipment Operating Optimally</p>
                      <p className="text-slate-400 text-sm">Continue current maintenance schedule and operational practices.</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
}
