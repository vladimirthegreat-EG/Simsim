"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  Briefcase,
  GraduationCap,
  Award,
} from "lucide-react";
import type { TeamState } from "@/engine/types";

interface RosterTabProps {
  state: TeamState | null;
  hasEmployeeManagement: boolean;
}

export function RosterTab({ state, hasEmployeeManagement }: RosterTabProps) {
  return (
    <div className="space-y-6">
      {/* Employee Summary when individual management is enabled */}
      {hasEmployeeManagement && state?.employees && state.employees.length > 0 ? (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Employee Roster</CardTitle>
            <CardDescription className="text-slate-400">
              View and manage individual employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {state.employees.slice(0, 20).map((employee) => (
                <div key={employee.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      employee.role === 'worker' ? 'bg-blue-600/20' :
                      employee.role === 'engineer' ? 'bg-purple-600/20' : 'bg-green-600/20'
                    }`}>
                      {employee.role === 'worker' ? (
                        <Briefcase className="w-4 h-4 text-blue-400" />
                      ) : employee.role === 'engineer' ? (
                        <GraduationCap className="w-4 h-4 text-purple-400" />
                      ) : (
                        <Award className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{employee.name}</p>
                      <p className="text-slate-400 text-xs capitalize">{employee.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Morale</p>
                      <p className={`text-sm font-medium ${
                        employee.morale >= 70 ? 'text-green-400' :
                        employee.morale >= 50 ? 'text-yellow-400' : 'text-red-400'
                      }`}>{employee.morale}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Efficiency</p>
                      <p className="text-blue-400 text-sm font-medium">{employee.stats.efficiency}%</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">Salary</p>
                      <p className="text-green-400 text-sm font-medium">{formatCurrency(employee.salary)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {state.employees.length > 20 && (
                <p className="text-center text-slate-400 text-sm py-2">
                  + {state.employees.length - 20} more employees
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Employee Roster</CardTitle>
            <CardDescription className="text-slate-400">
              View and manage your current workforce
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-slate-400">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Employee roster management</p>
              <p className="text-sm mt-2">
                {hasEmployeeManagement
                  ? "No employees currently in your workforce."
                  : "Individual employee management is not enabled for this game."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
