import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  badRequest,
  forbidden,
  success,
} from "@/lib/api-helpers";
import { saveFile } from "@/lib/storage";
import { canSendMediaType } from "@/lib/room-types";
import { addXP, checkAndGrantAchievements } from "@/lib/progression";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room?.isActive) return badRequest("Room not found or inactive");

  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!participant?.isActive)
    return forbidden("You must be an active participant");

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const encryptedContent = formData.get("encryptedContent") as string;
    const iv = formData.get("iv") as string;

    const originalName =
      (formData.get("originalName") as string) || file?.name || "file";
    const originalMimeType =
      (formData.get("originalMimeType") as string) ||
      file?.type ||
      "application/octet-stream";
    const originalSize =
      Number(formData.get("originalSize")) || file?.size || 0;

    if (!file) return badRequest("File is required");

    if (!canSendMediaType(room.type, originalMimeType)) {
      return forbidden(`This file type is not allowed in ${room.type} rooms`);
    }

    const saved = await saveFile(file);

    let type = "document";
    if (originalMimeType.startsWith("image/")) type = "image";
    else if (originalMimeType.startsWith("audio/")) type = "audio";
    else if (originalMimeType.startsWith("video/")) type = "video";

    const message = await prisma.message.create({
      data: {
        roomId,
        senderId: user.id,
        type,
        encryptedContent: encryptedContent || `[${type}]`,
        iv: iv || null,
        mediaUrl: saved.url,
        mediaName: originalName,
        mediaMimeType: originalMimeType,
        mediaSize: originalSize,
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

    await addXP(user.id, 2);
    await checkAndGrantAchievements(user.id);

    return success({ message }, 201);
  } catch (error) {
    console.error("[Media Upload Error]", error);
    return badRequest("Failed to upload media");
  }
}
