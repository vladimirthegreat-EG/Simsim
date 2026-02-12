"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { PageHeader, SectionHeader } from "@/components/ui/section-header";
import {
  Megaphone,
  TrendingUp,
  Target,
  Award,
  Tv,
  Globe,
  Users,
  Star,
  Tag,
  Gift,
  Percent,
} from "lucide-react";
import { fmt, ESG_BRAND, MARKET_SHARE, MARKETING, ADVERTISING_CHANNELS, PROMOTION_TYPES, SPONSORSHIPS } from "../mockData";

const SEGMENT_ICONS: Record<string, React.ElementType> = { Budget: Tag, General: Users, Enthusiast: Star, Professional: Award, "Active Lifestyle": Target };
const CHANNEL_ICONS: Record<string, React.ElementType> = { tv: Tv, digital: Globe, social: Users, print: Star };
const PROMO_ICONS: Record<string, React.ElementType> = { discount: Percent, bundle: Gift, loyalty: Award };

export default function DemoMarketingPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Marketing"
        subtitle="Manage advertising, brand strategy, and market positioning"
        icon={<Megaphone className="h-6 w-6" />}
        iconColor="text-pink-400"
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="advertising">Advertising</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
          <TabsTrigger value="sponsorships">Sponsorships</TabsTrigger>
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Brand Value" value={`${(ESG_BRAND.brandValue * 100).toFixed(0)}%`} icon={<Award className="w-5 h-5" />} variant="purple" trend="up" trendValue="+4.2%" />
            <StatCard label="Awareness" value={`${ESG_BRAND.brandAwareness}%`} icon={<Target className="w-5 h-5" />} variant="info" trend="up" trendValue="+6%" />
            <StatCard label="Market Share" value={`${(Object.values(MARKET_SHARE).reduce((a, b) => a + b, 0) / Object.keys(MARKET_SHARE).length * 100).toFixed(1)}%`} icon={<TrendingUp className="w-5 h-5" />} variant="success" trend="up" trendValue="+2.3%" />
            <StatCard label="Satisfaction" value={`${ESG_BRAND.customerSatisfaction}%`} icon={<Star className="w-5 h-5" />} variant="warning" />
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Brand Health" icon={<Award className="w-5 h-5" />} iconColor="text-purple-400" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Brand Value</span>
                  <span className="text-white">{(ESG_BRAND.brandValue * 100).toFixed(0)}%</span>
                </div>
                <EnhancedProgress value={ESG_BRAND.brandValue * 100} variant="purple" size="md" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Brand Awareness</span>
                  <span className="text-white">{ESG_BRAND.brandAwareness}%</span>
                </div>
                <EnhancedProgress value={ESG_BRAND.brandAwareness} variant="info" size="md" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Customer Satisfaction</span>
                  <span className="text-white">{ESG_BRAND.customerSatisfaction}%</span>
                </div>
                <EnhancedProgress value={ESG_BRAND.customerSatisfaction} variant="success" size="md" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ADVERTISING TAB === */}
        <TabsContent value="advertising" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <SectionHeader title="Advertising Channels" icon={<Tv className="w-5 h-5" />} iconColor="text-blue-400" />
                <Badge className="bg-green-500/20 text-green-400">Total: {fmt(MARKETING.advertisingBudget)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ADVERTISING_CHANNELS.map((channel) => {
                  const Icon = CHANNEL_ICONS[channel.id] || Tv;
                  return (
                    <div key={channel.id} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <span className="text-white font-medium">{channel.name}</span>
                            <p className="text-slate-400 text-xs">CPM: ${channel.cpm} | Reach: {channel.reach}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-white font-medium">{fmt(channel.budget)}</span>
                          <p className="text-slate-400 text-xs">{(channel.effectiveness * 100).toFixed(0)}% effective</p>
                        </div>
                      </div>
                      <EnhancedProgress value={channel.effectiveness * 100} variant="info" size="sm" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === SEGMENTS TAB === */}
        <TabsContent value="segments" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Market Segments" icon={<Target className="w-5 h-5" />} iconColor="text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(MARKET_SHARE).map(([segment, share]) => {
                  const Icon = SEGMENT_ICONS[segment] || Target;
                  return (
                    <div key={segment} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-purple-400" />
                          <div>
                            <span className="text-white font-medium">{segment}</span>
                          </div>
                        </div>
                        <Badge className="bg-purple-500/20 text-purple-400">{(share * 100).toFixed(1)}%</Badge>
                      </div>
                      <EnhancedProgress value={share * 100} variant="purple" size="sm" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PROMOTIONS TAB === */}
        <TabsContent value="promotions" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Promotion Types" icon={<Gift className="w-5 h-5" />} iconColor="text-pink-400" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {PROMOTION_TYPES.map((promo) => {
                  const Icon = PROMO_ICONS[promo.id] || Gift;
                  return (
                    <div key={promo.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-pink-400" />
                        </div>
                        <span className="text-white font-medium">{promo.name}</span>
                      </div>
                      <p className="text-slate-400 text-sm mb-2">{promo.description}</p>
                      <p className="text-slate-500 text-xs">{promo.effect}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === SPONSORSHIPS TAB === */}
        <TabsContent value="sponsorships" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Sponsorship Opportunities" icon={<Megaphone className="w-5 h-5" />} iconColor="text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {SPONSORSHIPS.map((s) => (
                  <div key={s.name} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{s.name}</span>
                      <Badge className={s.status === "active" ? "bg-green-500/20 text-green-400" : "bg-slate-600 text-slate-300"}>
                        {s.status === "active" ? "Active" : "Available"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500">Cost</span>
                        <p className="text-white">{fmt(s.cost)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Brand Impact</span>
                        <p className="text-emerald-400">{s.brandImpact}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Awareness</span>
                        <p className="text-blue-400">{s.awareness}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
