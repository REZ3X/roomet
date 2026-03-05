import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  badRequest,
} from "@/lib/api-helpers";
import { saveFile } from "@/lib/storage";
import { checkAndGrantAchievements } from "@/lib/progression";

// GET own profile
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      profile: true,
      achievements: { include: { achievement: true } },
      _count: { select: { followers: true, following: true } },
    },
  });

  if (!fullUser) return unauthorized();

  return success({
    id: fullUser.id,
    email: fullUser.email,
    username: fullUser.username,
    displayName: fullUser.displayName,
    avatarUrl: fullUser.avatarUrl,
    avatarType: fullUser.avatarType,
    bio: fullUser.bio,
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
    followersCount: fullUser._count.followers,
    followingCount: fullUser._count.following,
  });
}

// PATCH update own profile
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const avatar = formData.get("avatar") as File | null;
      const displayName = formData.get("displayName") as string | null;
      const bio = formData.get("bio") as string | null;
      const selectedBadge = formData.get("selectedBadge") as string | null;

      const updateData: Record<string, unknown> = {};

      if (avatar) {
        const saved = await saveFile(avatar, "avatars");
        updateData.avatarUrl = saved.url;
        updateData.avatarType = "custom";
      }

      if (displayName !== null) updateData.displayName = displayName;
      if (bio !== null) updateData.bio = bio;

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      if (selectedBadge !== null) {
        await prisma.userProfile.update({
          where: { userId: user.id },
          data: { selectedBadge },
        });
      }

      return success({
        id: updated.id,
        displayName: updated.displayName,
        avatarUrl: updated.avatarUrl,
        avatarType: updated.avatarType,
        bio: updated.bio,
      });
    }

    const body = await req.json();
    const { displayName, bio, selectedBadge, avatarType } = body;

    const updateData: Record<string, unknown> = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarType !== undefined) updateData.avatarType = avatarType;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    if (selectedBadge !== undefined) {
      await prisma.userProfile.update({
        where: { userId: user.id },
        data: { selectedBadge },
      });
    }

    await checkAndGrantAchievements(user.id);

    return success({
      id: updated.id,
      displayName: updated.displayName,
      avatarUrl: updated.avatarUrl,
      avatarType: updated.avatarType,
      bio: updated.bio,
    });
  } catch (error) {
    console.error("[Profile Update Error]", error);
    return badRequest("Failed to update profile");
  }
}
