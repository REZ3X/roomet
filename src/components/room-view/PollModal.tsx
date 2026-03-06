"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { pollAPI } from "@/lib/api-client";
import { FaChartBar, FaTimes } from "@/components/Icons";

interface PollModalProps {
  roomId: string;
  polls: Record<string, unknown>[];
  onClose: () => void;
  onPollCreated: (poll: Record<string, unknown>) => void;
}

export default function PollModal({
  roomId,
  polls,
  onClose,
  onPollCreated,
}: PollModalProps) {
  const { token } = useAuth();
  const { emitPollUpdate } = useSocket();
  const [creating, setCreating] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const handleCreate = async () => {
    if (
      !token ||
      !question.trim() ||
      options.filter((o) => o.trim()).length < 2
    )
      return;
    try {
      const data = await pollAPI.create(token, roomId, {
        question,
        options: options.filter((o) => o.trim()),
      });
      onPollCreated(data.poll);
      emitPollUpdate(roomId, data.poll);
      setCreating(false);
      setQuestion("");
      setOptions(["", ""]);
    } catch (error) {
      console.error("Create poll failed:", error);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!token) return;
    try {
      await pollAPI.vote(token, roomId, pollId, optionId);
      const updated = await pollAPI.list(token, roomId);
      emitPollUpdate(roomId, updated.polls.find((p) => p.id === pollId) || {});
    } catch (error) {
      console.error("Vote failed:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <FaChartBar className="text-[var(--accent)]" size={13} /> Polls
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
          >
            <FaTimes className="text-[var(--text-muted)]" size={13} />
          </button>
        </div>

        {/* Create Poll */}
        {creating ? (
          <div className="mb-3 p-3 bg-[var(--bg-elevated)] rounded-md">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question..."
              className="w-full input-base px-3 py-1.5 text-[13px] mb-2"
            />
            {options.map((opt, i) => (
              <input
                key={`opt-${i}`}
                type="text"
                value={opt}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                placeholder={`Option ${i + 1}`}
                className="w-full input-base px-3 py-1.5 text-[13px] mb-1.5"
              />
            ))}
            {options.length < 6 && (
              <button
                type="button"
                onClick={() => setOptions([...options, ""])}
                className="text-[11px] text-[var(--accent)] hover:text-[var(--accent-hover)] mb-2"
              >
                + Add option
              </button>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreate}
                className="flex-1 btn-primary text-[13px] py-1.5 rounded-md"
              >
                Create Poll
              </button>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="px-3 bg-[var(--bg-elevated)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] text-[13px] py-1.5 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="w-full mb-3 py-1.5 border border-dashed border-[var(--border)] rounded-md text-[13px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]/50 transition-colors"
          >
            + Create new poll
          </button>
        )}

        {/* Poll List */}
        {polls.map((poll) => {
          const opts = (poll.options || []) as Array<Record<string, unknown>>;
          const totalVotes = opts.reduce(
            (sum, o) => sum + ((o.voteCount as number) || 0),
            0,
          );

          return (
            <div
              key={poll.id as string}
              className="mb-3 p-3 bg-[var(--bg-elevated)] rounded-md"
            >
              <p className="text-[13px] font-medium text-[var(--text-primary)] mb-2">
                {poll.question as string}
              </p>
              {opts.map((opt) => {
                const count = (opt.voteCount as number) || 0;
                const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                const hasVoted = opt.hasVoted as boolean;

                return (
                  <button
                    key={opt.id as string}
                    type="button"
                    onClick={() =>
                      !hasVoted &&
                      handleVote(poll.id as string, opt.id as string)
                    }
                    disabled={!!hasVoted}
                    className="w-full mb-1.5 relative overflow-hidden rounded-md border border-[var(--border)] text-left"
                  >
                    <div
                      className="absolute inset-0 bg-[var(--accent)]/12 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex justify-between px-2.5 py-1.5 text-[13px]">
                      <span
                        className={
                          hasVoted
                            ? "text-[var(--accent)]"
                            : "text-[var(--text-secondary)]"
                        }
                      >
                        {opt.text as string}
                      </span>
                      <span className="text-[var(--text-muted)] text-[11px]">
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  </button>
                );
              })}
              {!poll.isActive && (
                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                  Poll ended
                </p>
              )}
            </div>
          );
        })}

        {polls.length === 0 && !creating && (
          <p className="text-center text-[var(--text-muted)] text-[13px] py-4">
            No polls yet
          </p>
        )}
      </div>
    </div>
  );
}
