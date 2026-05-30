import { NextResponse } from "next/server";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { GamePassPurchaseIntentModel } from "@/lib/models/GamePassPurchaseIntent";
import { calcUnitsForSol } from "@/lib/gamepass/ledger";
import { getTreasuryAddress, type SolanaCluster } from "@/lib/gamepass/config";
import { getClientIp, rateLimitCheck, rateLimitHeaders } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const ip = getClientIp(req);
  const rl = rateLimitCheck(`gamepass:buy-intent:ip:${ip}`, 60, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rl.retryAfterSec) }
    );
  }
  const rlu = rateLimitCheck(`gamepass:buy-intent:user:${session.userId}`, 40, 60 * 60 * 1000);
  if (!rlu.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rlu.retryAfterSec) }
    );
  }

  const body = await req.json().catch(() => null);
  const solAmount = body?.solAmount;
  const cluster = body?.cluster as SolanaCluster | undefined;

  if (typeof solAmount !== "number" || !Number.isFinite(solAmount) || solAmount <= 0) {
    return NextResponse.json({ error: "solAmount must be a positive number" }, { status: 400 });
  }
  // Safety: keep within safe integer lamports so the client can submit reliably.
  if (solAmount * LAMPORTS_PER_SOL > Number.MAX_SAFE_INTEGER) {
    return NextResponse.json({ error: "solAmount too large" }, { status: 400 });
  }
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster must be devnet or mainnet-beta" }, { status: 400 });
  }

  const treasuryWalletAddress = getTreasuryAddress(cluster);
  const { unitsGross, platformFeeUnits, unitsNet } = calcUnitsForSol(solAmount);

  const lamportsExpected = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));
  if (lamportsExpected <= BigInt(0)) {
    return NextResponse.json({ error: "solAmount too small" }, { status: 400 });
  }

  await connectDb();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10);
  const intent = await GamePassPurchaseIntentModel.create({
    userId: session.userId,
    walletAddress: session.walletAddress,
    cluster,
    treasuryWalletAddress,
    lamportsExpected: lamportsExpected.toString(),
    solExpected: String(solAmount),
    unitsGross,
    platformFeeUnits,
    unitsNet,
    status: "created",
    expiresAt,
  });

  return NextResponse.json({
    intent: {
      id: intent._id.toString(),
      cluster,
      treasuryWalletAddress,
      lamportsExpected: lamportsExpected.toString(),
      solExpected: String(solAmount),
      unitsNet,
      expiresAt: expiresAt.toISOString(),
    },
  });
}

