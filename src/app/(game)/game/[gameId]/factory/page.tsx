"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { use } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { PageHeader, SectionHeader } from "@/components/ui/section-header";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/api/trpc";
import { useDecisionStore } from "@/lib/stores/decisionStore";
import { DecisionSubmitBar } from "@/components/game/DecisionSubmitBar";
import { useFeatureFlag } from "@/lib/contexts/ComplexityContext";
import {
  Factory,
  Settings,
  Zap,
  Leaf,
  Package,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Wrench,
  Boxes,
  Activity,
  ShieldAlert,
  Gauge,
  Users,
  Cog,
  BarChart3,
  Ship,
  Plane,
  Truck,
  Clock,
  MapPin,
  Percent,
  TrendingDown,
  ShoppingCart,
  Globe,
  LayoutDashboard,
  Lock,
} from "lucide-react";
import type { TeamState, Factory as FactoryType, Segment } from "@/engine/types";
import {
  LogisticsEngine,
  SHIPPING_ROUTES,
  SHIPPING_METHODS,
  MAJOR_PORTS,
  type ShippingMethod,
} from "@/engine/logistics";
import {
  MaterialEngine,
  DEFAULT_SUPPLIERS,
  REGIONAL_CAPABILITIES,
  type Material,
  type MaterialInventory,
  type MaterialOrder,
  type Supplier,
  type Region,
  type MaterialType,
} from "@/engine/materials";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

// Default factory for when no state is loaded
const defaultFactory = {
  id: "factory-1",
  name: "Factory 1",
  region: "North America" as const,
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
};

const regions = [
  { id: "north-america", name: "North America", laborCost: 1.0, tariff: 0 },
  { id: "europe", name: "Europe", laborCost: 1.2, tariff: 0.05 },
  { id: "asia", name: "Asia", laborCost: 0.6, tariff: 0.15 },
  { id: "latin-america", name: "Latin America", laborCost: 0.7, tariff: 0.10 },
];

const REGION_OPTIONS: Region[] = [
  "North America",
  "South America",
  "Europe",
  "Africa",
  "Asia",
  "Oceania",
  "Middle East"
];

const METHOD_ICONS: Record<ShippingMethod, React.ElementType> = {
  sea: Ship,
  air: Plane,
  land: Truck,
  rail: TrendingUp,
};

const METHOD_COLORS: Record<ShippingMethod, string> = {
  sea: "text-blue-500",
  air: "text-purple-500",
  land: "text-green-500",
  rail: "text-orange-500",
};

const SEGMENT_OPTIONS: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

const MATERIAL_ICONS: Record<MaterialType, React.ElementType> = {
  display: Globe,
  processor: Factory,
  memory: Boxes,
  storage: Package,
  camera: Globe,
  battery: TrendingUp,
  chassis: Package,
  other: Boxes,
};

const upgrades = [
  // === TIER 1: No R&D Required ===
  {
    id: "sixSigma",
    name: "Six Sigma Quality",
    cost: 75_000_000,
    description: "Advanced quality management system",
    benefits: ["40% defect reduction", "50% warranty cost reduction", "75% fewer recalls"],
    category: "quality",
    icon: CheckCircle2,
    tier: 1,
    rdRequired: null,
  },
  {
    id: "warehousing",
    name: "Advanced Warehousing",
    cost: 100_000_000,
    description: "Smart warehouse automation",
    benefits: ["90% storage cost reduction", "90% demand spike capture", "Optimized inventory"],
    category: "efficiency",
    icon: Boxes,
    tier: 1,
    rdRequired: null,
  },
  {
    id: "leanManufacturing",
    name: "Lean Manufacturing",
    cost: 40_000_000,
    description: "Toyota Production System principles",
    benefits: ["+15% efficiency", "-10% operating costs", "Reduced waste"],
    category: "efficiency",
    icon: TrendingUp,
    tier: 1,
    rdRequired: null,
  },
  {
    id: "continuousImprovement",
    name: "Continuous Improvement",
    cost: 30_000_000,
    description: "Kaizen culture implementation",
    benefits: ["+1% efficiency/round", "Caps at +10% total", "Employee engagement"],
    category: "efficiency",
    icon: TrendingUp,
    tier: 1,
    rdRequired: null,
  },
  // === TIER 2: Process Optimization Required (R&D Level 1) ===
  {
    id: "automation",
    name: "Full Automation",
    cost: 75_000_000,
    description: "Advanced robotic production lines",
    benefits: ["80% fewer workers needed", "60% cost variance reduction", "24/7 operation"],
    category: "efficiency",
    icon: Settings,
    tier: 2,
    rdRequired: "Process Optimization",
  },
  {
    id: "materialRefinement",
    name: "Material Refinement",
    cost: 100_000_000,
    description: "Advanced material processing",
    benefits: ["+1 material level", "Higher quality products", "Premium pricing enabled"],
    category: "quality",
    icon: Package,
    tier: 2,
    rdRequired: "Process Optimization",
  },
  {
    id: "modularLines",
    name: "Modular Production Lines",
    cost: 80_000_000,
    description: "Reconfigurable manufacturing cells",
    benefits: ["-50% changeover time", "Flexible production", "Quick product switches"],
    category: "efficiency",
    icon: Cog,
    tier: 2,
    rdRequired: "Process Optimization",
  },
  {
    id: "waterRecycling",
    name: "Water Recycling",
    cost: 25_000_000,
    description: "Closed-loop water system",
    benefits: ["-30% water costs", "+50 ESG", "Reduced water usage"],
    category: "sustainability",
    icon: Leaf,
    tier: 2,
    rdRequired: "Process Optimization",
  },
  {
    id: "solarPanels",
    name: "Solar Panels",
    cost: 45_000_000,
    description: "Rooftop solar installation",
    benefits: ["-40% energy costs", "+100 ESG", "Green energy credits"],
    category: "sustainability",
    icon: Leaf,
    tier: 2,
    rdRequired: "Process Optimization",
  },
  // === TIER 3: Advanced Manufacturing Required (R&D Level 2) ===
  {
    id: "supplyChain",
    name: "Supply Chain Optimization",
    cost: 200_000_000,
    description: "End-to-end supply chain visibility",
    benefits: ["70% shipping cost reduction", "70% stockout reduction", "Faster delivery"],
    category: "efficiency",
    icon: Truck,
    tier: 3,
    rdRequired: "Advanced Manufacturing",
  },
  {
    id: "digitalTwin",
    name: "Digital Twin",
    cost: 60_000_000,
    description: "Virtual factory simulation",
    benefits: ["-20% maintenance costs", "Predictive alerts", "Process optimization"],
    category: "maintenance",
    icon: Activity,
    tier: 3,
    rdRequired: "Advanced Manufacturing",
  },
  {
    id: "iotIntegration",
    name: "IoT Integration",
    cost: 50_000_000,
    description: "Connected sensors throughout factory",
    benefits: ["Real-time monitoring", "-15% breakdown risk", "Data-driven decisions"],
    category: "maintenance",
    icon: Globe,
    tier: 3,
    rdRequired: "Advanced Manufacturing",
  },
  {
    id: "wasteToEnergy",
    name: "Waste to Energy",
    cost: 35_000_000,
    description: "Convert waste to power",
    benefits: ["-20% waste costs", "+75 ESG", "Zero landfill"],
    category: "sustainability",
    icon: Zap,
    tier: 3,
    rdRequired: "Advanced Manufacturing",
  },
  {
    id: "smartGrid",
    name: "Smart Grid",
    cost: 55_000_000,
    description: "Intelligent energy management",
    benefits: ["-25% energy usage", "+80 ESG", "Peak load optimization"],
    category: "sustainability",
    icon: Zap,
    tier: 3,
    rdRequired: "Advanced Manufacturing",
  },
  {
    id: "rapidPrototyping",
    name: "Rapid Prototyping",
    cost: 40_000_000,
    description: "3D printing and fast iteration",
    benefits: ["-50% R&D prototype time", "+25% innovation", "Faster time-to-market"],
    category: "specialized",
    icon: Wrench,
    tier: 3,
    rdRequired: "Advanced Manufacturing",
  },
  // === TIER 4: Industry 4.0 Required (R&D Level 3) ===
  {
    id: "advancedRobotics",
    name: "Advanced Robotics",
    cost: 100_000_000,
    description: "AI-powered production robots",
    benefits: ["+50% capacity", "-30% labor needs", "Precision manufacturing"],
    category: "capacity",
    icon: Settings,
    tier: 4,
    rdRequired: "Industry 4.0",
  },
  {
    id: "qualityLab",
    name: "Quality Laboratory",
    cost: 60_000_000,
    description: "In-house testing facility",
    benefits: ["-50% defect rate", "+30% QA speed", "Certified testing"],
    category: "quality",
    icon: CheckCircle2,
    tier: 4,
    rdRequired: "Industry 4.0",
  },
  {
    id: "carbonCapture",
    name: "Carbon Capture",
    cost: 70_000_000,
    description: "Direct air capture system",
    benefits: ["-50% CO2 emissions", "+150 ESG", "Carbon negative potential"],
    category: "sustainability",
    icon: Leaf,
    tier: 4,
    rdRequired: "Industry 4.0",
  },
  {
    id: "flexibleManufacturing",
    name: "Flexible Manufacturing",
    cost: 90_000_000,
    description: "Multi-product production system",
    benefits: ["All segments efficient", "-30% changeover", "Product mix flexibility"],
    category: "capacity",
    icon: Factory,
    tier: 4,
    rdRequired: "Industry 4.0",
  },
  // === TIER 5: Breakthrough Tech Required (R&D Level 4) ===
  {
    id: "cleanRoom",
    name: "Clean Room",
    cost: 120_000_000,
    description: "ISO Class 5 clean room facility",
    benefits: ["+20% Professional pricing", "Medical/precision enabled", "Ultra-low defects"],
    category: "specialized",
    icon: ShieldAlert,
    tier: 5,
    rdRequired: "Breakthrough Technology",
  },
];

