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
} from "@/lib/encryption";
import {
  DynamicIcon,
  FaArrowLeft,
  FaUsers,
  FaLock,
  FaGlobe,
  FaLink,
  FaChartBar,
  FaTimes,
  FaDownload,
  FaClock,
  FaBars,
} from "@/components/Icons";
import { ROOM_TYPE_FEATURES, type RoomType } from "@/lib/room-types";
import type { Message } from "@/components/room-view/types";
import ChatMessages from "@/components/room-view/ChatMessages";
import ChatInput from "@/components/room-view/ChatInput";
import ParticipantsSidebar from "@/components/room-view/ParticipantsSidebar";
import PollModal from "@/components/room-view/PollModal";
import InviteModal from "@/components/room-view/InviteModal";

interface RoomViewProps {
  roomId: string;
  onLeave: () => void;
  onRoomLoaded?: (info: {
    title: string;
    icon?: string;
    color?: string;
  }) => void;
  onMenuClick?: () => void;
}

export default function RoomView({
  roomId,
  onLeave,
  onRoomLoaded,
  onMenuClick,
}: RoomViewProps) {
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
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const features = room
    ? ROOM_TYPE_FEATURES[room.type as string as RoomType]
    : null;

  useEffect(() => {
    if (!token || !user) return;

    const loadRoom = async () => {
      try {
        const data = await roomAPI.get(token, roomId);
        setRoom(data);

        const roomFeatures = (data as Record<string, unknown>).features as
          | Record<string, unknown>
          | undefined;
        onRoomLoaded?.({
          title: (data as Record<string, unknown>).title as string,
          icon: roomFeatures?.icon as string | undefined,
          color: roomFeatures?.color as string | undefined,
        });

        let derivedKey: string | null = null;
        const privateKey = getPrivateKey();
        const roomData = data as Record<string, unknown>;
        const hostId = (roomData.host as Record<string, unknown>)?.id;
        const isHost = hostId === user.id;
        const participants = roomData.participants as Array<
          Record<string, unknown>
        >;

        const distributeToAll = async (key: string) => {
          const keys: { userId: string; encryptedKey: string }[] = [];
          for (const p of participants) {
            if (p.publicKey) {
              const encrypted = await encryptRoomKeyForUser(
                key,
                p.publicKey as string,
              );
              keys.push({ userId: p.id as string, encryptedKey: encrypted });
            }
          }
          if (keys.length > 0) {
            await roomAPI.distributeKeys(token, roomId, keys);
          }
        };

        if (roomData.encryptedRoomKey && privateKey) {
          derivedKey = await decryptRoomKey(
            roomData.encryptedRoomKey as string,
            privateKey,
          );

          if (isHost && derivedKey) {
            try {
              await distributeToAll(derivedKey);
            } catch {}
          }
        } else if (roomData.isParticipant && isHost) {
          derivedKey = await generateRoomKey();
          try {
            await distributeToAll(derivedKey);
          } catch (keyError) {
            console.warn(
              "Key distribution failed, will retry on next load:",
              keyError,
            );
          }
        }

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

        const roomType = (data as Record<string, unknown>).type as string;
        if (["discussion", "study", "hangout"].includes(roomType)) {
          const pollData = await pollAPI.list(token, roomId);
          setPolls(pollData.polls);
        }

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

  useEffect(() => {
    if (!roomKey) return;

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
  }, [roomKey]);

  useEffect(() => {
    if (roomKey || !room || !user || !token) return;

    const roomData = room as Record<string, unknown>;
    const hostId = (roomData.host as Record<string, unknown>)?.id;
    if (hostId === user.id) return;
    if (!roomData.isParticipant) return;

    let cancelled = false;
    const poll = async () => {
      const privateKey = getPrivateKey();
      if (!privateKey) return;

      for (let i = 0; i < 15; i++) {
        if (cancelled) return;
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled) return;
        try {
          const keyData = await roomAPI.getMyKey(token, roomId);
          if (keyData.encryptedKey) {
            const decrypted = await decryptRoomKey(
              keyData.encryptedKey,
              privateKey,
            );
            if (!cancelled) setRoomKey(decrypted);
            return;
          }
        } catch {}
      }
    };
    poll();

    return () => {
      cancelled = true;
    };
  }, [room, roomKey, user, token, roomId]);

  useEffect(() => {
    if (!socket || !roomKey || !user || !token || !room) return;

    const roomData = room as Record<string, unknown>;
    const hostId = (roomData.host as Record<string, unknown>)?.id;
    if (hostId !== user.id) return;

    const handleUserJoinedKey = async (data: {
      userId: string;
      publicKey?: string;
    }) => {
      if (!data.publicKey) return;
      try {
        const encrypted = await encryptRoomKeyForUser(roomKey, data.publicKey);
        await roomAPI.distributeKeys(token, roomId, [
          { userId: data.userId, encryptedKey: encrypted },
        ]);
        socket.emit("room-key-distributed", { roomId, userIds: [data.userId] });
      } catch (err) {
        console.warn("Failed to distribute key to new user:", err);
      }
    };

    socket.on("user-joined", handleUserJoinedKey);
    return () => {
      socket.off("user-joined", handleUserJoinedKey);
    };
  }, [socket, roomKey, user, token, room, roomId]);

  useEffect(() => {
    if (!socket || roomKey || !token) return;

    const handleKeyAvailable = async (data: { roomId: string }) => {
      if (data.roomId !== roomId) return;
      const privateKey = getPrivateKey();
      if (!privateKey) return;
      try {
        const keyData = await roomAPI.getMyKey(token, roomId);
        if (keyData.encryptedKey) {
          const decrypted = await decryptRoomKey(
            keyData.encryptedKey,
            privateKey,
          );
          setRoomKey(decrypted);
        }
      } catch {}
    };

    socket.on("room-key-available", handleKeyAvailable);
    return () => {
      socket.off("room-key-available", handleKeyAvailable);
    };
  }, [socket, roomKey, token, roomId]);

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
      isInitialLoadRef.current = false;

      requestAnimationFrame(() => scrollToBottom(true));
    } else {
      scrollToBottom(false);
    }
  }, [messages]);

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
      setUploadProgress(0);

      const fileBuffer = await pendingFile.arrayBuffer();
      const encryptedBuffer = await encryptFileWithEmbeddedIV(
        fileBuffer,
        roomKey,
      );

      const encryptedBlob = new Blob([encryptedBuffer], {
        type: "application/octet-stream",
      });
      const encName = pendingFile.name.replace(/\.[^.]+$/, "") + ".enc";
      const encryptedFile = new File([encryptedBlob], encName, {
        type: "application/octet-stream",
      });

      const formData = new FormData();
      formData.append("file", encryptedFile);

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

      const data = await chatAPI.uploadMediaWithProgress(
        token,
        roomId,
        formData,
        setUploadProgress,
      );
      const msg = data.message as unknown as Message;
      msg.decryptedContent = contentToEncrypt;
      setMessages((prev) => [...prev, msg]);
      emitMessage(roomId, msg as unknown as Record<string, unknown>);

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

    setUploadProgress(null);
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setCaptionText("");
  };

  const handleSendVoiceNote = async (blob: Blob, durationSec: number) => {
    if (!token || !roomKey || !user) return;

    try {
      setUploadProgress(0);
      setIsVoiceRecording(false);

      // Encrypt the voice note
      const buffer = await blob.arrayBuffer();
      const encryptedBuffer = await encryptFileWithEmbeddedIV(buffer, roomKey);
      const encryptedBlob = new Blob([encryptedBuffer], {
        type: "application/octet-stream",
      });
      const fileName = `voice-note-${Date.now()}.enc`;
      const encryptedFile = new File([encryptedBlob], fileName, {
        type: "application/octet-stream",
      });

      const originalName = `voice-note-${durationSec}s.webm`;
      const formData = new FormData();
      formData.append("file", encryptedFile);
      formData.append("originalName", originalName);
      formData.append("originalMimeType", blob.type || "audio/webm");
      formData.append("originalSize", String(blob.size));

      const { ciphertext, iv } = await encryptMessage(originalName, roomKey);
      formData.append("encryptedContent", ciphertext);
      formData.append("iv", iv);

      const data = await chatAPI.uploadMediaWithProgress(
        token,
        roomId,
        formData,
        setUploadProgress,
      );
      const msg = data.message as unknown as Message;
      msg.decryptedContent = originalName;
      setMessages((prev) => [...prev, msg]);
      emitMessage(roomId, msg as unknown as Record<string, unknown>);

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
      console.error("Voice note upload failed:", error);
    }

    setUploadProgress(null);
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

  if (!room) {
    return (
      <div className="flex items-center justify-center h-full bg-[var(--bg-base)]">
        <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const roomData = room as Record<string, unknown>;
  const participants = (roomData.participants || []) as Array<
    Record<string, unknown>
  >;

  return (
    <div className="flex h-full bg-[var(--bg-base)]">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            {onMenuClick ? (
              <button
                type="button"
                onClick={onMenuClick}
                className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition-colors md:hidden"
                title="Menu"
              >
                <FaBars size={13} className="text-[var(--text-muted)]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                className="p-1.5 hover:bg-[var(--bg-hover)] rounded-md transition-colors"
                title="Back to dashboard"
              >
                <FaArrowLeft size={13} className="text-[var(--text-muted)]" />
              </button>
            )}
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
          <ChatMessages
            messages={messages}
            userId={user?.id}
            roomKey={roomKey}
            audioPlaying={audioPlaying}
            onToggleAudio={toggleAudio}
            onViewImage={setViewingImage}
            onScrollToBottom={() => scrollToBottom(false)}
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="px-4 py-1 text-xs text-[var(--text-muted)] italic">
            {Array.from(typingUsers.values()).join(", ")}{" "}
            {typingUsers.size === 1 ? "is" : "are"} typing...
          </div>
        )}

        {/* Chat Input + Media Preview */}
        <ChatInput
          inputText={inputText}
          onInputChange={setInputText}
          onSend={handleSend}
          onTyping={handleTypingInput}
          roomKey={roomKey}
          features={features as Record<string, unknown> | null}
          pendingFile={pendingFile}
          pendingPreview={pendingPreview}
          captionText={captionText}
          onCaptionChange={setCaptionText}
          onFileSelect={handleFileSelect}
          onSendFile={handleSendFile}
          onCancelFile={handleCancelFile}
          uploadProgress={uploadProgress}
          onSendVoiceNote={handleSendVoiceNote}
          isVoiceRecording={isVoiceRecording}
          onVoiceRecordingChange={setIsVoiceRecording}
        />
      </div>

      {/* Participants Sidebar */}
      <ParticipantsSidebar
        showSidebar={showSidebar}
        onClose={() => setShowSidebar(false)}
        participants={participants}
        roomData={roomData}
        userId={user?.id}
        showInviteFriends={showInviteFriends}
        onToggleInviteFriends={() => setShowInviteFriends(!showInviteFriends)}
        sidebarFriends={sidebarFriends}
        sidebarFriendsLoading={sidebarFriendsLoading}
        friendSearch={friendSearch}
        onFriendSearchChange={setFriendSearch}
        invitedIds={invitedIds}
        onInviteFriend={handleSidebarInvite}
        onLeave={handleLeave}
        onEndRoom={handleEndRoom}
      />

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
