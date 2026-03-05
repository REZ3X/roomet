import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  notFound,
  forbidden,
  badRequest,
} from "@/lib/api-helpers";
import { ROOM_TYPE_FEATURES, type RoomType } from "@/lib/room-types";

// GET room details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      host: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      coHost: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
      participants: {
        where: { isActive: true },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              publicKey: true,
            },
          },
        },
      },
      _count: { select: { participants: { where: { isActive: true } } } },
    },
  });

  if (!room) return notFound("Room not found");

  const isParticipant = room.participants.some((p) => p.userId === user.id);

  let encryptedRoomKey = null;
  if (isParticipant) {
    const keyRecord = await prisma.roomEncryptedKey.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    encryptedRoomKey = keyRecord?.encryptedKey || null;
  }

  return success({
    id: room.id,
    title: room.title,
    type: room.type,
    tag: room.tag,
    isPublic: room.isPublic,
    isLocked: room.isLocked,
    isActive: room.isActive,
    host: room.host,
    coHost: room.coHost,
    inviteCode: room.inviteCode,
    participantCount: room._count.participants,
    maxMembers: room.maxMembers,
    createdAt: room.createdAt,
    features: ROOM_TYPE_FEATURES[room.type as RoomType],
    isParticipant,
    encryptedRoomKey,
    participants: isParticipant
      ? room.participants.map((p) => ({
          id: p.user.id,
          username: p.user.username,
          displayName: p.user.displayName,
          avatarUrl: p.user.avatarUrl,
          publicKey: p.user.publicKey,
          joinedAt: p.joinedAt,
        }))
      : [],
  });
}

// PATCH update room (host/cohost only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return notFound("Room not found");

  if (room.hostId !== user.id && room.coHostId !== user.id) {
    return forbidden("Only host or co-host can update the room");
  }

  const body = await req.json();
  const { title, tag, isPublic, coHostId, transferHost } = body;

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (tag !== undefined) updateData.tag = tag;
  if (isPublic !== undefined) updateData.isPublic = isPublic;

  if (transferHost && room.hostId === user.id) {
    const participant = await prisma.roomParticipant.findFirst({
      where: { roomId, userId: transferHost, isActive: true },
    });
    if (!participant) return badRequest("Target user is not in the room");

    updateData.hostId = transferHost;
    if (room.coHostId === transferHost) {
      updateData.coHostId = user.id;
    }
  }

  if (coHostId !== undefined && room.hostId === user.id) {
    if (coHostId === null) {
      updateData.coHostId = null;
    } else {
      const participant = await prisma.roomParticipant.findFirst({
        where: { roomId, userId: coHostId, isActive: true },
      });
      if (!participant) return badRequest("Target user is not in the room");
      updateData.coHostId = coHostId;
    }
  }

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: updateData,
  });

  return success({ room: updated });
}

// DELETE end room (host only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return notFound("Room not found");

  if (room.hostId !== user.id) {
    return forbidden("Only the host can end the room");
  }

  await prisma.room.update({
    where: { id: roomId },
    data: { isActive: false },
  });

  await prisma.roomParticipant.updateMany({
    where: { roomId, isActive: true },
    data: { isActive: false, leftAt: new Date() },
  });

  await prisma.roomActivityLog.updateMany({
    where: { roomId, leftAt: null },
    data: { leftAt: new Date() },
  });

  return success({ message: "Room ended" });
}
