"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useTutorialStore } from "@/lib/stores/tutorialStore";
import { HelpTooltip } from "@/components/ui/help-tooltip";
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
import { DecisionImpactPanel } from "@/components/game/DecisionImpactPanel";
import { WarningBanner } from "@/components/game/WarningBanner";
import { GamePageSkeleton } from "@/components/game/GamePageSkeleton";
import { ModuleRecap } from "@/components/game/ModuleRecap";
import { useHRPreview } from "@/lib/hooks/useHRPreview";
import { useCrossModuleWarnings } from "@/lib/hooks/useCrossModuleWarnings";
import { HiringRequirementsPanel } from "@/components/hr/HiringRequirementsPanel";
import { calculateHiringRequirements } from "@/lib/hooks/calculateHiringRequirements";
import { useFeatureFlag } from "@/lib/contexts/ComplexityContext";
import { toast } from "sonner";
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
import type { TeamState, Employee, EmployeeRole, BenefitsPackage, CompanyBenefits } from "@/engine/types";
import { HRModule } from "@/engine/modules/HRModule";
import { createEngineContext } from "@/engine/core/EngineContext";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

interface Candidate {
  id: string;
  type: "worker" | "engineer" | "supervisor";
  name: string;
  requestedSalary: number;
  stats: Record<string, number>;
  searchId: string;
}

interface RecruitmentSearch {
  id: string;
  role: string;
  tier: string;
  candidates: Candidate[];
}

