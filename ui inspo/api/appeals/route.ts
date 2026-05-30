import { NextResponse } from "next/server";

import { validateAppealTarget } from "@/lib/appeals/validateTarget";
import { getSessionUserIfNotDeleted } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { AppealCategory, AppealTargetKind } from "@/lib/models/Appeal";
import { AppealModel } from "@/lib/models/Appeal";
import { rateLimitCheck, rateLimitHeaders } from "@/lib/rateLimit";
import { serializeAppealForAppellant } from "@/lib/appeals/serialize";

export const runtime = "nodejs";

const CATEGORIES = new Set<AppealCategory>([
  "account_ban",
  "submission_rejection",
  "content_removal",
  "withdrawal_dispute",
  "platform_other",
]);

const TARGET_KINDS = new Set<AppealTargetKind>([
  "account",
  "submission",
  "creator_post",
  "withdrawal",
  "none",
]);

export async function POST(req: Request) {
  const session = await getSessionUserIfNotDeleted();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const rl = rateLimitCheck(`appeals:create:user:${session.userId}`, 8, 7 * 24 * 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: rateLimitHeaders(rl.retryAfterSec) }
    );
  }

  const body = await req.json().catch(() => null);
  const category = body?.category as AppealCategory | undefined;
  const targetKind = body?.targetKind as AppealTargetKind | undefined;
  const targetId = typeof body?.targetId === "string" ? body.targetId.trim() : null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 200) : "";
  const statement = typeof body?.statement === "string" ? body.statement.trim().slice(0, 8000) : "";

  if (!category || !CATEGORIES.has(category)) {
    return NextResponse.json({ error: "invalid_category" }, { status: 400 });
  }
  if (!targetKind || !TARGET_KINDS.has(targetKind)) {
    return NextResponse.json({ error: "invalid_targetKind" }, { status: 400 });
  }
  if (!title || !statement) {
    return NextResponse.json({ error: "title_and_statement_required" }, { status: 400 });
  }

  const normalizedTargetId =
    category === "platform_other" ? null : targetId && targetId.length > 0 ? targetId : null;

  await connectDb();

  const v = await validateAppealTarget({
    category,
    targetKind,
    targetId: normalizedTargetId,
    appellantUserId: session.userId,
  });
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const openBase = {
    appellantUserId: session.userId,
    category,
    status: { $in: ["open", "under_review"] as const },
  };
  const existing = await AppealModel.findOne(
    normalizedTargetId
      ? { ...openBase, targetId: normalizedTargetId }
      : { ...openBase, $or: [{ targetId: null }, { targetId: { $exists: false } }] }
  ).lean();
  if (existing) {
    return NextResponse.json({ error: "open_appeal_exists_for_subject" }, { status: 409 });
  }

  const now = new Date();
  const doc = await AppealModel.create({
    appellantUserId: session.userId,
    appellantWalletAddress: session.walletAddress,
    category,
    targetKind,
    targetId: normalizedTargetId,
    title,
    statement,
    status: "open",
    events: [
      {
        at: now,
        kind: "submitted",
        body: title,
        actorUserId: session.userId,
      },
    ],
  });

  return NextResponse.json({ appeal: serializeAppealForAppellant(doc) });
}
