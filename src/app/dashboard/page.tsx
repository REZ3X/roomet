"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import {
  FaPlus,
  FaSignOutAlt,
  FaBell,
  FaHome,
  FaUsers,
  FaTimes,
  FaTrophy,
  FaBars,
  DynamicIcon,
} from "@/components/Icons";
import { roomAPI } from "@/lib/api-client";
import ThemeToggle from "@/components/ThemeToggle";
import { useSocket } from "@/context/SocketContext";
import type { Tab, DashNotification } from "./types";
import NotificationToast from "./NotificationToast";
import FriendsPanel from "./FriendsPanel";
import RoomsTab from "./RoomsTab";
import CreateRoomTab from "./CreateRoomTab";
import InvitesTab from "./InvitesTab";
import LeaderboardTab from "./LeaderboardTab";
import ProfileTab from "./ProfileTab";

const STORAGE_KEY_TAB = "roomet_active_tab";

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

  // ─── Active Rooms (rooms user is currently in) ───
  const [activeRooms, setActiveRooms] = useState<
    Array<{ id: string; title: string; icon?: string; color?: string }>
  >([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const load = async () => {
      try {
        const data = await roomAPI.myRooms(token);
        if (!cancelled) {
          setActiveRooms(
            data.rooms.map((r) => {
              const feat = r.features as Record<string, unknown> | undefined;
              return {
                id: r.id as string,
                title: r.title as string,
                icon: feat?.icon as string | undefined,
                color: feat?.color as string | undefined,
              };
            }),
          );
        }
      } catch {}
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ─── Notification State ───
  const [notifications, setNotifications] = useState<DashNotification[]>([]);
  const [toasts, setToasts] = useState<DashNotification[]>([]);
  const [inviteRefreshCounter, setInviteRefreshCounter] = useState(0);
  const unreadCount = notifications.filter((n) => !n.read).length;

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
                <div key={item.id}>
                  <button
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
                  {/* Active room sub-nav under Rooms */}
                  {item.id === "rooms" && activeRooms.length > 0 && (
                    <div className="ml-5 mt-0.5 space-y-0.5">
                      {activeRooms.slice(0, 5).map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setMobileSidebarOpen(false);
                            handleJoinRoom(r.id);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] transition-colors"
                        >
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                            style={{ background: r.color || "var(--accent)" }}
                          >
                            <DynamicIcon
                              name={r.icon || "FaComments"}
                              size={8}
                              className="text-white"
                            />
                          </div>
                          <span className="text-[12px] truncate">
                            {r.title}
                          </span>
                        </button>
                      ))}
                      {activeRooms.length > 5 && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("rooms");
                            setMobileSidebarOpen(false);
                          }}
                          className="w-full text-left px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                        >
                          +{activeRooms.length - 5} more rooms →
                        </button>
                      )}
                    </div>
                  )}
                </div>
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

      {/* Desktop Sidebar — Notion style */}
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
            <div key={item.id}>
              <button
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
              {/* Active room sub-nav under Rooms */}
              {item.id === "rooms" &&
                !sidebarCollapsed &&
                activeRooms.length > 0 && (
                  <div className="ml-5 mt-0.5 space-y-0.5">
                    {activeRooms.slice(0, 5).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleJoinRoom(r.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent)] transition-colors"
                      >
                        <div
                          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                          style={{ background: r.color || "var(--accent)" }}
                        >
                          <DynamicIcon
                            name={r.icon || "FaComments"}
                            size={8}
                            className="text-white"
                          />
                        </div>
                        <span className="text-[12px] truncate">{r.title}</span>
                      </button>
                    ))}
                    {activeRooms.length > 5 && (
                      <button
                        type="button"
                        onClick={() => setActiveTab("rooms")}
                        className="w-full text-left px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                      >
                        +{activeRooms.length - 5} more rooms →
                      </button>
                    )}
                  </div>
                )}
              {/* Collapsed: show dot for active rooms */}
              {item.id === "rooms" &&
                sidebarCollapsed &&
                activeRooms.length > 0 && (
                  <div className="flex justify-center mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  </div>
                )}
            </div>
          ))}
        </nav>

        {/* Bottom section: theme + profile + logout */}
        <div className="px-2 pb-3 space-y-0.5">
          <div
            className={`flex ${sidebarCollapsed ? "justify-center" : "px-1"}`}
          >
            <ThemeToggle />
          </div>

          {/* Profile card at bottom — click to open profile */}
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

      {/* Friends Panel — desktop: right aside, mobile: overlay */}
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
