import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  notFound,
} from "@/lib/api-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { username } = await params;

  const target = await prisma.user.findUnique({
    where: { username },
    include: {
      profile: true,
      achievements: { include: { achievement: true } },
      _count: { select: { followers: true, following: true } },
    },
  });

  if (!target) return notFound("User not found");

  const isFollowing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: user.id, followingId: target.id },
    },
  });

  const isFollowedBack = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: target.id, followingId: user.id },
    },
  });

  return success({
    id: target.id,
    username: target.username,
    displayName: target.displayName,
    avatarUrl: target.avatarUrl,
    bio: target.bio,
    publicKey: target.publicKey,
    createdAt: target.createdAt,
    profile: target.profile,
    achievements: target.achievements.map((a) => ({
      key: a.achievement.key,
      name: a.achievement.name,
      icon: a.achievement.icon,
      description: a.achievement.description,
      category: a.achievement.category,
      unlockedAt: a.unlockedAt,
    })),
    followersCount: target._count.followers,
    followingCount: target._count.following,
    isFollowing: !!isFollowing,
    isFriend: !!isFollowing && !!isFollowedBack,
  });
}
