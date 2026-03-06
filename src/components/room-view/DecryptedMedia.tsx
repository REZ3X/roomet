"use client";

import { useState, useEffect } from "react";
import { decryptFileWithEmbeddedIV } from "@/lib/encryption";

const mediaDecryptCache = new Map<string, string>();

export default function DecryptedMedia({
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
