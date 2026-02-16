/**
 * Competitive Intelligence Engine
 *
 * Provides market signals, competitor analysis, and strategic intelligence.
 * Information accuracy varies based on intelligence investment.
 *
 * Phase 14: Competitive Intelligence
 */

import type { Segment } from "../types/factory";
import type { EngineContext } from "../core/EngineContext";
import type { EngineConfig } from "../config/schema";

// ============================================
// TYPES
// ============================================

export type CompetitorStrategy = "cost_leader" | "quality_leader" | "niche" | "balanced" | "aggressive";
export type SignalType = "price_change" | "product_launch" | "marketing_campaign" | "expansion" | "contraction" | "rd_investment";

export interface MarketSignal {
  id: string;
  type: SignalType;
  competitor: string;
  segment: Segment;
  magnitude: number; // -1 to 1 (negative = decrease, positive = increase)
  confidence: number; // 0-1, how certain is this information
  round: number;
  description: string;
}

export interface CompetitorProfile {
  id: string;
  name: string;
  strategy: CompetitorStrategy;
  marketShare: Record<Segment, number>;
  estimatedStrength: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  recentActions: CompetitorAction[];
  predictedNextMove: string;
  threatLevel: number; // 0-100
  lastUpdated: number; // Round
}

export interface CompetitorAction {
  type: SignalType;
  segment: Segment;
  round: number;
  description: string;
  impact: "low" | "medium" | "high";
}

export interface IntelligenceState {
  budget: number;
  quality: number; // 0-100, based on investment
  competitors: CompetitorProfile[];
  signals: MarketSignal[];
  marketInsights: MarketInsight[];
  lastAnalysisRound: number;
}

export interface MarketInsight {
  id: string;
  category: "trend" | "opportunity" | "threat" | "benchmark";
  title: string;
  description: string;
  relevantSegments: Segment[];
  confidence: number;
  actionable: boolean;
  suggestedAction?: string;
}

export interface IntelligenceDecisions {
  budget: number;
  focusAreas: Segment[];
  competitorFocus: string[]; // Competitor IDs to track closely
}

export interface IntelligenceResult {
  state: IntelligenceState;
  newSignals: MarketSignal[];
  newInsights: MarketInsight[];
  competitorUpdates: CompetitorProfile[];
  recommendations: string[];
  messages: string[];
}

// ============================================
// DEFAULT COMPETITORS
// ============================================

const DEFAULT_COMPETITORS: Omit<CompetitorProfile, "recentActions">[] = [
  {
    id: "comp_alpha",
    name: "TechGiant Corp",
    strategy: "quality_leader",
    marketShare: {
      Budget: 0.05,
      General: 0.15,
      Enthusiast: 0.25,
      Professional: 0.30,
      "Active Lifestyle": 0.10,
    },
    estimatedStrength: 85,
    strengths: ["Brand recognition", "R&D capability", "Distribution network"],
    weaknesses: ["High costs", "Slow to market", "Premium pricing only"],
    predictedNextMove: "Likely to expand Professional segment",
    threatLevel: 75,
    lastUpdated: 0,
  },
  {
    id: "comp_beta",
    name: "ValueTech Inc",
    strategy: "cost_leader",
    marketShare: {
      Budget: 0.35,
      General: 0.20,
      Enthusiast: 0.05,
      Professional: 0.02,
      "Active Lifestyle": 0.15,
    },
    estimatedStrength: 70,
    strengths: ["Low costs", "High volume", "Efficient operations"],
    weaknesses: ["Low margins", "Quality perception", "Limited innovation"],
    predictedNextMove: "May attempt price war in Budget segment",
    threatLevel: 60,
    lastUpdated: 0,
  },
  {
    id: "comp_gamma",
    name: "InnovateTech",
    strategy: "niche",
    marketShare: {
      Budget: 0.02,
      General: 0.08,
      Enthusiast: 0.20,
      Professional: 0.15,
      "Active Lifestyle": 0.25,
    },
    estimatedStrength: 65,
    strengths: ["Innovation", "Brand loyalty", "Design leadership"],
    weaknesses: ["Limited scale", "High R&D costs", "Niche focus"],
    predictedNextMove: "Expected new product launch in Active Lifestyle",
    threatLevel: 55,
    lastUpdated: 0,
  },
  {
    id: "comp_delta",
    name: "GlobalElectronics",
    strategy: "balanced",
    marketShare: {
      Budget: 0.15,
      General: 0.18,
      Enthusiast: 0.12,
      Professional: 0.10,
      "Active Lifestyle": 0.12,
    },
    estimatedStrength: 72,
    strengths: ["Diversified portfolio", "Global presence", "Supply chain"],
    weaknesses: ["No clear differentiation", "Middle-of-road quality"],
    predictedNextMove: "Likely to increase marketing spend",
    threatLevel: 65,
    lastUpdated: 0,
  },
];

