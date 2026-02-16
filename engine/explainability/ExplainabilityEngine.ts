/**
 * Explainability Engine
 *
 * Generates score breakdowns, delta explanations, and natural language narratives
 * to help players understand why outcomes occurred.
 *
 * Phase 3: Explainability Layer
 */

import type { TeamState, Segment } from "../types";
import type { TeamMarketPosition } from "../market/MarketSimulator";
import type {
  SegmentScoreBreakdown,
  DeltaExplanation,
  DeltaDriver,
  DriverTree,
  WaterfallStep,
  RoundNarrative,
  NarrativePoint,
  ExplainabilityResult,
  CompetitorScore,
} from "./types";

export class ExplainabilityEngine {
  /**
   * Generate complete explainability result for a team
   */
  static generateExplainability(
    teamId: string,
    round: number,
    currentState: TeamState,
    previousState: TeamState | null,
    marketPositions: TeamMarketPosition[],
    allTeamStates: { id: string; name: string; state: TeamState }[]
  ): ExplainabilityResult {
    const teamPosition = marketPositions.find(p => p.teamId === teamId);

    // Generate segment breakdowns
    const segmentBreakdowns = this.generateSegmentBreakdowns(
      teamId,
      currentState,
      marketPositions,
      allTeamStates
    );

    // Generate delta explanations
    const deltaExplanations = previousState
      ? this.generateDeltaExplanations(currentState, previousState, teamPosition)
      : [];

    // Generate driver trees
    const revenueDriverTree = this.generateRevenueDriverTree(currentState);
    const profitDriverTree = this.generateProfitDriverTree(currentState);

    // Generate narrative
    const narrative = this.generateNarrative(
      round,
      currentState,
      previousState,
      segmentBreakdowns,
      deltaExplanations
    );

    return {
      teamId,
      round,
      segmentBreakdowns,
      deltaExplanations,
      revenueDriverTree,
      profitDriverTree,
      narrative,
      rawMetrics: this.extractRawMetrics(currentState),
    };
  }

  /**
   * Generate score breakdown for each segment
   */
  static generateSegmentBreakdowns(
    teamId: string,
    state: TeamState,
    marketPositions: TeamMarketPosition[],
    allTeamStates: { id: string; name: string; state: TeamState }[]
  ): SegmentScoreBreakdown[] {
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    const teamPosition = marketPositions.find(p => p.teamId === teamId);

    return segments.map(segment => {
      // TeamMarketPosition is per-segment, so filter positions by teamId and segment
      const segmentData = marketPositions.find(p => p.teamId === teamId && p.segment === segment);

      // Get weights for this segment
      const weights = this.getSegmentWeights(segment);

      // Calculate individual scores (normalized 0-100)
      const scores = {
        price: segmentData?.priceScore ?? 50,
        quality: segmentData?.qualityScore ?? 50,
        brand: segmentData?.brandScore ?? 50,
        esg: segmentData?.esgScore ?? 50,
        features: segmentData?.featureScore ?? 50,
      };

      // Calculate weighted contributions
      const contributions = {
        price: scores.price * (weights.price / 100),
        quality: scores.quality * (weights.quality / 100),
        brand: scores.brand * (weights.brand / 100),
        esg: scores.esg * (weights.esg / 100),
        features: scores.features * (weights.features / 100),
      };

      const totalScore = contributions.price + contributions.quality +
        contributions.brand + contributions.esg + contributions.features;

      // Calculate competitor comparison
      const competitorScores = this.calculateCompetitorScores(
        segment,
        marketPositions,
        allTeamStates
      );

      // Calculate percentile
      const percentileVsCompetitors: Record<string, number> = {};
      for (const comp of competitorScores) {
        if (comp.teamId !== teamId) {
          const betterCount = competitorScores.filter(c => c.score < totalScore).length;
          percentileVsCompetitors[comp.teamId] = (betterCount / competitorScores.length) * 100;
        }
      }

      // Calculate rank from positions for this segment
      const segmentPositions = marketPositions.filter(p => p.segment === segment);
      const sortedByScore = [...segmentPositions].sort((a, b) => b.totalScore - a.totalScore);
      const rank = sortedByScore.findIndex(p => p.teamId === teamId) + 1 || competitorScores.length;

      return {
        segment,
        scores,
        weights,
        contributions,
        totalScore,
        percentileVsCompetitors,
        competitorComparison: competitorScores,
        marketShare: segmentData?.marketShare ?? 0,
        rank,
        revenue: segmentData?.revenue ?? 0,
      };
    });
  }

