import { NextRequest } from "next/server";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  "http://localhost:3000/api/auth/google/callback";

export async function GET(_req: NextRequest) {
  console.log("[Google OAuth] CLIENT_ID:", GOOGLE_CLIENT_ID);
  console.log("[Google OAuth] REDIRECT_URI:", JSON.stringify(REDIRECT_URI));

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  console.log("[Google OAuth] Full URL:", authUrl);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authUrl,
    },
  });
}