// ============================================
// ENGINE
// ============================================

export class CompetitiveIntelligenceEngine {
  /**
   * Process intelligence gathering for a round
   */
  static gatherIntelligence(
    previousState: IntelligenceState | null,
    decisions: IntelligenceDecisions,
    round: number,
    config: EngineConfig,
    ctx: EngineContext
  ): IntelligenceResult {
    const messages: string[] = [];
    const recommendations: string[] = [];

    // Check if competitive intelligence is enabled
    if (!config.difficulty.complexity.competitiveIntelligence) {
      return {
        state: this.getDisabledState(),
        newSignals: [],
        newInsights: [],
        competitorUpdates: [],
        recommendations: ["Competitive intelligence not available at this difficulty"],
        messages: [],
      };
    }

    // Initialize or update state
    const state: IntelligenceState = previousState
      ? { ...previousState }
      : this.initializeState();

    // Update budget and quality
    state.budget = decisions.budget;
    state.quality = this.calculateIntelligenceQuality(decisions.budget);
    state.lastAnalysisRound = round;

    // Generate market signals
    const newSignals = this.generateMarketSignals(
      state,
      decisions,
      round,
      config,
      ctx
    );
    state.signals = [...state.signals.slice(-20), ...newSignals]; // Keep last 20 + new

    // Update competitor profiles
    const competitorUpdates = this.updateCompetitorProfiles(
      state,
      newSignals,
      round,
      config,
      ctx
    );
    state.competitors = competitorUpdates;

    // Generate market insights
    const newInsights = this.generateMarketInsights(
      state,
      newSignals,
      round,
      ctx
    );
    state.marketInsights = [...state.marketInsights.slice(-10), ...newInsights];

    // Generate recommendations
    this.generateRecommendations(state, recommendations);

    // Messages
    if (newSignals.length > 0) {
      messages.push(`Gathered ${newSignals.length} new market signals`);
    }
    if (newInsights.length > 0) {
      messages.push(`Generated ${newInsights.length} new market insights`);
    }

    return {
      state,
      newSignals,
      newInsights,
      competitorUpdates,
      recommendations,
      messages,
    };
  }

  /**
   * Initialize intelligence state
   */
  static initializeState(): IntelligenceState {
    return {
      budget: 0,
      quality: 30, // Base quality without investment
      competitors: DEFAULT_COMPETITORS.map((c) => ({
        ...c,
        recentActions: [],
      })),
      signals: [],
      marketInsights: [],
      lastAnalysisRound: 0,
    };
  }

  /**
   * Get disabled state for lower difficulties
   */
  private static getDisabledState(): IntelligenceState {
    return {
      budget: 0,
      quality: 0,
      competitors: [],
      signals: [],
      marketInsights: [],
      lastAnalysisRound: 0,
    };
  }

  /**
   * Calculate intelligence quality based on budget
   */
  private static calculateIntelligenceQuality(budget: number): number {
    // Base 30% quality, up to 95% with investment
    // $5M = 80% quality, $10M = 90%, $15M+ = 95%
    const budgetMillions = budget / 1_000_000;
    const quality = 30 + Math.min(65, budgetMillions * 13);
    return Math.min(95, quality);
  }

  /**
   * Generate market signals
   */
  private static generateMarketSignals(
    state: IntelligenceState,
    decisions: IntelligenceDecisions,
    round: number,
    config: EngineConfig,
    ctx: EngineContext
  ): MarketSignal[] {
    const signals: MarketSignal[] = [];
    const segments: Segment[] = decisions.focusAreas.length > 0
      ? decisions.focusAreas
      : ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];

    // Number of signals based on quality
    const signalCount = Math.floor(state.quality / 20) + 1; // 1-5 signals

