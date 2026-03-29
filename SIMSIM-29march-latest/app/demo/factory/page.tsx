"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { PageHeader, SectionHeader } from "@/components/ui/section-header";
import {
  Factory,
  Leaf,
  Package,
  TrendingUp,
  CheckCircle2,
  Wrench,
  Boxes,
  Activity,
  Gauge,
  Cog,
  Ship,
  Plane,
  Truck,
  Clock,
  Globe,
} from "lucide-react";
import { fmt, FACTORY as FACTORY_DATA, LOGISTICS_ROUTES, MATERIALS, FACTORY_UPGRADES } from "../mockData";

const MethodIcon: Record<string, React.ElementType> = { sea: Ship, air: Plane, land: Truck, rail: TrendingUp };

export default function DemoFactoryPage() {
  const [workerInvest] = useState(2_250_000);
  const [machineryInvest] = useState(3_000_000);
  const [engineerInvest] = useState(1_500_000);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Factory Operations"
        subtitle="Manage production, efficiency, and supply chain"
        icon={<Factory className="h-6 w-6" />}
        iconColor="text-orange-400"
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="logistics">Logistics</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Efficiency" value={`${(FACTORY_DATA.efficiency * 100).toFixed(0)}%`} icon={<Gauge className="w-5 h-5" />} variant="success" />
            <StatCard label="Capacity" value="125K" icon={<Package className="w-5 h-5" />} variant="info" />
            <StatCard label="Defect Rate" value={`${(FACTORY_DATA.defectRate * 100).toFixed(1)}%`} icon={<Activity className="w-5 h-5" />} variant="warning" />
            <StatCard label="CO2 Emissions" value={`${FACTORY_DATA.co2Emissions}t`} icon={<Leaf className="w-5 h-5" />} variant="default" />
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Efficiency Investment" icon={<TrendingUp className="w-5 h-5" />} iconColor="text-emerald-400" />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Workers</span>
                  <span className="text-white font-medium text-sm">{fmt(workerInvest)}</span>
                </div>
                <EnhancedProgress value={(workerInvest / 5_000_000) * 100} variant="success" size="md" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Machinery</span>
                  <span className="text-white font-medium text-sm">{fmt(machineryInvest)}</span>
                </div>
                <EnhancedProgress value={(machineryInvest / 5_000_000) * 100} variant="success" size="md" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm">Engineers</span>
                  <span className="text-white font-medium text-sm">{fmt(engineerInvest)}</span>
                </div>
                <EnhancedProgress value={(engineerInvest / 5_000_000) * 100} variant="success" size="md" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Factory Upgrades" icon={<Wrench className="w-5 h-5" />} iconColor="text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {FACTORY_UPGRADES.map((upgrade) => (
                  <div key={upgrade.id} className={`p-4 rounded-lg border ${upgrade.owned ? "bg-green-500/10 border-green-500/30" : "bg-slate-700/50 border-slate-600"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{upgrade.name}</span>
                      {upgrade.owned ? <Badge className="bg-green-500/20 text-green-400">Owned</Badge> : <Badge className="bg-slate-600 text-slate-300">Tier {upgrade.tier}</Badge>}
                    </div>
                    <p className="text-slate-400 text-sm mb-2">{upgrade.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {upgrade.benefits.map((b) => (
                        <Badge key={b} variant="outline" className="text-xs border-slate-600 text-slate-400">{b}</Badge>
                      ))}
                    </div>
                    {!upgrade.owned && <p className="text-slate-500 text-xs mt-2">{fmt(upgrade.cost)}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Green Investments" icon={<Leaf className="w-5 h-5" />} iconColor="text-green-400" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">ESG Score Impact</span>
                <span className="text-green-400 font-medium">+15 points</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">CO2 Reduction Target</span>
                <span className="text-white">-20% by Round 5</span>
              </div>
              <EnhancedProgress value={45} variant="success" size="sm" />
              <p className="text-slate-500 text-xs">45% toward target</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PRODUCTION TAB === */}
        <TabsContent value="production" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Production Lines" icon={<Cog className="w-5 h-5" />} iconColor="text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {FACTORY_DATA.productionLines.map((line) => (
                  <div key={line.id} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <span className="text-white font-medium">{line.segment} Line</span>
                        <p className="text-slate-400 text-sm">Product: {line.productId}</p>
                      </div>
                      <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Capacity</span>
                        <p className="text-white font-medium">{(line.capacity / 1000).toFixed(0)}K units/round</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Efficiency</span>
                        <p className="text-white font-medium">{(line.efficiency * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <EnhancedProgress value={line.efficiency * 100} variant="success" size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Utilization" icon={<Gauge className="w-5 h-5" />} iconColor="text-blue-400" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-4xl font-bold text-white">{(FACTORY_DATA.utilization * 100).toFixed(0)}%</div>
              <EnhancedProgress value={FACTORY_DATA.utilization * 100} variant="info" size="lg" />
              <p className="text-slate-400 text-sm">Factory is operating at {(FACTORY_DATA.utilization * 100).toFixed(0)}% of maximum capacity</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === LOGISTICS TAB === */}
        <TabsContent value="logistics" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Shipping Routes" icon={<Globe className="w-5 h-5" />} iconColor="text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {LOGISTICS_ROUTES.map((route, i) => {
                  const Icon = MethodIcon[route.method] || Ship;
                  return (
                    <div key={i} className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-blue-400" />
                          <div>
                            <span className="text-white font-medium">{route.from} → {route.to}</span>
                            <p className="text-slate-400 text-xs capitalize">{route.method} freight</p>
                          </div>
                        </div>
                        <Badge className="bg-blue-500/20 text-blue-400">${route.cost}/unit</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-400">{route.transitDays} days</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-400">{(route.reliability * 100).toFixed(0)}% reliable</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === MATERIALS TAB === */}
        <TabsContent value="materials" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Material Inventory" icon={<Boxes className="w-5 h-5" />} iconColor="text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MATERIALS.map((mat) => (
                  <div key={mat.type} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-medium">{mat.name}</span>
                        <p className="text-slate-400 text-xs">Supplier: {mat.supplier}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-medium">{mat.quantity.toLocaleString()}</span>
                        <p className="text-slate-400 text-xs">${mat.cost}/unit</p>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>Total value: ${(mat.quantity * mat.cost).toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 capitalize">{mat.type}</Badge>
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
