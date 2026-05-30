import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { appendAudit } from "@/lib/admin/audit";
import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { CreatorPostModel } from "@/lib/models/CreatorPost";

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
  const reason =
    typeof body?.reason === "string" ? body.reason.trim().slice(0, 2000) : "";

  await connectDb();
  const post = await CreatorPostModel.findById(id);
  if (!post) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (post.status === "archived") {
    return NextResponse.json({ error: "already_archived" }, { status: 400 });
  }

  post.status = "archived";
  post.moderationReason = reason || "Archived by moderation";
  post.moderatedAt = new Date();
  post.moderatedByUserId = auth.session.userId;
  await post.save();

  await appendAudit({
    actor: auth.session,
    action: "creator_post.archive",
    targetType: "creator_post",
    targetId: id,
    metadata: { slug: post.slug, title: post.title, reason: reason || null },
  });

  return NextResponse.json({
    ok: true,
    post: {
      id: post._id.toString(),
      slug: post.slug,
      status: post.status,
      moderationReason: post.moderationReason,
      moderatedAt: post.moderatedAt?.toISOString() ?? null,
    },
  });
}
