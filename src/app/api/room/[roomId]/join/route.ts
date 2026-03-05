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

  // Check if already in room
  const existing = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });

  if (existing?.isActive) return badRequest("Already in room");

  // Check password for locked rooms
  if (room.isLocked && room.passwordHash) {
    const body = await req.json().catch(() => ({}));
    if (!body.password) return forbidden("Room is locked. Password required.");

    const valid = await verifyPassword(body.password, room.passwordHash);
    if (!valid) return forbidden("Incorrect room password");
  }

  if (existing) {
    // Rejoin
    await prisma.roomParticipant.update({
      where: { id: existing.id },
      data: { isActive: true, joinedAt: new Date(), leftAt: null },
    });
  } else {
    await prisma.roomParticipant.create({
      data: { roomId, userId: user.id },
    });
  }

  // Create activity log entry
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

  // Update profile
  await prisma.userProfile.update({
    where: { userId: user.id },
    data: { totalRoomsJoined: { increment: 1 } },
  });

  await checkAndGrantAchievements(user.id);

  return success({ message: "Joined room" });
}
