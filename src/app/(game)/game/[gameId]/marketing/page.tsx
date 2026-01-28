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
import { TeamState, Segment } from "@/engine/types";
import {
  Megaphone,
  TrendingUp,
  Target,
  Award,
  DollarSign,
  Tv,
  Globe,
  Users,
  Star,
  BarChart3,
  Tag,
  Gift,
  Percent,
} from "lucide-react";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

// Default marketing data (used when state is not available)
const defaultMarketing = {
  brandValue: 0.5,
  brandAwareness: 45,
  marketShare: 0,
  customerSatisfaction: 70,
  advertisingBudget: 0,
  currentCampaigns: [] as Array<{
    id: string;
    name: string;
    type: string;
    segment: string;
    budget: number;
    reach: number;
    status: string;
  }>,
};

const segments = [
  { id: "Budget", name: "Budget", description: "Price-conscious consumers", icon: Tag },
  { id: "General", name: "General", description: "Mainstream market", icon: Users },
  { id: "Enthusiast", name: "Enthusiast", description: "Tech-savvy users", icon: Star },
  { id: "Professional", name: "Professional", description: "Business & power users", icon: Award },
  { id: "Active Lifestyle", name: "Active Lifestyle", description: "Fitness & outdoor focused", icon: Target },
];

const advertisingChannels = [
  {
    id: "tv",
    name: "Television",
    icon: Tv,
    cpm: 25,
    reach: "High",
    description: "Broad reach, brand building",
    effectiveness: { Budget: 0.6, General: 0.9, Enthusiast: 0.5, Professional: 0.4, "Active Lifestyle": 0.7 },
  },
  {
    id: "digital",
    name: "Digital Ads",
    icon: Globe,
    cpm: 8,
    reach: "Targeted",
    description: "Precise targeting, measurable ROI",
    effectiveness: { Budget: 0.8, General: 0.8, Enthusiast: 0.95, Professional: 0.85, "Active Lifestyle": 0.8 },
  },
  {
    id: "social",
    name: "Social Media",
    icon: Users,
    cpm: 5,
    reach: "Viral",
    description: "Engagement focused, younger demographics",
    effectiveness: { Budget: 0.7, General: 0.75, Enthusiast: 0.9, Professional: 0.5, "Active Lifestyle": 0.85 },
  },
  {
    id: "print",
    name: "Print Media",
    icon: Star,
    cpm: 15,
    reach: "Niche",
    description: "Premium positioning, older demographics",
    effectiveness: { Budget: 0.3, General: 0.5, Enthusiast: 0.4, Professional: 0.8, "Active Lifestyle": 0.4 },
  },
];

const promotionTypes = [
  {
    id: "discount",
    name: "Price Discount",
    icon: Percent,
    description: "Temporary price reduction",
    costType: "% of revenue",
    effect: "Increases sales volume, may reduce brand value",
  },
  {
    id: "bundle",
    name: "Product Bundle",
    icon: Gift,
    description: "Combine products at special price",
    costType: "Fixed cost",
    effect: "Increases average order value",
  },
  {
    id: "loyalty",
    name: "Loyalty Program",
    icon: Award,
    description: "Reward repeat customers",
    costType: "% of sales",
    effect: "Increases customer retention",
  },
];

