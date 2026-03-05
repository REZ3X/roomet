import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  badRequest,
  notFound,
} from "@/lib/api-helpers";

// POST invite a friend to a room (direct invite)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room || !room.isActive) return notFound("Room not found");

  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!participant?.isActive)
    return badRequest("You must be in the room to invite");

  const body = await req.json();
  const { receiverId } = body;

  if (!receiverId) return badRequest("Receiver ID is required");

  const [iFollow, theyFollow] = await Promise.all([
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: receiverId,
        },
      },
    }),
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: receiverId,
          followingId: user.id,
        },
      },
    }),
  ]);

  if (!iFollow || !theyFollow) {
    return badRequest("You can only direct-invite mutual friends");
  }

  const alreadyIn = await prisma.roomParticipant.findFirst({
    where: { roomId, userId: receiverId, isActive: true },
  });
  if (alreadyIn) return badRequest("User is already in the room");

  const pendingInvite = await prisma.roomInvite.findFirst({
    where: { roomId, receiverId, status: "pending" },
  });
  if (pendingInvite) return badRequest("Invite already sent");

  const invite = await prisma.roomInvite.create({
    data: { roomId, senderId: user.id, receiverId },
  });

  return success(
    {
      message: "Invite sent",
      invite: { id: invite.id, roomId: invite.roomId },
    },
    201,
  );
}

// GET list pending invites for current user
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const invites = await prisma.roomInvite.findMany({
    where: { receiverId: user.id, status: "pending" },
    include: {
      room: { select: { id: true, title: true, type: true, isActive: true } },
      sender: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return success({
    invites: invites.filter((i) => i.room.isActive),
  });
}
