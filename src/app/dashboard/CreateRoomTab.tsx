"use client";

import { useState } from "react";
import { roomAPI } from "@/lib/api-client";
import { ROOM_TYPE_FEATURES, type RoomType } from "@/lib/room-types";
import { DynamicIcon, FaPlus, FaLock, FaGlobe } from "@/components/Icons";

export default function CreateRoomTab({
  token,
  onCreated,
}: {
  token: string;
  onCreated: (roomId: string) => void;
}) {
  const [form, setForm] = useState({
    title: "",
    type: "chatting" as RoomType,
    tag: "",
    isPublic: true,
    isLocked: false,
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await roomAPI.create(token, form);
      onCreated(data.room.id as string);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  const selectedFeatures = ROOM_TYPE_FEATURES[form.type];

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-xl">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Create a Room
        </h2>
        <p className="text-[var(--text-muted)] text-[13px] mb-5">
          Set up your own space
        </p>

        {error && (
          <div className="mb-4 px-3 py-2.5 bg-[var(--accent-coral)]/8 border border-[var(--accent-coral)]/15 rounded-md text-[var(--accent-coral)] text-[13px]">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-2">
              Room Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(ROOM_TYPE_FEATURES).map(([type, feat]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setForm((p) => ({ ...p, type: type as RoomType }))
                  }
                  className={`p-3 rounded-lg border transition-colors text-left ${form.type === type ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] hover:bg-[var(--bg-hover)]"}`}
                >
                  <DynamicIcon
                    name={feat.icon}
                    size={16}
                    className="mb-1.5"
                    style={{ color: feat.color }}
                  />
                  <p className="font-medium text-[var(--text-primary)] text-[13px] capitalize">
                    {type}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                    {feat.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-elevated)] rounded-lg">
            <p className="text-[11px] text-[var(--text-muted)] mb-1.5 uppercase tracking-wider font-medium">
              Features
            </p>
            <div className="flex flex-wrap gap-1">
              {selectedFeatures.textChat && (
                <span className="px-2 py-0.5 bg-[var(--accent-green)]/8 text-[var(--accent-green)] text-[11px] rounded">
                  Text Chat
                </span>
              )}
              {selectedFeatures.voiceNotes && (
                <span className="px-2 py-0.5 bg-[var(--accent)]/8 text-[var(--accent)] text-[11px] rounded">
                  Voice Notes
                </span>
              )}
              {selectedFeatures.sendImages && (
                <span className="px-2 py-0.5 bg-[var(--accent-amber)]/8 text-[var(--accent-amber)] text-[11px] rounded">
                  Images
                </span>
              )}
              {selectedFeatures.sendAudio && (
                <span className="px-2 py-0.5 bg-[var(--accent)]/8 text-[var(--accent)] text-[11px] rounded">
                  Audio
                </span>
              )}
              {selectedFeatures.sendVideos && (
                <span className="px-2 py-0.5 bg-[var(--accent-coral)]/8 text-[var(--accent-coral)] text-[11px] rounded">
                  Videos
                </span>
              )}
              {selectedFeatures.sendDocuments && (
                <span className="px-2 py-0.5 bg-[var(--accent-amber)]/8 text-[var(--accent-amber)] text-[11px] rounded">
                  Documents
                </span>
              )}
              {selectedFeatures.polling && (
                <span className="px-2 py-0.5 bg-[var(--accent)]/8 text-[var(--accent)] text-[11px] rounded">
                  Polls
                </span>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
                Room Title
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                required
                maxLength={100}
                className="w-full input-base px-3 py-[9px] text-sm"
                placeholder="Give it a name"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
                Tag (optional)
              </label>
              <input
                type="text"
                value={form.tag}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tag: e.target.value }))
                }
                className="w-full input-base px-3 py-[9px] text-sm"
                placeholder="e.g. gaming, study"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2.5 p-2.5 bg-[var(--bg-elevated)] rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isPublic: e.target.checked }))
                }
                className="w-3.5 h-3.5 accent-[var(--accent)]"
              />
              <div>
                <p className="text-[13px] text-[var(--text-primary)] flex items-center gap-1.5">
                  <FaGlobe size={10} className="text-[var(--accent-green)]" />{" "}
                  Public
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Listed for everyone
                </p>
              </div>
            </label>
            <label className="flex items-center gap-2.5 p-2.5 bg-[var(--bg-elevated)] rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={form.isLocked}
                onChange={(e) =>
                  setForm((p) => ({ ...p, isLocked: e.target.checked }))
                }
                className="w-3.5 h-3.5 accent-[var(--accent-amber)]"
              />
              <div>
                <p className="text-[13px] text-[var(--text-primary)] flex items-center gap-1.5">
                  <FaLock size={10} className="text-[var(--accent-amber)]" />{" "}
                  Locked
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Requires password
                </p>
              </div>
            </label>
          </div>

          {form.isLocked && (
            <div>
              <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1">
                Room Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
                required={form.isLocked}
                className="w-full input-base px-3 py-[9px] text-sm"
                placeholder="Set a password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-[9px] btn-primary text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              "Creating..."
            ) : (
              <>
                <FaPlus size={11} /> Create Room
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
