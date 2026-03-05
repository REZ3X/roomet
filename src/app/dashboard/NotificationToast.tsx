"use client";

import { useState } from "react";
import { invitesAPI } from "@/lib/api-client";
import { FaBell, FaUserPlus, FaComments, FaTimes } from "@/components/Icons";
import type { DashNotification } from "./types";

export default function NotificationToast({
  notification,
  token,
  onDismiss,
  onJoinRoom,
}: {
  notification: DashNotification;
  token: string;
  onDismiss: () => void;
  onJoinRoom: (roomId: string) => void;
}) {
  const [responding, setResponding] = useState(false);

  const handleAccept = async () => {
    const inviteId = notification.data.inviteId as string;
    const roomId = notification.data.roomId as string;
    if (!inviteId) return;
    setResponding(true);
    try {
      await invitesAPI.respond(token, inviteId, "accept");
      onDismiss();
      onJoinRoom(roomId);
    } catch {
      /* ignore */
    }
    setResponding(false);
  };

  const handleDecline = async () => {
    const inviteId = notification.data.inviteId as string;
    if (!inviteId) return;
    setResponding(true);
    try {
      await invitesAPI.respond(token, inviteId, "decline");
      onDismiss();
    } catch {
      /* ignore */
    }
    setResponding(false);
  };

  if (notification.type === "invite") {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 shadow-[var(--shadow-md)] animate-slideIn">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FaBell size={12} className="text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[var(--text-primary)]">
              Room Invitation
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              <span className="font-medium">
                {notification.data.senderName as string}
              </span>{" "}
              invited you to{" "}
              <span className="text-[var(--accent)] font-medium">
                {notification.data.roomTitle as string}
              </span>
            </p>
            <div className="flex gap-1.5 mt-2">
              <button
                type="button"
                onClick={handleAccept}
                disabled={responding}
                className="px-2.5 py-1 bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-[10px] font-medium rounded-md hover:bg-[var(--accent-green)]/15 transition-colors disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={handleDecline}
                disabled={responding}
                className="px-2.5 py-1 bg-[var(--accent-coral)]/10 text-[var(--accent-coral)] text-[10px] font-medium rounded-md hover:bg-[var(--accent-coral)]/15 transition-colors disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <FaTimes size={10} />
          </button>
        </div>
      </div>
    );
  }

  if (notification.type === "follow") {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 shadow-[var(--shadow-md)] animate-slideIn">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FaUserPlus size={12} className="text-[var(--accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-[var(--text-primary)]">
              New Follower
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              <span className="font-medium">
                {notification.data.followerName as string}
              </span>{" "}
              started following you
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <FaTimes size={10} />
          </button>
        </div>
      </div>
    );
  }

  // Message notification
  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 shadow-[var(--shadow-md)] animate-slideIn cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
      onClick={() => onJoinRoom(notification.data.roomId as string)}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-md bg-[var(--accent)]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <FaComments size={12} className="text-[var(--accent)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium text-[var(--text-primary)]">
            New Message
            {((notification.data.count as number) || 1) > 1 &&
              ` (${notification.data.count})`}
          </p>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            {notification.data.senderName as string} in{" "}
            <span className="text-[var(--accent)] font-medium">
              {notification.data.roomTitle as string}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          <FaTimes size={10} />
        </button>
      </div>
    </div>
  );
}
