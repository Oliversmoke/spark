import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { SolanaCluster } from "@/lib/gamepass/config";
import { SubscriptionModel } from "@/lib/models/Subscription";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const planId = typeof body?.planId === "string" ? body.planId.trim() : "";
  const cluster = body?.cluster as SolanaCluster | undefined;
  const immediate = body?.immediate === true;

  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  await connectDb();
  const sub = await SubscriptionModel.findOne({ planId, subscriberUserId: session.userId, cluster });
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (immediate) {
    sub.status = "canceled";
    sub.cancelAtPeriodEnd = false;
    sub.canceledAt = new Date();
  } else {
    sub.cancelAtPeriodEnd = true;
    sub.canceledAt = new Date();
  }
  await sub.save();

  return NextResponse.json({
    ok: true,
    status: sub.status,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
  });
}

