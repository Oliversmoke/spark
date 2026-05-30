import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { getTreasuryAddress, getGamePassConfig } from "@/lib/gamepass/config";
import { getGamePassBalance } from "@/lib/gamepass/ledger";
import { CreatorPostModel } from "@/lib/models/CreatorPost";
import { GamePassLedgerModel } from "@/lib/models/GamePassLedger";
import { EarningsAccrualModel } from "@/lib/models/EarningsAccrual";

export const runtime = "nodejs";

/** Debit GamePass each time a user opens paid per-view creator content. */
export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const cluster = body?.cluster;

  if (!slug || (cluster !== "devnet" && cluster !== "mainnet-beta")) {
    return NextResponse.json({ error: "slug and cluster required" }, { status: 400 });
  }

  await connectDb();
  const post = await CreatorPostModel.findOne({ slug, status: "published" }).lean();
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (post.access !== "gamepass" || post.purchaseMode !== "per_view" || post.priceUnits <= 0) {
    return NextResponse.json({ error: "not_per_view_paid" }, { status: 400 });
  }

  const priceUnits = post.priceUnits;
  const balance = await getGamePassBalance({ userId: session.userId, cluster });
  if (balance < priceUnits) {
    return NextResponse.json(
      { error: "insufficient_gamepass", balance, priceUnits },
      { status: 400 }
    );
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
    reason: `View content: ${post.title}`,
  });

  const lid = ledger._id.toString();

  if (creatorUnits > 0) {
    await EarningsAccrualModel.create({
      cluster,
      kind: "creator",
      ownerWalletAddress: post.creatorWalletAddress,
      sourceKind: "content",
      sourceSlug: slug,
      unlockId: `view:${lid}`,
      unitsAccrued: creatorUnits,
    });
  }
  if (platformUnits > 0) {
    await EarningsAccrualModel.create({
      cluster,
      kind: "platform",
      ownerWalletAddress: getTreasuryAddress(cluster),
      sourceKind: "content",
      sourceSlug: slug,
      unlockId: `view:${lid}:platform`,
      unitsAccrued: platformUnits,
    });
  }

  const newBalance = await getGamePassBalance({ userId: session.userId, cluster });
  return NextResponse.json({ ok: true, ledgerId: lid, balance: newBalance });
}
