"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Business Simulation
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Lead your team to success in this strategic phone manufacturing simulation.
            Make decisions, compete for market share, and build a winning company.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mt-12">
          {/* Join Game Card */}
          <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-white text-2xl">Join a Game</CardTitle>
              <CardDescription className="text-slate-400">
                Enter a join code to join your team in an existing game session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/join">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                  Join with Code
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Facilitator Card */}
          <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-white text-2xl">Facilitator Access</CardTitle>
              <CardDescription className="text-slate-400">
                Create and manage game sessions as a facilitator or instructor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" size="lg">
                  Facilitator Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4 mt-12">
          <div className="text-center p-4">
            <div className="text-3xl mb-2">🏭</div>
            <h3 className="text-white font-semibold">Factory Operations</h3>
            <p className="text-slate-400 text-sm">Manage production, efficiency, and sustainability</p>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl mb-2">💰</div>
            <h3 className="text-white font-semibold">Financial Strategy</h3>
            <p className="text-slate-400 text-sm">Balance growth, profitability, and risk</p>
          </div>
          <div className="text-center p-4">
            <div className="text-3xl mb-2">👥</div>
            <h3 className="text-white font-semibold">Team Competition</h3>
            <p className="text-slate-400 text-sm">Compete for market share against other teams</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-500 text-sm mt-8">
          <p>Built for universities and corporate training programs</p>
        </div>
      </div>
    </div>
  );
}
