import { connectDb } from "@/lib/db";
import { User } from "@/lib/db/models";
import type { PushSubscription } from "web-push";

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export function isPushConfigured() {
  return Boolean(
    process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  );
}

async function getWebPush() {
  if (!isPushConfigured()) return null;
  const webpush = await import("web-push");
  webpush.default.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:support@comeback.ai",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  return webpush.default;
}

export async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: PushPayload
) {
  const webpush = await getWebPush();
  if (!webpush) return { ok: false as const, stale: false };

  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/today",
        tag: payload.tag,
      })
    );
    return { ok: true as const, stale: false };
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? (error as { statusCode?: number }).statusCode
        : undefined;
    const stale = statusCode === 404 || statusCode === 410;
    return { ok: false as const, stale };
  }
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  await connectDb();
  const user = await User.findById(userId);
  if (!user?.pushSubscriptions?.length) {
    return { delivered: 0, removed: 0 };
  }

  let delivered = 0;
  let removed = 0;
  const nextSubs = [];

  for (const sub of user.pushSubscriptions) {
    const result = await sendPushToSubscription(
      sub as unknown as PushSubscription,
      payload
    );
    if (result.ok) {
      delivered++;
      nextSubs.push(sub);
    } else if (result.stale) {
      removed++;
    } else {
      nextSubs.push(sub);
    }
  }

  if (removed > 0) {
    user.pushSubscriptions = nextSubs;
    await user.save();
  }

  return { delivered, removed };
}
