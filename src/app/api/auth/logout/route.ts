import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthUser, unauthorized, success } from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.substring(7);

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  return success({ message: "Logged out successfully" });
}
