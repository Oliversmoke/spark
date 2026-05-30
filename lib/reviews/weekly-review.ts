import { connectDb } from "@/lib/db";
import { Goal, User, WeeklyReviewRecord } from "@/lib/db/models";
import { generateWeeklyReview } from "@/lib/ai/gemini";
import { saveChatMessage } from "@/lib/services";
import { trackEvent } from "@/lib/rate-limit";
import {
  buildWeeklyReviewContext,
  getWeekWindow,
  type WeekStats,
} from "@/lib/reviews/context";
import type { WeeklyReview, WeeklyReviewDTO } from "@/types";

function formatReviewMessage(review: WeeklyReview, goalTitle: string) {
  const win = review.wins[0] ?? "You showed up this week.";
  return `Weekly review for "${goalTitle}": ${win}`;
}

export async function createWeeklyReviewForGoal(
  userId: string,
  goalId: string,
  options?: { skipChat?: boolean; source?: string }
): Promise<WeeklyReviewDTO | null> {
  const context = await buildWeeklyReviewContext(userId, goalId);
  if (!context) return null;

  await connectDb();

  const existingPending = await WeeklyReviewRecord.findOne({
    userId,
    goalId: context.goal._id,
    status: "pending",
  });
  if (existingPending) {
    return {
      id: existingPending._id.toString(),
      goalId,
      goalTitle: context.goal.title,
      status: "pending",
      weekStats: context.stats,
      ...existingPending.review,
    };
  }

  const review = await generateWeeklyReview({
    goalTitle: context.goal.title,
    logsJson: JSON.stringify(context.logEntries),
    progressJson: JSON.stringify({
      checkpoint: context.checkpointTitle,
      progress: context.checkpointProgress,
      stats: context.stats,
    }),
    tasksJson: JSON.stringify(context.activeTasks),
  });

  const record = await WeeklyReviewRecord.create({
    userId,
    goalId: context.goal._id,
    review,
    status: "pending",
    weekStart: context.weekStart,
    weekEnd: context.weekEnd,
  });

  const dto: WeeklyReviewDTO = {
    id: record._id.toString(),
    goalId,
    goalTitle: context.goal.title,
    status: "pending",
    weekStats: context.stats,
    ...review,
  };

  await trackEvent(userId, "weekly_review_generated", {
    goalId,
    logs: context.stats.total,
    source: options?.source ?? "manual",
  });

  if (!options?.skipChat) {
    await saveChatMessage(
      userId,
      "assistant",
      formatReviewMessage(review, context.goal.title),
      goalId,
      {
        type: "weekly_review",
        review: dto,
        goalId,
        reviewId: dto.id,
      }
    );
  }

  return dto;
}

export async function runWeeklyReviewCron(limit = 150) {
  await connectDb();
  const today = new Date().getDay();
  const { weekStart } = getWeekWindow();

  const users = await User.find({}).limit(limit);
  let generated = 0;
  const goalIds: string[] = [];

  for (const user of users) {
    const reviewDay = user.notificationPrefs?.weeklyReviewDay ?? 0;
    if (reviewDay !== today) continue;

    const goals = await Goal.find({ userId: user._id, status: "active" });

    for (const goal of goals) {
      const alreadyThisWeek = await WeeklyReviewRecord.findOne({
        userId: user._id,
        goalId: goal._id,
        createdAt: { $gte: weekStart },
      });
      if (alreadyThisWeek) continue;

      const context = await buildWeeklyReviewContext(
        user._id.toString(),
        goal._id.toString()
      );
      if (!context || context.stats.total === 0) continue;

      const review = await generateWeeklyReview({
        goalTitle: context.goal.title,
        logsJson: JSON.stringify(context.logEntries),
        progressJson: JSON.stringify({
          checkpoint: context.checkpointTitle,
          progress: context.checkpointProgress,
          stats: context.stats,
        }),
        tasksJson: JSON.stringify(context.activeTasks),
      });

      const record = await WeeklyReviewRecord.create({
        userId: user._id,
        goalId: goal._id,
        review,
        status: "pending",
        weekStart: context.weekStart,
        weekEnd: context.weekEnd,
      });

      const dto: WeeklyReviewDTO = {
        id: record._id.toString(),
        goalId: goal._id.toString(),
        goalTitle: goal.title,
        status: "pending",
        weekStats: context.stats,
        ...review,
      };

      await saveChatMessage(
        user._id.toString(),
        "assistant",
        formatReviewMessage(review, goal.title),
        goal._id.toString(),
        {
          type: "weekly_review",
          review: dto,
          goalId: goal._id.toString(),
          reviewId: dto.id,
        }
      );

      await trackEvent(user._id.toString(), "weekly_review_generated", {
        goalId: goal._id.toString(),
        logs: context.stats.total,
        source: "cron",
      });

      generated++;
      goalIds.push(goal._id.toString());
    }
  }

  return { generated, reviewDay: today, goalIds };
}

export async function getPendingWeeklyReview(userId: string) {
  await connectDb();
  const record = await WeeklyReviewRecord.findOne({
    userId,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .populate("goalId");

  if (!record) return null;

  const goal = record.goalId as unknown as { _id?: { toString(): string }; title?: string };
  const context = await buildWeeklyReviewContext(
    userId,
    goal?._id?.toString() ?? record.goalId.toString()
  );

  return {
    id: record._id.toString(),
    goalId: goal?._id?.toString() ?? record.goalId.toString(),
    goalTitle: goal?.title ?? "",
    status: record.status as "pending",
    weekStats: context?.stats,
    ...record.review,
  } satisfies WeeklyReviewDTO;
}
