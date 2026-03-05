import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword, generateToken, generateVerifyToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { badRequest, success } from "@/lib/api-helpers";
import { seedAchievements } from "@/lib/progression";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, username, password, displayName } = body;

    if (!email || !username || !password) {
      return badRequest("Email, username, and password are required");
    }

    if (password.length < 6) {
      return badRequest("Password must be at least 6 characters");
    }

    if (username.length < 3 || username.length > 20) {
      return badRequest("Username must be 3-20 characters");
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return badRequest(
        "Username can only contain letters, numbers, and underscores",
      );
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      if (existingUser.email === email)
        return badRequest("Email already registered");
      return badRequest("Username already taken");
    }

    const passwordHash = await hashPassword(password);
    const verifyToken = generateVerifyToken();

    const achCount = await prisma.achievement.count();
    if (achCount === 0) await seedAchievements();

    const user = await prisma.user.create({
      data: {
        email,
        username,
        displayName: displayName || username,
        passwordHash,
        verifyToken,
        verifyTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        profile: {
          create: {},
        },
      },
    });

    const emailSent = await sendVerificationEmail(email, verifyToken);
    if (!emailSent) {
      console.log(
        `[Register] Email not sent — manual verify URL: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/verify-email?token=${verifyToken}`,
      );
    }

    const token = generateToken({ userId: user.id, email: user.email });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    return success(
      {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
        },
        token,
      },
      201,
    );
  } catch (error) {
    console.error("[Register Error]", error);
    return badRequest("Registration failed");
  }
}
