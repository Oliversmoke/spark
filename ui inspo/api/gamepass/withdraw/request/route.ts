import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { userClusterKey, withUserClusterLock } from "@/lib/concurrency/userClusterLock";
import { connectDb } from "@/lib/db";
import { getGamePassBalance } from "@/lib/gamepass/ledger";
import {
  getOrCreatePayoutSettings,
  withdrawalNeedsManualReview,
} from "@/lib/gamepass/payoutSettings";
import { calcWithdraw, getWithdrawConfig } from "@/lib/gamepass/withdraw";
import { executeWithdrawalPayout } from "@/lib/gamepass/withdrawalPayout";
import { WithdrawalRequestModel } from "@/lib/models/WithdrawalRequest";
import { GamePassLedgerModel } from "@/lib/models/GamePassLedger";
import { getClientIp, rateLimitCheck, rateLimitHeaders } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const ip = getClientIp(req);
  const rl = rateLimitCheck(`gamepass:withdraw:ip:${ip}`, 30, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rl.retryAfterSec) }
    );
  }
  const rlu = rateLimitCheck(`gamepass:withdraw:user:${session.userId}`, 25, 60 * 60 * 1000);
  if (!rlu.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rlu.retryAfterSec) }
    );
  }

  const body = await req.json().catch(() => null);
  const cluster = body?.cluster;
  const unitsRequested = body?.unitsRequested;
  const destinationWalletAddress = body?.destinationWalletAddress ?? session.walletAddress;

  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }
  if (typeof unitsRequested !== "number" || !Number.isFinite(unitsRequested) || unitsRequested <= 0) {
    return NextResponse.json({ error: "unitsRequested must be a positive number" }, { status: 400 });
  }
  if (typeof destinationWalletAddress !== "string" || destinationWalletAddress.length < 20) {
    return NextResponse.json({ error: "destinationWalletAddress invalid" }, { status: 400 });
  }

  const cfg = getWithdrawConfig();
  const unitsInt = Math.floor(unitsRequested);
  if (unitsInt < cfg.minUnits) {
    return NextResponse.json({ error: `min_withdraw_units_${cfg.minUnits}` }, { status: 400 });
  }
  if (unitsInt > cfg.maxUnits) {
    return NextResponse.json({ error: `max_withdraw_units_${cfg.maxUnits}` }, { status: 400 });
  }

  await connectDb();

  const payoutSettings = await getOrCreatePayoutSettings();
  if (!payoutSettings.payoutsOutgoingEnabled) {
    return NextResponse.json({ error: "payouts_outgoing_disabled" }, { status: 400 });
  }

  const { feeUnits, unitsNet, lamports } = calcWithdraw({ unitsRequested: unitsInt });
  if (lamports <= BigInt(0)) {
    return NextResponse.json({ error: "withdraw_amount_too_small" }, { status: 400 });
  }

  return withUserClusterLock(userClusterKey(session.userId, cluster), async () => {
    const balance = await getGamePassBalance({ userId: session.userId, cluster });
    if (balance < unitsInt) {
      return NextResponse.json({ error: "insufficient_gamepass", balance }, { status: 400 });
    }

    const reqDoc = await WithdrawalRequestModel.create({
      userId: session.userId,
      walletAddress: session.walletAddress,
      cluster,
      unitsRequested: unitsInt,
      feeUnits,
      unitsNet,
      lamportsPayout: lamports.toString(),
      destinationWalletAddress,
      status: "requested",
    });

    await GamePassLedgerModel.create({
      userId: session.userId,
      walletAddress: session.walletAddress,
      cluster,
      kind: "debit_spend",
      units: -unitsInt,
      reason: `Withdrawal request (${unitsInt} GP)`,
      unlockId: reqDoc._id.toString(),
    });

    const needsManual = withdrawalNeedsManualReview(unitsInt, payoutSettings);
    let finalStatus = reqDoc.status;
    let payoutSignature: string | null = null;
    let payoutError: string | null = null;

    if (!needsManual) {
      const wrFresh = await WithdrawalRequestModel.findById(reqDoc._id);
      if (wrFresh) {
        const pay = await executeWithdrawalPayout({ wr: wrFresh, reviewedByUserId: null });
        const updated = await WithdrawalRequestModel.findById(reqDoc._id).lean();
        finalStatus = (updated?.status as string) ?? reqDoc.status;
        if (pay.ok) payoutSignature = pay.payoutSignature;
        else payoutError = pay.error;
      }
    }

    return NextResponse.json({
      ok: true,
      request: {
        id: reqDoc._id.toString(),
        status: finalStatus,
        pendingManualReview: needsManual,
        cluster,
        unitsRequested: unitsInt,
        feeUnits,
        unitsNet,
        lamportsPayout: lamports.toString(),
        destinationWalletAddress,
        createdAt: reqDoc.createdAt.toISOString(),
        payoutSignature,
        payoutError,
      },
    });
  });
}
