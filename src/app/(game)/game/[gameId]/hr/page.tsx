"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { PageHeader } from "@/components/ui/section-header";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/api/trpc";
import { useDecisionStore } from "@/lib/stores/decisionStore";
import { DecisionSubmitBar } from "@/components/game/DecisionSubmitBar";
import { useFeatureFlag } from "@/lib/contexts/ComplexityContext";
import {
  Users,
  UserPlus,
  UserMinus,
  GraduationCap,
  Heart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Star,
  Briefcase,
  Clock,
  Award,
  ShieldCheck,
  Baby,
  Home,
  Zap,
  Gift,
  Brain,
  Coffee,
} from "lucide-react";
import type { TeamState, Employee, BenefitsPackage, CompanyBenefits } from "@/engine/types";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

interface Candidate {
  id: string;
  type: "worker" | "engineer" | "supervisor";
  name: string;
  requestedSalary: number;
  stats: {
    efficiency: number;
    accuracy: number;
    speed: number;
    stamina: number;
    discipline: number;
    loyalty: number;
    teamCompatibility: number;
    health: number;
  };
}

// Sample candidates - in production these would come from a recruitment search API
const sampleCandidates: Candidate[] = [
  {
    id: "c1",
    type: "worker",
    name: "John Smith",
    requestedSalary: 45000,
    stats: { efficiency: 72, accuracy: 68, speed: 75, stamina: 80, discipline: 70, loyalty: 65, teamCompatibility: 78, health: 85 },
  },
  {
    id: "c2",
    type: "worker",
    name: "Maria Garcia",
    requestedSalary: 48000,
    stats: { efficiency: 78, accuracy: 82, speed: 70, stamina: 75, discipline: 85, loyalty: 72, teamCompatibility: 88, health: 90 },
  },
  {
    id: "c3",
    type: "engineer",
    name: "David Chen",
    requestedSalary: 95000,
    stats: { efficiency: 85, accuracy: 90, speed: 72, stamina: 70, discipline: 88, loyalty: 78, teamCompatibility: 80, health: 85 },
  },
];

const recruitmentTiers = [
  {
    id: "basic",
    name: "Basic Recruitment",
    cost: 5000,
    candidates: 3,
    qualityRange: "50-75",
    description: "Standard job posting",
  },
  {
    id: "premium",
    name: "Premium Recruitment",
    cost: 15000,
    candidates: 5,
    qualityRange: "60-85",
    description: "Professional headhunting",
  },
  {
    id: "executive",
    name: "Executive Search",
    cost: 50000,
    candidates: 7,
    qualityRange: "70-95",
    description: "Top-tier executive search",
  },
];

