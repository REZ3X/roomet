"use client";

import { useState, useEffect } from "react";
import { invitesAPI } from "@/lib/api-client";
import { FaUserPlus, FaTimes } from "@/components/Icons";
import type { DashNotification } from "./types";

export default function InvitesTab({
  token,
  onJoinRoom,
  refreshTrigger,
  notifications,
  onDismissNotification,
}: {
  token: string;
  onJoinRoom: (id: string) => void;
  refreshTrigger: number;
  notifications: DashNotification[];
  onDismissNotification: (id: string) => void;
}) {
  const [invites, setInvites] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await invitesAPI.list(token);
        setInvites(data.invites);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, refreshTrigger]);

  const handleRespond = async (
    inviteId: string,
    action: "accept" | "decline",
  ) => {
    try {
      const result = await invitesAPI.respond(token, inviteId, action);
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      if (action === "accept" && result.roomId) onJoinRoom(result.roomId);
    } catch (error) {
      console.error("Respond failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-7 h-7 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const followNotifs = notifications.filter((n) => n.type === "follow");
  const hasContent = invites.length > 0 || followNotifs.length > 0;

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">
        Inbox
      </h2>
      <p className="text-[var(--text-muted)] text-[13px] mb-4">
        Room invitations and notifications
      </p>

      {!hasContent ? (
        <div className="text-center py-16">
          <p className="text-[var(--text-muted)] text-sm">Nothing here yet</p>
        </div>
      ) : (
        <>
          {invites.length > 0 && (
            <div className="space-y-2">
              {invites.map((invite) => {
                const sender = invite.sender as Record<string, unknown>;
                const room = invite.room as Record<string, unknown>;
                return (
                  <div
                    key={invite.id as string}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--avatar-bg)] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {sender.avatarUrl ? (
                        <img
                          src={sender.avatarUrl as string}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[11px] font-semibold text-white">
                          {(sender.displayName as string)?.[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[var(--text-primary)]">
                        <span className="font-medium">
                          {sender.displayName as string}
                        </span>{" "}
                        invited you to
                      </p>
                      <p className="text-[13px] text-[var(--accent)] font-medium truncate">
                        {room.title as string}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleRespond(invite.id as string, "accept")
                        }
                        className="px-3 py-1 bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-[11px] font-medium rounded-md hover:bg-[var(--accent-green)]/15 transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleRespond(invite.id as string, "decline")
                        }
                        className="px-3 py-1 bg-[var(--accent-coral)]/10 text-[var(--accent-coral)] text-[11px] font-medium rounded-md hover:bg-[var(--accent-coral)]/15 transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Follow Notifications */}
          {followNotifs.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mt-6 mb-2">
                Recent Activity
              </h3>
              <div className="space-y-2">
                {followNotifs.map((notif) => (
                  <div
                    key={notif.id}
                    className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0">
                      <FaUserPlus size={12} className="text-[var(--accent)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[var(--text-primary)]">
                        <span className="font-medium">
                          {notif.data.followerName as string}
                        </span>{" "}
                        started following you
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        @{notif.data.followerUsername as string}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDismissNotification(notif.id)}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
