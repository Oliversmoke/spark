import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type {
  ListingMonetization,
  SubmissionKind,
} from "@/lib/models/Submission";
import { SubmissionModel } from "@/lib/models/Submission";
import {
  evaluateDeveloperSubmissionAutomated,
  runPlayableUrlReachable,
} from "@/lib/submissions/automatedChecks";
import { isSlugTaken, isValidSlug } from "@/lib/submissions/slug";
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

export async function POST(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const kind = body?.kind as SubmissionKind | undefined;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const tags = Array.isArray(body?.tags) ? body.tags.filter((t: unknown) => typeof t === "string") : [];
  const coverEmoji = typeof body?.coverEmoji === "string" ? body.coverEmoji.trim() : "✨";
  let coverImageSrc =
    typeof body?.coverImageSrc === "string" ? body.coverImageSrc.trim() : "/memojis_safe/Ellipse_133.png";
  const clusters = parseClusters(body?.availableClusters);
  const access = body?.access === "gamepass" ? "gamepass" : "free";
  const priceUnits =
    typeof body?.priceUnits === "number" && Number.isFinite(body.priceUnits) && body.priceUnits >= 0
      ? Math.floor(body.priceUnits)
      : 0;

  const developerPipeline = Boolean(body?.developerPipeline) && kind === "game";

  if (kind !== "content" && kind !== "game") {
    return NextResponse.json({ error: "kind must be content or game" }, { status: 400 });
  }
  if (body?.developerPipeline && kind !== "game") {
    return NextResponse.json({ error: "developer_pipeline_is_game_only" }, { status: 400 });
  }
  if (!title || title.length > 200) return NextResponse.json({ error: "invalid_title" }, { status: 400 });
  if (!summary || summary.length > 2000) return NextResponse.json({ error: "invalid_summary" }, { status: 400 });
  if (!isValidSlug(slug)) return NextResponse.json({ error: "invalid_slug" }, { status: 400 });
  if (!clusters) return NextResponse.json({ error: "available_clusters_required" }, { status: 400 });
  if (access === "gamepass" && priceUnits <= 0) {
    return NextResponse.json({ error: "price_required_for_gamepass" }, { status: 400 });
  }

  if (await isSlugTaken(kind, slug)) {
    return NextResponse.json({ error: "slug_taken" }, { status: 400 });
  }

  let gameDescription: string | null = null;
  let gameHowToPlay: string[] | null = null;
  let gameWinCondition: string | null = null;
  let contentBody: string | null = null;
  let contentHighlights: string[] | null = null;
  let contentAuthorName: string | null = null;

  let playableUrl: string | null = null;
  let gameCategory: string | null = null;
  let listingMonetization: ListingMonetization | null = null;
  let githubUrl: string | null = null;
  let websiteUrl: string | null = null;
  let socialTwitter: string | null = null;
  let socialDiscord: string | null = null;
  let otherSocials: string | null = null;
  let mediaGallery: string[] = [];
  let demoVideoUrl: string | null = null;
  let gameInstructionsExtra: string | null = null;

  if (kind === "game") {
    gameDescription = typeof body?.gameDescription === "string" ? body.gameDescription.trim() : "";
    gameWinCondition = typeof body?.gameWinCondition === "string" ? body.gameWinCondition.trim() : "";
    const howLines = Array.isArray(body?.gameHowToPlay)
      ? body.gameHowToPlay.filter((x: unknown) => typeof x === "string").map((s: string) => s.trim())
      : [];
    gameHowToPlay = howLines;
    if (!gameDescription || !gameWinCondition || howLines.length === 0) {
      return NextResponse.json({ error: "game_fields_required" }, { status: 400 });
    }

    if (developerPipeline) {
      const pu = typeof body?.playableUrl === "string" ? body.playableUrl.trim() : "";
      if (!pu || !isHttpsUrl(pu)) {
        return NextResponse.json({ error: "playable_https_url_required" }, { status: 400 });
      }
      playableUrl = pu;

      const cat = typeof body?.gameCategory === "string" ? body.gameCategory.trim() : "";
      if (!cat || cat.length > 80) return NextResponse.json({ error: "game_category_required" }, { status: 400 });
      gameCategory = cat;

      const lm = body?.listingMonetization;
      if (lm !== "unlock_once" && lm !== "pay_per_play") {
        return NextResponse.json({ error: "listing_monetization_required" }, { status: 400 });
      }
      listingMonetization = lm;

      if (listingMonetization === "pay_per_play" && priceUnits <= 0) {
        return NextResponse.json({ error: "per_play_price_required" }, { status: 400 });
      }

      githubUrl = normalizeOptionalUrl(body?.githubUrl);
      websiteUrl = normalizeOptionalUrl(body?.websiteUrl);
      const tw = normalizeOptionalUrl(body?.socialTwitter);
      const dc = normalizeOptionalUrl(body?.socialDiscord);
      socialTwitter = tw;
      socialDiscord = dc;
      otherSocials =
        typeof body?.otherSocials === "string" && body.otherSocials.trim()
          ? body.otherSocials.trim().slice(0, 500)
          : null;

      mediaGallery = parseMediaGallery(body?.mediaGallery);

      const dv = typeof body?.demoVideoUrl === "string" ? body.demoVideoUrl.trim() : "";
      if (dv) {
        if (!isHttpsUrl(dv)) return NextResponse.json({ error: "demo_video_https" }, { status: 400 });
        demoVideoUrl = dv;
      }

      gameInstructionsExtra =
        typeof body?.gameInstructionsExtra === "string" ? body.gameInstructionsExtra.trim().slice(0, 12000) : null;

      if (mediaGallery.length && coverImageSrc.startsWith("/memojis_safe/")) {
        coverImageSrc = mediaGallery[0]!;
      }
    }
  } else {
    contentBody = typeof body?.contentBody === "string" ? body.contentBody.trim() : "";
    contentAuthorName =
      typeof body?.contentAuthorName === "string" && body.contentAuthorName.trim()
        ? body.contentAuthorName.trim()
        : "Creator";
    contentHighlights = Array.isArray(body?.contentHighlights)
      ? body.contentHighlights.filter((x: unknown) => typeof x === "string").map((s: string) => s.trim())
      : [];
    if (!contentBody) return NextResponse.json({ error: "content_body_required" }, { status: 400 });
  }

  let automatedChecks = null;
  if (developerPipeline && playableUrl) {
    const assumeMime =
      mediaGallery.length === 0 || mediaGallery.every((u) => u.startsWith("/uploads/game-assets/"));
    const playableUrlHttps = Boolean(playableUrl && isHttpsUrl(playableUrl));
    const base = evaluateDeveloperSubmissionAutomated({
      playableUrlHttps,
      mediaGalleryCount: mediaGallery.length,
      assumesUploadsValidated: assumeMime,
    });
    base.playableUrlReachable = await runPlayableUrlReachable(playableUrl);
    if (base.playableUrlReachable === false) {
      base.warnings.push("HEAD request to playable URL failed — may still be playable in-browser.");
    }
    if (mediaGallery.some((u) => isHttpsUrl(u))) {
      base.warnings.push("External gallery URLs are not scanned like uploaded assets.");
    }
    automatedChecks = base;
  }

  await connectDb();
  const doc = await SubmissionModel.create({
    kind,
    status: "pending",
    userId: session.userId,
    submitterWallet: session.walletAddress,
    title,
    summary,
    tags,
    slug,
    coverEmoji,
    coverImageSrc,
    availableClusters: clusters,
    access,
    priceUnits,
    gameDescription,
    gameHowToPlay,
    gameWinCondition,
    contentBody,
    contentHighlights,
    contentAuthorName,
    developerPipeline,
    playableUrl,
    gameCategory,
    listingMonetization,
    githubUrl,
    websiteUrl,
    socialTwitter,
    socialDiscord,
    otherSocials,
    mediaGallery,
    demoVideoUrl,
    gameInstructionsExtra,
    automatedChecks,
    qaReview: {
      playableLinkOk: false,
      mediaReviewedOk: false,
      metadataCompleteOk: false,
      notes: "",
      updatedAt: null,
      reviewerUserId: null,
    },
  });

  return NextResponse.json({
    ok: true,
    submission: {
      id: doc._id.toString(),
      kind: doc.kind,
      status: doc.status,
      slug: doc.slug,
      title: doc.title,
      createdAt: doc.createdAt.toISOString(),
      developerPipeline: doc.developerPipeline,
      automatedChecks: doc.automatedChecks ?? null,
    },
  });
}
