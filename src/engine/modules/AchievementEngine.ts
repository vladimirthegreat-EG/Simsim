/**
 * Achievement Engine - evaluates ~40 achievement conditions each round
 *
 * Checks team state, market results, patent registry, and tech tree
 * to determine which achievements have been unlocked.
 *
 * Victory condition: highest achievement score wins.
 * Tiebreakers: (1) cumulative revenue, (2) avg market share, (3) first to score.
 */

import type { TeamState } from "../types/state";
import type { Segment } from "../types/factory";
import type {
  AchievementDefinition,
  UnlockedAchievement,
  VictoryResult,
  VictoryRanking,
} from "../types/achievements";
import { ALL_ACHIEVEMENTS, calculateAchievementScore } from "../types/achievements";
import type { PatentRegistry } from "./PatentEngine";
import type { MarketSimulationResult } from "../market/MarketSimulator";
import { RDExpansions } from "./RDExpansions";
import type { TechFamily } from "./RDExpansions";
import { TECH_FAMILIES } from "../types/features";
import { CONSTANTS } from "../types";

// ============================================
// TYPES
// ============================================

export interface AchievementCheckContext {
  teamId: string;
  state: TeamState;
  round: number;
  marketResult?: MarketSimulationResult;
  patentRegistry?: PatentRegistry;
  /** Historical data: previous round states per team for trend detection */
  previousStates?: Record<string, TeamState[]>;
  /** All teams for cross-team checks */
  allTeams?: Array<{ id: string; state: TeamState }>;
}

// ============================================
// ENGINE
// ============================================

export class AchievementEngine {
  /**
   * Evaluate all achievement conditions for a team.
   * Returns newly unlocked achievements this round.
   */
  static evaluate(ctx: AchievementCheckContext): UnlockedAchievement[] {
    const existing = ctx.state.achievements || [];
    const existingIds = new Set(existing.map(a => a.id));
    const newlyUnlocked: UnlockedAchievement[] = [];

    for (const def of ALL_ACHIEVEMENTS) {
      if (existingIds.has(def.id)) continue; // Already unlocked

      if (this.checkCondition(def, ctx)) {
        newlyUnlocked.push({
          id: def.id,
          roundUnlocked: ctx.round,
          points: def.points,
        });
      }
    }

    return newlyUnlocked;
  }

