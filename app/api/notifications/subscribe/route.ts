import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/db/models";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { endpoint, keys } = await req.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await connectDb();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const subs = user.pushSubscriptions ?? [];
  const exists = subs.some((s: { endpoint: string }) => s.endpoint === endpoint);
  if (!exists) {
    subs.push({ endpoint, keys });
    user.pushSubscriptions = subs;
  }

  user.notificationPrefs = {
    ...user.notificationPrefs,
    pushEnabled: true,
  };
  await user.save();

  return NextResponse.json({
    ok: true,
    subscribed: user.pushSubscriptions.length,
  });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const endpoint = body.endpoint as string | undefined;

  await connectDb();
  const user = await User.findById(session.user.id);
  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (endpoint) {
    user.pushSubscriptions = (user.pushSubscriptions ?? []).filter(
      (s: { endpoint: string }) => s.endpoint !== endpoint
    );
  } else {
    user.pushSubscriptions = [];
  }

  if ((user.pushSubscriptions?.length ?? 0) === 0) {
    user.notificationPrefs = {
      ...user.notificationPrefs,
      pushEnabled: false,
    };
  }

  await user.save();
  return NextResponse.json({ ok: true });
}
