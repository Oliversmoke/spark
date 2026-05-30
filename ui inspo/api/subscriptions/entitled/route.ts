import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { withUserClusterLock, userClusterKey } from "@/lib/concurrency/userClusterLock";
import type { SolanaCluster } from "@/lib/gamepass/config";
import { ensureEntitled } from "@/lib/subscriptions/entitlement";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get("cluster") as SolanaCluster | null;
  const kind = searchParams.get("kind");
  const slug = (searchParams.get("slug") ?? "").trim().toLowerCase();

  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }
  if (kind !== "game" && kind !== "content") {
    return NextResponse.json({ error: "kind required" }, { status: 400 });
  }
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  return withUserClusterLock(userClusterKey(session.userId, cluster), async () => {
    const ent = await ensureEntitled({
      subscriberUserId: session.userId,
      subscriberWalletAddress: session.walletAddress,
      cluster,
      target: { kind, slug },
    });
    if (!ent.ok) return NextResponse.json(ent, { status: 400 });
    return NextResponse.json(ent);
  });
}

