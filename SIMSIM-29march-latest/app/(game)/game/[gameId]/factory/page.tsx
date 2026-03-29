"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { use } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTutorialStore } from "@/lib/stores/tutorialStore";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/section-header";
import { trpc } from "@/lib/api/trpc";
import { useDecisionStore } from "@/lib/stores/decisionStore";
import { DecisionSubmitBar } from "@/components/game/DecisionSubmitBar";
import { DecisionImpactPanel } from "@/components/game/DecisionImpactPanel";
import { WarningBanner } from "@/components/game/WarningBanner";
import { GamePageSkeleton } from "@/components/game/GamePageSkeleton";
import { ModuleRecap } from "@/components/game/ModuleRecap";
import { useFactoryPreview } from "@/lib/hooks/useFactoryPreview";
import { useCrossModuleWarnings } from "@/lib/hooks/useCrossModuleWarnings";
import { useMachineryAvailability, type MachineStatus } from "@/lib/hooks/useMachineryAvailability";
import { useFeatureFlag } from "@/lib/contexts/ComplexityContext";
import {
  Factory,
  Zap,
  Leaf,
  Plus,
  Cog,
  LayoutDashboard,
  CheckCircle2,
  TrendingUp,
  Settings,
  Package,
  Boxes,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import type { TeamState, Factory as FactoryType } from "@/engine/types";
import { CONSTANTS } from "@/engine/types";
import { getActiveSegments } from "@/lib/utils/stateHelpers";
import { toast } from "sonner";
import { getArchetype } from "@/engine/types/archetypes";
import { getMachineryRequirements } from "@/engine/types/machineryRequirements";
import { MACHINE_CONFIGS } from "@/engine/machinery";

// Tab components — 7-tab layout: Lines, Output, Capacity, Efficiency, Upgrades, ESG, Status
import { ProductionLinesTab } from "@/components/factory/ProductionLinesTab";
import { OutputTab } from "@/components/factory/OutputTab";
import { CapacityTab } from "@/components/factory/CapacityTab";
import { EfficiencyTab } from "@/components/factory/EfficiencyTab";
import { UpgradesTab } from "@/components/factory/UpgradesTab";
import { ESGTab } from "@/components/factory/ESGTab";
import { StatusTab } from "@/components/factory/StatusTab";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

// Default factory for when no state is loaded
const defaultFactory = {
  id: "factory-1",
  name: "Factory 1",
  region: "North America" as const,
  tier: "medium" as const,
  baseCapacity: 150000,
  efficiency: 0.70,
  workers: 50,
  engineers: 10,
  supervisors: 2,
  defectRate: 0.05,
  co2Emissions: 500,
  materialLevel: 1,
  shippingCost: 0,
  storageCost: 0,
  upgrades: [] as string[],
  productionLines: [] as FactoryType["productionLines"],
  efficiencyInvestment: { workers: 0, supervisors: 0, engineers: 0, machinery: 0, factory: 0 },
  greenInvestment: 0,
  burnoutRisk: 0,
  maintenanceBacklog: 0,
  utilization: 0.75,
} as FactoryType;

const regions = [
  { id: "north-america", name: "North America", laborCost: 1.0, tariff: 0 },
  { id: "europe", name: "Europe", laborCost: 1.2, tariff: 0.05 },
  { id: "asia", name: "Asia", laborCost: 0.6, tariff: 0.15 },
  { id: "latin-america", name: "Latin America", laborCost: 0.7, tariff: 0.10 },
];

const upgrades = [
  // === TIER 1: No R&D Required ===
  { id: "sixSigma", name: "Six Sigma Quality", cost: 75_000_000, description: "Advanced quality management system", benefits: ["40% defect reduction", "50% warranty cost reduction", "75% fewer recalls"], category: "quality", icon: CheckCircle2, tier: 1, rdRequired: null },
  { id: "warehousing", name: "Advanced Warehousing", cost: 100_000_000, description: "Smart warehouse automation", benefits: ["90% storage cost reduction", "90% demand spike capture", "Optimized inventory"], category: "efficiency", icon: Boxes, tier: 1, rdRequired: null },
  { id: "leanManufacturing", name: "Lean Manufacturing", cost: 40_000_000, description: "Toyota Production System principles", benefits: ["+15% efficiency", "-10% operating costs", "Reduced waste"], category: "efficiency", icon: TrendingUp, tier: 1, rdRequired: null },
  { id: "continuousImprovement", name: "Continuous Improvement", cost: 30_000_000, description: "Kaizen culture implementation", benefits: ["+1% efficiency/round", "Caps at +10% total", "Employee engagement"], category: "efficiency", icon: TrendingUp, tier: 1, rdRequired: null },
  // === TIER 2: Process Optimization Required ===
  { id: "automation", name: "Full Automation", cost: 75_000_000, description: "Advanced robotic production lines", benefits: ["80% fewer workers needed", "60% cost variance reduction", "24/7 operation"], category: "efficiency", icon: Settings, tier: 2, rdRequired: "Process Optimization" },
  { id: "materialRefinement", name: "Material Refinement", cost: 100_000_000, description: "Advanced material processing", benefits: ["+1 material level", "Higher quality products", "Premium pricing enabled"], category: "quality", icon: Package, tier: 2, rdRequired: "Process Optimization" },
  { id: "modularLines", name: "Modular Production Lines", cost: 80_000_000, description: "Reconfigurable manufacturing cells", benefits: ["-50% changeover time", "Flexible production", "Quick product switches"], category: "efficiency", icon: Cog, tier: 2, rdRequired: "Process Optimization" },
  { id: "waterRecycling", name: "Water Recycling", cost: 25_000_000, description: "Closed-loop water system", benefits: ["-30% water costs", "+50 ESG", "Reduced water usage"], category: "sustainability", icon: Leaf, tier: 2, rdRequired: "Process Optimization" },
  { id: "solarPanels", name: "Solar Panels", cost: 45_000_000, description: "Rooftop solar installation", benefits: ["-40% energy costs", "+100 ESG", "Green energy credits"], category: "sustainability", icon: Leaf, tier: 2, rdRequired: "Process Optimization" },
  // === TIER 3: Advanced Manufacturing Required ===
  { id: "supplyChain", name: "Supply Chain Optimization", cost: 200_000_000, description: "End-to-end supply chain visibility", benefits: ["70% shipping cost reduction", "70% stockout reduction", "Faster delivery"], category: "efficiency", icon: Factory, tier: 3, rdRequired: "Advanced Manufacturing" },
  { id: "digitalTwin", name: "Digital Twin", cost: 60_000_000, description: "Virtual factory simulation", benefits: ["-20% maintenance costs", "Predictive alerts", "Process optimization"], category: "maintenance", icon: Factory, tier: 3, rdRequired: "Advanced Manufacturing" },
  { id: "iotIntegration", name: "IoT Integration", cost: 50_000_000, description: "Connected sensors throughout factory", benefits: ["Real-time monitoring", "-15% breakdown risk", "Data-driven decisions"], category: "maintenance", icon: Factory, tier: 3, rdRequired: "Advanced Manufacturing" },
  { id: "wasteToEnergy", name: "Waste to Energy", cost: 35_000_000, description: "Convert waste to power", benefits: ["-20% waste costs", "+75 ESG", "Zero landfill"], category: "sustainability", icon: Zap, tier: 3, rdRequired: "Advanced Manufacturing" },
  { id: "smartGrid", name: "Smart Grid", cost: 55_000_000, description: "Intelligent energy management", benefits: ["-25% energy usage", "+80 ESG", "Peak load optimization"], category: "sustainability", icon: Zap, tier: 3, rdRequired: "Advanced Manufacturing" },
  { id: "rapidPrototyping", name: "Rapid Prototyping", cost: 40_000_000, description: "3D printing and fast iteration", benefits: ["-50% R&D prototype time", "+25% innovation", "Faster time-to-market"], category: "specialized", icon: Wrench, tier: 3, rdRequired: "Advanced Manufacturing" },
  // === TIER 4: Industry 4.0 Required ===
  { id: "advancedRobotics", name: "Advanced Robotics", cost: 100_000_000, description: "AI-powered production robots", benefits: ["+50% capacity", "-30% labor needs", "Precision manufacturing"], category: "capacity", icon: Settings, tier: 4, rdRequired: "Industry 4.0" },
  { id: "qualityLab", name: "Quality Laboratory", cost: 60_000_000, description: "In-house testing facility", benefits: ["-50% defect rate", "+30% QA speed", "Certified testing"], category: "quality", icon: CheckCircle2, tier: 4, rdRequired: "Industry 4.0" },
  { id: "carbonCapture", name: "Carbon Capture", cost: 70_000_000, description: "Direct air capture system", benefits: ["-50% CO2 emissions", "+150 ESG", "Carbon negative potential"], category: "sustainability", icon: Leaf, tier: 4, rdRequired: "Industry 4.0" },
  { id: "flexibleManufacturing", name: "Flexible Manufacturing", cost: 90_000_000, description: "Multi-product production system", benefits: ["All segments efficient", "-30% changeover", "Product mix flexibility"], category: "capacity", icon: Factory, tier: 4, rdRequired: "Industry 4.0" },
  // === TIER 5: Breakthrough Tech Required ===
  { id: "cleanRoom", name: "Clean Room", cost: 120_000_000, description: "ISO Class 5 clean room facility", benefits: ["+20% Professional pricing", "Medical/precision enabled", "Ultra-low defects"], category: "specialized", icon: ShieldAlert, tier: 5, rdRequired: "Breakthrough Technology" },
];

export default function FactoryPage({ params }: PageProps) {
  const { gameId } = use(params);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "lines";
  const [activeTab, setActiveTab] = useState(initialTab);
  const tutorialStep = useTutorialStore(s => s.isActive ? s.steps[s.currentStep] : null);
  useEffect(() => {
    if (tutorialStep?.targetTab) setActiveTab(tutorialStep.targetTab);
  }, [tutorialStep?.targetTab]);
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);
  const [selectedFactoryIndex, setSelectedFactoryIndex] = useState(0);

  // Feature flags
  const hasMultipleFactories = useFeatureFlag("multipleFactories");

  // Get decisions from store
  const { factory, setFactoryDecisions, submissionStatus, rd } = useDecisionStore();
  const router = useRouter();

  // Auto-navigate to Finance after successful Factory save
  const prevFactorySubmittedRef = useRef(submissionStatus.FACTORY?.isSubmitted);
  useEffect(() => {
    const wasSubmitted = prevFactorySubmittedRef.current;
    const isNowSubmitted = submissionStatus.FACTORY?.isSubmitted;
    prevFactorySubmittedRef.current = isNowSubmitted;
    if (!wasSubmitted && isNowSubmitted) {
      setUpgradePurchases([]);
      setNewFactories([]);
      const basePath = gameId === "demo" ? "/demo" : `/game/${gameId}`;
      toast.info("Factory saved! Head to Finance to set pricing and review your budget.", { duration: 5000 });
      setTimeout(() => { router.push(`${basePath}/finance`); }, 1500);
    }
  }, [submissionStatus.FACTORY?.isSubmitted, gameId, router]);

  // Local state for form inputs (synced with store)
  const [efficiencyInvestment, setEfficiencyInvestment] = useState(factory.efficiencyInvestment);
  const [esgInvestment, setEsgInvestment] = useState(factory.esgInvestment);
  const [productionAllocations, setProductionAllocations] = useState(factory.productionAllocations);
  const [upgradePurchases, setUpgradePurchases] = useState<Array<{ factoryId: string; upgradeName: string }>>(factory.upgradePurchases);
  const [newFactories, setNewFactories] = useState<Array<{ region: string; name: string }>>(factory.newFactories);
  const [maintenanceInvestment, setMaintenanceInvestment] = useState(0);
  const [shiftMode, setShiftMode] = useState<"single" | "double" | "overtime">("single");
  const [activeEsgInitiatives, setActiveEsgInitiatives] = useState<string[]>([]);

  const toggleEsgInitiative = (id: string) => {
    setActiveEsgInitiatives(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Production line decisions state
  const [lineTargets, setLineTargets] = useState<Record<string, number>>({});
  const [lineProductAssignments, setLineProductAssignments] = useState<Record<string, string>>({});

  // Sync store changes to local state
  useEffect(() => { if (JSON.stringify(factory.efficiencyInvestment) !== JSON.stringify(efficiencyInvestment)) setEfficiencyInvestment(factory.efficiencyInvestment); }, [factory.efficiencyInvestment]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (factory.esgInvestment !== esgInvestment) setEsgInvestment(factory.esgInvestment); }, [factory.esgInvestment]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (JSON.stringify(factory.productionAllocations) !== JSON.stringify(productionAllocations)) setProductionAllocations(factory.productionAllocations); }, [factory.productionAllocations]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (JSON.stringify(factory.upgradePurchases) !== JSON.stringify(upgradePurchases)) setUpgradePurchases(factory.upgradePurchases); }, [factory.upgradePurchases]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (JSON.stringify(factory.newFactories) !== JSON.stringify(newFactories)) setNewFactories(factory.newFactories); }, [factory.newFactories]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state changes to store
  useEffect(() => { setFactoryDecisions({ efficiencyInvestment }); }, [efficiencyInvestment, setFactoryDecisions]);
  useEffect(() => { setFactoryDecisions({ esgInvestment }); }, [esgInvestment, setFactoryDecisions]);
  useEffect(() => { setFactoryDecisions({ productionAllocations }); }, [productionAllocations, setFactoryDecisions]);
  useEffect(() => { setFactoryDecisions({ upgradePurchases }); }, [upgradePurchases, setFactoryDecisions]);
  useEffect(() => { setFactoryDecisions({ newFactories }); }, [newFactories, setFactoryDecisions]);

  // Build production line decisions from local state
  const productionLineDecisions = useMemo(() => {
    const targets = Object.entries(lineTargets).filter(([, target]) => target > 0).map(([lineId, targetOutput]) => ({ lineId, targetOutput }));
    const assignments = Object.entries(lineProductAssignments).filter(([, productId]) => productId).map(([lineId, productId]) => ({ lineId, productId }));
    return (targets.length > 0 || assignments.length > 0) ? { targets, assignments } : undefined;
  }, [lineTargets, lineProductAssignments]);

  useEffect(() => { if (productionLineDecisions) setFactoryDecisions({ productionLineDecisions }); }, [productionLineDecisions, setFactoryDecisions]);
  useEffect(() => { setFactoryDecisions({ maintenanceInvestment } as Record<string, unknown>); }, [maintenanceInvestment, setFactoryDecisions]);
  useEffect(() => { setFactoryDecisions({ esgInitiatives: activeEsgInitiatives } as Record<string, unknown>); }, [activeEsgInitiatives, setFactoryDecisions]);
  useEffect(() => { setFactoryDecisions({ shiftMode } as Record<string, unknown>); }, [shiftMode, setFactoryDecisions]);

  // Get current decisions for submission
  const getDecisions = useCallback(() => ({
    efficiencyInvestment,
    esgInvestment,
    productionAllocations,
    upgradePurchases,
    newFactories,
    productionLineDecisions,
    maintenanceInvestment,
    shiftMode,
    esgInitiatives: activeEsgInitiatives.reduce((acc: Record<string, boolean>, id: string) => { acc[id] = true; return acc; }, {}),
  }), [efficiencyInvestment, esgInvestment, productionAllocations, upgradePurchases, newFactories, productionLineDecisions, maintenanceInvestment, activeEsgInitiatives]);

  const { data: teamState, isLoading } = trpc.team.getMyState.useQuery();
  const { data: materialsState } = trpc.material.getMaterialsState.useQuery();

  // Parse the team state JSON
  const state: TeamState | null = useMemo(() => {
    if (!teamState?.state) return null;
    try {
      return typeof teamState.state === 'string' ? JSON.parse(teamState.state) as TeamState : teamState.state as TeamState;
    } catch { return null; }
  }, [teamState?.state]);

  // Parse market state for demand data
  const marketState = useMemo(() => {
    if (!teamState?.marketState) return null;
    try {
      return typeof teamState.marketState === "string"
        ? JSON.parse(teamState.marketState)
        : teamState.marketState;
    } catch { return null; }
  }, [teamState?.marketState]);

  // Derive which segments have launched products
  const activeSegments = useMemo(() => {
    if (!state) return new Set<string>();
    return new Set<string>(getActiveSegments(state));
  }, [state]);

  // Auto-distribute allocation evenly among active segments
  const activeSegmentCountRef = useRef(0);
  useEffect(() => {
    if (activeSegments.size === 0) return;
    if (activeSegments.size === activeSegmentCountRef.current) return;
    activeSegmentCountRef.current = activeSegments.size;
    const perSegment = Math.floor(100 / activeSegments.size);
    const remainder = 100 - perSegment * activeSegments.size;
    const newAllocations: Record<string, number> = {};
    let i = 0;
    for (const seg of CONSTANTS.SEGMENTS) {
      if (activeSegments.has(seg)) { newAllocations[seg] = perSegment + (i === 0 ? remainder : 0); i++; }
      else { newAllocations[seg] = 0; }
    }
    setProductionAllocations(newAllocations);
  }, [activeSegments]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-module warnings
  const warnings = useCrossModuleWarnings(state, "factory");

  // Preview hook for live impact
  const factoryPreview = useFactoryPreview(state, { efficiencyInvestment, esgInvestment, productionAllocations, upgradePurchases, newFactories });

  // Get factories from state or use default
  const factories = state?.factories || [defaultFactory];
  const selectedFactory = factories[selectedFactoryIndex] || defaultFactory;

  // Compute required machinery based on R&D pending products
  const requiredMachinery = useMemo(() => {
    const products = rd.newProducts || [];
    if (products.length === 0) return [];
    let maxTier = 0;
    const productNames: string[] = [];
    for (const product of products) {
      if (product.archetypeId) {
        const archetype = getArchetype(product.archetypeId);
        if (archetype) { maxTier = Math.max(maxTier, archetype.tier); productNames.push(archetype.name); }
      } else { productNames.push(product.name); }
    }
    const requirements = getMachineryRequirements(maxTier);
    const ownedUpgrades = selectedFactory.upgrades || [];
    return requirements.map((req) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const installed = ownedUpgrades.includes(req.machineType as any);
      const pending = upgradePurchases.some((u) => u.factoryId === selectedFactory.id && u.upgradeName === req.machineType);
      return { ...req, installed: !!installed, pending, productNames };
    });
  }, [rd.newProducts, upgradePurchases, selectedFactory.upgrades, selectedFactory.id]);

  // Machinery availability from R&D level / material tier
  const machineStatuses = useMachineryAvailability(state);
  const machineStatusMap = useMemo(() => {
    const map = new Map<string, MachineStatus>();
    for (const ms of machineStatuses) map.set(ms.machineType, ms);
    return map;
  }, [machineStatuses]);

  // Calculate equipment health metrics
  const equipmentHealth = useMemo(() => {
    const f = selectedFactory as FactoryType & { burnoutRisk?: number; maintenanceBacklog?: number; utilization?: number };
    const backlogPenalty = Math.min(30, (f.maintenanceBacklog || 0) / 100);
    const burnoutPenalty = Math.min(20, (f.burnoutRisk || 0) * 100);
    const health = Math.max(0, 100 - backlogPenalty - burnoutPenalty);
    const baseBreakdownRisk = 3;
    const backlogImpact = (f.maintenanceBacklog || 0) / 1000 * 5;
    const breakdownRisk = Math.min(50, baseBreakdownRisk + backlogImpact + burnoutPenalty / 2);
    return { health, breakdownRisk, maintenanceBacklog: f.maintenanceBacklog || 0, burnoutRisk: f.burnoutRisk || 0, utilization: f.utilization || 0.75 };
  }, [selectedFactory]);

  // Calculate total capacity from production lines
  const totalCapacity = useMemo(() => {
    return selectedFactory.productionLines?.reduce((sum, line) => sum + (line.capacity || 0), 0) || 50000;
  }, [selectedFactory.productionLines]);

  // Calculate inventory totals
  const inventoryTotals = useMemo(() => {
    if (!state?.inventory) return { finishedGoods: 0, rawMaterials: 0, workInProgress: 0 };
    const finishedGoods = Object.values(state.inventory.finishedGoods || {}).reduce((sum, val) => sum + (val || 0), 0);
    return { finishedGoods, rawMaterials: state.inventory.rawMaterials || 0, workInProgress: state.inventory.workInProgress || 0 };
  }, [state?.inventory]);

  const totalAllocation = useMemo(() => {
    return Object.entries(productionAllocations).filter(([seg]) => activeSegments.has(seg)).reduce((sum, [, val]) => sum + val, 0);
  }, [productionAllocations, activeSegments]);

  // Check if an upgrade/machine is already purchased or pending
  const isUpgradePurchased = (upgradeId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const installedUpgrade = selectedFactory.upgrades?.includes(upgradeId as any);
    const ownedMachines = state?.machineryStates?.[selectedFactory.id]?.machines ?? [];
    const installedMachine = ownedMachines.some(m => m.type === upgradeId);
    const installed = installedUpgrade || installedMachine;
    const pending = upgradePurchases.some(u => u.factoryId === selectedFactory.id && u.upgradeName === upgradeId);
    return { installed, pending };
  };

  // Toggle upgrade purchase
  const toggleUpgradePurchase = (upgradeId: string) => {
    const { installed } = isUpgradePurchased(upgradeId);
    const isMachineType = ["assembly_line", "injection_molder", "pcb_assembler", "robotic_arm", "conveyor_system", "packaging_system", "quality_scanner", "clean_room_unit"].includes(upgradeId);
    if (installed && !isMachineType) return;
    const pending = upgradePurchases.some(u => u.factoryId === selectedFactory.id && u.upgradeName === upgradeId);
    if (pending) {
      setUpgradePurchases(prev => prev.filter(u => !(u.factoryId === selectedFactory.id && u.upgradeName === upgradeId)));
    } else {
      setUpgradePurchases(prev => [...prev, { factoryId: selectedFactory.id, upgradeName: upgradeId }]);
    }
  };

  // Toggle new factory order
  const toggleNewFactory = (regionId: string) => {
    const pending = newFactories.some(f => f.region === regionId);
    if (pending) {
      setNewFactories(prev => prev.filter(f => f.region !== regionId));
    } else {
      setNewFactories(prev => [...prev, { region: regionId, name: `Factory ${factories.length + newFactories.length + 1}` }]);
    }
  };

  // Loading state
  if (isLoading) return <GamePageSkeleton statCards={4} sections={2} />;

  const currentRound = teamState?.game?.currentRound ?? 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Factory Management"
        subtitle="Monitor equipment health, optimize production, and manage upgrades"
        icon={<Factory className="w-7 h-7" />}
        iconColor="text-orange-400"
        action={
          hasMultipleFactories && (
            <Button className="bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-600/20">
              <Plus className="w-4 h-4 mr-2" />
              Build New Factory
            </Button>
          )
        }
      />

      {/* Cross-module warnings */}
      <WarningBanner warnings={warnings} />

      {/* Last round recap */}
      <ModuleRecap module="factory" currentRound={currentRound} state={state} history={[]} />

      {/* Factory Selector */}
      <div className="flex gap-2 flex-wrap">
        {factories.map((f, idx) => (
          <Button
            key={f.id}
            variant="outline"
            className={idx === selectedFactoryIndex
              ? "bg-orange-600/20 border-orange-500 text-orange-400"
              : "border-slate-600 text-slate-400 hover:border-orange-500"
            }
            onClick={() => setSelectedFactoryIndex(idx)}
          >
            {f.name} - {f.region}
          </Button>
        ))}
      </div>

      {/* Main Tabs — 7-tab layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700 flex-wrap">
          <TabsTrigger value="lines" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95">
            <Package className="w-4 h-4 mr-2 inline-block" />
            Lines
          </TabsTrigger>
          <TabsTrigger value="capacity" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95">
            <Cog className="w-4 h-4 mr-2 inline-block" />
            Capacity
          </TabsTrigger>
          <TabsTrigger value="efficiency" className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95">
            <Zap className="w-4 h-4 mr-2 inline-block" />
            Efficiency
          </TabsTrigger>
          <TabsTrigger value="upgrades" className="data-[state=active]:bg-pink-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95">
            <Wrench className="w-4 h-4 mr-2 inline-block" />
            Upgrades
          </TabsTrigger>
          <TabsTrigger value="esg" className="data-[state=active]:bg-green-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95">
            <Leaf className="w-4 h-4 mr-2 inline-block" />
            ESG
          </TabsTrigger>
          <TabsTrigger value="output" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95">
            <TrendingUp className="w-4 h-4 mr-2 inline-block" />
            Output
          </TabsTrigger>
          <TabsTrigger value="status" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95">
            <LayoutDashboard className="w-4 h-4 mr-2 inline-block" />
            Status
          </TabsTrigger>
        </TabsList>

        {/* Production Lines Tab — per-line worker/machine management */}
        <TabsContent value="lines" className="space-y-6">
          <ProductionLinesTab
            selectedFactory={selectedFactory}
            state={state}
            factoryPreview={factoryPreview}
            onAssignProduct={(lineId, productId, segment) => {
              setLineProductAssignments(prev => ({ ...prev, [lineId]: productId }));
            }}
            onSetWorkers={(lineId, workers) => {
              const prev = (productionLineDecisions as Record<string, unknown>)?.staffing as Array<{ lineId: string; workers: number; engineers: number; supervisors: number }> | undefined;
              setFactoryDecisions({
                productionLineDecisions: {
                  ...productionLineDecisions,
                  staffing: [
                    ...(prev?.filter(s => s.lineId !== lineId) || []),
                    { lineId, workers, engineers: 0, supervisors: 0 },
                  ],
                },
              } as Record<string, unknown>);
            }}
            onSetTarget={(lineId, target) => {
              setLineTargets(prev => ({ ...prev, [lineId]: target }));
            }}
            onActivateLine={(lineId) => {
              setFactoryDecisions({
                productionLineDecisions: {
                  ...productionLineDecisions,
                  assignments: [
                    ...(productionLineDecisions?.assignments?.filter((a: { lineId: string }) => a.lineId !== lineId) || []),
                    { lineId, productId: "activate" },
                  ],
                },
              } as Record<string, unknown>);
            }}
            shiftMode={shiftMode}
            setShiftMode={setShiftMode}
            marketState={marketState}
          />
        </TabsContent>

        {/* Capacity Tab */}
        <TabsContent value="capacity" className="space-y-6">
          <CapacityTab
            selectedFactory={selectedFactory}
            state={state}
            toggleUpgradePurchase={toggleUpgradePurchase}
            isUpgradePurchased={isUpgradePurchased}
            newFactories={newFactories}
            toggleNewFactory={toggleNewFactory}
            setActiveTab={setActiveTab}
            upgradePurchases={upgradePurchases}
          />
        </TabsContent>

        {/* Efficiency Tab */}
        <TabsContent value="efficiency" className="space-y-6">
          <EfficiencyTab
            selectedFactory={selectedFactory}
            efficiencyInvestment={efficiencyInvestment}
            setEfficiencyInvestment={setEfficiencyInvestment}
            maintenanceInvestment={maintenanceInvestment}
            setMaintenanceInvestment={setMaintenanceInvestment}
            equipmentHealth={equipmentHealth}
          />
        </TabsContent>

        {/* Upgrades Tab */}
        <TabsContent value="upgrades" className="space-y-6">
          <UpgradesTab
            state={state}
            selectedFactory={selectedFactory}
            upgradePurchases={upgradePurchases}
            toggleUpgradePurchase={toggleUpgradePurchase}
            isUpgradePurchased={isUpgradePurchased}
            newFactories={newFactories}
            toggleNewFactory={toggleNewFactory}
            upgrades={upgrades}
            regions={regions}
          />
        </TabsContent>

        {/* ESG Tab */}
        <TabsContent value="esg" className="space-y-6">
          <ESGTab
            selectedFactory={selectedFactory}
            state={state}
            teamState={teamState as Record<string, unknown> | null}
            esgInvestment={esgInvestment}
            setEsgInvestment={setEsgInvestment}
            activeEsgInitiatives={activeEsgInitiatives}
            toggleEsgInitiative={toggleEsgInitiative}
          />
        </TabsContent>

        {/* Output Tab — production vs demand, cost breakdown */}
        <TabsContent value="output" className="space-y-6">
          <OutputTab
            selectedFactory={selectedFactory}
            state={state}
            activeSegments={activeSegments}
            setActiveTab={setActiveTab}
            factoryPreview={factoryPreview}
            marketState={marketState}
            shiftMode={shiftMode}
            setShiftMode={setShiftMode}
            productionAllocations={productionAllocations}
            setProductionAllocations={setProductionAllocations}
          />
        </TabsContent>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-6">
          <StatusTab
            selectedFactory={selectedFactory}
            state={state}
            equipmentHealth={equipmentHealth}
          />
        </TabsContent>
      </Tabs>

      {/* Decision Impact Preview */}
      <DecisionImpactPanel
        moduleName="Factory"
        costs={factoryPreview.costs}
        messages={factoryPreview.messages}
        cashRemaining={state ? state.cash - factoryPreview.costs : undefined}
      />

      {/* Decision Submit Bar */}
      <DecisionSubmitBar
        module="FACTORY"
        getDecisions={getDecisions}
        disabled={activeSegments.size > 0 && totalAllocation !== 100}
        disabledReason={activeSegments.size > 0 && totalAllocation !== 100 ? `Allocation must equal 100% (currently ${totalAllocation}%)` : undefined}
      />

      {/* Spacer for fixed submit bar */}
      <div className="h-20" />
    </div>
  );
}
