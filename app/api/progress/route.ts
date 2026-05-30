import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getProgressSummary } from "@/lib/services";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const progress = await getProgressSummary(session.user.id);
  return NextResponse.json({ progress });
}
