import { connectDb } from "@/lib/db";
import { Goal, Log, User } from "@/lib/db/models";
import { getTodayView } from "@/lib/services";
import { startOfDay } from "@/lib/gamification";
import {
  getLocalTimeParts,
  isInQuietHours,
  isReminderHour,
  isWithinMinutesAfterReminder,
} from "@/lib/notifications/time";
import { isPushConfigured, sendPushToUser, type PushPayload } from "@/lib/notifications/push";
import { trackEvent } from "@/lib/rate-limit";

type NotificationPrefs = {
  pushEnabled?: boolean;
  reminderTime?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  lastPushDate?: string;
  lastAtRiskPushDate?: string;
  lastRecoveryPushDate?: string;
};

async function hasLoggedToday(userId: string) {
  await connectDb();
  const dayStart = startOfDay(new Date());
  const count = await Log.countDocuments({
    userId,
    loggedAt: { $gte: dayStart },
  });
  return count > 0;
}

async function buildMorningPayload(userId: string): Promise<PushPayload> {
  const view = await getTodayView(userId);
  const pending = view.tasks.filter((t) => !t.loggedToday).length;

  return {
    title: "Good morning from ComeBack.ai",
    body:
      pending > 0
        ? `You have ${pending} task${pending === 1 ? "" : "s"} due today. A quick check-in keeps momentum.`
        : "Drop by Today and keep your streak alive.",
    url: "/today",
    tag: "morning-reminder",
  };
}

export async function runRemindersJob(limit = 200) {
  if (!isPushConfigured()) {
    return { sent: 0, skipped: "vapid_not_configured" as const };
  }

  await connectDb();
  const users = await User.find({ "notificationPrefs.pushEnabled": true })
    .limit(limit)
    .select("_id notificationPrefs pushSubscriptions streak");

  let sent = 0;
  const breakdown = { morning: 0, atRisk: 0, recovery: 0 };

  for (const user of users) {
    if (!user.pushSubscriptions?.length) continue;

    const prefs = (user.notificationPrefs ?? {}) as NotificationPrefs;
    const timezone = prefs.timezone ?? "UTC";
    const local = getLocalTimeParts(timezone);

    if (
      isInQuietHours(
        prefs.quietHoursStart ?? "22:00",
        prefs.quietHoursEnd ?? "07:00",
        timezone
      )
    ) {
      continue;
    }

    let payload: PushPayload | null = null;
    let kind: keyof typeof breakdown | null = null;

    const recoveringGoal = await Goal.findOne({
      userId: user._id,
      status: "active",
      inRecoveryMode: true,
    }).select("title recoveryPlan");

    if (
      recoveringGoal &&
      prefs.lastRecoveryPushDate !== local.dateKey &&
      isWithinMinutesAfterReminder(prefs.reminderTime ?? "09:00", local, 60)
    ) {
      payload = {
        title: "Recovery coach is here",
        body: recoveringGoal.recoveryPlan?.accepted
          ? `Minimum step today for "${recoveringGoal.title}". You've got this.`
          : `A lighter plan is ready for "${recoveringGoal.title}". Open ComeBack.ai to accept it.`,
        url: "/chat",
        tag: "recovery-nudge",
      };
      kind = "recovery";
      prefs.lastRecoveryPushDate = local.dateKey;
    } else if (
      user.streak?.state === "at-risk" &&
      prefs.lastAtRiskPushDate !== local.dateKey &&
      !(await hasLoggedToday(user._id.toString())) &&
      isWithinMinutesAfterReminder(prefs.reminderTime ?? "09:00", local, 180)
    ) {
      payload = {
        title: "Streak at risk",
        body: "Log one task today to keep your streak alive — even a partial counts.",
        url: "/today",
        tag: "at-risk-streak",
      };
      kind = "atRisk";
      prefs.lastAtRiskPushDate = local.dateKey;
    } else if (
      prefs.lastPushDate !== local.dateKey &&
      isReminderHour(prefs.reminderTime ?? "09:00", local)
    ) {
      payload = await buildMorningPayload(user._id.toString());
      kind = "morning";
      prefs.lastPushDate = local.dateKey;
    }

    if (!payload || !kind) continue;

    const result = await sendPushToUser(user._id.toString(), payload);
    if (result.delivered > 0) {
      sent += result.delivered;
      breakdown[kind]++;
      user.notificationPrefs = prefs;
      user.markModified("notificationPrefs");
      await user.save();
      await trackEvent(user._id.toString(), "push_sent", { kind, tag: payload.tag });
    }
  }

  return { sent, breakdown };
}
