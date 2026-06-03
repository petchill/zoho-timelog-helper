import { NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/lib/google";

export function GET() {
  return NextResponse.redirect(getGoogleAuthUrl());
}
