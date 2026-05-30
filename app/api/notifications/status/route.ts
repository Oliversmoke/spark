import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/db/models";
import { isPushConfigured } from "@/lib/notifications/push";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDb();
  const user = await User.findById(session.user.id).select(
    "notificationPrefs pushSubscriptions"
  );

  return NextResponse.json({
    pushEnabled: user?.notificationPrefs?.pushEnabled ?? false,
    subscribed: (user?.pushSubscriptions?.length ?? 0) > 0,
    subscriptionCount: user?.pushSubscriptions?.length ?? 0,
    vapidConfigured: isPushConfigured(),
    notificationPrefs: user?.notificationPrefs ?? {},
  });
}
