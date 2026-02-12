"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { PageHeader, SectionHeader } from "@/components/ui/section-header";
import {
  Lightbulb,
  Beaker,
  Cpu,
  Sparkles,
  DollarSign,
  Clock,
  Target,
  Package,
  Rocket,
  Shield,
  Zap,
} from "lucide-react";
import { fmt, PRODUCTS, LAUNCHED_PRODUCTS, RD_STATE, TECH_UPGRADES, SEGMENT_INFO } from "../mockData";

const TECH_ICONS: Record<string, React.ElementType> = { miniaturization: Cpu, battery: Zap, display: Sparkles, ai: Beaker };

export default function DemoRDPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Research & Development"
        subtitle="Develop products, unlock technologies, and drive innovation"
        icon={<Lightbulb className="h-6 w-6" />}
        iconColor="text-yellow-400"
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="technology">Technology</TabsTrigger>
          <TabsTrigger value="segments">Segments</TabsTrigger>
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="R&D Budget" value={fmt(RD_STATE.rdBudget)} icon={<DollarSign className="w-5 h-5" />} variant="success" />
            <StatCard label="Active Projects" value={RD_STATE.activeProjects} icon={<Rocket className="w-5 h-5" />} variant="info" />
            <StatCard label="Patents" value={RD_STATE.patents} icon={<Shield className="w-5 h-5" />} variant="purple" />
            <StatCard label="Tech Level" value={RD_STATE.techLevel} icon={<Cpu className="w-5 h-5" />} variant="warning" />
          </div>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Product Pipeline" icon={<Package className="w-5 h-5" />} iconColor="text-cyan-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {PRODUCTS.map((product) => (
                  <div key={product.id} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-medium">{product.name}</span>
                        <p className="text-slate-400 text-xs">{product.segment}</p>
                      </div>
                      <Badge className={product.status === "launched" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                        {product.status === "launched" ? "Launched" : "In Development"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div><span className="text-slate-500">Quality</span><p className="text-white font-medium">{product.quality}</p></div>
                      <div><span className="text-slate-500">Features</span><p className="text-white font-medium">{product.features}</p></div>
                      <div><span className="text-slate-500">Price</span><p className="text-white font-medium">${product.price}</p></div>
                      <div><span className="text-slate-500">Unit Cost</span><p className="text-white font-medium">${product.unitCost}</p></div>
                    </div>
                    {product.status === "development" && (
                      <div className="mt-3">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">Development Progress</span>
                          <span className="text-slate-400">{product.developmentProgress}%</span>
                        </div>
                        <EnhancedProgress value={product.developmentProgress} variant="warning" size="sm" />
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {product.roundsRemaining} rounds remaining
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === PRODUCTS TAB === */}
        <TabsContent value="products" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Launched Products" icon={<Package className="w-5 h-5" />} iconColor="text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {LAUNCHED_PRODUCTS.map((product) => (
                  <div key={product.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white font-medium text-lg">{product.name}</span>
                      <Badge className="bg-blue-500/20 text-blue-400">{product.segment}</Badge>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">Quality</span>
                          <span className="text-white">{product.quality}/100</span>
                        </div>
                        <EnhancedProgress value={product.quality} variant="success" size="sm" />
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-400">Features</span>
                          <span className="text-white">{product.features}/100</span>
                        </div>
                        <EnhancedProgress value={product.features} variant="info" size="sm" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                        <div>
                          <span className="text-slate-500">Price</span>
                          <p className="text-white font-medium">${product.price}</p>
                        </div>
                        <div>
                          <span className="text-slate-500">Margin</span>
                          <p className="text-emerald-400 font-medium">{((1 - product.unitCost / product.price) * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TECHNOLOGY TAB === */}
        <TabsContent value="technology" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Technology Upgrades" icon={<Cpu className="w-5 h-5" />} iconColor="text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {TECH_UPGRADES.map((tech) => {
                  const Icon = TECH_ICONS[tech.id] || Cpu;
                  return (
                    <div key={tech.id} className={`p-4 rounded-lg border ${tech.unlocked ? "bg-green-500/10 border-green-500/30" : "bg-slate-700/50 border-slate-600"}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tech.unlocked ? "bg-green-500/20" : "bg-slate-600/50"}`}>
                          <Icon className={`w-5 h-5 ${tech.unlocked ? "text-green-400" : "text-slate-400"}`} />
                        </div>
                        <div>
                          <span className="text-white font-medium">{tech.name}</span>
                          {tech.unlocked ? (
                            <Badge className="ml-2 bg-green-500/20 text-green-400">Unlocked</Badge>
                          ) : (
                            <Badge className="ml-2 bg-slate-600 text-slate-300">Locked</Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm">{tech.effect}</p>
                      {!tech.unlocked && <p className="text-slate-500 text-xs mt-1">Cost: {fmt(tech.cost)}</p>}
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
                {SEGMENT_INFO.map((segment) => (
                  <div key={segment.id} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{segment.name}</span>
                      <Badge className="bg-slate-600 text-slate-300">{segment.priceRange}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Quality Needed</span>
                        <p className="text-white">{segment.qualityExpectation}/100</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Dev Cost</span>
                        <p className="text-white">{fmt(segment.devCost)}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Dev Time</span>
                        <p className="text-white">{segment.devTime} round{segment.devTime > 1 ? "s" : ""}</p>
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
