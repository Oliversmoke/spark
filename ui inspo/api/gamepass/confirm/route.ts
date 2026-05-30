import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { GamePassPurchaseIntentModel } from "@/lib/models/GamePassPurchaseIntent";
import { GamePassLedgerModel } from "@/lib/models/GamePassLedger";
import { getRpcEndpoint, type SolanaCluster } from "@/lib/gamepass/config";

export const runtime = "nodejs";

async function verifyTreasuryTransferAndPayer(args: {
  cluster: SolanaCluster;
  signature: string;
  treasuryWalletAddress: string;
  lamportsExpected: bigint;
  expectedPayerWalletAddress: string;
}) {
  const connection = new Connection(getRpcEndpoint(args.cluster), {
    commitment: "confirmed",
  });

  const tx = await connection.getTransaction(args.signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!tx) return { ok: false as const, error: "Transaction not found/confirmed yet" };
  if (tx.meta?.err) return { ok: false as const, error: "Transaction failed" };

  const keys = tx.transaction.message.getAccountKeys();
  const feePayer = keys.get(0);
  const expectedPayer = new PublicKey(args.expectedPayerWalletAddress);
  if (!feePayer || !feePayer.equals(expectedPayer)) {
    return { ok: false as const, error: "Fee payer must be your connected wallet" };
  }

  const treasury = new PublicKey(args.treasuryWalletAddress);

  let net = BigInt(0);
  for (let i = 0; i < keys.length; i += 1) {
    const k = keys.get(i);
    if (!k) continue;
    if (!k.equals(treasury)) continue;
    const pre = BigInt(tx.meta?.preBalances?.[i] ?? 0);
    const post = BigInt(tx.meta?.postBalances?.[i] ?? 0);
    net += post - pre;
  }

  if (net < args.lamportsExpected) {
    return { ok: false as const, error: "Treasury transfer amount too small" };
  }
  return { ok: true as const };
}

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const intentId = body?.intentId;
  const signature = body?.signature;

  if (typeof intentId !== "string" || typeof signature !== "string") {
    return NextResponse.json({ error: "intentId and signature required" }, { status: 400 });
  }

  await connectDb();

  const intentBefore = await GamePassPurchaseIntentModel.findById(intentId);
  if (!intentBefore) return NextResponse.json({ error: "intent_not_found" }, { status: 404 });
  if (intentBefore.userId !== session.userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  if (intentBefore.status === "confirmed") {
    if (intentBefore.txSignature === signature) {
      return NextResponse.json({ ok: true, unitsCredited: intentBefore.unitsNet });
    }
    return NextResponse.json({ error: "intent_already_confirmed" }, { status: 400 });
  }

  if (intentBefore.expiresAt.getTime() < Date.now()) {
    intentBefore.status = "expired";
    await intentBefore.save();
    return NextResponse.json({ error: "intent_expired" }, { status: 400 });
  }

  const cluster = intentBefore.cluster as SolanaCluster;
  const verify = await verifyTreasuryTransferAndPayer({
    cluster,
    signature,
    treasuryWalletAddress: intentBefore.treasuryWalletAddress,
    lamportsExpected: BigInt(intentBefore.lamportsExpected),
    expectedPayerWalletAddress: intentBefore.walletAddress,
  });
  if (!verify.ok) {
    intentBefore.status = "failed";
    intentBefore.txSignature = signature;
    await intentBefore.save();
    return NextResponse.json({ error: verify.error }, { status: 400 });
  }

  const confirmed = await GamePassPurchaseIntentModel.findOneAndUpdate(
    {
      _id: intentId,
      userId: session.userId,
      status: "created",
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        status: "confirmed",
        txSignature: signature,
        confirmedAt: new Date(),
      },
    },
    { new: true }
  );

  if (!confirmed) {
    const again = await GamePassPurchaseIntentModel.findById(intentId).lean();
    if (
      again?.status === "confirmed" &&
      again.txSignature === signature &&
      again.userId === session.userId
    ) {
      return NextResponse.json({ ok: true, unitsCredited: again.unitsNet });
    }
    return NextResponse.json({ error: "confirm_race_or_expired" }, { status: 409 });
  }

  try {
    await GamePassLedgerModel.create({
      userId: session.userId,
      walletAddress: session.walletAddress,
      cluster,
      kind: "credit_purchase",
      units: confirmed.unitsNet,
      reason: `Purchased GamePass (${confirmed.solExpected} SOL)`,
      intentId: confirmed._id.toString(),
    });
  } catch (e) {
    const code = (e as { code?: number })?.code;
    if (code === 11000) {
      return NextResponse.json({ ok: true, unitsCredited: confirmed.unitsNet });
    }
    throw e;
  }

  return NextResponse.json({ ok: true, unitsCredited: confirmed.unitsNet });
}
