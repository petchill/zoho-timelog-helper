import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleCode } from "@/lib/google";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const tokens = await exchangeGoogleCode(code);
  if (!tokens.refresh_token) {
    return NextResponse.json(
      { error: "No refresh token received", details: tokens },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set("google_refresh_token", tokens.refresh_token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return NextResponse.redirect(new URL("/calendar", request.url));
}
