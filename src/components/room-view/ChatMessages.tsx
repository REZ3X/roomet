"use client";

import { useRef } from "react";
import type { Message } from "./types";
import DecryptedMedia from "./DecryptedMedia";
import { FaDownload, FaPlay, FaPause } from "@/components/Icons";

interface ChatMessagesProps {
  messages: Message[];
  userId: string | undefined;
  roomKey: string | null;
  audioPlaying: string | null;
  onToggleAudio: (url: string) => void;
  onViewImage: (url: string) => void;
  onScrollToBottom: (instant?: boolean) => void;
}

export default function ChatMessages({
  messages,
  userId,
  roomKey,
  audioPlaying,
  onToggleAudio,
  onViewImage,
  onScrollToBottom,
}: ChatMessagesProps) {
  const mediaLoadingSpinner = (
    <div className="flex items-center justify-center py-4 px-8">
      <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
    </div>
  );

  const renderMessage = (msg: Message) => {
    const isOwn = msg.sender.id === userId;
    const content = msg.decryptedContent || "[encrypted]";

    const caption =
      msg.type !== "text" && content.startsWith("__CAPTION__:")
        ? content.slice("__CAPTION__:".length)
        : null;

    return (
      <div
        key={msg.id}
        className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}
      >
        <div className={`max-w-[70%] ${isOwn ? "order-2" : ""}`}>
          {!isOwn && (
            <span className="text-[11px] text-[var(--text-muted)] ml-1 mb-0.5 block">
              {msg.sender.displayName}
            </span>
          )}
          <div
            className={`rounded-lg px-3 py-2 ${
              isOwn
                ? "bg-[var(--own-bubble)] text-[var(--own-bubble-text)]"
                : "bg-[var(--other-bubble)] text-[var(--other-bubble-text)] border border-[var(--other-bubble-border)]"
            }`}
          >
            {msg.type === "text" && (
              <p className="text-[13px] whitespace-pre-wrap break-words">
                {content}
              </p>
            )}

            {msg.type === "image" && msg.mediaUrl && (
              <DecryptedMedia
                mediaUrl={msg.mediaUrl}
                mimeType={msg.mediaMimeType}
                roomKey={roomKey}
                onDecrypted={() => onScrollToBottom(false)}
              >
                {(decUrl, loading) =>
                  loading ? (
                    mediaLoadingSpinner
                  ) : (
                    <div>
                      <img
                        src={decUrl || msg.mediaUrl}
                        alt={msg.mediaName || "Image"}
                        className="rounded-md max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => onViewImage(decUrl || msg.mediaUrl!)}
                      />
                      {caption && (
                        <p className="text-[13px] mt-1.5 whitespace-pre-wrap break-words">
                          {caption}
                        </p>
                      )}
                    </div>
                  )
                }
              </DecryptedMedia>
            )}

            {msg.type === "audio" && msg.mediaUrl && (
              <DecryptedMedia
                mediaUrl={msg.mediaUrl}
                mimeType={msg.mediaMimeType}
                roomKey={roomKey}
                onDecrypted={() => onScrollToBottom(false)}
              >
                {(decUrl, loading) =>
                  loading ? (
                    mediaLoadingSpinner
                  ) : (
                    <div>
                      <div className="flex items-center gap-2.5 min-w-[180px]">
                        <button
                          type="button"
                          onClick={() => onToggleAudio(decUrl || msg.mediaUrl!)}
                          className="w-8 h-8 rounded-md bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer"
                        >
                          {audioPlaying === (decUrl || msg.mediaUrl) ? (
                            <FaPause size={11} />
                          ) : (
                            <FaPlay size={11} />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className="text-[11px] font-medium">
                            {msg.mediaName || "Audio"}
                          </p>
                          <div className="h-0.5 bg-white/20 rounded-full mt-1">
                            <div className="h-full w-0 bg-white/60 rounded-full" />
                          </div>
                        </div>
                        <a
                          href={decUrl || msg.mediaUrl}
                          download={msg.mediaName || "audio"}
                          className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                          title="Download"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FaDownload size={10} />
                        </a>
                      </div>
                      {caption && (
                        <p className="text-[13px] mt-1.5 whitespace-pre-wrap break-words">
                          {caption}
                        </p>
                      )}
                    </div>
                  )
                }
              </DecryptedMedia>
            )}

            {msg.type === "video" && msg.mediaUrl && (
              <DecryptedMedia
                mediaUrl={msg.mediaUrl}
                mimeType={msg.mediaMimeType}
                roomKey={roomKey}
                onDecrypted={() => onScrollToBottom(false)}
              >
                {(decUrl, loading) =>
                  loading ? (
                    mediaLoadingSpinner
                  ) : (
                    <div>
                      <video
                        src={decUrl || msg.mediaUrl}
                        controls
                        className="rounded-lg max-h-60"
                        preload="metadata"
                      />
                      {caption ? (
                        <p className="text-[13px] mt-1.5 whitespace-pre-wrap break-words">
                          {caption}
                        </p>
                      ) : (
                        <p className="text-xs mt-1 opacity-70">
                          {msg.mediaName}
                        </p>
                      )}
                    </div>
                  )
                }
              </DecryptedMedia>
            )}

            {msg.type === "document" && msg.mediaUrl && (
              <DecryptedMedia
                mediaUrl={msg.mediaUrl}
                mimeType={msg.mediaMimeType}
                roomKey={roomKey}
                onDecrypted={() => onScrollToBottom(false)}
              >
                {(decUrl, loading) =>
                  loading ? (
                    mediaLoadingSpinner
                  ) : (
                    <div>
                      <a
                        href={decUrl || msg.mediaUrl}
                        download={msg.mediaName}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                      >
                        <FaDownload size={13} />
                        <div>
                          <p className="text-[13px] font-medium">
                            {msg.mediaName || "Document"}
                          </p>
                          {msg.mediaSize && (
                            <p className="text-[11px] opacity-70">
                              {(msg.mediaSize / 1024).toFixed(1)} KB
                            </p>
                          )}
                        </div>
                      </a>
                      {caption && (
                        <p className="text-[13px] mt-1.5 whitespace-pre-wrap break-words">
                          {caption}
                        </p>
                      )}
                    </div>
                  )
                }
              </DecryptedMedia>
            )}
          </div>
          <span className="text-[10px] text-[var(--text-muted)] ml-2 mt-0.5 block">
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    );
  };

  return <>{messages.map(renderMessage)}</>;
}
