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
  const cluster = searchParams.get("cluster");
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  await connectDb();
  const subs = await SubscriptionModel.find({ subscriberUserId: session.userId, cluster })
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  const planIds = [...new Set(subs.map((s) => s.planId))];
  const plans = await SubscriptionPlanModel.find({ _id: { $in: planIds } })
    .select({ title: 1, description: 1, cadence: 1, priceUnits: 1, targets: 1, ownerUserId: 1 })
    .lean();
  const planById = new Map(plans.map((p) => [String(p._id), p]));

  return NextResponse.json({
    items: subs.map((s) => {
      const p = planById.get(s.planId);
      return {
        id: String(s._id),
        planId: s.planId,
        plan: p
          ? {
              id: String((p as any)._id),
              title: (p as any).title,
              description: (p as any).description ?? "",
              cadence: (p as any).cadence,
              priceUnits: (p as any).priceUnits,
              targets: (p as any).targets ?? [],
              ownerUserId: (p as any).ownerUserId,
            }
          : null,
        status: s.status,
        cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
        currentPeriodStart: (s.currentPeriodStart as Date).toISOString(),
        currentPeriodEnd: (s.currentPeriodEnd as Date).toISOString(),
        updatedAt: (s.updatedAt as Date).toISOString(),
      };
    }),
  });
}

