import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { WithdrawalRequestModel } from "@/lib/models/WithdrawalRequest";
import { GamePassLedgerModel } from "@/lib/models/GamePassLedger";

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
  const reason = body?.reason;
  if (typeof requestId !== "string") {
    return NextResponse.json({ error: "requestId required" }, { status: 400 });
  }

  await connectDb();
  const wr = await WithdrawalRequestModel.findById(requestId);
  if (!wr) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (wr.status !== "requested") {
    return NextResponse.json({ error: `invalid_status_${wr.status}` }, { status: 400 });
  }

  wr.status = "rejected";
  wr.reviewedAt = new Date();
  wr.reviewedByUserId = auth.session.userId;
  wr.reason = typeof reason === "string" ? reason : "Rejected by admin";
  await wr.save();

  await GamePassLedgerModel.create({
    userId: wr.userId,
    walletAddress: wr.walletAddress,
    cluster: wr.cluster,
    kind: "credit_refund",
    units: wr.unitsRequested,
    reason: `Withdrawal rejected — refund (${wr.unitsRequested} GP)`,
    unlockId: wr._id.toString(),
  });

  return NextResponse.json({ ok: true });
}
