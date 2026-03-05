import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  badRequest,
} from "@/lib/api-helpers";

// POST vote on a poll option
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string; pollId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId, pollId } = await params;

  const poll = await prisma.poll.findFirst({
    where: { id: pollId, roomId },
    include: { options: true },
  });

  if (!poll) return badRequest("Poll not found");
  if (!poll.isActive) return badRequest("Poll is closed");
  if (poll.expiresAt && poll.expiresAt < new Date())
    return badRequest("Poll expired");

  const body = await req.json();
  const { optionId } = body;

  if (!optionId) return badRequest("Option ID required");
  if (!poll.options.some((o) => o.id === optionId))
    return badRequest("Invalid option");

  const existingVote = await prisma.pollVote.findFirst({
    where: {
      voterId: user.id,
      option: { pollId },
    },
  });

  if (existingVote) return badRequest("Already voted on this poll");

  await prisma.pollVote.create({
    data: { optionId, voterId: user.id },
  });

  return success({ message: "Vote recorded" });
}