export default function MarketingPage({ params }: PageProps) {
  const { gameId } = use(params);
  const [activeTab, setActiveTab] = useState("overview");

  // Get decisions from store
  const { marketing, setMarketingDecisions } = useDecisionStore();

  // Decision states (synced with store)
  const [adBudgets, setAdBudgets] = useState<Record<string, Record<string, number>>>(
    marketing.adBudgets && Object.keys(marketing.adBudgets).length > 0
      ? marketing.adBudgets
      : {
          Budget: { tv: 0, digital: 0, social: 0, print: 0 },
          General: { tv: 0, digital: 0, social: 0, print: 0 },
          Enthusiast: { tv: 0, digital: 0, social: 0, print: 0 },
          Professional: { tv: 0, digital: 0, social: 0, print: 0 },
          "Active Lifestyle": { tv: 0, digital: 0, social: 0, print: 0 },
        }
  );
  const [brandInvestment, setBrandInvestment] = useState(marketing.brandInvestment);
  const [selectedPromotion, setSelectedPromotion] = useState<string | null>(null);
  const [promotionIntensity, setPromotionIntensity] = useState(0);
  const [purchasedBrandActivities, setPurchasedBrandActivities] = useState<string[]>([]);
  const [activePromotions, setActivePromotions] = useState<Array<{ type: string; intensity: number }>>([]);

  // Sync store changes to local state (for when decisions are loaded from server)
  useEffect(() => {
    if (marketing.adBudgets && Object.keys(marketing.adBudgets).length > 0 &&
        JSON.stringify(marketing.adBudgets) !== JSON.stringify(adBudgets)) {
      setAdBudgets(marketing.adBudgets);
    }
  }, [marketing.adBudgets]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (marketing.brandInvestment !== brandInvestment) {
      setBrandInvestment(marketing.brandInvestment);
    }
  }, [marketing.brandInvestment]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (marketing.promotions && marketing.promotions.length > 0 &&
        JSON.stringify(marketing.promotions) !== JSON.stringify(activePromotions)) {
      setActivePromotions(marketing.promotions);
    }
  }, [marketing.promotions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync local state changes to store
  useEffect(() => {
    setMarketingDecisions({ adBudgets });
  }, [adBudgets, setMarketingDecisions]);

  useEffect(() => {
    setMarketingDecisions({ brandInvestment });
  }, [brandInvestment, setMarketingDecisions]);

  // Sync promotions to store
  useEffect(() => {
    setMarketingDecisions({ promotions: activePromotions });
  }, [activePromotions, setMarketingDecisions]);

  // Handle brand activity purchase
  const handlePurchaseBrandActivity = (activityId: string) => {
    setPurchasedBrandActivities(prev => [...prev, activityId]);
  };

  // Handle launch promotion
  const handleLaunchPromotion = () => {
    if (selectedPromotion && promotionIntensity > 0) {
      setActivePromotions(prev => [...prev, { type: selectedPromotion, intensity: promotionIntensity }]);
      setSelectedPromotion(null);
      setPromotionIntensity(0);
    }
  };

  // Get current decisions for submission
  const getDecisions = useCallback(() => ({
    adBudgets,
    brandInvestment,
    promotions: marketing.promotions,
  }), [adBudgets, brandInvestment, marketing.promotions]);

  const { data: teamState } = trpc.team.getMyState.useQuery();

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

  // Parse market state for segment demand data
  const marketState = useMemo(() => {
    if (!teamState?.marketState) return null;
    try {
      return typeof teamState.marketState === 'string'
        ? JSON.parse(teamState.marketState)
        : teamState.marketState;
    } catch {
      return null;
    }
  }, [teamState?.marketState]);

  // Compute marketing data from state
  const marketingData = useMemo(() => {
    if (!state) return defaultMarketing;

    // Calculate total market share from all segments
    const marketShareEntries = state.marketShare ? Object.values(state.marketShare) : [];
    const totalMarketShare = marketShareEntries.length > 0
      ? marketShareEntries.reduce((sum, share) => sum + share, 0) / marketShareEntries.length
      : 0;

    // Brand awareness derived from brand value (higher brand = more awareness)
    const brandAwareness = Math.min(100, (state.brandValue || 0.5) * 100 + 10);

    // Customer satisfaction derived from product quality and workforce morale
    const avgProductQuality = state.products && state.products.length > 0
      ? state.products.reduce((sum, p) => sum + (p.quality || 0), 0) / state.products.length
      : 50;
    const workforceMorale = state.workforce?.averageMorale || 70;
    const customerSatisfaction = Math.round((avgProductQuality + workforceMorale) / 2);

    return {
      brandValue: state.brandValue || defaultMarketing.brandValue,
      brandAwareness: Math.round(brandAwareness),
      marketShare: totalMarketShare,
      customerSatisfaction,
      advertisingBudget: 0,
      currentCampaigns: defaultMarketing.currentCampaigns,
    };
  }, [state]);

  // Compute segment-specific market share data
  const segmentMarketShare = useMemo((): Partial<Record<Segment, number>> => {
    if (!state?.marketShare) return {};
    return state.marketShare;
  }, [state?.marketShare]);

  // Get segment demand from market state
  const segmentDemand = useMemo(() => {
    if (!marketState?.demandBySegment) return {};
    return marketState.demandBySegment;
  }, [marketState?.demandBySegment]);

  const getTotalAdBudget = () => {
    return Object.values(adBudgets).reduce((total, segment) => {
      return total + Object.values(segment).reduce((sum, val) => sum + val, 0);
    }, 0);
  };

  const getSegmentBudget = (segmentId: string) => {
    return Object.values(adBudgets[segmentId] || {}).reduce((sum, val) => sum + val, 0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Marketing"
        subtitle="Manage advertising campaigns, brand value, and promotions"
        icon={<Megaphone className="w-7 h-7" />}
        iconColor="text-pink-400"
      />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
            Overview
          </TabsTrigger>
          <TabsTrigger value="advertising" className="data-[state=active]:bg-slate-700">
            Advertising
          </TabsTrigger>
          <TabsTrigger value="brand" className="data-[state=active]:bg-slate-700">
            Brand
          </TabsTrigger>
          <TabsTrigger value="promotions" className="data-[state=active]:bg-slate-700">
            Promotions
          </TabsTrigger>
          <TabsTrigger value="segments" className="data-[state=active]:bg-slate-700">
            Segments
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Brand Value"
              value={`${(marketingData.brandValue * 100).toFixed(0)}%`}
              icon={<Award className="w-5 h-5" />}
              variant="pink"
            />
            <StatCard
              label="Brand Awareness"
              value={`${marketingData.brandAwareness}%`}
              icon={<Target className="w-5 h-5" />}
              variant="info"
            />
            <StatCard
              label="Market Share"
              value={`${(marketingData.marketShare * 100).toFixed(1)}%`}
              icon={<BarChart3 className="w-5 h-5" />}
              variant="success"
            />
            <StatCard
              label="Customer Satisfaction"
              value={`${marketingData.customerSatisfaction}%`}
              icon={<Star className="w-5 h-5" />}
              variant="purple"
            />
          </div>

          {/* Marketing Overview */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-pink-400" />
                  Brand Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <EnhancedProgress
                  value={marketingData.brandValue * 100}
                  variant="pink"
                  size="md"
                  showLabel
                  showValue
                  label="Brand Value"
                  formatValue={(v) => `${v.toFixed(0)}%`}
                />
                <EnhancedProgress
                  value={marketingData.brandAwareness}
                  variant="info"
                  size="md"
                  showLabel
                  showValue
                  label="Brand Awareness"
                  formatValue={(v) => `${v}%`}
                />
                <EnhancedProgress
                  value={marketingData.customerSatisfaction}
                  variant="purple"
                  size="md"
                  showLabel
                  showValue
                  label="Customer Satisfaction"
                  formatValue={(v) => `${v}%`}
                />
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Marketing Budget Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300">Total Ad Budget</span>
                  <span className="text-white font-medium">{formatCurrency(getTotalAdBudget())}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <span className="text-slate-300">Brand Investment</span>
                  <span className="text-white font-medium">{formatCurrency(brandInvestment)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-pink-900/30 border border-pink-700 rounded-lg">
                  <span className="text-pink-400">Total Marketing Spend</span>
                  <span className="text-pink-400 font-medium">
                    {formatCurrency(getTotalAdBudget() + brandInvestment)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Campaigns */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Active Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              {marketingData.currentCampaigns.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No active campaigns</p>
                  <p className="text-sm">Create advertising campaigns in the Advertising tab</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {marketingData.currentCampaigns.map((campaign) => (
                    <div key={campaign.id} className="p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">{campaign.name}</span>
                        <Badge className="bg-green-600">{campaign.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advertising Tab */}
        <TabsContent value="advertising" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Advertising Budget Allocation</CardTitle>
              <CardDescription className="text-slate-400">
                Allocate advertising budget across channels and market segments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Scrollable container for mobile */}
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <div className="min-w-[600px]">
                  {/* Channel Headers */}
                  <div className="grid grid-cols-5 gap-4 mb-4 text-center">
                    <div></div>
                    {advertisingChannels.map((channel) => (
                      <div key={channel.id} className="p-2 bg-slate-700/50 rounded-lg">
                        <channel.icon className="w-5 h-5 mx-auto mb-1 text-slate-400" />
                        <span className="text-slate-300 text-sm">{channel.name}</span>
                        <div className="text-xs text-slate-500">${channel.cpm} CPM</div>
                      </div>
                    ))}
                  </div>

                  {/* Segment Rows */}
                  {segments.map((segment) => (
                    <div key={segment.id} className="grid grid-cols-5 gap-4 mb-4 items-center">
                      <div className="p-2">
                        <span className="text-white font-medium">{segment.name}</span>
                        <div className="text-xs text-slate-400">{segment.description}</div>
                      </div>
                      {advertisingChannels.map((channel) => (
                        <div key={channel.id}>
                          <input
                            type="number"
                            min="0"
                            max="10000000"
                            step="100000"
                            data-testid={`input-ad-${segment.id}-${channel.id}`}
                            value={adBudgets[segment.id]?.[channel.id] || 0}
                            onChange={(e) => {
                              const value = Math.max(0, parseInt(e.target.value) || 0);
                              setAdBudgets(prev => ({
                                ...prev,
                                [segment.id]: {
                                  ...prev[segment.id],
                                  [channel.id]: value,
                                },
                              }));
                            }}
                            className="w-full bg-slate-700 border-slate-600 rounded px-2 py-1 text-white text-sm text-center"
                            placeholder="$0"
                          />
                          <div className="text-xs text-center mt-1">
                            <span className={`${
                              channel.effectiveness[segment.id as keyof typeof channel.effectiveness] >= 0.8
                                ? 'text-green-400'
                                : channel.effectiveness[segment.id as keyof typeof channel.effectiveness] >= 0.6
                                ? 'text-yellow-400'
                                : 'text-slate-500'
                            }`}>
                              {Math.round(channel.effectiveness[segment.id as keyof typeof channel.effectiveness] * 100)}% eff
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}

                  {/* Summary */}
                  <div className="border-t border-slate-700 pt-4 mt-4">
                    <div className="grid grid-cols-5 gap-4">
                      <div className="text-slate-400 font-medium">Total</div>
                      {advertisingChannels.map((channel) => {
                        const channelTotal = segments.reduce(
                          (sum, seg) => sum + (adBudgets[seg.id]?.[channel.id] || 0),
                          0
                        );
                        return (
                          <div key={channel.id} className="text-center text-white font-medium">
                            {formatCurrency(channelTotal)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4 p-3 bg-pink-900/30 border border-pink-700 rounded-lg">
                <span className="text-pink-400 font-medium">Total Advertising Budget</span>
                <span className="text-pink-400 text-xl font-bold">{formatCurrency(getTotalAdBudget())}</span>
              </div>
            </CardContent>
          </Card>

          {/* Channel Info */}
          <div className="grid md:grid-cols-4 gap-4">
            {advertisingChannels.map((channel) => (
              <Card key={channel.id} className="bg-slate-800 border-slate-700">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <channel.icon className="w-5 h-5 text-slate-400" />
                    <span className="text-white font-medium">{channel.name}</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">{channel.description}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">CPM</span>
                      <span className="text-white">${channel.cpm}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Reach</span>
                      <span className="text-white">{channel.reach}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Brand Tab */}
        <TabsContent value="brand" className="space-y-6">
          <Card className="bg-slate-800/80 border-slate-700/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-pink-400" />
                Brand Investment
              </CardTitle>
              <CardDescription className="text-slate-400">
                Invest in brand-building activities to increase brand value and premium pricing power.
                <span className="text-pink-400"> 5% brand value increase per $10M invested.</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-slate-700/30 rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 font-medium">Investment Amount</span>
                  <span className="text-pink-400 font-semibold text-xl">{formatCurrency(brandInvestment)}</span>
                </div>
                <Slider
                  data-testid="slider-brand-investment"
                  value={[brandInvestment]}
                  onValueChange={(values) => setBrandInvestment(values[0])}
                  max={50000000}
                  step={1000000}
                  variant="default"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>$0</span>
                  <span>$50M</span>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <div className="text-slate-400 text-sm mb-1">Current Brand Value</div>
                  <div className="text-2xl font-bold text-white">
                    {(marketingData.brandValue * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-4 bg-slate-700/50 rounded-lg text-center">
                  <div className="text-slate-400 text-sm mb-1">Projected Increase</div>
                  <div className="text-2xl font-bold text-green-400">
                    +{(brandInvestment / 10_000_000 * 5).toFixed(1)}%
                  </div>
                </div>
                <div className="p-4 bg-pink-900/30 border border-pink-700 rounded-lg text-center">
                  <div className="text-pink-400 text-sm mb-1">Projected Brand Value</div>
                  <div className="text-2xl font-bold text-pink-400">
                    {Math.min(100, marketingData.brandValue * 100 + brandInvestment / 10_000_000 * 5).toFixed(0)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Brand Activities */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Brand Building Activities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${purchasedBrandActivities.includes('celebrity') ? 'bg-green-900/30 border border-green-700' : 'bg-slate-700/50'}`}>
                  <h3 className="text-white font-medium mb-2">Celebrity Endorsement</h3>
                  <p className="text-slate-400 text-sm mb-3">
                    Partner with celebrities to boost brand recognition
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-green-400">+10% awareness</span>
                    <span className="text-white">{formatCurrency(15_000_000)}</span>
                  </div>
                  {purchasedBrandActivities.includes('celebrity') ? (
                    <Button size="sm" className="w-full mt-3 bg-green-600" disabled>
                      Purchased
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full mt-3 bg-pink-600 hover:bg-pink-700"
                      onClick={() => handlePurchaseBrandActivity('celebrity')}
                    >
                      Purchase
                    </Button>
                  )}
                </div>
                <div className={`p-4 rounded-lg ${purchasedBrandActivities.includes('sponsorship') ? 'bg-green-900/30 border border-green-700' : 'bg-slate-700/50'}`}>
                  <h3 className="text-white font-medium mb-2">Major Event Sponsorship</h3>
                  <p className="text-slate-400 text-sm mb-3">
                    Sponsor major sporting or cultural events
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-green-400">+8% awareness, +3% brand value</span>
                    <span className="text-white">{formatCurrency(20_000_000)}</span>
                  </div>
                  {purchasedBrandActivities.includes('sponsorship') ? (
                    <Button size="sm" className="w-full mt-3 bg-green-600" disabled>
                      Purchased
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full mt-3 bg-pink-600 hover:bg-pink-700"
                      onClick={() => handlePurchaseBrandActivity('sponsorship')}
                    >
                      Purchase
                    </Button>
                  )}
                </div>
                <div className={`p-4 rounded-lg ${purchasedBrandActivities.includes('csr') ? 'bg-green-900/30 border border-green-700' : 'bg-slate-700/50'}`}>
                  <h3 className="text-white font-medium mb-2">CSR Initiative</h3>
                  <p className="text-slate-400 text-sm mb-3">
                    Launch corporate social responsibility programs
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-green-400">+5% brand value, +50 ESG</span>
                    <span className="text-white">{formatCurrency(10_000_000)}</span>
                  </div>
                  {purchasedBrandActivities.includes('csr') ? (
                    <Button size="sm" className="w-full mt-3 bg-green-600" disabled>
                      Purchased
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full mt-3 bg-pink-600 hover:bg-pink-700"
                      onClick={() => handlePurchaseBrandActivity('csr')}
                    >
                      Purchase
                    </Button>
                  )}
                </div>
                <div className={`p-4 rounded-lg ${purchasedBrandActivities.includes('refresh') ? 'bg-green-900/30 border border-green-700' : 'bg-slate-700/50'}`}>
                  <h3 className="text-white font-medium mb-2">Brand Refresh</h3>
                  <p className="text-slate-400 text-sm mb-3">
                    Update visual identity and brand messaging
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="text-green-400">+7% brand value</span>
                    <span className="text-white">{formatCurrency(8_000_000)}</span>
                  </div>
                  {purchasedBrandActivities.includes('refresh') ? (
                    <Button size="sm" className="w-full mt-3 bg-green-600" disabled>
                      Purchased
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full mt-3 bg-pink-600 hover:bg-pink-700"
                      onClick={() => handlePurchaseBrandActivity('refresh')}
                    >
                      Purchase
                    </Button>
                  )}
                </div>
              </div>
              {purchasedBrandActivities.length > 0 && (
                <div className="mt-4 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                  <p className="text-green-400 text-sm font-medium">Pending Brand Activities: {purchasedBrandActivities.length}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Promotions Tab */}
        <TabsContent value="promotions" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Sales Promotions
              </CardTitle>
              <CardDescription className="text-slate-400">
                Run promotional campaigns to boost short-term sales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {promotionTypes.map((promo) => (
                  <Card
                    key={promo.id}
                    className={`bg-slate-700 border-slate-600 cursor-pointer transition-all ${
                      selectedPromotion === promo.id ? 'border-pink-500 ring-2 ring-pink-500/20' : 'hover:border-slate-500'
                    }`}
                    onClick={() => setSelectedPromotion(promo.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <promo.icon className="w-5 h-5 text-pink-400" />
                        <span className="text-white font-medium">{promo.name}</span>
                      </div>
                      <p className="text-slate-400 text-sm mb-3">{promo.description}</p>
                      <div className="text-xs text-slate-500">
                        <div>Cost: {promo.costType}</div>
                        <div className="text-green-400 mt-1">{promo.effect}</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {selectedPromotion && (
                <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-pink-500/30">
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-pink-400" />
                    Configure Promotion
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-300 font-medium">Promotion Intensity</span>
                      <span className="text-pink-400 font-semibold text-lg">{promotionIntensity}%</span>
                    </div>
                    <Slider
                      value={[promotionIntensity]}
                      onValueChange={(values) => setPromotionIntensity(values[0])}
                      max={30}
                      step={1}
                      variant="default"
                    />
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>None</span>
                      <span>30% (Maximum)</span>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button
                      className="bg-pink-600 hover:bg-pink-700 shadow-lg shadow-pink-600/20"
                      onClick={handleLaunchPromotion}
                      disabled={promotionIntensity === 0}
                    >
                      Launch Promotion
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Promotions */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Active Promotions</CardTitle>
            </CardHeader>
            <CardContent>
              {activePromotions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No active promotions</p>
                  <p className="text-sm">Launch a promotion to boost sales</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activePromotions.map((promo, idx) => {
                    const promoType = promotionTypes.find(p => p.id === promo.type);
                    return (
                      <div key={idx} className="p-3 bg-green-900/20 border border-green-700 rounded-lg flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          {promoType && <promoType.icon className="w-5 h-5 text-green-400" />}
                          <div>
                            <span className="text-white font-medium">{promoType?.name}</span>
                            <span className="text-slate-400 text-sm ml-2">({promo.intensity}% intensity)</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 h-6 px-2"
                          onClick={() => setActivePromotions(prev => prev.filter((_, i) => i !== idx))}
                        >
                          Cancel
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Segments Tab */}
        <TabsContent value="segments" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Market Segments</CardTitle>
              <CardDescription className="text-slate-400">
                Overview of market segments and your position in each
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {segments.map((segment) => {
                  const share = segmentMarketShare[segment.id as Segment] || 0;
                  const demand = segmentDemand[segment.id as Segment];
                  return (
                    <Card key={segment.id} className="bg-slate-700 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                              <segment.icon className="w-5 h-5 text-pink-400" />
                            </div>
                            <div>
                              <h3 className="text-white font-medium">{segment.name}</h3>
                              <p className="text-slate-400 text-sm">{segment.description}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-slate-400 text-sm">Your Market Share</div>
                            <div className="text-xl font-bold text-green-400">{(share * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
                          <div>
                            <span className="text-slate-400">Ad Spend</span>
                            <div className="text-white font-medium">{formatCurrency(getSegmentBudget(segment.id))}</div>
                          </div>
                          <div>
                            <span className="text-slate-400">Total Demand</span>
                            <div className="text-white font-medium">
                              {demand?.totalDemand ? `${(demand.totalDemand / 1000).toFixed(0)}K` : '--'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400">Price Range</span>
                            <div className="text-white font-medium">
                              {demand?.priceRange
                                ? `$${demand.priceRange.min}-$${demand.priceRange.max}`
                                : '--'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-400">Growth</span>
                            <div className={`font-medium ${(demand?.growthRate || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {demand?.growthRate ? `${(demand.growthRate * 100).toFixed(1)}%` : '--'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Decision Submit Bar */}
      <DecisionSubmitBar module="MARKETING" getDecisions={getDecisions} />

      {/* Spacer for fixed submit bar */}
      <div className="h-20" />
    </div>
  );
}