export default function FactoryPage({ params }: PageProps) {
  const { gameId } = use(params);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedFactoryIndex, setSelectedFactoryIndex] = useState(0);

  // Feature flags
  const hasInventoryManagement = useFeatureFlag("inventoryManagement");
  const hasMultipleFactories = useFeatureFlag("multipleFactories");

  // Get decisions from store
  const { factory, setFactoryDecisions, submissionStatus } = useDecisionStore();

  // Local state for form inputs (synced with store)
  const [efficiencyInvestment, setEfficiencyInvestment] = useState(factory.efficiencyInvestment);
  const [esgInvestment, setEsgInvestment] = useState(factory.esgInvestment);
  const [productionAllocations, setProductionAllocations] = useState(factory.productionAllocations);
  const [upgradePurchases, setUpgradePurchases] = useState<Array<{ factoryId: string; upgradeName: string }>>(factory.upgradePurchases);
  const [newFactories, setNewFactories] = useState<Array<{ region: string; name: string }>>(factory.newFactories);
  const [maintenanceInvestment, setMaintenanceInvestment] = useState(0);

  // Logistics state
  const [fromRegion, setFromRegion] = useState<Region>("Asia");
  const [toRegion, setToRegion] = useState<Region>("North America");
  const [weight, setWeight] = useState<number>(2.5);
  const [volume, setVolume] = useState<number>(15);

  // Supply chain state
  const [selectedSegment, setSelectedSegment] = useState<Segment>("General");
  const [selectedMaterialType, setSelectedMaterialType] = useState<MaterialType>("display");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [orderQuantity, setOrderQuantity] = useState<number>(10000);
  const [shippingMethod, setShippingMethod] = useState<"sea" | "air" | "land" | "rail">("sea");

  // Sync store changes to local state (for when decisions are loaded from server)
  useEffect(() => {
    if (JSON.stringify(factory.efficiencyInvestment) !== JSON.stringify(efficiencyInvestment)) {
      setEfficiencyInvestment(factory.efficiencyInvestment);
    }
  }, [factory.efficiencyInvestment]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (factory.esgInvestment !== esgInvestment) {
      setEsgInvestment(factory.esgInvestment);
    }
  }, [factory.esgInvestment]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (JSON.stringify(factory.productionAllocations) !== JSON.stringify(productionAllocations)) {
      setProductionAllocations(factory.productionAllocations);
    }
  }, [factory.productionAllocations]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (JSON.stringify(factory.upgradePurchases) !== JSON.stringify(upgradePurchases)) {
      setUpgradePurchases(factory.upgradePurchases);
    }
  }, [factory.upgradePurchases]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (JSON.stringify(factory.newFactories) !== JSON.stringify(newFactories)) {
      setNewFactories(factory.newFactories);
    }
  }, [factory.newFactories]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state changes to store
  useEffect(() => {
    setFactoryDecisions({ efficiencyInvestment });
  }, [efficiencyInvestment, setFactoryDecisions]);

  useEffect(() => {
    setFactoryDecisions({ esgInvestment });
  }, [esgInvestment, setFactoryDecisions]);

  useEffect(() => {
    setFactoryDecisions({ productionAllocations });
  }, [productionAllocations, setFactoryDecisions]);

  useEffect(() => {
    setFactoryDecisions({ upgradePurchases });
  }, [upgradePurchases, setFactoryDecisions]);

  useEffect(() => {
    setFactoryDecisions({ newFactories });
  }, [newFactories, setFactoryDecisions]);

  // Get current decisions for submission
  const getDecisions = useCallback(() => ({
    efficiencyInvestment,
    esgInvestment,
    productionAllocations,
    upgradePurchases,
    newFactories,
  }), [efficiencyInvestment, esgInvestment, productionAllocations, upgradePurchases, newFactories]);

  const { data: teamState, isLoading } = trpc.team.getMyState.useQuery();
  const { data: materialsState, isLoading: materialsLoading } = trpc.material.getMaterialsState.useQuery();

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

  // Get factories from state or use default
  const factories = state?.factories || [defaultFactory];
  const selectedFactory = factories[selectedFactoryIndex] || defaultFactory;

  // Calculate equipment health metrics
  const equipmentHealth = useMemo(() => {
    const factory = selectedFactory as FactoryType & { burnoutRisk?: number; maintenanceBacklog?: number; utilization?: number };
    const backlogPenalty = Math.min(30, (factory.maintenanceBacklog || 0) / 100);
    const burnoutPenalty = Math.min(20, (factory.burnoutRisk || 0) * 100);
    const health = Math.max(0, 100 - backlogPenalty - burnoutPenalty);

    const baseBreakdownRisk = 3;
    const backlogImpact = (factory.maintenanceBacklog || 0) / 1000 * 5;
    const breakdownRisk = Math.min(50, baseBreakdownRisk + backlogImpact + burnoutPenalty / 2);

    return {
      health,
      breakdownRisk,
      maintenanceBacklog: factory.maintenanceBacklog || 0,
      burnoutRisk: factory.burnoutRisk || 0,
      utilization: factory.utilization || 0.75,
    };
  }, [selectedFactory]);

  // Calculate total capacity from production lines
  const totalCapacity = useMemo(() => {
    return selectedFactory.productionLines?.reduce((sum, line) => sum + (line.capacity || 0), 0) || 50000;
  }, [selectedFactory.productionLines]);

  // Calculate inventory totals
  const inventoryTotals = useMemo(() => {
    if (!state?.inventory) return { finishedGoods: 0, rawMaterials: 0, workInProgress: 0 };
    const finishedGoods = Object.values(state.inventory.finishedGoods || {}).reduce((sum, val) => sum + (val || 0), 0);
    return {
      finishedGoods,
      rawMaterials: state.inventory.rawMaterials || 0,
      workInProgress: state.inventory.workInProgress || 0,
    };
  }, [state?.inventory]);

  const totalAllocation = Object.values(productionAllocations).reduce((a, b) => a + b, 0);

  // Logistics calculations
  const logistics = useMemo(() => {
    try {
      return LogisticsEngine.compareShippingOptions(fromRegion, toRegion, weight, volume, 20);
    } catch (error) {
      return [];
    }
  }, [fromRegion, toRegion, weight, volume]);

  const logisticsRecommendations = useMemo(() => {
    try {
      return LogisticsEngine.getRecommendations(fromRegion, toRegion, weight, volume, 20000, 30);
    } catch (error) {
      return null;
    }
  }, [fromRegion, toRegion, weight, volume]);

  const logisticsStats = useMemo(() => {
    if (logistics.length === 0) return null;
    const best = logistics[0];
    const cheapest = [...logistics].sort((a, b) => a.logistics.totalLogisticsCost - b.logistics.totalLogisticsCost)[0];
    const fastest = [...logistics].sort((a, b) => a.logistics.totalLeadTime - b.logistics.totalLeadTime)[0];
    return {
      recommended: best,
      cheapest,
      fastest,
      avgCost: logistics.reduce((sum, l) => sum + l.logistics.totalLogisticsCost, 0) / logistics.length,
      avgTime: logistics.reduce((sum, l) => sum + l.logistics.totalLeadTime, 0) / logistics.length,
    };
  }, [logistics]);

  // Supply chain calculations
  const inventory = materialsState?.inventory ?? [];
  const activeOrders = materialsState?.activeOrders ?? [];
  const teamRegion: Region = materialsState?.region ?? "North America";
  const cash = state?.cash ?? 0;

  const requirements = useMemo(
    () => MaterialEngine.getMaterialRequirements(selectedSegment),
    [selectedSegment]
  );

  const availableSuppliers = useMemo(() => {
    return DEFAULT_SUPPLIERS.filter(s => s.materials.includes(selectedMaterialType));
  }, [selectedMaterialType]);

  const supplierDetails = useMemo(() => {
    return DEFAULT_SUPPLIERS.find(s => s.id === selectedSupplier);
  }, [selectedSupplier]);

  const orderPreview = useMemo(() => {
    if (!supplierDetails) return null;
    const material = requirements.materials.find(m => m.type === selectedMaterialType);
    if (!material) return null;
    const regional = REGIONAL_CAPABILITIES[supplierDetails.region];
    const baseCost = material.costPerUnit * regional.costMultiplier;
    const materialCost = baseCost * orderQuantity;
    const weight = orderQuantity * 0.001;
    const volume = orderQuantity * 0.0001;
    try {
      const logistics = LogisticsEngine.calculateLogistics(supplierDetails.region, teamRegion, shippingMethod, weight, volume, 20);
      const tariffRate = supplierDetails.region === "Asia" && teamRegion === "North America" ? 0.25 : 0.10;
      const tariffCost = materialCost * tariffRate;
      return {
        materialCost,
        shippingCost: logistics.totalLogisticsCost,
        tariffCost,
        totalCost: materialCost + logistics.totalLogisticsCost + tariffCost,
        leadTime: logistics.totalLeadTime,
        reliability: logistics.onTimeProbability,
      };
    } catch (error) {
      return null;
    }
  }, [supplierDetails, requirements, selectedMaterialType, orderQuantity, shippingMethod, teamRegion]);

  const inventoryValue = useMemo(() => {
    return inventory.reduce((sum, inv) => sum + inv.quantity * inv.averageCost, 0);
  }, [inventory]);

  // Place order mutation
  const placeOrderMutation = trpc.material.placeOrder.useMutation({
    onSuccess: (result) => {
      toast.success(result.message);
      setOrderQuantity(10000);
      setSelectedSupplier("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handlePlaceOrder = () => {
    if (!supplierDetails || !orderPreview) return;
    const material = requirements.materials.find(m => m.type === selectedMaterialType);
    if (!material) return;
    placeOrderMutation.mutate({
      materialType: selectedMaterialType,
      spec: material.spec,
      supplierId: supplierDetails.id,
      region: supplierDetails.region,
      quantity: orderQuantity,
      shippingMethod,
    });
  };

  // Check if an upgrade is already purchased or pending
  const isUpgradePurchased = (upgradeId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const installed = selectedFactory.upgrades?.includes(upgradeId as any);
    const pending = upgradePurchases.some(u => u.factoryId === selectedFactory.id && u.upgradeName === upgradeId);
    return { installed, pending };
  };

  // Toggle upgrade purchase
  const toggleUpgradePurchase = (upgradeId: string) => {
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

  // Get health status color
  const getHealthColor = (health: number) => {
    if (health >= 80) return "text-green-400";
    if (health >= 60) return "text-yellow-400";
    if (health >= 40) return "text-orange-400";
    return "text-red-400";
  };

  // Get risk status color
  const getRiskColor = (risk: number) => {
    if (risk <= 10) return "text-green-400";
    if (risk <= 20) return "text-yellow-400";
    if (risk <= 35) return "text-orange-400";
    return "text-red-400";
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-700 rounded w-1/4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-700 rounded-xl"></div>
          ))}
        </div>
        <div className="h-12 bg-slate-700 rounded w-full"></div>
        <div className="h-96 bg-slate-700 rounded-xl"></div>
      </div>
    );
  }

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

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700 flex-wrap">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4 mr-2 inline-block" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="equipment"
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Cog className="w-4 h-4 mr-2 inline-block" />
            Equipment
          </TabsTrigger>
          <TabsTrigger
            value="production"
            className="data-[state=active]:bg-orange-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Factory className="w-4 h-4 mr-2 inline-block" />
            Production
          </TabsTrigger>
          <TabsTrigger
            value="efficiency"
            className="data-[state=active]:bg-yellow-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Zap className="w-4 h-4 mr-2 inline-block" />
            Efficiency
          </TabsTrigger>
          <TabsTrigger
            value="maintenance"
            className="data-[state=active]:bg-red-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Wrench className="w-4 h-4 mr-2 inline-block" />
            Maintenance
          </TabsTrigger>
          <TabsTrigger
            value="machinery"
            className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Cog className="w-4 h-4 mr-2 inline-block" />
            Machinery
          </TabsTrigger>
          <TabsTrigger
            value="logistics"
            className="data-[state=active]:bg-teal-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Truck className="w-4 h-4 mr-2 inline-block" />
            Logistics
          </TabsTrigger>
          <TabsTrigger
            value="supply-chain"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Package className="w-4 h-4 mr-2 inline-block" />
            Supply Chain
          </TabsTrigger>
          <TabsTrigger
            value="upgrades"
            className="data-[state=active]:bg-pink-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <TrendingUp className="w-4 h-4 mr-2 inline-block" />
            Upgrades
          </TabsTrigger>
          <TabsTrigger
            value="esg"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Leaf className="w-4 h-4 mr-2 inline-block" />
            ESG
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
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
            <Card className="bg-slate-800 border-slate-700">
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
            <Card className="bg-slate-800 border-slate-700">
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

            <Card className="bg-slate-800 border-slate-700">
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
          <Card className="bg-slate-800 border-slate-700">
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
        </TabsContent>

        {/* Equipment Tab - NEW */}
        <TabsContent value="equipment" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
          {/* Equipment Health Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-800 border-slate-700">
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

            <Card className="bg-slate-800 border-slate-700">
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

            <Card className="bg-slate-800 border-slate-700">
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
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-400" />
                Equipment Status
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
          <Card className="bg-slate-800 border-slate-700">
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
        </TabsContent>

        {/* Production Lines Tab - ENHANCED */}
        <TabsContent value="production" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
          {/* Production Allocation */}
          <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-orange-400" />
                Production Allocation
              </CardTitle>
              <CardDescription className="text-slate-400">
                Allocate production capacity across different market segments.
                <span className={totalAllocation === 100 ? "text-green-400" : "text-red-400"}> Total must equal 100%.</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(productionAllocations).map(([segment, allocation]) => (
                <div key={segment} className="space-y-3 p-4 bg-slate-700/30 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">{segment}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-orange-400 font-semibold">{allocation}%</span>
                      <span className="text-slate-500 text-sm">
                        ({Math.floor((totalCapacity * allocation) / 100).toLocaleString()} units)
                      </span>
                    </div>
                  </div>
                  <Slider
                    data-testid={`slider-production-${segment.toLowerCase().replace(/\s+/g, '-')}`}
                    value={[allocation]}
                    onValueChange={(values) => setProductionAllocations(prev => ({
                      ...prev,
                      [segment]: values[0]
                    }))}
                    max={100}
                    step={5}
                    variant="orange"
                  />
                </div>
              ))}

              <div className="border-t border-slate-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Total Allocation</span>
                  <span className={`text-xl font-bold ${
                    totalAllocation === 100 ? "text-green-400" : "text-red-400"
                  }`}>
                    {totalAllocation}%
                  </span>
                </div>
                {totalAllocation !== 100 && (
                  <div className="flex items-center gap-2 mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Allocation must equal 100% ({totalAllocation > 100 ? `${totalAllocation - 100}% over` : `${100 - totalAllocation}% remaining`})</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Production Lines Detail */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" />
                Active Production Lines
              </CardTitle>
              <CardDescription className="text-slate-400">
                Detailed view of each production line's capacity, efficiency, and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedFactory.productionLines && selectedFactory.productionLines.length > 0 ? (
                <div className="space-y-4">
                  {selectedFactory.productionLines.map((line, index) => {
                    const allocationPercent = totalCapacity > 0
                      ? ((line.capacity || 0) / totalCapacity) * 100
                      : 0;
                    const dailyOutput = Math.floor((line.capacity || 0) * (line.efficiency || 1));
                    return (
                      <div key={line.id} className="p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700/70 transition-colors border border-slate-600">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-white font-medium text-lg">{line.segment}</span>
                              <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                Line {index + 1}
                              </Badge>
                            </div>
                            <p className="text-slate-400 text-sm">
                              Daily output: <span className="text-green-400 font-medium">{dailyOutput.toLocaleString()} units</span>
                            </p>
                          </div>
                          <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30">
                            {allocationPercent.toFixed(1)}% capacity
                          </Badge>
                        </div>

                        {/* Progress Bar */}
                        <EnhancedProgress
                          value={allocationPercent}
                          variant="orange"
                          size="md"
                          className="mb-4"
                        />

                        {/* Line Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="p-2 bg-slate-800/50 rounded text-center">
                            <div className="text-slate-400 text-xs mb-1">Max Capacity</div>
                            <div className="text-white font-medium">{(line.capacity || 0).toLocaleString()}</div>
                          </div>
                          <div className="p-2 bg-slate-800/50 rounded text-center">
                            <div className="text-slate-400 text-xs mb-1">Efficiency</div>
                            <div className="text-blue-400 font-medium">{((line.efficiency || 1) * 100).toFixed(0)}%</div>
                          </div>
                          <div className="p-2 bg-slate-800/50 rounded text-center">
                            <div className="text-slate-400 text-xs mb-1">Utilization</div>
                            <div className={`font-medium ${
                              allocationPercent > 95 ? 'text-red-400' :
                              allocationPercent > 80 ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                              {allocationPercent.toFixed(0)}%
                            </div>
                          </div>
                          <div className="p-2 bg-slate-800/50 rounded text-center">
                            <div className="text-slate-400 text-xs mb-1">Status</div>
                            <div className="text-green-400 font-medium">Active</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No production lines configured</p>
                  <p className="text-sm mt-2">Production lines are automatically created based on your segment allocation</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Production Output Summary */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Projected Daily Output</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-5 gap-4">
                {Object.entries(productionAllocations).map(([segment, allocation]) => (
                  <div key={segment} className="text-center p-4 bg-slate-700/50 rounded-lg">
                    <div className="text-slate-400 text-sm mb-1">{segment}</div>
                    <div className="text-xl font-bold text-white">
                      {Math.floor((totalCapacity * allocation) / 100).toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">units/day</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700 text-center">
                <div className="text-slate-400 text-sm mb-1">Total Daily Production</div>
                <div className="text-3xl font-bold text-green-400">
                  {totalCapacity.toLocaleString()} units
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>

        {/* Efficiency Tab - ENHANCED */}
        <TabsContent value="efficiency" className="space-y-6">
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
                  value={70}
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
        </TabsContent>

        {/* Maintenance Tab - NEW */}
        <TabsContent value="maintenance" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
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
        </TabsContent>

        {/* Machinery Tab - NEW */}
        <TabsContent value="machinery" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Machinery Overview */}
            <SectionHeader
              title="Machinery Management"
              description="Purchase, maintain, and manage your factory machines"
            />

            {/* Machine Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total Machines"
                value="0"
                icon={<Cog className="w-5 h-5" />}
                variant="default"
              />
              <StatCard
                label="Total Capacity"
                value="0 units"
                icon={<Package className="w-5 h-5" />}
                variant="default"
              />
              <StatCard
                label="Maintenance Cost"
                value="$0/round"
                icon={<Wrench className="w-5 h-5" />}
                variant="warning"
              />
              <StatCard
                label="Operating Cost"
                value="$0/round"
                icon={<DollarSign className="w-5 h-5" />}
                variant="info"
              />
            </div>

            {/* Machine Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Production Machines */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Factory className="w-5 h-5 text-blue-400" />
                    Production Machines
                  </CardTitle>
                  <CardDescription>Core manufacturing equipment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { name: "Assembly Line", cost: "$5M", capacity: "10,000 units", type: "assembly_line" },
                    { name: "CNC Machine", cost: "$8M", capacity: "3,000 units", type: "cnc_machine" },
                    { name: "Welding Station", cost: "$4M", capacity: "5,000 units", type: "welding_station" },
                    { name: "Injection Molder", cost: "$7M", capacity: "12,000 units", type: "injection_molder" },
                    { name: "PCB Assembler", cost: "$10M", capacity: "6,000 units", type: "pcb_assembler" },
                    { name: "Paint Booth", cost: "$3M", capacity: "8,000 units", type: "paint_booth" },
                    { name: "Laser Cutter", cost: "$6M", capacity: "4,000 units", type: "laser_cutter" },
                  ].map((machine) => {
                    const { installed, pending } = isUpgradePurchased(machine.type);
                    return (
                      <div key={machine.type} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{machine.name}</p>
                          <p className="text-slate-400 text-sm">{machine.capacity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-medium">{machine.cost}</p>
                          {installed ? (
                            <Badge className="mt-1 bg-green-500/20 text-green-400 text-xs">Owned</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant={pending ? "destructive" : "outline"}
                              className="mt-1 h-7 text-xs"
                              onClick={() => toggleUpgradePurchase(machine.type)}
                            >
                              {pending ? "Cancel" : "Purchase"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Automation & Quality Machines */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-purple-400" />
                    Automation & Quality
                  </CardTitle>
                  <CardDescription>Efficiency and quality equipment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { name: "Robotic Arm", cost: "$12M", benefit: "-20% labor", type: "robotic_arm" },
                    { name: "Conveyor System", cost: "$3M", benefit: "+15,000 capacity", type: "conveyor_system" },
                    { name: "Quality Scanner", cost: "$6M", benefit: "-3% defects", type: "quality_scanner" },
                    { name: "Testing Rig", cost: "$4M", benefit: "-2% defects", type: "testing_rig" },
                    { name: "3D Printer", cost: "$2M", benefit: "Prototyping", type: "3d_printer" },
                    { name: "Clean Room Unit", cost: "$15M", benefit: "-4% defects", type: "clean_room_unit" },
                    { name: "Packaging System", cost: "$2.5M", benefit: "-5% shipping", type: "packaging_system" },
                    { name: "Forklift Fleet", cost: "$1M", benefit: "-10% shipping", type: "forklift_fleet" },
                  ].map((machine) => {
                    const { installed, pending } = isUpgradePurchased(machine.type);
                    return (
                      <div key={machine.type} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{machine.name}</p>
                          <p className="text-slate-400 text-sm">{machine.benefit}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-emerald-400 font-medium">{machine.cost}</p>
                          {installed ? (
                            <Badge className="mt-1 bg-green-500/20 text-green-400 text-xs">Owned</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant={pending ? "destructive" : "outline"}
                              className="mt-1 h-7 text-xs"
                              onClick={() => toggleUpgradePurchase(machine.type)}
                            >
                              {pending ? "Cancel" : "Purchase"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Owned Machines */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-emerald-400" />
                  Owned Machines
                </CardTitle>
                <CardDescription>Your factory&apos;s current machinery</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-slate-400">
                  <Cog className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No machines purchased yet</p>
                  <p className="text-sm mt-2">Purchase machines above to increase production capacity</p>
                </div>
              </CardContent>
            </Card>

            {/* Maintenance Schedule */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-yellow-400" />
                  Maintenance Schedule
                </CardTitle>
                <CardDescription>Schedule preventive maintenance for your machines</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-slate-400">
                  <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No machines to maintain</p>
                  <p className="text-sm mt-2">Machines will appear here once purchased</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Upgrades Tab - ENHANCED */}
        <TabsContent value="upgrades" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
          {upgradePurchases.length > 0 && (
            <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-400 text-sm font-medium mb-2">Pending Upgrade Purchases:</p>
              <div className="space-y-1">
                {upgradePurchases.map((purchase, idx) => {
                  const upgrade = upgrades.find(u => u.id === purchase.upgradeName);
                  return (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-300">{upgrade?.name} - {formatCurrency(upgrade?.cost || 0)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 h-6 px-2"
                        onClick={() => toggleUpgradePurchase(purchase.upgradeName)}
                      >
                        Cancel
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tier Legend */}
          <div className="flex flex-wrap gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <span className="text-slate-400 text-sm font-medium">R&D Prerequisites:</span>
            <Badge className="bg-green-600/20 text-green-400 border-green-600">Tier 1: No R&D</Badge>
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600">Tier 2: Process Optimization</Badge>
            <Badge className="bg-purple-600/20 text-purple-400 border-purple-600">Tier 3: Advanced Manufacturing</Badge>
            <Badge className="bg-amber-600/20 text-amber-400 border-amber-600">Tier 4: Industry 4.0</Badge>
            <Badge className="bg-red-600/20 text-red-400 border-red-600">Tier 5: Breakthrough Tech</Badge>
          </div>

          {/* Tier 1: No R&D Required */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-green-600">Tier 1</Badge>
              <h3 className="text-lg font-semibold text-white">Foundation Upgrades</h3>
              <span className="text-green-400 text-sm">No R&D Required - Always Available</span>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {upgrades.filter(u => u.tier === 1).map((upgrade) => {
                const { installed, pending } = isUpgradePurchased(upgrade.id);
                return (
                  <Card key={upgrade.id} className={`bg-slate-800 border-slate-700 ${installed ? "border-green-700" : pending ? "border-orange-500" : ""}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <upgrade.icon className={`w-5 h-5 ${installed ? "text-green-400" : pending ? "text-orange-400" : "text-green-400"}`} />
                        <CardTitle className="text-white text-base">{upgrade.name}</CardTitle>
                      </div>
                      <CardDescription className="text-slate-400 text-sm">{upgrade.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1 mb-3">
                        {upgrade.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <span className="text-lg font-bold text-white">{formatCurrency(upgrade.cost)}</span>
                        {installed ? (
                          <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Installed</Badge>
                        ) : pending ? (
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8" onClick={() => toggleUpgradePurchase(upgrade.id)}>Cancel</Button>
                        ) : (
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8" onClick={() => toggleUpgradePurchase(upgrade.id)}>Purchase</Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Tier 2: Process Optimization Required */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-600">Tier 2</Badge>
              <h3 className="text-lg font-semibold text-white">Process Optimization</h3>
              {(state?.unlockedTechnologies || []).includes("process_optimization") ? (
                <span className="text-blue-400 text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Unlocked</span>
              ) : (
                <span className="text-slate-500 text-sm flex items-center gap-1"><Lock className="w-4 h-4" />Requires R&D: Process Optimization</span>
              )}
            </div>
            <div className={`grid md:grid-cols-2 gap-4 ${!(state?.unlockedTechnologies || []).includes("process_optimization") ? "opacity-60" : ""}`}>
              {upgrades.filter(u => u.tier === 2).map((upgrade) => {
                const { installed, pending } = isUpgradePurchased(upgrade.id);
                const isLocked = !(state?.unlockedTechnologies || []).includes("process_optimization");
                return (
                  <Card key={upgrade.id} className={`bg-slate-800 ${isLocked ? "border-slate-600" : installed ? "border-green-700" : pending ? "border-orange-500" : "border-blue-700/50"}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <upgrade.icon className={`w-5 h-5 ${isLocked ? "text-slate-500" : installed ? "text-green-400" : pending ? "text-orange-400" : "text-blue-400"}`} />
                        <CardTitle className={`text-base ${isLocked ? "text-slate-400" : "text-white"}`}>{upgrade.name}</CardTitle>
                        {isLocked && <Lock className="w-4 h-4 text-slate-500" />}
                      </div>
                      <CardDescription className="text-slate-400 text-sm">{upgrade.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1 mb-3">
                        {upgrade.benefits.map((benefit, idx) => (
                          <li key={idx} className={`flex items-center gap-2 text-xs ${isLocked ? "text-slate-500" : "text-slate-300"}`}>
                            <CheckCircle2 className={`w-3 h-3 ${isLocked ? "text-slate-500" : "text-blue-400"}`} />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <span className={`text-lg font-bold ${isLocked ? "text-slate-500" : "text-white"}`}>{formatCurrency(upgrade.cost)}</span>
                        {installed ? (
                          <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Installed</Badge>
                        ) : pending ? (
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8" onClick={() => toggleUpgradePurchase(upgrade.id)}>Cancel</Button>
                        ) : (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 h-8" onClick={() => toggleUpgradePurchase(upgrade.id)} disabled={isLocked}>
                            {isLocked ? "Locked" : "Purchase"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Tier 3: Advanced Manufacturing Required */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-purple-600">Tier 3</Badge>
              <h3 className="text-lg font-semibold text-white">Advanced Manufacturing</h3>
              {(state?.unlockedTechnologies || []).includes("advanced_manufacturing") ? (
                <span className="text-purple-400 text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Unlocked</span>
              ) : (
                <span className="text-slate-500 text-sm flex items-center gap-1"><Lock className="w-4 h-4" />Requires R&D: Advanced Manufacturing</span>
              )}
            </div>
            <div className={`grid md:grid-cols-2 gap-4 ${!(state?.unlockedTechnologies || []).includes("advanced_manufacturing") ? "opacity-60" : ""}`}>
              {upgrades.filter(u => u.tier === 3).map((upgrade) => {
                const { installed, pending } = isUpgradePurchased(upgrade.id);
                const isLocked = !(state?.unlockedTechnologies || []).includes("advanced_manufacturing");
                return (
                  <Card key={upgrade.id} className={`bg-slate-800 ${isLocked ? "border-slate-600" : installed ? "border-green-700" : pending ? "border-orange-500" : "border-purple-700/50"}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <upgrade.icon className={`w-5 h-5 ${isLocked ? "text-slate-500" : installed ? "text-green-400" : pending ? "text-orange-400" : "text-purple-400"}`} />
                        <CardTitle className={`text-base ${isLocked ? "text-slate-400" : "text-white"}`}>{upgrade.name}</CardTitle>
                        {isLocked && <Lock className="w-4 h-4 text-slate-500" />}
                      </div>
                      <CardDescription className="text-slate-400 text-sm">{upgrade.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1 mb-3">
                        {upgrade.benefits.map((benefit, idx) => (
                          <li key={idx} className={`flex items-center gap-2 text-xs ${isLocked ? "text-slate-500" : "text-slate-300"}`}>
                            <CheckCircle2 className={`w-3 h-3 ${isLocked ? "text-slate-500" : "text-purple-400"}`} />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <span className={`text-lg font-bold ${isLocked ? "text-slate-500" : "text-white"}`}>{formatCurrency(upgrade.cost)}</span>
                        {installed ? (
                          <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Installed</Badge>
                        ) : pending ? (
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8" onClick={() => toggleUpgradePurchase(upgrade.id)}>Cancel</Button>
                        ) : (
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 h-8" onClick={() => toggleUpgradePurchase(upgrade.id)} disabled={isLocked}>
                            {isLocked ? "Locked" : "Purchase"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Tier 4: Industry 4.0 Required */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-amber-600">Tier 4</Badge>
              <h3 className="text-lg font-semibold text-white">Industry 4.0</h3>
              {(state?.unlockedTechnologies || []).includes("industry_4_0") ? (
                <span className="text-amber-400 text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Unlocked</span>
              ) : (
                <span className="text-slate-500 text-sm flex items-center gap-1"><Lock className="w-4 h-4" />Requires R&D: Industry 4.0</span>
              )}
            </div>
            <div className={`grid md:grid-cols-2 gap-4 ${!(state?.unlockedTechnologies || []).includes("industry_4_0") ? "opacity-60" : ""}`}>
              {upgrades.filter(u => u.tier === 4).map((upgrade) => {
                const { installed, pending } = isUpgradePurchased(upgrade.id);
                const isLocked = !(state?.unlockedTechnologies || []).includes("industry_4_0");
                return (
                  <Card key={upgrade.id} className={`bg-slate-800 ${isLocked ? "border-slate-600" : installed ? "border-green-700" : pending ? "border-orange-500" : "border-amber-700/50"}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <upgrade.icon className={`w-5 h-5 ${isLocked ? "text-slate-500" : installed ? "text-green-400" : pending ? "text-orange-400" : "text-amber-400"}`} />
                        <CardTitle className={`text-base ${isLocked ? "text-slate-400" : "text-white"}`}>{upgrade.name}</CardTitle>
                        {isLocked && <Lock className="w-4 h-4 text-slate-500" />}
                      </div>
                      <CardDescription className="text-slate-400 text-sm">{upgrade.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1 mb-3">
                        {upgrade.benefits.map((benefit, idx) => (
                          <li key={idx} className={`flex items-center gap-2 text-xs ${isLocked ? "text-slate-500" : "text-slate-300"}`}>
                            <CheckCircle2 className={`w-3 h-3 ${isLocked ? "text-slate-500" : "text-amber-400"}`} />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <span className={`text-lg font-bold ${isLocked ? "text-slate-500" : "text-white"}`}>{formatCurrency(upgrade.cost)}</span>
                        {installed ? (
                          <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Installed</Badge>
                        ) : pending ? (
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8" onClick={() => toggleUpgradePurchase(upgrade.id)}>Cancel</Button>
                        ) : (
                          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 h-8" onClick={() => toggleUpgradePurchase(upgrade.id)} disabled={isLocked}>
                            {isLocked ? "Locked" : "Purchase"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Tier 5: Breakthrough Tech Required */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-red-600">Tier 5</Badge>
              <h3 className="text-lg font-semibold text-white">Breakthrough Technology</h3>
              {(state?.unlockedTechnologies || []).includes("breakthrough_tech") ? (
                <span className="text-red-400 text-sm flex items-center gap-1"><CheckCircle2 className="w-4 h-4" />Unlocked</span>
              ) : (
                <span className="text-slate-500 text-sm flex items-center gap-1"><Lock className="w-4 h-4" />Requires R&D: Breakthrough Technology</span>
              )}
            </div>
            <div className={`grid md:grid-cols-2 gap-4 ${!(state?.unlockedTechnologies || []).includes("breakthrough_tech") ? "opacity-60" : ""}`}>
              {upgrades.filter(u => u.tier === 5).map((upgrade) => {
                const { installed, pending } = isUpgradePurchased(upgrade.id);
                const isLocked = !(state?.unlockedTechnologies || []).includes("breakthrough_tech");
                return (
                  <Card key={upgrade.id} className={`bg-slate-800 ${isLocked ? "border-slate-600" : installed ? "border-green-700" : pending ? "border-orange-500" : "border-red-700/50"}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <upgrade.icon className={`w-5 h-5 ${isLocked ? "text-slate-500" : installed ? "text-green-400" : pending ? "text-orange-400" : "text-red-400"}`} />
                        <CardTitle className={`text-base ${isLocked ? "text-slate-400" : "text-white"}`}>{upgrade.name}</CardTitle>
                        {isLocked && <Lock className="w-4 h-4 text-slate-500" />}
                      </div>
                      <CardDescription className="text-slate-400 text-sm">{upgrade.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <ul className="space-y-1 mb-3">
                        {upgrade.benefits.map((benefit, idx) => (
                          <li key={idx} className={`flex items-center gap-2 text-xs ${isLocked ? "text-slate-500" : "text-slate-300"}`}>
                            <CheckCircle2 className={`w-3 h-3 ${isLocked ? "text-slate-500" : "text-red-400"}`} />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                        <span className={`text-lg font-bold ${isLocked ? "text-slate-500" : "text-white"}`}>{formatCurrency(upgrade.cost)}</span>
                        {installed ? (
                          <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />Installed</Badge>
                        ) : pending ? (
                          <Button size="sm" className="bg-orange-600 hover:bg-orange-700 h-8" onClick={() => toggleUpgradePurchase(upgrade.id)}>Cancel</Button>
                        ) : (
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 h-8" onClick={() => toggleUpgradePurchase(upgrade.id)} disabled={isLocked}>
                            {isLocked ? "Locked" : "Purchase"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* New Factory Construction */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Factory className="w-5 h-5 text-orange-400" />
                Build New Factory
              </CardTitle>
              <CardDescription className="text-slate-400">
                Expand your production capacity by building factories in different regions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {newFactories.length > 0 && (
                <div className="mb-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                  <p className="text-green-400 text-sm font-medium mb-2">Pending Factory Construction:</p>
                  <div className="space-y-1">
                    {newFactories.map((factory, idx) => {
                      const region = regions.find(r => r.id === factory.region);
                      return (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-slate-300">{region?.name} - {formatCurrency(50_000_000)}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 h-6 px-2"
                            onClick={() => toggleNewFactory(factory.region)}
                          >
                            Cancel
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="grid md:grid-cols-4 gap-4">
                {regions.map((region) => {
                  const isPending = newFactories.some(f => f.region === region.id);
                  return (
                    <Card
                      key={region.id}
                      className={`bg-slate-700 border-slate-600 hover:border-orange-500 cursor-pointer transition-colors ${
                        isPending ? "border-orange-500" : ""
                      }`}
                      onClick={() => toggleNewFactory(region.id)}
                    >
                      <CardContent className="p-4">
                        <h3 className="text-white font-medium mb-2">{region.name}</h3>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Labor Cost</span>
                            <span className="text-white">{(region.laborCost * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Tariff</span>
                            <span className="text-white">{(region.tariff * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <p className="text-orange-400 font-medium">{formatCurrency(50_000_000)}</p>
                          {isPending && <Badge className="bg-orange-600 text-xs">Pending</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>

        {/* Logistics Tab */}
        <TabsContent value="logistics" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
          {/* Logistics Overview Stats */}
          {logisticsStats && (() => {
            const RecommendedIcon = METHOD_ICONS[logisticsStats.recommended.method];
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Recommended Method"
                  value={logisticsStats.recommended.method.toUpperCase()}
                  icon={<RecommendedIcon className="w-5 h-5" />}
                  variant="info"
                />
                <StatCard
                  label="Cheapest Option"
                  value={formatCurrency(logisticsStats.cheapest.logistics.totalLogisticsCost)}
                  icon={<DollarSign className="w-5 h-5" />}
                  variant="success"
                />
                <StatCard
                  label="Fastest Option"
                  value={`${logisticsStats.fastest.logistics.totalLeadTime} days`}
                  icon={<Clock className="w-5 h-5" />}
                  variant="warning"
                />
                <StatCard
                  label="Avg Reliability"
                  value={`${Math.round(logistics.reduce((sum, l) => sum + l.logistics.onTimeProbability, 0) / logistics.length * 100)}%`}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  variant="info"
                />
              </div>
            );
          })()}

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Ship className="w-5 h-5 text-blue-400" />
                Shipping Route Comparison
              </CardTitle>
              <CardDescription className="text-slate-400">
                Compare all available shipping methods for a route
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Route Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">From</Label>
                  <Select value={fromRegion} onValueChange={(v) => setFromRegion(v as Region)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGION_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">To</Label>
                  <Select value={toRegion} onValueChange={(v) => setToRegion(v as Region)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGION_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Shipment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Weight (tons)</Label>
                  <Input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    min={0.1}
                    step={0.1}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Volume (m³)</Label>
                  <Input
                    type="number"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    min={0.1}
                    step={0.1}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              {/* Recommendations */}
              {logisticsRecommendations && (
                <Card className="bg-green-900/20 border-green-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <CardTitle className="text-lg text-white">AI Recommendation</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="text-lg px-3 py-1 bg-green-600">
                        {logisticsRecommendations.recommended.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-slate-300">{logisticsRecommendations.reasoning}</span>
                    </div>
                    {logisticsRecommendations.warnings.length > 0 && (
                      <div className="space-y-1">
                        {logisticsRecommendations.warnings.map((warning, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-orange-400">
                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span>{warning}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Method Comparison */}
              {logistics.length > 0 ? (
                <div className="space-y-3">
                  <SectionHeader title="Method Comparison" />
                  {logistics.map((option) => {
                    const Icon = METHOD_ICONS[option.method];
                    const colorClass = METHOD_COLORS[option.method];
                    return (
                      <Card key={option.method} className="bg-slate-700/50 border-slate-600 p-4">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 bg-slate-800 rounded-lg ${colorClass}`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div>
                                <div className="font-bold text-lg capitalize text-white">{option.method} Freight</div>
                                <div className="text-sm text-slate-400">{SHIPPING_METHODS[option.method].description}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-white">{Math.round(option.overallScore)}</div>
                              <div className="text-xs text-slate-400">Overall Score</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                              <div className="text-sm text-slate-400">Total Cost</div>
                              <div className="font-bold text-lg text-white">{formatCurrency(option.logistics.totalLogisticsCost)}</div>
                              <div className="flex items-center gap-1 text-xs text-green-400">
                                <TrendingUp className="w-3 h-3" />
                                {Math.round(option.costEfficiency)}% efficient
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-slate-400">Lead Time</div>
                              <div className="font-bold text-lg text-white">{option.logistics.totalLeadTime} days</div>
                            </div>
                            <div>
                              <div className="text-sm text-slate-400">Reliability</div>
                              <div className="font-bold text-lg text-white">{Math.round(option.logistics.onTimeProbability * 100)}%</div>
                            </div>
                            <div>
                              <div className="text-sm text-slate-400">Shipping</div>
                              <div className="font-bold text-white">{formatCurrency(option.logistics.shippingCost)}</div>
                            </div>
                            <div>
                              <div className="text-sm text-slate-400">Clearance</div>
                              <div className="font-bold text-white">{formatCurrency(option.logistics.clearanceCost)}</div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  No shipping route available between these regions
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>

        {/* Supply Chain Tab */}
        <TabsContent value="supply-chain" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
          {/* Supply Chain Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Inventory Value"
              value={formatCurrency(inventoryValue)}
              icon={<Package className="w-5 h-5" />}
              variant={inventoryValue > 0 ? "success" : "default"}
            />
            <StatCard
              label="Active Orders"
              value={activeOrders.length.toString()}
              icon={<ShoppingCart className="w-5 h-5" />}
              variant="info"
            />
            <StatCard
              label="Active Suppliers"
              value={DEFAULT_SUPPLIERS.length.toString()}
              icon={<Factory className="w-5 h-5" />}
              variant="info"
            />
            <StatCard
              label="Available Cash"
              value={formatCurrency(cash)}
              icon={<DollarSign className="w-5 h-5" />}
              variant="warning"
            />
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-400" />
                Material Requirements
              </CardTitle>
              <CardDescription className="text-slate-400">
                View material specifications needed for each phone segment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-slate-300">Phone Segment:</Label>
                <Select value={selectedSegment} onValueChange={(v) => setSelectedSegment(v as Segment)}>
                  <SelectTrigger className="w-[200px] bg-slate-700 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENT_OPTIONS.map((seg) => (
                      <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-300">Total Material Cost</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{formatCurrency(requirements.totalCost)}</div>
                    <p className="text-xs text-slate-400">per unit</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-300">Lead Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-white">{requirements.leadTime} days</div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-700/50 border-slate-600">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-slate-300">Quality Tier</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-white">Tier {requirements.qualityTier}</div>
                      <Badge className={requirements.qualityTier >= 4 ? "bg-purple-600" : "bg-blue-600"}>
                        {requirements.qualityTier >= 4 ? "Premium" : "Standard"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <SectionHeader title="Material Components" />
                <div className="grid gap-3">
                  {requirements.materials.map((material) => {
                    const Icon = MATERIAL_ICONS[material.type];
                    return (
                      <Card key={material.type} className="bg-slate-700/50 border-slate-600 p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800 rounded-lg">
                              <Icon className="w-5 h-5 text-blue-400" />
                            </div>
                            <div>
                              <div className="font-medium capitalize text-white">{material.type}</div>
                              <div className="text-sm text-slate-400">{material.spec}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-white">{formatCurrency(material.costPerUnit)}</div>
                            <div className="text-sm text-slate-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {material.source}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-green-400" />
                Place Material Order
              </CardTitle>
              <CardDescription className="text-slate-400">
                Configure your order and compare costs with different shipping options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Material Type</Label>
                    <Select
                      value={selectedMaterialType}
                      onValueChange={(v) => {
                        setSelectedMaterialType(v as MaterialType);
                        setSelectedSupplier("");
                      }}
                    >
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="display">Display</SelectItem>
                        <SelectItem value="processor">Processor</SelectItem>
                        <SelectItem value="memory">Memory</SelectItem>
                        <SelectItem value="storage">Storage</SelectItem>
                        <SelectItem value="camera">Camera</SelectItem>
                        <SelectItem value="battery">Battery</SelectItem>
                        <SelectItem value="chassis">Chassis</SelectItem>
                        <SelectItem value="other">Other Components</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Supplier</Label>
                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSuppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.region})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Quantity</Label>
                    <Input
                      type="number"
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(Number(e.target.value))}
                      min={supplierDetails?.minimumOrder ?? 1000}
                      step={1000}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Shipping Method</Label>
                    <Select value={shippingMethod} onValueChange={(v) => setShippingMethod(v as typeof shippingMethod)}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sea">Sea Freight (Cheapest)</SelectItem>
                        <SelectItem value="air">Air Freight (Fastest)</SelectItem>
                        <SelectItem value="land">Land Transport</SelectItem>
                        <SelectItem value="rail">Rail Transport</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {orderPreview && supplierDetails ? (
                <Card className="bg-green-900/20 border-green-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-white">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-slate-400">Material Cost</div>
                        <div className="text-lg font-bold text-white">{formatCurrency(orderPreview.materialCost)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Shipping Cost</div>
                        <div className="text-lg font-bold text-white">{formatCurrency(orderPreview.shippingCost)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Tariff Cost</div>
                        <div className="text-lg font-bold text-orange-400">{formatCurrency(orderPreview.tariffCost)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Total Cost</div>
                        <div className="text-xl font-bold text-green-400">{formatCurrency(orderPreview.totalCost)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-300">Delivery: {orderPreview.leadTime} days</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-slate-300">Reliability: {Math.round(orderPreview.reliability * 100)}%</span>
                      </div>
                    </div>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      size="lg"
                      onClick={handlePlaceOrder}
                      disabled={!selectedSupplier || orderQuantity < (supplierDetails?.minimumOrder ?? 0) || placeOrderMutation.isPending}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {placeOrderMutation.isPending ? "Placing Order..." : `Place Order - ${formatCurrency(orderPreview.totalCost)}`}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  Select a supplier to see order preview
                </div>
              )}
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>

        {/* ESG Tab - EXPANDED with Tiers */}
        <TabsContent value="esg" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
          {/* ESG Overview Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="ESG Score"
              value={teamState?.esgScore ?? 0}
              icon={<Leaf className="w-5 h-5" />}
              variant={(teamState?.esgScore ?? 0) >= 500 ? "success" : (teamState?.esgScore ?? 0) >= 300 ? "warning" : "default"}
            />
            <StatCard
              label="CO2 Emissions"
              value={selectedFactory.co2Emissions || 500}
              suffix="t"
              icon={<Activity className="w-5 h-5" />}
              variant="warning"
            />
            <StatCard
              label="Tier Unlocked"
              value={(teamState?.esgScore ?? 0) >= 500 ? "4" : (teamState?.esgScore ?? 0) >= 300 ? "3" : (teamState?.esgScore ?? 0) >= 100 ? "2" : "1"}
              icon={<TrendingUp className="w-5 h-5" />}
              variant="info"
            />
            <StatCard
              label="Green Certification"
              value={esgInvestment >= 2_000_000 ? "Level 1" : "None"}
              icon={<CheckCircle2 className="w-5 h-5" />}
              variant={esgInvestment >= 2_000_000 ? "success" : "default"}
            />
          </div>

          {/* CO2 Reduction Investment */}
          <Card className="bg-slate-800/80 border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Leaf className="w-5 h-5 text-green-400" />
                CO2 Reduction Investment
              </CardTitle>
              <CardDescription>10 tons reduction per $100K invested</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Investment Amount</span>
                <Input
                  type="number"
                  value={esgInvestment}
                  onChange={(e) => setEsgInvestment(Math.max(0, Math.min(5000000, Number(e.target.value) || 0)))}
                  className="w-32 h-8 text-right bg-slate-700 border-slate-600 text-green-400 font-semibold"
                />
              </div>
              <Slider
                value={[esgInvestment]}
                onValueChange={(values) => setEsgInvestment(values[0])}
                max={5000000}
                step={100000}
                variant="success"
              />
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Current: {selectedFactory.co2Emissions}t</span>
                <span className="text-green-400">After: {Math.max(0, (selectedFactory.co2Emissions || 500) - Math.floor(esgInvestment / 100000) * 10)}t</span>
              </div>
            </CardContent>
          </Card>

          {/* Tier 1: Foundation Initiatives (Always Available) */}
          <Card className="bg-slate-800 border-green-700/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Badge className="bg-green-600">Tier 1</Badge>
                  Foundation Initiatives
                </CardTitle>
                <Badge variant="outline" className="text-green-400 border-green-400">Unlocked</Badge>
              </div>
              <CardDescription>Basic ESG programs available from the start</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { id: "charitableDonation", name: "Charitable Donation", desc: "Donate to charitable causes", cost: "Variable", points: "Based on % of income" },
                  { id: "communityInvestment", name: "Community Investment", desc: "Invest in local communities", cost: "Variable", points: "Based on % of revenue" },
                  { id: "codeOfEthics", name: "Code of Ethics", desc: "Adopt formal ethical guidelines", cost: "$0", points: "+200 ESG" },
                  { id: "employeeWellness", name: "Employee Wellness", desc: "Health and wellness programs", cost: "$500K/yr", points: "+60 ESG, -10% turnover" },
                  { id: "communityEducation", name: "Community Education", desc: "Support local education", cost: "Variable", points: "+1 ESG per $2K" },
                ].map((init) => (
                  <div key={init.id} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-green-500/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className="w-4 h-4 text-green-400" />
                      <span className="text-white font-medium text-sm">{init.name}</span>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">{init.desc}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">{init.cost}</span>
                      <span className="text-green-400">{init.points}</span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs">Activate</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tier 2: Growth Initiatives (ESG 100+ or Round 2+) */}
          <Card className={`bg-slate-800 ${(teamState?.esgScore ?? 0) >= 100 ? "border-blue-700/50" : "border-slate-700/50 opacity-60"}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Badge className={(teamState?.esgScore ?? 0) >= 100 ? "bg-blue-600" : "bg-slate-600"}>Tier 2</Badge>
                  Growth Initiatives
                </CardTitle>
                {(teamState?.esgScore ?? 0) >= 100 ? (
                  <Badge variant="outline" className="text-blue-400 border-blue-400">Unlocked</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-400">Requires ESG 100+</Badge>
                )}
              </div>
              <CardDescription>Enhanced ESG programs for growing companies</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { id: "workplaceHealthSafety", name: "Workplace Safety", desc: "Comprehensive safety programs", cost: "$2M/yr", points: "+200 ESG" },
                  { id: "fairWageProgram", name: "Fair Wage Program", desc: "Above-market compensation", cost: "Varies", points: "+260 ESG" },
                  { id: "carbonOffsetProgram", name: "Carbon Offset", desc: "Purchase carbon credits", cost: "$20/ton", points: "+1 ESG per 10 tons" },
                  { id: "renewableEnergyCertificates", name: "Renewable Energy Certs", desc: "Green energy credits", cost: "Variable", points: "+1 ESG per $10K" },
                  { id: "diversityInclusion", name: "Diversity & Inclusion", desc: "D&I programs and training", cost: "$1M/yr", points: "+90 ESG, +5% morale" },
                  { id: "transparencyReport", name: "Transparency Report", desc: "Public sustainability reporting", cost: "$300K/yr", points: "+50 ESG" },
                ].map((init) => (
                  <div key={init.id} className={`p-3 rounded-lg border transition-colors ${(teamState?.esgScore ?? 0) >= 100 ? "bg-slate-700/50 border-slate-600 hover:border-blue-500/50" : "bg-slate-800/50 border-slate-700"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className={`w-4 h-4 ${(teamState?.esgScore ?? 0) >= 100 ? "text-blue-400" : "text-slate-500"}`} />
                      <span className={`font-medium text-sm ${(teamState?.esgScore ?? 0) >= 100 ? "text-white" : "text-slate-500"}`}>{init.name}</span>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">{init.desc}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">{init.cost}</span>
                      <span className={(teamState?.esgScore ?? 0) >= 100 ? "text-blue-400" : "text-slate-500"}>{init.points}</span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs" disabled={(teamState?.esgScore ?? 0) < 100}>
                      {(teamState?.esgScore ?? 0) >= 100 ? "Activate" : "Locked"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tier 3: Leadership Initiatives (ESG 300+ or Round 4+) */}
          <Card className={`bg-slate-800 ${(teamState?.esgScore ?? 0) >= 300 ? "border-purple-700/50" : "border-slate-700/50 opacity-60"}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Badge className={(teamState?.esgScore ?? 0) >= 300 ? "bg-purple-600" : "bg-slate-600"}>Tier 3</Badge>
                  Leadership Initiatives
                </CardTitle>
                {(teamState?.esgScore ?? 0) >= 300 ? (
                  <Badge variant="outline" className="text-purple-400 border-purple-400">Unlocked</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-400">Requires ESG 300+</Badge>
                )}
              </div>
              <CardDescription>Advanced sustainability programs for industry leaders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { id: "supplierEthicsProgram", name: "Supplier Ethics", desc: "Ethical supply chain audits", cost: "+20% material", points: "+150 ESG" },
                  { id: "waterConservation", name: "Water Conservation", desc: "Closed-loop water systems", cost: "$1.5M/yr", points: "+80 ESG, -20% water" },
                  { id: "zeroWasteCommitment", name: "Zero Waste", desc: "Zero landfill commitment", cost: "$2M/yr", points: "+100 ESG, -30% waste" },
                  { id: "humanRightsAudit", name: "Human Rights Audit", desc: "Supply chain human rights", cost: "$800K/yr", points: "+70 ESG" },
                  { id: "whistleblowerProtection", name: "Whistleblower Protection", desc: "Anonymous reporting system", cost: "$200K/yr", points: "+40 ESG" },
                  { id: "biodiversityProtection", name: "Biodiversity Protection", desc: "Habitat restoration funding", cost: "Variable", points: "+1 ESG per $5K" },
                ].map((init) => (
                  <div key={init.id} className={`p-3 rounded-lg border transition-colors ${(teamState?.esgScore ?? 0) >= 300 ? "bg-slate-700/50 border-slate-600 hover:border-purple-500/50" : "bg-slate-800/50 border-slate-700"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className={`w-4 h-4 ${(teamState?.esgScore ?? 0) >= 300 ? "text-purple-400" : "text-slate-500"}`} />
                      <span className={`font-medium text-sm ${(teamState?.esgScore ?? 0) >= 300 ? "text-white" : "text-slate-500"}`}>{init.name}</span>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">{init.desc}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">{init.cost}</span>
                      <span className={(teamState?.esgScore ?? 0) >= 300 ? "text-purple-400" : "text-slate-500"}>{init.points}</span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs" disabled={(teamState?.esgScore ?? 0) < 300}>
                      {(teamState?.esgScore ?? 0) >= 300 ? "Activate" : "Locked"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tier 4: Excellence Initiatives (ESG 500+ or Round 6+) */}
          <Card className={`bg-slate-800 ${(teamState?.esgScore ?? 0) >= 500 ? "border-amber-700/50" : "border-slate-700/50 opacity-60"}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Badge className={(teamState?.esgScore ?? 0) >= 500 ? "bg-amber-600" : "bg-slate-600"}>Tier 4</Badge>
                  Excellence Initiatives
                </CardTitle>
                {(teamState?.esgScore ?? 0) >= 500 ? (
                  <Badge variant="outline" className="text-amber-400 border-amber-400">Unlocked</Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-400">Requires ESG 500+</Badge>
                )}
              </div>
              <CardDescription>Premium sustainability programs for ESG champions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-3">
                {[
                  { id: "circularEconomy", name: "Circular Economy", desc: "Full product lifecycle management", cost: "$3M/yr", points: "+120 ESG, -20% material" },
                  { id: "affordableHousing", name: "Affordable Housing", desc: "Employee housing assistance", cost: "Variable", points: "+1 ESG per $10K" },
                  { id: "executivePayRatio", name: "Executive Pay Ratio", desc: "Cap exec pay at 50x average", cost: "$0", points: "+100 ESG" },
                ].map((init) => (
                  <div key={init.id} className={`p-3 rounded-lg border transition-colors ${(teamState?.esgScore ?? 0) >= 500 ? "bg-slate-700/50 border-slate-600 hover:border-amber-500/50" : "bg-slate-800/50 border-slate-700"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className={`w-4 h-4 ${(teamState?.esgScore ?? 0) >= 500 ? "text-amber-400" : "text-slate-500"}`} />
                      <span className={`font-medium text-sm ${(teamState?.esgScore ?? 0) >= 500 ? "text-white" : "text-slate-500"}`}>{init.name}</span>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">{init.desc}</p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">{init.cost}</span>
                      <span className={(teamState?.esgScore ?? 0) >= 500 ? "text-amber-400" : "text-slate-500"}>{init.points}</span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs" disabled={(teamState?.esgScore ?? 0) < 500}>
                      {(teamState?.esgScore ?? 0) >= 500 ? "Activate" : "Locked"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Decision Submit Bar */}
      <DecisionSubmitBar
        module="FACTORY"
        getDecisions={getDecisions}
        disabled={totalAllocation !== 100}
        disabledReason={totalAllocation !== 100 ? `Allocation must equal 100% (currently ${totalAllocation}%)` : undefined}
      />

      {/* Spacer for fixed submit bar */}
      <div className="h-20" />
    </div>
  );
}
