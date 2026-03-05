import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {
  getAuthUser,
  unauthorized,
  success,
  badRequest,
  forbidden,
  notFound,
} from "@/lib/api-helpers";

// GET polls for a room
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;

  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!participant) return forbidden("Must be a participant");

  const polls = await prisma.poll.findMany({
    where: { roomId },
    include: {
      creator: { select: { id: true, username: true, displayName: true } },
      options: {
        include: { _count: { select: { votes: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const userVotes = await prisma.pollVote.findMany({
    where: {
      voterId: user.id,
      option: { poll: { roomId } },
    },
    select: { optionId: true },
  });
  const votedOptionIds = new Set(userVotes.map((v) => v.optionId));

  return success({
    polls: polls.map((p) => ({
      id: p.id,
      question: p.question,
      isActive: p.isActive,
      creator: p.creator,
      expiresAt: p.expiresAt,
      createdAt: p.createdAt,
      options: p.options.map((o) => ({
        id: o.id,
        text: o.text,
        voteCount: o._count.votes,
        hasVoted: votedOptionIds.has(o.id),
      })),
    })),
  });
}

// POST create a poll
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const user = await getAuthUser(req);
  if (!user) return unauthorized();

  const { roomId } = await params;

  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room?.isActive) return notFound("Room not found");

  if (!["discussion", "study", "hangout"].includes(room.type)) {
    return forbidden("Polls are not available in this room type");
  }

  const participant = await prisma.roomParticipant.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!participant?.isActive) return forbidden("Must be an active participant");

  const body = await req.json();
  const { question, options, expiresInMinutes } = body;

  if (!question || !options || options.length < 2) {
    return badRequest("Question and at least 2 options required");
  }
  if (options.length > 6) return badRequest("Maximum 6 options");

  const expiresAt = expiresInMinutes
    ? new Date(Date.now() + expiresInMinutes * 60 * 1000)
    : null;

  const poll = await prisma.poll.create({
    data: {
      roomId,
      creatorId: user.id,
      question,
      expiresAt,
      options: {
        create: options.map((text: string) => ({ text })),
      },
    },
    include: {
      creator: { select: { id: true, username: true, displayName: true } },
      options: true,
    },
  });

  return success({ poll }, 201);
}
