import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { refreshGoogleToken, fetchCalendarEvents } from "@/lib/google";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("google_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "not_connected" }, { status: 401 });
  }

  const { timeMin, timeMax } = Object.fromEntries(
    request.nextUrl.searchParams,
  );
  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: "Missing timeMin/timeMax" }, { status: 400 });
  }

  const tokenData = await refreshGoogleToken(refreshToken);
  if (!tokenData.access_token) {
    return NextResponse.json({ error: "token_refresh_failed" }, { status: 401 });
  }

  const events = await fetchCalendarEvents(tokenData.access_token, timeMin, timeMax);
  return NextResponse.json({ events });
}
