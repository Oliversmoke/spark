import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getSessionUserIfNotDeleted } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { AppealStatus } from "@/lib/models/Appeal";
import { AppealModel } from "@/lib/models/Appeal";
import { serializeAppealForAppellant, isTerminalAppealStatus } from "@/lib/appeals/serialize";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserIfNotDeleted();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  await connectDb();
  const doc = await AppealModel.findById(id);
  if (!doc || doc.appellantUserId !== session.userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ appeal: serializeAppealForAppellant(doc) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserIfNotDeleted();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;

  await connectDb();
  const doc = await AppealModel.findById(id);
  if (!doc || doc.appellantUserId !== session.userId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (isTerminalAppealStatus(doc.status)) {
    return NextResponse.json({ error: "appeal_closed" }, { status: 400 });
  }

  const now = new Date();

  if (action === "withdraw") {
    const prev = doc.status;
    doc.status = "withdrawn";
    doc.reviewedAt = now;
    doc.events.push({
      at: now,
      kind: "withdrawn_by_user",
      actorUserId: session.userId,
      previousStatus: prev as AppealStatus,
      nextStatus: "withdrawn",
    });
    await doc.save();
    return NextResponse.json({ appeal: serializeAppealForAppellant(doc) });
  }

  if (action === "supplement") {
    if (doc.supplementAddedAt) {
      return NextResponse.json({ error: "supplement_already_added" }, { status: 400 });
    }
    const supplement =
      typeof body?.supplement === "string" ? body.supplement.trim().slice(0, 4000) : "";
    if (!supplement) return NextResponse.json({ error: "supplement_required" }, { status: 400 });

    doc.supplement = supplement;
    doc.supplementAddedAt = now;
    doc.events.push({
      at: now,
      kind: "supplement",
      body: supplement,
      actorUserId: session.userId,
    });
    await doc.save();
    return NextResponse.json({ appeal: serializeAppealForAppellant(doc) });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
