import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  badRequest,
  notFound,
} from "@/lib/api-helpers";
import { checkAndGrantAchievements } from "@/lib/progression";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { username } = await params;

  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return notFound("User not found");
  if (target.id === user.id) return badRequest("Cannot follow yourself");

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: user.id, followingId: target.id },
    },
  });

  if (existing) return badRequest("Already following this user");

  await prisma.follow.create({
    data: { followerId: user.id, followingId: target.id },
  });

  await prisma.userProfile.update({
    where: { userId: user.id },
    data: { totalFollowing: { increment: 1 } },
  });
  await prisma.userProfile.update({
    where: { userId: target.id },
    data: { totalFollowers: { increment: 1 } },
  });

  await checkAndGrantAchievements(user.id);
  await checkAndGrantAchievements(target.id);

  return success({ message: "Followed successfully" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { username } = await params;

  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) return notFound("User not found");

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: { followerId: user.id, followingId: target.id },
    },
  });

  if (!existing) return badRequest("Not following this user");

  await prisma.follow.delete({ where: { id: existing.id } });

  await prisma.userProfile.update({
    where: { userId: user.id },
    data: { totalFollowing: { decrement: 1 } },
  });
  await prisma.userProfile.update({
    where: { userId: target.id },
    data: { totalFollowers: { decrement: 1 } },
  });

  return success({ message: "Unfollowed successfully" });
}
