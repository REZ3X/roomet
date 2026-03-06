"use client";

import {
  FaUsers,
  FaTimes,
  FaUserPlus,
  FaSearch,
  FaCrown,
  FaDoorOpen,
  FaPowerOff,
} from "@/components/Icons";

interface ParticipantsSidebarProps {
  showSidebar: boolean;
  onClose: () => void;
  participants: Array<Record<string, unknown>>;
  roomData: Record<string, unknown>;
  userId: string | undefined;

  showInviteFriends: boolean;
  onToggleInviteFriends: () => void;
  sidebarFriends: Record<string, unknown>[];
  sidebarFriendsLoading: boolean;
  friendSearch: string;
  onFriendSearchChange: (value: string) => void;
  invitedIds: Set<string>;
  onInviteFriend: (friendId: string) => void;

  onLeave: () => void;
  onEndRoom: () => void;
}

export default function ParticipantsSidebar({
  showSidebar,
  onClose,
  participants,
  roomData,
  userId,
  showInviteFriends,
  onToggleInviteFriends,
  sidebarFriends,
  sidebarFriendsLoading,
  friendSearch,
  onFriendSearchChange,
  invitedIds,
  onInviteFriend,
  onLeave,
  onEndRoom,
}: ParticipantsSidebarProps) {
  if (!showSidebar) return null;

  const hostId = (roomData.host as Record<string, unknown>)?.id;

  const filtered = sidebarFriends.filter((f) => {
    const q = friendSearch.toLowerCase();
    return (
      ((f.displayName as string) ?? "").toLowerCase().includes(q) ||
      ((f.username as string) ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full z-50 md:relative md:z-auto w-[280px] sm:w-64 border-l border-[var(--border)] bg-[var(--bg-sidebar)] flex flex-col overflow-hidden shadow-[var(--shadow-lg)] md:shadow-none animate-slide-in-right md:animate-none">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
          <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <FaUsers size={11} /> Participants ({participants.length})
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <FaTimes size={11} />
          </button>
        </div>

        {/* Invite Friends Toggle */}
        <div className="px-2 py-2 border-b border-[var(--border)]">
          <button
            type="button"
            onClick={onToggleInviteFriends}
            className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
              showInviteFriends
                ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <FaUserPlus size={11} />
            Invite Friends
          </button>
        </div>

        {/* Inline Friend Invite Panel */}
        {showInviteFriends && (
          <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] max-h-52 flex flex-col">
            <div className="px-2 py-1.5">
              <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md px-2 py-1">
                <FaSearch
                  size={10}
                  className="text-[var(--text-muted)] flex-shrink-0"
                />
                <input
                  type="text"
                  placeholder="Search friends…"
                  value={friendSearch}
                  onChange={(e) => onFriendSearchChange(e.target.value)}
                  className="bg-transparent text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none w-full"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-1.5 pb-1.5">
              {sidebarFriendsLoading ? (
                <div className="flex justify-center py-3">
                  <div className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-[11px] text-[var(--text-muted)] text-center py-3">
                  {friendSearch
                    ? "No matching friends"
                    : "No friends to invite"}
                </p>
              ) : (
                filtered.map((f) => {
                  const fId = f.id as string;
                  const isAlreadyIn = participants.some((p) => p.id === fId);
                  const isInvited = invitedIds.has(fId);
                  return (
                    <div
                      key={fId}
                      className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                    >
                      <div className="w-5 h-5 rounded-full bg-[var(--avatar-bg)] flex items-center justify-center overflow-hidden flex-shrink-0">
                        {f.avatarUrl ? (
                          <img
                            src={f.avatarUrl as string}
                            alt=""
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="text-[8px] font-medium text-[var(--text-muted)]">
                            {((f.displayName as string) ??
                              "?")[0]?.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="flex-1 text-[11px] text-[var(--text-primary)] truncate">
                        {f.displayName as string}
                      </span>
                      {isAlreadyIn ? (
                        <span className="text-[10px] text-[var(--text-muted)]">
                          In room
                        </span>
                      ) : isInvited ? (
                        <span className="text-[10px] text-[var(--accent-green)]">
                          Sent ✓
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onInviteFriend(fId)}
                          className="px-2 py-0.5 text-[10px] bg-[var(--accent)]/12 text-[var(--accent)] rounded hover:bg-[var(--accent)]/20 transition-colors"
                        >
                          Invite
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Participant List */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="space-y-0.5">
            {participants.map((p) => (
              <div
                key={p.id as string}
                className="flex items-center gap-2 p-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center overflow-hidden">
                  {p.avatarUrl ? (
                    <img
                      src={p.avatarUrl as string}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-[10px] font-semibold text-white">
                      {(p.displayName as string)?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-[var(--text-primary)] truncate flex items-center gap-1">
                    {p.displayName as string}
                    {p.id === hostId && (
                      <FaCrown
                        size={9}
                        className="text-[var(--accent-amber)]"
                      />
                    )}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    @{p.username as string}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Room Actions */}
        <div className="px-2 py-2 border-t border-[var(--border)] space-y-1">
          <button
            type="button"
            onClick={onLeave}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--accent-coral)]/8 hover:text-[var(--accent-coral)] transition-colors"
          >
            <FaDoorOpen size={12} />
            Leave Room
          </button>
          {hostId === userId && (
            <button
              type="button"
              onClick={onEndRoom}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--accent-coral)] hover:bg-[var(--accent-coral)]/10 transition-colors"
            >
              <FaPowerOff size={11} />
              End Room
            </button>
          )}
        </div>
      </div>
    </>
  );
}
