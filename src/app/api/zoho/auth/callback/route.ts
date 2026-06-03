import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/zoho";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const tokens = await exchangeCodeForTokens(code);

  // In production, store tokens securely (e.g. encrypted in DB or secrets manager).
  // For local dev, print the refresh token so you can add it to .env.local.
  console.log("=== ZOHO TOKENS ===");
  console.log("refresh_token:", tokens.refresh_token);
  console.log("===================");

  if (tokens.refresh_token) {
    return NextResponse.json({
      message: "Auth successful! Copy the refresh_token from the server logs into .env.local",
      access_token_expires_in: tokens.expires_in,
    });
  }

  return NextResponse.json({ error: "No refresh token received", details: tokens }, { status: 500 });
}
