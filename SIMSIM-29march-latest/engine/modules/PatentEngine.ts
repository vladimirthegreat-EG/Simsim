/**
 * Patent Engine - Cross-team patent resolution system
 *
 * Processes patent filing, licensing, challenges, and blocking.
 * Called between R&D processing and market simulation so blocking
 * penalties can affect product scores.
 */

import type { TechFamily, TechTier } from "./RDExpansions";
import { RDExpansions } from "./RDExpansions";
import type {
  Patent,
  PatentDecisions,
  PatentResolutionResult,
} from "../types/patents";
import {
  PATENT_FILING_COST,
  PATENT_DURATION,
  PATENT_EXCLUSIVE_BONUS,
  PATENT_BLOCKING_POWER,
  PATENT_CHALLENGE_COST,
  PATENT_CHALLENGE_SUCCESS_RATE,
  PATENT_LICENSE_FEE,
} from "../types/patents";
import type { TeamState } from "../types/state";
import type { EngineContext } from "../core/EngineContext";

// ============================================
// PATENT REGISTRY (shared across teams per game)
// ============================================

export interface PatentRegistry {
  patents: Patent[];
  /** Track which tech has been patented first (first-to-file) */
  filedTechs: Record<string, string>; // techId → ownerTeamId
}

export function initializePatentRegistry(): PatentRegistry {
  return { patents: [], filedTechs: {} };
}

// ============================================
// ENGINE
// ============================================

