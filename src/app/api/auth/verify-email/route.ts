import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { generateToken } from "@/lib/auth";
import { badRequest } from "@/lib/api-helpers";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return badRequest("Missing verification token");
  }

  const user = await prisma.user.findFirst({
    where: {
      verifyToken: token,
      verifyTokenExp: { gt: new Date() },
    },
  });

  if (!user) {
    return badRequest("Invalid or expired verification token");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verifyToken: null,
      verifyTokenExp: null,
    },
  });

  const sessionToken = generateToken({ userId: user.id, email: user.email });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { userId: user.id, token: sessionToken, expiresAt },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${appUrl}/auth/verified?token=${encodeURIComponent(sessionToken)}`,
    },
  });
}
