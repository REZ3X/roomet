import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, unauthorized, success } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const page = Number.parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
  const limit = 20;

  const [logs, total] = await Promise.all([
    prisma.roomActivityLog.findMany({
      where: { userId: user.id },
      orderBy: { joinedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.roomActivityLog.count({ where: { userId: user.id } }),
  ]);

  return success({
    logs: logs.map((log) => ({
      id: log.id,
      roomId: log.roomId,
      roomTitle: log.roomTitle,
      roomType: log.roomType,
      roomTag: log.roomTag,
      role: log.role,
      joinedAt: log.joinedAt,
      leftAt: log.leftAt,
      duration: log.duration,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
