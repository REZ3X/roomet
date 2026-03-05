import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, unauthorized, success } from "@/lib/api-helpers";

// GET friends (mutual follows) for inviting to rooms
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const following = await prisma.follow.findMany({
    where: { followerId: user.id },
    select: { followingId: true },
  });
  const followingIds = following.map((f) => f.followingId);

  const friends = await prisma.follow.findMany({
    where: {
      followerId: { in: followingIds },
      followingId: user.id,
    },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
        },
      },
    },
  });

  return success({
    friends: friends.map((f) => f.follower),
  });
}
