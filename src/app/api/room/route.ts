import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  badRequest,
} from "@/lib/api-helpers";
import { generateInviteCode, hashPassword } from "@/lib/auth";
import { checkAndGrantAchievements } from "@/lib/progression";
import { ROOM_TYPE_FEATURES, type RoomType } from "@/lib/room-types";
import {
  generateRoomKey,
  serverEncryptKey,
  serverDecryptKey,
  serverEncryptForUser,
} from "@/lib/server-crypto";

// GET list rooms — ?view=mine returns user's active rooms, default returns public rooms
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const view = req.nextUrl.searchParams.get("view") || "";
  const search = req.nextUrl.searchParams.get("search") || "";
  const type = req.nextUrl.searchParams.get("type") || "";
  const page = Number.parseInt(req.nextUrl.searchParams.get("page") || "1");
  const limit = 20;

  // ── My Rooms view ──
  if (view === "mine") {
    const where: Record<string, unknown> = {
      isActive: true,
      participants: {
        some: { userId: user.id, isActive: true },
      },
    };

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { tag: { contains: search } },
      ];
    }

    if (type && type in ROOM_TYPE_FEATURES) {
      where.type = type;
    }

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        include: {
          host: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          _count: { select: { participants: { where: { isActive: true } } } },
          participants: {
            where: { userId: user.id, isActive: true },
            select: { joinedAt: true },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.room.count({ where }),
    ]);

    return success({
      rooms: rooms.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        tag: r.tag,
        isPublic: r.isPublic,
        isLocked: r.isLocked,
        host: r.host,
        isHost: r.hostId === user.id,
        participantCount: r._count.participants,
        maxMembers: r.maxMembers,
        inviteCode: r.inviteCode,
        joinedAt: r.participants[0]?.joinedAt,
        createdAt: r.createdAt,
        features: ROOM_TYPE_FEATURES[r.type as RoomType],
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }

  // ── Browse public rooms (default) ──
  const where: Record<string, unknown> = {
    isActive: true,
    isPublic: true,
  };

  if (search) {
    where.OR = [{ title: { contains: search } }, { tag: { contains: search } }];
  }

  if (type && type in ROOM_TYPE_FEATURES) {
    where.type = type;
  }

  const [rooms, total] = await Promise.all([
    prisma.room.findMany({
      where,
      include: {
        host: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: { select: { participants: { where: { isActive: true } } } },
        participants: {
          where: { userId: user.id, isActive: true },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.room.count({ where }),
  ]);

  return success({
    rooms: rooms.map((r) => ({
      id: r.id,
      title: r.title,
      type: r.type,
      tag: r.tag,
      isLocked: r.isLocked,
      host: r.host,
      participantCount: r._count.participants,
      maxMembers: r.maxMembers,
      inviteCode: r.inviteCode,
      createdAt: r.createdAt,
      isParticipant: r.participants.length > 0,
      features: ROOM_TYPE_FEATURES[r.type as RoomType],
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// POST create room
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { title, type, tag, isPublic, isLocked, password } = body;

    if (!title || !type) return badRequest("Title and type are required");
    if (!(type in ROOM_TYPE_FEATURES)) return badRequest("Invalid room type");
    if (title.length > 100) return badRequest("Title too long (max 100)");

    let passwordHash: string | null = null;
    if (isLocked && password) {
      passwordHash = await hashPassword(password);
    }

    const inviteCode = generateInviteCode();

    // Generate room key server-side and store encrypted
    const roomKeyBase64 = generateRoomKey();
    const serverEncryptedKey = serverEncryptKey(roomKeyBase64);

    const room = await prisma.room.create({
      data: {
        title,
        type,
        tag: tag || null,
        isPublic: isPublic !== false,
        isLocked: !!isLocked,
        passwordHash,
        hostId: user.id,
        inviteCode,
        serverEncryptedKey,
      },
    });

    // Auto-distribute key to the host if they have a public key
    if (user.publicKey) {
      try {
        const encryptedForHost = serverEncryptForUser(
          roomKeyBase64,
          user.publicKey,
        );
        await prisma.roomEncryptedKey.upsert({
          where: { roomId_userId: { roomId: room.id, userId: user.id } },
          update: { encryptedKey: encryptedForHost },
          create: {
            roomId: room.id,
            userId: user.id,
            encryptedKey: encryptedForHost,
          },
        });
      } catch (e) {
        console.warn("[Room Create] Failed to distribute key to host:", e);
      }
    }

    await prisma.roomParticipant.create({
      data: { roomId: room.id, userId: user.id },
    });

    await prisma.roomActivityLog.create({
      data: {
        userId: user.id,
        roomId: room.id,
        roomTitle: room.title,
        roomType: room.type,
        roomTag: room.tag || null,
        role: "host",
      },
    });

    await prisma.userProfile.update({
      where: { userId: user.id },
      data: {
        totalRoomsHosted: { increment: 1 },
        totalRoomsJoined: { increment: 1 },
      },
    });

    await checkAndGrantAchievements(user.id);

    return success(
      {
        room: {
          id: room.id,
          title: room.title,
          type: room.type,
          tag: room.tag,
          isPublic: room.isPublic,
          isLocked: room.isLocked,
          inviteCode: room.inviteCode,
          features: ROOM_TYPE_FEATURES[room.type as RoomType],
        },
      },
      201,
    );
  } catch (error) {
    console.error("[Room Create Error]", error);
    return badRequest("Failed to create room");
  }
}