export class PatentEngine {
  /**
   * Process all patent decisions for all teams in a round.
   * Must be called AFTER R&D processing (so new techs are unlocked)
   * and BEFORE market simulation (so blocking penalties are applied).
   */
  static processRound(
    registry: PatentRegistry,
    teamDecisions: Array<{
      teamId: string;
      state: TeamState;
      decisions: PatentDecisions;
    }>,
    round: number,
    ctx?: EngineContext
  ): { updatedRegistry: PatentRegistry; result: PatentResolutionResult } {
    const updatedRegistry: PatentRegistry = {
      patents: [...registry.patents],
      filedTechs: { ...registry.filedTechs },
    };
    const messages: string[] = [];
    const newPatents: Patent[] = [];
    const expiredPatents: Patent[] = [];
    const challengeResults: PatentResolutionResult["challengeResults"] = [];
    const licensingRevenue: Record<string, number> = {};

    // Initialize revenue tracking
    for (const { teamId } of teamDecisions) {
      licensingRevenue[teamId] = 0;
    }

    // Step 1: Process patent filings (first-to-file wins)
    for (const { teamId, state, decisions } of teamDecisions) {
      if (!decisions.filings) continue;

      for (const filing of decisions.filings) {
        const techNode = RDExpansions.getTechNode(filing.techId);
        if (!techNode) {
          messages.push(`${teamId}: Cannot file patent - unknown tech "${filing.techId}"`);
          continue;
        }

        // Must be Tier 2+
        if (techNode.tier < 2) {
          messages.push(`${teamId}: Cannot file patent on "${techNode.name}" - Tier 1 techs are not patentable`);
          continue;
        }

        // Must have researched the tech
        const unlockedTechs = state.unlockedTechnologies || [];
        if (!unlockedTechs.includes(filing.techId)) {
          messages.push(`${teamId}: Cannot file patent on "${techNode.name}" - tech not researched`);
          continue;
        }

        // First-to-file check
        if (updatedRegistry.filedTechs[filing.techId]) {
          const existingOwner = updatedRegistry.filedTechs[filing.techId];
          messages.push(`${teamId}: Cannot file patent on "${techNode.name}" - already filed by ${existingOwner}`);
          continue;
        }

        // Check filing cost
        const cost = PATENT_FILING_COST[techNode.tier] || PATENT_FILING_COST[2];
        if (state.cash < cost) {
          messages.push(`${teamId}: Cannot afford patent filing for "${techNode.name}" ($${(cost / 1_000_000).toFixed(0)}M)`);
          continue;
        }

        // File the patent
        const patentId = ctx
          ? ctx.idGenerator.next("patent")
          : `pat-${filing.techId}-${round}`;

        const duration = PATENT_DURATION[techNode.tier] || PATENT_DURATION[2];
        const exclusiveBonus = PATENT_EXCLUSIVE_BONUS[techNode.tier] || PATENT_EXCLUSIVE_BONUS[2];
        const blockingPower = PATENT_BLOCKING_POWER[techNode.tier] || PATENT_BLOCKING_POWER[2];
        const licenseFee = PATENT_LICENSE_FEE[techNode.tier] || PATENT_LICENSE_FEE[2];

        const patent: Patent = {
          id: patentId,
          techId: filing.techId,
          family: techNode.family,
          tier: techNode.tier,
          ownerId: teamId,
          roundFiled: round,
          expiresRound: round + duration,
          status: "active",
          licensedTo: [],
          licenseFeePerRound: licenseFee,
          exclusiveBonus,
          blockingPower,
        };

        updatedRegistry.patents.push(patent);
        updatedRegistry.filedTechs[filing.techId] = teamId;
        newPatents.push(patent);

        // Deduct cost from team
        licensingRevenue[teamId] -= cost;
        messages.push(`${teamId} filed patent on "${techNode.name}" ($${(cost / 1_000_000).toFixed(0)}M, expires round ${patent.expiresRound})`);
      }
    }

    // Step 2: Process license requests
    for (const { teamId, decisions } of teamDecisions) {
      if (!decisions.licenseRequests) continue;

      for (const request of decisions.licenseRequests) {
        const patent = updatedRegistry.patents.find(
          p => p.id === request.patentId && p.status === "active"
        );
        if (!patent) {
          messages.push(`${teamId}: Cannot license - patent not found or not active`);
          continue;
        }

        if (patent.ownerId === teamId) {
          messages.push(`${teamId}: Cannot license own patent`);
          continue;
        }

        if (patent.licensedTo.includes(teamId)) {
          messages.push(`${teamId}: Already licensed patent "${patent.id}"`);
          continue;
        }

        // License is granted automatically (no negotiation in v1)
        patent.licensedTo.push(teamId);
        messages.push(`${teamId} licensed patent on "${patent.techId}" from ${patent.ownerId} ($${(patent.licenseFeePerRound / 1_000_000).toFixed(1)}M/round)`);
      }
    }

    // Step 3: Process challenges
    for (const { teamId, state, decisions } of teamDecisions) {
      if (!decisions.challenges) continue;

      for (const challenge of decisions.challenges) {
        const patent = updatedRegistry.patents.find(
          p => p.id === challenge.patentId && p.status === "active"
        );
        if (!patent) {
          messages.push(`${teamId}: Cannot challenge - patent not found`);
          continue;
        }

        if (patent.ownerId === teamId) {
          messages.push(`${teamId}: Cannot challenge own patent`);
          continue;
        }

        if (state.cash < PATENT_CHALLENGE_COST) {
          messages.push(`${teamId}: Cannot afford patent challenge ($${(PATENT_CHALLENGE_COST / 1_000_000).toFixed(0)}M)`);
          continue;
        }

        // Roll for challenge success
        const roll = ctx ? ctx.rng.rd.next() : Math.random();
        const success = roll < PATENT_CHALLENGE_SUCCESS_RATE;

        licensingRevenue[teamId] -= PATENT_CHALLENGE_COST;

        if (success) {
          patent.status = "challenged";
          messages.push(`${teamId} successfully challenged patent "${patent.techId}" - patent invalidated!`);
        } else {
          messages.push(`${teamId} failed to challenge patent "${patent.techId}" - $${(PATENT_CHALLENGE_COST / 1_000_000).toFixed(0)}M wasted`);
        }

        challengeResults.push({
          patentId: patent.id,
          challengerId: teamId,
          success,
          cost: PATENT_CHALLENGE_COST,
        });
      }
    }

    // Step 4: Collect licensing revenue
    for (const patent of updatedRegistry.patents) {
      if (patent.status !== "active") continue;

      for (const licenseeId of patent.licensedTo) {
        licensingRevenue[patent.ownerId] += patent.licenseFeePerRound;
        licensingRevenue[licenseeId] -= patent.licenseFeePerRound;
      }
    }

    // Step 5: Expire old patents
    for (const patent of updatedRegistry.patents) {
      if (patent.status === "active" && round >= patent.expiresRound) {
        patent.status = "expired";
        expiredPatents.push(patent);
        messages.push(`Patent on "${patent.techId}" (${patent.ownerId}) expired`);
      }
    }

    // Step 6: Calculate blocking penalties
    const blockingPenalties: Record<string, Partial<Record<TechFamily, number>>> = {};
    for (const { teamId, state } of teamDecisions) {
      blockingPenalties[teamId] = {};
      const unlockedTechs = state.unlockedTechnologies || [];

      for (const patent of updatedRegistry.patents) {
        if (patent.status !== "active") continue;
        if (patent.ownerId === teamId) continue; // Own patents don't block
        if (patent.licensedTo.includes(teamId)) continue; // Licensed = no block

        // Check if this team uses the patented tech (has it unlocked and in a product)
        if (unlockedTechs.includes(patent.techId)) {
          const currentPenalty = blockingPenalties[teamId][patent.family] || 0;
          blockingPenalties[teamId][patent.family] = Math.min(
            0.30, // Cap at 30% max penalty per family
            currentPenalty + patent.blockingPower
          );
        }
      }
    }

    return {
      updatedRegistry,
      result: {
        newPatents,
        expiredPatents,
        challengeResults,
        licensingRevenue,
        blockingPenalties,
        messages,
      },
    };
  }

  /**
   * Get all active patents for a specific team.
   */
  static getTeamPatents(registry: PatentRegistry, teamId: string): Patent[] {
    return registry.patents.filter(p => p.ownerId === teamId && p.status === "active");
  }

  /**
   * Get all patents blocking a specific team.
   */
  static getBlockingPatents(registry: PatentRegistry, teamId: string): Patent[] {
    return registry.patents.filter(
      p => p.status === "active" && p.ownerId !== teamId && !p.licensedTo.includes(teamId)
    );
  }

  /**
   * Get patentable techs for a team (Tier 2+, researched, not already filed).
   */
  static getPatentableTechs(
    registry: PatentRegistry,
    unlockedTechs: string[]
  ): string[] {
    const techTree = RDExpansions.getTechTree();
    return unlockedTechs.filter(techId => {
      const node = techTree.find(n => n.id === techId);
      if (!node || node.tier < 2) return false;
      return !registry.filedTechs[techId]; // Not already patented
    });
  }
}
