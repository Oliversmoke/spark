import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import type { SolanaCluster } from "@/lib/gamepass/config";
import { getUserTransactionFeed } from "@/lib/user-transactions/feed";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get("cluster") as SolanaCluster | null;
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const decoded = decodeURIComponent(id);

  const items = await getUserTransactionFeed({
    userId: session.userId,
    cluster,
    limit: 500,
  });

  const item = items.find((x) => x.id === decoded) ?? null;
  if (!item) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ item });
}

