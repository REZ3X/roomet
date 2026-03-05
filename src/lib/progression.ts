import prisma from "./prisma";
import {
  LEVEL_THRESHOLDS,
  getLevelFromXP,
  getXPForNextLevel,
} from "./level-thresholds";

// Re-export for backward compatibility
export { LEVEL_THRESHOLDS, getLevelFromXP, getXPForNextLevel };

// ─── Achievement Definitions ───

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  xpReward: number;
  check: (profile: {
    totalMessages: number;
    totalRoomsJoined: number;
    totalRoomsHosted: number;
    totalTimeInRooms: number;
    totalFollowers: number;
    totalFollowing: number;
  }) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Chat achievements
  {
    key: "first_message",
    name: "First Words",
    description: "Send your first message",
    icon: "FaComment",
    category: "chat",
    threshold: 1,
    xpReward: 10,
    check: (p) => p.totalMessages >= 1,
  },
  {
    key: "chatterbox",
    name: "Chatterbox",
    description: "Send 100 messages",
    icon: "FaComments",
    category: "chat",
    threshold: 100,
    xpReward: 50,
    check: (p) => p.totalMessages >= 100,
  },
  {
    key: "motormouth",
    name: "Motormouth",
    description: "Send 500 messages",
    icon: "FaCommentDots",
    category: "chat",
    threshold: 500,
    xpReward: 150,
    check: (p) => p.totalMessages >= 500,
  },
  {
    key: "legend_speaker",
    name: "Legend Speaker",
    description: "Send 2000 messages",
    icon: "FaMicrophone",
    category: "chat",
    threshold: 2000,
    xpReward: 500,
    check: (p) => p.totalMessages >= 2000,
  },
  {
    key: "wordsmith",
    name: "Wordsmith",
    description: "Send 5000 messages",
    icon: "FaPen",
    category: "chat",
    threshold: 5000,
    xpReward: 1000,
    check: (p) => p.totalMessages >= 5000,
  },

  // Room achievements
  {
    key: "first_room",
    name: "Door Opener",
    description: "Join your first room",
    icon: "FaDoorOpen",
    category: "room",
    threshold: 1,
    xpReward: 10,
    check: (p) => p.totalRoomsJoined >= 1,
  },
  {
    key: "room_hopper",
    name: "Room Hopper",
    description: "Join 10 rooms",
    icon: "FaHouseUser",
    category: "room",
    threshold: 10,
    xpReward: 50,
    check: (p) => p.totalRoomsJoined >= 10,
  },
  {
    key: "explorer",
    name: "Explorer",
    description: "Join 50 rooms",
    icon: "FaCompass",
    category: "room",
    threshold: 50,
    xpReward: 200,
    check: (p) => p.totalRoomsJoined >= 50,
  },
  {
    key: "first_host",
    name: "Party Starter",
    description: "Host your first room",
    icon: "FaCrown",
    category: "room",
    threshold: 1,
    xpReward: 20,
    check: (p) => p.totalRoomsHosted >= 1,
  },
  {
    key: "host_master",
    name: "Host Master",
    description: "Host 20 rooms",
    icon: "FaChessKing",
    category: "room",
    threshold: 20,
    xpReward: 200,
    check: (p) => p.totalRoomsHosted >= 20,
  },
  {
    key: "host_legend",
    name: "Host Legend",
    description: "Host 100 rooms",
    icon: "FaTrophy",
    category: "room",
    threshold: 100,
    xpReward: 800,
    check: (p) => p.totalRoomsHosted >= 100,
  },

  // Social achievements
  {
    key: "first_friend",
    name: "First Friend",
    description: "Get your first follower",
    icon: "FaUserPlus",
    category: "social",
    threshold: 1,
    xpReward: 10,
    check: (p) => p.totalFollowers >= 1,
  },
  {
    key: "popular",
    name: "Popular",
    description: "Get 10 followers",
    icon: "FaUsers",
    category: "social",
    threshold: 10,
    xpReward: 50,
    check: (p) => p.totalFollowers >= 10,
  },
  {
    key: "influencer",
    name: "Influencer",
    description: "Get 50 followers",
    icon: "FaStar",
    category: "social",
    threshold: 50,
    xpReward: 300,
    check: (p) => p.totalFollowers >= 50,
  },
  {
    key: "celebrity",
    name: "Celebrity",
    description: "Get 200 followers",
    icon: "FaGem",
    category: "social",
    threshold: 200,
    xpReward: 1000,
    check: (p) => p.totalFollowers >= 200,
  },

  // Time achievements
  {
    key: "time_1h",
    name: "Warm Up",
    description: "Spend 1 hour in rooms",
    icon: "FaClock",
    category: "time",
    threshold: 3600,
    xpReward: 20,
    check: (p) => p.totalTimeInRooms >= 3600,
  },
  {
    key: "time_10h",
    name: "Dedicated",
    description: "Spend 10 hours in rooms",
    icon: "FaHourglass",
    category: "time",
    threshold: 36000,
    xpReward: 100,
    check: (p) => p.totalTimeInRooms >= 36000,
  },
  {
    key: "time_100h",
    name: "No Life",
    description: "Spend 100 hours in rooms",
    icon: "FaFire",
    category: "time",
    threshold: 360000,
    xpReward: 500,
    check: (p) => p.totalTimeInRooms >= 360000,
  },
  {
    key: "time_500h",
    name: "Immortal",
    description: "Spend 500 hours in rooms",
    icon: "FaSkull",
    category: "time",
    threshold: 1800000,
    xpReward: 2000,
    check: (p) => p.totalTimeInRooms >= 1800000,
  },
];

// ─── Seed achievements into DB ───

export async function seedAchievements() {
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      update: {
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        threshold: a.threshold,
        xpReward: a.xpReward,
      },
      create: {
        key: a.key,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        threshold: a.threshold,
        xpReward: a.xpReward,
      },
    });
  }
}

// ─── Check & grant achievements ───

export async function checkAndGrantAchievements(
  userId: string,
): Promise<string[]> {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) return [];

  const existing = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
  });
  const existingKeys = new Set(existing.map((a) => a.achievement.key));

  const newlyGranted: string[] = [];

  for (const achDef of ACHIEVEMENTS) {
    if (existingKeys.has(achDef.key)) continue;

    if (achDef.check(profile)) {
      const achievement = await prisma.achievement.findUnique({
        where: { key: achDef.key },
      });
      if (!achievement) continue;

      await prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id },
      });

      // Grant XP
      await prisma.userProfile.update({
        where: { userId },
        data: {
          xp: { increment: achDef.xpReward },
          level: getLevelFromXP(profile.xp + achDef.xpReward),
        },
      });

      newlyGranted.push(achDef.key);
    }
  }

  return newlyGranted;
}

// ─── Add XP helper ───

export async function addXP(userId: string, amount: number) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  if (!profile) return;

  const newXP = profile.xp + amount;
  const newLevel = getLevelFromXP(newXP);

  await prisma.userProfile.update({
    where: { userId },
    data: { xp: newXP, level: newLevel },
  });
}
