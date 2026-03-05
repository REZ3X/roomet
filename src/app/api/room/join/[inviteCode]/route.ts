import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  notFound,
} from "@/lib/api-helpers";

// GET join room by invite code
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ inviteCode: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { inviteCode } = await params;

  const room = await prisma.room.findUnique({
    where: { inviteCode },
    select: {
      id: true,
      title: true,
      type: true,
      isActive: true,
      isLocked: true,
    },
  });

  if (!room || !room.isActive)
    return notFound("Room not found or no longer active");

  return success({ room });
}
