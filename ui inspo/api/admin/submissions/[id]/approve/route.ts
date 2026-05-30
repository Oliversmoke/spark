import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { appendAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { isDemoSlugReserved } from "@/lib/submissions/slug";
import { connectDb } from "@/lib/db";
import { SubmissionModel } from "@/lib/models/Submission";

export const runtime = "nodejs";

const STAFF = ["admin", "superadmin", "moderator"] as const;

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
  if (sub.status !== "pending") {
    return NextResponse.json({ error: `invalid_status_${sub.status}` }, { status: 400 });
  }

  if (isDemoSlugReserved(sub.slug)) {
    return NextResponse.json({ error: "slug_conflicts_with_demo_catalog" }, { status: 400 });
  }

  const duplicate = await SubmissionModel.findOne({
    _id: { $ne: sub._id },
    kind: sub.kind,
    slug: sub.slug,
    status: "approved",
  }).lean();
  if (duplicate) return NextResponse.json({ error: "slug_already_approved" }, { status: 400 });

  sub.status = "approved";
  sub.reviewedAt = new Date();
  sub.reviewedByUserId = auth.session.userId;
  sub.rejectionReason = null;
  await sub.save();

  await appendAudit({
    actor: auth.session,
    action: "submission.approve",
    targetType: "submission",
    targetId: id,
    metadata: { slug: sub.slug, kind: sub.kind },
  });

  return NextResponse.json({ ok: true });
}
