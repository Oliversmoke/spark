import { connectDb } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;

type RateLimitRule = {
  max: number;
  windowMs: number;
};

const RULES = {
  loginIp: { max: 30, windowMs: WINDOW_MS },
  loginEmail: { max: 10, windowMs: WINDOW_MS },
  signupIp: { max: 12, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>;

export type AuthRateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
};

async function consumeAuthRateLimit(
  key: string,
  rule: RateLimitRule
): Promise<AuthRateLimitResult> {
  await connectDb();
  const { AuthRateLimit } = await import("@/lib/db/models");
  const now = new Date();
  const windowStart = new Date(now.getTime() - rule.windowMs);

  let record = await AuthRateLimit.findOne({ key });
  if (!record || record.windowStart < windowStart) {
    await AuthRateLimit.findOneAndUpdate(
      { key },
      { count: 1, windowStart: now },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return { allowed: true, retryAfterSec: 0 };
  }

  if (record.count >= rule.max) {
    const retryAfterMs = record.windowStart.getTime() + rule.windowMs - now.getTime();
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  record.count += 1;
  await record.save();
  return { allowed: true, retryAfterSec: 0 };
}

function rateLimitResponse(result: AuthRateLimitResult) {
  if (result.allowed) return null;

  return new Response(
    JSON.stringify({
      error: "Too many attempts. Please wait and try again.",
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSec),
      },
    }
  );
}

export async function enforceLoginRateLimit(ip: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const ipResult = await consumeAuthRateLimit(`login:ip:${ip}`, RULES.loginIp);
  const ipBlocked = rateLimitResponse(ipResult);
  if (ipBlocked) return ipBlocked;

  const emailResult = await consumeAuthRateLimit(
    `login:email:${normalizedEmail}`,
    RULES.loginEmail
  );
  return rateLimitResponse(emailResult);
}

export async function enforceSignupRateLimit(ip: string) {
  const ipResult = await consumeAuthRateLimit(`signup:ip:${ip}`, RULES.signupIp);
  return rateLimitResponse(ipResult);
}
