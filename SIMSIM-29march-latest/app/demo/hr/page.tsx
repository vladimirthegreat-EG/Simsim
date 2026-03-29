"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { PageHeader, SectionHeader } from "@/components/ui/section-header";
import {
  Users,
  UserPlus,
  UserMinus,
  GraduationCap,
  Heart,
  DollarSign,
  TrendingUp,
  Star,
  Briefcase,
  Award,
  ShieldCheck,
  Baby,
  Home,
  Gift,
  Brain,
  Coffee,
} from "lucide-react";
import { fmt, WORKFORCE, HR_CANDIDATES, RECRUITMENT_TIERS, TRAINING_PROGRAMS, BENEFITS } from "../mockData";

export default function DemoHRPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Human Resources"
        subtitle="Manage workforce, recruitment, training, and employee wellbeing"
        icon={<Users className="h-6 w-6" />}
        iconColor="text-blue-400"
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-slate-800 border border-slate-700 flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recruitment">Recruitment</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="compensation">Compensation</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Employees" value={WORKFORCE.totalHeadcount} icon={<Users className="w-5 h-5" />} variant="info" />
            <StatCard label="Monthly Labor Cost" value={fmt(WORKFORCE.laborCost / 12)} icon={<DollarSign className="w-5 h-5" />} variant="success" />
            <StatCard label="Avg Morale" value={`${WORKFORCE.averageMorale}%`} icon={<Heart className="w-5 h-5" />} variant="purple" />
            <StatCard label="Turnover Rate" value={`${(WORKFORCE.turnoverRate * 100).toFixed(0)}%`} icon={<UserMinus className="w-5 h-5" />} variant="warning" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/80 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Workforce Composition
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Workers</span>
                      <span className="text-white">{WORKFORCE.workers}</span>
                    </div>
                    <EnhancedProgress value={(WORKFORCE.workers / WORKFORCE.totalHeadcount) * 100} variant="info" size="md" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Engineers</span>
                      <span className="text-white">{WORKFORCE.engineers}</span>
                    </div>
                    <EnhancedProgress value={(WORKFORCE.engineers / WORKFORCE.totalHeadcount) * 100} variant="purple" size="md" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Supervisors</span>
                      <span className="text-white">{WORKFORCE.supervisors}</span>
                    </div>
                    <EnhancedProgress value={(WORKFORCE.supervisors / WORKFORCE.totalHeadcount) * 100} variant="success" size="md" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/80 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Performance Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Average Morale</span>
                    <span className="text-white">{WORKFORCE.averageMorale}%</span>
                  </div>
                  <EnhancedProgress value={WORKFORCE.averageMorale} variant="info" size="md" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Average Efficiency</span>
                    <span className="text-white">{WORKFORCE.averageEfficiency}%</span>
                  </div>
                  <EnhancedProgress value={WORKFORCE.averageEfficiency} variant="success" size="md" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Turnover Rate</span>
                    <span className="text-white">{(WORKFORCE.turnoverRate * 100).toFixed(1)}%</span>
                  </div>
                  <EnhancedProgress value={WORKFORCE.turnoverRate * 100} variant="warning" size="sm" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === RECRUITMENT TAB === */}
        <TabsContent value="recruitment" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Recruitment Tiers" icon={<UserPlus className="w-5 h-5" />} iconColor="text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                {RECRUITMENT_TIERS.map((tier) => (
                  <div key={tier.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <span className="text-white font-medium">{tier.name}</span>
                    <p className="text-slate-400 text-sm mt-1">{tier.description}</p>
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cost</span>
                        <span className="text-white">${tier.cost.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Candidates</span>
                        <span className="text-white">{tier.candidates}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Quality Range</span>
                        <span className="text-white">{tier.qualityRange}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Available Candidates" icon={<Star className="w-5 h-5" />} iconColor="text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {HR_CANDIDATES.map((candidate) => (
                  <div key={candidate.id} className="p-4 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-medium">{candidate.name}</span>
                        <p className="text-slate-400 text-xs capitalize">{candidate.type}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-blue-500/20 text-blue-400">{candidate.overall}/100</Badge>
                        <p className="text-slate-400 text-xs mt-1">${candidate.salary.toLocaleString()}/yr</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {Object.entries(candidate.stats).map(([stat, value]) => (
                        <div key={stat}>
                          <span className="text-slate-500 capitalize">{stat}</span>
                          <p className={`font-medium ${value >= 80 ? "text-green-400" : value >= 60 ? "text-yellow-400" : "text-red-400"}`}>{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TRAINING TAB === */}
        <TabsContent value="training" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Training Programs" icon={<GraduationCap className="w-5 h-5" />} iconColor="text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {TRAINING_PROGRAMS.map((program) => (
                  <div key={program.id} className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{program.name}</span>
                      <Badge className="bg-purple-500/20 text-purple-400 capitalize">{program.targetType}</Badge>
                    </div>
                    <p className="text-slate-400 text-sm">{program.effect}</p>
                    <div className="mt-2 flex justify-between text-xs text-slate-500">
                      <span>Cost: ${program.cost}/employee</span>
                      <span>Duration: {program.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === COMPENSATION TAB === */}
        <TabsContent value="compensation" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Salary Structure" icon={<DollarSign className="w-5 h-5" />} iconColor="text-green-400" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { role: "Workers", avgSalary: 45000, count: WORKFORCE.workers },
                { role: "Engineers", avgSalary: 95000, count: WORKFORCE.engineers },
                { role: "Supervisors", avgSalary: 120000, count: WORKFORCE.supervisors },
              ].map((tier) => (
                <div key={tier.role} className="p-4 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{tier.role}</span>
                    <span className="text-slate-400 text-sm">{tier.count} employees</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Average Salary</span>
                    <span className="text-white">${tier.avgSalary.toLocaleString()}/yr</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Cost</span>
                    <span className="text-white">{fmt(tier.avgSalary * tier.count)}/yr</span>
                  </div>
                </div>
              ))}
              <div className="p-3 bg-slate-700/30 rounded-lg border-t border-slate-600">
                <div className="flex justify-between text-sm">
                  <span className="text-white font-medium">Total Annual Labor Cost</span>
                  <span className="text-emerald-400 font-medium">{fmt(WORKFORCE.laborCost)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === BENEFITS TAB === */}
        <TabsContent value="benefits" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <SectionHeader title="Benefits Package" icon={<Gift className="w-5 h-5" />} iconColor="text-pink-400" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  { icon: ShieldCheck, label: "Health Insurance", value: `${BENEFITS.healthInsurance}% coverage`, color: "text-green-400" },
                  { icon: DollarSign, label: "Retirement Match", value: `${BENEFITS.retirementMatch}% match`, color: "text-blue-400" },
                  { icon: Coffee, label: "Paid Time Off", value: `${BENEFITS.paidTimeOff} days/year`, color: "text-purple-400" },
                  { icon: Baby, label: "Parental Leave", value: `${BENEFITS.parentalLeave} weeks`, color: "text-pink-400" },
                  { icon: TrendingUp, label: "Stock Options", value: BENEFITS.stockOptions ? "Active" : "Not offered", color: "text-amber-400" },
                  { icon: Home, label: "Flexible Work", value: BENEFITS.flexibleWork ? "Active" : "Not offered", color: "text-cyan-400" },
                  { icon: Brain, label: "Prof. Development", value: `$${BENEFITS.professionalDevelopment}/yr`, color: "text-orange-400" },
                ].map((benefit) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={benefit.label} className="p-3 bg-slate-700/50 rounded-lg flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full bg-slate-600/50 flex items-center justify-center ${benefit.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-slate-400 text-sm">{benefit.label}</span>
                        <p className="text-white font-medium text-sm">{benefit.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
