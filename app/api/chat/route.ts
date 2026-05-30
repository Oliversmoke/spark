import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getChatHistory } from "@/lib/services";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await getChatHistory(session.user.id, 50);
  return NextResponse.json({
    messages: messages.reverse().map((m) => ({
      id: m._id.toString(),
      role: m.role,
      content: m.content,
      metadata: m.metadata,
      goalId: m.goalId?.toString(),
      createdAt: m.createdAt,
    })),
  });
}
