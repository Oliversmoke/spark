import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { appendAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { QaReviewEmbedded } from "@/lib/models/Submission";
import { SubmissionModel } from "@/lib/models/Submission";

export const runtime = "nodejs";

const STAFF = ["admin", "superadmin", "moderator"] as const;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
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

  await connectDb();
  const sub = await SubmissionModel.findById(id);
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const prev = sub.qaReview;
  const next: QaReviewEmbedded = {
    playableLinkOk:
      typeof body?.playableLinkOk === "boolean" ? body.playableLinkOk : (prev?.playableLinkOk ?? false),
    mediaReviewedOk:
      typeof body?.mediaReviewedOk === "boolean"
        ? body.mediaReviewedOk
        : (prev?.mediaReviewedOk ?? false),
    metadataCompleteOk:
      typeof body?.metadataCompleteOk === "boolean"
        ? body.metadataCompleteOk
        : (prev?.metadataCompleteOk ?? false),
    notes: typeof body?.notes === "string" ? body.notes.trim().slice(0, 4000) : (prev?.notes ?? ""),
    updatedAt: new Date(),
    reviewerUserId: auth.session.userId,
  };

  sub.qaReview = next;
  await sub.save();

  await appendAudit({
    actor: auth.session,
    action: "submission.qa_update",
    targetType: "submission",
    targetId: id,
    metadata: { slug: sub.slug },
  });

  return NextResponse.json({ ok: true, qaReview: next });
}