  /**
   * Generate explanations for changes from previous round
   */
  static generateDeltaExplanations(
    current: TeamState,
    previous: TeamState,
    marketPosition?: TeamMarketPosition
  ): DeltaExplanation[] {
    const explanations: DeltaExplanation[] = [];

    // Revenue change
    const revenueChange = current.revenue - previous.revenue;
    if (Math.abs(revenueChange) > 0) {
      explanations.push(this.explainRevenueChange(current, previous, revenueChange));
    }

    // Market share changes per segment
    const segments: Segment[] = ["Budget", "General", "Enthusiast", "Professional", "Active Lifestyle"];
    for (const segment of segments) {
      // Use marketShare from state (which is Record<Segment, number>)
      const currentShare = current.marketShare?.[segment] ?? 0;
      const previousShare = previous.marketShare?.[segment] ?? 0;
      const shareChange = currentShare - previousShare;

      if (Math.abs(shareChange) > 0.01) {
        explanations.push(this.explainMarketShareChange(segment, currentShare, previousShare, current, previous));
      }
    }

    // Brand value change
    const brandChange = current.brandValue - previous.brandValue;
    if (Math.abs(brandChange) > 0.01) {
      explanations.push(this.explainBrandChange(current, previous, brandChange));
    }

    return explanations;
  }

  /**
   * Explain revenue change
   */
  private static explainRevenueChange(
    current: TeamState,
    previous: TeamState,
    change: number
  ): DeltaExplanation {
    const drivers: DeltaDriver[] = [];
    const changePercent = previous.revenue > 0 ? (change / previous.revenue) * 100 : 0;

    // Volume driver (approximated from inventory changes if available)
    const currentFinishedGoods = Object.values(current.inventory?.finishedGoods ?? {}).reduce((sum, v) => sum + v, 0);
    const previousFinishedGoods = Object.values(previous.inventory?.finishedGoods ?? {}).reduce((sum, v) => sum + v, 0);
    const volumeChange = previousFinishedGoods - currentFinishedGoods; // Decrease in inventory = more sold
    if (volumeChange !== 0) {
      const avgPrice = current.products?.[0]?.price ?? 100;
      drivers.push({
        factor: "Sales Volume",
        contribution: volumeChange * avgPrice,
        direction: volumeChange > 0 ? "positive" : "negative",
        description: `${Math.abs(volumeChange).toLocaleString()} ${volumeChange > 0 ? "more" : "fewer"} units sold`,
        actionable: true,
        suggestedAction: volumeChange < 0 ? "Increase marketing spend or lower prices" : undefined,
      });
    }

    // Price driver (approximation using average product price)
    const avgPrice = current.products?.[0]?.price ?? 100;
    const previousAvgPrice = previous.products?.[0]?.price ?? avgPrice;
    const priceEffect = change - (volumeChange * previousAvgPrice);
    if (Math.abs(priceEffect) > 1000) {
      drivers.push({
        factor: "Price/Mix Effect",
        contribution: priceEffect,
        direction: priceEffect > 0 ? "positive" : "negative",
        description: priceEffect > 0 ? "Higher average selling prices" : "Lower average selling prices",
        actionable: true,
      });
    }

    // Brand impact
    const brandDiff = current.brandValue - previous.brandValue;
    if (Math.abs(brandDiff) > 0.01) {
      const brandContribution = change * 0.1 * (brandDiff > 0 ? 1 : -1);
      drivers.push({
        factor: "Brand Value",
        contribution: brandContribution,
        direction: brandDiff > 0 ? "positive" : "negative",
        description: `Brand value ${brandDiff > 0 ? "increased" : "decreased"} by ${Math.abs(brandDiff * 100).toFixed(1)}%`,
        actionable: true,
        suggestedAction: brandDiff < 0 ? "Invest in branding and marketing" : undefined,
      });
    }

    return {
      segment: "General" as Segment, // Overall
      metric: "revenue",
      previousValue: previous.revenue,
      currentValue: current.revenue,
      change,
      changePercent,
      drivers,
      explanation: this.generateRevenueExplanation(change, changePercent, drivers),
      recommendations: this.generateRevenueRecommendations(drivers),
    };
  }

