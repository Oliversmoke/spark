import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { triggerRecoveryForGoal } from "@/lib/recovery";
import { runMissDetection } from "@/lib/recovery/miss-detection";
import { runRemindersJob } from "@/lib/notifications/schedule";
import { runWeeklyReviewCron } from "@/lib/reviews/weekly-review";

export const runtime = "nodejs";

function authorize(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const url = new URL(req.url);
  const job = url.searchParams.get("job") ?? "recovery";

  if (job === "recovery") {
    const missResult = await runMissDetection();
    return NextResponse.json(missResult);
  }

  if (job === "miss-detection") {
    const result = await runMissDetection();
    return NextResponse.json(result);
  }

  if (job === "recovery-legacy") {
    const { syncAllActiveStreaks } = await import("@/lib/gamification/streak-sync");
    await syncAllActiveStreaks();
    const missed = await import("@/lib/recovery/miss-detection").then((m) =>
      m.detectGoalsForRecovery()
    );
    const results = [];
    for (const goal of missed) {
      const plan = await triggerRecoveryForGoal(goal._id.toString());
      if (plan) results.push(goal._id.toString());
    }
    return NextResponse.json({ triggered: results.length, goalIds: results });
  }

  if (job === "streaks") {
    const { syncAllActiveStreaks } = await import("@/lib/gamification/streak-sync");
    const result = await syncAllActiveStreaks();
    return NextResponse.json(result);
  }

  if (job === "weekly-review") {
    const result = await runWeeklyReviewCron();
    return NextResponse.json(result);
  }

  if (job === "reminders") {
    const result = await runRemindersJob();
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown job" }, { status: 400 });
}
