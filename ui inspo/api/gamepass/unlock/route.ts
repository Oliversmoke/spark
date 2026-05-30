import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { userClusterKey, withUserClusterLock } from "@/lib/concurrency/userClusterLock";
import { connectDb } from "@/lib/db";
import { getTreasuryAddress, getGamePassConfig } from "@/lib/gamepass/config";
import { getGamePassBalance } from "@/lib/gamepass/ledger";
import { UnlockModel } from "@/lib/models/Unlock";
import { GamePassLedgerModel } from "@/lib/models/GamePassLedger";
import { EarningsAccrualModel } from "@/lib/models/EarningsAccrual";
import { resolvePaywalledUnlockItem } from "@/lib/gamepass/paywalled";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  const slug = body?.slug;
  const cluster = body?.cluster;

  if ((kind !== "game" && kind !== "content") || typeof slug !== "string") {
    return NextResponse.json({ error: "kind (game|content) and slug required" }, { status: 400 });
  }
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  const item = await resolvePaywalledUnlockItem({ kind, slug });
  if (!item) return NextResponse.json({ error: "item_not_found" }, { status: 404 });
  if (item.priceUnits <= 0) return NextResponse.json({ ok: true, alreadyFree: true });

  return withUserClusterLock(userClusterKey(session.userId, cluster), async () => {
    await connectDb();

    const existing = await UnlockModel.findOne({ userId: session.userId, cluster, kind, slug });
    if (existing) return NextResponse.json({ ok: true, alreadyUnlocked: true });

    const balance = await getGamePassBalance({ userId: session.userId, cluster });
    if (balance < item.priceUnits) {
      return NextResponse.json(
        { error: "insufficient_gamepass", balance, priceUnits: item.priceUnits },
        { status: 400 }
      );
    }

    const cfg = getGamePassConfig();
    const creatorUnits = Math.floor((item.priceUnits * cfg.creatorCutBps) / 10000);
    const platformUnits = Math.max(0, item.priceUnits - creatorUnits);

    const unlock = await UnlockModel.create({
      userId: session.userId,
      walletAddress: session.walletAddress,
      cluster,
      kind,
      slug,
      unitsSpent: item.priceUnits,
    });

    await GamePassLedgerModel.create({
      userId: session.userId,
      walletAddress: session.walletAddress,
      cluster,
      kind: "debit_spend",
      units: -item.priceUnits,
      reason: `Unlocked ${kind}: ${item.title}`,
      unlockId: unlock._id.toString(),
    });

    if (creatorUnits > 0) {
      await EarningsAccrualModel.create({
        cluster,
        kind: "creator",
        ownerWalletAddress: item.creatorWalletAddress,
        sourceKind: kind,
        sourceSlug: slug,
        unlockId: unlock._id.toString(),
        unitsAccrued: creatorUnits,
      });
    }
    if (platformUnits > 0) {
      await EarningsAccrualModel.create({
        cluster,
        kind: "platform",
        ownerWalletAddress: getTreasuryAddress(cluster),
        sourceKind: kind,
        sourceSlug: slug,
        unlockId: unlock._id.toString() + ":platform",
        unitsAccrued: platformUnits,
      });
    }

    const newBalance = await getGamePassBalance({ userId: session.userId, cluster });
    return NextResponse.json({ ok: true, unlockId: unlock._id.toString(), balance: newBalance });
  });
}
