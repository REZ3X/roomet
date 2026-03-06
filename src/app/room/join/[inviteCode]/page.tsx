"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { roomAPI } from "@/lib/api-client";
import {
  FaComments,
  FaArrowRight,
  FaLock,
  FaSignInAlt,
} from "@/components/Icons";

export default function JoinByInvitePage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [room, setRoom] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?redirect=/room/join/${inviteCode}`);
      return;
    }
    if (!token) return;

    const load = async () => {
      try {
        const data = await roomAPI.getByInviteCode(token, inviteCode);
        if (data.room) {
          setRoom(data.room);
          if (data.room.isLocked) {
            setNeedsPassword(true);
          } else {
            try {
              await roomAPI.join(token, data.room.id as string);
              router.push(`/room/${data.room.id}`);
            } catch (joinErr: unknown) {
              router.push(`/room/${data.room.id}`);
            }
          }
        }
      } catch (err: unknown) {
        setError((err as Error).message || "Invalid invite link");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, inviteCode, authLoading, user, router]);

  const handleJoinWithPassword = async () => {
    if (!token || !room) return;
    setJoining(true);
    setError("");
    try {
      await roomAPI.join(token, room.id as string, password);
      router.push(`/room/${room.id}`);
    } catch (err: unknown) {
      setError((err as Error).message || "Wrong password");
    } finally {
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 w-full max-w-sm text-center">
        <div className="w-10 h-10 rounded-lg bg-[var(--accent)] flex items-center justify-center mx-auto mb-3">
          <FaComments size={16} className="text-white" />
        </div>

        {error && !needsPassword ? (
          <>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
              Oops!
            </h2>
            <p className="text-[var(--text-secondary)] text-[13px] mb-5">
              {error}
            </p>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-5 py-2 btn-primary font-medium rounded-md text-[13px] flex items-center gap-2 mx-auto"
            >
              Go to Dashboard <FaArrowRight size={11} />
            </button>
          </>
        ) : needsPassword ? (
          <>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1.5">
              <FaLock
                className="inline text-[var(--accent-amber)] mr-1.5"
                size={13}
              />
              Password Required
            </h2>
            <p className="text-[var(--text-secondary)] text-[13px] mb-4">
              {room
                ? `"${room.title as string}" requires a password.`
                : "This room requires a password."}
            </p>
            {error && (
              <p className="text-[var(--accent-coral)] text-[13px] mb-2">
                {error}
              </p>
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter room password"
              className="w-full input-base px-3 py-2 text-[13px] mb-3"
              onKeyDown={(e) => e.key === "Enter" && handleJoinWithPassword()}
              autoFocus
            />
            <button
              type="button"
              onClick={handleJoinWithPassword}
              disabled={joining}
              className="w-full py-2 btn-primary font-medium rounded-md text-[13px] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {joining ? (
                "Joining..."
              ) : (
                <>
                  <FaSignInAlt size={12} /> Join Room
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">
              Joining Room...
            </h2>
            <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin mx-auto" />
          </>
        )}
      </div>
    </div>
  );
}
