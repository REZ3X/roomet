import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, unauthorized, success } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      profile: true,
      achievements: { include: { achievement: true } },
    },
  });

  if (!fullUser) return unauthorized();

  return success({
    user: {
      id: fullUser.id,
      email: fullUser.email,
      username: fullUser.username,
      displayName: fullUser.displayName,
      avatarUrl: fullUser.avatarUrl,
      avatarType: fullUser.avatarType,
      bio: fullUser.bio,
      emailVerified: fullUser.emailVerified,
      publicKey: fullUser.publicKey,
      createdAt: fullUser.createdAt,
      profile: fullUser.profile,
      achievements: fullUser.achievements.map((a) => ({
        key: a.achievement.key,
        name: a.achievement.name,
        icon: a.achievement.icon,
        description: a.achievement.description,
        category: a.achievement.category,
        unlockedAt: a.unlockedAt,
      })),
    },
  });
}
