"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import {
  Users,
  DollarSign,
  Heart,
  UserMinus,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  Clock,
  Award,
  Zap,
  Gift,
  GraduationCap,
} from "lucide-react";
import type { TeamState, CompanyBenefits } from "@/engine/types";
import type { HiringRequirement } from "@/lib/hooks/calculateHiringRequirements";

interface OverviewTabProps {
  workforceBreakdown: { workers: number; engineers: number; supervisors: number; total: number };
  laborCost: number;
  avgMorale: number;
  turnoverRate: number;
  avgEfficiency: number;
  totalHeadcount: number;
  state: TeamState | null;
  hasBenefitsSystem: boolean;
  currentBenefits: CompanyBenefits;
  trainingProgramCount: number;
  hiringRequirements?: HiringRequirement[];
}

export function OverviewTab({
  workforceBreakdown,
  laborCost,
  avgMorale,
  turnoverRate,
  avgEfficiency,
  totalHeadcount,
  state,
  hasBenefitsSystem,
  currentBenefits,
  trainingProgramCount,
  hiringRequirements,
}: OverviewTabProps) {
  // FIX #15: Build dynamic staffing lookup from requirements
  const getRequirement = (role: "worker" | "engineer" | "supervisor") =>
    hiringRequirements?.find(r => r.role === role);
  const workerReq = getRequirement("worker");
  const engineerReq = getRequirement("engineer");
  const supervisorReq = getRequirement("supervisor");
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Employees"
          value={totalHeadcount}
          icon={<Users className="w-5 h-5" />}
          variant="info"
        />
        <StatCard
          label="Monthly Labor Cost"
          value={formatCurrency(laborCost / 12)}
          icon={<DollarSign className="w-5 h-5" />}
          variant="success"
        />
        <StatCard
          label="Avg Morale"
          value={`${avgMorale.toFixed(0)}%`}
          icon={<Heart className="w-5 h-5" />}
          variant="purple"
        />
        <StatCard
          label="Turnover Rate"
          value={`${(turnoverRate * 100).toFixed(0)}%`}
          icon={<UserMinus className="w-5 h-5" />}
          variant="warning"
        />
      </div>

      {/* FIX #12: HR Investment Impact Dashboard */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-white text-sm flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            This Round At A Glance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-slate-400 text-xs mb-1">HR Spend</div>
              <div className="text-white font-bold">{formatCurrency(laborCost / 12 + (currentBenefits.totalAnnualCost / 12))}</div>
              <div className="text-slate-500 text-xs">salaries + benefits</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-slate-400 text-xs mb-1">Workforce Output</div>
              <div className="text-white font-bold">{(avgEfficiency * totalHeadcount / 100 * 20).toFixed(0)} units</div>
              <div className="text-slate-500 text-xs">est. capacity contribution</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-slate-400 text-xs mb-1">Est. Departures</div>
              <div className={`font-bold ${turnoverRate > 0.15 ? 'text-red-400' : turnoverRate > 0.08 ? 'text-yellow-400' : 'text-green-400'}`}>
                ~{Math.round(totalHeadcount * turnoverRate / 4)} this round
              </div>
              <div className="text-slate-500 text-xs">{(turnoverRate * 100).toFixed(0)}% annual rate</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="text-slate-400 text-xs mb-1">Morale Trend</div>
              <div className={`font-bold ${avgMorale >= 70 ? 'text-green-400' : avgMorale >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {avgMorale.toFixed(0)} / 100
              </div>
              <div className="text-slate-500 text-xs">
                {avgMorale >= 70 ? 'healthy' : avgMorale >= 55 ? 'needs attention' : 'critical \u2014 burnout rising'}
              </div>
            </div>
          </div>
          {/* Per-lever impact */}
          {hasBenefitsSystem && currentBenefits.moraleImpact > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-3 gap-3 text-xs">
              <div className="text-slate-400">
                <span className="text-blue-400 font-medium">Benefits:</span> +{(currentBenefits.moraleImpact * 100).toFixed(0)}% morale, -{(currentBenefits.turnoverReduction * 100).toFixed(0)}% turnover
              </div>
              <div className="text-slate-400">
                <span className="text-green-400 font-medium">Benefits cost:</span> {formatCurrency(currentBenefits.totalAnnualCost / 12)}/mo
              </div>
              <div className="text-slate-400">
                <span className="text-purple-400 font-medium">ESG:</span> +{currentBenefits.esgContribution} points
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workforce Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              Workforce Composition
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <EnhancedProgress
                value={(workforceBreakdown.workers / Math.max(workforceBreakdown.total, 1)) * 100}
                variant="info"
                size="md"
                showLabel
                showValue
                label="Workers"
                formatValue={() => `${workforceBreakdown.workers}`}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-purple-400 flex-shrink-0" />
              <EnhancedProgress
                value={(workforceBreakdown.engineers / Math.max(workforceBreakdown.total, 1)) * 100}
                variant="purple"
                size="md"
                showLabel
                showValue
                label="Engineers"
                formatValue={() => `${workforceBreakdown.engineers}`}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-3">
              <Award className="w-5 h-5 text-green-400 flex-shrink-0" />
              <EnhancedProgress
                value={(workforceBreakdown.supervisors / Math.max(workforceBreakdown.total, 1)) * 100}
                variant="success"
                size="md"
                showLabel
                showValue
                label="Supervisors"
                formatValue={() => `${workforceBreakdown.supervisors}`}
                className="flex-1"
              />
            </div>
            <div className="pt-3 border-t border-slate-700">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <EnhancedProgress
                  value={avgEfficiency}
                  variant="warning"
                  size="md"
                  showLabel
                  showValue
                  label="Avg Efficiency"
                  formatValue={(v) => `${v.toFixed(0)}%`}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">HR Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {avgMorale < 60 && (
              <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-400 font-medium text-sm">Low Morale</p>
                  <p className="text-slate-400 text-xs">Employee morale is critically low. Consider salary increases or benefits.</p>
                </div>
              </div>
            )}
            {workforceBreakdown.engineers < 10 && (
              <div className="p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-yellow-400 font-medium text-sm">Understaffed</p>
                  <p className="text-slate-400 text-xs">Consider hiring more engineers for optimal efficiency</p>
                </div>
              </div>
            )}
            {avgMorale >= 60 && (
              <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-400 font-medium text-sm">Morale Stable</p>
                  <p className="text-slate-400 text-xs">Employee satisfaction is within healthy range</p>
                </div>
              </div>
            )}
            {hasBenefitsSystem && currentBenefits.moraleImpact > 5 && (
              <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg flex items-start gap-3">
                <Gift className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-400 font-medium text-sm">Benefits Boost</p>
                  <p className="text-slate-400 text-xs">Your benefits package is providing +{currentBenefits.moraleImpact.toFixed(0)}% morale</p>
                </div>
              </div>
            )}
            <div className="p-3 bg-slate-700/50 rounded-lg flex items-start gap-3">
              <Clock className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-300 font-medium text-sm">Training Available</p>
                <p className="text-slate-400 text-xs">{trainingProgramCount} training programs ready to deploy</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staffing Requirements */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Staffing Overview</CardTitle>
          <CardDescription className="text-slate-400">
            Current staffing levels across your factories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* FIX #15: Dynamic staffing thresholds from calculateHiringRequirements */}
          <div className="grid md:grid-cols-3 gap-4">
            {([
              { label: "Workers", count: workforceBreakdown.workers, req: workerReq },
              { label: "Engineers", count: workforceBreakdown.engineers, req: engineerReq },
              { label: "Supervisors", count: workforceBreakdown.supervisors, req: supervisorReq },
            ] as const).map(({ label, count, req }) => (
              <div key={label} className="p-4 bg-slate-700/50 rounded-lg text-center">
                <div className="text-slate-400 text-sm mb-1">{label}</div>
                <div className="text-2xl font-bold text-white">{count}</div>
                {req ? (
                  <div className={`text-sm ${req.shortfall === 0 ? 'text-green-400' : req.urgency === 'critical' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {req.shortfall === 0
                      ? `Adequate (${count}/${req.requiredCount})`
                      : `Need ${req.shortfall} more (${count}/${req.requiredCount})`}
                  </div>
                ) : (
                  <div className="text-sm text-green-400">Adequate</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
