import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  badRequest,
  success,
  unauthorized,
} from "@/lib/api-helpers";
import { generateVerifyToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser(req);
  if (!authUser) return unauthorized();

  const user = await prisma.user.findUnique({ where: { id: authUser.id } });
  if (!user) return badRequest("User not found");

  if (user.emailVerified) {
    return badRequest("Email already verified");
  }

  if (
    user.verifyTokenExp &&
    new Date(user.verifyTokenExp).getTime() - 24 * 60 * 60 * 1000 + 60 * 1000 >
      Date.now()
  ) {
    return badRequest("Please wait before requesting another email");
  }

  const verifyToken = generateVerifyToken();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verifyToken,
      verifyTokenExp: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const sent = await sendVerificationEmail(user.email, verifyToken);

  if (!sent) {
    return badRequest(
      "Failed to send verification email. Please try again later.",
    );
  }

  return success({ message: "Verification email sent" });
}
