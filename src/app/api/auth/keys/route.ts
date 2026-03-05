import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  badRequest,
} from "@/lib/api-helpers";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  try {
    const { publicKey } = await req.json();
    if (!publicKey) return badRequest("Public key is required");

    await prisma.user.update({
      where: { id: user.id },
      data: { publicKey },
    });

    return success({ message: "Public key stored" });
  } catch (error) {
    console.error("[Keys Error]", error);
    return badRequest("Failed to store keys");
  }
}
