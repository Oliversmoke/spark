import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { WithdrawalRequestModel } from "@/lib/models/WithdrawalRequest";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const cluster = searchParams.get("cluster");
  if (cluster !== "devnet" && cluster !== "mainnet-beta") {
    return NextResponse.json({ error: "cluster required" }, { status: 400 });
  }

  await connectDb();
  const rows = await WithdrawalRequestModel.find({ userId: session.userId, cluster })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    items: rows.map((r) => ({
      id: String(r._id),
      status: r.status,
      unitsRequested: r.unitsRequested,
      feeUnits: r.feeUnits,
      unitsNet: r.unitsNet,
      lamportsPayout: r.lamportsPayout,
      destinationWalletAddress: r.destinationWalletAddress,
      payoutSignature: r.payoutSignature ?? null,
      createdAt: (r.createdAt as Date).toISOString(),
    })),
  });
}

