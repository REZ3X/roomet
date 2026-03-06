"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { profileAPI } from "@/lib/api-client";
import { LEVEL_THRESHOLDS } from "@/lib/level-thresholds";
import {
  DynamicIcon,
  FaStar,
  FaUserPlus,
  FaUserMinus,
  FaArrowLeft,
} from "@/components/Icons";

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const { user, token, loading: authLoading } = useAuth();
  const { emitFollowNotification } = useSocket();
  const router = useRouter();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login");
      return;
    }
    if (!token || !username) return;

    const load = async () => {
      try {
        const data = await profileAPI.getUser(token, username);
        setProfile(data);
        setIsFollowing(Boolean(data.isFollowing));
      } catch {
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, username, authLoading, user, router]);

  const handleFollow = async () => {
    if (!token || !profile) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await profileAPI.unfollow(token, username);
        setIsFollowing(false);
        setProfile((p) =>
          p
            ? {
                ...p,
                followersCount: Math.max(
                  0,
                  ((p.followersCount as number) || 0) - 1,
                ),
              }
            : p,
        );
      } else {
        await profileAPI.follow(token, username);
        setIsFollowing(true);
        setProfile((p) =>
          p
            ? { ...p, followersCount: ((p.followersCount as number) || 0) + 1 }
            : p,
        );

        if (profile.id && user) {
          emitFollowNotification({
            targetUserId: profile.id as string,
            followerName: user.displayName,
            followerUsername: user.username,
            followerAvatar: user.avatarUrl,
          });
        }
      }
    } catch {
      /* ignore */
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  const p = (profile.profile || {}) as Record<string, unknown>;
  const achievements = (profile.achievements || []) as Array<
    Record<string, unknown>
  >;
  const level = (p.level as number) || 1;
  const xp = (p.xp as number) || 0;
  const isOwnProfile = user && (user.username as string) === username;

  const currentLevelXP = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelXP = LEVEL_THRESHOLDS[level] || currentLevelXP * 2;
  const progress =
    ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[13px] mb-5 transition-colors"
        >
          <FaArrowLeft size={12} /> Back
        </button>

        {/* Profile Header */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-lg bg-[var(--accent)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl as string}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-lg font-semibold text-white">
                  {(profile.displayName as string)?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  {profile.displayName as string}
                </h2>
                <span className="px-1.5 py-0.5 bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-[11px] font-medium rounded">
                  Lv. {level}
                </span>
              </div>
              <p className="text-[var(--text-muted)] text-[13px] mb-0.5">
                @{profile.username as string}
              </p>
              <p className="text-[var(--text-secondary)] text-[13px] mb-2">
                {(profile.bio as string) || "No bio"}
              </p>
              {!isOwnProfile && (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`px-3 py-1 text-[12px] font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                    isFollowing
                      ? "bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:bg-[var(--accent-coral)]/10 hover:text-[var(--accent-coral)]"
                      : "btn-primary"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <FaUserMinus size={10} /> Unfollow
                    </>
                  ) : (
                    <>
                      <FaUserPlus size={10} /> Follow
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-1">
              <span>Level {level}</span>
              <span>{xp} XP</span>
            </div>
            <div className="h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Social Stats */}
        <div className="flex gap-2 mb-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 flex-1 text-center">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {(profile.followersCount as number) || 0}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Followers</p>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 flex-1 text-center">
            <p className="text-base font-semibold text-[var(--text-primary)]">
              {(profile.followingCount as number) || 0}
            </p>
            <p className="text-xs text-[var(--text-muted)]">Following</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[
            {
              label: "Messages",
              value: (p.totalMessages as number) || 0,
              icon: "FaComments",
              color: "var(--accent)",
            },
            {
              label: "Rooms Joined",
              value: (p.totalRoomsJoined as number) || 0,
              icon: "FaDoorOpen",
              color: "var(--accent-green)",
            },
            {
              label: "Rooms Hosted",
              value: (p.totalRoomsHosted as number) || 0,
              icon: "FaCrown",
              color: "var(--accent-amber)",
            },
            {
              label: "Time in Rooms",
              value: formatTime((p.totalTimeInRooms as number) || 0),
              icon: "FaClock",
              color: "var(--accent-coral)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3"
            >
              <DynamicIcon
                name={stat.icon}
                size={14}
                className="mb-1"
                style={{ color: stat.color }}
              />
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {stat.value}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <FaStar className="text-[var(--accent-amber)]" size={13} />{" "}
              Achievements
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {achievements.map((ach) => (
                <div
                  key={ach.key as string}
                  className="bg-[var(--bg-elevated)] rounded-md p-2.5 flex items-center gap-2"
                >
                  <div className="w-8 h-8 rounded-md bg-[var(--accent-amber)]/10 flex items-center justify-center flex-shrink-0">
                    <DynamicIcon
                      name={ach.icon as string}
                      size={14}
                      className="text-[var(--accent-amber)]"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                      {ach.name as string}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] truncate">
                      {ach.description as string}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
