"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Lightbulb,
  Beaker,
  Cpu,
  Sparkles,
  DollarSign,
  Clock,
  Target,
  Package,
  Settings,
  TrendingUp,
  Plus,
  Rocket,
  Shield,
  Zap,
} from "lucide-react";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

// Product types
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
}

// Default R&D data (used when state is not available)
const defaultRD = {
  rdBudget: 0,
  activeProjects: 0,
  patents: 3,
  techLevel: 1,
  products: [] as Product[],
  developingProducts: [] as Product[],
};

const segments = [
  {
    id: "Budget",
    name: "Budget",
    priceRange: "$100 - $300",
    qualityExpectation: 50,
    features: "Basic",
    developmentCost: 5_000_000,
    developmentTime: 1,
  },
  {
    id: "General",
    name: "General",
    priceRange: "$300 - $600",
    qualityExpectation: 65,
    features: "Standard",
    developmentCost: 10_000_000,
    developmentTime: 2,
  },
  {
    id: "Enthusiast",
    name: "Enthusiast",
    priceRange: "$600 - $1,000",
    qualityExpectation: 80,
    features: "Advanced",
    developmentCost: 20_000_000,
    developmentTime: 2,
  },
  {
    id: "Professional",
    name: "Professional",
    priceRange: "$1,000 - $1,500",
    qualityExpectation: 90,
    features: "Premium",
    developmentCost: 35_000_000,
    developmentTime: 3,
  },
  {
    id: "Active Lifestyle",
    name: "Active Lifestyle",
    priceRange: "$400 - $800",
    qualityExpectation: 70,
    features: "Specialized",
    developmentCost: 15_000_000,
    developmentTime: 2,
  },
];

const techUpgrades = [
  {
    id: "miniaturization",
    name: "Miniaturization Tech",
    cost: 25_000_000,
    effect: "Reduce unit costs by 10%",
    icon: Cpu,
    requires: 0,
  },
  {
    id: "battery",
    name: "Advanced Battery Tech",
    cost: 30_000_000,
    effect: "+15 quality for all products",
    icon: Zap,
    requires: 1,
  },
  {
    id: "display",
    name: "Next-Gen Display",
    cost: 40_000_000,
    effect: "+20 quality, +10 features",
    icon: Sparkles,
    requires: 1,
  },
  {
    id: "ai",
    name: "AI Integration",
    cost: 50_000_000,
    effect: "+25 features for all products",
    icon: Beaker,
    requires: 2,
  },
];

