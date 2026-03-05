import dotenv from "dotenv";
dotenv.config();

import { seedAchievements } from "../src/lib/progression";
import prisma from "../src/lib/prisma";

async function main() {
  console.log("Seeding achievements...");
  await seedAchievements();
  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