  /**
   * Explain market share change for a segment
   */
  private static explainMarketShareChange(
    segment: Segment,
    current: number,
    previous: number,
    currentState: TeamState,
    previousState: TeamState
  ): DeltaExplanation {
    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;
    const drivers: DeltaDriver[] = [];

    // Quality driver
    const qualityChange = (currentState.products?.[0]?.quality ?? 50) - (previousState.products?.[0]?.quality ?? 50);
    if (qualityChange !== 0) {
      drivers.push({
        factor: "Product Quality",
        contribution: change * (qualityChange / 10),
        direction: qualityChange > 0 ? "positive" : "negative",
        description: `Quality ${qualityChange > 0 ? "improved" : "declined"} by ${Math.abs(qualityChange)} points`,
        actionable: true,
        suggestedAction: qualityChange < 0 ? "Increase R&D investment" : undefined,
      });
    }

    // Brand driver
    const brandChange = currentState.brandValue - previousState.brandValue;
    if (brandChange !== 0) {
      drivers.push({
        factor: "Brand Strength",
        contribution: change * 0.3,
        direction: brandChange > 0 ? "positive" : "negative",
        description: `Brand ${brandChange > 0 ? "strengthened" : "weakened"}`,
        actionable: true,
      });
    }

    return {
      segment,
      metric: "marketShare",
      previousValue: previous,
      currentValue: current,
      change,
      changePercent,
      drivers,
      explanation: `Market share in ${segment} ${change > 0 ? "increased" : "decreased"} by ${Math.abs(change * 100).toFixed(1)} percentage points`,
      recommendations: drivers.filter(d => d.direction === "negative" && d.suggestedAction).map(d => d.suggestedAction!),
    };
  }

  /**
   * Explain brand value change
   */
  private static explainBrandChange(
    current: TeamState,
    previous: TeamState,
    change: number
  ): DeltaExplanation {
    const drivers: DeltaDriver[] = [];
    const changePercent = previous.brandValue > 0 ? (change / previous.brandValue) * 100 : 0;

    // Natural decay
    const decayAmount = previous.brandValue * 0.065;
    drivers.push({
      factor: "Natural Decay",
      contribution: -decayAmount,
      direction: "negative",
      description: "Brand value decays 6.5% per round without investment",
      actionable: true,
      suggestedAction: "Maintain brand investment to offset decay",
    });

    // Marketing investment effect
    const marketingGrowth = change + decayAmount;
    if (marketingGrowth > 0) {
      drivers.push({
        factor: "Marketing Investment",
        contribution: marketingGrowth,
        direction: "positive",
        description: "Brand building from advertising and sponsorships",
        actionable: true,
      });
    }

    return {
      segment: "General" as Segment,
      metric: "brand",
      previousValue: previous.brandValue,
      currentValue: current.brandValue,
      change,
      changePercent,
      drivers,
      explanation: `Brand value ${change > 0 ? "grew" : "declined"} by ${Math.abs(changePercent).toFixed(1)}%`,
      recommendations: change < 0 ? ["Increase branding investment", "Consider sponsorships for brand boost"] : [],
    };
  }

  /**
   * Generate revenue driver tree (waterfall)
   */
  static generateRevenueDriverTree(state: TeamState): DriverTree {
    const steps: WaterfallStep[] = [];
    let cumulative = 0;

    // Gross revenue
    const grossRevenue = state.revenue * 1.1; // Approximate pre-discount
    steps.push({
      label: "Gross Revenue",
      value: grossRevenue,
      cumulative: grossRevenue,
      type: "total",
    });
    cumulative = grossRevenue;

    // Discounts
    const discounts = -grossRevenue * 0.05;
    cumulative += discounts;
    steps.push({
      label: "Discounts & Promotions",
      value: discounts,
      cumulative,
      type: "decrease",
    });

    // Returns
    const returns = -grossRevenue * 0.02;
    cumulative += returns;
    steps.push({
      label: "Returns & Allowances",
      value: returns,
      cumulative,
      type: "decrease",
    });

    // Net revenue
    steps.push({
      label: "Net Revenue",
      value: cumulative,
      cumulative,
      type: "subtotal",
    });

    return {
      rootOutcome: "Revenue",
      rootValue: state.revenue,
      nodes: [],
      waterfallSteps: steps,
    };
  }

