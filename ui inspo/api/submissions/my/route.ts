import { NextResponse } from "next/server";

import { getSessionUserActive } from "@/lib/auth/session";
import { connectDb } from "@/lib/db";
import { SubmissionModel, type SubmissionDoc } from "@/lib/models/Submission";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getSessionUserActive();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const status = searchParams.get("status");

  await connectDb();

  const q: Record<string, unknown> = { userId: session.userId };
  if (kind === "game" || kind === "content") q.kind = kind;
  if (status === "pending" || status === "approved" || status === "rejected" || status === "deleted") q.status = status;

  const rows = await SubmissionModel.find(q).sort({ updatedAt: -1 }).limit(300).lean();
  return NextResponse.json({
    items: rows.map((r) => {
      const s = r as unknown as SubmissionDoc;
      return {
        id: String(s._id),
        kind: s.kind,
        status: s.status,
        title: s.title,
        slug: s.slug,
        summary: s.summary,
        coverImageSrc: s.coverImageSrc,
        access: s.access,
        priceUnits: s.priceUnits,
        availableClusters: s.availableClusters,
        rejectionReason: s.rejectionReason ?? null,
        updatedAt: (s.updatedAt as Date).toISOString(),
        createdAt: (s.createdAt as Date).toISOString(),
      };
    }),
  });
}

