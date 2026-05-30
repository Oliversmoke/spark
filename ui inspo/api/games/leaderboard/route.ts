import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { LeaderboardEntryModel } from "@/lib/models/LeaderboardEntry";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get("cluster");
  const gameId = searchParams.get("gameId");

  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }
  if (!gameId) return NextResponse.json({ error: "gameId required" }, { status: 400 });

  await connectDb();
  const rows = await LeaderboardEntryModel.find({ cluster, gameId })
    .sort({ bestScore: -1, updatedAt: 1 })
    .limit(25)
    .lean();

  return NextResponse.json({
    items: rows.map((r) => ({
      id: String(r._id),
      walletAddress: r.walletAddress,
      bestScore: r.bestScore,
      bestPoints: r.bestPoints,
      updatedAt: (r.updatedAt as Date).toISOString(),
    })),
  });
}

