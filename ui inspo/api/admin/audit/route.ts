import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { AuditLogModel } from "@/lib/models/AuditLog";

export const runtime = "nodejs";

const STAFF = ["admin", "superadmin", "moderator"] as const;

export async function GET(req: Request) {
  const auth = await requireRole([...STAFF]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const { searchParams } = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") ?? 100) || 100));
  const before = searchParams.get("before");
  const q: Record<string, unknown> = {};
  if (before && !Number.isNaN(Date.parse(before))) {
    q.createdAt = { $lt: new Date(before) };
  }

  await connectDb();
  const rows = await AuditLogModel.find(q).sort({ createdAt: -1 }).limit(limit).lean();

  return NextResponse.json({
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
