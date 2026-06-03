import { NextRequest, NextResponse } from "next/server";
import { addTimelog, getTimelogs } from "@/lib/zoho";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const projectId = searchParams.get("projectId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (!projectId || !fromDate || !toDate) {
    return NextResponse.json({ error: "Missing projectId, fromDate, or toDate" }, { status: 400 });
  }

  const data = await getTimelogs(projectId, fromDate, toDate);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, taskId, date, hours, minutes, notes, billable } = body;

  if (!projectId || !taskId || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const data = await addTimelog({ projectId, taskId, date, hours, minutes, notes, billable });
  return NextResponse.json(data);
}
