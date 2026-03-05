import fs from "node:fs";
import path from "node:path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const dirs = ["images", "audio", "videos", "documents", "avatars"];
for (const dir of dirs) {
  const fullPath = path.join(UPLOAD_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
}

export type MediaCategory =
  | "images"
  | "audio"
  | "videos"
  | "documents"
  | "avatars";

function getCategoryFromMime(mimeType: string): MediaCategory {
  if (mimeType.startsWith("image/")) return "images";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "videos";
  return "documents";
}

export async function saveFile(
  file: File,
  category?: MediaCategory,
): Promise<{ url: string; filename: string; mimeType: string; size: number }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "bin";
  const uniqueName = `${uuidv4()}.${ext}`;
  const cat = category || getCategoryFromMime(file.type);
  const filePath = path.join(UPLOAD_DIR, cat, uniqueName);

  fs.writeFileSync(filePath, buffer);

  return {
    url: `/api/media/${cat}/${uniqueName}`,
    filename: file.name,
    mimeType: file.type,
    size: buffer.length,
  };
}

export function getFilePath(category: string, filename: string): string | null {
  const filePath = path.join(UPLOAD_DIR, category, filename);

  if (!filePath.startsWith(UPLOAD_DIR)) return null;
  if (!fs.existsSync(filePath)) return null;

  return filePath;
}

export function deleteFile(category: string, filename: string): boolean {
  const filePath = getFilePath(category, filename);
  if (!filePath) return false;

  try {
    fs.unlinkSync(filePath);
    return true;
  } catch {
    return false;
  }
}
