import { connectDb } from "@/lib/db";
import { User } from "@/lib/db/models";

/** Free tier: lifetime AI coach messages before upgrade prompt. */
export const FREE_AI_LIMIT = 100;

/** Pro tier: soft daily cap (abuse protection only). */
const PRO_DAILY_LIMIT = 500;

export type AiQuotaResult = {
  allowed: boolean;
  remaining: number;
  limit: number;
  upgradeRequired: boolean;
};

export async function checkRateLimit(userId: string): Promise<AiQuotaResult> {
  await connectDb();
  const user = await User.findById(userId);
  if (!user) {
    return { allowed: false, remaining: 0, limit: FREE_AI_LIMIT, upgradeRequired: false };
  }

  if (user.subscriptionTier === "pro") {
    const now = new Date();
    const resetAt = user.aiCallsResetAt ? new Date(user.aiCallsResetAt) : null;
    const isNewDay =
      !resetAt || resetAt.toDateString() !== now.toDateString();

    if (isNewDay) {
      user.aiCallsToday = 0;
      user.aiCallsResetAt = now;
      await user.save();
    }

    const remaining = Math.max(0, PRO_DAILY_LIMIT - (user.aiCallsToday || 0));
    return {
      allowed: remaining > 0,
      remaining,
      limit: PRO_DAILY_LIMIT,
      upgradeRequired: false,
    };
  }

  const used = user.aiCallsTotal ?? 0;
  const remaining = Math.max(0, FREE_AI_LIMIT - used);
  return {
    allowed: remaining > 0,
    remaining,
    limit: FREE_AI_LIMIT,
    upgradeRequired: remaining === 0,
  };
}

export async function incrementAiCalls(userId: string) {
  await connectDb();
  const user = await User.findById(userId);
  if (!user) return;

  if (user.subscriptionTier === "pro") {
    await User.findByIdAndUpdate(userId, { $inc: { aiCallsToday: 1 } });
    return;
  }

  await User.findByIdAndUpdate(userId, { $inc: { aiCallsTotal: 1 } });
}

export async function trackEvent(
  userId: string | null,
  event: string,
  metadata?: Record<string, unknown>
) {
  try {
    await connectDb();
    const { AnalyticsEvent } = await import("@/lib/db/models");
    await AnalyticsEvent.create({ userId, event, metadata });
  } catch {
    // non-blocking
  }
}
