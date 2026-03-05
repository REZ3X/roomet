import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { success } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get("sort") || "xp";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = 20;

    const validSorts: Record<string, string> = {
      xp: "xp",
      level: "level",
      messages: "totalMessages",
      rooms_hosted: "totalRoomsHosted",
      rooms_joined: "totalRoomsJoined",
      time: "totalTimeInRooms",
      followers: "totalFollowers",
    };

    const orderField = validSorts[sort] || "xp";

    const where: Record<string, unknown> = {};
    if (search) {
      where.user = {
        OR: [
          { username: { contains: search } },
          { displayName: { contains: search } },
        ],
      };
    }

    const [profiles, total] = await Promise.all([
      prisma.userProfile.findMany({
        where,
        orderBy: { [orderField]: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              avatarType: true,
              bio: true,
              _count: {
                select: { followers: true, following: true },
              },
              achievements: {
                select: {
                  achievement: {
                    select: { key: true, icon: true, name: true },
                  },
                },
                take: 5,
                orderBy: { unlockedAt: "desc" },
              },
            },
          },
        },
      }),
      prisma.userProfile.count({ where }),
    ]);

    const leaderboard = profiles.map((p, i) => ({
      rank: (page - 1) * limit + i + 1,
      userId: p.user.id,
      username: p.user.username,
      displayName: p.user.displayName,
      avatarUrl: p.user.avatarUrl,
      bio: p.user.bio,
      level: p.level,
      xp: p.xp,
      totalMessages: p.totalMessages,
      totalRoomsHosted: p.totalRoomsHosted,
      totalRoomsJoined: p.totalRoomsJoined,
      totalTimeInRooms: p.totalTimeInRooms,
      totalFollowers: p.totalFollowers,
      selectedBadge: p.selectedBadge,
      followersCount: p.user._count.followers,
      followingCount: p.user._count.following,
      recentAchievements: p.user.achievements.map((a) => ({
        key: a.achievement.key,
        icon: a.achievement.icon,
        name: a.achievement.name,
      })),
    }));

    return success({
      leaderboard,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to load leaderboard" },
      { status: 500 },
    );
  }
}
