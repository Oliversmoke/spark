import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { SubscriptionModel } from "@/lib/models/Subscription";
import { SubscriptionPlanModel } from "@/lib/models/SubscriptionPlan";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const planId = searchParams.get("planId");
  const cluster = searchParams.get("cluster");
  const status = searchParams.get("status") ?? "active";
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 80) || 80));

  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }
  if (status !== "active" && status !== "past_due" && status !== "canceled" && status !== "all") {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  await connectDb();

  const planFilter: Record<string, unknown> = { ownerUserId: session.userId };
  if (planId) planFilter._id = planId;
  const plans = await SubscriptionPlanModel.find(planFilter).select({ _id: 1, title: 1 }).lean();
  const planIds = plans.map((p) => String(p._id));

  const q: Record<string, unknown> = {
    ownerUserId: session.userId,
    cluster,
    planId: { $in: planIds },
  };
  if (status !== "all") q.status = status;

  const rows = await SubscriptionModel.find(q).sort({ updatedAt: -1 }).limit(limit).lean();

  const planTitleById = new Map(planIds.map((id) => [id, ""]));
  for (const p of plans) planTitleById.set(String(p._id), (p as any).title ?? "");

  return NextResponse.json({
    plans: plans.map((p) => ({ id: String(p._id), title: (p as any).title ?? "" })),
    items: rows.map((s) => ({
      id: String(s._id),
      planId: s.planId,
      planTitle: planTitleById.get(s.planId) ?? "",
      subscriberUserId: s.subscriberUserId,
      subscriberWalletAddress: s.subscriberWalletAddress,
      status: s.status,
      cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
      currentPeriodStart: (s.currentPeriodStart as Date).toISOString(),
      currentPeriodEnd: (s.currentPeriodEnd as Date).toISOString(),
      updatedAt: (s.updatedAt as Date).toISOString(),
    })),
  });
}

