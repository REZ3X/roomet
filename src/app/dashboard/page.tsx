"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  roomAPI,
  invitesAPI,
  profileAPI,
  leaderboardAPI,
} from "@/lib/api-client";
import { ROOM_TYPE_FEATURES, type RoomType } from "@/lib/room-types";
import { LEVEL_THRESHOLDS } from "@/lib/level-thresholds";
import {
  DynamicIcon,
  FaSearch,
  FaPlus,
  FaSignOutAlt,
  FaBell,
  FaHome,
  FaLock,
  FaGlobe,
  FaUsers,
  FaCrown,
  FaGamepad,
  FaTimes,
  FaComments,
  FaBolt,
  FaStar,
  FaTrophy,
  FaClock,
  FaBars,
  FaUserPlus,
} from "@/components/Icons";
import ThemeToggle from "@/components/ThemeToggle";
import { useSocket } from "@/context/SocketContext";
import Link from "next/link";

const STORAGE_KEY_TAB = "roomet_active_tab";

type Tab = "rooms" | "create" | "invites" | "profile" | "leaderboard";

interface DashNotification {
  id: string;
  type: "invite" | "message" | "follow";
  data: Record<string, unknown>;
  timestamp: number;
  read: boolean;
}

export default function DashboardPage() {
  const { user, token, loading, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY_TAB) as Tab | null;
      if (
        saved &&
        ["rooms", "create", "invites", "profile", "leaderboard"].includes(saved)
      ) {
        return saved;
      }
    }
    return "rooms";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [friendsPanelOpen, setFriendsPanelOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { socket } = useSocket();

  // â”€â”€â”€ Notification State â”€â”€â”€
  const [notifications, setNotifications] = useState<DashNotification[]>([]);
  const [toasts, setToasts] = useState<DashNotification[]>([]);
  const [inviteRefreshCounter, setInviteRefreshCounter] = useState(0);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket) return;

    const handleInviteReceived = (invite: Record<string, unknown>) => {
      const notif: DashNotification = {
        id: `inv-${Date.now()}-${Math.random()}`,
        type: "invite",
        data: invite,
        timestamp: Date.now(),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev]);
      setToasts((prev) => [...prev, notif]);
      setInviteRefreshCounter((c) => c + 1);
    };

    const handleMessageNotification = (data: Record<string, unknown>) => {
      setNotifications((prev) => {
        const existing = prev.find(
          (n) =>
            n.type === "message" && n.data.roomId === data.roomId && !n.read,
        );
        if (existing) {
          return prev.map((n) =>
            n.id === existing.id
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    count: ((n.data.count as number) || 1) + 1,
                    senderName: data.senderName,
                  },
                  timestamp: Date.now(),
                }
              : n,
          );
        }
        const notif: DashNotification = {
          id: `msg-${Date.now()}-${Math.random()}`,
          type: "message",
          data: { ...data, count: 1 },
          timestamp: Date.now(),
          read: false,
        };
        setToasts((prev) => [...prev, notif]);
        return [notif, ...prev];
      });
    };

    const handleFollowReceived = (data: Record<string, unknown>) => {
      const notif: DashNotification = {
        id: `follow-${Date.now()}-${Math.random()}`,
        type: "follow",
        data,
        timestamp: Date.now(),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev]);
      setToasts((prev) => [...prev, notif]);
    };

    socket.on("invite-received", handleInviteReceived);
    socket.on("message-notification", handleMessageNotification);
    socket.on("follow-received", handleFollowReceived);

    return () => {
      socket.off("invite-received", handleInviteReceived);
      socket.off("message-notification", handleMessageNotification);
      socket.off("follow-received", handleFollowReceived);
    };
  }, [socket]);

  // Auto-dismiss toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 6000);
    return () => clearTimeout(timer);
  }, [toasts]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    } else if (!loading && user && !user.emailVerified) {
      router.push("/auth/verify-notice");
    }
  }, [user, loading, router]);

  // Persist active tab
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_TAB, activeTab);
  }, [activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !token) return null;

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  const navItems = [
    { id: "rooms" as const, icon: <FaHome size={15} />, label: "Rooms" },
    { id: "create" as const, icon: <FaPlus size={15} />, label: "New Room" },
    {
      id: "leaderboard" as const,
      icon: <FaTrophy size={15} />,
      label: "Leaderboard",
    },
    { id: "invites" as const, icon: <FaBell size={15} />, label: "Inbox" },
  ];

  return (
    <div className="h-screen bg-[var(--bg-base)] flex flex-col md:flex-row overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-3 h-11 bg-[var(--bg-sidebar)] border-b border-[var(--border)] flex-shrink-0">
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(true)}
          className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <FaBars size={16} />
        </button>
        <span className="text-[14px] font-semibold text-[var(--text-primary)]">
          {navItems.find((n) => n.id === activeTab)?.label ?? "Roomet"}
        </span>
        <button
          type="button"
          onClick={() => setFriendsPanelOpen(!friendsPanelOpen)}
          className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <FaUsers size={16} />
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        >
          <aside
            className="w-[260px] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col shadow-[var(--shadow-lg)] animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile sidebar header */}
            <div className="px-3 pt-3 pb-1 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                Roomet
              </span>
              <button
                type="button"
                onClick={() => setMobileSidebarOpen(false)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <FaTimes size={12} />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-2 space-y-0.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileSidebarOpen(false);
                    if (item.id === "invites") {
                      setNotifications((prev) =>
                        prev.map((n) => ({ ...n, read: true })),
                      );
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 rounded-md text-[13px] px-2 py-1.5 transition-colors ${
                    activeTab === item.id
                      ? "bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="flex-shrink-0 relative">
                    {item.icon}
                    {item.id === "invites" && unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] bg-[var(--accent-coral)] text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </nav>

            {/* Bottom section */}
            <div className="px-2 pb-3 space-y-0.5">
              <div className="px-1">
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("profile");
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-2 rounded-md py-1.5 px-2 transition-colors ${activeTab === "profile" ? "bg-[var(--bg-hover)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}
              >
                <div className="w-6 h-6 rounded-full bg-[var(--avatar-bg)] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="text-[10px] font-semibold text-white">
                      {user.displayName?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-tight">
                    {user.displayName}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate leading-tight">
                    @{user.username}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  router.push("/auth/login");
                }}
                className="w-full flex items-center gap-2.5 rounded-md text-[13px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-coral)] transition-colors px-2 py-1.5"
              >
                <FaSignOutAlt size={14} />
                <span>Log out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar â€” Notion style */}
      <aside
        className={`hidden md:flex ${sidebarCollapsed ? "w-[50px]" : "w-[240px]"} bg-[var(--bg-sidebar)] flex-col transition-[width] duration-200 ease-in-out border-r border-[var(--border)] flex-shrink-0`}
      >
        {/* Sidebar header */}
        <div className="px-3 pt-3 pb-1 flex items-center justify-between">
          {!sidebarCollapsed && (
            <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
              Roomet
            </span>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors flex-shrink-0"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {sidebarCollapsed ? (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              ) : (
                <>
                  <line x1="18" y1="6" x2="6" y2="6" />
                  <line x1="18" y1="12" x2="6" y2="12" />
                  <line x1="18" y1="18" x2="6" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-2 space-y-0.5">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveTab(item.id);
                if (item.id === "invites") {
                  setNotifications((prev) =>
                    prev.map((n) => ({ ...n, read: true })),
                  );
                }
              }}
              className={`w-full flex items-center gap-2.5 rounded-md text-[13px] transition-colors ${sidebarCollapsed ? "justify-center px-0 py-1.5" : "px-2 py-1.5"} ${
                activeTab === item.id
                  ? "bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="flex-shrink-0 relative">
                {item.icon}
                {item.id === "invites" && unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] bg-[var(--accent-coral)] text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </span>
              {!sidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom section: theme + profile + logout */}
        <div className="px-2 pb-3 space-y-0.5">
          <div
            className={`flex ${sidebarCollapsed ? "justify-center" : "px-1"}`}
          >
            <ThemeToggle />
          </div>

          {/* Profile card at bottom â€” click to open profile */}
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`w-full flex items-center gap-2 rounded-md py-1.5 transition-colors ${sidebarCollapsed ? "justify-center px-0" : "px-2"} ${activeTab === "profile" ? "bg-[var(--bg-hover)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"}`}
            title={sidebarCollapsed ? "Profile" : undefined}
          >
            <div className="w-6 h-6 rounded-full bg-[var(--avatar-bg)] flex items-center justify-center overflow-hidden flex-shrink-0">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="text-[10px] font-semibold text-white">
                  {user.displayName?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[12px] font-medium text-[var(--text-primary)] truncate leading-tight">
                  {user.displayName}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate leading-tight">
                  @{user.username}
                </p>
              </div>
            )}
          </button>

          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/auth/login");
            }}
            className={`w-full flex items-center gap-2.5 rounded-md text-[13px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-coral)] transition-colors ${sidebarCollapsed ? "justify-center px-0 py-1.5" : "px-2 py-1.5"}`}
            title={sidebarCollapsed ? "Log out" : undefined}
          >
            <FaSignOutAlt size={14} />
            {!sidebarCollapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {activeTab === "rooms" && (
          <RoomsTab token={token} onJoinRoom={handleJoinRoom} />
        )}
        {activeTab === "create" && (
          <CreateRoomTab
            token={token}
            onCreated={(id) => {
              handleJoinRoom(id);
            }}
          />
        )}
        {activeTab === "leaderboard" && <LeaderboardTab />}
        {activeTab === "invites" && (
          <InvitesTab
            token={token}
            onJoinRoom={handleJoinRoom}
            refreshTrigger={inviteRefreshCounter}
            notifications={notifications}
            onDismissNotification={(id) =>
              setNotifications((prev) => prev.filter((n) => n.id !== id))
            }
          />
        )}
        {activeTab === "profile" && (
          <ProfileTab
            user={user as unknown as Record<string, unknown>}
            token={token}
            friendsPanelOpen={friendsPanelOpen}
          />
        )}
      </main>

      {/* Friends Panel â€” desktop: right aside, mobile: overlay */}
      {friendsPanelOpen ? (
        <>
          {/* Mobile overlay backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setFriendsPanelOpen(false)}
          />
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full z-50 md:relative md:z-auto animate-slide-in-right md:animate-none">
            <FriendsPanel
              token={token}
              onClose={() => setFriendsPanelOpen(false)}
            />
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setFriendsPanelOpen(true)}
          className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-[var(--bg-sidebar)] border border-r-0 border-[var(--border)] rounded-l-lg px-2 py-5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors shadow-[var(--shadow-md)] flex-col items-center gap-1.5"
          title="Open friends"
        >
          <FaUsers size={16} />
          <span className="text-[9px] font-medium tracking-wide uppercase leading-none">
            Friends
          </span>
        </button>
      )}

      {/* Notification Toasts */}
      {toasts.length > 0 && (
        <div className="fixed top-14 md:top-4 right-2 md:right-4 z-50 flex flex-col gap-2 w-[calc(100vw-1rem)] sm:w-80">
          {toasts.map((toast) => (
            <NotificationToast
              key={toast.id}
              notification={toast}
              token={token}
              onDismiss={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
              onJoinRoom={(roomId) => {
                handleJoinRoom(roomId);
                setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                setNotifications((prev) =>
                  prev.map((n) =>
                    n.data.roomId === roomId ? { ...n, read: true } : n,
                  ),
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Notification Toast â”€â”€â”€

function NotificationToast({
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

// â”€â”€â”€ Friends Panel (right sidebar) â”€â”€â”€

function FriendsPanel({
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
              placeholder="Filterâ€¦"
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

// â”€â”€â”€ Room Timer Helper â”€â”€â”€
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

// â”€â”€â”€ Rooms Tab â”€â”€â”€

function RoomsTab({
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

// â”€â”€â”€ Create Room Tab â”€â”€â”€

function CreateRoomTab({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (roomId: string) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    type: "chatting" as RoomType,
    tag: "",
    isPublic: true,
    isLocked: false,
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await roomAPI.create(token, form);
      onCreated(data.room.id as string);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const selectedFeatures = ROOM_TYPE_FEATURES[form.type];

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-xl">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Create a Room
        </h2>
        <p className="text-[var(--text-muted)] text-[13px] mb-5">
          Set up your own space
        </p>

        {error && (
          <div className="mb-4 px-3 py-2.5 bg-[var(--accent-coral)]/8 border border-[var(--accent-coral)]/15 rounded-md text-[var(--accent-coral)] text-[13px]">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">
              Room Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(ROOM_TYPE_FEATURES).map(([type, feat]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, type: type as RoomType }))
                  }
                  className={`p-3 rounded-lg border transition-colors text-left ${form.type === type ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] hover:bg-[var(--bg-hover)]"}`}
                >
                  <DynamicIcon
                    name={feat.icon}
                    size={16}
                    className="mb-1.5"
                    style={{ color: feat.color }}
                  />
                  <p className="font-medium text-[var(--text-primary)] text-[13px] capitalize">
                    {type}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                    {feat.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-elevated)] rounded-lg">
            <p className="text-[11px] text-[var(--text-muted)] mb-1.5 uppercase tracking-wider font-medium">
              Features
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedFeatures.textChat && (
                <span className="px-2 py-0.5 bg-[var(--accent-green)]/8 text-[var(--accent-green)] text-[11px] rounded">
                  Text Chat
                </span>
              )}
              {selectedFeatures.voiceNotes && (
                <span className="px-2 py-0.5 bg-[var(--accent)]/8 text-[var(--accent)] text-[11px] rounded">
                  Voice Notes
                </span>
              )}
              {selectedFeatures.sendImages && (
                <span className="px-2 py-0.5 bg-[var(--accent-amber)]/8 text-[var(--accent-amber)] text-[11px] rounded">
                  Images
                </span>
              )}
              {selectedFeatures.sendAudio && (
                <span className="px-2 py-0.5 bg-[var(--accent)]/8 text-[var(--accent)] text-[11px] rounded">
                  Audio
                </span>
              )}
              {selectedFeatures.sendVideos && (
                <span className="px-2 py-0.5 bg-[var(--accent-coral)]/8 text-[var(--accent-coral)] text-[11px] rounded">
                  Videos
                </span>
              )}
              {selectedFeatures.sendDocuments && (
                <span className="px-2 py-0.5 bg-[var(--accent-amber)]/8 text-[var(--accent-amber)] text-[11px] rounded">
                  Documents
                </span>
              )}
              {selectedFeatures.polling && (
                <span className="px-2 py-0.5 bg-[var(--accent)]/8 text-[var(--accent)] text-[11px] rounded">
                  Polls
                </span>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
                Room Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                required
                maxLength={100}
                className="w-full input-base px-3 py-[9px] text-sm"
                placeholder="Give it a name"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
                Tag (optional)
              </label>
              <input
                type="text"
                value={form.tag}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tag: e.target.value }))
                }
                className="w-full input-base px-3 py-[9px] text-sm"
                placeholder="e.g. gaming, study"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2.5 p-2.5 bg-[var(--bg-elevated)] rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isPublic: e.target.checked }))
                }
                className="w-3.5 h-3.5 accent-[var(--accent)]"
              />
              <div>
                <p className="text-[13px] text-[var(--text-primary)] flex items-center gap-1.5">
                  <FaGlobe size={10} className="text-[var(--accent-green)]" />{" "}
                  Public
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Listed for everyone
                </p>
              </div>
            </label>
            <label className="flex items-center gap-2.5 p-2.5 bg-[var(--bg-elevated)] rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={form.isLocked}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isLocked: e.target.checked }))
                }
                className="w-3.5 h-3.5 accent-[var(--accent-amber)]"
              />
              <div>
                <p className="text-[13px] text-[var(--text-primary)] flex items-center gap-1.5">
                  <FaLock size={10} className="text-[var(--accent-amber)]" />{" "}
                  Locked
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Requires password
                </p>
              </div>
            </label>
          </div>

          {form.isLocked && (
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
                Room Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
                required={form.isLocked}
                className="w-full input-base px-3 py-[9px] text-sm"
                placeholder="Set a password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-[9px] btn-primary text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              "Creating..."
            ) : (
              <>
                <FaPlus size={11} /> Create Room
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// â”€â”€â”€ Invites Tab â”€â”€â”€

function InvitesTab({
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

// â”€â”€â”€ Leaderboard Tab â”€â”€â”€

function LeaderboardTab() {
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

// â”€â”€â”€ Profile Tab â”€â”€â”€

function ProfileTab({
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

  // â”€â”€â”€ Activity Log Panel (extracted for reuse) â”€â”€â”€
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
        {/* â”€â”€â”€ Profile Section (left / top) â”€â”€â”€ */}
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
        {/* â”€â”€â”€ History Section (right / bottom) â”€â”€â”€ */}
        <div
          className={`${friendsPanelOpen ? "w-full" : "w-full md:w-[380px] md:flex-shrink-0"}`}
        >
          {activityLogPanel}
        </div>
      </div>
    </div>
  );
}
