"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { profileAPI } from "@/lib/api-client";
import { ROOM_TYPE_FEATURES, type RoomType } from "@/lib/room-types";
import { LEVEL_THRESHOLDS } from "@/lib/level-thresholds";
import { DynamicIcon, FaStar, FaClock } from "@/components/Icons";

export default function ProfileTab({
  user,
  token,
  friendsPanelOpen,
}: {
  user: Record<string, unknown>;
  token: string;
  friendsPanelOpen: boolean;
}) {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ displayName: "", bio: "" });
  const [saving, setSaving] = useState(false);
  const [activityLogs, setActivityLogs] = useState<Record<string, unknown>[]>(
    [],
  );
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [data, logData] = await Promise.all([
          profileAPI.get(token),
          profileAPI.roomLog(token),
        ]);
        setProfile(data);
        setEditForm({
          displayName: (data.displayName as string) || "",
          bio: (data.bio as string) || "",
        });
        setActivityLogs(logData.logs);
      } catch {
        /* ignore */
      } finally {
        setLogsLoading(false);
      }
    };
    load();
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await profileAPI.update(token, editForm);
      await refreshUser();
      setEditing(false);
      const data = await profileAPI.get(token);
      setProfile(data);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);
    try {
      await profileAPI.uploadAvatar(token, formData);
      await refreshUser();
      const data = await profileAPI.get(token);
      setProfile(data);
    } catch {
      /* ignore */
    }
  };

  if (!profile) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const p = (profile.profile || {}) as Record<string, unknown>;
  const achievements = (profile.achievements || []) as Array<
    Record<string, unknown>
  >;
  const level = (p.level as number) || 1;
  const xp = (p.xp as number) || 0;

  const currentLevelXP = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextLevelXP = LEVEL_THRESHOLDS[level] || currentLevelXP * 2;
  const progress =
    ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  // ─── Activity Log Panel ───
  const activityLogPanel = (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 flex flex-col h-full">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2 flex-shrink-0">
        <FaClock className="text-[var(--accent)]" size={13} /> Room History
      </h3>
      {logsLoading ? (
        <div className="flex justify-center py-8 flex-1">
          <div className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activityLogs.length === 0 ? (
        <p className="text-[var(--text-muted)] text-[13px] text-center py-6 flex-1">
          No room activity yet
        </p>
      ) : (
        <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0">
          {activityLogs.map((log) => {
            const feat = ROOM_TYPE_FEATURES[log.roomType as string as RoomType];
            const dur = log.leftAt
              ? (log.duration as number) || 0
              : Math.floor(
                  (Date.now() - new Date(log.joinedAt as string).getTime()) /
                    1000,
                );
            const durStr =
              dur >= 3600
                ? `${Math.floor(dur / 3600)}h ${Math.floor((dur % 3600) / 60)}m`
                : dur >= 60
                  ? `${Math.floor(dur / 60)}m ${dur % 60}s`
                  : `${dur}s`;
            return (
              <div
                key={log.id as string}
                className="flex items-center gap-2.5 p-2 rounded-md bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{
                    background: feat ? `${feat.color}14` : "var(--bg-hover)",
                  }}
                >
                  <DynamicIcon
                    name={feat?.icon || "FaComments"}
                    size={12}
                    style={{ color: feat?.color || "var(--text-muted)" }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                      {log.roomTitle as string}
                    </p>
                    <span
                      className="text-[10px] font-semibold uppercase px-1 py-0.5 rounded flex-shrink-0"
                      style={{
                        color:
                          log.role === "host"
                            ? "var(--accent-amber)"
                            : "var(--accent)",
                        background:
                          log.role === "host"
                            ? "color-mix(in srgb, var(--accent-amber) 15%, transparent)"
                            : "color-mix(in srgb, var(--accent) 15%, transparent)",
                      }}
                    >
                      {log.role as string}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] flex-wrap">
                    <span className="capitalize">{log.roomType as string}</span>
                    {typeof log.roomTag === "string" && (
                      <>
                        <span>·</span>
                        <span>#{log.roomTag}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>
                      {new Date(log.joinedAt as string).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span>·</span>
                    <span>{durStr}</span>
                    {!log.leftAt && (
                      <>
                        <span>·</span>
                        <span className="text-[var(--accent-green)]">
                          Active
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 sm:p-6">
      <div
        className={`${friendsPanelOpen ? "flex flex-col gap-4" : "flex flex-col md:flex-row gap-4"}`}
      >
        {/* ─── Profile Section (left / top) ─── */}
        <div
          className={`${friendsPanelOpen ? "w-full" : "w-full md:flex-1 md:min-w-0"}`}
        >
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 mb-4">
            <div className="flex items-start gap-4">
              <div className="relative group">
                <div className="w-14 h-14 rounded-lg bg-[var(--avatar-bg)] flex items-center justify-center overflow-hidden">
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
                <label className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <span className="text-[10px] text-white">Change</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                </label>
              </div>

              <div className="flex-1">
                {editing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editForm.displayName}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          displayName: e.target.value,
                        }))
                      }
                      className="w-full input-base px-3 py-[7px] text-sm"
                    />
                    <textarea
                      value={editForm.bio}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, bio: e.target.value }))
                      }
                      rows={2}
                      className="w-full input-base px-3 py-[7px] text-sm resize-none"
                      placeholder="Write your bio..."
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-1 btn-primary text-[12px]"
                      >
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="px-3 py-1 text-[var(--text-secondary)] text-[12px] rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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
                      {(profile.bio as string) || "No bio yet"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="text-[12px] text-[var(--accent)] hover:underline"
                    >
                      Edit profile
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-1">
                <span>Level {level}</span>
                <span>
                  {xp} / {nextLevelXP} XP
                </span>
              </div>
              <div className="h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          </div>

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

          <div className="flex gap-2 mb-4">
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 flex-1 text-center">
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {(profile.followersCount as number) || 0}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">Followers</p>
            </div>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 flex-1 text-center">
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {(profile.followingCount as number) || 0}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">Following</p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <FaStar className="text-[var(--accent-amber)]" size={13} />{" "}
              Achievements
            </h3>
            {achievements.length === 0 ? (
              <p className="text-[var(--text-muted)] text-[13px]">
                No achievements yet. Start chatting!
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {achievements.map((ach) => (
                  <div
                    key={ach.key as string}
                    className="bg-[var(--bg-elevated)] rounded-md p-2.5 flex items-center gap-2"
                  >
                    <div className="w-7 h-7 rounded-md bg-[var(--accent-amber)]/8 flex items-center justify-center flex-shrink-0">
                      <DynamicIcon
                        name={ach.icon as string}
                        size={13}
                        className="text-[var(--accent-amber)]"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                        {ach.name as string}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">
                        {ach.description as string}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* ─── History Section (right / bottom) ─── */}
        <div
          className={`${friendsPanelOpen ? "w-full" : "w-full md:w-[380px] md:flex-shrink-0"}`}
        >
          {activityLogPanel}
        </div>
      </div>
    </div>
  );
}
