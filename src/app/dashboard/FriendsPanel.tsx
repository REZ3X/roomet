"use client";

import { useState, useEffect } from "react";
import { profileAPI } from "@/lib/api-client";
import { FaSearch, FaUsers, FaTimes } from "@/components/Icons";
import Link from "next/link";

export default function FriendsPanel({
  token,
  onClose,
}: {
  token: string;
  onClose: () => void;
}) {
  const [friends, setFriends] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await profileAPI.friends(token);
        if (!cancelled) setFriends(res.friends ?? []);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const filtered = friends.filter((f) => {
    const q = search.toLowerCase();
    return (
      ((f.displayName as string) ?? "").toLowerCase().includes(q) ||
      ((f.username as string) ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <aside className="w-[280px] sm:w-56 h-full flex-shrink-0 border-l border-[var(--border)] bg-[var(--bg-sidebar)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
        <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Friends
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          title="Close friends"
        >
          <FaTimes size={11} />
        </button>
      </div>

      {/* Search */}
      {friends.length > 5 && (
        <div className="px-3 py-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md px-2 py-1">
            <FaSearch
              size={10}
              className="text-[var(--text-muted)] flex-shrink-0"
            />
            <input
              type="text"
              placeholder="Filter…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none w-full"
            />
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto px-1.5 py-1.5">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-2">
            <FaUsers
              size={20}
              className="text-[var(--text-muted)] opacity-40 mb-2"
            />
            <p className="text-[12px] text-[var(--text-muted)]">
              {search ? "No matches" : "No friends yet"}
            </p>
            {!search && (
              <p className="text-[11px] text-[var(--text-muted)] opacity-60 mt-1 text-center">
                Follow someone who follows you back
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((f) => (
              <Link
                key={f.id as string}
                href={`/profile/${f.username as string}`}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors group"
              >
                <div className="w-6 h-6 rounded-full bg-[var(--avatar-bg)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {f.avatarUrl ? (
                    <img
                      src={f.avatarUrl as string}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-[10px] font-medium text-[var(--text-muted)]">
                      {(
                        (f.displayName as string) ??
                        (f.username as string) ??
                        "?"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-tight">
                    {(f.displayName as string) || (f.username as string)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] truncate leading-tight">
                    @{f.username as string}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer count */}
      {!loading && friends.length > 0 && (
        <div className="px-3 py-2 border-t border-[var(--border)]">
          <p className="text-[10px] text-[var(--text-muted)] text-center">
            {friends.length} friend{friends.length !== 1 && "s"}
          </p>
        </div>
      )}
    </aside>
  );
}