export default function RDPage({ params }: PageProps) {
  const { gameId } = use(params);
  const [activeTab, setActiveTab] = useState("overview");

  // Get decisions from store
  const { rd, setRDDecisions } = useDecisionStore();

  // Decision states (synced with store)
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);
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
  }>>([]);
  const [pendingTechUpgrades, setPendingTechUpgrades] = useState<string[]>([]);
  const [pendingPatents, setPendingPatents] = useState(0);

  // Sync store changes to local state (for when decisions are loaded from server)
  useEffect(() => {
    if (rd.rdInvestment !== rdInvestment) {
      setRdInvestment(rd.rdInvestment);
    }
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

  // Sync pending products to store
  useEffect(() => {
    setRDDecisions({ newProducts: pendingProducts });
  }, [pendingProducts, setRDDecisions]);

  // Sync tech upgrades to store
  useEffect(() => {
    setRDDecisions({ techUpgrades: pendingTechUpgrades });
  }, [pendingTechUpgrades, setRDDecisions]);

  // Handle start development
  const handleStartDevelopment = () => {
    if (selectedSegment && newProductName) {
      setPendingProducts(prev => [...prev, {
        name: newProductName,
        segment: selectedSegment,
        qualityTarget: qualityTarget,
        featuresTarget: featuresTarget,
        priceTarget: priceTarget,
      }]);
      // Reset form
      setSelectedSegment(null);
      setNewProductName("");
      setQualityTarget(70);
      setFeaturesTarget(50);
      setPriceTarget(400);
    }
  };

  // Handle research tech upgrade
  const handleResearchTech = (techId: string) => {
    setPendingTechUpgrades(prev => [...prev, techId]);
  };

  // Handle file patent
  const handleFilePatent = () => {
    setPendingPatents(prev => prev + 1);
  };

  // Get current decisions for submission
  const getDecisions = useCallback(() => ({
    rdInvestment,
    newProducts: pendingProducts,
    techUpgrades: pendingTechUpgrades,
  }), [rdInvestment, pendingProducts, pendingTechUpgrades]);

  const { data: teamState } = trpc.team.getMyState.useQuery();

  // Feature flags
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

    // Separate launched products from those in development
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
      }));

    return {
      rdBudget: state.rdBudget || 0,
      activeProjects: developingProducts.length,
      patents: state.patents || 0,
      techLevel: Math.min(5, Math.floor((state.rdProgress || 0) / 100) + 1),
      products: launchedProducts,
      developingProducts,
    };
  }, [state]);

  const getSegmentInfo = (segmentId: string) => {
    return segments.find(s => s.id === segmentId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Research & Development"
        subtitle="Develop new products, invest in technology, and manage your product portfolio"
        icon={<Lightbulb className="w-7 h-7" />}
        iconColor="text-purple-400"
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700">
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

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
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
              label="Tech Level"
              value={rdData.techLevel}
              icon={<Cpu className="w-5 h-5" />}
              variant="success"
            />
            <StatCard
              label="Patents"
              value={rdData.patents}
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
                          <span className="text-white font-medium">{product.name}</span>
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

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Product Portfolio</CardTitle>
              <CardDescription className="text-slate-400">
                Manage your launched products and adjust pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rdData.products.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No products in your portfolio</p>
                  <p className="text-sm mt-2">
                    Develop and launch products to start selling in the market
                  </p>
                  <Button
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                    onClick={() => setActiveTab("develop")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Develop New Product
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {rdData.products.map((product) => (
                    <Card key={product.id} className="bg-slate-700 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-white font-medium">{product.name}</h3>
                            <Badge className="mt-1">{product.segment}</Badge>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-medium">${product.price}</div>
                            <div className="text-slate-400 text-sm">Unit cost: ${product.unitCost}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <EnhancedProgress
                            value={product.quality}
                            variant="purple"
                            size="sm"
                            showLabel
                            showValue
                            label="Quality"
                            formatValue={(v) => `${v}`}
                          />
                          <EnhancedProgress
                            value={product.features}
                            variant="info"
                            size="sm"
                            showLabel
                            showValue
                            label="Features"
                            formatValue={(v) => `${v}`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Develop Tab */}
        <TabsContent value="develop" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Rocket className="w-5 h-5" />
                Start New Product Development
              </CardTitle>
              <CardDescription className="text-slate-400">
                Choose a market segment and configure your new product
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Segment Selection */}
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
                        <div className="text-xs text-purple-400 mt-1">
                          {formatCurrency(segment.developmentCost)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {selectedSegment && (
                <>
                  {/* Product Name */}
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

                  {/* Quality & Features */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Target Quality</span>
                        <span className="text-purple-400 font-semibold">{qualityTarget}</span>
                      </div>
                      <Slider
                        value={[qualityTarget]}
                        onValueChange={(values) => setQualityTarget(values[0])}
                        min={30}
                        max={100}
                        step={1}
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
                        min={20}
                        max={100}
                        step={1}
                        variant="info"
                      />
                    </div>
                  </div>

                  {/* Price Target */}
                  <div className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-medium">Target Price</span>
                      <span className="text-green-400 font-semibold text-lg">${priceTarget}</span>
                    </div>
                    <Slider
                      value={[priceTarget]}
                      onValueChange={(values) => setPriceTarget(values[0])}
                      min={100}
                      max={1500}
                      step={50}
                      variant="success"
                    />
                    <div className="text-xs text-slate-400">
                      Segment price range: {getSegmentInfo(selectedSegment)?.priceRange}
                    </div>
                  </div>

                  {/* Development Summary */}
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
                        <span className="text-slate-400">Development Time</span>
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
              {pendingProducts.length > 0 && (
                <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                  <p className="text-green-400 text-sm font-medium mb-2">Pending Product Development:</p>
                  <div className="space-y-1">
                    {pendingProducts.map((product, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                        <span className="text-slate-300">{product.name} ({product.segment})</span>
                        <Button
                          size="sm"
                          variant="ghost"
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
            </CardContent>
          </Card>

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
                        <span className="text-white font-medium">{product.name}</span>
                        <Badge>{product.segment}</Badge>
                      </div>
                      {hasProductTimeline ? (
                        <>
                          <EnhancedProgress
                            value={product.developmentProgress || 0}
                            variant="purple"
                            size="md"
                            showLabel
                            showValue
                            label="Progress"
                            formatValue={(v) => `${v}%`}
                          />
                        </>
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

        {/* Technology Tab */}
        <TabsContent value="technology" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                Technology Upgrades
              </CardTitle>
              <CardDescription className="text-slate-400">
                Research new technologies to improve all your products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {techUpgrades.map((tech) => {
                  const isUnlocked = rdData.techLevel >= tech.requires;
                  const isOwned = (state?.unlockedTechnologies || []).includes(tech.id);
                  return (
                    <Card
                      key={tech.id}
                      className={`bg-slate-700 border-slate-600 ${
                        !isUnlocked ? 'opacity-50' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isOwned ? 'bg-green-500/20' : 'bg-purple-500/20'
                            }`}>
                              <tech.icon className={`w-5 h-5 ${
                                isOwned ? 'text-green-400' : 'text-purple-400'
                              }`} />
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

          {/* Tech Level Progress */}
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
              <p className="text-slate-400 text-sm">
                Increase your technology level by purchasing tech upgrades. Higher levels unlock more advanced technologies.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Patents Tab */}
        <TabsContent value="patents" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Patent Portfolio
              </CardTitle>
              <CardDescription className="text-slate-400">
                File patents to protect your innovations and gain competitive advantages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Shield className="w-8 h-8 text-yellow-400" />
                      <div>
                        <div className="text-2xl font-bold text-white">{rdData.patents}</div>
                        <div className="text-slate-400 text-sm">Active Patents</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-8 h-8 text-green-400" />
                      <div>
                        <div className="text-2xl font-bold text-white">+{rdData.patents * 2}%</div>
                        <div className="text-slate-400 text-sm">Competitive Bonus</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-slate-700 border-slate-600">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-8 h-8 text-blue-400" />
                      <div>
                        <div className="text-2xl font-bold text-white">{formatCurrency(rdData.patents * 500_000)}</div>
                        <div className="text-slate-400 text-sm">Annual Licensing</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* File New Patent */}
              <Card className="bg-slate-700 border-slate-600">
                <CardContent className="p-4">
                  <h3 className="text-white font-medium mb-2">File New Patent</h3>
                  <p className="text-slate-400 text-sm mb-4">
                    Patents provide competitive advantages and can generate licensing revenue.
                  </p>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-slate-400">Filing Cost</span>
                      <div className="text-white font-medium">{formatCurrency(5_000_000)}</div>
                    </div>
                    <Button
                      className="bg-yellow-600 hover:bg-yellow-700"
                      onClick={handleFilePatent}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      File Patent
                    </Button>
                  </div>
                  {pendingPatents > 0 && (
                    <div className="mt-3 p-2 bg-green-900/20 border border-green-700 rounded text-sm text-green-400">
                      {pendingPatents} patent(s) pending filing
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>

          {/* Patent List */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Your Patents</CardTitle>
            </CardHeader>
            <CardContent>
              {rdData.patents > 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: rdData.patents }).map((_, idx) => (
                    <div key={idx} className="p-3 bg-slate-700/50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-yellow-400" />
                        <div>
                          <div className="text-white font-medium">Patent #{idx + 1}</div>
                          <div className="text-slate-400 text-sm">Technology Patent</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 text-sm">+2% competitive bonus</div>
                        <div className="text-slate-400 text-xs">{formatCurrency(500_000)}/year licensing</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No patents filed yet</p>
                  <p className="text-sm">File patents to protect your innovations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Decision Submit Bar */}
      <DecisionSubmitBar module="RD" getDecisions={getDecisions} />

      {/* Spacer for fixed submit bar */}
      <div className="h-20" />
    </div>
  );
}
