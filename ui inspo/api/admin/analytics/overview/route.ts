import { NextResponse } from "next/server";

import { buildAnalyticsOverview } from "@/lib/analytics/overview";
import { requireRole } from "@/lib/auth/session";
import type { SolanaCluster } from "@/lib/gamepass/config";

export const runtime = "nodejs";

const ANALYTICS_ROLES = ["admin", "superadmin", "moderator", "finance"] as const;

const MAX_RANGE_MS = 366 * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const auth = await requireRole([...ANALYTICS_ROLES]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get("cluster") as SolanaCluster | null;
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  const untilRaw = searchParams.get("until");
  const sinceRaw = searchParams.get("since");
  const until = untilRaw ? new Date(untilRaw) : new Date();
  if (Number.isNaN(until.getTime())) {
    return NextResponse.json({ error: "invalid_until" }, { status: 400 });
  }
  const defaultSince = new Date(until.getTime() - 30 * 24 * 60 * 60 * 1000);
  const since = sinceRaw ? new Date(sinceRaw) : defaultSince;
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "invalid_since" }, { status: 400 });
  }
  if (since >= until) {
    return NextResponse.json({ error: "since_must_be_before_until" }, { status: 400 });
  }
  if (until.getTime() - since.getTime() > MAX_RANGE_MS) {
    return NextResponse.json({ error: "range_max_366_days" }, { status: 400 });
  }

  const overview = await buildAnalyticsOverview({ cluster, since, until });

  return NextResponse.json({
    ...overview,
    notes: {
      funnel:
        "Funnel metrics mix global accounts (new sign-ups) with cluster-scoped economy and gameplay. They are not strictly sequential unique users.",
      safety:
        "High-frequency withdrawals = 3+ withdrawal rows in range. Top debit users = largest absolute debit_spend volume. Refund lines = ledger kind credit_refund.",
    },
  });
}
