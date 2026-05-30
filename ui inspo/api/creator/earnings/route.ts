import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { SolanaCluster } from "@/lib/gamepass/config";
import { EarningsAccrualModel } from "@/lib/models/EarningsAccrual";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get("cluster") as SolanaCluster | null;
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  await connectDb();
  const rows = await EarningsAccrualModel.find({
    cluster,
    kind: "creator",
    ownerWalletAddress: session.walletAddress,
    sourceKind: "content",
  })
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  let totalUnits = 0;
  const bySlug = new Map<string, number>();
  for (const r of rows) {
    totalUnits += r.unitsAccrued;
    const prev = bySlug.get(r.sourceSlug) ?? 0;
    bySlug.set(r.sourceSlug, prev + r.unitsAccrued);
  }

  return NextResponse.json({
    totalUnits,
    bySlug: Object.fromEntries(bySlug),
    items: rows.map((r) => ({
      id: String(r._id),
      sourceSlug: r.sourceSlug,
      unitsAccrued: r.unitsAccrued,
      unlockId: r.unlockId,
      createdAt: (r.createdAt as Date).toISOString(),
    })),
  });
}
