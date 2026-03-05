"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendMessage: (roomId: string, message: Record<string, unknown>) => void;
  startTyping: (roomId: string) => void;
  stopTyping: (roomId: string) => void;
  emitPollUpdate: (roomId: string, poll: Record<string, unknown>) => void;
  emitRoomUpdate: (roomId: string, update: Record<string, unknown>) => void;
  emitInviteNotification: (
    receiverId: string,
    invite: Record<string, unknown>,
  ) => void;
  emitMessageNotification: (data: {
    roomId: string;
    roomTitle: string;
    senderName: string;
    senderId: string;
    participantIds: string[];
  }) => void;
  emitFollowNotification: (data: {
    targetUserId: string;
    followerName: string;
    followerUsername: string;
    followerAvatar: string | null;
  }) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const socket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000",
      {
        path: "/api/socketio",
        transports: ["websocket", "polling"],
      },
    );

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("register-user", { userId: user.id });
    });
    socket.on("disconnect", () => setIsConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [user]);

  const joinRoom = useCallback(
    (roomId: string) => {
      if (!socketRef.current || !user) return;
      socketRef.current.emit("join-room", {
        roomId,
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });
    },
    [user],
  );

  const leaveRoom = useCallback(
    (roomId: string) => {
      if (!socketRef.current || !user) return;
      socketRef.current.emit("leave-room", { roomId, userId: user.id });
    },
    [user],
  );

  const sendMessage = useCallback(
    (roomId: string, message: Record<string, unknown>) => {
      if (!socketRef.current) return;
      socketRef.current.emit("send-message", { roomId, message });
    },
    [],
  );

  const startTyping = useCallback(
    (roomId: string) => {
      if (!socketRef.current || !user) return;
      socketRef.current.emit("typing", {
        roomId,
        userId: user.id,
        username: user.username,
      });
    },
    [user],
  );

  const stopTyping = useCallback(
    (roomId: string) => {
      if (!socketRef.current || !user) return;
      socketRef.current.emit("stop-typing", { roomId, userId: user.id });
    },
    [user],
  );

  const emitPollUpdate = useCallback(
    (roomId: string, poll: Record<string, unknown>) => {
      if (!socketRef.current) return;
      socketRef.current.emit("poll-update", { roomId, poll });
    },
    [],
  );

  const emitRoomUpdate = useCallback(
    (roomId: string, update: Record<string, unknown>) => {
      if (!socketRef.current) return;
      socketRef.current.emit("room-updated", { roomId, update });
    },
    [],
  );

  const emitInviteNotification = useCallback(
    (receiverId: string, invite: Record<string, unknown>) => {
      if (!socketRef.current) return;
      socketRef.current.emit("invite-notification", { receiverId, invite });
    },
    [],
  );

  const emitMessageNotification = useCallback(
    (data: {
      roomId: string;
      roomTitle: string;
      senderName: string;
      senderId: string;
      participantIds: string[];
    }) => {
      if (!socketRef.current) return;
      socketRef.current.emit("room-message-notification", data);
    },
    [],
  );

  const emitFollowNotification = useCallback(
    (data: {
      targetUserId: string;
      followerName: string;
      followerUsername: string;
      followerAvatar: string | null;
    }) => {
      if (!socketRef.current) return;
      socketRef.current.emit("follow-notification", data);
    },
    [],
  );

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        joinRoom,
        leaveRoom,
        sendMessage,
        startTyping,
        stopTyping,
        emitPollUpdate,
        emitRoomUpdate,
        emitInviteNotification,
        emitMessageNotification,
        emitFollowNotification,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within SocketProvider");
  return ctx;
}
