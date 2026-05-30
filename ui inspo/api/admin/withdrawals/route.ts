import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { WithdrawalRequestModel } from "@/lib/models/WithdrawalRequest";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireRole(["admin", "superadmin"]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get("cluster");
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  await connectDb();
  const rows = await WithdrawalRequestModel.find({ cluster })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({
    items: rows.map((r) => ({
      id: String(r._id),
      userId: r.userId,
      walletAddress: r.walletAddress,
      status: r.status,
      unitsRequested: r.unitsRequested,
      lamportsPayout: r.lamportsPayout,
      destinationWalletAddress: r.destinationWalletAddress,
      createdAt: (r.createdAt as Date).toISOString(),
      payoutSignature: r.payoutSignature ?? null,
    })),
  });
}

