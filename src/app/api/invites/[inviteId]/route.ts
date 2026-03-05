import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  badRequest,
  notFound,
} from "@/lib/api-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { inviteId } = await params;
  const body = await req.json();
  const { action } = body; // "accept" | "decline"

  if (!["accept", "decline"].includes(action))
    return badRequest("Invalid action");

  const invite = await prisma.roomInvite.findUnique({
    where: { id: inviteId },
    include: { room: true },
  });

  if (!invite) return notFound("Invite not found");
  if (invite.receiverId !== user.id) return badRequest("Not your invite");
  if (invite.status !== "pending") return badRequest("Invite already handled");

  await prisma.roomInvite.update({
    where: { id: inviteId },
    data: { status: action === "accept" ? "accepted" : "declined" },
  });

  if (action === "accept" && invite.room.isActive) {
    const existing = await prisma.roomParticipant.findUnique({
      where: { roomId_userId: { roomId: invite.roomId, userId: user.id } },
    });

    if (!existing) {
      await prisma.roomParticipant.create({
        data: { roomId: invite.roomId, userId: user.id },
      });
    } else if (!existing.isActive) {
      await prisma.roomParticipant.update({
        where: { id: existing.id },
        data: { isActive: true, joinedAt: new Date(), leftAt: null },
      });
    }

    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { totalRoomsJoined: { increment: 1 } },
    });
  }

  return success({
    message: action === "accept" ? "Invite accepted" : "Invite declined",
    roomId: action === "accept" ? invite.roomId : undefined,
  });
}
