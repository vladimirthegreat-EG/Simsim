"use client";

import { useState, useMemo } from "react";
import { use } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { PageHeader, SectionHeader } from "@/components/ui/section-header";
// DecisionSubmitBar not needed - material orders are submitted directly via API
import { trpc } from "@/lib/api/trpc";
import {
  Ship,
  Plane,
  Truck,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Package,
  Leaf,
  Percent,
  TrendingDown,
} from "lucide-react";
import type { Region } from "@/engine/materials/types";
import {
  LogisticsEngine,
  SHIPPING_ROUTES,
  SHIPPING_METHODS,
  MAJOR_PORTS,
  type ShippingMethod,
} from "@/engine/logistics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

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

export default function LogisticsPage({ params }: PageProps) {
  const { gameId } = use(params);

  // Fetch team's region for default destination
  const { data: materialsState } = trpc.material.getMaterialsState.useQuery();
  const teamRegion = materialsState?.region ?? "North America";

  const [activeTab, setActiveTab] = useState("routes");
  const [fromRegion, setFromRegion] = useState<Region>("Asia");
  const [toRegion, setToRegion] = useState<Region>(teamRegion);
  const [weight, setWeight] = useState<number>(2.5); // tons
  const [volume, setVolume] = useState<number>(15); // cubic meters

  // Calculate logistics for all methods
  const logistics = useMemo(() => {
    try {
      return LogisticsEngine.compareShippingOptions(
        fromRegion,
        toRegion,
        weight,
        volume,
        20 // production time
      );
    } catch (error) {
      return [];
    }
  }, [fromRegion, toRegion, weight, volume]);

  // Get recommendations
  const recommendations = useMemo(() => {
    try {
      return LogisticsEngine.getRecommendations(
        fromRegion,
        toRegion,
        weight,
        volume,
        20000, // budget
        30 // max lead time
      );
    } catch (error) {
      return null;
    }
  }, [fromRegion, toRegion, weight, volume]);

  // Calculate stats
  const stats = useMemo(() => {
    if (logistics.length === 0) return null;

    const best = logistics[0];
    const cheapest = [...logistics].sort((a, b) =>
      a.logistics.totalLogisticsCost - b.logistics.totalLogisticsCost
    )[0];
    const fastest = [...logistics].sort((a, b) =>
      a.logistics.totalLeadTime - b.logistics.totalLeadTime
    )[0];

    return {
      recommended: best,
      cheapest,
      fastest,
      avgCost: logistics.reduce((sum, l) => sum + l.logistics.totalLogisticsCost, 0) / logistics.length,
      avgTime: logistics.reduce((sum, l) => sum + l.logistics.totalLeadTime, 0) / logistics.length,
    };
  }, [logistics]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader
        title="Logistics Management"
        subtitle="Optimize shipping routes, compare methods, and manage global logistics"
        icon={<Ship className="h-6 w-6" />}
      />

      {/* Overview Stats */}
      {stats && (() => {
        const RecommendedIcon = METHOD_ICONS[stats.recommended.method];
        return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Recommended Method"
              value={stats.recommended.method.toUpperCase()}
              icon={<RecommendedIcon className="h-5 w-5" />}
              trend="neutral"
            />
            <StatCard
              label="Cheapest Option"
              value={formatCurrency(stats.cheapest.logistics.totalLogisticsCost)}
              icon={<DollarSign className="h-5 w-5" />}
              trend="down"
            />
            <StatCard
              label="Fastest Option"
              value={`${stats.fastest.logistics.totalLeadTime} days`}
              icon={<Clock className="h-5 w-5" />}
              trend="up"
            />
            <StatCard
              label="Avg Reliability"
              value={`${Math.round(logistics.reduce((sum, l) => sum + l.logistics.onTimeProbability, 0) / logistics.length * 100)}%`}
              icon={<CheckCircle2 className="h-5 w-5" />}
              trend="neutral"
            />
          </div>
        );
      })()}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="routes">Routes & Comparison</TabsTrigger>
          <TabsTrigger value="methods">Shipping Methods</TabsTrigger>
          <TabsTrigger value="ports">Major Ports</TabsTrigger>
          <TabsTrigger value="calculator">Cost Calculator</TabsTrigger>
        </TabsList>

        {/* Routes Tab */}
        <TabsContent value="routes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Route Comparison</CardTitle>
              <CardDescription>
                Compare all available shipping methods for a route
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Route Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Select value={fromRegion} onValueChange={(v) => setFromRegion(v as Region)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REGION_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>To</Label>
                    <Select value={toRegion} onValueChange={(v) => setToRegion(v as Region)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REGION_OPTIONS.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Shipment Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Weight (tons)</Label>
                    <Input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      min={0.1}
                      step={0.1}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Volume (m³)</Label>
                    <Input
                      type="number"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      min={0.1}
                      step={0.1}
                    />
                  </div>
                </div>

                {/* Recommendations */}
                {recommendations && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">AI Recommendation</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-lg px-3 py-1">
                          {recommendations.recommended.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {recommendations.reasoning}
                        </span>
                      </div>

                      {recommendations.warnings.length > 0 && (
                        <div className="space-y-1">
                          {recommendations.warnings.map((warning, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-orange-500">
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {recommendations.alternatives.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          Alternatives: {recommendations.alternatives.map(a => a.toUpperCase()).join(", ")}
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
                        <Card key={option.method} className="p-4">
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 bg-primary/10 rounded-lg ${colorClass}`}>
                                  <Icon className="h-6 w-6" />
                                </div>
                                <div>
                                  <div className="font-bold text-lg capitalize">{option.method} Freight</div>
                                  <div className="text-sm text-muted-foreground">
                                    {SHIPPING_METHODS[option.method].description}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold">
                                  {Math.round(option.overallScore)}
                                </div>
                                <div className="text-xs text-muted-foreground">Overall Score</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <div>
                                <div className="text-sm text-muted-foreground">Total Cost</div>
                                <div className="font-bold text-lg">
                                  {formatCurrency(option.logistics.totalLogisticsCost)}
                                </div>
                                <div className="flex items-center gap-1 text-xs">
                                  <TrendingUp className="h-3 w-3 text-green-500" />
                                  {Math.round(option.costEfficiency)}% efficient
                                </div>
                              </div>

                              <div>
                                <div className="text-sm text-muted-foreground">Lead Time</div>
                                <div className="font-bold text-lg">
                                  {option.logistics.totalLeadTime} days
                                </div>
                                <div className="flex items-center gap-1 text-xs">
                                  <Clock className="h-3 w-3 text-blue-500" />
                                  {Math.round(option.timeEfficiency)}% efficient
                                </div>
                              </div>

                              <div>
                                <div className="text-sm text-muted-foreground">Reliability</div>
                                <div className="font-bold text-lg">
                                  {Math.round(option.logistics.onTimeProbability * 100)}%
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ±{option.logistics.delayRisk} days risk
                                </div>
                              </div>

                              <div>
                                <div className="text-sm text-muted-foreground">Shipping</div>
                                <div className="font-bold">
                                  {formatCurrency(option.logistics.shippingCost)}
                                </div>
                              </div>

                              <div>
                                <div className="text-sm text-muted-foreground">Clearance</div>
                                <div className="font-bold">
                                  {formatCurrency(option.logistics.clearanceCost)}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span>{option.logistics.shippingTime} days shipping</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                  <span>{option.logistics.clearanceTime} days clearance</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Leaf className="h-4 w-4 text-green-500" />
                                  <span>{SHIPPING_METHODS[option.method].carbonEmissions} kg CO₂/ton-km</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No shipping route available between these regions
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shipping Methods Tab */}
        <TabsContent value="methods" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Methods Overview</CardTitle>
              <CardDescription>
                Compare the characteristics of different shipping methods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {Object.entries(SHIPPING_METHODS).map(([key, method]) => {
                  const Icon = METHOD_ICONS[key as ShippingMethod];
                  const colorClass = METHOD_COLORS[key as ShippingMethod];

                  return (
                    <Card key={key} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 bg-primary/10 rounded-lg ${colorClass}`}>
                          <Icon className="h-8 w-8" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-lg capitalize mb-1">{key} Freight</div>
                          <p className="text-sm text-muted-foreground mb-3">{method.description}</p>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                              <div className="text-xs text-muted-foreground">Cost</div>
                              <div className="font-semibold">{method.costMultiplier}x</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Speed</div>
                              <div className="font-semibold">{method.timeMultiplier}x</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Reliability</div>
                              <div className="font-semibold">{Math.round(method.reliability * 100)}%</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Min Volume</div>
                              <div className="font-semibold">{method.minimumVolume} m³</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Carbon</div>
                              <div className="font-semibold">{method.carbonEmissions} kg CO₂</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ports Tab */}
        <TabsContent value="ports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Major Ports</CardTitle>
              <CardDescription>
                Global port infrastructure and efficiency ratings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {REGION_OPTIONS.map((region) => {
                  const ports = MAJOR_PORTS.filter(p => p.region === region);
                  if (ports.length === 0) return null;

                  return (
                    <div key={region} className="space-y-2">
                      <SectionHeader title={region} />
                      <div className="grid gap-3">
                        {ports.map((port) => (
                          <Card key={port.name} className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-bold">{port.name}</div>
                                <div className="text-sm text-muted-foreground">{port.country}</div>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant={port.efficiency > 0.9 ? "default" : "secondary"}>
                                    {Math.round(port.efficiency * 100)}% Efficient
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {port.avgProcessingTime} days processing • {formatCurrency(port.fees)} fees
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculator Tab */}
        <TabsContent value="calculator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Logistics Cost Calculator</CardTitle>
              <CardDescription>
                Calculate exact costs for your shipments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4" />
                <p>Use the Routes tab to calculate logistics costs</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Material orders are submitted directly via API - no decision bar needed */}
    </div>
  );
}
