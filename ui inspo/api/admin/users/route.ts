import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { UserModel } from "@/lib/models/User";

export const runtime = "nodejs";

const ADMINS = ["admin", "superadmin"] as const;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(req: Request) {
  const auth = await requireRole([...ADMINS]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50) || 50));

  await connectDb();

  let rows;
  if (q) {
    if (mongoose.Types.ObjectId.isValid(q) && new mongoose.Types.ObjectId(q).toString() === q) {
      rows = await UserModel.find({ _id: q }).limit(limit).lean();
    } else {
      rows = await UserModel.find({
        primaryWalletAddress: new RegExp(escapeRegex(q), "i"),
      })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();
    }
  } else {
    rows = await UserModel.find({}).sort({ updatedAt: -1 }).limit(limit).lean();
  }

  return NextResponse.json({
    items: rows.map((u) => ({
      id: String(u._id),
      walletAddress: u.primaryWalletAddress,
      roles: u.roles,
      status: u.status,
      createdAt: (u.createdAt as Date).toISOString(),
      updatedAt: (u.updatedAt as Date).toISOString(),
    })),
  });
}
