import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { AuditLogModel } from "@/lib/models/AuditLog";

export const runtime = "nodejs";

const ADMINS = ["admin", "superadmin"] as const;

/** Audit entries where this user acted or was the target (e.g. ban/unban). */
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
  const limit = Math.min(300, Math.max(1, Number(searchParams.get("limit") ?? 100) || 100));

  await connectDb();
  const rows = await AuditLogModel.find({
    $or: [{ actorUserId: id }, { targetType: "user", targetId: id }],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return NextResponse.json({
    userId: id,
    items: rows.map((r) => ({
      id: String(r._id),
      actorUserId: r.actorUserId,
      actorWallet: r.actorWallet,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      metadata: r.metadata ?? null,
      createdAt: (r.createdAt as Date).toISOString(),
    })),
  });
}
