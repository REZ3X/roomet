"use client";

import { useState, useEffect, useCallback } from "react";
import { roomAPI } from "@/lib/api-client";
import { ROOM_TYPE_FEATURES, type RoomType } from "@/lib/room-types";
import {
  DynamicIcon,
  FaSearch,
  FaLock,
  FaGlobe,
  FaUsers,
  FaCrown,
  FaComments,
  FaClock,
} from "@/components/Icons";

// ─── Room Timer Helper ───

function RoomTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  return (
    <span className="flex items-center gap-1 text-[10px] text-[var(--accent-green)]">
      <FaClock size={8} />
      {elapsed}
    </span>
  );
}

// ─── Rooms Tab ───

export default function RoomsTab({
  token,
  onJoinRoom,
}: {
  token: string;
  onJoinRoom: (id: string) => void;
}) {
  const [subTab, setSubTab] = useState<"mine" | "browse">("mine");
  const [rooms, setRooms] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [joinPassword, setJoinPassword] = useState("");
  const [joiningRoom, setJoiningRoom] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      const data =
        subTab === "mine"
          ? await roomAPI.myRooms(token, { search, type: filterType })
          : await roomAPI.list(token, { search, type: filterType });
      setRooms(data.rooms);
    } catch {
      /* ignore */
    } finally {
      setLoadingRooms(false);
    }
  }, [token, search, filterType, subTab]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleJoin = async (roomId: string, isLocked: boolean) => {
    if (isLocked) {
      setJoiningRoom(roomId);
      return;
    }
    try {
      await roomAPI.join(token, roomId);
      onJoinRoom(roomId);
    } catch (error) {
      console.error("Join failed:", error);
    }
  };

  const handleResume = (roomId: string) => {
    onJoinRoom(roomId);
  };

  const handleJoinWithPassword = async () => {
    if (!joiningRoom) return;
    try {
      await roomAPI.join(token, joiningRoom, joinPassword);
      onJoinRoom(joiningRoom);
    } catch (error) {
      console.error("Join failed:", error);
    }
    setJoiningRoom(null);
    setJoinPassword("");
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Rooms
        </h2>
        <p className="text-[var(--text-muted)] text-[13px]">
          {subTab === "mine"
            ? "Your active rooms"
            : "Find a room and start chatting"}
        </p>
      </div>

      {/* Sub-tabs: My Rooms | Browse */}
      <div className="flex items-center gap-0 mb-4 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => {
            setSubTab("mine");
            setSearch("");
            setFilterType("");
          }}
          className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
            subTab === "mine"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          My Rooms
        </button>
        <button
          type="button"
          onClick={() => {
            setSubTab("browse");
            setSearch("");
            setFilterType("");
          }}
          className={`px-3 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
            subTab === "browse"
              ? "border-[var(--accent)] text-[var(--text-primary)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          Browse
        </button>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <FaSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            size={12}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              subTab === "mine" ? "Search your rooms..." : "Search rooms..."
            }
            className="w-full pl-8 pr-3 py-[7px] input-base text-sm"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterType("")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${!filterType ? "bg-[var(--bg-hover)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"}`}
          >
            All
          </button>
          {Object.entries(ROOM_TYPE_FEATURES).map(([type, feat]) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(filterType === type ? "" : type)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${filterType === type ? "bg-[var(--bg-hover)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-secondary)]"}`}
            >
              <DynamicIcon name={feat.icon} size={10} />
              <span className="capitalize">{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Room list */}
      {loadingRooms ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16">
          {subTab === "mine" ? (
            <div>
              <FaComments
                size={28}
                className="mx-auto text-[var(--text-muted)] opacity-40 mb-3"
              />
              <p className="text-[var(--text-muted)] text-sm mb-1">
                No active rooms
              </p>
              <p className="text-[var(--text-muted)] text-xs opacity-70">
                Join or create a room to see it here
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubTab("browse");
                  setSearch("");
                  setFilterType("");
                }}
                className="mt-4 px-4 py-1.5 btn-primary text-sm"
              >
                Browse Rooms
              </button>
            </div>
          ) : (
            <p className="text-[var(--text-muted)] text-sm">
              No rooms found. Create one!
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => {
            const feat = (room.features || {}) as Record<string, unknown>;
            const isMyRoom = subTab === "mine";
            const canResume = isMyRoom || (room.isParticipant as boolean);
            return (
              <div
                key={room.id as string}
                className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3.5 hover:bg-[var(--bg-hover)] transition-colors group ${canResume ? "cursor-pointer" : "cursor-default"}`}
                onClick={
                  canResume ? () => handleResume(room.id as string) : undefined
                }
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: `${feat.color}14` }}
                    >
                      <DynamicIcon
                        name={feat.icon as string}
                        size={13}
                        className=""
                        style={{ color: feat.color as string }}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium text-[var(--text-primary)] text-sm leading-tight">
                        {room.title as string}
                      </h3>
                      <span
                        className="text-[11px]"
                        style={{ color: feat.color as string }}
                      >
                        {room.type as string}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {isMyRoom && (room.isHost as boolean) && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-[var(--accent-amber)] bg-[var(--accent-amber)]/10 px-1.5 py-0.5 rounded">
                        Host
                      </span>
                    )}
                    {room.isLocked ? (
                      <FaLock
                        size={10}
                        className="text-[var(--accent-amber)]"
                      />
                    ) : (
                      <FaGlobe
                        size={10}
                        className="text-[var(--accent-green)]"
                      />
                    )}
                  </div>
                </div>

                {room.tag ? (
                  <span className="inline-block px-1.5 py-0.5 bg-[var(--bg-elevated)] rounded text-[11px] text-[var(--text-muted)] mb-2">
                    #{String(room.tag)}
                  </span>
                ) : null}

                {/* Active duration */}
                {typeof room.createdAt === "string" && (
                  <div className="mb-2">
                    <RoomTimer createdAt={room.createdAt} />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <FaCrown
                        size={9}
                        className="text-[var(--accent-amber)]"
                      />
                      {
                        (room.host as Record<string, unknown>)
                          ?.displayName as string
                      }
                    </span>
                    <span className="flex items-center gap-1">
                      <FaUsers size={9} />
                      {room.participantCount as number}/
                      {room.maxMembers as number}
                    </span>
                  </div>
                  {canResume ? (
                    <span className="px-2.5 py-1 bg-[var(--accent-green)]/10 text-[var(--accent-green)] text-[11px] font-medium rounded-md group-hover:bg-[var(--accent-green)] group-hover:text-white transition-colors">
                      Resume
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        handleJoin(room.id as string, room.isLocked as boolean)
                      }
                      className="px-2.5 py-1 bg-[var(--accent)] text-white text-[11px] font-medium rounded-md hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {joiningRoom && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-5 w-full max-w-sm shadow-[var(--shadow-md)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1.5 flex items-center gap-2">
              <FaLock className="text-[var(--accent-amber)]" size={12} /> Room
              Password
            </h3>
            <p className="text-[13px] text-[var(--text-muted)] mb-3">
              This room requires a password.
            </p>
            <input
              type="password"
              value={joinPassword}
              onChange={(e) => setJoinPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full input-base px-3 py-[9px] text-sm mb-3"
              onKeyDown={(e) => e.key === "Enter" && handleJoinWithPassword()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleJoinWithPassword}
                className="flex-1 py-[7px] btn-primary text-sm"
              >
                Join
              </button>
              <button
                type="button"
                onClick={() => {
                  setJoiningRoom(null);
                  setJoinPassword("");
                }}
                className="px-4 py-[7px] text-[var(--text-secondary)] text-sm rounded-md hover:bg-[var(--bg-hover)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
