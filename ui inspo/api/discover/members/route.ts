import { NextResponse } from "next/server";

import { discoverCreatorDeveloperMembers, type DiscoverSort } from "@/lib/discover/members";
import type { SolanaCluster } from "@/lib/gamepass/config";

export const runtime = "nodejs";

const SORTS = new Set<DiscoverSort>(["rank", "wins", "sessions", "published"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get("cluster") as SolanaCluster | null;
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  const q = searchParams.get("q") ?? undefined;
  const rawSort = searchParams.get("sort") ?? "rank";
  const sort = SORTS.has(rawSort as DiscoverSort) ? (rawSort as DiscoverSort) : "rank";

  const limit = Math.min(60, Math.max(1, Number(searchParams.get("limit") ?? 24) || 24));
  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const skip = (page - 1) * limit;

  const { total, items, cappedMerge } = await discoverCreatorDeveloperMembers({
    cluster,
    q,
    sort,
    skip,
    limit,
  });

  return NextResponse.json({
    cluster,
    sort,
    page,
    limit,
    total,
    cappedMerge,
    items: items.map((r) => ({
      ...r,
      profilePath: r.username ? `/u/${encodeURIComponent(r.username)}` : null,
    })),
  });
}
