import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import type { SolanaCluster } from "@/lib/gamepass/config";
import { getUserTransactionFeed } from "@/lib/user-transactions/feed";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get("cluster") as SolanaCluster | null;
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? 200) || 200));

  const items = await getUserTransactionFeed({
    userId: session.userId,
    cluster,
    limit,
  });

  return NextResponse.json({ items });
}
