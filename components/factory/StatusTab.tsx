// ============================================================
// StatusTab.tsx
// "Is my factory healthy?"
// Displays: Factory health stat cards, owned machines grouped
// by type with health/age/maintenance, and recommendations.
// ============================================================
"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Gauge,
  Wrench,
  Clock,
  Cog,
  Lightbulb,
  Flame,
} from "lucide-react";
import type { TeamState, Factory as FactoryType } from "@/engine/types";
import type { Machine } from "@/engine/machinery";

// ---- Grouped machine type ----
interface MachineGroup {
  type: string;
  name: string;
  count: number;
  totalCapacity: number;
  avgHealth: number;
  avgAge: number;
  totalMaintenanceCost: number;
  nextMaintenanceRound: number | null;
  maintenanceStatus: "on_schedule" | "due_soon" | "overdue";
  machines: Machine[];
}

// ---- Props ----
interface StatusTabProps {
  selectedFactory: FactoryType;
  state: TeamState | null;
  equipmentHealth: {
    health: number;
    breakdownRisk: number;
    maintenanceBacklog: number;
    burnoutRisk: number;
    utilization: number;
  };
}

export function StatusTab({
  selectedFactory,
  state,
  equipmentHealth,
}: StatusTabProps) {
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

      const scheduledRounds = groupMachines
        .map((m) => m.scheduledMaintenanceRound)
        .filter((r): r is number => r !== null && r !== undefined);
      const nextMaintenanceRound = scheduledRounds.length > 0 ? Math.min(...scheduledRounds) : null;

      const hasBreakdown = groupMachines.some((m) => m.status === "breakdown");
      const hasLowHealth = groupMachines.some((m) => (m.healthPercent ?? 100) < 50);
      const hasDueSoon = groupMachines.some((m) => (m.healthPercent ?? 100) < 70);

      let maintenanceStatus: "on_schedule" | "due_soon" | "overdue" = "on_schedule";
      if (hasBreakdown || hasLowHealth) maintenanceStatus = "overdue";
      else if (hasDueSoon) maintenanceStatus = "due_soon";

      groups.push({
        type,
        name: groupMachines[0].name.replace(/\s*#\d+(-\d+)?$/, ""),
        count,
        totalCapacity,
        avgHealth,
        avgAge,
        totalMaintenanceCost,
        nextMaintenanceRound,
        maintenanceStatus,
        machines: groupMachines,
      });
    }

    groups.sort((a, b) => b.totalCapacity - a.totalCapacity || b.count - a.count);
    return groups;
  }, [state, selectedFactory.id]);

  // ---- Factory Events (incident-based, not prescriptive) ----
  const factoryEvents = useMemo(() => {
    const events: Array<{ text: string; severity: "red" | "amber" | "blue" }> = [];
    // Report actual breakdowns (not risk predictions)
    for (const group of machineGroups) {
      const broken = group.machines.filter((m) => m.status === "breakdown");
      if (broken.length > 0) {
        events.push({ text: `${broken.length} ${group.name} machine${broken.length > 1 ? 's' : ''} broke down this round`, severity: "red" });
      }
      if (group.avgHealth < 40) {
        events.push({ text: `${group.name} machines showing wear (${group.count} units)`, severity: "amber" });
      }
    }
    // Report lost production from understaffing (discoverable)
    if (selectedFactory.workers < 20 && selectedFactory.productionLines?.some(l => l.status === "active")) {
      events.push({ text: `Some production lines may be understaffed`, severity: "amber" });
    }
    if (events.length === 0) {
      events.push({ text: "No incidents this round", severity: "blue" });
    }
    return events;
  }, [machineGroups, selectedFactory]);

  // Color helpers
  const healthColor = (h: number) => h >= 80 ? "text-green-400" : h >= 60 ? "text-yellow-400" : h >= 40 ? "text-orange-400" : "text-red-400";
  const statusBadge = (s: "on_schedule" | "due_soon" | "overdue") => ({
    on_schedule: { bg: "bg-green-500/20 text-green-400", dot: "bg-green-400", label: "On Schedule" },
    due_soon: { bg: "bg-amber-500/20 text-amber-400", dot: "bg-amber-400", label: "Due Soon" },
    overdue: { bg: "bg-red-500/20 text-red-400", dot: "bg-red-400", label: "Overdue" },
  }[s]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* ================================================================
          SECTION 1: Factory Health -- 4 stat cards
          ================================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Efficiency"
          value={`${(selectedFactory.efficiency * 100).toFixed(0)}%`}
          icon={<Activity className="w-5 h-5" />}
          variant={selectedFactory.efficiency >= 0.8 ? "success" : selectedFactory.efficiency >= 0.6 ? "warning" : "danger"}
        />
        <StatCard
          label="Defect Rate"
          value={`${(selectedFactory.defectRate * 100).toFixed(1)}%`}
          icon={<Gauge className="w-5 h-5" />}
          variant={selectedFactory.defectRate <= 0.03 ? "success" : selectedFactory.defectRate <= 0.06 ? "warning" : "danger"}
        />
        <StatCard
          label="Workers"
          value={`${selectedFactory.workers}`}
          icon={<Cog className="w-5 h-5" />}
          variant="info"
        />
        <StatCard
          label="CO2 Emissions"
          value={`${selectedFactory.co2Emissions} t`}
          icon={<Flame className="w-5 h-5" />}
          variant={selectedFactory.co2Emissions <= 300 ? "success" : selectedFactory.co2Emissions <= 700 ? "warning" : "danger"}
        />
      </div>

      {/* ================================================================
          SECTION 2: Machines -- grouped by type
          ================================================================ */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Cog className="w-5 h-5 text-purple-400" />
            Machines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {machineGroups.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Cog className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No machines owned yet</p>
              <p className="text-sm mt-1">Purchase machines in the Capacity tab</p>
            </div>
          ) : (
            <div className="space-y-2">
              {machineGroups.map((group) => {
                const sb = statusBadge(group.maintenanceStatus);
                return (
                  <div key={group.type} className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                      {/* Count x Name */}
                      <div className="flex items-center gap-2 min-w-[180px]">
                        <span className="text-white font-bold">{group.count}&times;</span>
                        <span className="text-white font-medium">{group.name}</span>
                        {group.totalCapacity > 0 && (
                          <span className="text-blue-400 text-xs">{formatNumber(group.totalCapacity)} total</span>
                        )}
                      </div>

                      {/* Health */}
                      <div className="text-xs text-slate-400">
                        Health:{" "}
                        <span className={`font-semibold ${healthColor(group.avgHealth)}`}>{group.avgHealth}%</span>
                      </div>

                      {/* Age */}
                      <div className="text-xs text-slate-400">
                        Age: <span className="text-white font-medium">{group.avgAge} round{group.avgAge !== 1 ? "s" : ""}</span>
                      </div>

                      {/* Maintenance cost */}
                      <div className="text-xs text-slate-400">
                        <Wrench className="w-3 h-3 inline mr-0.5" />
                        {formatCurrency(group.totalMaintenanceCost)}/round
                      </div>

                      {/* Next service */}
                      {group.nextMaintenanceRound !== null && (
                        <div className="text-xs text-slate-400">
                          <Clock className="w-3 h-3 inline mr-0.5" />
                          Next service: Round {group.nextMaintenanceRound}
                        </div>
                      )}

                      {/* Status badge */}
                      <Badge className={`text-xs ${sb.bg}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${sb.dot}`} />
                        {sb.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          SECTION 3: Factory Events (incident-based, not prescriptive)
          ================================================================ */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Factory Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {factoryEvents.map((event, i) => {
              const dotColor = event.severity === "red" ? "bg-red-400" : event.severity === "amber" ? "bg-amber-400" : "bg-blue-400";
              const textColor = event.severity === "red" ? "text-red-300" : event.severity === "amber" ? "text-amber-200" : "text-blue-200";
              return (
                <div key={i} className="flex items-start gap-3 p-3 bg-slate-700/50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${dotColor}`} />
                  <p className={`text-sm ${textColor}`}>{event.text}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
