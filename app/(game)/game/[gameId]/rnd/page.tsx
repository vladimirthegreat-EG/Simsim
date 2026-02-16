"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { PageHeader } from "@/components/ui/section-header";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/api/trpc";
import { useDecisionStore } from "@/lib/stores/decisionStore";
import { DecisionSubmitBar } from "@/components/game/DecisionSubmitBar";
import { useFeatureFlag } from "@/lib/contexts/ComplexityContext";
import { TeamState, Product as EngineProduct } from "@/engine/types";
import type { Patent } from "@/engine/types/patents";
import { SEGMENT_FEATURE_PREFERENCES } from "@/engine/types/features";
import type { ProductFeatureSet } from "@/engine/types/features";
import { RDExpansions } from "@/engine/modules/RDExpansions";
import { ArchetypeCatalog } from "@/components/game/ArchetypeCatalog";
import { FeatureRadarChart } from "@/components/game/FeatureRadarChart";
import { PatentPanel } from "@/components/game/PatentPanel";
import { NotificationPanel } from "@/components/game/NotificationPanel";
import { PlainEnglishTooltip } from "@/components/game/PlainEnglishTooltip";
import {
  Lightbulb,
  Beaker,
  Cpu,
  Sparkles,
  DollarSign,
  Clock,
  Target,
  Package,
  TrendingUp,
  Plus,
  Rocket,
  Shield,
  Zap,
  BarChart3,
  Smartphone,
} from "lucide-react";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

// Product types (extended with featureSet for new system)
interface Product {
  id: string;
  name: string;
  segment: string;
  quality: number;
  features: number;
  price: number;
  unitCost: number;
  status: "development" | "launched" | "discontinued";
  developmentProgress?: number;
  archetypeId?: string;
  featureSet?: ProductFeatureSet;
}

// Default R&D data (used when state is not available)
const defaultRD = {
  rdBudget: 0,
  activeProjects: 0,
  patentCount: 0,
  techLevel: 1,
  products: [] as Product[],
  developingProducts: [] as Product[],
  unlockedTechs: [] as string[],
  patents: [] as Patent[],
};

const segments = [
  { id: "Budget", name: "Budget", priceRange: "$100 - $300", qualityExpectation: 50, features: "Basic", developmentCost: 5_000_000, developmentTime: 1 },
  { id: "General", name: "General", priceRange: "$300 - $600", qualityExpectation: 65, features: "Standard", developmentCost: 10_000_000, developmentTime: 2 },
  { id: "Enthusiast", name: "Enthusiast", priceRange: "$600 - $1,000", qualityExpectation: 80, features: "Advanced", developmentCost: 20_000_000, developmentTime: 2 },
  { id: "Professional", name: "Professional", priceRange: "$1,000 - $1,500", qualityExpectation: 90, features: "Premium", developmentCost: 35_000_000, developmentTime: 3 },
  { id: "Active Lifestyle", name: "Active Lifestyle", priceRange: "$400 - $800", qualityExpectation: 70, features: "Specialized", developmentCost: 15_000_000, developmentTime: 2 },
];

const techUpgrades = [
  { id: "miniaturization", name: "Miniaturization Tech", cost: 25_000_000, effect: "Reduce unit costs by 10%", icon: Cpu, requires: 0 },
  { id: "battery", name: "Advanced Battery Tech", cost: 30_000_000, effect: "+15 quality for all products", icon: Zap, requires: 1 },
  { id: "display", name: "Next-Gen Display", cost: 40_000_000, effect: "+20 quality, +10 features", icon: Sparkles, requires: 1 },
  { id: "ai", name: "AI Integration", cost: 50_000_000, effect: "+25 features for all products", icon: Beaker, requires: 2 },
];

