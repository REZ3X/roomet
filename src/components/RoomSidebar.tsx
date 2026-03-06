"use client";

import { useRouter } from "next/navigation";
import {
  FaHome,
  FaPlus,
  FaTrophy,
  FaBell,
  FaSignOutAlt,
  FaTimes,
  FaBars,
  FaDoorOpen,
} from "@/components/Icons";
import { DynamicIcon } from "@/components/Icons";
import ThemeToggle from "@/components/ThemeToggle";

interface RoomSidebarProps {
  user: {
    displayName: string;
    username: string;
    avatarUrl: string | null;
  };
  activeRoom: { title: string; icon?: string; color?: string } | null;
  sidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileSidebarOpen: boolean;
  onMobileSidebarClose: () => void;
  onLogout: () => Promise<void>;
}

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

export default function RoomSidebar({
  user,
  activeRoom,
  sidebarCollapsed,
  onToggleCollapse,
  mobileSidebarOpen,
  onMobileSidebarClose,
  onLogout,
}: RoomSidebarProps) {
  const router = useRouter();

  const handleNavigate = (tab: string) => {
    localStorage.setItem("roomet_active_tab", tab);
    router.push("/dashboard");
  };

  const sidebarContent = (mobile = false) => (
    <>
      {/* Header */}
      <div className="px-3 pt-3 pb-1 flex items-center justify-between">
        {(mobile || !sidebarCollapsed) && (
          <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate">
            Roomet
          </span>
        )}
        {mobile ? (
          <button
            type="button"
            onClick={onMobileSidebarClose}
            className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <FaTimes size={12} />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapse}
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
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2 space-y-0.5">
        {navItems.map((item) => {
          const isRooms = item.id === "rooms";
          const isCollapsed = !mobile && sidebarCollapsed;

          return (
            <div key={item.id}>
              <button
                type="button"
                onClick={() => {
                  if (mobile) onMobileSidebarClose();
                  handleNavigate(item.id);
                }}
                className={`w-full flex items-center gap-2.5 rounded-md text-[13px] transition-colors ${isCollapsed ? "justify-center px-0 py-1.5" : "px-2 py-1.5"} ${
                  isRooms
                    ? "bg-[var(--bg-hover)] text-[var(--text-primary)] font-medium"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </button>

              {/* Active room sub-nav under Rooms */}
              {isRooms && !isCollapsed && (
                <div className="ml-5 mt-0.5 space-y-0.5">
                  {/* Current room */}
                  {activeRoom ? (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--accent)]/8 text-[var(--accent)]">
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                        style={{
                          background: activeRoom.color || "var(--accent)",
                        }}
                      >
                        <DynamicIcon
                          name={activeRoom.icon || "FaComments"}
                          size={8}
                          className="text-white"
                        />
                      </div>
                      <span className="text-[12px] font-medium truncate">
                        {activeRoom.title}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-[var(--accent)]/8 text-[var(--accent)]">
                      <div className="w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <span className="text-[12px] truncate">
                        Loading room…
                      </span>
                    </div>
                  )}

                  {/* See more rooms link */}
                  <button
                    type="button"
                    onClick={() => {
                      if (mobile) onMobileSidebarClose();
                      handleNavigate("rooms");
                    }}
                    className="w-full text-left px-2 py-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                  >
                    See more active rooms →
                  </button>
                </div>
              )}

              {/* Collapsed: show dot indicator for active room */}
              {isRooms && isCollapsed && activeRoom && (
                <div className="flex justify-center mt-0.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: activeRoom.color || "var(--accent)" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-3 space-y-0.5">
        <div
          className={`flex ${!mobile && sidebarCollapsed ? "justify-center" : "px-1"}`}
        >
          <ThemeToggle />
        </div>

        {/* Profile */}
        <button
          type="button"
          onClick={() => {
            if (mobile) onMobileSidebarClose();
            handleNavigate("profile");
          }}
          className={`w-full flex items-center gap-2 rounded-md py-1.5 transition-colors ${!mobile && sidebarCollapsed ? "justify-center px-0" : "px-2"} text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]`}
          title={!mobile && sidebarCollapsed ? "Profile" : undefined}
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
          {(mobile || !sidebarCollapsed) && (
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

        {/* Logout */}
        <button
          type="button"
          onClick={async () => {
            if (mobile) onMobileSidebarClose();
            await onLogout();
          }}
          className={`w-full flex items-center gap-2.5 rounded-md text-[13px] text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--accent-coral)] transition-colors ${!mobile && sidebarCollapsed ? "justify-center px-0 py-1.5" : "px-2 py-1.5"}`}
          title={!mobile && sidebarCollapsed ? "Log out" : undefined}
        >
          <FaSignOutAlt size={14} />
          {(mobile || !sidebarCollapsed) && <span>Log out</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onMobileSidebarClose}
        >
          <aside
            className="w-[260px] h-full bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col shadow-[var(--shadow-lg)] animate-slide-in-left"
            onClick={(e) => e.stopPropagation()}
          >
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex ${sidebarCollapsed ? "w-[50px]" : "w-[240px]"} bg-[var(--bg-sidebar)] flex-col transition-[width] duration-200 ease-in-out border-r border-[var(--border)] flex-shrink-0`}
      >
        {sidebarContent(false)}
      </aside>
    </>
  );
}
