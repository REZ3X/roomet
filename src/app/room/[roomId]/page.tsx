"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import RoomView from "@/components/RoomView";
import RoomSidebar from "@/components/RoomSidebar";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [roomInfo, setRoomInfo] = useState<{
    title: string;
    icon?: string;
    color?: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !roomId) return null;

  return (
    <div className="h-dvh bg-[var(--bg-base)] flex flex-col md:flex-row overflow-hidden">
      <RoomSidebar
        user={user}
        activeRoom={roomInfo}
        sidebarCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileSidebarOpen={mobileSidebarOpen}
        onMobileSidebarClose={() => setMobileSidebarOpen(false)}
        onLogout={async () => {
          await logout();
          router.push("/auth/login");
        }}
      />

      <main className="flex-1 min-w-0 min-h-0 overflow-hidden">
        <RoomView
          roomId={roomId}
          onLeave={() => router.push("/dashboard")}
          onRoomLoaded={setRoomInfo}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />
      </main>
    </div>
  );
}
