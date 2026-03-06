"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { roomAPI, profileAPI } from "@/lib/api-client";
import { FaTimes, FaCopy } from "@/components/Icons";

interface InviteModalProps {
  room: Record<string, unknown>;
  onClose: () => void;
  onCopyLink: () => void;
}

export default function InviteModal({
  room,
  onClose,
  onCopyLink,
}: InviteModalProps) {
  const { token, user: currentUser } = useAuth();
  const { emitInviteNotification } = useSocket();
  const [friends, setFriends] = useState<Record<string, unknown>[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/room/join/${room.inviteCode}`;

  useEffect(() => {
    if (!token) return;
    const loadFriends = async () => {
      try {
        const { friends: f } = await profileAPI.friends(token);
        setFriends(f);
      } catch {
        /* ignore */
      }
    };
    loadFriends();
  }, [token]);

  const handleInvite = async (friendId: string) => {
    if (!token) return;
    setInviting(friendId);
    try {
      const result = await roomAPI.invite(token, room.id as string, friendId);
      const friend = friends.find((f) => f.id === friendId);
      emitInviteNotification(friendId, {
        inviteId: result.invite.id,
        roomId: room.id,
        roomTitle: room.title,
        senderName: currentUser?.displayName,
        senderId: currentUser?.id,
        friendName: (friend?.displayName as string) || "",
      });
    } catch {
      /* ignore */
    }
    setInviting(null);
  };

  const handleCopy = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Invite People
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
          >
            <FaTimes className="text-[var(--text-muted)]" size={13} />
          </button>
        </div>

        {/* Link Copy */}
        <div className="mb-3 p-2.5 bg-[var(--bg-elevated)] rounded-md">
          <p className="text-[11px] text-[var(--text-muted)] mb-1.5">
            Share invite link:
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 bg-transparent text-[13px] text-[var(--text-secondary)] truncate outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md transition-colors"
            >
              {copied ? (
                <span className="text-[11px] text-white px-1">Copied!</span>
              ) : (
                <FaCopy className="text-white" size={12} />
              )}
            </button>
          </div>
        </div>

        {/* Friends List */}
        <p className="text-[11px] text-[var(--text-muted)] mb-2">
          Or invite a friend directly:
        </p>
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {friends.map((f) => (
            <div
              key={f.id as string}
              className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center overflow-hidden">
                {f.avatarUrl ? (
                  <img
                    src={f.avatarUrl as string}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[10px] font-semibold text-white">
                    {(f.displayName as string)?.[0]}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-[12px] text-[var(--text-primary)]">
                  {f.displayName as string}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  @{f.username as string}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleInvite(f.id as string)}
                disabled={inviting === f.id}
                className="px-2.5 py-1 text-[11px] bg-[var(--accent)]/12 text-[var(--accent)] rounded-md hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-50"
              >
                {inviting === f.id ? "..." : "Invite"}
              </button>
            </div>
          ))}
          {friends.length === 0 && (
            <p className="text-center text-[var(--text-muted)] text-[13px] py-4">
              No mutual friends yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
