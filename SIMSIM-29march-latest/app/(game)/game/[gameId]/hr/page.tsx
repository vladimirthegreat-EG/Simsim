"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { useTutorialStore } from "@/lib/stores/tutorialStore";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/section-header";
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
import { Users } from "lucide-react";
import type { TeamState, BenefitsPackage, CompanyBenefits } from "@/engine/types";

import { OverviewTab } from "@/components/hr/OverviewTab";
import { HireFireTab } from "@/components/hr/HireFireTab";
import { DevelopTab, trainingPrograms } from "@/components/hr/DevelopTab";
import { RosterTab } from "@/components/hr/RosterTab";

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
  const [layoffCounts, setLayoffCounts] = useState<Record<string, number>>({ worker: 0, engineer: 0, supervisor: 0 });
  const [freeSearchUsed, setFreeSearchUsed] = useState<Record<string, boolean>>({});

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

  // Sync layoffs to store — use REAL employee IDs from state
  useEffect(() => {
    const totalLayoffs = Object.values(layoffCounts).reduce((sum, v) => sum + v, 0);
    if (totalLayoffs > 0 && state?.employees) {
      const fires: Array<{ employeeId: string }> = [];
      for (const [role, count] of Object.entries(layoffCounts)) {
        // Find real employees of this role, pick the lowest-morale ones first
        const roleEmps = state.employees
          .filter((e: { role: string; morale: number; id: string }) => e.role === role)
          .sort((a: { morale: number }, b: { morale: number }) => a.morale - b.morale);
        for (let i = 0; i < Math.min(count, roleEmps.length); i++) {
          fires.push({ employeeId: roleEmps[i].id });
        }
      }
      setHRDecisions({ fires } as Record<string, unknown>);
    } else if (totalLayoffs === 0) {
      setHRDecisions({ fires: [] } as Record<string, unknown>);
    }
  }, [layoffCounts, state?.employees, setHRDecisions]);

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

  if (isLoading) return <GamePageSkeleton statCards={4} sections={2} />;

  const currentRound = teamState?.game?.currentRound ?? 1;
  const laborCost = state?.workforce?.laborCost ?? 0;
  const avgMorale = state?.workforce?.averageMorale ?? 0;
  const turnoverRate = state?.workforce?.turnoverRate ?? 0;
  const avgEfficiency = state?.workforce?.averageEfficiency ?? 0;
  const totalHeadcount = state?.workforce?.totalHeadcount ?? workforceBreakdown.total;

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
            Hire & Fire
          </TabsTrigger>
          <TabsTrigger value="training" className="data-[state=active]:bg-slate-700">
            Develop
          </TabsTrigger>
          <TabsTrigger value="workforce" className="data-[state=active]:bg-slate-700">
            Roster
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab
            workforceBreakdown={workforceBreakdown}
            laborCost={laborCost}
            avgMorale={avgMorale}
            turnoverRate={turnoverRate}
            avgEfficiency={avgEfficiency}
            totalHeadcount={totalHeadcount}
            state={state}
            hasBenefitsSystem={hasBenefitsSystem}
            currentBenefits={currentBenefits}
            trainingProgramCount={trainingPrograms.length}
            hiringRequirements={hiringRequirements}
          />
        </TabsContent>

        <TabsContent value="recruitment" className="space-y-6">
          <HireFireTab
            selectedPositionType={selectedPositionType}
            setSelectedPositionType={setSelectedPositionType}
            selectedRecruitmentTier={selectedRecruitmentTier}
            setSelectedRecruitmentTier={setSelectedRecruitmentTier}
            recruitmentSearches={recruitmentSearches}
            setRecruitmentSearches={setRecruitmentSearches}
            completedSearches={completedSearches}
            setCompletedSearches={setCompletedSearches}
            selectedCandidates={selectedCandidates}
            setSelectedCandidates={setSelectedCandidates}
            workforceBreakdown={workforceBreakdown}
            layoffCounts={layoffCounts}
            setLayoffCounts={setLayoffCounts}
            state={state}
            activeSearchId={activeSearchId}
            setActiveSearchId={setActiveSearchId}
            searchCounterRef={searchCounterRef}
            freeSearchUsed={freeSearchUsed}
            setFreeSearchUsed={setFreeSearchUsed}
          />
        </TabsContent>

        <TabsContent value="training" className="space-y-6">
          <DevelopTab
            enrolledTraining={enrolledTraining}
            setEnrolledTraining={setEnrolledTraining}
            salaryAdjustment={salaryAdjustment}
            setSalaryAdjustment={setSalaryAdjustment}
            benefitChanges={benefitChanges}
            setBenefitChanges={setBenefitChanges}
            workforceBreakdown={workforceBreakdown}
            turnoverRate={turnoverRate}
            laborCost={laborCost}
            state={state}
            hasBenefitsSystem={hasBenefitsSystem}
            hasTrainingFatigue={hasTrainingFatigue}
          />
        </TabsContent>

        <TabsContent value="workforce" className="space-y-6">
          <RosterTab
            state={state}
            hasEmployeeManagement={hasEmployeeManagement}
          />
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
