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

// POST store encrypted room key for a user
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) return notFound("Room not found");

  if (room.hostId !== user.id && room.coHostId !== user.id) {
    return forbidden("Only host/co-host can distribute room keys");
  }

  try {
    const body = await req.json();
    const { keys } = body; // Array of { userId, encryptedKey }

    if (!Array.isArray(keys)) return badRequest("Keys must be an array");

    for (const { userId, encryptedKey } of keys) {
      await prisma.roomEncryptedKey.upsert({
        where: { roomId_userId: { roomId, userId } },
        update: { encryptedKey },
        create: { roomId, userId, encryptedKey },
      });
    }

    return success({ message: "Room keys distributed" });
  } catch (error) {
    console.error("[Room Keys Error]", error);
    return badRequest("Failed to distribute keys");
  }
}

// GET get my encrypted room key
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;

  const keyRecord = await prisma.roomEncryptedKey.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });

  if (!keyRecord) return notFound("No room key found");

  return success({ encryptedKey: keyRecord.encryptedKey });
}
