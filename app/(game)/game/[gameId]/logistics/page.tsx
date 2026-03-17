"use client";

import { use } from "react";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

/**
 * Logistics page — redirects to merged Supply Chain & Logistics page.
 * All logistics functionality is now in the Supply Chain page (Shipping tab).
 */
export default function LogisticsPage({ params }: PageProps) {
  const { gameId } = use(params);
  redirect(`/game/${gameId}/supply-chain?tab=shipping`);
}
