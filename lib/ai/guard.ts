import { NextResponse } from "next/server";
import { checkRateLimit, FREE_AI_LIMIT } from "@/lib/rate-limit";

export async function requireAiQuota(userId: string) {
  const quota = await checkRateLimit(userId);
  if (quota.allowed) {
    return { allowed: true as const, remaining: quota.remaining, limit: quota.limit };
  }

  const error = quota.upgradeRequired
    ? `You've used all ${FREE_AI_LIMIT} free AI coach messages. Upgrade to Pro for unlimited coaching.`
    : "Daily AI limit reached. Try again tomorrow.";

  return {
    allowed: false as const,
    response: NextResponse.json(
      {
        error,
        retryable: false,
        remaining: 0,
        upgradeRequired: quota.upgradeRequired,
      },
      { status: 429, headers: { "X-AI-Remaining": "0" } }
    ),
  };
}

export function aiRemainingHeader(remaining: number) {
  return { "X-AI-Remaining": String(Math.max(0, remaining)) };
}