const recruitmentTiers = [
  {
    id: "basic",
    name: "Basic Recruitment",
    cost: 5000,
    candidates: 4,
    qualityRange: "50-75",
    description: "Standard job posting",
  },
  {
    id: "premium",
    name: "Premium Recruitment",
    cost: 15000,
    candidates: 6,
    qualityRange: "60-85",
    description: "Professional headhunting",
  },
  {
    id: "executive",
    name: "Executive Search",
    cost: 50000,
    candidates: 8,
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
  const tutorialStep = useTutorialStore(s => s.isActive ? s.steps[s.currentStep] : null);
  useEffect(() => {
    if (tutorialStep?.targetTab) setActiveTab(tutorialStep.targetTab);
  }, [tutorialStep?.targetTab]);
  const [selectedRecruitmentTier, setSelectedRecruitmentTier] = useState<string | null>(null);
  const [selectedPositionType, setSelectedPositionType] = useState<string>("worker");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [recruitmentSearches, setRecruitmentSearches] = useState<Array<{ role: string; tier: string }>>([]);
  const [enrolledTraining, setEnrolledTraining] = useState<Array<{ role: string; programType: string }>>([]);
  const [completedSearches, setCompletedSearches] = useState<RecruitmentSearch[]>([]);
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const searchCounterRef = useRef(0);

  // Feature flags for complexity-based UI
  const hasBenefitsSystem = useFeatureFlag("benefitsSystem");
  const hasTrainingFatigue = useFeatureFlag("trainingFatigue");
  const hasEmployeeManagement = useFeatureFlag("employeeManagement");

  // Get decisions from store
  const { hr, setHRDecisions, submissionStatus } = useDecisionStore();
  const router = useRouter();

  // Auto-navigate to Marketing after successful HR save
  const prevHRSubmittedRef = useRef(submissionStatus.HR?.isSubmitted);
  useEffect(() => {
    const wasSubmitted = prevHRSubmittedRef.current;
    const isNowSubmitted = submissionStatus.HR?.isSubmitted;
    prevHRSubmittedRef.current = isNowSubmitted;

    if (!wasSubmitted && isNowSubmitted) {
      const basePath = gameId === "demo" ? "/demo" : `/game/${gameId}`;
      toast.info("HR saved! Head to Marketing to promote your products.", {
        duration: 5000,
      });
      setTimeout(() => {
        router.push(`${basePath}/marketing`);
      }, 1500);
    }
  }, [submissionStatus.HR?.isSubmitted, gameId, router]);

  // Refs to track previous values and prevent infinite loops
  const prevRecruitmentSearchesRef = useRef<string>(JSON.stringify(hr.recruitmentSearches ?? []));
  const prevTrainingProgramsRef = useRef<string>(JSON.stringify(hr.trainingPrograms ?? []));
  const prevSalaryAdjustmentRef = useRef<number>(hr.salaryAdjustment);

  // Decision state (synced with store)
  const [salaryAdjustment, setSalaryAdjustment] = useState(hr.salaryAdjustment);

  // Benefits state for decisions
  const [benefitChanges, setBenefitChanges] = useState<Partial<BenefitsPackage>>({});

  // Sync store changes to local state (for when decisions are loaded from server)
  useEffect(() => {
    if (prevSalaryAdjustmentRef.current !== hr.salaryAdjustment) {
      prevSalaryAdjustmentRef.current = hr.salaryAdjustment;
      setSalaryAdjustment(hr.salaryAdjustment);
    }
  }, [hr.salaryAdjustment]);

  useEffect(() => {
    const newSearchesStr = JSON.stringify(hr.recruitmentSearches ?? []);
    if (newSearchesStr !== prevRecruitmentSearchesRef.current) {
      prevRecruitmentSearchesRef.current = newSearchesStr;
      setRecruitmentSearches(hr.recruitmentSearches ?? []);
    }
  }, [hr.recruitmentSearches]);

  useEffect(() => {
    const newProgramsStr = JSON.stringify(hr.trainingPrograms ?? []);
    if (newProgramsStr !== prevTrainingProgramsRef.current) {
      prevTrainingProgramsRef.current = newProgramsStr;
      setEnrolledTraining(hr.trainingPrograms ?? []);
    }
  }, [hr.trainingPrograms]);

  // Sync local state changes to store
  useEffect(() => {
    setHRDecisions({ salaryAdjustment });
  }, [salaryAdjustment, setHRDecisions]);

  // Sync selected candidates to store as hires (including full candidate data)
  useEffect(() => {
    const allCandidates = completedSearches.flatMap(s => s.candidates);
    const hires = selectedCandidates.map(candidateId => {
      const candidate = allCandidates.find(c => c.id === candidateId);
      return {
        role: candidate?.type || 'worker',
        candidateId,
        candidateData: candidate ? {
          name: candidate.name,
          stats: candidate.stats,
          salary: candidate.requestedSalary,
        } : undefined,
      };
    });
    setHRDecisions({ hires });
  }, [selectedCandidates, completedSearches, setHRDecisions]);

  // Sync recruitment searches to store
  useEffect(() => {
    setHRDecisions({ recruitmentSearches });
  }, [recruitmentSearches, setHRDecisions]);

  // Sync training programs to store
  useEffect(() => {
    setHRDecisions({ trainingPrograms: enrolledTraining });
  }, [enrolledTraining, setHRDecisions]);

  // Get current decisions for submission (transformed to match router schema)
  const getDecisions = useCallback(() => {
    const validRoles = ["worker", "engineer", "supervisor"];
    return {
      hires: hr.hires.map(h => ({
        ...h,
        role: validRoles.includes(h.role) ? h.role : "worker",
      })),
      fires: hr.fires,
      recruitmentSearches: hr.recruitmentSearches.map(s => ({
        ...s,
        role: validRoles.includes(s.role) ? s.role : "worker",
      })),
      salaryAdjustment,
      trainingPrograms: hr.trainingPrograms,
      benefitChanges: Object.keys(benefitChanges).length > 0 ? benefitChanges : undefined,
    };
  }, [hr, salaryAdjustment, benefitChanges]);

  const { data: teamState, isLoading } = trpc.team.getMyState.useQuery();

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

  // Cross-module warnings
  const warnings = useCrossModuleWarnings(state, "hr");

  // Hiring requirements
  const hiringRequirements = useMemo(() => {
    if (!state) return [];
    return calculateHiringRequirements(state);
  }, [state]);

  // Preview hook for live impact
  const hrPreview = useHRPreview(state, hr);

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

  const calculateEmployeeValue = (stats: Record<string, number>) => {
    const weights: Record<string, number> = {
      efficiency: 0.25, accuracy: 0.15, speed: 0.15, stamina: 0.10,
      discipline: 0.10, loyalty: 0.10, teamCompatibility: 0.10, health: 0.05,
    };
    let score = 0;
    for (const [key, weight] of Object.entries(weights)) {
      score += (stats[key] ?? 0) * weight;
    }
    // Bonus for role-specific stats
    if (stats.innovation != null) score += stats.innovation * 0.05;
    if (stats.problemSolving != null) score += stats.problemSolving * 0.05;
    if (stats.leadership != null) score += stats.leadership * 0.05;
    if (stats.tacticalPlanning != null) score += stats.tacticalPlanning * 0.05;
    return Math.round(score);
  };

  if (isLoading) return <GamePageSkeleton statCards={4} sections={2} />;

  const currentRound = teamState?.game?.currentRound ?? 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Human Resources"
        subtitle="Manage workforce, recruitment, training, and employee wellbeing"
        icon={<Users className="w-7 h-7" />}
        iconColor="text-blue-400"
      />

      {/* Last round recap */}
      <ModuleRecap module="hr" currentRound={currentRound} state={state} history={[]} />

      {/* Cross-module warnings */}
      <WarningBanner warnings={warnings} />

      {/* Hiring requirements panel */}
      <HiringRequirementsPanel requirements={hiringRequirements} />

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
          <TabsTrigger value="line-assignment" className="data-[state=active]:bg-slate-700">
            Line Assignment
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
                Recruitment Campaign
                <HelpTooltip text="Higher tiers cost more but find better candidates. Workers run machines (~2.5 per machine), Engineers boost R&D, Supervisors improve team efficiency." />
              </CardTitle>
              <CardDescription className="text-slate-400">
                Select a position type, then a recruitment level to find candidates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Position Type */}
              <div>
                <label className="text-slate-300 text-sm mb-2 block font-medium">Step 1 — Position Type</label>
                <div className="flex gap-2 flex-wrap">
                  {["worker", "engineer", "supervisor"].map((type) => (
                    <Button
                      key={type}
                      variant={selectedPositionType === type ? "default" : "outline"}
                      className={selectedPositionType === type
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "border-slate-500"
                      }
                      onClick={() => {
                        setSelectedPositionType(type);
                        setSelectedRecruitmentTier(null);
                        setActiveSearchId(null);
                      }}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Step 2: Recruitment Level */}
              <div>
                <label className="text-slate-300 text-sm mb-2 block font-medium">Step 2 — Recruitment Level</label>
                <div className="grid md:grid-cols-3 gap-4">
                  {recruitmentTiers.map((tier) => (
                    <Card
                      key={tier.id}
                      className={`bg-slate-700 border-slate-600 cursor-pointer transition-all ${
                        selectedRecruitmentTier === tier.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'hover:border-slate-500'
                      }`}
                      onClick={() => {
                        setSelectedRecruitmentTier(tier.id);
                        setActiveSearchId(null);
                      }}
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
              </div>

              {/* Step 3: Search button */}
              <div className="flex justify-end">
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!selectedRecruitmentTier}
                  onClick={() => {
                    if (selectedRecruitmentTier) {
                      const searchId = `search-${searchCounterRef.current++}`;
                      const role = selectedPositionType as EmployeeRole;
                      const tier = selectedRecruitmentTier as "basic" | "premium" | "executive";
                      const round = state?.round ?? 1;

                      const ctx = createEngineContext(
                        `recruit-${round}-${searchId}`,
                        round,
                        "preview"
                      );

                      const tierConfig = recruitmentTiers.find(t => t.id === tier);
                      const generated = HRModule.generateCandidates(role, tier, tierConfig?.candidates, ctx);

                      const candidates: Candidate[] = generated.map((emp, idx) => ({
                        id: `${searchId}-c${idx}`,
                        type: role,
                        name: emp.name,
                        requestedSalary: emp.salary,
                        stats: emp.stats as unknown as Record<string, number>,
                        searchId,
                      }));

                      setCompletedSearches(prev => [...prev, {
                        id: searchId,
                        role: selectedPositionType,
                        tier: selectedRecruitmentTier,
                        candidates,
                      }]);

                      setRecruitmentSearches(prev => [
                        ...prev,
                        { role: selectedPositionType, tier: selectedRecruitmentTier }
                      ]);

                      setActiveSearchId(searchId);
                    }
                  }}
                >
                  Search Candidates ({formatCurrency(
                    recruitmentTiers.find(t => t.id === selectedRecruitmentTier)?.cost || 0
                  )})
                </Button>
              </div>

              {/* Step 4: Candidates for the active search */}
              {(() => {
                const activeSearch = completedSearches.find(s => s.id === activeSearchId);
                if (!activeSearch) return null;

                const tierInfo = recruitmentTiers.find(t => t.id === activeSearch.tier);
                return (
                  <div className="border-t border-slate-700 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <h4 className="text-white text-sm font-medium capitalize">
                        {activeSearch.role} Candidates — {tierInfo?.name ?? activeSearch.tier}
                      </h4>
                      <Badge className={
                        activeSearch.tier === "executive" ? "bg-amber-500/20 text-amber-400" :
                        activeSearch.tier === "premium" ? "bg-purple-500/20 text-purple-400" :
                        "bg-slate-500/20 text-slate-400"
                      }>
                        {tierInfo?.qualityRange ?? activeSearch.tier}
                      </Badge>
                      <span className="text-slate-500 text-xs">{activeSearch.candidates.length} found</span>
                    </div>
                    <div className="space-y-3">
                      {activeSearch.candidates.map((candidate) => {
                        const statEntries = Object.entries(candidate.stats);
                        const cols = statEntries.length > 8 ? 5 : 4;
                        return (
                          <Card
                            key={candidate.id}
                            className={`bg-slate-700 border-slate-600 transition-all ${
                              selectedCandidates.includes(candidate.id) ? 'border-green-500 ring-1 ring-green-500/20' : ''
                            }`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-white font-medium">{candidate.name}</h3>
                                    <Badge className="bg-slate-600">
                                      {candidate.type.charAt(0).toUpperCase() + candidate.type.slice(1)}
                                    </Badge>
                                  </div>
                                  <div className="grid gap-3 text-sm" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                                    {statEntries.map(([key, value]) => (
                                      <div key={key}>
                                        <span className="text-slate-400 text-xs block">
                                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                                        </span>
                                        <span className={`font-medium ${getStatColor(value)}`}>
                                          {Math.round(value)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="text-right ml-4 shrink-0">
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
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Pending Hires Summary */}
          {selectedCandidates.length > 0 && (
            <Card className="bg-green-900/20 border-green-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-green-400 text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Pending Hires ({selectedCandidates.length})
                </CardTitle>
                <CardDescription className="text-slate-400">
                  These candidates will be hired when you save your decisions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedCandidates.map(candidateId => {
                    const allCandidates = completedSearches.flatMap(s => s.candidates);
                    const candidate = allCandidates.find(c => c.id === candidateId);
                    if (!candidate) return null;
                    const hiringCost = candidate.requestedSalary * 0.15;
                    return (
                      <div key={candidateId} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            candidate.type === 'worker' ? 'bg-blue-600/20' :
                            candidate.type === 'engineer' ? 'bg-purple-600/20' : 'bg-green-600/20'
                          }`}>
                            {candidate.type === 'worker' ? (
                              <Briefcase className="w-4 h-4 text-blue-400" />
                            ) : candidate.type === 'engineer' ? (
                              <Brain className="w-4 h-4 text-purple-400" />
                            ) : (
                              <Award className="w-4 h-4 text-green-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{candidate.name}</p>
                            <p className="text-slate-400 text-xs capitalize">{candidate.type} · Value: {calculateEmployeeValue(candidate.stats)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-white text-sm">{formatCurrency(candidate.requestedSalary)}/yr</p>
                            <p className="text-slate-400 text-xs">Hiring cost: {formatCurrency(hiringCost)}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 h-8 px-2"
                            onClick={() => setSelectedCandidates(prev => prev.filter(id => id !== candidateId))}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-green-700/50 flex justify-between text-sm">
                  <span className="text-slate-400">Total hiring costs</span>
                  <span className="text-green-400 font-medium">
                    {formatCurrency(
                      selectedCandidates.reduce((total, id) => {
                        const allCandidates = completedSearches.flatMap(s => s.candidates);
                        const candidate = allCandidates.find(c => c.id === id);
                        return total + (candidate ? candidate.requestedSalary * 0.15 : 0);
                      }, 0)
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
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

        {/* Line Assignment Tab */}
        <TabsContent value="line-assignment" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Production Line Staffing
              </CardTitle>
              <CardDescription className="text-slate-400">
                Assign workers, engineers, and supervisors to production lines. Each person can only work on one line.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const factories = state?.factories ?? [];
                if (factories.length === 0) return <div className="text-slate-500 text-center py-6">No factories available</div>;

                return factories.map((factory: { id: string; name: string; workers: number; engineers: number; supervisors: number; productionLines?: Array<{ id: string; productId: string | null; segment: string | null; targetOutput: number; assignedWorkers: number; assignedEngineers: number; assignedSupervisors: number; status: string }> }) => {
                  const lines = factory.productionLines ?? [];
                  const assignedWorkers = lines.reduce((sum, l) => sum + l.assignedWorkers, 0);
                  const assignedEngineers = lines.reduce((sum, l) => sum + l.assignedEngineers, 0);
                  const assignedSupervisors = lines.reduce((sum, l) => sum + l.assignedSupervisors, 0);

                  return (
                    <div key={factory.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-white font-medium">{factory.name}</h4>
                        <div className="flex gap-4 text-xs text-slate-400">
                          <span>Workers: {assignedWorkers}/{factory.workers}</span>
                          <span>Engineers: {assignedEngineers}/{factory.engineers}</span>
                          <span>Supervisors: {assignedSupervisors}/{factory.supervisors}</span>
                        </div>
                      </div>

                      {lines.length === 0 ? (
                        <div className="text-slate-500 text-sm italic">No production lines in this factory</div>
                      ) : (
                        <div className="space-y-2">
                          {lines.map((line, idx) => {
                            const product = state?.products?.find((p: { id: string }) => p.id === line.productId);
                            const isActive = line.status === "active" && line.productId;
                            const staffColor = isActive ? "border-blue-500/30 bg-blue-500/5" : "border-slate-700 bg-slate-800/50";

                            return (
                              <div key={line.id} className={`p-3 rounded-lg border ${staffColor}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <span className="text-white text-sm font-medium">Line {idx + 1}: </span>
                                    <span className="text-slate-300 text-sm">
                                      {product?.name ?? line.productId ?? "Unassigned"}
                                    </span>
                                    {line.segment && (
                                      <Badge variant="outline" className="ml-2 text-xs">{line.segment}</Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-500">{line.targetOutput.toLocaleString()} units target</span>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-xs text-slate-500">Workers</label>
                                    <input
                                      type="number"
                                      className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1"
                                      value={line.assignedWorkers}
                                      min={0}
                                      max={factory.workers}
                                      disabled={!isActive}
                                      readOnly
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-slate-500">Engineers</label>
                                    <input
                                      type="number"
                                      className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1"
                                      value={line.assignedEngineers}
                                      min={0}
                                      max={factory.engineers}
                                      disabled={!isActive}
                                      readOnly
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-xs text-slate-500">Supervisors</label>
                                    <input
                                      type="number"
                                      className="w-full bg-slate-700 border border-slate-600 text-white text-sm rounded px-2 py-1"
                                      value={line.assignedSupervisors}
                                      min={0}
                                      max={factory.supervisors}
                                      disabled={!isActive}
                                      readOnly
                                    />
                                  </div>
                                </div>
                                <div className="text-xs text-slate-500 mt-1 italic">
                                  Staff auto-distributed evenly. Manual assignment coming soon.
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}

              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-300 text-sm">
                <strong>Staffing Rules:</strong> Workers = ceil(target / (100 x efficiency)), Engineers = ceil(machines / 3), Supervisors = ceil(total staff / 15).
                Below 50% staffing shuts the line down.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Decision Impact Preview */}
      <DecisionImpactPanel
        moduleName="HR"
        costs={hrPreview.costs}
        messages={hrPreview.messages}
        cashRemaining={state ? state.cash - hrPreview.costs : undefined}
      />

      {/* Decision Submit Bar */}
      <DecisionSubmitBar module="HR" getDecisions={getDecisions} />

      {/* Spacer for fixed submit bar */}
      <div className="h-20" />
    </div>
  );
}
