"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/api/trpc";

interface MessageBannerProps {
  gameId: string;
  teamId?: string;
}

export function MessageBanner({ gameId }: MessageBannerProps) {
  const [lastSeenAt, setLastSeenAt] = useState(() => new Date().toISOString());
  const lastSeenRef = useRef(lastSeenAt);

  const { data } = trpc.game.getMessages.useQuery(
    { gameId },
    { refetchInterval: 5000 }
  );

  useEffect(() => {
    if (!data?.length) return;

    const newMessages = data.filter(
      (msg: { createdAt: string; content: string; isAnnouncement?: boolean }) =>
        msg.createdAt > lastSeenRef.current
    );

    if (newMessages.length === 0) return;

    for (const message of newMessages) {
      toast.info(message.content, {
        description: message.isAnnouncement
          ? "Announcement from Facilitator"
          : "Message from Facilitator",
      });
    }

    const latest = newMessages[newMessages.length - 1].createdAt;
    lastSeenRef.current = latest;
    setLastSeenAt(latest);
  }, [data]);

  return null;
}
