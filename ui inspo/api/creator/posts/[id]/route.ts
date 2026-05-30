import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type {
  CreatorPostFormat,
  CreatorPostStatus,
} from "@/lib/models/CreatorPost";
import { CreatorPostModel } from "@/lib/models/CreatorPost";
import { UserModel } from "@/lib/models/User";
import { canUseCreatorContentSlug, isValidSlug } from "@/lib/submissions/slug";
import { MAX_MEDIA_GALLERY_ITEMS } from "@/lib/uploads/constants";
import { isHttpsUrl, normalizeOptionalUrl } from "@/lib/validation/url";

export const runtime = "nodejs";

function parseClusters(raw: unknown): Array<"devnet" | "mainnet-beta"> | null {
  if (!Array.isArray(raw)) return null;
  const out: Array<"devnet" | "mainnet-beta"> = [];
  for (const x of raw) {
    if (x === "devnet" || x === "mainnet-beta") out.push(x);
  }
  return out.length ? out : null;
}

function parseMediaGallery(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!s) continue;
    if (s.startsWith("/uploads/game-assets/")) out.push(s);
    else if (isHttpsUrl(s)) out.push(s);
  }
  return [...new Set(out)].slice(0, MAX_MEDIA_GALLERY_ITEMS);
}

const FORMATS = new Set<CreatorPostFormat>(["blog", "video", "gallery", "slides"]);

