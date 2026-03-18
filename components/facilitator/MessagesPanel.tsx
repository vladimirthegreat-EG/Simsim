"use client";

import { useState } from "react";
import { trpc } from "@/lib/api/trpc";
import { toast } from "sonner";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { MessageSquare, Send, Inbox } from "lucide-react";

interface MessagesPanelProps {
  gameId: string;
  teams: Array<{ id: string; name: string; color: string }>;
}

export default function MessagesPanel({ gameId, teams }: MessagesPanelProps) {
  const [content, setContent] = useState("");
  const [targetMode, setTargetMode] = useState<"all" | "specific">("all");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const messagesQuery = trpc.game.getMessages.useQuery(
    { gameId },
    { refetchInterval: 5000 }
  );

  const sendMessageMutation = trpc.game.sendMessage.useMutation({
    onSuccess: () => {
      toast.success("Message sent successfully");
      setContent("");
      setTargetMode("all");
      setSelectedTeamId("");
      messagesQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Failed to send message: ${error.message}`);
    },
  });

  const handleSend = () => {
    if (!content.trim()) return;

    sendMessageMutation.mutate({
      gameId,
      content: content.trim(),
      targetTeamId: targetMode === "specific" ? selectedTeamId : undefined,
      isAnnouncement: true,
    });
  };

  const messages = messagesQuery.data ?? [];

  const getTeamName = (teamId: string | null | undefined) => {
    if (!teamId) return "All Teams";
    const team = teams.find((t) => t.id === teamId);
    return team?.name ?? "Unknown Team";
  };

  const formatTimestamp = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <MessageSquare className="h-5 w-5 text-blue-400" />
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Compose Section */}
        <div className="rounded-lg border p-4 space-y-3">
          <Label htmlFor="message-content" className="text-sm font-medium">
            Compose Message
          </Label>
          <Textarea
            id="message-content"
            placeholder="Type your message to teams..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="resize-none"
          />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Label className="text-sm text-muted-foreground">Target:</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTargetMode("all")}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    targetMode === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  All Teams
                </button>
                <button
                  type="button"
                  onClick={() => setTargetMode("specific")}
                  className={`px-3 py-1 rounded-md text-sm transition-colors ${
                    targetMode === "specific"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  Specific Team
                </button>
              </div>
            </div>

            {targetMode === "specific" && (
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: team.color }}
                        />
                        {team.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSend}
              disabled={
                !content.trim() ||
                (targetMode === "specific" && !selectedTeamId) ||
                sendMessageMutation.isPending
              }
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendMessageMutation.isPending ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>

        <Separator />

        {/* Message History */}
        <div>
          <Label className="text-sm font-medium text-muted-foreground mb-2 block">
            Message History
          </Label>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Inbox className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">No messages sent yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-3 pr-4">
                {messages.map((message: any, index: number) => (
                  <div
                    key={message.id ?? index}
                    className="rounded-lg border p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(message.createdAt ?? message.timestamp)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {getTeamName(message.targetTeamId)}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-xs bg-green-500/10 text-green-400"
                        >
                          Sent
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
