import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { appendAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { AppealStatus } from "@/lib/models/Appeal";
import { AppealModel } from "@/lib/models/Appeal";
import { serializeAppealForStaff } from "@/lib/appeals/serialize";

export const runtime = "nodejs";

const STAFF = ["admin", "superadmin", "moderator", "support"] as const;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
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
  const doc = await AppealModel.findById(id);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ appeal: serializeAppealForStaff(doc) });
}

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
  const nextStatus = body?.status as AppealStatus | undefined;
  const publicStaffResponse =
    typeof body?.publicStaffResponse === "string"
      ? body.publicStaffResponse.trim().slice(0, 8000)
      : undefined;
  const staffInternalNotes =
    typeof body?.staffInternalNotes === "string"
      ? body.staffInternalNotes.trim().slice(0, 8000)
      : undefined;
  const assignedReviewerUserId =
    typeof body?.assignedReviewerUserId === "string" ? body.assignedReviewerUserId.trim() : undefined;

  await connectDb();
  const doc = await AppealModel.findById(id);
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const now = new Date();
  const prev = doc.status;

  if (nextStatus === "under_review") {
    if (prev !== "open") return NextResponse.json({ error: "invalid_transition" }, { status: 400 });
    doc.status = "under_review";
    if (assignedReviewerUserId !== undefined) doc.assignedReviewerUserId = assignedReviewerUserId || null;
    doc.events.push({
      at: now,
      kind: "status_change",
      actorUserId: auth.session.userId,
      previousStatus: prev,
      nextStatus: "under_review",
    });
    await doc.save();
    await appendAudit({
      actor: auth.session,
      action: "appeal.under_review",
      targetType: "appeal",
      targetId: id,
      metadata: { from: prev },
    });
    return NextResponse.json({ appeal: serializeAppealForStaff(doc) });
  }

  if (nextStatus === "resolved_granted" || nextStatus === "resolved_denied") {
    if (prev !== "open" && prev !== "under_review") {
      return NextResponse.json({ error: "invalid_transition" }, { status: 400 });
    }
    if (!publicStaffResponse) {
      return NextResponse.json({ error: "publicStaffResponse_required" }, { status: 400 });
    }
    doc.status = nextStatus;
    doc.publicStaffResponse = publicStaffResponse;
    if (staffInternalNotes !== undefined) doc.staffInternalNotes = staffInternalNotes || null;
    doc.reviewedAt = now;
    doc.resolvedByUserId = auth.session.userId;
    doc.events.push({
      at: now,
      kind: "status_change",
      body: publicStaffResponse,
      actorUserId: auth.session.userId,
      previousStatus: prev,
      nextStatus,
    });
    await doc.save();
    await appendAudit({
      actor: auth.session,
      action: nextStatus === "resolved_granted" ? "appeal.granted" : "appeal.denied",
      targetType: "appeal",
      targetId: id,
      metadata: {
        category: doc.category,
        appellantUserId: doc.appellantUserId,
        targetKind: doc.targetKind,
        targetId: doc.targetId,
      },
    });
    return NextResponse.json({ appeal: serializeAppealForStaff(doc) });
  }

  if (assignedReviewerUserId !== undefined && nextStatus === undefined) {
    doc.assignedReviewerUserId = assignedReviewerUserId || null;
    if (staffInternalNotes !== undefined) doc.staffInternalNotes = staffInternalNotes || null;
    await doc.save();
    return NextResponse.json({ appeal: serializeAppealForStaff(doc) });
  }

  if (staffInternalNotes !== undefined && nextStatus === undefined) {
    doc.staffInternalNotes = staffInternalNotes || null;
    await doc.save();
    return NextResponse.json({ appeal: serializeAppealForStaff(doc) });
  }

  return NextResponse.json({ error: "no_updates" }, { status: 400 });
}
