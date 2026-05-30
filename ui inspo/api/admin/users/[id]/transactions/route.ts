import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import type { SolanaCluster } from "@/lib/gamepass/config";
import { getUserTransactionFeed } from "@/lib/user-transactions/feed";

export const runtime = "nodejs";

const ADMINS = ["admin", "superadmin"] as const;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole([...ADMINS]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get("cluster") as SolanaCluster | null;
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  const limit = Math.min(500, Math.max(1, Number(searchParams.get("limit") ?? 200) || 200));

  const items = await getUserTransactionFeed({ userId: id, cluster, limit });

  return NextResponse.json({ userId: id, items });
}
