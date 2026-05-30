import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { getOrCreatePayoutSettings } from "@/lib/gamepass/payoutSettings";
import { executeWithdrawalPayout } from "@/lib/gamepass/withdrawalPayout";
import { WithdrawalRequestModel } from "@/lib/models/WithdrawalRequest";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireRole(["admin", "superadmin"]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const body = await req.json().catch(() => null);
  const requestId = body?.requestId;
  if (typeof requestId !== "string") {
    return NextResponse.json({ error: "requestId required" }, { status: 400 });
  }

  const settings = await getOrCreatePayoutSettings();
  if (!settings.payoutsOutgoingEnabled) {
    return NextResponse.json({ error: "payouts_outgoing_disabled" }, { status: 400 });
  }

  await connectDb();
  const wr = await WithdrawalRequestModel.findById(requestId);
  if (!wr) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (wr.status !== "requested") {
    return NextResponse.json({ error: `invalid_status_${wr.status}` }, { status: 400 });
  }

  const result = await executeWithdrawalPayout({
    wr,
    reviewedByUserId: auth.session.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: "payout_failed", detail: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, payoutSignature: result.payoutSignature });
}
