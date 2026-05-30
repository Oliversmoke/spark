import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { UnlockModel } from "@/lib/models/Unlock";
import type { SolanaCluster } from "@/lib/gamepass/config";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const slug = searchParams.get("slug");
  const cluster = searchParams.get("cluster") as SolanaCluster | null;

  if ((kind !== "game" && kind !== "content") || !slug) {
    return NextResponse.json({ error: "kind and slug required" }, { status: 400 });
  }
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  await connectDb();
  const unlock = await UnlockModel.findOne({ userId: session.userId, cluster, kind, slug }).lean();
  return NextResponse.json({
    unlocked: Boolean(unlock),
    unlockId: unlock ? String(unlock._id) : null,
  });
}

