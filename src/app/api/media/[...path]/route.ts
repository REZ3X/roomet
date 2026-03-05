import { NextRequest, NextResponse } from "next/server";
import { getFilePath } from "@/lib/storage";
import fs from "node:fs";
import mime from "mime-types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params;

  if (segments.length < 2) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const category = segments[0];
  const filename = segments.slice(1).join("/");

  const filePath = getFilePath(category, filename);
  if (!filePath) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  const mimeType = mime.lookup(filePath) || "application/octet-stream";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