function serialize(post: Record<string, unknown>) {
  return {
    id: String(post._id),
    creatorUserId: post.creatorUserId,
    slug: post.slug,
    title: post.title,
    summary: post.summary,
    tags: post.tags,
    coverEmoji: post.coverEmoji,
    coverImageSrc: post.coverImageSrc,
    body: post.body,
    highlights: post.highlights,
    format: post.format,
    mediaUrls: post.mediaUrls,
    videoUrl: post.videoUrl,
    galleryLayout: post.galleryLayout,
    availableClusters: post.availableClusters,
    access: post.access,
    purchaseMode: post.purchaseMode,
    priceUnits: post.priceUnits,
    collectionLabel: post.collectionLabel,
    status: post.status,
    authorName: post.authorName,
    moderationReason: post.moderationReason ?? null,
    moderatedAt: post.moderatedAt
      ? (post.moderatedAt as Date).toISOString()
      : null,
    updatedAt: (post.updatedAt as Date).toISOString(),
    createdAt: (post.createdAt as Date).toISOString(),
  };
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  await connectDb();
  const row = await CreatorPostModel.findById(id).lean();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (row.creatorUserId !== session.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  return NextResponse.json({ post: serialize(row as unknown as Record<string, unknown>) });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);

  await connectDb();
  const existing = await CreatorPostModel.findById(id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.creatorUserId !== session.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (existing.status === "archived") return NextResponse.json({ error: "archived_immutable" }, { status: 400 });

  const title = typeof body?.title === "string" ? body.title.trim() : existing.title;
  const summary = typeof body?.summary === "string" ? body.summary.trim() : existing.summary;
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : existing.slug;
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : existing.tags;
  const coverEmoji =
    typeof body?.coverEmoji === "string" ? body.coverEmoji.trim() : existing.coverEmoji;
  const coverImageSrc =
    typeof body?.coverImageSrc === "string" ? body.coverImageSrc.trim() : existing.coverImageSrc;
  const clusters =
    body?.availableClusters !== undefined ? parseClusters(body?.availableClusters) : existing.availableClusters;
  const access =
    body?.access === "gamepass" || body?.access === "free"
      ? body.access
      : existing.access;
  let priceUnits =
    typeof body?.priceUnits === "number" && Number.isFinite(body?.priceUnits) && body.priceUnits >= 0
      ? Math.floor(body.priceUnits)
      : existing.priceUnits;
  const bodyText = typeof body?.body === "string" ? body.body : existing.body;
  const highlights = Array.isArray(body?.highlights)
    ? body.highlights
        .filter((h: unknown) => typeof h === "string")
        .map((s: string) => s.trim())
        .filter(Boolean)
    : existing.highlights;
  const rawFormat = typeof body?.format === "string" ? body.format : existing.format;
  const format: CreatorPostFormat = FORMATS.has(rawFormat as CreatorPostFormat)
    ? (rawFormat as CreatorPostFormat)
    : existing.format;
  const mediaUrls =
    body?.mediaUrls !== undefined ? parseMediaGallery(body.mediaUrls) : existing.mediaUrls;
  const videoUrl =
    body?.videoUrl !== undefined ? normalizeOptionalUrl(body.videoUrl) : existing.videoUrl ?? null;
  const galleryLayout =
    body?.galleryLayout === "slides" || body?.galleryLayout === "grid"
      ? body.galleryLayout
      : existing.galleryLayout;
  const collectionLabel =
    body?.collectionLabel !== undefined
      ? typeof body.collectionLabel === "string" && body.collectionLabel.trim()
        ? body.collectionLabel.trim().slice(0, 120)
        : null
      : existing.collectionLabel;
  const status: CreatorPostStatus | undefined =
    body?.status === "published" || body?.status === "draft" ? body.status : undefined;

  if (!title || title.length > 200) return NextResponse.json({ error: "invalid_title" }, { status: 400 });
  if (!summary || summary.length > 2000) return NextResponse.json({ error: "invalid_summary" }, { status: 400 });
  if (!isValidSlug(slug)) return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  if (!clusters?.length) return NextResponse.json({ error: "available_clusters_required" }, { status: 400 });

  if (slug !== existing.slug && !(await canUseCreatorContentSlug(slug, id))) {
    return NextResponse.json({ error: "slug_taken" }, { status: 400 });
  }

  let purchaseMode = existing.purchaseMode;
  if (access === "free") {
    priceUnits = 0;
    purchaseMode = "none";
  } else {
    const rm = body?.purchaseMode;
    if (rm === "unlock_once" || rm === "per_view") purchaseMode = rm;
    if (existing.access === "free" && access === "gamepass") {
      if (rm !== "unlock_once" && rm !== "per_view") {
        return NextResponse.json({ error: "gamepass_requires_unlock_or_per_view" }, { status: 400 });
      }
    }
    if (access === "gamepass" && priceUnits <= 0) {
      return NextResponse.json({ error: "price_required_for_gamepass" }, { status: 400 });
    }
    if (
      access === "gamepass" &&
      purchaseMode !== "unlock_once" &&
      purchaseMode !== "per_view"
    ) {
      return NextResponse.json({ error: "gamepass_requires_unlock_or_per_view" }, { status: 400 });
    }
  }

  if (typeof body?.authorName === "string" && body.authorName.trim()) {
    existing.authorName = body.authorName.trim().slice(0, 120);
  } else if (body?.syncAuthorFromProfile) {
    const user = await UserModel.findById(session.userId).lean();
    existing.authorName =
      user?.displayName?.trim() ||
      (user?.username ? `@${user.username}` : "") ||
      existing.authorName;
  }

  existing.title = title;
  existing.summary = summary;
  existing.slug = slug;
  existing.tags = tags;
  existing.coverEmoji = coverEmoji;
  existing.coverImageSrc = coverImageSrc;
  existing.body = bodyText;
  existing.highlights = highlights;
  existing.format = format;
  existing.mediaUrls = mediaUrls;
  existing.videoUrl = videoUrl;
  existing.galleryLayout = galleryLayout;
  existing.availableClusters = clusters;
  existing.access = access;
  existing.purchaseMode = purchaseMode;
  existing.priceUnits = priceUnits;
  existing.collectionLabel = collectionLabel;
  if (status) existing.status = status;

  await existing.save();

  const row = existing.toObject();
  return NextResponse.json({ post: serialize(row as unknown as Record<string, unknown>) });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { id } = await ctx.params;
  await connectDb();
  const existing = await CreatorPostModel.findById(id);
  if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (existing.creatorUserId !== session.userId) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  existing.status = "archived";
  await existing.save();

  return NextResponse.json({ ok: true });
}