  /**
   * Generate profit driver tree (waterfall)
   */
  static generateProfitDriverTree(state: TeamState): DriverTree {
    const steps: WaterfallStep[] = [];
    let cumulative = state.revenue;

    // Start with revenue
    steps.push({
      label: "Revenue",
      value: state.revenue,
      cumulative,
      type: "total",
    });

    // COGS
    const cogs = -state.revenue * 0.55;
    cumulative += cogs;
    steps.push({
      label: "Cost of Goods Sold",
      value: cogs,
      cumulative,
      type: "decrease",
    });

    // Gross profit subtotal
    steps.push({
      label: "Gross Profit",
      value: cumulative,
      cumulative,
      type: "subtotal",
    });

    // Operating expenses
    const opex = -(state.workforce?.laborCost ?? 0);
    cumulative += opex;
    steps.push({
      label: "Operating Expenses",
      value: opex,
      cumulative,
      type: "decrease",
    });

    // Marketing
    const marketing = -state.revenue * 0.1;
    cumulative += marketing;
    steps.push({
      label: "Marketing & Sales",
      value: marketing,
      cumulative,
      type: "decrease",
    });

    // R&D
    const rd = -state.revenue * 0.08;
    cumulative += rd;
    steps.push({
      label: "R&D Expenses",
      value: rd,
      cumulative,
      type: "decrease",
    });

    // Operating income
    steps.push({
      label: "Operating Income",
      value: cumulative,
      cumulative,
      type: "subtotal",
    });

    // Interest & taxes
    const interestTax = -cumulative * 0.25;
    cumulative += interestTax;
    steps.push({
      label: "Interest & Taxes",
      value: interestTax,
      cumulative,
      type: "decrease",
    });

    // Net income
    steps.push({
      label: "Net Income",
      value: cumulative,
      cumulative,
      type: "total",
    });

    return {
      rootOutcome: "Profit",
      rootValue: state.netIncome,
      nodes: [],
      waterfallSteps: steps,
    };
  }

  /**
   * Generate natural language narrative for the round
   */
  static generateNarrative(
    round: number,
    current: TeamState,
    previous: TeamState | null,
    breakdowns: SegmentScoreBreakdown[],
    deltas: DeltaExplanation[]
  ): RoundNarrative {
    const highlights: NarrativePoint[] = [];
    const concerns: NarrativePoint[] = [];
    const opportunities: NarrativePoint[] = [];
    const recommendations: NarrativePoint[] = [];

    // Revenue performance
    const revenueGrowth = previous ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0;
    if (revenueGrowth > 10) {
      highlights.push({
        title: "Strong Revenue Growth",
        description: `Revenue grew ${revenueGrowth.toFixed(1)}% this round`,
        metric: "revenue",
        value: current.revenue,
        change: revenueGrowth,
        severity: "success",
      });
    } else if (revenueGrowth < -5) {
      concerns.push({
        title: "Revenue Decline",
        description: `Revenue dropped ${Math.abs(revenueGrowth).toFixed(1)}% this round`,
        metric: "revenue",
        value: current.revenue,
        change: revenueGrowth,
        severity: "warning",
        actionRequired: true,
      });
    }

    // Brand health
    if (current.brandValue < 0.2) {
      concerns.push({
        title: "Weak Brand",
        description: "Brand value is critically low, affecting market share",
        metric: "brandValue",
        value: current.brandValue,
        severity: "critical",
        actionRequired: true,
      });
      recommendations.push({
        title: "Invest in Branding",
        description: "Consider sponsorships and increased marketing spend",
        severity: "info",
      });
    }

    // Cash position
    if (current.cash < 20_000_000) {
      concerns.push({
        title: "Low Cash Reserves",
        description: "Cash position is getting dangerously low",
        metric: "cash",
        value: current.cash,
        severity: "warning",
        actionRequired: true,
      });
    }

    // Market position
    const topSegment = breakdowns.reduce((best, curr) =>
      curr.rank < best.rank ? curr : best
    );
    if (topSegment.rank === 1) {
      highlights.push({
        title: `Market Leader in ${topSegment.segment}`,
        description: `Holding #1 position with ${(topSegment.marketShare * 100).toFixed(1)}% share`,
        metric: "marketShare",
        value: topSegment.marketShare,
        severity: "success",
      });
    }

    // Opportunities
    const lowShareSegments = breakdowns.filter(b => b.marketShare < 0.1 && b.rank > 2);
    for (const seg of lowShareSegments.slice(0, 2)) {
      opportunities.push({
        title: `Growth Opportunity in ${seg.segment}`,
        description: `Currently at ${(seg.marketShare * 100).toFixed(1)}% share - room to grow`,
        severity: "info",
      });
    }

    // Generate headline
    const headline = this.generateHeadline(revenueGrowth, current, highlights, concerns);

    // Generate summary
    const summary = this.generateSummary(round, current, previous, highlights, concerns);

    return {
      round,
      headline,
      summary,
      keyHighlights: highlights,
      concerns,
      opportunities,
      competitorInsights: [],
      recommendations,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private static getSegmentWeights(segment: Segment): { price: number; quality: number; brand: number; esg: number; features: number } {
    const weights: Record<Segment, { price: number; quality: number; brand: number; esg: number; features: number }> = {
      Budget: { price: 50, quality: 22, brand: 8, esg: 8, features: 12 },
      General: { price: 32, quality: 28, brand: 10, esg: 10, features: 20 },
      Enthusiast: { price: 20, quality: 40, brand: 10, esg: 10, features: 20 },
      Professional: { price: 15, quality: 42, brand: 10, esg: 16, features: 17 },
      "Active Lifestyle": { price: 25, quality: 32, brand: 12, esg: 10, features: 21 },
    };
    return weights[segment];
  }

  private static calculateCompetitorScores(
    segment: Segment,
    positions: TeamMarketPosition[],
    teams: { id: string; name: string; state: TeamState }[]
  ): CompetitorScore[] {
    // Filter positions for this segment (TeamMarketPosition is per-segment)
    const segmentPositions = positions.filter(p => p.segment === segment);

    // Sort by total score to calculate ranks
    const sortedPositions = [...segmentPositions].sort((a, b) => b.totalScore - a.totalScore);

    return sortedPositions.map((pos, index) => {
      const team = teams.find(t => t.id === pos.teamId);
      return {
        teamId: pos.teamId,
        teamName: team?.name ?? pos.teamId,
        score: pos.totalScore,
        rank: index + 1,
        marketShare: pos.marketShare,
      };
    });
  }

  private static generateRevenueExplanation(change: number, changePercent: number, drivers: DeltaDriver[]): string {
    const direction = change > 0 ? "increased" : "decreased";
    const mainDriver = drivers.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))[0];

    return `Revenue ${direction} by $${Math.abs(change / 1_000_000).toFixed(1)}M (${Math.abs(changePercent).toFixed(1)}%), primarily driven by ${mainDriver?.factor.toLowerCase() ?? "market conditions"}.`;
  }