export default function RDPage({ params }: PageProps) {
  const { gameId } = use(params);
  const [activeTab, setActiveTab] = useState("overview");

  // Get decisions from store
  const { rd, setRDDecisions } = useDecisionStore();

  // Decision states (synced with store)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
  const [selectedArchetype, setSelectedArchetype] = useState<string | undefined>(undefined);
  const [newProductName, setNewProductName] = useState("");
  const [qualityTarget, setQualityTarget] = useState(70);
  const [featuresTarget, setFeaturesTarget] = useState(50);
  const [priceTarget, setPriceTarget] = useState(400);
  const [rdInvestment, setRdInvestment] = useState(rd.rdInvestment);
  const [pendingProducts, setPendingProducts] = useState<Array<{
    name: string;
    segment: string;
    qualityTarget: number;
    featuresTarget: number;
    priceTarget: number;
    archetypeId?: string;
  }>>([]);
  const [pendingTechUpgrades, setPendingTechUpgrades] = useState<string[]>([]);
  const [pendingPatentFilings, setPendingPatentFilings] = useState<string[]>([]);
  const [pendingLicenses, setPendingLicenses] = useState<string[]>([]);
  const [pendingChallenges, setPendingChallenges] = useState<string[]>([]);
  const [developMode, setDevelopMode] = useState<"archetype" | "legacy">("archetype");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Sync store changes to local state
  useEffect(() => {
    if (rd.rdInvestment !== rdInvestment) setRdInvestment(rd.rdInvestment);
  }, [rd.rdInvestment]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rd.newProducts && rd.newProducts.length > 0 &&
        JSON.stringify(rd.newProducts) !== JSON.stringify(pendingProducts)) {
      setPendingProducts(rd.newProducts);
    }
  }, [rd.newProducts]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (rd.techUpgrades && rd.techUpgrades.length > 0 &&
        JSON.stringify(rd.techUpgrades) !== JSON.stringify(pendingTechUpgrades)) {
      setPendingTechUpgrades(rd.techUpgrades);
    }
  }, [rd.techUpgrades]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state changes to store
  useEffect(() => {
    setRDDecisions({ rdInvestment });
  }, [rdInvestment, setRDDecisions]);

  useEffect(() => {
    setRDDecisions({ newProducts: pendingProducts });
  }, [pendingProducts, setRDDecisions]);

  useEffect(() => {
    setRDDecisions({ techUpgrades: pendingTechUpgrades });
  }, [pendingTechUpgrades, setRDDecisions]);

  useEffect(() => {
    setRDDecisions({
      patentFilings: pendingPatentFilings,
      patentLicenseRequests: pendingLicenses,
      patentChallenges: pendingChallenges,
    });
  }, [pendingPatentFilings, pendingLicenses, pendingChallenges, setRDDecisions]);

  // Handle start development (legacy mode)
  const handleStartDevelopment = () => {
    if (selectedSegment && newProductName) {
      setPendingProducts(prev => [...prev, {
        name: newProductName,
        segment: selectedSegment,
        qualityTarget,
        featuresTarget,
        priceTarget,
      }]);
      setSelectedSegment(null);
      setNewProductName("");
      setQualityTarget(70);
      setFeaturesTarget(50);
      setPriceTarget(400);
    }
  };

  // Handle archetype-based development
  const handleArchetypeDevelopment = () => {
    if (selectedArchetype && newProductName && selectedSegment) {
      setPendingProducts(prev => [...prev, {
        name: newProductName,
        segment: selectedSegment,
        qualityTarget: 0, // Determined by archetype + techs
        featuresTarget: 0,
        priceTarget,
        archetypeId: selectedArchetype,
      }]);
      setSelectedArchetype(undefined);
      setSelectedSegment(null);
      setNewProductName("");
      setPriceTarget(400);
    }
  };

  // Handle research tech upgrade
  const handleResearchTech = (techId: string) => {
    setPendingTechUpgrades(prev => [...prev, techId]);
  };

  // Patent handlers
  const handleFilePatent = (techId: string) => {
    setPendingPatentFilings(prev => [...prev, techId]);
  };
  const handleLicensePatent = (patentId: string) => {
    setPendingLicenses(prev => [...prev, patentId]);
  };
  const handleChallengePatent = (patentId: string) => {
    setPendingChallenges(prev => [...prev, patentId]);
  };

  // Get current decisions for submission
  const getDecisions = useCallback(() => ({
    rdInvestment,
    newProducts: pendingProducts,
    techUpgrades: pendingTechUpgrades,
    patentFilings: pendingPatentFilings,
    patentLicenseRequests: pendingLicenses,
    patentChallenges: pendingChallenges,
  }), [rdInvestment, pendingProducts, pendingTechUpgrades, pendingPatentFilings, pendingLicenses, pendingChallenges]);

  const { data: teamState } = trpc.team.getMyState.useQuery();
  const hasProductTimeline = useFeatureFlag("productDevelopmentTimeline");

  // Parse team state
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

  // Compute R&D data from state
  const rdData = useMemo(() => {
    if (!state) return defaultRD;

    const launchedProducts: Product[] = (state.products || [])
      .filter((p: EngineProduct) => p.developmentStatus === 'launched' || p.developmentStatus === 'ready')
      .map((p: EngineProduct) => ({
        id: p.id,
        name: p.name,
        segment: p.segment,
        quality: p.quality,
        features: p.features,
        price: p.price,
        unitCost: p.unitCost,
        status: 'launched' as const,
        archetypeId: p.archetypeId,
        featureSet: p.featureSet,
      }));

    const developingProducts: Product[] = (state.products || [])
      .filter((p: EngineProduct) => p.developmentStatus === 'in_development')
      .map((p: EngineProduct) => ({
        id: p.id,
        name: p.name,
        segment: p.segment,
        quality: p.targetQuality || p.quality,
        features: p.targetFeatures || p.features,
        price: p.price,
        unitCost: p.unitCost,
        status: 'development' as const,
        developmentProgress: p.developmentProgress || 0,
        archetypeId: p.archetypeId,
        featureSet: p.featureSet,
      }));

    // Handle patents: could be number (legacy) or Patent[]
    const patentsRaw = state.patents;
    const patentList: Patent[] = Array.isArray(patentsRaw) ? patentsRaw : [];
    const patentCount = Array.isArray(patentsRaw) ? patentsRaw.filter((p: Patent) => p.status === 'active').length : (typeof patentsRaw === 'number' ? patentsRaw : 0);

    return {
      rdBudget: state.rdBudget || 0,
      activeProjects: developingProducts.length,
      patentCount,
      techLevel: Math.min(5, Math.floor((state.rdProgress || 0) / 100) + 1),
      products: launchedProducts,
      developingProducts,
      unlockedTechs: state.unlockedTechnologies || [],
      patents: patentList,
    };
  }, [state]);

  // Get tech tree nodes for ArchetypeCatalog
  const techNodes = useMemo(() => {
    try {
      return RDExpansions.getTechTree().map(n => ({ id: n.id, tier: n.tier }));
    } catch {
      return [];
    }
  }, []);

  // Get patentable techs (techs that haven't been filed yet)
  const patentableTechs = useMemo(() => {
    try {
      const { PatentEngine } = require("@/engine/modules/PatentEngine");
      return PatentEngine.getPatentableTechs(
        { patents: rdData.patents, filedTechs: {} },
        rdData.unlockedTechs
      );
    } catch {
      // PatentEngine may not be available in all contexts
      return rdData.unlockedTechs.filter(techId => {
        const node = techNodes.find(n => n.id === techId);
        return node && node.tier >= 2;
      });
    }
  }, [rdData.unlockedTechs, rdData.patents, techNodes]);

  // Build notifications from state
  const notifications = useMemo(() => {
    const notifs: Array<{
      id: string;
      type: "threat" | "opportunity" | "success" | "info";
      title: string;
      message: string;
      round: number;
    }> = [];
    if (!state) return notifs;
    const round = state.round || 1;

    if (rdData.products.length === 0 && round >= 2) {
      notifs.push({
        id: "no-products",
        type: "threat",
        title: "No Products Launched",
        message: "You have no products on the market. Develop and launch a product to start earning revenue.",
        round,
      });
    }
    if (rdData.unlockedTechs.length === 0 && round >= 3) {
      notifs.push({
        id: "no-research",
        type: "opportunity",
        title: "Research Opportunity",
        message: "You haven't researched any technologies yet. Tech unlocks better products and competitive advantages.",
        round,
      });
    }
    if (rdData.patentCount > 0) {
      notifs.push({
        id: "patents-active",
        type: "success",
        title: "Patents Active",
        message: `You have ${rdData.patentCount} active patent(s) protecting your innovations.`,
        round,
      });
    }
    return notifs;
  }, [state, rdData]);

  // Selected product for radar chart
  const selectedProductData = useMemo(() => {
    return rdData.products.find(p => p.id === selectedProduct);
  }, [rdData.products, selectedProduct]);

  const getSegmentInfo = (segmentId: string) => segments.find(s => s.id === segmentId);

  // Get segment preferences for radar chart
  const getSegmentPrefs = (segment: string) => {
    const prefs = SEGMENT_FEATURE_PREFERENCES[segment as keyof typeof SEGMENT_FEATURE_PREFERENCES];
    if (!prefs) return undefined;
    // Normalize to 0-100 for radar display (prefs are weights that sum to 1)
    const maxWeight = Math.max(prefs.battery, prefs.camera, prefs.ai, prefs.durability, prefs.display, prefs.connectivity);
    return {
      battery: Math.round((prefs.battery / maxWeight) * 100),
      camera: Math.round((prefs.camera / maxWeight) * 100),
      ai: Math.round((prefs.ai / maxWeight) * 100),
      durability: Math.round((prefs.durability / maxWeight) * 100),
      display: Math.round((prefs.display / maxWeight) * 100),
      connectivity: Math.round((prefs.connectivity / maxWeight) * 100),
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Research & Development"
        subtitle="Develop new products, invest in technology, and manage your product portfolio"
        icon={<Lightbulb className="w-7 h-7" />}
        iconColor="text-purple-400"
      />

      {/* Notifications */}
      {notifications.length > 0 && (
        <NotificationPanel notifications={notifications} maxVisible={3} />
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700 flex-wrap">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
            Overview
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-slate-700">
            Products
          </TabsTrigger>
          <TabsTrigger value="develop" className="data-[state=active]:bg-slate-700">
            Develop
          </TabsTrigger>
          <TabsTrigger value="technology" className="data-[state=active]:bg-slate-700">
            Technology
          </TabsTrigger>
          <TabsTrigger value="patents" className="data-[state=active]:bg-slate-700">
            Patents
          </TabsTrigger>
        </TabsList>

        {/* ==================== OVERVIEW TAB ==================== */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Active Products"
              value={rdData.products.length}
              icon={<Package className="w-5 h-5" />}
              variant="purple"
            />
            <StatCard
              label="In Development"
              value={rdData.developingProducts.length}
              icon={<Beaker className="w-5 h-5" />}
              variant="info"
            />
            <StatCard
              label="Techs Researched"
              value={rdData.unlockedTechs.length}
              icon={<Cpu className="w-5 h-5" />}
              variant="success"
            />
            <StatCard
              label="Active Patents"
              value={rdData.patentCount}
              icon={<Shield className="w-5 h-5" />}
              variant="warning"
            />
          </div>

          {/* R&D Investment */}
          <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-purple-400" />
                R&D Investment
                <PlainEnglishTooltip
                  what="Money spent on research each round"
                  why="Higher investment unlocks tech faster and improves product quality"
                  action="Set between $0 and $30M per round. Higher spending = faster tech progress."
                />
              </CardTitle>
              <CardDescription className="text-slate-400">
                Invest in ongoing research to improve product quality and reduce development costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-slate-700/30 rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Investment Amount</span>
                  <span className="text-purple-400 font-semibold text-xl">{formatCurrency(rdInvestment)}</span>
                </div>
                <Slider
                  data-testid="slider-rd-investment"
                  value={[rdInvestment]}
                  onValueChange={(values) => setRdInvestment(values[0])}
                  max={30000000}
                  step={1000000}
                  variant="purple"
                />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="text-slate-400 text-sm">Quality Bonus</div>
                  <div className="text-green-400 font-medium">+{Math.floor(rdInvestment / 5_000_000)}%</div>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="text-slate-400 text-sm">Cost Reduction</div>
                  <div className="text-green-400 font-medium">-{Math.floor(rdInvestment / 10_000_000)}%</div>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg">
                  <div className="text-slate-400 text-sm">Dev Speed Bonus</div>
                  <div className="text-green-400 font-medium">+{Math.floor(rdInvestment / 15_000_000) * 10}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Summary */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Active Products</CardTitle>
              </CardHeader>
              <CardContent>
                {rdData.products.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No active products</p>
                    <p className="text-sm">Develop products in the Develop tab</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rdData.products.map((product) => (
                      <div key={product.id} className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{product.name}</span>
                            {product.archetypeId && (
                              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                            )}
                          </div>
                          <Badge className="bg-green-600">{product.segment}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                          <div>
                            <span className="text-slate-400">Quality</span>
                            <div className="text-white">{product.quality}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Price</span>
                            <div className="text-green-400">${product.price}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Margin</span>
                            <div className="text-blue-400">
                              {product.price > 0 ? Math.round((1 - product.unitCost / product.price) * 100) : 0}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">In Development</CardTitle>
              </CardHeader>
              <CardContent>
                {rdData.developingProducts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Beaker className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No products in development</p>
                    <p className="text-sm">Start a new project in the Develop tab</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rdData.developingProducts.map((product) => (
                      <div key={product.id} className="p-3 bg-slate-700/50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-white font-medium">{product.name}</span>
                          <span className="text-slate-400 text-sm">
                            {hasProductTimeline ? `${product.developmentProgress}%` : 'In Progress'}
                          </span>
                        </div>
                        {hasProductTimeline && (
                          <EnhancedProgress value={product.developmentProgress || 0} variant="purple" size="sm" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== PRODUCTS TAB ==================== */}
        <TabsContent value="products" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Product Portfolio</CardTitle>
              <CardDescription className="text-slate-400">
                Manage your launched products - click a product to see its feature breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rdData.products.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No products in your portfolio</p>
                  <p className="text-sm mt-2">Develop and launch products to start selling in the market</p>
                  <Button
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                    onClick={() => setActiveTab("develop")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Develop New Product
                  </Button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Product list */}
                  <div className="space-y-3">
                    {rdData.products.map((product) => (
                      <Card
                        key={product.id}
                        className={`bg-slate-700 border-slate-600 cursor-pointer transition-all ${
                          selectedProduct === product.id ? 'border-purple-500 ring-1 ring-purple-500/30' : 'hover:border-slate-500'
                        }`}
                        onClick={() => setSelectedProduct(selectedProduct === product.id ? null : product.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-white font-medium">{product.name}</h3>
                                {product.archetypeId && (
                                  <Badge className="text-[10px] bg-purple-500/20 text-purple-400 border-purple-500/30">
                                    {product.archetypeId.replace(/_/g, ' ')}
                                  </Badge>
                                )}
                              </div>
                              <Badge className="mt-1">{product.segment}</Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-green-400 font-medium">${product.price}</div>
                              <div className="text-slate-400 text-sm">Cost: ${product.unitCost}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <EnhancedProgress
                              value={product.quality}
                              variant="purple"
                              size="sm"
                              showLabel showValue
                              label="Quality"
                              formatValue={(v) => `${v}`}
                            />
                            <EnhancedProgress
                              value={product.features}
                              variant="info"
                              size="sm"
                              showLabel showValue
                              label="Features"
                              formatValue={(v) => `${v}`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Feature Radar Chart for selected product */}
                  <div>
                    {selectedProductData ? (
                      <Card className="bg-slate-700/50 border-slate-600">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-white text-base flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-purple-400" />
                            Feature Breakdown: {selectedProductData.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <FeatureRadarChart
                            features={selectedProductData.featureSet || {
                              battery: selectedProductData.features,
                              camera: selectedProductData.features,
                              ai: selectedProductData.features,
                              durability: selectedProductData.features,
                              display: selectedProductData.features,
                              connectivity: selectedProductData.features,
                            }}
                            segmentPreferences={getSegmentPrefs(selectedProductData.segment)}
                            size={280}
                            label={selectedProductData.name}
                          />
                          <div className="flex justify-center gap-4 text-xs text-slate-400 mt-2">
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-purple-500" />
                              Product
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-amber-500/60" />
                              {selectedProductData.segment} Ideal
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                        <div className="text-center">
                          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p>Select a product to see its feature radar</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== DEVELOP TAB ==================== */}
        <TabsContent value="develop" className="space-y-6">
          {/* Mode Selector */}
          <div className="flex gap-2">
            <Button
              variant={developMode === "archetype" ? "default" : "outline"}
              className={developMode === "archetype" ? "bg-purple-600 hover:bg-purple-700" : "border-slate-600 text-slate-300"}
              onClick={() => setDevelopMode("archetype")}
            >
              <Smartphone className="w-4 h-4 mr-2" />
              Phone Archetypes
            </Button>
            <Button
              variant={developMode === "legacy" ? "default" : "outline"}
              className={developMode === "legacy" ? "bg-slate-600 hover:bg-slate-700" : "border-slate-600 text-slate-300"}
              onClick={() => setDevelopMode("legacy")}
            >
              <Target className="w-4 h-4 mr-2" />
              Custom Build
            </Button>
          </div>

          {/* Archetype Mode */}
          {developMode === "archetype" && (
            <div className="space-y-6">
              <ArchetypeCatalog
                unlockedTechs={rdData.unlockedTechs}
                allTechNodes={techNodes}
                onSelectArchetype={(id) => setSelectedArchetype(id)}
                selectedArchetype={selectedArchetype}
              />

              {selectedArchetype && (
                <Card className="bg-slate-800 border-purple-700/50">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-purple-400" />
                      Configure {selectedArchetype.replace(/_/g, ' ')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">Product Name</label>
                      <input
                        type="text"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="Enter product name..."
                        className="w-full bg-slate-700 border-slate-600 rounded px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 text-sm mb-3 block">Target Segment</label>
                      <div className="grid grid-cols-5 gap-2">
                        {segments.map((seg) => (
                          <button
                            key={seg.id}
                            className={`p-2 rounded-lg border text-center text-sm transition-all ${
                              selectedSegment === seg.id
                                ? 'border-purple-500 bg-purple-500/10 text-white'
                                : 'border-slate-600 bg-slate-700/50 text-slate-400 hover:border-slate-500'
                            }`}
                            onClick={() => setSelectedSegment(seg.id)}
                          >
                            {seg.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Target Price</span>
                        <span className="text-green-400 font-semibold">${priceTarget}</span>
                      </div>
                      <Slider
                        value={[priceTarget]}
                        onValueChange={(values) => setPriceTarget(values[0])}
                        min={100} max={1500} step={50}
                        variant="success"
                      />
                    </div>

                    <Button
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      onClick={handleArchetypeDevelopment}
                      disabled={!newProductName || !selectedSegment}
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      Start Archetype Development
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Legacy Mode */}
          {developMode === "legacy" && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  Custom Product Development
                  <HelpTooltip text="Build a product from scratch by choosing segment, quality, and features targets. The archetype mode is recommended for better feature optimization." />
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Choose a market segment and manually configure your new product
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-slate-300 text-sm mb-3 block">Target Segment</label>
                  <div className="grid md:grid-cols-5 gap-3">
                    {segments.map((segment) => (
                      <Card
                        key={segment.id}
                        className={`bg-slate-700 border-slate-600 cursor-pointer transition-all ${
                          selectedSegment === segment.id ? 'border-purple-500 ring-2 ring-purple-500/20' : 'hover:border-slate-500'
                        }`}
                        onClick={() => setSelectedSegment(segment.id)}
                      >
                        <CardContent className="p-3 text-center">
                          <div className="text-white font-medium">{segment.name}</div>
                          <div className="text-xs text-slate-400 mt-1">{segment.priceRange}</div>
                          <div className="text-xs text-purple-400 mt-1">{formatCurrency(segment.developmentCost)}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {selectedSegment && (
                  <>
                    <div>
                      <label className="text-slate-300 text-sm mb-2 block">Product Name</label>
                      <input
                        type="text"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        placeholder="Enter product name..."
                        className="w-full bg-slate-700 border-slate-600 rounded px-3 py-2 text-white"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 font-medium">Target Quality</span>
                          <span className="text-purple-400 font-semibold">{qualityTarget}</span>
                        </div>
                        <Slider
                          value={[qualityTarget]}
                          onValueChange={(values) => setQualityTarget(values[0])}
                          min={30} max={100} step={1}
                          variant="purple"
                        />
                        <div className="text-xs text-slate-400">
                          Segment expects: {getSegmentInfo(selectedSegment)?.qualityExpectation}
                        </div>
                      </div>
                      <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300 font-medium">Target Features</span>
                          <span className="text-blue-400 font-semibold">{featuresTarget}</span>
                        </div>
                        <Slider
                          value={[featuresTarget]}
                          onValueChange={(values) => setFeaturesTarget(values[0])}
                          min={20} max={100} step={1}
                          variant="info"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Target Price</span>
                        <span className="text-green-400 font-semibold text-lg">${priceTarget}</span>
                      </div>
                      <Slider
                        value={[priceTarget]}
                        onValueChange={(values) => setPriceTarget(values[0])}
                        min={100} max={1500} step={50}
                        variant="success"
                      />
                      <div className="text-xs text-slate-400">
                        Segment price range: {getSegmentInfo(selectedSegment)?.priceRange}
                      </div>
                    </div>

                    <div className="p-4 bg-purple-900/30 border border-purple-700 rounded-lg">
                      <h3 className="text-purple-400 font-medium mb-3">Development Summary</h3>
                      <div className="grid md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Cost</span>
                          <div className="text-white font-medium">
                            {formatCurrency(getSegmentInfo(selectedSegment)?.developmentCost || 0)}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Dev Time</span>
                          <div className="text-white font-medium">
                            {getSegmentInfo(selectedSegment)?.developmentTime} round(s)
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Est. Unit Cost</span>
                          <div className="text-white font-medium">
                            ${Math.round(priceTarget * 0.4 + qualityTarget * 2 + featuresTarget * 1.5)}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Est. Margin</span>
                          <div className="text-green-400 font-medium">
                            {Math.round((1 - (priceTarget * 0.4 + qualityTarget * 2 + featuresTarget * 1.5) / priceTarget) * 100)}%
                          </div>
                        </div>
                      </div>
                      <Button
                        className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                        onClick={handleStartDevelopment}
                        disabled={!newProductName}
                      >
                        <Rocket className="w-4 h-4 mr-2" />
                        Start Development
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Pending Products */}
          {pendingProducts.length > 0 && (
            <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg">
              <p className="text-green-400 text-sm font-medium mb-2">Pending Product Development:</p>
              <div className="space-y-1">
                {pendingProducts.map((product, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-slate-300">
                      {product.name} ({product.segment})
                      {product.archetypeId && (
                        <Badge className="ml-2 text-[10px] bg-purple-500/20 text-purple-400 border-none">
                          {product.archetypeId.replace(/_/g, ' ')}
                        </Badge>
                      )}
                    </span>
                    <Button
                      size="sm" variant="ghost"
                      className="text-red-400 h-6 px-2"
                      onClick={() => setPendingProducts(prev => prev.filter((_, i) => i !== idx))}
                    >
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products in Development */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Products in Development</CardTitle>
            </CardHeader>
            <CardContent>
              {rdData.developingProducts.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No products currently in development</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rdData.developingProducts.map((product) => (
                    <div key={product.id} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{product.name}</span>
                          {product.archetypeId && (
                            <Badge className="text-[10px] bg-purple-500/20 text-purple-400 border-none">
                              {product.archetypeId.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                        <Badge>{product.segment}</Badge>
                      </div>
                      {hasProductTimeline ? (
                        <EnhancedProgress
                          value={product.developmentProgress || 0}
                          variant="purple" size="md"
                          showLabel showValue
                          label="Progress"
                          formatValue={(v) => `${v}%`}
                        />
                      ) : (
                        <div className="text-slate-400 text-sm">Launching next round</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TECHNOLOGY TAB ==================== */}
        <TabsContent value="technology" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Technology Upgrades
                <PlainEnglishTooltip
                  what="Technologies you can research to improve your products"
                  why="Each tech gives specific bonuses (quality, features, cost reduction). Higher tiers unlock better phone archetypes."
                  action="Click 'Research' to start researching a tech. It costs money upfront but pays off through better products."
                />
              </CardTitle>
              <CardDescription className="text-slate-400">
                Research new technologies to improve all your products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {techUpgrades.map((tech) => {
                  const isUnlocked = rdData.techLevel >= tech.requires;
                  const isOwned = rdData.unlockedTechs.includes(tech.id);
                  return (
                    <Card
                      key={tech.id}
                      className={`bg-slate-700 border-slate-600 ${!isUnlocked ? 'opacity-50' : ''}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isOwned ? 'bg-green-500/20' : 'bg-purple-500/20'
                            }`}>
                              <tech.icon className={`w-5 h-5 ${isOwned ? 'text-green-400' : 'text-purple-400'}`} />
                            </div>
                            <div>
                              <h3 className="text-white font-medium">{tech.name}</h3>
                              <p className="text-green-400 text-sm">{tech.effect}</p>
                            </div>
                          </div>
                          {isOwned || pendingTechUpgrades.includes(tech.id) ? (
                            <Badge className="bg-green-600">{isOwned ? 'Owned' : 'Researching'}</Badge>
                          ) : !isUnlocked ? (
                            <Badge variant="outline" className="border-slate-500">
                              Requires Tech Level {tech.requires}
                            </Badge>
                          ) : (
                            <div className="text-right">
                              <div className="text-white font-medium">{formatCurrency(tech.cost)}</div>
                              <Button
                                size="sm"
                                className="mt-2 bg-purple-600 hover:bg-purple-700"
                                onClick={() => handleResearchTech(tech.id)}
                              >
                                Research
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Tech Progress */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Technology Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400">{rdData.techLevel}</div>
                  <div className="text-slate-400 text-sm">Current Level</div>
                </div>
                <div className="flex-1">
                  <EnhancedProgress value={(rdData.techLevel / 5) * 100} variant="purple" size="lg" />
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-400">5</div>
                  <div className="text-slate-400 text-sm">Max Level</div>
                </div>
              </div>
              {rdData.unlockedTechs.length > 0 && (
                <div className="mt-4">
                  <div className="text-slate-400 text-sm mb-2">Researched Technologies ({rdData.unlockedTechs.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {rdData.unlockedTechs.map((techId) => (
                      <Badge key={techId} className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                        {techId.replace(/_/g, ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== PATENTS TAB ==================== */}
        <TabsContent value="patents" className="space-y-6">
          <PatentPanel
            ownPatents={rdData.patents
              .filter(p => p.status === 'active')
              .map(p => ({
                id: p.id,
                techId: p.techId,
                family: p.family,
                tier: p.tier,
                status: p.status,
                expiresRound: p.expiresRound,
                licensedTo: p.licensedTo,
                licenseFeePerRound: p.licenseFeePerRound,
                exclusiveBonus: p.exclusiveBonus,
                blockingPower: p.blockingPower,
              }))}
            blockingPatents={[]}
            patentableTechs={patentableTechs}
            currentRound={state?.round || 1}
            cash={state?.cash || 0}
            onFilePatent={handleFilePatent}
            onLicensePatent={handleLicensePatent}
            onChallengePatent={handleChallengePatent}
          />

          {/* Pending patent actions */}
          {(pendingPatentFilings.length > 0 || pendingLicenses.length > 0 || pendingChallenges.length > 0) && (
            <Card className="bg-green-900/20 border-green-700">
              <CardContent className="p-4">
                <p className="text-green-400 text-sm font-medium mb-2">Pending Patent Actions:</p>
                <div className="space-y-1 text-sm">
                  {pendingPatentFilings.map((techId, idx) => (
                    <div key={`file-${idx}`} className="flex justify-between items-center">
                      <span className="text-slate-300">File patent on: {techId.replace(/_/g, ' ')}</span>
                      <Button size="sm" variant="ghost" className="text-red-400 h-6 px-2"
                        onClick={() => setPendingPatentFilings(prev => prev.filter((_, i) => i !== idx))}
                      >Cancel</Button>
                    </div>
                  ))}
                  {pendingLicenses.map((patentId, idx) => (
                    <div key={`lic-${idx}`} className="flex justify-between items-center">
                      <span className="text-slate-300">License patent: {patentId}</span>
                      <Button size="sm" variant="ghost" className="text-red-400 h-6 px-2"
                        onClick={() => setPendingLicenses(prev => prev.filter((_, i) => i !== idx))}
                      >Cancel</Button>
                    </div>
                  ))}
                  {pendingChallenges.map((patentId, idx) => (
                    <div key={`chal-${idx}`} className="flex justify-between items-center">
                      <span className="text-slate-300">Challenge patent: {patentId}</span>
                      <Button size="sm" variant="ghost" className="text-red-400 h-6 px-2"
                        onClick={() => setPendingChallenges(prev => prev.filter((_, i) => i !== idx))}
                      >Cancel</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Decision Submit Bar */}
      <DecisionSubmitBar module="RD" getDecisions={getDecisions} />

      {/* Spacer for fixed submit bar */}
      <div className="h-20" />
    </div>
  );
}
