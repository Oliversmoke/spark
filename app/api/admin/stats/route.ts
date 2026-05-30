import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { User, Goal, Log, AnalyticsEvent } from "@/lib/db/models";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim());
  await connectDb();
  const user = await User.findById(session.user.id);
  if (!user?.email || !adminEmails.includes(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    users,
    goals,
    templateGoals,
    logs,
    inRecovery,
    signups,
    taskLogs,
    weeklyReviews,
    triggered,
    accepted,
    completed,
    atRisk,
  ] = await Promise.all([
    User.countDocuments(),
    Goal.countDocuments({ status: "active" }),
    Goal.countDocuments({ templateId: { $exists: true, $ne: null } }),
    Log.countDocuments(),
    Goal.countDocuments({ inRecoveryMode: true }),
    AnalyticsEvent.countDocuments({ event: "signup" }),
    AnalyticsEvent.countDocuments({ event: "task_logged" }),
    AnalyticsEvent.countDocuments({ event: "weekly_review_generated" }),
    AnalyticsEvent.countDocuments({ event: "recovery_triggered" }),
    AnalyticsEvent.countDocuments({ event: "recovery_accepted" }),
    AnalyticsEvent.countDocuments({ event: "recovery_completed" }),
    AnalyticsEvent.countDocuments({ event: "recovery_at_risk" }),
  ]);

  const recoveryRate =
    triggered > 0 ? Math.round((completed / triggered) * 100) : 0;
  const acceptanceRate =
    triggered > 0 ? Math.round((accepted / triggered) * 100) : 0;

  return NextResponse.json({
    stats: {
      users,
      activeGoals: goals,
      templateGoals,
      totalLogs: logs,
      inRecovery,
      signups,
      taskLogs,
      weeklyReviews,
      recovery: {
        triggered,
        accepted,
        completed,
        atRiskEvents: atRisk,
        recoveryRate,
        acceptanceRate,
      },
    },
  });
}