  private static generateRevenueRecommendations(drivers: DeltaDriver[]): string[] {
    return drivers
      .filter(d => d.direction === "negative" && d.suggestedAction)
      .map(d => d.suggestedAction!);
  }

  private static generateHeadline(
    revenueGrowth: number,
    state: TeamState,
    highlights: NarrativePoint[],
    concerns: NarrativePoint[]
  ): string {
    if (highlights.length > concerns.length) {
      if (revenueGrowth > 15) return "Outstanding Quarter with Strong Growth";
      if (revenueGrowth > 5) return "Solid Performance Across Key Metrics";
      return "Steady Progress Despite Market Challenges";
    } else if (concerns.length > highlights.length) {
      if (revenueGrowth < -10) return "Challenging Quarter Requires Strategic Review";
      if (concerns.some(c => c.severity === "critical")) return "Critical Issues Demand Immediate Attention";
      return "Mixed Results Signal Need for Adjustment";
    }
    return "Balanced Performance with Room for Improvement";
  }

  private static generateSummary(
    round: number,
    current: TeamState,
    previous: TeamState | null,
    highlights: NarrativePoint[],
    concerns: NarrativePoint[]
  ): string {
    const parts: string[] = [];

    parts.push(`Round ${round} results are in.`);

    if (previous) {
      const revenueChange = current.revenue - previous.revenue;
      if (revenueChange > 0) {
        parts.push(`Revenue increased by $${(revenueChange / 1_000_000).toFixed(1)}M.`);
      } else {
        parts.push(`Revenue decreased by $${(Math.abs(revenueChange) / 1_000_000).toFixed(1)}M.`);
      }
    }

    if (highlights.length > 0) {
      parts.push(`Key wins include ${highlights[0].title.toLowerCase()}.`);
    }

    if (concerns.length > 0) {
      parts.push(`Watch out for ${concerns[0].title.toLowerCase()}.`);
    }

    return parts.join(" ");
  }

  private static extractRawMetrics(state: TeamState): Record<string, number> {
    return {
      revenue: state.revenue,
      netIncome: state.netIncome,
      cash: state.cash,
      brandValue: state.brandValue,
      esgScore: state.esgScore,
      marketCap: state.marketCap,
      eps: state.eps,
      headcount: state.workforce?.totalHeadcount ?? 0,
      morale: state.workforce?.averageMorale ?? 0,
    };
  }
}
