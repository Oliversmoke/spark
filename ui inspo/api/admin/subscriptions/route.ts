import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { SubscriptionModel } from "@/lib/models/Subscription";
import { SubscriptionPlanModel } from "@/lib/models/SubscriptionPlan";

export const runtime = "nodejs";

const STAFF = ["admin", "superadmin", "moderator", "support", "finance"] as const;

export async function GET(req: Request) {
  const auth = await requireRole([...STAFF]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get("cluster");
  const status = searchParams.get("status") ?? "active";
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 120) || 120));

  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }
  if (status !== "active" && status !== "past_due" && status !== "canceled" && status !== "all") {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  await connectDb();

  const q: Record<string, unknown> = { cluster };
  if (status !== "all") q.status = status;

  const subs = await SubscriptionModel.find(q).sort({ updatedAt: -1 }).limit(limit).lean();
  const planIds = [...new Set(subs.map((s) => s.planId))];
  const plans = await SubscriptionPlanModel.find({ _id: { $in: planIds } })
    .select({ title: 1, ownerUserId: 1, ownerWalletAddress: 1, cadence: 1, priceUnits: 1, isActive: 1 })
    .lean();
  const planById = new Map(plans.map((p) => [String(p._id), p]));

  return NextResponse.json({
    items: subs.map((s) => {
      const p = planById.get(s.planId) as any;
      return {
        id: String(s._id),
        cluster: s.cluster,
        status: s.status,
        planId: s.planId,
        planTitle: p?.title ?? "",
        planIsActive: Boolean(p?.isActive),
        ownerUserId: s.ownerUserId,
        ownerWalletAddress: s.ownerWalletAddress,
        subscriberUserId: s.subscriberUserId,
        subscriberWalletAddress: s.subscriberWalletAddress,
        cadence: s.cadence,
        priceUnits: s.priceUnits,
        cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
        currentPeriodEnd: (s.currentPeriodEnd as Date).toISOString(),
        updatedAt: (s.updatedAt as Date).toISOString(),
      };
    }),
  });
}

