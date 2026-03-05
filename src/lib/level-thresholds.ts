// ─── XP & Level Thresholds ───
// Shared between server (progression.ts) and client components

export const LEVEL_THRESHOLDS = [
  0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200, 6600, 8200, 10000,
  12000, 14500, 17500, 21000, 25000, 30000, 36000,
];

export function getLevelFromXP(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXPForNextLevel(currentLevel: number): number {
  if (currentLevel >= LEVEL_THRESHOLDS.length)
    return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] * 2;
  return LEVEL_THRESHOLDS[currentLevel];
}
