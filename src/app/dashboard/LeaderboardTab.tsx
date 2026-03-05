"use client";

import { useState, useEffect, useCallback } from "react";
import { leaderboardAPI } from "@/lib/api-client";
import { DynamicIcon, FaSearch } from "@/components/Icons";
import Link from "next/link";

export default function LeaderboardTab() {
  const [entries, setEntries] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("xp");
  const [search, setSearch] = useState("");

  const sortOptions = [
    { key: "xp", label: "XP" },
    { key: "level", label: "Level" },
    { key: "messages", label: "Messages" },
    { key: "rooms_hosted", label: "Hosted" },
    { key: "rooms_joined", label: "Joined" },
    { key: "time", label: "Time" },
    { key: "followers", label: "Followers" },
  ];

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await leaderboardAPI.get({
        sort,
        search: search || undefined,
      });
      setEntries(data.leaderboard);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [sort, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getSortValue = (entry: Record<string, unknown>) => {
    switch (sort) {
      case "messages":
        return entry.totalMessages as number;
      case "rooms_hosted":
        return entry.totalRoomsHosted as number;
      case "rooms_joined":
        return entry.totalRoomsJoined as number;
      case "time":
        return formatTime((entry.totalTimeInRooms as number) || 0);
      case "followers":
        return entry.followersCount as number;
      case "level":
        return entry.level as number;
      default:
        return entry.xp as number;
    }
  };

  const rankColor = (rank: number) => {
    if (rank === 1) return "#eab308";
    if (rank === 2) return "#94a3b8";
    if (rank === 3) return "#cd7f32";
    return "#6b7280";
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          Leaderboard
        </h2>
        <p className="text-[var(--text-muted)] text-[13px]">
          Top users by progression
        </p>
      </div>

      <div className="relative mb-3">
        <FaSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          size={12}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full pl-8 pr-3 py-[7px] input-base text-sm"
        />
      </div>

      <div className="flex gap-1 flex-wrap mb-4">
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSort(opt.key)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${sort === opt.key ? "bg-[var(--bg-hover)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--text-muted)] text-sm">No users found</p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => {
            const rank = entry.rank as number;
            const achievements = (entry.recentAchievements || []) as Array<
              Record<string, unknown>
            >;
            return (
              <Link
                key={entry.userId as string}
                href={`/profile/${entry.username}`}
                className="flex items-center gap-3 rounded-md p-2.5 hover:bg-[var(--bg-hover)] transition-colors group"
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                  style={{
                    background:
                      rank <= 3 ? `${rankColor(rank)}14` : "var(--bg-elevated)",
                    color: rankColor(rank),
                  }}
                >
                  {rank}
                </div>
                <div className="w-7 h-7 rounded-full bg-[var(--avatar-bg)] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl as string}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-[11px] font-semibold text-white">
                      {(entry.displayName as string)?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                      {entry.displayName as string}
                    </p>
                    <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded flex items-center gap-0.5 flex-shrink-0">
                      Lv.{entry.level as number}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    @{entry.username as string}
                  </p>
                </div>
                {achievements.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                    {achievements.slice(0, 3).map((ach) => (
                      <div
                        key={ach.key as string}
                        className="w-5 h-5 rounded bg-[var(--accent-amber)]/8 flex items-center justify-center"
                        title={ach.name as string}
                      >
                        <DynamicIcon
                          name={ach.icon as string}
                          size={10}
                          className="text-[var(--accent-amber)]"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-right flex-shrink-0">
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {getSortValue(entry)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {sortOptions.find((o) => o.key === sort)?.label}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
