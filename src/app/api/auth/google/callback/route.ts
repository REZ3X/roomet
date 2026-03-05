import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/auth";
import { seedAchievements } from "@/lib/progression";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:3000/api/auth/google/callback";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${APP_URL}/auth/login?error=no_code` },
    });
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return new Response(null, {
        status: 302,
        headers: { Location: `${APP_URL}/auth/login?error=token_failed` },
      });
    }

    const userRes = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      },
    );
    const googleUser = await userRes.json();

    const achCount = await prisma.achievement.count();
    if (achCount === 0) await seedAchievements();

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: googleUser.id }, { email: googleUser.email }] },
    });

    if (!user) {
      const baseUsername = (googleUser.name || googleUser.email.split("@")[0])
        .replace(/[^a-zA-Z0-9_]/g, "")
        .substring(0, 15)
        .toLowerCase();

      let username = baseUsername;
      let counter = 1;
      while (await prisma.user.findUnique({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          username,
          displayName: googleUser.name || username,
          googleId: googleUser.id,
          avatarUrl: googleUser.picture || null,
          avatarType: "google",
          emailVerified: true,
          profile: { create: {} },
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.id,
          avatarUrl: user.avatarUrl || googleUser.picture,
          emailVerified: true,
        },
      });
    }

    const token = generateToken({ userId: user.id, email: user.email });
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    return new Response(null, {
      status: 302,
      headers: { Location: `${APP_URL}/auth/callback?token=${token}` },
    });
  } catch (error) {
    console.error("[Google Auth Error]", error);
    return new Response(null, {
      status: 302,
      headers: { Location: `${APP_URL}/auth/login?error=google_auth_failed` },
    });
  }
}
