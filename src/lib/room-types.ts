// Room type definitions and their allowed features

export type RoomType =
  | "chatting"
  | "discussion"
  | "focus"
  | "study"
  | "hangout";

export interface RoomFeatures {
  textChat: boolean;
  voiceNotes: boolean;
  sendAudio: boolean;
  sendImages: boolean;
  sendVideos: boolean;
  sendDocuments: boolean;
  polling: boolean;
  maxMediaSizeMB: number;
  description: string;
  icon: string;
  color: string;
}

export const ROOM_TYPE_FEATURES: Record<RoomType, RoomFeatures> = {
  chatting: {
    textChat: true,
    voiceNotes: true,
    sendAudio: true,
    sendImages: true,
    sendVideos: true,
    sendDocuments: false,
    polling: false,
    maxMediaSizeMB: 25,
    description:
      "Casual chat with friends. Share memes, photos, and voice notes!",
    icon: "FaComments",
    color: "#7c3aed", // purple
  },
  discussion: {
    textChat: true,
    voiceNotes: true,
    sendAudio: true,
    sendImages: true,
    sendVideos: false,
    sendDocuments: true,
    polling: true,
    maxMediaSizeMB: 50,
    description: "Structured discussion with polls and document sharing.",
    icon: "FaUsers",
    color: "#06b6d4", // cyan
  },
  focus: {
    textChat: true,
    voiceNotes: false,
    sendAudio: false,
    sendImages: false,
    sendVideos: false,
    sendDocuments: true,
    polling: false,
    maxMediaSizeMB: 100,
    description: "Distraction-free. Text and documents only for deep work.",
    icon: "FaBullseye",
    color: "#f59e0b", // amber
  },
  study: {
    textChat: true,
    voiceNotes: true,
    sendAudio: false,
    sendImages: true,
    sendVideos: false,
    sendDocuments: true,
    polling: true,
    maxMediaSizeMB: 50,
    description: "Study together. Share notes, images, and create quizzes.",
    icon: "FaBookOpen",
    color: "#10b981", // emerald
  },
  hangout: {
    textChat: true,
    voiceNotes: true,
    sendAudio: true,
    sendImages: true,
    sendVideos: true,
    sendDocuments: true,
    polling: true,
    maxMediaSizeMB: 100,
    description: "Everything goes! Full-featured room for hanging out.",
    icon: "FaGamepad",
    color: "#ef4444", // rose
  },
};

export function getRoomFeatures(type: string): RoomFeatures {
  return ROOM_TYPE_FEATURES[type as RoomType] || ROOM_TYPE_FEATURES.chatting;
}

export function canSendMediaType(roomType: string, mediaType: string): boolean {
  const features = getRoomFeatures(roomType);

  if (mediaType.startsWith("image/")) return features.sendImages;
  if (mediaType.startsWith("audio/"))
    return features.sendAudio || features.voiceNotes;
  if (mediaType.startsWith("video/")) return features.sendVideos;
  return features.sendDocuments;
}
