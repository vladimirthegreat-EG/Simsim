"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Slider } from "@/components/ui/slider";
import {
  GraduationCap,
  Heart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Briefcase,
  Award,
  ShieldCheck,
  Baby,
  Home,
  Gift,
  Brain,
  Coffee,
} from "lucide-react";
import type { TeamState, BenefitsPackage, CompanyBenefits } from "@/engine/types";

// Costs match CONSTANTS.TRAINING_COSTS in engine (per role, not per person)
const trainingPrograms = [
  {
    id: "basic-skills",
    name: "Basic Skills Training",
    cost: 50_000,
    duration: "1 round",
    effect: "+5% efficiency",
    targetType: ["worker"],
  },
  {
    id: "advanced-tech",
    name: "Advanced Technical Training",
    cost: 75_000,
    duration: "1 round",
    effect: "+8% efficiency, +5% accuracy",
    targetType: ["engineer"],
  },
  {
    id: "leadership",
    name: "Leadership Development",
    cost: 100_000,
    duration: "2 rounds",
    effect: "+10% team productivity",
    targetType: ["supervisor"],
  },
  {
    id: "safety",
    name: "Safety & Wellness",
    cost: 50_000,
    duration: "1 round",
    effect: "+5% health, -2% turnover",
    targetType: ["worker", "engineer", "supervisor"],
  },
];

// Default benefits for when no state is loaded yet
const defaultBenefits: CompanyBenefits = {
  package: {
    healthInsurance: 50,
    retirementMatch: 3,
    paidTimeOff: 15,
    parentalLeave: 4,
    stockOptions: false,
    flexibleWork: false,
    professionalDevelopment: 500,
  },
  totalAnnualCost: 0,
  moraleImpact: 0,
  turnoverReduction: 0,
  esgContribution: 0,
};

interface DevelopTabProps {
  enrolledTraining: Array<{ role: string; programType: string }>;
  setEnrolledTraining: React.Dispatch<React.SetStateAction<Array<{ role: string; programType: string }>>>;
  salaryAdjustment: number;
  setSalaryAdjustment: (value: number) => void;
  benefitChanges: Partial<BenefitsPackage>;
  setBenefitChanges: React.Dispatch<React.SetStateAction<Partial<BenefitsPackage>>>;
  workforceBreakdown: { workers: number; engineers: number; supervisors: number; total: number };
  turnoverRate: number;
  laborCost: number;
  state: TeamState | null;
  hasBenefitsSystem: boolean;
  hasTrainingFatigue: boolean;
}

export { trainingPrograms };

