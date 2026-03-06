export interface Message {
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

export interface RoomViewProps {
  roomId: string;
  onLeave: () => void;
  onRoomLoaded?: (info: {
    title: string;
    icon?: string;
    color?: string;
  }) => void;
  onMenuClick?: () => void;
}
