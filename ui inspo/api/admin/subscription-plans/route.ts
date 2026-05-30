import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { SubscriptionPlanModel } from "@/lib/models/SubscriptionPlan";

export const runtime = "nodejs";

const STAFF = ["admin", "superadmin", "moderator", "support", "finance"] as const;

export async function GET(req: Request) {
  const auth = await requireRole([...STAFF]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const { searchParams } = new URL(req.url);
  const ownerUserId = searchParams.get("ownerUserId") ?? undefined;
  const active = searchParams.get("active");
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 120) || 120));

  await connectDb();
  const q: Record<string, unknown> = {};
  if (ownerUserId) q.ownerUserId = ownerUserId;
  if (active === "true") q.isActive = true;
  if (active === "false") q.isActive = false;

  const rows = await SubscriptionPlanModel.find(q).sort({ updatedAt: -1 }).limit(limit).lean();
  return NextResponse.json({
    items: rows.map((p: any) => ({
      id: String(p._id),
      ownerUserId: p.ownerUserId,
      ownerWalletAddress: p.ownerWalletAddress,
      title: p.title,
      cadence: p.cadence,
      priceUnits: p.priceUnits,
      targets: p.targets ?? [],
      isActive: Boolean(p.isActive),
      updatedAt: (p.updatedAt as Date).toISOString(),
    })),
  });
}

