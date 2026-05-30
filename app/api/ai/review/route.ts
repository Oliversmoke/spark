import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { incrementAiCalls } from "@/lib/rate-limit";
import { requireAiQuota } from "@/lib/ai/guard";
import { applyWeeklyReviewAdjustment } from "@/lib/services";
import {
  createWeeklyReviewForGoal,
  getPendingWeeklyReview,
} from "@/lib/reviews/weekly-review";
import { connectDb } from "@/lib/db";
import { WeeklyReviewRecord } from "@/lib/db/models";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  if (body.reviewId && typeof body.accept === "boolean") {
    try {
      const review = await applyWeeklyReviewAdjustment(
        session.user.id,
        body.reviewId,
        body.accept
      );
      const goal = await import("@/lib/db/models").then((m) =>
        m.Goal.findById(review.goalId)
      );
      return NextResponse.json({
        review,
        pathVersion: goal?.pathVersion,
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Could not update review" },
        { status: 400 }
      );
    }
  }

  const quota = await requireAiQuota(session.user.id);
  if (!quota.allowed) return quota.response;

  const { goalId } = body;
  if (!goalId) {
    return NextResponse.json({ error: "goalId required" }, { status: 400 });
  }

  const review = await createWeeklyReviewForGoal(session.user.id, goalId);
  if (!review) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  await incrementAiCalls(session.user.id);

  return NextResponse.json({ review });
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pending = await getPendingWeeklyReview(session.user.id);

  await connectDb();
  const reviews = await WeeklyReviewRecord.find({ userId: session.user.id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("goalId", "title");

  return NextResponse.json({
    pending,
    reviews: reviews.map((r) => {
      const g = r.goalId as unknown as { _id?: { toString(): string }; title?: string };
      return {
        id: r._id.toString(),
        goalId: g?._id?.toString() ?? r.goalId.toString(),
        goalTitle: g?.title ?? "",
        status: r.status,
        createdAt: r.createdAt,
        ...r.review,
      };
    }),
  });
}
