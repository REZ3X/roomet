import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, unauthorized, success } from "@/lib/api-helpers";

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
