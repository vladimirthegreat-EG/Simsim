"use client";

import { use } from "react";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ gameId: string }>;
}

/**
 * News page merged into Market Intelligence.
 * This redirect preserves any existing links/bookmarks.
 */
export default function NewsPage({ params }: PageProps) {
  const { gameId } = use(params);
  redirect(`/game/${gameId}/market`);
}
