import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { success } from "@/lib/api-helpers";
import { ACHIEVEMENTS } from "@/lib/progression";

export async function GET(_req: NextRequest) {
  const achievements = await prisma.achievement.findMany({
    orderBy: [{ category: "asc" }, { threshold: "asc" }],
  });

  if (achievements.length === 0) {
    return success({
      achievements: ACHIEVEMENTS.map((a) => ({
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        threshold: a.threshold,
        xpReward: a.xpReward,
      })),
    });
  }

  return success({ achievements });
}
