import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createLog, formatLogsForDisplay } from "@/lib/services";
import { trackEvent } from "@/lib/rate-limit";
import { BADGE_META } from "@/types";
import type { LogStatus } from "@/types";
import { z } from "zod";

const postSchema = z.object({
  goalId: z.string().min(1),
  taskId: z.string().min(1),
  checkpointId: z.string().optional(),
  status: z.enum(["completed", "partial", "skipped", "failed"]),
  note: z.string().max(500).optional(),
});

export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.min(parseInt(url.searchParams.get("days") ?? "14", 10) || 14, 30);
  const logs = await formatLogsForDisplay(session.user.id, days);

  return NextResponse.json({ logs, days });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Invalid log payload" },
      { status: 400 }
    );
  }

  const { goalId, taskId, checkpointId, status, note } = parsed.data;

  const result = await createLog(session.user.id, {
    goalId,
    taskId,
    checkpointId,
    status: status as LogStatus,
    note,
  });

  await trackEvent(session.user.id, "task_logged", { status });

  return NextResponse.json({
    log: {
      id: result.log._id.toString(),
      status: result.log.status,
      loggedAt: result.log.loggedAt,
    },
    checkpointProgress: result.checkpointProgress,
    checkpointCompleted: result.checkpointCompleted,
    xpGain: result.xpGain,
    levelUp: result.levelUp,
    level: result.level,
    badgesEarned: result.badgesEarned.map((id) => ({
      id,
      name: BADGE_META[id].name,
    })),
  });
}
