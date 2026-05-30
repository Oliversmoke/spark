import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { appendAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { SubmissionModel } from "@/lib/models/Submission";

export const runtime = "nodejs";

const STAFF = ["admin", "superadmin", "moderator"] as const;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole([...STAFF]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";

  await connectDb();
  const sub = await SubmissionModel.findById(id);
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (sub.status !== "pending") {
    return NextResponse.json({ error: `invalid_status_${sub.status}` }, { status: 400 });
  }

  sub.status = "rejected";
  sub.reviewedAt = new Date();
  sub.reviewedByUserId = auth.session.userId;
  sub.rejectionReason = reason || null;
  await sub.save();

  await appendAudit({
    actor: auth.session,
    action: "submission.reject",
    targetType: "submission",
    targetId: id,
    metadata: { reason: reason || null, slug: sub.slug },
  });

  return NextResponse.json({ ok: true });
}