const trainingPrograms = [
  {
    id: "basic-skills",
    name: "Basic Skills Training",
    cost: 500,
    duration: "1 round",
    effect: "+5% efficiency",
    targetType: ["worker"],
  },
  {
    id: "advanced-tech",
    name: "Advanced Technical Training",
    cost: 2000,
    duration: "1 round",
    effect: "+8% efficiency, +5% accuracy",
    targetType: ["engineer"],
  },
  {
    id: "leadership",
    name: "Leadership Development",
    cost: 5000,
    duration: "2 rounds",
    effect: "+10% team productivity",
    targetType: ["supervisor"],
  },
  {
    id: "safety",
    name: "Safety & Wellness",
    cost: 300,
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

export default function HRPage({ params }: PageProps) {
  const { gameId } = use(params);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRecruitmentTier, setSelectedRecruitmentTier] = useState<string | null>(null);
  const [selectedPositionType, setSelectedPositionType] = useState<string>("worker");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [recruitmentSearches, setRecruitmentSearches] = useState<Array<{ role: string; tier: string }>>([]);
  const [enrolledTraining, setEnrolledTraining] = useState<Array<{ role: string; programType: string }>>([]);

  // Feature flags for complexity-based UI
  const hasBenefitsSystem = useFeatureFlag("benefitsSystem");
  const hasTrainingFatigue = useFeatureFlag("trainingFatigue");
  const hasEmployeeManagement = useFeatureFlag("employeeManagement");

  // Get decisions from store
  const { hr, setHRDecisions } = useDecisionStore();

  // Decision state (synced with store)
  const [salaryAdjustment, setSalaryAdjustment] = useState(hr.salaryAdjustment);

  // Benefits state for decisions
  const [benefitChanges, setBenefitChanges] = useState<Partial<BenefitsPackage>>({});

  // Sync store changes to local state (for when decisions are loaded from server)
  useEffect(() => {
    if (hr.salaryAdjustment !== salaryAdjustment) {
      setSalaryAdjustment(hr.salaryAdjustment);
    }
  }, [hr.salaryAdjustment]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (JSON.stringify(hr.recruitmentSearches) !== JSON.stringify(recruitmentSearches)) {
      setRecruitmentSearches(hr.recruitmentSearches);
    }
  }, [hr.recruitmentSearches]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (JSON.stringify(hr.trainingPrograms) !== JSON.stringify(enrolledTraining)) {
      setEnrolledTraining(hr.trainingPrograms);
    }
  }, [hr.trainingPrograms]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state changes to store
  useEffect(() => {
    setHRDecisions({ salaryAdjustment });
  }, [salaryAdjustment, setHRDecisions]);

  // Sync selected candidates to store as hires
  useEffect(() => {
    const hires = selectedCandidates.map(candidateId => {
      const candidate = sampleCandidates.find(c => c.id === candidateId);
      return {
        role: candidate?.type || 'worker',
        candidateId,
      };
    });
    setHRDecisions({ hires });
  }, [selectedCandidates, setHRDecisions]);

  // Sync recruitment searches to store
  useEffect(() => {
    setHRDecisions({ recruitmentSearches });
  }, [recruitmentSearches, setHRDecisions]);

  // Sync training programs to store
  useEffect(() => {
    setHRDecisions({ trainingPrograms: enrolledTraining });
  }, [enrolledTraining, setHRDecisions]);

  // Get current decisions for submission
  const getDecisions = useCallback(() => ({
    hires: hr.hires,
    fires: hr.fires,
    recruitmentSearches: hr.recruitmentSearches,
    salaryAdjustment,
    trainingPrograms: hr.trainingPrograms,
    benefitChanges: Object.keys(benefitChanges).length > 0 ? benefitChanges : undefined,
  }), [hr, salaryAdjustment, benefitChanges]);

  const { data: teamState } = trpc.team.getMyState.useQuery();

  // Parse the team state JSON
  const state: TeamState | null = useMemo(() => {
    if (!teamState?.state) return null;
    try {
      return typeof teamState.state === 'string'
        ? JSON.parse(teamState.state) as TeamState
        : teamState.state as TeamState;
    } catch {
      return null;
    }
  }, [teamState?.state]);

  // Compute workforce breakdown from employees
  const workforceBreakdown = useMemo(() => {
    if (!state?.employees) {
      return { workers: 0, engineers: 0, supervisors: 0, total: 0 };
    }
    const workers = state.employees.filter(e => e.role === "worker").length;
    const engineers = state.employees.filter(e => e.role === "engineer").length;
    const supervisors = state.employees.filter(e => e.role === "supervisor").length;
    return { workers, engineers, supervisors, total: workers + engineers + supervisors };
  }, [state?.employees]);

  // Current benefits from state or defaults
  const currentBenefits = state?.benefits || defaultBenefits;

  const getStatColor = (value: number) => {
    if (value >= 80) return "text-green-400";
    if (value >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const calculateEmployeeValue = (stats: Candidate["stats"]) => {
    return Math.round(
      stats.efficiency * 0.25 +
      stats.accuracy * 0.15 +
      stats.speed * 0.15 +
      stats.stamina * 0.10 +
      stats.discipline * 0.10 +
      stats.loyalty * 0.10 +
      stats.teamCompatibility * 0.10 +
      stats.health * 0.05
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Human Resources"
        subtitle="Manage workforce, recruitment, training, and employee wellbeing"
        icon={<Users className="w-7 h-7" />}
        iconColor="text-blue-400"
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700 flex-wrap">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
            Overview
          </TabsTrigger>
          <TabsTrigger value="recruitment" className="data-[state=active]:bg-slate-700">
            Recruitment
          </TabsTrigger>
          <TabsTrigger value="training" className="data-[state=active]:bg-slate-700">
            Training
          </TabsTrigger>
          <TabsTrigger value="compensation" className="data-[state=active]:bg-slate-700">
            Compensation
          </TabsTrigger>
          {hasBenefitsSystem && (
            <TabsTrigger value="benefits" className="data-[state=active]:bg-slate-700">
              Benefits
            </TabsTrigger>
          )}
          <TabsTrigger value="workforce" className="data-[state=active]:bg-slate-700">
            Workforce
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Employees"
              value={state?.workforce?.totalHeadcount ?? workforceBreakdown.total}
              icon={<Users className="w-5 h-5" />}
              variant="info"
            />
            <StatCard
              label="Monthly Labor Cost"
              value={formatCurrency((state?.workforce?.laborCost ?? 0) / 12)}
              icon={<DollarSign className="w-5 h-5" />}
              variant="success"
            />
            <StatCard
              label="Avg Morale"
              value={`${(state?.workforce?.averageMorale ?? 0).toFixed(0)}%`}
              icon={<Heart className="w-5 h-5" />}
              variant="purple"
            />
            <StatCard
              label="Turnover Rate"
              value={`${((state?.workforce?.turnoverRate ?? 0) * 100).toFixed(0)}%`}
              icon={<UserMinus className="w-5 h-5" />}
              variant="warning"
            />
          </div>

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
                      value={state?.workforce?.averageEfficiency ?? 0}
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

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">HR Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Dynamic alerts based on state */}
                {(state?.workforce?.averageMorale ?? 0) < 60 && (
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
                {(state?.workforce?.averageMorale ?? 0) >= 60 && (
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
                    <p className="text-slate-400 text-xs">{trainingPrograms.length} training programs ready to deploy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staffing Requirements */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Staffing Overview</CardTitle>
              <CardDescription className="text-slate-400">
                Current staffing levels across your factories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <div className="text-slate-400 text-sm mb-1">Workers</div>
                  <div className="text-2xl font-bold text-white">{workforceBreakdown.workers}</div>
                  <div className={`text-sm ${workforceBreakdown.workers >= 40 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {workforceBreakdown.workers >= 40 ? 'Adequate' : 'Consider hiring'}
                  </div>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <div className="text-slate-400 text-sm mb-1">Engineers</div>
                  <div className="text-2xl font-bold text-white">{workforceBreakdown.engineers}</div>
                  <div className={`text-sm ${workforceBreakdown.engineers >= 10 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {workforceBreakdown.engineers >= 10 ? 'Adequate' : 'Consider hiring'}
                  </div>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <div className="text-slate-400 text-sm mb-1">Supervisors</div>
                  <div className="text-2xl font-bold text-white">{workforceBreakdown.supervisors}</div>
                  <div className={`text-sm ${workforceBreakdown.supervisors >= 2 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {workforceBreakdown.supervisors >= 2 ? 'Adequate' : 'Consider hiring'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recruitment Tab */}
        <TabsContent value="recruitment" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Start Recruitment Campaign
              </CardTitle>
              <CardDescription className="text-slate-400">
                Select a recruitment tier and position type to find candidates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Position Type Selection */}
              <div>
                <label className="text-slate-300 text-sm mb-2 block">Position Type</label>
                <div className="flex gap-2 flex-wrap">
                  {["worker", "engineer", "supervisor", "manager"].map((type) => (
                    <Button
                      key={type}
                      variant={selectedPositionType === type ? "default" : "outline"}
                      className={selectedPositionType === type
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "border-slate-500"
                      }
                      onClick={() => setSelectedPositionType(type)}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Recruitment Tiers */}
              <div className="grid md:grid-cols-3 gap-4">
                {recruitmentTiers.map((tier) => (
                  <Card
                    key={tier.id}
                    className={`bg-slate-700 border-slate-600 cursor-pointer transition-all ${
                      selectedRecruitmentTier === tier.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'hover:border-slate-500'
                    }`}
                    onClick={() => setSelectedRecruitmentTier(tier.id)}
                  >
                    <CardContent className="p-4">
                      <h3 className="text-white font-medium mb-2">{tier.name}</h3>
                      <p className="text-slate-400 text-sm mb-3">{tier.description}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Cost</span>
                          <span className="text-white">{formatCurrency(tier.cost)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Candidates</span>
                          <span className="text-white">{tier.candidates}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Quality Range</span>
                          <span className="text-green-400">{tier.qualityRange}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex justify-end">
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!selectedRecruitmentTier}
                  onClick={() => {
                    if (selectedRecruitmentTier) {
                      setRecruitmentSearches(prev => [
                        ...prev,
                        { role: selectedPositionType, tier: selectedRecruitmentTier }
                      ]);
                      setSelectedRecruitmentTier(null);
                    }
                  }}
                >
                  Start Recruitment ({formatCurrency(
                    recruitmentTiers.find(t => t.id === selectedRecruitmentTier)?.cost || 0
                  )})
                </Button>
              </div>
              {recruitmentSearches.length > 0 && (
                <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                  <p className="text-green-400 text-sm font-medium mb-2">Pending Recruitment Campaigns:</p>
                  <div className="space-y-1">
                    {recruitmentSearches.map((search, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-300 capitalize">{search.role} - {search.tier}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 h-6 px-2"
                          onClick={() => setRecruitmentSearches(prev => prev.filter((_, i) => i !== idx))}
                        >
                          Cancel
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Candidates */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Available Candidates</CardTitle>
              <CardDescription className="text-slate-400">
                Review and hire candidates from your recruitment campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sampleCandidates.map((candidate) => (
                  <Card
                    key={candidate.id}
                    className={`bg-slate-700 border-slate-600 ${
                      selectedCandidates.includes(candidate.id) ? 'border-green-500' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-white font-medium">{candidate.name}</h3>
                            <Badge className="bg-slate-600">
                              {candidate.type.charAt(0).toUpperCase() + candidate.type.slice(1)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            {Object.entries(candidate.stats).slice(0, 4).map(([key, value]) => (
                              <div key={key}>
                                <span className="text-slate-400 text-xs block">
                                  {key.charAt(0).toUpperCase() + key.slice(1)}
                                </span>
                                <span className={`font-medium ${getStatColor(value)}`}>
                                  {value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-400 text-sm mb-1">Salary Request</div>
                          <div className="text-white font-medium mb-2">
                            {formatCurrency(candidate.requestedSalary)}/year
                          </div>
                          <div className="text-slate-400 text-xs mb-2">
                            Value Score: <span className="text-green-400">{calculateEmployeeValue(candidate.stats)}</span>
                          </div>
                          <Button
                            size="sm"
                            className={selectedCandidates.includes(candidate.id)
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-blue-600 hover:bg-blue-700"
                            }
                            onClick={() => {
                              if (selectedCandidates.includes(candidate.id)) {
                                setSelectedCandidates(prev => prev.filter(id => id !== candidate.id));
                              } else {
                                setSelectedCandidates(prev => [...prev, candidate.id]);
                              }
                            }}
                          >
                            {selectedCandidates.includes(candidate.id) ? "Selected" : "Hire"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="space-y-6">
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
                            // Enroll all applicable roles
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
        </TabsContent>

        {/* Compensation Tab */}
        <TabsContent value="compensation" className="space-y-6">
          <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-400" />
                Salary Adjustment
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
                    {formatCurrency((state?.workforce?.laborCost ?? 0) / 12)}
                  </div>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-slate-400 text-sm mb-1">Projected Monthly Cost</div>
                  <div className="text-xl font-bold text-white">
                    {formatCurrency(((state?.workforce?.laborCost ?? 0) / 12) * (1 + salaryAdjustment / 100))}
                  </div>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="text-slate-400 text-sm mb-1">Projected Turnover</div>
                  <div className={`text-xl font-bold ${
                    salaryAdjustment > 0 ? 'text-green-400' : salaryAdjustment < 0 ? 'text-red-400' : 'text-white'
                  }`}>
                    {Math.max(2, Math.min(25, ((state?.workforce?.turnoverRate ?? 0) * 100) - salaryAdjustment * 0.3)).toFixed(0)}%
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
        </TabsContent>

        {/* Benefits Tab - Only shown when feature is enabled */}
        {hasBenefitsSystem && (
          <TabsContent value="benefits" className="space-y-6">
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
          </TabsContent>
        )}

        {/* Workforce Tab */}
        <TabsContent value="workforce" className="space-y-6">
          {/* Employee Summary when individual management is enabled */}
          {hasEmployeeManagement && state?.employees && state.employees.length > 0 ? (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Employee Roster</CardTitle>
                <CardDescription className="text-slate-400">
                  View and manage individual employees
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {state.employees.slice(0, 20).map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          employee.role === 'worker' ? 'bg-blue-600/20' :
                          employee.role === 'engineer' ? 'bg-purple-600/20' : 'bg-green-600/20'
                        }`}>
                          {employee.role === 'worker' ? (
                            <Briefcase className="w-4 h-4 text-blue-400" />
                          ) : employee.role === 'engineer' ? (
                            <GraduationCap className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Award className="w-4 h-4 text-green-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{employee.name}</p>
                          <p className="text-slate-400 text-xs capitalize">{employee.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">Morale</p>
                          <p className={`text-sm font-medium ${
                            employee.morale >= 70 ? 'text-green-400' :
                            employee.morale >= 50 ? 'text-yellow-400' : 'text-red-400'
                          }`}>{employee.morale}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">Efficiency</p>
                          <p className="text-blue-400 text-sm font-medium">{employee.stats.efficiency}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400 text-xs">Salary</p>
                          <p className="text-green-400 text-sm font-medium">{formatCurrency(employee.salary)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {state.employees.length > 20 && (
                    <p className="text-center text-slate-400 text-sm py-2">
                      + {state.employees.length - 20} more employees
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Employee Roster</CardTitle>
                <CardDescription className="text-slate-400">
                  View and manage your current workforce
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-slate-400">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Employee roster management</p>
                  <p className="text-sm mt-2">
                    {hasEmployeeManagement
                      ? "No employees currently in your workforce."
                      : "Individual employee management is not enabled for this game."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Layoffs */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <UserMinus className="w-5 h-5 text-red-400" />
                Workforce Reduction
              </CardTitle>
              <CardDescription className="text-slate-400">
                Reduce workforce to cut costs (affects morale)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { type: "Workers", current: workforceBreakdown.workers, min: 20 },
                  { type: "Engineers", current: workforceBreakdown.engineers, min: 3 },
                  { type: "Supervisors", current: workforceBreakdown.supervisors, min: 1 },
                ].map((role) => (
                  <div key={role.type} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="text-slate-400 text-sm mb-2">{role.type}</div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-400"
                        disabled={role.current <= role.min}
                      >
                        -
                      </Button>
                      <span className="text-white font-medium flex-1 text-center">
                        {role.current}
                      </span>
                      <Button size="sm" variant="outline" className="border-slate-500" disabled>
                        +
                      </Button>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 text-center">
                      Min: {role.min}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-sm text-red-400">
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Layoffs significantly impact morale and may trigger voluntary departures
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Decision Submit Bar */}
      <DecisionSubmitBar module="HR" getDecisions={getDecisions} />

      {/* Spacer for fixed submit bar */}
      <div className="h-20" />
    </div>
  );
}
