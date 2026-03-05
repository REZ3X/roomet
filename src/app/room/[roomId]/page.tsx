"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import RoomView from "@/components/RoomView";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();

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

  return <RoomView roomId={roomId} onLeave={() => router.push("/dashboard")} />;
}
