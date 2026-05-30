import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { SolanaCluster } from "@/lib/gamepass/config";
import { GamePassLedgerModel } from "@/lib/models/GamePassLedger";
import { UnlockModel } from "@/lib/models/Unlock";

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
  const [ledgerRows, unlockRows] = await Promise.all([
    GamePassLedgerModel.find({
      userId: session.userId,
      cluster,
      kind: "debit_spend",
      $or: [
        { reason: { $regex: /^Unlocked content:/ } },
        { reason: { $regex: /^View content:/ } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
    UnlockModel.find({ userId: session.userId, cluster, kind: "content" })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ]);

  return NextResponse.json({
    ledger: ledgerRows.map((r) => ({
      id: String(r._id),
      units: r.units,
      reason: r.reason ?? null,
      createdAt: (r.createdAt as Date).toISOString(),
    })),
    unlocks: unlockRows.map((r) => ({
      id: String(r._id),
      slug: r.slug,
      unitsSpent: r.unitsSpent,
      createdAt: (r.createdAt as Date).toISOString(),
    })),
  });
}
