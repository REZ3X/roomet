import dotenv from "dotenv";
dotenv.config();

import { createServer } from "node:http";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import prisma from "./src/lib/prisma";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/api/socketio",
  });

  const roomUsers = new Map<
    string,
    Map<
      string,
      {
        socketId: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      }
    >
  >();

  const userSockets = new Map<string, Set<string>>();

  async function recordSessionTime(userId: string, roomId: string) {
    const activityLog = await prisma.roomActivityLog.findFirst({
      where: { userId, roomId, leftAt: null },
      orderBy: { joinedAt: "desc" },
    });

    if (activityLog) {
      const duration = Math.floor(
        (Date.now() - activityLog.joinedAt.getTime()) / 1000,
      );
      await prisma.roomActivityLog.update({
        where: { id: activityLog.id },
        data: { leftAt: new Date(), duration },
      });

      const participant = await prisma.roomParticipant.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (participant) {
        await prisma.roomParticipant.update({
          where: { id: participant.id },
          data: { timeSpent: { increment: duration } },
        });
      }

      await prisma.userProfile.update({
        where: { userId },
        data: { totalTimeInRooms: { increment: duration } },
      });
    }
  }

  io.on("connection", (socket) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;
    let registeredUserId: string | null = null;

    socket.on("register-user", ({ userId }: { userId: string }) => {
      registeredUserId = userId;
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId)!.add(socket.id);
      socket.join(`user:${userId}`);
    });

    socket.on(
      "join-room",
      async (data: {
        roomId: string;
        userId: string;
        username: string;
        displayName: string;
        avatarUrl: string | null;
      }) => {
        const { roomId, userId, username, displayName, avatarUrl } = data;
        currentRoomId = roomId;
        currentUserId = userId;

        socket.join(roomId);

        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Map());
        }
        roomUsers.get(roomId)!.set(userId, {
          socketId: socket.id,
          username,
          displayName,
          avatarUrl,
        });

        try {
          const openLog = await prisma.roomActivityLog.findFirst({
            where: { userId, roomId, leftAt: null },
          });
          if (!openLog) {
            const room = await prisma.room.findUnique({
              where: { id: roomId },
            });
            if (room) {
              await prisma.roomActivityLog.create({
                data: {
                  userId,
                  roomId,
                  roomTitle: room.title,
                  roomType: room.type,
                  roomTag: room.tag,
                  role: room.hostId === userId ? "host" : "participant",
                },
              });
            }
          }
        } catch (e) {
          console.error("[Socket join-room] activity log error:", e);
        }

        const participants = Array.from(roomUsers.get(roomId)!.entries()).map(
          ([id, info]) => ({
            id,
            ...info,
          }),
        );

        let publicKey: string | null = null;
        try {
          const userRecord = await prisma.user.findUnique({
            where: { id: userId },
            select: { publicKey: true },
          });
          publicKey = userRecord?.publicKey ?? null;
        } catch {}

        io.to(roomId).emit("room-participants", participants);
        socket.to(roomId).emit("user-joined", {
          userId,
          username,
          displayName,
          avatarUrl,
          publicKey,
        });
      },
    );

    socket.on(
      "leave-room",
      async (data: { roomId: string; userId: string }) => {
        const { roomId, userId } = data;
        socket.leave(roomId);

        if (roomUsers.has(roomId)) {
          roomUsers.get(roomId)!.delete(userId);
          if (roomUsers.get(roomId)!.size === 0) {
            roomUsers.delete(roomId);
          } else {
            const participants = Array.from(
              roomUsers.get(roomId)!.entries(),
            ).map(([id, info]) => ({
              id,
              ...info,
            }));
            io.to(roomId).emit("room-participants", participants);
          }
        }

        try {
          await recordSessionTime(userId, roomId);
        } catch (e) {
          console.error("[Socket leave-room] time tracking error:", e);
        }

        socket.to(roomId).emit("user-left", { userId });
        currentRoomId = null;
        currentUserId = null;
      },
    );

    socket.on(
      "send-message",
      (data: { roomId: string; message: Record<string, unknown> }) => {
        socket.to(data.roomId).emit("new-message", data.message);
      },
    );

    socket.on(
      "typing",
      (data: { roomId: string; userId: string; username: string }) => {
        socket.to(data.roomId).emit("user-typing", {
          userId: data.userId,
          username: data.username,
        });
      },
    );

    socket.on("stop-typing", (data: { roomId: string; userId: string }) => {
      socket.to(data.roomId).emit("user-stop-typing", { userId: data.userId });
    });

    socket.on(
      "poll-update",
      (data: { roomId: string; poll: Record<string, unknown> }) => {
        io.to(data.roomId).emit("poll-updated", data.poll);
      },
    );

    socket.on(
      "room-updated",
      (data: { roomId: string; update: Record<string, unknown> }) => {
        io.to(data.roomId).emit("room-update", data.update);
      },
    );

    socket.on(
      "room-key-distributed",
      (data: { roomId: string; userIds: string[] }) => {
        for (const uid of data.userIds) {
          io.to(`user:${uid}`).emit("room-key-available", {
            roomId: data.roomId,
          });
        }
      },
    );

    socket.on(
      "invite-notification",
      (data: { receiverId: string; invite: Record<string, unknown> }) => {
        io.to(`user:${data.receiverId}`).emit("invite-received", data.invite);
      },
    );

    socket.on(
      "follow-notification",
      (data: {
        targetUserId: string;
        followerName: string;
        followerUsername: string;
        followerAvatar: string | null;
      }) => {
        io.to(`user:${data.targetUserId}`).emit("follow-received", {
          followerName: data.followerName,
          followerUsername: data.followerUsername,
          followerAvatar: data.followerAvatar,
        });
      },
    );

    socket.on(
      "room-message-notification",
      (data: {
        roomId: string;
        roomTitle: string;
        senderName: string;
        senderId: string;
        participantIds: string[];
      }) => {
        for (const pid of data.participantIds) {
          if (pid !== data.senderId) {
            const isInRoom = roomUsers.get(data.roomId)?.has(pid);
            if (!isInRoom) {
              io.to(`user:${pid}`).emit("message-notification", {
                roomId: data.roomId,
                roomTitle: data.roomTitle,
                senderName: data.senderName,
              });
            }
          }
        }
      },
    );

    socket.on("disconnect", async () => {
      if (currentRoomId && currentUserId) {
        if (roomUsers.has(currentRoomId)) {
          roomUsers.get(currentRoomId)!.delete(currentUserId);
          if (roomUsers.get(currentRoomId)!.size === 0) {
            roomUsers.delete(currentRoomId);
          } else {
            const participants = Array.from(
              roomUsers.get(currentRoomId)!.entries(),
            ).map(([id, info]) => ({
              id,
              ...info,
            }));
            io.to(currentRoomId).emit("room-participants", participants);
          }
        }
        socket.to(currentRoomId).emit("user-left", { userId: currentUserId });

        try {
          await recordSessionTime(currentUserId, currentRoomId);
        } catch (e) {
          console.error("[Socket disconnect] time tracking error:", e);
        }
      }

      if (registeredUserId && userSockets.has(registeredUserId)) {
        userSockets.get(registeredUserId)!.delete(socket.id);
        if (userSockets.get(registeredUserId)!.size === 0) {
          userSockets.delete(registeredUserId);
        }
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Roomet ready on http://${hostname}:${port}`);
  });
});
