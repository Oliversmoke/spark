import { NextResponse } from "next/server";
import { getSessionUserActive } from "@/lib/auth/session";
import { getGamePassBalance } from "@/lib/gamepass/ledger";
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

  const units = await getGamePassBalance({ userId: session.userId, cluster });
  return NextResponse.json({ units });
}

