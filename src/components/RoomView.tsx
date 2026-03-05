"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth, getPrivateKey } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { chatAPI, roomAPI, pollAPI, profileAPI } from "@/lib/api-client";
import {
  encryptMessage,
  decryptMessage,
  generateRoomKey,
  encryptRoomKeyForUser,
  decryptRoomKey,
  encryptFileWithEmbeddedIV,
  decryptFileWithEmbeddedIV,
} from "@/lib/encryption";
import {
  DynamicIcon,
  FaPaperPlane,
  FaImage,
  FaFile,
  FaMicrophoneAlt,
  FaArrowLeft,
  FaCrown,
  FaUsers,
  FaLock,
  FaGlobe,
  FaCopy,
  FaLink,
  FaChartBar,
  FaTimes,
  FaDownload,
  FaPlay,
  FaPause,
  FaPlus,
  FaDoorOpen,
  FaPowerOff,
  FaUserPlus,
  FaSearch,
  FaClock,
} from "@/components/Icons";
import { ROOM_TYPE_FEATURES, type RoomType } from "@/lib/room-types";

interface Message {
  id: string;
  type: string;
  encryptedContent: string;
  iv: string;
  mediaUrl?: string;
  mediaName?: string;
  mediaMimeType?: string;
  mediaSize?: number;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  decryptedContent?: string;
}

interface RoomViewProps {
  roomId: string;
  onLeave: () => void;
}

// ─── Global cache for decrypted media blob URLs ───
const mediaDecryptCache = new Map<string, string>();