  /**
   * Check a single achievement condition.
   */
  private static checkCondition(
    def: AchievementDefinition,
    ctx: AchievementCheckContext
  ): boolean {
    const { state, round, marketResult, patentRegistry, allTeams } = ctx;
    const unlockedTechs = state.unlockedTechnologies || [];
    const techTree = RDExpansions.getTechTree();

    switch (def.id) {
      // --- Tech Tree Achievements ---
      case "tech_first_t1":
        return unlockedTechs.some(t => {
          const node = techTree.find(n => n.id === t);
          return node && node.tier === 1;
        });

      case "tech_full_family": {
        for (const family of TECH_FAMILIES) {
          const familyNodes = techTree.filter(n => n.family === family);
          if (familyNodes.every(n => unlockedTechs.includes(n.id))) return true;
        }
        return false;
      }

      case "tech_two_families": {
        let completeFamilies = 0;
        for (const family of TECH_FAMILIES) {
          const familyNodes = techTree.filter(n => n.family === family);
          if (familyNodes.every(n => unlockedTechs.includes(n.id))) completeFamilies++;
        }
        return completeFamilies >= 2;
      }

      case "tech_tier5":
        return unlockedTechs.some(t => {
          const node = techTree.find(n => n.id === t);
          return node && node.tier === 5;
        });

      case "tech_all_tier5": {
        const tier5Nodes = techTree.filter(n => n.tier === 5);
        return tier5Nodes.every(n => unlockedTechs.includes(n.id));
      }

      case "tech_cross_family": {
        let crossFamilyCount = 0;
        for (const techId of unlockedTechs) {
          const node = techTree.find(n => n.id === techId);
          if (node) {
            const hasCrossFamily = node.effects.some(e => e.type === "family_bonus");
            if (hasCrossFamily) crossFamilyCount++;
          }
        }
        return crossFamilyCount >= 3;
      }

      case "tech_speed_t3":
        return round <= 4 && unlockedTechs.some(t => {
          const node = techTree.find(n => n.id === t);
          return node && node.tier >= 3;
        });

      case "tech_both_paths": {
        for (const family of TECH_FAMILIES) {
          const familyNodes = techTree.filter(n => n.family === family && n.tier >= 2);
          // Check if both a and b paths exist and are unlocked at same tier
          for (let tier = 2; tier <= 5; tier++) {
            const tierNodes = familyNodes.filter(n => n.tier === tier);
            if (tierNodes.length >= 2 && tierNodes.every(n => unlockedTechs.includes(n.id))) {
              return true;
            }
          }
        }
        return false;
      }

      case "tech_first_in_game": {
        // Needs competition state or allTeams to verify "first"
        // For simplicity: check if team has any tier 4+ tech
        return unlockedTechs.some(t => {
          const node = techTree.find(n => n.id === t);
          return node && node.tier >= 4;
        });
      }

      // --- Archetype Achievements ---
      case "arch_first_phone":
        return state.products.some(p => p.archetypeId);

      case "arch_5_types": {
        const archetypes = new Set(
          state.products.filter(p => p.archetypeId && p.developmentStatus === "launched").map(p => p.archetypeId)
        );
        return archetypes.size >= 5;
      }

      case "arch_flagship":
        return state.products.some(p => {
          if (!p.archetypeId) return false;
          // Tier 4+ archetypes have specific IDs we know
          const tier4Plus = ["creator_phone", "explorer_phone", "ultimate_flagship", "quantum_phone", "peoples_phone", "foldable_phone"];
          return tier4Plus.includes(p.archetypeId) && p.developmentStatus === "launched";
        });

      case "arch_quantum":
        return state.products.some(
          p => p.archetypeId === "quantum_phone" && p.developmentStatus === "launched"
        );

      case "arch_segment_sweep": {
        const segments = new Set(
          state.products.filter(p => p.developmentStatus === "launched").map(p => p.segment)
        );
        return segments.size >= 5;
      }

      case "arch_peoples_champ": {
        const hasPeoplesPhone = state.products.some(
          p => p.archetypeId === "peoples_phone" && p.developmentStatus === "launched"
        );
        const budgetShare = state.marketShare?.["Budget"] ?? 0;
        return hasPeoplesPhone && budgetShare > 0.30;
      }

      case "arch_tradeoff": {
        // Product with a feature emphasis < 0.8 (tradeoff) still capturing >15% share
        if (!marketResult) return false;
        for (const product of state.products) {
          if (!product.featureSet) continue;
          const hasTradeoff = TECH_FAMILIES.some(f => (product.featureSet as Record<string, number>)[f] < 20);
          if (hasTradeoff) {
            const position = marketResult.positions.find(
              p => p.teamId === ctx.teamId && p.segment === product.segment
            );
            if (position && position.marketShare > 0.15) return true;
          }
        }
        return false;
      }

      // --- Feature Demand Achievements ---
      case "feat_perfect_match":
        if (!marketResult) return false;
        return marketResult.positions.some(
          p => p.teamId === ctx.teamId && p.featureScore > 0 && p.product?.featureSet &&
            (p.featureScore / CONSTANTS.SEGMENT_WEIGHTS[p.segment].features) > 0.90
        );

      case "feat_multi_match": {
        if (!marketResult) return false;
        let highMatchCount = 0;
        for (const pos of marketResult.positions) {
          if (pos.teamId !== ctx.teamId || !pos.product?.featureSet) continue;
          const ratio = pos.featureScore / CONSTANTS.SEGMENT_WEIGHTS[pos.segment].features;
          if (ratio > 0.80) highMatchCount++;
        }
        return highMatchCount >= 3;
      }

      case "feat_dominate_family":
        // Simplified: highest feature in any family for a product
        return false; // Needs cross-team data, deferred to Phase 11

      case "feat_balanced": {
        for (const product of state.products) {
          if (!product.featureSet) continue;
          const values = TECH_FAMILIES.map(f => (product.featureSet as Record<string, number>)[f]);
          const range = Math.max(...values) - Math.min(...values);
          if (range <= 15 && Math.min(...values) > 0) return true;
        }
        return false;
      }

      // --- Dynamic Pricing Achievements ---
      case "price_undercut":
        // Simplified: check if any product is priced below segment min and has >10% share
        if (!marketResult) return false;
        return marketResult.positions.some(p => {
          if (p.teamId !== ctx.teamId || !p.product) return false;
          return p.marketShare > 0.10;
        });

      case "price_premium": {
        if (!marketResult) return false;
        for (const pos of marketResult.positions) {
          if (pos.teamId !== ctx.teamId || !pos.product) continue;
          const segmentData = marketResult.totalDemand; // simplified check
          if (pos.marketShare > 0.15) {
            // Check if price is >20% above expected
            const priceRange = { Budget: 200, General: 450, Enthusiast: 800, Professional: 1250, "Active Lifestyle": 600 };
            const expected = priceRange[pos.segment as keyof typeof priceRange] || 400;
            if (pos.product.price > expected * 1.2) return true;
          }
        }
        return false;
      }

      case "price_opportunist":
        // Needs historical data - deferred to full implementation
        return false;

      case "price_margin_king": {
        if (!state.revenue || state.revenue === 0) return false;
        const margin = state.netIncome / state.revenue;
        return margin > 0.35;
        // TODO: Track consecutive rounds
      }

      case "price_destroyer":
        // Needs dynamic pricing history - deferred
        return false;

      // --- Patent Achievements ---
      case "pat_first_filed": {
        const patents = Array.isArray(state.patents) ? state.patents : [];
        return patents.length > 0;
      }

      case "pat_portfolio": {
        const patents = Array.isArray(state.patents) ? state.patents : [];
        const activePatents = patents.filter((p: any) => p.status === "active");
        return activePatents.length >= 5;
      }

      case "pat_licensing_rev":
        // Needs cumulative tracking - simplified check
        return false;

      case "pat_blocked":
        // Needs cross-team patent data
        return false;

      case "pat_challenged_won":
        // Needs challenge history
        return false;

      case "pat_challenged_lost":
        return false;

      case "pat_monopoly": {
        if (!patentRegistry) return false;
        const ownPatents = patentRegistry.patents.filter(
          p => p.ownerId === ctx.teamId && p.status === "active"
        );
        const families = new Set(ownPatents.map(p => p.family));
        return families.size >= 4;
      }

      case "pat_generous": {
        if (!patentRegistry || !allTeams) return false;
        const ownActive = patentRegistry.patents.filter(
          p => p.ownerId === ctx.teamId && p.status === "active"
        );
        const otherTeamCount = allTeams.filter(t => t.id !== ctx.teamId).length;
        return ownActive.some(p => p.licensedTo.length >= otherTeamCount);
      }

      // --- Competitive Achievements ---
      case "pvp_steal_share":
        // Needs historical market share tracking
        return false;

      case "pvp_displace_leader":
        if (!marketResult) return false;
        for (const segment of CONSTANTS.SEGMENTS) {
          const segPositions = marketResult.positions.filter(p => p.segment === segment);
          const sorted = [...segPositions].sort((a, b) => b.marketShare - a.marketShare);
          if (sorted[0]?.teamId === ctx.teamId && sorted[0]?.marketShare > 0) return true;
        }
        return false;

      case "pvp_monopoly":
        return Object.values(state.marketShare || {}).some(share => share > 0.50);

      case "pvp_diversified": {
        let count = 0;
        for (const share of Object.values(state.marketShare || {})) {
          if (share > 0.15) count++;
        }
        return count >= 4;
      }

      case "pvp_comeback":
        // Needs historical ranking data
        return false;

      case "pvp_bankrupt":
        return false;

      // --- Bad Achievements ---
      case "bad_no_product":
        return round >= 5 && state.products.filter(p => p.developmentStatus === "launched").length === 0;

      case "bad_zero_share": {
        const totalShare = Object.values(state.marketShare || {}).reduce((s, v) => s + v, 0);
        return totalShare === 0 && round >= 3;
      }

      case "bad_cash_negative":
        return state.cash < 0;

      case "bad_no_research":
        return round >= 6 && (unlockedTechs.length === 0);

      case "bad_overspend":
        return state.revenue > 0 && state.rdBudget > state.revenue * 0.6;

      case "bad_patent_fail": {
        const patents = Array.isArray(state.patents) ? state.patents : [];
        if (patents.length < 3) return false;
        const anyLicensed = patents.some((p: any) => p.licensedTo && p.licensedTo.length > 0);
        return !anyLicensed;
      }

      default:
        return false;
    }
  }

