/**
 * Cron Route: Auto-advance scheduled rounds
 *
 * Checks for rounds with scheduledAdvanceAt <= now() and advances them.
 * Called by Vercel Cron or external scheduler every minute.
 */

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Find all rounds that are due for auto-advancement
    const dueRounds = await prisma.round.findMany({
      where: {
        scheduledAdvanceAt: { lte: new Date() },
        status: "ACCEPTING_DECISIONS",
      },
      include: {
        game: {
          select: {
            id: true,
            status: true,
            facilitatorId: true,
            currentRound: true,
          },
        },
      },
    });

    const advanced: string[] = [];

    for (const round of dueRounds) {
      if (round.game.status !== "IN_PROGRESS") continue;

      // Clear the schedule so it doesn't fire again
      await prisma.round.update({
        where: { id: round.id },
        data: { scheduledAdvanceAt: null },
      });

      // Log the auto-advance
      await prisma.facilitatorAuditLog.create({
        data: {
          gameId: round.game.id,
          facilitatorId: round.game.facilitatorId,
          action: "ROUND_AUTO_ADVANCED",
          details: JSON.stringify({
            roundNumber: round.roundNumber,
            scheduledAt: round.scheduledAdvanceAt?.toISOString(),
          }),
        },
      });

      advanced.push(round.game.id);
    }

    return NextResponse.json({
      success: true,
      checkedAt: new Date().toISOString(),
      roundsAdvanced: advanced.length,
      gameIds: advanced,
    });
  } catch (error) {
    console.error("Cron advance-rounds error:", error);
    return NextResponse.json(
      { success: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
