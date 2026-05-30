import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { SubmissionModel, type SubmissionDoc } from "@/lib/models/Submission";
import { isSlugTaken, isValidSlug } from "@/lib/submissions/slug";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  await connectDb();
  const s = await SubmissionModel.findById(id).lean();
  if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (s.userId !== session.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const doc = s as unknown as SubmissionDoc;
  return NextResponse.json({
    submission: {
      id: String(doc._id),
      kind: doc.kind,
      status: doc.status,
      title: doc.title,
      summary: doc.summary,
      slug: doc.slug,
      tags: doc.tags,
      coverEmoji: doc.coverEmoji,
      coverImageSrc: doc.coverImageSrc,
      availableClusters: doc.availableClusters,
      access: doc.access,
      priceUnits: doc.priceUnits,
      gameDescription: doc.gameDescription ?? null,
      gameHowToPlay: doc.gameHowToPlay ?? null,
      gameWinCondition: doc.gameWinCondition ?? null,
      contentBody: doc.contentBody ?? null,
      contentHighlights: doc.contentHighlights ?? null,
      contentAuthorName: doc.contentAuthorName ?? null,
      developerPipeline: Boolean(doc.developerPipeline),
      playableUrl: doc.playableUrl ?? null,
      gameCategory: doc.gameCategory ?? null,
      listingMonetization: doc.listingMonetization ?? null,
      githubUrl: doc.githubUrl ?? null,
      websiteUrl: doc.websiteUrl ?? null,
      socialTwitter: doc.socialTwitter ?? null,
      socialDiscord: doc.socialDiscord ?? null,
      otherSocials: doc.otherSocials ?? null,
      mediaGallery: doc.mediaGallery ?? [],
      demoVideoUrl: doc.demoVideoUrl ?? null,
      gameInstructionsExtra: doc.gameInstructionsExtra ?? null,
      rejectionReason: doc.rejectionReason ?? null,
      updatedAt: (doc.updatedAt as Date).toISOString(),
    },
  });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);

  await connectDb();
  const existing = await SubmissionModel.findById(id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.userId !== session.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // Allow edits + resubmission only for non-approved items.
  if (existing.status === "approved") return NextResponse.json({ error: "approved_immutable" }, { status: 400 });
  if (existing.status === "deleted") return NextResponse.json({ error: "deleted_immutable" }, { status: 400 });

  const title = typeof body?.title === "string" ? body.title.trim() : existing.title;
  const summary = typeof body?.summary === "string" ? body.summary.trim() : existing.summary;
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : existing.slug;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : existing.tags;
  const coverEmoji = typeof body?.coverEmoji === "string" ? body.coverEmoji.trim() : existing.coverEmoji;
  const coverImageSrc =
    typeof body?.coverImageSrc === "string" ? body.coverImageSrc.trim() : existing.coverImageSrc;
  const access = body?.access === "gamepass" ? "gamepass" : body?.access === "free" ? "free" : existing.access;
  const priceUnits =
    typeof body?.priceUnits === "number" && Number.isFinite(body.priceUnits) && body.priceUnits >= 0
      ? Math.floor(body.priceUnits)
      : existing.priceUnits;
  const clustersRaw = body?.availableClusters;
  const availableClusters =
    Array.isArray(clustersRaw) && clustersRaw.every((x: unknown) => x === "devnet" || x === "mainnet-beta")
      ? (clustersRaw as Array<"devnet" | "mainnet-beta">)
      : existing.availableClusters;

  if (!title || title.length > 200) return NextResponse.json({ error: "invalid_title" }, { status: 400 });
  if (!summary || summary.length > 2000) return NextResponse.json({ error: "invalid_summary" }, { status: 400 });
  if (!isValidSlug(slug)) return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  if (access === "gamepass" && priceUnits <= 0) {
    return NextResponse.json({ error: "price_required_for_gamepass" }, { status: 400 });
  }
  if (availableClusters.length === 0) return NextResponse.json({ error: "available_clusters_required" }, { status: 400 });

  // Slug changes must be globally unique across catalog/submissions.
  if (slug !== existing.slug && (await isSlugTaken(existing.kind, slug))) {
    return NextResponse.json({ error: "slug_taken" }, { status: 400 });
  }

  existing.title = title;
  existing.summary = summary;
  existing.slug = slug;
  existing.tags = tags;
  existing.coverEmoji = coverEmoji;
  existing.coverImageSrc = coverImageSrc;
  existing.availableClusters = availableClusters;
  existing.access = access;
  existing.priceUnits = priceUnits;

  // Minimal kind-specific edits (keep the rest if not provided).
  if (existing.kind === "game") {
    if (typeof body?.gameDescription === "string") existing.gameDescription = body.gameDescription.trim();
    if (typeof body?.gameWinCondition === "string") existing.gameWinCondition = body.gameWinCondition.trim();
    if (Array.isArray(body?.gameHowToPlay)) {
      existing.gameHowToPlay = body.gameHowToPlay.filter((s: unknown) => typeof s === "string").map((s: string) => s.trim()).filter(Boolean);
    }
    if (typeof body?.playableUrl === "string") existing.playableUrl = body.playableUrl.trim();
    if (Array.isArray(body?.mediaGallery)) {
      existing.mediaGallery = body.mediaGallery.filter((u: unknown) => typeof u === "string").map((u: string) => u.trim()).filter(Boolean);
    }
  } else {
    if (typeof body?.contentBody === "string") existing.contentBody = body.contentBody.trim();
    if (typeof body?.contentAuthorName === "string") existing.contentAuthorName = body.contentAuthorName.trim();
    if (Array.isArray(body?.contentHighlights)) {
      existing.contentHighlights = body.contentHighlights.filter((h: unknown) => typeof h === "string").map((h: string) => h.trim()).filter(Boolean);
    }
  }

  // Resubmit: set back to pending and clear review fields.
  existing.status = "pending";
  existing.rejectionReason = null;
  existing.reviewedAt = null;
  existing.reviewedByUserId = null;

  await existing.save();
  return NextResponse.json({ ok: true, submission: { id: existing._id.toString(), slug: existing.slug, status: existing.status } });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  await connectDb();
  const sub = await SubmissionModel.findById(id);
  if (!sub) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (sub.userId !== session.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // If it was approved, soft-delete so public pages can hide it without breaking references.
  if (sub.status === "approved") {
    sub.status = "deleted";
    await sub.save();
    return NextResponse.json({ ok: true, mode: "soft" });
  }

  await SubmissionModel.deleteOne({ _id: sub._id });
  return NextResponse.json({ ok: true, mode: "hard" });
}

