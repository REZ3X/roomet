import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  notFound,
  badRequest,
} from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return notFound("Room not found");

  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });

  if (!participant?.isActive) return badRequest("Not in room");

  await prisma.roomParticipant.update({
    where: { id: participant.id },
    data: {
      isActive: false,
      leftAt: new Date(),
    },
  });

  const activityLog = await prisma.roomActivityLog.findFirst({
    where: { userId: user.id, roomId, leftAt: null },
    orderBy: { joinedAt: "desc" },
  });

  let timeSpent = 0;
  if (activityLog) {
    timeSpent = Math.floor(
      (Date.now() - activityLog.joinedAt.getTime()) / 1000,
    );
    await prisma.roomActivityLog.update({
      where: { id: activityLog.id },
      data: { leftAt: new Date(), duration: timeSpent },
    });

    await prisma.roomParticipant.update({
      where: { id: participant.id },
      data: { timeSpent: { increment: timeSpent } },
    });
    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { totalTimeInRooms: { increment: timeSpent } },
    });
  }

  const activeCount = await prisma.roomParticipant.count({
    where: { roomId, isActive: true },
  });

  if (activeCount === 0) {
    await prisma.room.update({
      where: { id: roomId },
      data: { isActive: false },
    });
  } else if (room.hostId === user.id) {
    let newHostId = room.coHostId;

    if (!newHostId) {
      const nextParticipant = await prisma.roomParticipant.findFirst({
        where: { roomId, isActive: true, userId: { not: user.id } },
        orderBy: { joinedAt: "asc" },
      });
      newHostId = nextParticipant?.userId || null;
    }

    if (newHostId) {
      await prisma.room.update({
        where: { id: roomId },
        data: {
          hostId: newHostId,
          coHostId: room.coHostId === newHostId ? null : room.coHostId,
        },
      });
    }
  }

  return success({ message: "Left room", timeSpent });
}
