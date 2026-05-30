import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { Goal, Log, User } from "@/lib/db/models";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const [goals, logs, user] = await Promise.all([
    Goal.find({ userId: session.user.id }),
    Log.find({ userId: session.user.id }).sort({ loggedAt: -1 }),
    User.findById(session.user.id),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    user: {
      email: user?.email,
      xp: user?.xp,
      level: user?.level,
      badges: user?.badges,
    },
    goals,
    logs,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="comeback-ai-export.json"',
    },
  });
}
