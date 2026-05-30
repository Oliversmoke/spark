import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import type { SubmissionDoc } from "@/lib/models/Submission";
import { SubmissionModel } from "@/lib/models/Submission";

export const runtime = "nodejs";

const STAFF = ["admin", "superadmin", "moderator"] as const;

export async function GET(req: Request) {
  const auth = await requireRole([...STAFF]);
  if (!auth.ok)
    return NextResponse.json(
      { error: auth.reason },
      { status: auth.reason === "unauthenticated" ? 401 : 403 }
    );

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const kind = searchParams.get("kind");

  await connectDb();
  const q: Record<string, unknown> = {};
  if (status === "pending" || status === "approved" || status === "rejected" || status === "deleted") {
    q.status = status;
  }
  if (kind === "content" || kind === "game") q.kind = kind;

  const rows = await SubmissionModel.find(q).sort({ createdAt: -1 }).limit(200).lean();

  return NextResponse.json({
    items: rows.map((row) => {
      const r = row as unknown as SubmissionDoc;
      return {
        id: String(r._id),
        kind: r.kind,
        status: r.status,
        userId: r.userId,
        submitterWallet: r.submitterWallet,
        title: r.title,
        summary: r.summary,
        tags: r.tags,
        slug: r.slug,
        coverEmoji: r.coverEmoji,
        coverImageSrc: r.coverImageSrc,
        availableClusters: r.availableClusters,
        access: r.access,
        priceUnits: r.priceUnits,
        gameDescription: r.gameDescription ?? null,
        gameHowToPlay: r.gameHowToPlay ?? null,
        gameWinCondition: r.gameWinCondition ?? null,
        contentBody: r.contentBody ?? null,
        contentHighlights: r.contentHighlights ?? null,
        contentAuthorName: r.contentAuthorName ?? null,
        rejectionReason: r.rejectionReason ?? null,
        reviewedByUserId: r.reviewedByUserId ?? null,
        reviewedAt: r.reviewedAt ? (r.reviewedAt as Date).toISOString() : null,
        createdAt: (r.createdAt as Date).toISOString(),
        updatedAt: (r.updatedAt as Date).toISOString(),
        developerPipeline: Boolean(r.developerPipeline),
        playableUrl: r.playableUrl ?? null,
        gameCategory: r.gameCategory ?? null,
        listingMonetization: r.listingMonetization ?? null,
        githubUrl: r.githubUrl ?? null,
        websiteUrl: r.websiteUrl ?? null,
        socialTwitter: r.socialTwitter ?? null,
        socialDiscord: r.socialDiscord ?? null,
        otherSocials: r.otherSocials ?? null,
        mediaGallery: r.mediaGallery ?? [],
        demoVideoUrl: r.demoVideoUrl ?? null,
        gameInstructionsExtra: r.gameInstructionsExtra ?? null,
        automatedChecks: r.automatedChecks ?? null,
        qaReview: r.qaReview ?? null,
      };
    }),
  });
}
