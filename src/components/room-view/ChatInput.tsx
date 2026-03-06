"use client";

import { useRef } from "react";
import {
  FaPaperPlane,
  FaPlus,
  FaTimes,
  FaFile,
  FaMicrophoneAlt,
} from "@/components/Icons";

interface ChatInputProps {
  inputText: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onTyping: () => void;
  roomKey: string | null;
  features: Record<string, unknown> | null;

  pendingFile: File | null;
  pendingPreview: string | null;
  captionText: string;
  onCaptionChange: (value: string) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendFile: () => void;
  onCancelFile: () => void;
}

export default function ChatInput({
  inputText,
  onInputChange,
  onSend,
  onTyping,
  roomKey,
  features,
  pendingFile,
  pendingPreview,
  captionText,
  onCaptionChange,
  onFileSelect,
  onSendFile,
  onCancelFile,
}: ChatInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Media Preview (before sending) */}
      {pendingFile && (
        <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {pendingPreview ? (
                <img
                  src={pendingPreview}
                  alt="Preview"
                  className="w-20 h-20 rounded-lg object-cover border border-[var(--border)]"
                />
              ) : pendingFile.type.startsWith("audio/") ? (
                <div className="w-14 h-14 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                  <FaMicrophoneAlt size={18} className="text-[var(--accent)]" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-center">
                  <FaFile size={18} className="text-[var(--text-muted)]" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-[var(--text-secondary)] truncate mb-1.5">
                {pendingFile.name}{" "}
                <span className="text-[var(--text-muted)]">
                  ({(pendingFile.size / 1024).toFixed(1)} KB)
                </span>
              </p>
              <input
                type="text"
                value={captionText}
                onChange={(e) => onCaptionChange(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !e.shiftKey && onSendFile()
                }
                placeholder="Add a caption... (optional)"
                className="w-full input-base px-2.5 py-1.5 text-[12px]"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 pt-1">
              <button
                type="button"
                onClick={onCancelFile}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-coral)] hover:bg-[var(--accent-coral)]/8 transition-colors cursor-pointer"
                title="Cancel"
              >
                <FaTimes size={13} />
              </button>
              <button
                type="button"
                onClick={onSendFile}
                className="p-1.5 bg-[var(--accent)] rounded-md text-white hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
                title="Send"
              >
                <FaPaperPlane size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-3 sm:px-4 py-2 sm:py-2.5 border-t border-[var(--border)]">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {!!(
            features?.sendImages ||
            features?.sendVideos ||
            features?.sendDocuments ||
            features?.sendAudio
          ) && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept={[
                  features?.sendImages ? "image/*" : "",
                  features?.sendAudio || features?.voiceNotes ? "audio/*" : "",
                  features?.sendVideos ? "video/*" : "",
                  features?.sendDocuments
                    ? ".pdf,.doc,.docx,.txt,.xlsx,.pptx,.zip,.rar"
                    : "",
                ]
                  .filter(Boolean)
                  .join(",")}
                onChange={onFileSelect}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-[var(--bg-hover)] rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--accent)]"
              >
                <FaPlus size={13} />
              </button>
            </>
          )}
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              onInputChange(e.target.value);
              onTyping();
            }}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onSend()}
            placeholder="Type a message..."
            className="flex-1 input-base px-2.5 sm:px-3 py-2 text-[13px]"
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!inputText.trim() || !roomKey}
            className="p-2 bg-[var(--accent)] rounded-md text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-30"
          >
            <FaPaperPlane size={13} />
          </button>
        </div>
        {!roomKey && (
          <p className="text-[11px] text-[var(--accent-amber)] mt-1 ml-1">
            Setting up encryption...
          </p>
        )}
      </div>
    </>
  );
}
