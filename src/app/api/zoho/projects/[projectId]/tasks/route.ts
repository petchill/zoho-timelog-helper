import { NextRequest, NextResponse } from "next/server";
import { getTasksForProject } from "@/lib/zoho";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const data = await getTasksForProject(projectId);
  return NextResponse.json(data);
}