  /**
   * Resolve victory at game end.
   * Tiebreakers: (1) cumulative revenue, (2) avg market share, (3) first to score.
   */
  static resolveVictory(
    teams: Array<{
      id: string;
      name: string;
      state: TeamState;
      cumulativeRevenue: number;
    }>
  ): VictoryResult {
    const rankings: VictoryRanking[] = teams.map(team => {
      const achievements = team.state.achievements || [];
      const score = calculateAchievementScore(achievements);
      const avgShare = Object.values(team.state.marketShare || {}).reduce((s, v) => s + v, 0)
        / Math.max(1, Object.keys(team.state.marketShare || {}).length);

      return {
        teamId: team.id,
        teamName: team.name,
        rank: 0,
        achievementScore: score,
        achievementCount: achievements.length,
        tiebreaker_revenue: team.cumulativeRevenue,
        tiebreaker_marketShare: avgShare,
      };
    });

    // Sort: score desc, then revenue desc, then share desc
    rankings.sort((a, b) => {
      if (b.achievementScore !== a.achievementScore) return b.achievementScore - a.achievementScore;
      if (b.tiebreaker_revenue !== a.tiebreaker_revenue) return b.tiebreaker_revenue - a.tiebreaker_revenue;
      return b.tiebreaker_marketShare - a.tiebreaker_marketShare;
    });

    // Assign ranks
    rankings.forEach((r, i) => { r.rank = i + 1; });

    return { rankings };
  }
}
