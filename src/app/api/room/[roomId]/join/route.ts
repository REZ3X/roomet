import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  badRequest,
  notFound,
  forbidden,
} from "@/lib/api-helpers";
import { verifyPassword } from "@/lib/auth";
import { checkAndGrantAchievements } from "@/lib/progression";
import { serverDecryptKey, serverEncryptForUser } from "@/lib/server-crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      _count: { select: { participants: { where: { isActive: true } } } },
    },
  });

  if (!room) return notFound("Room not found");
  if (!room.isActive) return badRequest("Room is no longer active");

  if (room._count.participants >= room.maxMembers) {
    return badRequest("Room is full");
  }

  const existing = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });

  if (existing?.isActive) return badRequest("Already in room");

  if (room.isLocked && room.passwordHash) {
    const body = await req.json().catch(() => ({}));
    if (!body.password) return forbidden("Room is locked. Password required.");

    const valid = await verifyPassword(body.password, room.passwordHash);
    if (!valid) return forbidden("Incorrect room password");
  }

  if (existing) {
    await prisma.roomParticipant.update({
      where: { id: existing.id },
      data: { isActive: true, joinedAt: new Date(), leftAt: null },
    });
  } else {
    await prisma.roomParticipant.create({
      data: { roomId, userId: user.id },
    });
  }

  await prisma.roomActivityLog.create({
    data: {
      userId: user.id,
      roomId,
      roomTitle: room.title,
      roomType: room.type,
      roomTag: room.tag,
      role: room.hostId === user.id ? "host" : "participant",
    },
  });

  await prisma.userProfile.update({
    where: { userId: user.id },
    data: { totalRoomsJoined: { increment: 1 } },
  });

  await checkAndGrantAchievements(user.id);

  // Auto-distribute room key to the joining user
  if (room.serverEncryptedKey && user.publicKey) {
    try {
      const roomKeyBase64 = serverDecryptKey(room.serverEncryptedKey);
      const encryptedForUser = serverEncryptForUser(
        roomKeyBase64,
        user.publicKey,
      );
      await prisma.roomEncryptedKey.upsert({
        where: { roomId_userId: { roomId, userId: user.id } },
        update: { encryptedKey: encryptedForUser },
        create: { roomId, userId: user.id, encryptedKey: encryptedForUser },
      });
    } catch (e) {
      console.warn("[Room Join] Auto key distribution failed:", e);
    }
  }

  return success({ message: "Joined room" });
}