export function DevelopTab({
  enrolledTraining,
  setEnrolledTraining,
  salaryAdjustment,
  setSalaryAdjustment,
  benefitChanges,
  setBenefitChanges,
  workforceBreakdown,
  turnoverRate,
  laborCost,
  state,
  hasBenefitsSystem,
  hasTrainingFatigue,
}: DevelopTabProps) {
  const currentBenefits = state?.benefits || defaultBenefits;

  return (
    <div className="space-y-6">
      {/* Training Fatigue Warning - Only shown when feature is enabled */}
      {hasTrainingFatigue && (
        <Card className="bg-orange-900/20 border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Coffee className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-orange-400 font-medium text-sm">Training Fatigue Active</p>
                <p className="text-slate-300 text-xs mt-1">
                  Employees who receive multiple training programs in a year show diminishing returns.
                  Each additional program provides 20% less benefit. Consider spreading training across rounds.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Training Programs
          </CardTitle>
          <CardDescription className="text-slate-400">
            Invest in employee development to improve performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {trainingPrograms.map((program) => (
              <Card key={program.id} className="bg-slate-700 border-slate-600">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-white font-medium">{program.name}</h3>
                      <div className="flex gap-1 mt-1">
                        {program.targetType.map((type) => (
                          <Badge key={type} variant="outline" className="text-xs border-slate-500">
                            {type}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <span className="text-green-400 font-medium">{formatCurrency(program.cost)}/person</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration</span>
                      <span className="text-white">{program.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Effect</span>
                      <span className="text-green-400">{program.effect}</span>
                    </div>
                  </div>
                  {enrolledTraining.some(t => t.programType === program.id) ? (
                    <Button
                      size="sm"
                      className="w-full mt-4 bg-green-600 hover:bg-green-700"
                      onClick={() => setEnrolledTraining(prev => prev.filter(t => t.programType !== program.id))}
                    >
                      Enrolled - Click to Cancel
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        const newEnrollments = program.targetType.map(role => ({
                          role,
                          programType: program.id,
                        }));
                        setEnrolledTraining(prev => [...prev, ...newEnrollments]);
                      }}
                    >
                      Enroll Employees
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {enrolledTraining.length > 0 && (
            <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-400 text-sm font-medium mb-2">Pending Training Enrollments:</p>
              <div className="space-y-1">
                {enrolledTraining.map((training, idx) => {
                  const program = trainingPrograms.find(p => p.id === training.programType);
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-300 capitalize">{training.role}s - {program?.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Status by Role - shows current fatigue levels */}
      {hasTrainingFatigue && state?.employees && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Coffee className="w-5 h-5" />
              Training Fatigue by Role
            </CardTitle>
            <CardDescription className="text-slate-400">
              Average training programs completed this year per role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {(['worker', 'engineer', 'supervisor'] as const).map((role) => {
                const employees = state.employees?.filter(e => e.role === role) || [];
                const avgPrograms = employees.length > 0
                  ? employees.reduce((sum, e) => sum + (e.trainingHistory?.programsThisYear || 0), 0) / employees.length
                  : 0;
                const fatigueLevel = avgPrograms >= 3 ? 'high' : avgPrograms >= 2 ? 'medium' : 'low';

                return (
                  <div key={role} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-300 capitalize">{role}s</span>
                      <Badge className={
                        fatigueLevel === 'high' ? 'bg-red-600/20 text-red-400' :
                        fatigueLevel === 'medium' ? 'bg-yellow-600/20 text-yellow-400' :
                        'bg-green-600/20 text-green-400'
                      }>
                        {fatigueLevel === 'high' ? 'Fatigued' : fatigueLevel === 'medium' ? 'Moderate' : 'Fresh'}
                      </Badge>
                    </div>
                    <div className="text-2xl font-bold text-white">{avgPrograms.toFixed(1)}</div>
                    <div className="text-xs text-slate-400">avg programs this year</div>
                    <EnhancedProgress
                      value={Math.min(100, (avgPrograms / 4) * 100)}
                      variant={fatigueLevel === 'high' ? 'danger' : fatigueLevel === 'medium' ? 'warning' : 'success'}
                      size="sm"
                      className="mt-2"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Training */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Active Training Programs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-400">
            <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No active training programs</p>
            <p className="text-sm">Enroll employees in training to improve their skills</p>
          </div>
        </CardContent>
      </Card>

      {/* Compensation — Salary Adjustment */}
      <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            Salary Adjustment
            <HelpTooltip text="Higher salaries improve morale and reduce turnover. Lower turnover means less recruitment costs and better productivity over time." />
          </CardTitle>
          <CardDescription className="text-slate-400">
            Adjust company-wide salaries to affect morale and turnover
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-slate-700/30 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-medium">Salary Adjustment</span>
              <span className={`text-xl font-semibold ${
                salaryAdjustment > 0 ? 'text-green-400' : salaryAdjustment < 0 ? 'text-red-400' : 'text-white'
              }`}>
                {salaryAdjustment > 0 ? '+' : ''}{salaryAdjustment}%
              </span>
            </div>
            <Slider
              data-testid="slider-salary-adjustment"
              value={[salaryAdjustment + 20]}
              onValueChange={(values) => setSalaryAdjustment(values[0] - 20)}
              max={40}
              step={1}
              variant={salaryAdjustment > 0 ? 'success' : salaryAdjustment < 0 ? 'danger' : 'default'}
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>-20% (Lower costs, higher turnover)</span>
              <span>+20% (Higher costs, lower turnover)</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <div className="text-slate-400 text-sm mb-1">Current Monthly Cost</div>
              <div className="text-xl font-bold text-white">
                {formatCurrency(laborCost / 12)}
              </div>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <div className="text-slate-400 text-sm mb-1">Projected Monthly Cost</div>
              <div className="text-xl font-bold text-white">
                {formatCurrency((laborCost / 12) * (1 + salaryAdjustment / 100))}
              </div>
            </div>
            <div className="p-4 bg-slate-700/50 rounded-lg">
              <div className="text-slate-400 text-sm mb-1">Projected Turnover</div>
              <div className={`text-xl font-bold ${
                salaryAdjustment > 0 ? 'text-green-400' : salaryAdjustment < 0 ? 'text-red-400' : 'text-white'
              }`}>
                {Math.max(2, Math.min(25, (turnoverRate * 100) - salaryAdjustment * 0.3)).toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">
                Salary changes affect morale for 2-3 rounds. Frequent changes reduce employee trust.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Salary Breakdown */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Salary Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">Workers ({workforceBreakdown.workers})</span>
              </div>
              <div className="text-right">
                <span className="text-white">$45,000 avg/year</span>
                <span className="text-slate-400 text-sm ml-2">
                  ({formatCurrency(45000 * workforceBreakdown.workers)}/year total)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">Engineers ({workforceBreakdown.engineers})</span>
              </div>
              <div className="text-right">
                <span className="text-white">$95,000 avg/year</span>
                <span className="text-slate-400 text-sm ml-2">
                  ({formatCurrency(95000 * workforceBreakdown.engineers)}/year total)
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300">Supervisors ({workforceBreakdown.supervisors})</span>
              </div>
              <div className="text-right">
                <span className="text-white">$120,000 avg/year</span>
                <span className="text-slate-400 text-sm ml-2">
                  ({formatCurrency(120000 * workforceBreakdown.supervisors)}/year total)
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits — only shown when feature enabled */}
      {hasBenefitsSystem && (
        <>
          {/* Benefits Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Annual Cost"
              value={formatCurrency(currentBenefits.totalAnnualCost)}
              icon={<DollarSign className="w-5 h-5" />}
              variant="success"
            />
            <StatCard
              label="Morale Boost"
              value={`+${currentBenefits.moraleImpact.toFixed(0)}%`}
              icon={<Heart className="w-5 h-5" />}
              variant="purple"
            />
            <StatCard
              label="Turnover Reduction"
              value={`-${currentBenefits.turnoverReduction.toFixed(0)}%`}
              icon={<TrendingDown className="w-5 h-5" />}
              variant="info"
            />
            <StatCard
              label="ESG Contribution"
              value={`+${currentBenefits.esgContribution}`}
              icon={<Award className="w-5 h-5" />}
              variant="success"
            />
          </div>

          {/* Benefits Package Configuration */}
          <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-blue-400" />
                Benefits Package
              </CardTitle>
              <CardDescription className="text-slate-400">
                Configure employee benefits to improve retention and morale
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Health Insurance */}
              <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-slate-200">Health Insurance Coverage</Label>
                    <p className="text-slate-400 text-xs">Higher coverage increases costs but improves morale</p>
                  </div>
                  <span className="text-blue-400 font-semibold">
                    {benefitChanges.healthInsurance ?? currentBenefits.package.healthInsurance}%
                  </span>
                </div>
                <Slider
                  value={[benefitChanges.healthInsurance ?? currentBenefits.package.healthInsurance]}
                  onValueChange={(values) => setBenefitChanges(prev => ({ ...prev, healthInsurance: values[0] }))}
                  max={100}
                  step={10}
                  variant="info"
                />
              </div>

              {/* Retirement Match */}
              <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-slate-200">Retirement Match</Label>
                    <p className="text-slate-400 text-xs">Percentage of salary matched for retirement</p>
                  </div>
                  <span className="text-green-400 font-semibold">
                    {benefitChanges.retirementMatch ?? currentBenefits.package.retirementMatch}%
                  </span>
                </div>
                <Slider
                  value={[benefitChanges.retirementMatch ?? currentBenefits.package.retirementMatch]}
                  onValueChange={(values) => setBenefitChanges(prev => ({ ...prev, retirementMatch: values[0] }))}
                  max={10}
                  step={1}
                  variant="success"
                />
              </div>

              {/* PTO & Parental Leave */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <div className="flex-1">
                      <Label className="text-slate-200">Paid Time Off</Label>
                      <p className="text-slate-400 text-xs">Days per year</p>
                    </div>
                    <span className="text-blue-400 font-semibold">
                      {benefitChanges.paidTimeOff ?? currentBenefits.package.paidTimeOff} days
                    </span>
                  </div>
                  <Slider
                    value={[benefitChanges.paidTimeOff ?? currentBenefits.package.paidTimeOff]}
                    onValueChange={(values) => setBenefitChanges(prev => ({ ...prev, paidTimeOff: values[0] }))}
                    min={10}
                    max={30}
                    step={1}
                    variant="info"
                  />
                </div>
                <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                  <div className="flex items-center gap-3">
                    <Baby className="w-5 h-5 text-pink-400 flex-shrink-0" />
                    <div className="flex-1">
                      <Label className="text-slate-200">Parental Leave</Label>
                      <p className="text-slate-400 text-xs">Weeks paid leave</p>
                    </div>
                    <span className="text-pink-400 font-semibold">
                      {benefitChanges.parentalLeave ?? currentBenefits.package.parentalLeave} weeks
                    </span>
                  </div>
                  <Slider
                    value={[benefitChanges.parentalLeave ?? currentBenefits.package.parentalLeave]}
                    onValueChange={(values) => setBenefitChanges(prev => ({ ...prev, parentalLeave: values[0] }))}
                    max={16}
                    step={1}
                    variant="default"
                  />
                </div>
              </div>

              {/* Toggle Benefits */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-purple-400" />
                    <div>
                      <Label className="text-slate-200">Stock Options</Label>
                      <p className="text-slate-400 text-xs">Equity compensation for all employees</p>
                    </div>
                  </div>
                  <Switch
                    checked={benefitChanges.stockOptions ?? currentBenefits.package.stockOptions}
                    onCheckedChange={(checked) => setBenefitChanges(prev => ({ ...prev, stockOptions: checked }))}
                  />
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Home className="w-5 h-5 text-cyan-400" />
                    <div>
                      <Label className="text-slate-200">Flexible Work</Label>
                      <p className="text-slate-400 text-xs">Remote and hybrid options</p>
                    </div>
                  </div>
                  <Switch
                    checked={benefitChanges.flexibleWork ?? currentBenefits.package.flexibleWork}
                    onCheckedChange={(checked) => setBenefitChanges(prev => ({ ...prev, flexibleWork: checked }))}
                  />
                </div>
              </div>

              {/* Professional Development */}
              <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <Brain className="w-5 h-5 text-orange-400 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-slate-200">Professional Development Budget</Label>
                    <p className="text-slate-400 text-xs">Annual budget per employee for courses and certifications</p>
                  </div>
                  <span className="text-orange-400 font-semibold">
                    {formatCurrency(benefitChanges.professionalDevelopment ?? currentBenefits.package.professionalDevelopment)}
                  </span>
                </div>
                <Slider
                  value={[benefitChanges.professionalDevelopment ?? currentBenefits.package.professionalDevelopment]}
                  onValueChange={(values) => setBenefitChanges(prev => ({ ...prev, professionalDevelopment: values[0] }))}
                  max={5000}
                  step={250}
                  variant="orange"
                />
              </div>
            </CardContent>
          </Card>

          {/* Benefits Impact Summary */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-sm">Projected Impact of Changes</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(benefitChanges).length > 0 ? (
                <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                  <p className="text-blue-400 text-sm">
                    Changes to your benefits package will take effect next round. Costs and impacts will be recalculated.
                  </p>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400">
                  <p className="text-sm">No changes to benefits package</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