    for (let i = 0; i < signalCount; i++) {
      const competitor = ctx.rng.general.pick(state.competitors);
      const segment = ctx.rng.general.pick(segments);
      const signalType = ctx.rng.general.pick([
        "price_change",
        "product_launch",
        "marketing_campaign",
        "expansion",
        "rd_investment",
      ] as SignalType[]);

      // Confidence based on intelligence quality and if competitor is focused
      let confidence = state.quality / 100;
      if (decisions.competitorFocus.includes(competitor.id)) {
        confidence = Math.min(0.95, confidence + 0.15);
      }

      // Add some noise to confidence
      confidence = Math.max(0.2, confidence + ctx.rng.general.gaussian(0, 0.1));

      const magnitude = ctx.rng.general.range(-0.5, 0.5);

      signals.push({
        id: `signal-${round}-${i}`,
        type: signalType,
        competitor: competitor.name,
        segment,
        magnitude,
        confidence,
        round,
        description: this.generateSignalDescription(signalType, competitor.name, segment, magnitude),
      });
    }

    return signals;
  }

  /**
   * Generate signal description
   */
  private static generateSignalDescription(
    type: SignalType,
    competitor: string,
    segment: Segment,
    magnitude: number
  ): string {
    const direction = magnitude > 0 ? "increase" : "decrease";
    const intensity = Math.abs(magnitude) > 0.3 ? "significant" : "moderate";

    switch (type) {
      case "price_change":
        return `${competitor} appears to be planning ${intensity} price ${direction} in ${segment}`;
      case "product_launch":
        return `${competitor} may be preparing new product launch targeting ${segment}`;
      case "marketing_campaign":
        return `${competitor} ramping up marketing efforts in ${segment}`;
      case "expansion":
        return `${competitor} showing signs of ${segment} market expansion`;
      case "contraction":
        return `${competitor} may be pulling back from ${segment}`;
      case "rd_investment":
        return `${competitor} increasing R&D focus related to ${segment}`;
      default:
        return `Market activity detected from ${competitor} in ${segment}`;
    }
  }

  /**
   * Update competitor profiles based on signals
   */
  private static updateCompetitorProfiles(
    state: IntelligenceState,
    newSignals: MarketSignal[],
    round: number,
    config: EngineConfig,
    ctx: EngineContext
  ): CompetitorProfile[] {
    return state.competitors.map((competitor) => {
      const updated = { ...competitor };

      // Find signals related to this competitor
      const competitorSignals = newSignals.filter(
        (s) => s.competitor === competitor.name
      );

      // Add recent actions
      for (const signal of competitorSignals) {
        updated.recentActions = [
          ...updated.recentActions.slice(-5),
          {
            type: signal.type,
            segment: signal.segment,
            round,
            description: signal.description,
            impact: Math.abs(signal.magnitude) > 0.3 ? "high" : Math.abs(signal.magnitude) > 0.15 ? "medium" : "low",
          },
        ];
      }

      // Update threat level based on recent activity
      const recentHighImpact = updated.recentActions.filter(
        (a) => a.impact === "high" && a.round >= round - 2
      ).length;
      updated.threatLevel = Math.min(100, updated.threatLevel + recentHighImpact * 5);

      // Decay threat level slightly
      updated.threatLevel = Math.max(20, updated.threatLevel - 2);

      // Update predicted next move
      if (competitorSignals.length > 0) {
        const latestSignal = competitorSignals[competitorSignals.length - 1];
        updated.predictedNextMove = this.predictNextMove(latestSignal, competitor);
      }

      updated.lastUpdated = round;

      // Simulate competitor strength changes
      updated.estimatedStrength += ctx.rng.general.gaussian(0, 2);
      updated.estimatedStrength = Math.max(30, Math.min(95, updated.estimatedStrength));

      return updated;
    });
  }

  /**
   * Predict competitor's next move
   */
  private static predictNextMove(
    latestSignal: MarketSignal,
    competitor: CompetitorProfile
  ): string {
    switch (latestSignal.type) {
      case "price_change":
        return latestSignal.magnitude > 0
          ? `May raise prices in ${latestSignal.segment} to improve margins`
          : `Likely to cut prices in ${latestSignal.segment} for market share`;
      case "product_launch":
        return `New product expected targeting ${latestSignal.segment} segment`;
      case "marketing_campaign":
        return `Aggressive marketing push coming in ${latestSignal.segment}`;
      case "expansion":
        return `Planning expansion into ${latestSignal.segment}`;
      case "rd_investment":
        return `Technology investment focused on ${latestSignal.segment} needs`;
      default:
        return competitor.predictedNextMove;
    }
  }

  /**
   * Generate market insights
   */
  private static generateMarketInsights(
    state: IntelligenceState,
    signals: MarketSignal[],
    round: number,
    ctx: EngineContext
  ): MarketInsight[] {
    const insights: MarketInsight[] = [];

    // Only generate insights with sufficient quality
    if (state.quality < 50) {
      return insights;
    }

    // Trend detection
    const priceSignals = signals.filter((s) => s.type === "price_change");
    if (priceSignals.length >= 2) {
      const avgMagnitude = priceSignals.reduce((sum, s) => sum + s.magnitude, 0) / priceSignals.length;
      if (Math.abs(avgMagnitude) > 0.2) {
        const segments = [...new Set(priceSignals.map((s) => s.segment))];
        insights.push({
          id: `insight-trend-${round}`,
          category: "trend",
          title: avgMagnitude > 0 ? "Market Price Increases Detected" : "Price War Risk",
          description: avgMagnitude > 0
            ? "Multiple competitors signaling price increases"
            : "Competitors may be preparing for aggressive pricing",
          relevantSegments: segments,
          confidence: state.quality / 100,
          actionable: true,
          suggestedAction: avgMagnitude > 0
            ? "Consider raising prices to maintain margins"
            : "Prepare for potential price competition",
        });
      }
    }

    // Opportunity detection
    const expansionSignals = signals.filter((s) => s.type === "contraction");
    if (expansionSignals.length > 0) {
      const segment = expansionSignals[0].segment;
      insights.push({
        id: `insight-opportunity-${round}-${segment}`,
        category: "opportunity",
        title: `Market Opportunity in ${segment}`,
        description: `Competitor pullback detected in ${segment} segment`,
        relevantSegments: [segment],
        confidence: state.quality / 100,
        actionable: true,
        suggestedAction: "Consider increasing presence in this segment",
      });
    }

    // Threat detection
    const highThreatCompetitors = state.competitors.filter((c) => c.threatLevel > 70);
    if (highThreatCompetitors.length > 0) {
      insights.push({
        id: `insight-threat-${round}`,
        category: "threat",
        title: "Competitive Threat Alert",
        description: `${highThreatCompetitors.map((c) => c.name).join(", ")} showing increased activity`,
        relevantSegments: ["General"] as Segment[],
        confidence: state.quality / 100,
        actionable: true,
        suggestedAction: "Review competitive positioning and defensive strategies",
      });
    }

    // Benchmark insight
    if (state.quality >= 70 && round % 4 === 0) {
      const avgStrength = state.competitors.reduce((sum, c) => sum + c.estimatedStrength, 0) / state.competitors.length;
      insights.push({
        id: `insight-benchmark-${round}`,
        category: "benchmark",
        title: "Competitive Landscape Analysis",
        description: `Average competitor strength: ${avgStrength.toFixed(0)}/100`,
        relevantSegments: ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"],
        confidence: state.quality / 100,
        actionable: false,
      });
    }

    return insights;
  }

  /**
   * Generate strategic recommendations
   */
  private static generateRecommendations(
    state: IntelligenceState,
    recommendations: string[]
  ): void {
    // Budget recommendation
    if (state.quality < 50) {
      recommendations.push("Increase intelligence budget to improve market visibility");
    }

    // Threat-based recommendations
    const highThreats = state.competitors.filter((c) => c.threatLevel > 75);
    for (const threat of highThreats) {
      recommendations.push(`Monitor ${threat.name} closely - elevated threat level`);
    }

    // Strategy-specific recommendations
    const costLeaders = state.competitors.filter((c) => c.strategy === "cost_leader");
    if (costLeaders.some((c) => c.threatLevel > 60)) {
      recommendations.push("Cost leader competitors active - consider value differentiation");
    }

    const qualityLeaders = state.competitors.filter((c) => c.strategy === "quality_leader");
    if (qualityLeaders.some((c) => c.threatLevel > 60)) {
      recommendations.push("Quality leaders competitive - invest in R&D to maintain edge");
    }
  }

  /**
   * Get competitor by ID
   */
  static getCompetitor(state: IntelligenceState, id: string): CompetitorProfile | undefined {
    return state.competitors.find((c) => c.id === id);
  }

  /**
   * Get signals for a specific segment
   */
  static getSegmentSignals(state: IntelligenceState, segment: Segment): MarketSignal[] {
    return state.signals.filter((s) => s.segment === segment);
  }
}

// Types are exported with their interface/type declarations above
