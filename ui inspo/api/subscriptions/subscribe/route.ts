import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { withUserClusterLock, userClusterKey } from "@/lib/concurrency/userClusterLock";
import { connectDb } from "@/lib/db";
import type { SolanaCluster } from "@/lib/gamepass/config";
import { getGamePassConfig, getTreasuryAddress } from "@/lib/gamepass/config";
import { getGamePassBalance } from "@/lib/gamepass/ledger";
import { EarningsAccrualModel } from "@/lib/models/EarningsAccrual";
import { GamePassLedgerModel } from "@/lib/models/GamePassLedger";
import { SubscriptionModel } from "@/lib/models/Subscription";
import { SubscriptionPlanModel } from "@/lib/models/SubscriptionPlan";
import { nextPeriodEnd } from "@/lib/subscriptions/period";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const planId = typeof body?.planId === "string" ? body.planId.trim() : "";
  const cluster = body?.cluster as SolanaCluster | undefined;
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  return withUserClusterLock(userClusterKey(session.userId, cluster), async () => {
    await connectDb();
    const plan = await SubscriptionPlanModel.findById(planId).lean();
    if (!plan || !plan.isActive) return NextResponse.json({ error: "plan_not_found" }, { status: 404 });

    const existing = await SubscriptionModel.findOne({
      planId,
      subscriberUserId: session.userId,
      cluster,
    });
    if (existing && existing.status === "active" && existing.currentPeriodEnd.getTime() > Date.now()) {
      return NextResponse.json({ ok: true, alreadyActive: true, subscriptionId: existing._id.toString() });
    }

    const priceUnits = plan.priceUnits;
    const balance = await getGamePassBalance({ userId: session.userId, cluster });
    if (balance < priceUnits) {
      return NextResponse.json({ error: "insufficient_gamepass", balance, priceUnits }, { status: 400 });
    }

    const cfg = getGamePassConfig();
    const creatorUnits = Math.floor((priceUnits * cfg.creatorCutBps) / 10000);
    const platformUnits = Math.max(0, priceUnits - creatorUnits);

    const ledger = await GamePassLedgerModel.create({
      userId: session.userId,
      walletAddress: session.walletAddress,
      cluster,
      kind: "debit_spend",
      units: -priceUnits,
      reason: `Subscription start: ${plan.title}`,
      unlockId: `sub_start:${planId}:${session.userId}:${cluster}:${new Date().toISOString()}`,
    });

    const lid = ledger._id.toString();

    if (creatorUnits > 0) {
      await EarningsAccrualModel.create({
        cluster,
        kind: "creator",
        ownerWalletAddress: plan.ownerWalletAddress,
        sourceKind: "content",
        sourceSlug: `plan:${planId}`,
        unlockId: `sub_start:${lid}`,
        unitsAccrued: creatorUnits,
      });
    }
    if (platformUnits > 0) {
      await EarningsAccrualModel.create({
        cluster,
        kind: "platform",
        ownerWalletAddress: getTreasuryAddress(cluster),
        sourceKind: "content",
        sourceSlug: `plan:${planId}`,
        unlockId: `sub_start:${lid}:platform`,
        unitsAccrued: platformUnits,
      });
    }

    const start = new Date();
    const end = nextPeriodEnd(start, plan.cadence);

    const doc = await SubscriptionModel.findOneAndUpdate(
      { planId, subscriberUserId: session.userId, cluster },
      {
        $set: {
          planId,
          ownerUserId: plan.ownerUserId,
          ownerWalletAddress: plan.ownerWalletAddress,
          subscriberUserId: session.userId,
          subscriberWalletAddress: session.walletAddress,
          status: "active",
          cluster,
          cadence: plan.cadence,
          priceUnits: plan.priceUnits,
          currentPeriodStart: start,
          currentPeriodEnd: end,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          lastChargedAt: new Date(),
          lastLedgerId: lid,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      ok: true,
      subscriptionId: doc._id.toString(),
      currentPeriodEnd: end.toISOString(),
    });
  });
}

