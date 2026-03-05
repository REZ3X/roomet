import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  badRequest,
  forbidden,
} from "@/lib/api-helpers";
import { checkAndGrantAchievements, addXP } from "@/lib/progression";

// GET messages for a room
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;

  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!participant)
    return forbidden("You must be a participant to view messages");

  const cursor = req.nextUrl.searchParams.get("cursor");
  const limit = 50;

  const messages = await prisma.message.findMany({
    where: { roomId },
    include: {
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
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  return success({
    messages: messages.reverse(),
    nextCursor: messages.length === limit ? messages[0]?.id : null,
  });
}

// POST send a text message
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;

  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!participant?.isActive)
    return forbidden("You must be an active participant");

  try {
    const body = await req.json();
    const { encryptedContent, iv, type } = body;

    if (!encryptedContent) return badRequest("Content is required");

    const message = await prisma.message.create({
      data: {
        roomId,
        senderId: user.id,
        type: type || "text",
        encryptedContent,
        iv,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { totalMessages: { increment: 1 } },
    });

    await addXP(user.id, 1); // 1 XP per message
    await checkAndGrantAchievements(user.id);

    return success({ message }, 201);
  } catch (error) {
    console.error("[Chat Error]", error);
    return badRequest("Failed to send message");
  }
}
