import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { getOrCreatePayoutSettings } from "@/lib/gamepass/payoutSettings";
import {
  PLATFORM_PAYOUT_SETTINGS_ID,
  PlatformPayoutSettingsModel,
} from "@/lib/models/PlatformPayoutSettings";

export const runtime = "nodejs";

function serialize(s: Awaited<ReturnType<typeof getOrCreatePayoutSettings>>) {
  return {
    payoutsOutgoingEnabled: s.payoutsOutgoingEnabled,
    autoApproveAllPayouts: s.autoApproveAllPayouts,
    manualReviewAboveUnits: s.manualReviewAboveUnits,
    updatedAt: (s.updatedAt as Date).toISOString(),
  };
}

export async function GET() {
  const auth = await requireRole(["admin", "superadmin"]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const s = await getOrCreatePayoutSettings();
  return NextResponse.json(serialize(s));
}

export async function PATCH(req: Request) {
  const auth = await requireRole(["admin", "superadmin"]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.payoutsOutgoingEnabled === "boolean") {
    patch.payoutsOutgoingEnabled = body.payoutsOutgoingEnabled;
  }
  if (typeof body.autoApproveAllPayouts === "boolean") {
    patch.autoApproveAllPayouts = body.autoApproveAllPayouts;
  }
  if (body.manualReviewAboveUnits !== undefined) {
    const n = Number(body.manualReviewAboveUnits);
    if (!Number.isFinite(n) || n < 0 || n > 50_000_000) {
      return NextResponse.json({ error: "invalid_manualReviewAboveUnits" }, { status: 400 });
    }
    patch.manualReviewAboveUnits = Math.floor(n);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  await connectDb();
  await getOrCreatePayoutSettings();
  patch.updatedAt = new Date();
  await PlatformPayoutSettingsModel.updateOne(
    { _id: PLATFORM_PAYOUT_SETTINGS_ID },
    { $set: patch },
    { upsert: true }
  );

  const s = await getOrCreatePayoutSettings();
  return NextResponse.json(serialize(s));
}
