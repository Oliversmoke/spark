import { NextResponse } from "next/server";
import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { GamePassLedgerModel } from "@/lib/models/GamePassLedger";
import type { SolanaCluster } from "@/lib/gamepass/config";

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
  const rows = await GamePassLedgerModel.find({ userId: session.userId, cluster })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    items: rows.map((r) => ({
      id: String(r._id),
      kind: r.kind,
      units: r.units,
      reason: r.reason ?? null,
      createdAt: (r.createdAt as Date).toISOString(),
    })),
  });
}

