import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { appendAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { SubmissionModel } from "@/lib/models/Submission";

export const runtime = "nodejs";

const STAFF = ["admin", "superadmin", "moderator"] as const;

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  await connectDb();
  const sub = await SubmissionModel.findById(id);
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (sub.status === "approved") {
    sub.status = "deleted";
    await sub.save();
    await appendAudit({
      actor: auth.session,
      action: "submission.soft_delete",
      targetType: "submission",
      targetId: id,
      metadata: { slug: sub.slug, note: "approved_item_hidden" },
    });
    return NextResponse.json({ ok: true, mode: "soft" });
  }

  await SubmissionModel.deleteOne({ _id: sub._id });
  await appendAudit({
    actor: auth.session,
    action: "submission.delete",
    targetType: "submission",
    targetId: id,
    metadata: { slug: sub.slug, priorStatus: sub.status },
  });

  return NextResponse.json({ ok: true, mode: "hard" });
}
