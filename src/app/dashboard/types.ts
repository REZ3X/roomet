export type Tab = "rooms" | "create" | "invites" | "profile" | "leaderboard";

export interface DashNotification {
  id: string;
  type: "invite" | "message" | "follow";
  data: Record<string, unknown>;
  timestamp: number;
  read: boolean;
}
