import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { CreatorPostModel } from "@/lib/models/CreatorPost";
import { SubmissionModel } from "@/lib/models/Submission";

export const runtime = "nodejs";

/** Items a creator can include in subscription plans. */
export async function GET() {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  await connectDb();

  const posts = await CreatorPostModel.find({
    creatorUserId: session.userId,
    status: "published",
  })
    .select({ slug: 1, title: 1, access: 1, purchaseMode: 1, priceUnits: 1, coverImageSrc: 1 })
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  const subs = await SubmissionModel.find({
    userId: session.userId,
    status: "approved",
  })
    .select({ slug: 1, title: 1, kind: 1, access: 1, priceUnits: 1, coverImageSrc: 1 })
    .sort({ updatedAt: -1 })
    .limit(200)
    .lean();

  return NextResponse.json({
    posts: posts.map((p) => ({
      kind: "content" as const,
      source: "creator_post" as const,
      slug: p.slug,
      title: p.title,
      access: p.access,
      purchaseMode: p.purchaseMode,
      priceUnits: p.priceUnits,
      coverImageSrc: p.coverImageSrc,
    })),
    submissions: subs.map((s) => ({
      kind: s.kind as "game" | "content",
      source: "submission" as const,
      slug: s.slug,
      title: s.title,
      access: s.access,
      priceUnits: s.priceUnits,
      coverImageSrc: s.coverImageSrc,
    })),
  });
}