function DecryptedMedia({
  mediaUrl,
  mimeType,
  roomKey,
  onDecrypted,
  children,
}: {
  mediaUrl: string;
  mimeType?: string;
  roomKey: string | null;
  onDecrypted?: () => void;
  children: (decryptedUrl: string | null, loading: boolean) => React.ReactNode;
}) {
  const [url, setUrl] = useState<string | null>(
    mediaDecryptCache.get(mediaUrl) || null,
  );
  const [loading, setLoading] = useState(!mediaDecryptCache.has(mediaUrl));

  useEffect(() => {
    if (!mediaUrl || !roomKey || mediaDecryptCache.has(mediaUrl)) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(mediaUrl);
        const buf = await res.arrayBuffer();
        const decrypted = await decryptFileWithEmbeddedIV(buf, roomKey);
        if (!cancelled) {
          const blob = new Blob([decrypted], {
            type: mimeType || "application/octet-stream",
          });
          const blobUrl = URL.createObjectURL(blob);
          mediaDecryptCache.set(mediaUrl, blobUrl);
          setUrl(blobUrl);
          onDecrypted?.();
        }
      } catch {
        // Backward compat: file may not be encrypted (old messages)
        if (!cancelled) {
          mediaDecryptCache.set(mediaUrl, mediaUrl);
          setUrl(mediaUrl);
          onDecrypted?.();
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [mediaUrl, roomKey, mimeType, onDecrypted]);

  return <>{children(url, loading)}</>;
}

export default function RoomView({ roomId, onLeave }: RoomViewProps) {
  const { user, token } = useAuth();
  const {
    socket,
    joinRoom,
    leaveRoom,
    sendMessage: emitMessage,
    startTyping,
    stopTyping,
    emitInviteNotification,
    emitMessageNotification,
  } = useSocket();

  const [room, setRoom] = useState<Record<string, unknown> | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [roomKey, setRoomKey] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(
    new Map(),
  );
  const [showPollModal, setShowPollModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [polls, setPolls] = useState<Record<string, unknown>[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const [showInviteFriends, setShowInviteFriends] = useState(false);
  const [sidebarFriends, setSidebarFriends] = useState<
    Record<string, unknown>[]
  >([]);
  const [sidebarFriendsLoading, setSidebarFriendsLoading] = useState(false);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [friendSearch, setFriendSearch] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState("");
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  const [roomElapsed, setRoomElapsed] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const features = room
    ? ROOM_TYPE_FEATURES[room.type as string as RoomType]
    : null;

  // Load room data and setup encryption
  useEffect(() => {
    if (!token || !user) return;

    const loadRoom = async () => {
      try {
        const data = await roomAPI.get(token, roomId);
        setRoom(data);

        // Setup E2E encryption — derive room key first
        let derivedKey: string | null = null;
        const privateKey = getPrivateKey();
        if ((data as Record<string, unknown>).encryptedRoomKey && privateKey) {
          derivedKey = await decryptRoomKey(
            (data as Record<string, unknown>).encryptedRoomKey as string,
            privateKey,
          );
        } else if ((data as Record<string, unknown>).isParticipant) {
          // Host creates new room key
          const hostId = (
            (data as Record<string, unknown>).host as Record<string, unknown>
          )?.id;
          if (hostId === user.id) {
            derivedKey = await generateRoomKey();

            // Distribute keys to participants (non-blocking)
            try {
              const participants = (data as Record<string, unknown>)
                .participants as Array<Record<string, unknown>>;
              const keys: { userId: string; encryptedKey: string }[] = [];
              for (const p of participants) {
                if (p.publicKey) {
                  const encrypted = await encryptRoomKeyForUser(
                    derivedKey,
                    p.publicKey as string,
                  );
                  keys.push({
                    userId: p.id as string,
                    encryptedKey: encrypted,
                  });
                }
              }
              if (keys.length > 0) {
                await roomAPI.distributeKeys(token, roomId, keys);
              }
            } catch (keyError) {
              console.warn(
                "Key distribution failed, will retry on next load:",
                keyError,
              );
            }
          }
        }

        // Load messages and decrypt them inline with the derived key
        const msgData = await chatAPI.getMessages(token, roomId);
        let loadedMessages = msgData.messages as unknown as Message[];

        if (derivedKey) {
          loadedMessages = await Promise.all(
            loadedMessages.map(async (msg) => {
              if (msg.type === "system") return msg;
              try {
                const content = await decryptMessage(
                  msg.encryptedContent,
                  msg.iv,
                  derivedKey,
                );
                return { ...msg, decryptedContent: content };
              } catch {
                return { ...msg, decryptedContent: "[encrypted]" };
              }
            }),
          );
        }

        setMessages(loadedMessages);
        setRoomKey(derivedKey);

        // Load polls if room supports them
        const roomType = (data as Record<string, unknown>).type as string;
        if (["discussion", "study", "hangout"].includes(roomType)) {
          const pollData = await pollAPI.list(token, roomId);
          setPolls(pollData.polls);
        }

        // Join socket room
        joinRoom(roomId);
      } catch (error) {
        console.error("Failed to load room:", error);
      }
    };

    loadRoom();

    return () => {
      leaveRoom(roomId);
    };
  }, [token, user, roomId, joinRoom, leaveRoom]);

  // Decrypt messages when room key is available (handles late key arrival)
  useEffect(() => {
    if (!roomKey) return;
    // Only decrypt messages that don't have decryptedContent yet
    const hasUndecrypted = messages.some(
      (m) => !m.decryptedContent && m.type !== "system",
    );
    if (!hasUndecrypted) return;

    const decryptAll = async () => {
      const decrypted = await Promise.all(
        messages.map(async (msg) => {
          if (msg.decryptedContent || msg.type === "system") return msg;
          try {
            const content = await decryptMessage(
              msg.encryptedContent,
              msg.iv,
              roomKey,
            );
            return { ...msg, decryptedContent: content };
          } catch {
            return { ...msg, decryptedContent: "[encrypted]" };
          }
        }),
      );
      setMessages(decrypted);
    };

    decryptAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomKey]);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = async (msg: Message) => {
      if (roomKey && msg.encryptedContent && msg.iv) {
        try {
          msg.decryptedContent = await decryptMessage(
            msg.encryptedContent,
            msg.iv,
            roomKey,
          );
        } catch {
          msg.decryptedContent = "[encrypted]";
        }
      }
      setMessages((prev) => [...prev, msg]);
    };

    const handleTyping = (data: { userId: string; username: string }) => {
      if (data.userId !== user?.id) {
        setTypingUsers((prev) => new Map(prev).set(data.userId, data.username));
      }
    };

    const handleStopTyping = (data: { userId: string }) => {
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    const handlePollUpdate = (poll: Record<string, unknown>) => {
      setPolls((prev) => prev.map((p) => (p.id === poll.id ? poll : p)));
    };

    socket.on("new-message", handleNewMessage);
    socket.on("user-typing", handleTyping);
    socket.on("user-stop-typing", handleStopTyping);
    socket.on("poll-updated", handlePollUpdate);

    return () => {
      socket.off("new-message", handleNewMessage);
      socket.off("user-typing", handleTyping);
      socket.off("user-stop-typing", handleStopTyping);
      socket.off("poll-updated", handlePollUpdate);
    };
  }, [socket, roomKey, user?.id]);

  // Auto-scroll
  const scrollToBottom = (instant = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (instant) {
      container.scrollTop = container.scrollHeight;
    } else {
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      });
    }
  };

  useEffect(() => {
    if (messages.length === 0) return;
    if (isInitialLoadRef.current) {
      // Instant scroll on first load
      isInitialLoadRef.current = false;
      // Use rAF to wait for DOM to render messages
      requestAnimationFrame(() => scrollToBottom(true));
    } else {
      // Smooth scroll for new messages
      scrollToBottom(false);
    }
  }, [messages]);

  // Load friends for sidebar invite panel
  useEffect(() => {
    if (!showInviteFriends || !token) return;
    let cancelled = false;
    const load = async () => {
      setSidebarFriendsLoading(true);
      try {
        const { friends } = await profileAPI.friends(token);
        if (!cancelled) setSidebarFriends(friends);
      } catch {
        /* ignore */
      }
      if (!cancelled) setSidebarFriendsLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [showInviteFriends, token]);

  // Room active timer
  useEffect(() => {
    if (!room) return;
    const createdAt = new Date(
      (room as Record<string, unknown>).createdAt as string,
    ).getTime();

    const update = () => {
      const diff = Math.max(0, Math.floor((Date.now() - createdAt) / 1000));
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setRoomElapsed(
        h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`,
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [room]);

  const handleSend = async () => {
    if (!inputText.trim() || !token || !roomKey || !user) return;

    try {
      const { ciphertext, iv } = await encryptMessage(inputText, roomKey);

      const data = await chatAPI.sendMessage(token, roomId, {
        encryptedContent: ciphertext,
        iv,
        type: "text",
      });

      const msg = data.message as unknown as Message;
      msg.decryptedContent = inputText;
      setMessages((prev) => [...prev, msg]);

      emitMessage(roomId, msg as unknown as Record<string, unknown>);

      // Notify participants not currently viewing this room
      const roomParticipants = (room as Record<string, unknown>)
        ?.participants as Array<Record<string, unknown>>;
      if (roomParticipants) {
        emitMessageNotification({
          roomId,
          roomTitle: (room as Record<string, unknown>)?.title as string,
          senderName: user.displayName,
          senderId: user.id,
          participantIds: roomParticipants.map((p) => p.id as string),
        });
      }

      setInputText("");
      stopTyping(roomId);
    } catch (error) {
      console.error("Send failed:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    setCaptionText("");

    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPendingPreview(url);
    } else {
      setPendingPreview(null);
    }

    e.target.value = "";
  };

  const handleSendFile = async () => {
    if (!pendingFile || !token || !roomKey || !user) return;

    try {
      // Encrypt file contents with embedded IV
      const fileBuffer = await pendingFile.arrayBuffer();
      const encryptedBuffer = await encryptFileWithEmbeddedIV(
        fileBuffer,
        roomKey,
      );
      // Use .enc extension and octet-stream MIME so server stores encrypted blob
      const encryptedBlob = new Blob([encryptedBuffer], {
        type: "application/octet-stream",
      });
      const encName = pendingFile.name.replace(/\.[^.]+$/, "") + ".enc";
      const encryptedFile = new File([encryptedBlob], encName, {
        type: "application/octet-stream",
      });

      const formData = new FormData();
      formData.append("file", encryptedFile);
      // Pass original metadata so the DB stores it for client-side decryption
      formData.append("originalName", pendingFile.name);
      formData.append("originalMimeType", pendingFile.type);
      formData.append("originalSize", String(pendingFile.size));

      const contentToEncrypt = captionText.trim()
        ? `__CAPTION__:${captionText.trim()}`
        : pendingFile.name;

      const { ciphertext, iv } = await encryptMessage(
        contentToEncrypt,
        roomKey,
      );
      formData.append("encryptedContent", ciphertext);
      formData.append("iv", iv);

      const data = await chatAPI.uploadMedia(token, roomId, formData);
      const msg = data.message as unknown as Message;
      msg.decryptedContent = contentToEncrypt;
      setMessages((prev) => [...prev, msg]);
      emitMessage(roomId, msg as unknown as Record<string, unknown>);

      // Notify participants
      const roomParticipants = (room as Record<string, unknown>)
        ?.participants as Array<Record<string, unknown>>;
      if (roomParticipants) {
        emitMessageNotification({
          roomId,
          roomTitle: (room as Record<string, unknown>)?.title as string,
          senderName: user.displayName,
          senderId: user.id,
          participantIds: roomParticipants.map((p) => p.id as string),
        });
      }
    } catch (error) {
      console.error("Upload failed:", error);
    }

    // Cleanup
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setCaptionText("");
  };

  const handleCancelFile = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setCaptionText("");
  };

  const handleTypingInput = () => {
    startTyping(roomId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => stopTyping(roomId), 2000);
  };

  const handleLeave = async () => {
    if (!token) return;
    if (!confirm("Leave this room? You'll need to rejoin later.")) return;
    try {
      await roomAPI.leave(token, roomId);
      leaveRoom(roomId);
      onLeave();
    } catch (error) {
      console.error("Leave failed:", error);
    }
  };

  const handleBack = () => {
    leaveRoom(roomId);
    onLeave();
  };

  const handleEndRoom = async () => {
    if (!token) return;
    if (!confirm("End this room? All participants will be removed.")) return;
    try {
      await roomAPI.delete(token, roomId);
      leaveRoom(roomId);
      onLeave();
    } catch (error) {
      console.error("End room failed:", error);
    }
  };

  const handleSidebarInvite = async (friendId: string) => {
    if (!token || !room || !user) return;
    try {
      const result = await roomAPI.invite(token, roomId, friendId);
      setInvitedIds((prev) => new Set(prev).add(friendId));
      const friend = sidebarFriends.find((f) => f.id === friendId);
      emitInviteNotification(friendId, {
        inviteId: result.invite.id,
        roomId,
        roomTitle: (room as Record<string, unknown>).title,
        senderName: user.displayName,
        senderId: user.id,
        friendName: (friend?.displayName as string) || "",
      });
    } catch {
      /* ignore - already invited or in room */
    }
  };

  const copyInviteLink = () => {
    if (!room) return;
    const code = (room as Record<string, unknown>).inviteCode as string;
    navigator.clipboard.writeText(
      `${window.location.origin}/room/join/${code}`,
    );
  };

  const toggleAudio = (url: string) => {
    if (audioPlaying === url) {
      audioRef.current?.pause();
      setAudioPlaying(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(url);
      audioRef.current.play();
      audioRef.current.onended = () => setAudioPlaying(null);
      setAudioPlaying(url);
    }
  };

  const mediaLoadingSpinner = (
    <div className="flex items-center justify-center py-4 px-8">
      <div className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin" />
    </div>
  );

  const renderMessage = (msg: Message) => {
    const isOwn = msg.sender.id === user?.id;
    const content = msg.decryptedContent || "[encrypted]";

    // Extract caption from media messages
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
                onDecrypted={() => scrollToBottom(false)}
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
                        onClick={() => setViewingImage(decUrl || msg.mediaUrl!)}
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
                onDecrypted={() => scrollToBottom(false)}
              >
                {(decUrl, loading) =>
                  loading ? (
                    mediaLoadingSpinner
                  ) : (
                    <div>
                      <div className="flex items-center gap-2.5 min-w-[180px]">
                        <button
                          type="button"
                          onClick={() => toggleAudio(decUrl || msg.mediaUrl!)}
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
                onDecrypted={() => scrollToBottom(false)}
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
                onDecrypted={() => scrollToBottom(false)}
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

  if (!room) {
    return (
      <div className="flex items-center justify-center h-dvh bg-[var(--bg-base)]">
        <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const roomData = room as Record<string, unknown>;
  const participants = (roomData.participants || []) as Array<
    Record<string, unknown>
  >;

  return (
    <div className="flex h-dvh bg-[var(--bg-base)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleBack}
              className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
              title="Back to dashboard"
            >
              <FaArrowLeft size={13} className="text-[var(--text-muted)]" />
            </button>
            <div
              className="w-7 h-7 rounded-md flex items-center justify-center"
              style={{ background: features?.color || "var(--accent)" }}
            >
              <DynamicIcon
                name={features?.icon || "FaComments"}
                size={12}
                className="text-white"
              />
            </div>
            <div>
              <h2 className="font-medium text-[var(--text-primary)] text-[13px]">
                {roomData.title as string}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                <span className="capitalize">{roomData.type as string}</span>
                <span>·</span>
                <FaUsers size={9} />
                <span>
                  {participants.length}/{roomData.maxMembers as number}
                </span>
                {roomData.isLocked ? <FaLock size={9} /> : <FaGlobe size={9} />}
                {roomElapsed && (
                  <>
                    <span>·</span>
                    <FaClock size={9} />
                    <span>{roomElapsed}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {features?.polling && (
              <button
                type="button"
                onClick={() => setShowPollModal(true)}
                className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--accent)]"
              >
                <FaChartBar size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              <FaLink size={14} />
            </button>
            <button
              type="button"
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <FaUsers size={14} />
            </button>
          </div>
        </header>

        {/* Active Polls Banner */}
        {polls.filter((p) => p.isActive).length > 0 && (
          <div className="bg-[var(--accent)]/8 border-b border-[var(--accent)]/15 px-4 py-1.5">
            <div className="flex items-center gap-2 text-[11px] text-[var(--accent)]">
              <FaChartBar size={10} />
              <span>
                {polls.filter((p) => p.isActive).length} active poll(s)
              </span>
              <button
                type="button"
                onClick={() => setShowPollModal(true)}
                className="ml-auto text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
              >
                View
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-1 scroll-smooth"
        >
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="px-4 py-1 text-xs text-[var(--text-muted)] italic">
            {Array.from(typingUsers.values()).join(", ")}{" "}
            {typingUsers.size === 1 ? "is" : "are"} typing...
          </div>
        )}

        {/* Media Preview (before sending) */}
        {pendingFile && (
          <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--bg-elevated)]">
            <div className="flex items-start gap-3">
              {/* Preview */}
              <div className="flex-shrink-0">
                {pendingPreview ? (
                  <img
                    src={pendingPreview}
                    alt="Preview"
                    className="w-20 h-20 rounded-lg object-cover border border-[var(--border)]"
                  />
                ) : pendingFile.type.startsWith("audio/") ? (
                  <div className="w-14 h-14 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                    <FaMicrophoneAlt
                      size={18}
                      className="text-[var(--accent)]"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-[var(--bg-hover)] border border-[var(--border)] flex items-center justify-center">
                    <FaFile size={18} className="text-[var(--text-muted)]" />
                  </div>
                )}
              </div>
              {/* Info + Caption */}
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
                  onChange={(e) => setCaptionText(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleSendFile()
                  }
                  placeholder="Add a caption... (optional)"
                  className="w-full input-base px-2.5 py-1.5 text-[12px]"
                  autoFocus
                />
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0 pt-1">
                <button
                  type="button"
                  onClick={handleCancelFile}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--accent-coral)] hover:bg-[var(--accent-coral)]/8 transition-colors cursor-pointer"
                  title="Cancel"
                >
                  <FaTimes size={13} />
                </button>
                <button
                  type="button"
                  onClick={handleSendFile}
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
            {(features?.sendImages ||
              features?.sendVideos ||
              features?.sendDocuments ||
              features?.sendAudio) && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={[
                    features?.sendImages ? "image/*" : "",
                    features?.sendAudio || features?.voiceNotes
                      ? "audio/*"
                      : "",
                    features?.sendVideos ? "video/*" : "",
                    features?.sendDocuments
                      ? ".pdf,.doc,.docx,.txt,.xlsx,.pptx,.zip,.rar"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(",")}
                  onChange={handleFileSelect}
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
                setInputText(e.target.value);
                handleTypingInput();
              }}
              onKeyDown={(e) =>
                e.key === "Enter" && !e.shiftKey && handleSend()
              }
              placeholder="Type a message..."
              className="flex-1 input-base px-2.5 sm:px-3 py-2 text-[13px]"
            />
            <button
              type="button"
              onClick={handleSend}
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
      </div>

      {/* Participants Sidebar — overlay on mobile, inline on desktop */}
      {showSidebar && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setShowSidebar(false)}
          />
          <div className="fixed right-0 top-0 h-full z-50 md:relative md:z-auto w-[280px] sm:w-64 border-l border-[var(--border)] bg-[var(--bg-sidebar)] flex flex-col overflow-hidden shadow-[var(--shadow-lg)] md:shadow-none animate-slide-in-right md:animate-none">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border)]">
              <h3 className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <FaUsers size={11} /> Participants ({participants.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowSidebar(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <FaTimes size={11} />
              </button>
            </div>

            {/* Invite Friends Toggle */}
            <div className="px-2 py-2 border-b border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowInviteFriends(!showInviteFriends)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                  showInviteFriends
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                }`}
              >
                <FaUserPlus size={11} />
                Invite Friends
              </button>
            </div>

            {/* Inline Friend Invite Panel */}
            {showInviteFriends && (
              <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] max-h-52 flex flex-col">
                <div className="px-2 py-1.5">
                  <div className="flex items-center gap-1.5 bg-[var(--bg-primary)] border border-[var(--border)] rounded-md px-2 py-1">
                    <FaSearch
                      size={10}
                      className="text-[var(--text-muted)] flex-shrink-0"
                    />
                    <input
                      type="text"
                      placeholder="Search friends…"
                      value={friendSearch}
                      onChange={(e) => setFriendSearch(e.target.value)}
                      className="bg-transparent text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none w-full"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-1.5 pb-1.5">
                  {sidebarFriendsLoading ? (
                    <div className="flex justify-center py-3">
                      <div className="w-4 h-4 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    (() => {
                      const filtered = sidebarFriends.filter((f) => {
                        const q = friendSearch.toLowerCase();
                        return (
                          ((f.displayName as string) ?? "")
                            .toLowerCase()
                            .includes(q) ||
                          ((f.username as string) ?? "")
                            .toLowerCase()
                            .includes(q)
                        );
                      });
                      if (filtered.length === 0) {
                        return (
                          <p className="text-[11px] text-[var(--text-muted)] text-center py-3">
                            {friendSearch
                              ? "No matching friends"
                              : "No friends to invite"}
                          </p>
                        );
                      }
                      return filtered.map((f) => {
                        const fId = f.id as string;
                        const isAlreadyIn = participants.some(
                          (p) => p.id === fId,
                        );
                        const isInvited = invitedIds.has(fId);
                        return (
                          <div
                            key={fId}
                            className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                          >
                            <div className="w-5 h-5 rounded-full bg-[var(--avatar-bg)] flex items-center justify-center overflow-hidden flex-shrink-0">
                              {f.avatarUrl ? (
                                <img
                                  src={f.avatarUrl as string}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-[8px] font-medium text-[var(--text-muted)]">
                                  {((f.displayName as string) ??
                                    "?")[0]?.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="flex-1 text-[11px] text-[var(--text-primary)] truncate">
                              {f.displayName as string}
                            </span>
                            {isAlreadyIn ? (
                              <span className="text-[10px] text-[var(--text-muted)]">
                                In room
                              </span>
                            ) : isInvited ? (
                              <span className="text-[10px] text-[var(--accent-green)]">
                                Sent ✓
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSidebarInvite(fId)}
                                className="px-2 py-0.5 text-[10px] bg-[var(--accent)]/12 text-[var(--accent)] rounded hover:bg-[var(--accent)]/20 transition-colors"
                              >
                                Invite
                              </button>
                            )}
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </div>
            )}

            {/* Participant List */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <div className="space-y-0.5">
                {participants.map((p) => (
                  <div
                    key={p.id as string}
                    className="flex items-center gap-2 p-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center overflow-hidden">
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl as string}
                          alt=""
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-[10px] font-semibold text-white">
                          {(p.displayName as string)?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[var(--text-primary)] truncate flex items-center gap-1">
                        {p.displayName as string}
                        {p.id ===
                          (roomData.host as Record<string, unknown>)?.id && (
                          <FaCrown
                            size={9}
                            className="text-[var(--accent-amber)]"
                          />
                        )}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        @{p.username as string}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Room Actions */}
            <div className="px-2 py-2 border-t border-[var(--border)] space-y-1">
              <button
                type="button"
                onClick={handleLeave}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--accent-coral)]/8 hover:text-[var(--accent-coral)] transition-colors"
              >
                <FaDoorOpen size={12} />
                Leave Room
              </button>
              {(roomData.host as Record<string, unknown>)?.id === user?.id && (
                <button
                  type="button"
                  onClick={handleEndRoom}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] font-medium text-[var(--accent-coral)] hover:bg-[var(--accent-coral)]/10 transition-colors"
                >
                  <FaPowerOff size={11} />
                  End Room
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* Poll Modal */}
      {showPollModal && (
        <PollModal
          roomId={roomId}
          polls={polls}
          onClose={() => setShowPollModal(false)}
          onPollCreated={(poll) => setPolls((prev) => [poll, ...prev])}
        />
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          room={roomData}
          onClose={() => setShowInviteModal(false)}
          onCopyLink={copyInviteLink}
        />
      )}

      {/* Image Viewer */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]"
          onClick={() => setViewingImage(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <a
              href={viewingImage}
              download
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer backdrop-blur-sm"
              title="Download"
            >
              <FaDownload size={16} />
            </a>
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors cursor-pointer backdrop-blur-sm"
              title="Close"
            >
              <FaTimes size={16} />
            </button>
          </div>
          <img
            src={viewingImage}
            alt="Full view"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// ─── Poll Modal ───

function PollModal({
  roomId,
  polls,
  onClose,
  onPollCreated,
}: {
  roomId: string;
  polls: Record<string, unknown>[];
  onClose: () => void;
  onPollCreated: (poll: Record<string, unknown>) => void;
}) {
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

// ─── Invite Modal ───

function InviteModal({
  room,
  onClose,
  onCopyLink,
}: {
  room: Record<string, unknown>;
  onClose: () => void;
  onCopyLink: () => void;
}) {
  const { token, user: currentUser } = useAuth();
  const { emitInviteNotification } = useSocket();
  const [friends, setFriends] = useState<Record<string, unknown>[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/room/join/${room.inviteCode}`;

  useEffect(() => {
    if (!token) return;
    const loadFriends = async () => {
      try {
        const { friends: f } = await (
          await import("@/lib/api-client")
        ).profileAPI.friends(token);
        setFriends(f);
      } catch {
        /* ignore */
      }
    };
    loadFriends();
  }, [token]);

  const handleInvite = async (friendId: string) => {
    if (!token) return;
    setInviting(friendId);
    try {
      const result = await roomAPI.invite(token, room.id as string, friendId);
      const friend = friends.find((f) => f.id === friendId);
      emitInviteNotification(friendId, {
        inviteId: result.invite.id,
        roomId: room.id,
        roomTitle: room.title,
        senderName: currentUser?.displayName,
        senderId: currentUser?.id,
        friendName: (friend?.displayName as string) || "",
      });
    } catch {
      /* ignore */
    }
    setInviting(null);
  };

  const handleCopy = () => {
    onCopyLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
            Invite People
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
          >
            <FaTimes className="text-[var(--text-muted)]" size={13} />
          </button>
        </div>

        {/* Link Copy */}
        <div className="mb-3 p-2.5 bg-[var(--bg-elevated)] rounded-md">
          <p className="text-[11px] text-[var(--text-muted)] mb-1.5">
            Share invite link:
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 bg-transparent text-[13px] text-[var(--text-secondary)] truncate outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-md transition-colors"
            >
              {copied ? (
                <span className="text-[11px] text-white px-1">Copied!</span>
              ) : (
                <FaCopy className="text-white" size={12} />
              )}
            </button>
          </div>
        </div>

        {/* Friends List */}
        <p className="text-[11px] text-[var(--text-muted)] mb-2">
          Or invite a friend directly:
        </p>
        <div className="space-y-0.5 max-h-60 overflow-y-auto">
          {friends.map((f) => (
            <div
              key={f.id as string}
              className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center overflow-hidden">
                {f.avatarUrl ? (
                  <img
                    src={f.avatarUrl as string}
                    alt=""
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[10px] font-semibold text-white">
                    {(f.displayName as string)?.[0]}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-[12px] text-[var(--text-primary)]">
                  {f.displayName as string}
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  @{f.username as string}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleInvite(f.id as string)}
                disabled={inviting === f.id}
                className="px-2.5 py-1 text-[11px] bg-[var(--accent)]/12 text-[var(--accent)] rounded-md hover:bg-[var(--accent)]/20 transition-colors disabled:opacity-50"
              >
                {inviting === f.id ? "..." : "Invite"}
              </button>
            </div>
          ))}
          {friends.length === 0 && (
            <p className="text-center text-[var(--text-muted)] text-[13px] py-4">
              No mutual friends yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
