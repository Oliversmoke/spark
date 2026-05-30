import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { CreatorPostFormat, CreatorPostPurchaseMode, CreatorPostStatus } from "@/lib/models/CreatorPost";
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

function normalizeMonetization(
  access: "free" | "gamepass",
  rawMode: unknown,
  priceUnits: number
): { ok: true; purchaseMode: CreatorPostPurchaseMode; priceUnits: number } | { ok: false; error: string } {
  if (access === "free") {
    if (priceUnits !== 0) return { ok: false, error: "free_requires_zero_price" };
    if (rawMode != null && rawMode !== "" && rawMode !== "none") {
      return { ok: false, error: "free_requires_none_mode" };
    }
    return { ok: true, purchaseMode: "none", priceUnits: 0 };
  }
  if (rawMode !== "unlock_once" && rawMode !== "per_view") {
    return { ok: false, error: "gamepass_requires_unlock_or_per_view" };
  }
  if (priceUnits <= 0) return { ok: false, error: "price_required_for_gamepass" };
  return { ok: true, purchaseMode: rawMode, priceUnits };
}

export async function GET(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  await connectDb();
  const q: Record<string, unknown> = { creatorUserId: session.userId };
  if (status === "all") {
    // no status filter
  } else if (status === "draft" || status === "published" || status === "archived") {
    q.status = status;
  } else {
    q.status = { $ne: "archived" };
  }

  const rows = await CreatorPostModel.find(q).sort({ updatedAt: -1 }).limit(200).lean();
  return NextResponse.json({
    posts: rows.map((r) => ({
      id: String(r._id),
      slug: r.slug,
      title: r.title,
      status: r.status,
      format: r.format,
      access: r.access,
      purchaseMode: r.purchaseMode,
      priceUnits: r.priceUnits,
      updatedAt: (r.updatedAt as Date).toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : [];
  const coverEmoji = typeof body?.coverEmoji === "string" ? body.coverEmoji.trim() : "✨";
  const coverImageSrc =
    typeof body?.coverImageSrc === "string" ? body.coverImageSrc.trim() : "/memojis_safe/Ellipse_133.png";
  const clusters = parseClusters(body?.availableClusters);
  const access = body?.access === "gamepass" ? "gamepass" : "free";
  let priceUnits =
    typeof body?.priceUnits === "number" && Number.isFinite(body.priceUnits) && body.priceUnits >= 0
      ? Math.floor(body.priceUnits)
      : 0;
  const bodyText = typeof body?.body === "string" ? body.body : "";
  const highlights = Array.isArray(body?.highlights)
    ? body.highlights
        .filter((h: unknown) => typeof h === "string")
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];
  const rawFormat = typeof body?.format === "string" ? body.format : "blog";
  const format: CreatorPostFormat = FORMATS.has(rawFormat as CreatorPostFormat)
    ? (rawFormat as CreatorPostFormat)
    : "blog";
  const mediaUrls = parseMediaGallery(body?.mediaUrls);
  const videoUrl = normalizeOptionalUrl(body?.videoUrl);
  const galleryLayout = body?.galleryLayout === "slides" ? "slides" : "grid";
  const collectionLabel =
    typeof body?.collectionLabel === "string" && body.collectionLabel.trim()
      ? body.collectionLabel.trim().slice(0, 120)
      : null;
  const status: CreatorPostStatus =
    body?.status === "published" || body?.status === "draft" ? body.status : "draft";

  if (!title || title.length > 200) return NextResponse.json({ error: "invalid_title" }, { status: 400 });
  if (!summary || summary.length > 2000) return NextResponse.json({ error: "invalid_summary" }, { status: 400 });
  if (!isValidSlug(slug)) return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  if (!clusters) return NextResponse.json({ error: "available_clusters_required" }, { status: 400 });

  const monet = normalizeMonetization(access, body?.purchaseMode, priceUnits);
  if (!monet.ok) return NextResponse.json({ error: monet.error }, { status: 400 });
  priceUnits = monet.priceUnits;

  if (!(await canUseCreatorContentSlug(slug))) {
    return NextResponse.json({ error: "slug_taken" }, { status: 400 });
  }

  await connectDb();
  const user = await UserModel.findById(session.userId).lean();
  const authorName =
    user?.displayName?.trim() ||
    (user?.username ? `@${user.username}` : "") ||
    `Creator ${session.walletAddress.slice(0, 4)}…`;

  const doc = await CreatorPostModel.create({
    creatorUserId: session.userId,
    creatorWalletAddress: session.walletAddress,
    authorName,
    slug,
    title,
    summary,
    tags,
    coverEmoji,
    coverImageSrc,
    body: bodyText,
    highlights,
    format,
    mediaUrls,
    videoUrl,
    galleryLayout,
    availableClusters: clusters,
    access,
    purchaseMode: monet.purchaseMode,
    priceUnits,
    collectionLabel,
    status,
  });

  return NextResponse.json({
    post: {
      id: doc._id.toString(),
      slug: doc.slug,
      title: doc.title,
      status: doc.status,
    },
  });
}
