import { connectDb } from "@/lib/db";
import {
  Goal,
  Log,
  User,
  ChatMessage,
  WeeklyReviewRecord,
  type IGoal,
} from "@/lib/db/models";
import {
  XP,
  applySuccessfulLogToStreak,
  evaluateBadges,
  levelFromXp,
  newBadgesEarned,
  xpForLogStatus,
  xpProgressInLevel,
} from "@/lib/gamification";
import { syncUserStreaks } from "@/lib/gamification/streak-sync";
import { trackEvent } from "@/lib/rate-limit";
import {
  getActiveCheckpoint,
  getTasksForToday,
  computeCheckpointProgress,
  startOfWeek,
  startOfDay,
  nanoid,
} from "@/lib/path-utils";
import type {
  LogStatus,
  LogEntryDTO,
  ProgressSummary,
  TodayTask,
  TodayViewResponse,
  WeeklyReviewDTO,
} from "@/types";

export async function getUserOrThrow(userId: string) {
  await connectDb();
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  return user;
}

export async function listGoals(userId: string) {
  await connectDb();
  return Goal.find({ userId, status: { $ne: "archived" } }).sort({
    createdAt: -1,
  });
}

export async function getGoal(userId: string, goalId: string) {
  await connectDb();
  return Goal.findOne({ _id: goalId, userId });
}

export async function countActiveGoals(userId: string) {
  await connectDb();
  return Goal.countDocuments({
    userId,
    status: "active",
  });
}

export async function getTodayView(userId: string): Promise<TodayViewResponse> {
  await connectDb();
  const goals = await Goal.find({ userId, status: "active" });
  const todayStart = startOfDay();
  const todayEnd = new Date(todayStart);
  todayEnd.setHours(23, 59, 59, 999);
  const weekStart = startOfWeek();

  const tasks: TodayTask[] = [];
  const goalSummaries: TodayViewResponse["goals"] = [];

  for (const goal of goals) {
    const cp = getActiveCheckpoint(goal.path);
    if (!cp) continue;

    const weekLogs = await Log.find({
      userId,
      goalId: goal._id,
      taskId: { $in: cp.tasks.map((t) => t.id) },
      loggedAt: { $gte: weekStart },
    });
    const weeklyStatus = new Map<string, { status: LogStatus; loggedAt: Date }>();
    for (const log of weekLogs) {
      weeklyStatus.set(log.taskId, {
        status: log.status as LogStatus,
        loggedAt: log.loggedAt,
      });
    }

    const dueTasks = getTasksForToday(goal.path, new Date(), weeklyStatus);
    const todayLogs = await Log.find({
      userId,
      goalId: goal._id,
      taskId: { $in: dueTasks.map((t) => t.id) },
      loggedAt: { $gte: todayStart, $lte: todayEnd },
    });
    const todayLogMap = new Map(todayLogs.map((l) => [l.taskId, l]));

    const checkpointLogs = await Log.find({
      userId,
      goalId: goal._id,
      checkpointId: cp.id,
      status: { $in: ["completed", "partial"] },
    });
    const completedIds = new Set(checkpointLogs.map((l) => l.taskId));
    const checkpointProgress = computeCheckpointProgress(cp, completedIds);

    goalSummaries.push({
      goalId: goal._id.toString(),
      goalTitle: goal.title,
      checkpointId: cp.id,
      checkpointTitle: cp.title,
      checkpointProgress,
      checkpointCriteria: cp.criteria,
      tasksDueToday: dueTasks.length,
      tasksLoggedToday: dueTasks.filter((t) => todayLogMap.has(t.id)).length,
    });

    for (const task of dueTasks) {
      const log = todayLogMap.get(task.id);
      tasks.push({
        taskId: task.id,
        taskTitle: task.title,
        goalId: goal._id.toString(),
        goalTitle: goal.title,
        checkpointId: cp.id,
        checkpointTitle: cp.title,
        durationMin: task.durationMin,
        frequency: task.frequency,
        loggedToday: log?.status as LogStatus | undefined,
        logId: log?._id.toString(),
      });
    }
  }

  return { tasks, goals: goalSummaries };
}

export async function getTodayTasks(userId: string): Promise<TodayTask[]> {
  const view = await getTodayView(userId);
  return view.tasks;
}

export async function createLog(
  userId: string,
  data: {
    goalId: string;
    taskId: string;
    checkpointId?: string;
    status: LogStatus;
    note?: string;
  }
) {
  await connectDb();
  const goal = await Goal.findOne({ _id: data.goalId, userId });
  if (!goal) throw new Error("Goal not found");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  let log = await Log.findOne({
    userId,
    goalId: data.goalId,
    taskId: data.taskId,
    loggedAt: { $gte: todayStart, $lte: todayEnd },
  });

  if (log) {
    log.status = data.status;
    log.note = data.note;
    log.loggedAt = new Date();
    await log.save();
  } else {
    log = await Log.create({
      userId,
      goalId: data.goalId,
      taskId: data.taskId,
      checkpointId: data.checkpointId,
      status: data.status,
      note: data.note,
      loggedAt: new Date(),
    });
  }

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const wasInRecovery = goal.inRecoveryMode && goal.recoveryPlan?.accepted;
  const now = new Date();
  const previousBadges = [...(user.badges ?? [])];
  const previousLevel = user.level ?? 1;
  let xpGain = xpForLogStatus(data.status);
  let checkpointCompleted = false;

  if (data.status === "completed" || data.status === "partial") {
    const goalStreak = applySuccessfulLogToStreak(
      {
        current: goal.streak?.current ?? 0,
        longest: goal.streak?.longest ?? 0,
        lastLogAt: goal.streak?.lastLogAt,
        graceDays: goal.streak?.graceDays ?? 1,
        state: goal.streak?.state ?? "active",
      },
      now
    );
    goal.streak.current = goalStreak.current;
    goal.streak.longest = goalStreak.longest;
    goal.streak.lastLogAt = goalStreak.lastLogAt ?? now;
    goal.streak.state = goalStreak.state;
    goal.inRecoveryMode = false;

    if (goal.recoveryPlan) {
      goal.recoveryPlan.accepted = true;
    }

    const userStreak = applySuccessfulLogToStreak(
      {
        current: user.streak?.current ?? 0,
        longest: user.streak?.longest ?? 0,
        lastLogAt: user.streak?.lastLogAt,
        graceDays: user.streak?.graceDays ?? 1,
        state: user.streak?.state ?? "active",
      },
      now
    );
    user.streak.current = userStreak.current;
    user.streak.longest = userStreak.longest;
    user.streak.lastLogAt = userStreak.lastLogAt ?? now;
    user.streak.state = userStreak.state;
  }

  user.xp = (user.xp ?? 0) + xpGain;
  user.level = levelFromXp(user.xp);

  const cp = getActiveCheckpoint(goal.path);
  if (cp) {
    const allLogs = await Log.find({
      userId,
      goalId: goal._id,
      checkpointId: cp.id,
      status: { $in: ["completed", "partial"] },
    });
    const completedIds = new Set(allLogs.map((l) => l.taskId));

    const allTasksDone = cp.tasks.every(
      (t) =>
        completedIds.has(t.id) ||
        (t.id === data.taskId &&
          (data.status === "completed" || data.status === "partial"))
    );

    if (allTasksDone && !cp.completed) {
      cp.completed = true;
      cp.completedAt = new Date().toISOString();
      user.xp += XP.CHECKPOINT;
      user.level = levelFromXp(user.xp);
      xpGain += XP.CHECKPOINT;
      checkpointCompleted = true;
      goal.markModified("path");
    }
  }

  const totalLogs = await Log.countDocuments({ userId });
  const checkpointsCompleted = await Goal.aggregate([
    { $match: { userId: goal.userId } },
    { $unwind: "$path.phases" },
    { $unwind: "$path.phases.checkpoints" },
    { $match: { "path.phases.checkpoints.completed": true } },
    { $count: "total" },
  ]);
  const cpCount = checkpointsCompleted[0]?.total ?? 0;

  const recoveredWithin72h = (() => {
    const missAt =
      user.lastMissAt ??
      (goal.recoveryPlan?.triggeredAt
        ? new Date(goal.recoveryPlan.triggeredAt)
        : null);
    if (!missAt) return false;
    if (data.status !== "completed" && data.status !== "partial") return false;
    return Date.now() - missAt.getTime() < 72 * 60 * 60 * 1000;
  })();

  user.badges = evaluateBadges({
    xp: user.xp,
    level: user.level,
    badges: user.badges ?? [],
    streakCurrent: user.streak.current ?? 0,
    totalLogs,
    checkpointsCompleted: cpCount,
    recoveredWithin72h: !!recoveredWithin72h,
  });

  const badgesEarned = newBadgesEarned(previousBadges, user.badges ?? []);
  const levelUp = (user.level ?? 1) > previousLevel;

  await goal.save();
  await user.save();

  if (
    wasInRecovery &&
    (data.status === "completed" || data.status === "partial")
  ) {
    await trackEvent(userId, "recovery_completed", {
      goalId: data.goalId,
      status: data.status,
    });
  }

  let checkpointProgress = 0;
  if (cp) {
    const progressLogs = await Log.find({
      userId,
      goalId: goal._id,
      checkpointId: cp.id,
      status: { $in: ["completed", "partial"] },
    });
    checkpointProgress = computeCheckpointProgress(
      cp,
      new Set(progressLogs.map((l) => l.taskId))
    );
  }

  return {
    log,
    checkpointProgress,
    checkpointCompleted,
    xpGain,
    levelUp,
    level: user.level ?? 1,
    badgesEarned,
  };
}

export async function getProgressSummary(
  userId: string
): Promise<ProgressSummary> {
  await syncUserStreaks(userId);
  await connectDb();
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const goals = await Goal.find({ userId, status: "active" });
  const xpInfo = xpProgressInLevel(user.xp ?? 0);

  const goalSummaries = await Promise.all(
    goals.map(async (goal) => {
      const cp = getActiveCheckpoint(goal.path);
      let checkpointProgress = 0;
      if (cp) {
        const logs = await Log.find({
          userId,
          goalId: goal._id,
          checkpointId: cp.id,
          status: { $in: ["completed", "partial"] },
        });
        checkpointProgress = computeCheckpointProgress(
          cp,
          new Set(logs.map((l) => l.taskId))
        );
      }
      return {
        id: goal._id.toString(),
        title: goal.title,
        checkpointProgress,
        activeCheckpoint: cp?.title ?? "Complete!",
        streakState: goal.streak?.state ?? "active",
        inRecovery: goal.inRecoveryMode ?? false,
      };
    })
  );

  const latestReview = await WeeklyReviewRecord.findOne({
    userId,
    status: "pending",
  })
    .sort({ createdAt: -1 })
    .populate("goalId");

  let weeklyReview: ProgressSummary["weeklyReview"];
  if (latestReview) {
    const g = latestReview.goalId as unknown as IGoal;
    const goalIdStr = g?._id?.toString() ?? latestReview.goalId.toString();
    const { buildWeeklyReviewContext } = await import("@/lib/reviews/context");
    const context = await buildWeeklyReviewContext(userId, goalIdStr);
    weeklyReview = {
      id: latestReview._id.toString(),
      goalId: goalIdStr,
      goalTitle: g?.title ?? "",
      status: latestReview.status as WeeklyReviewDTO["status"],
      weekStats: context?.stats,
      ...latestReview.review,
    };
  }

  return {
    xp: user.xp ?? 0,
    level: xpInfo.level,
    xpToNextLevel: xpInfo.needed - xpInfo.current,
    xpProgress: xpInfo.percent,
    badges: (user.badges ?? []) as ProgressSummary["badges"],
    streak: {
      current: user.streak?.current ?? 0,
      longest: user.streak?.longest ?? 0,
      state: user.streak?.state ?? "active",
      graceDays: user.streak?.graceDays ?? 1,
    },
    goals: goalSummaries,
    weeklyReview,
  };
}

export async function getRecentLogs(userId: string, days = 14) {
  await connectDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  return Log.find({ userId, loggedAt: { $gte: since } })
    .sort({ loggedAt: -1 })
    .populate("goalId", "title path")
    .limit(200);
}

function resolveTaskMeta(
  goal: IGoal | null,
  taskId: string
): { taskTitle: string; checkpointTitle?: string } {
  if (!goal) return { taskTitle: taskId };

  for (const phase of goal.path.phases) {
    for (const cp of phase.checkpoints) {
      const task = cp.tasks.find((t) => t.id === taskId);
      if (task) {
        return {
          taskTitle: task.title ?? taskId,
          checkpointTitle: cp.title ?? undefined,
        };
      }
    }
  }

  return { taskTitle: taskId };
}

export async function formatLogsForDisplay(
  userId: string,
  days = 14
): Promise<LogEntryDTO[]> {
  const logs = await getRecentLogs(userId, days);

  return logs.map((log) => {
    const populated = log.goalId as unknown as IGoal | null;
    const goalId =
      populated && typeof populated === "object" && "_id" in populated
        ? populated._id.toString()
        : log.goalId.toString();
    const goalTitle =
      populated && typeof populated === "object" && "title" in populated
        ? (populated.title ?? "Goal")
        : "Goal";
    const goalDoc =
      populated && typeof populated === "object" && "path" in populated ? populated : null;
    const { taskTitle, checkpointTitle } = resolveTaskMeta(goalDoc, log.taskId);

    return {
      id: log._id.toString(),
      goalId,
      goalTitle,
      taskId: log.taskId,
      taskTitle,
      checkpointTitle,
      status: log.status as LogStatus,
      note: log.note,
      loggedAt: log.loggedAt.toISOString(),
    };
  });
}

export async function saveChatMessage(
  userId: string,
  role: "user" | "assistant" | "system",
  content: string,
  goalId?: string,
  metadata?: Record<string, unknown>
) {
  await connectDb();
  return ChatMessage.create({
    userId,
    goalId,
    role,
    content,
    metadata,
  });
}

export async function getChatHistory(userId: string, limit = 50) {
  await connectDb();
  return ChatMessage.find({ userId }).sort({ createdAt: -1 }).limit(limit);
}

export async function acceptRecoveryPlan(userId: string, goalId: string) {
  await connectDb();
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal?.recoveryPlan) throw new Error("No recovery plan");

  const plan = goal.recoveryPlan;
  plan.accepted = true;
  goal.inRecoveryMode = true;
  goal.streak.state = "recovering";

  const cp = getActiveCheckpoint(goal.path);
  const mvd = plan.minimumViableDay;

  for (const adj of plan.adjustedTasks ?? []) {
    for (const phase of goal.path.phases) {
      for (const checkpoint of phase.checkpoints) {
        const task = checkpoint.tasks.find((t: { id: string }) => t.id === adj.taskId);
        if (task) {
          task.title = adj.newTitle;
          task.frequency = adj.frequency as "daily" | "weekly" | "custom";
          task.durationMin = Math.min(task.durationMin, mvd?.durationMin ?? task.durationMin);
          task.isMinimumViable = true;
        }
      }
    }
  }

  if (cp && mvd && (plan.adjustedTasks?.length ?? 0) === 0) {
    const fallbackTask =
      cp.tasks.find((t) => t.frequency === "daily") ?? cp.tasks[0];
    if (fallbackTask) {
      fallbackTask.title = mvd.taskTitle;
      fallbackTask.durationMin = mvd.durationMin;
      fallbackTask.isMinimumViable = true;
    }
  }

  if (plan.newDeadline && cp) {
    cp.dueDate = plan.newDeadline;
  } else if (plan.checkpointExtensionDays > 0 && cp?.dueDate) {
    const d = new Date(cp.dueDate);
    d.setDate(d.getDate() + plan.checkpointExtensionDays);
    cp.dueDate = d.toISOString();
    plan.newDeadline = cp.dueDate;
  }

  goal.pathVersion = (goal.pathVersion ?? 1) + 1;
  goal.markModified("path");
  goal.markModified("recoveryPlan");

  const user = await User.findById(userId);
  if (user) {
    user.xp = (user.xp ?? 0) + XP.RECOVERY_RESTART;
    user.level = levelFromXp(user.xp);
    user.lastRecoveryAt = new Date();
    user.streak.state = "recovering";
    await user.save();
  }

  await goal.save();

  await trackEvent(userId, "recovery_accepted", { goalId });

  await saveChatMessage(
    userId,
    "assistant",
    `Recovery plan accepted. Start with "${mvd?.taskTitle ?? "your minimum step"}" today — you've got this.`,
    goalId,
    { type: "recovery_accepted", goalId }
  );

  return goal;
}

export async function applyWeeklyReviewAdjustment(
  userId: string,
  reviewId: string,
  accept: boolean
) {
  await connectDb();
  const review = await WeeklyReviewRecord.findOne({ _id: reviewId, userId });
  if (!review) throw new Error("Review not found");

  review.status = accept ? "accepted" : "rejected";
  await review.save();

  const goal = await Goal.findById(review.goalId);
  const goalTitle = goal?.title ?? "your goal";

  if (!accept) {
    await trackEvent(userId, "weekly_review_rejected", {
      reviewId,
      goalId: review.goalId.toString(),
    });
    await saveChatMessage(
      userId,
      "assistant",
      `Got it — keeping your current plan for "${goalTitle}". You can adjust anytime from Progress.`,
      review.goalId.toString(),
      { type: "weekly_review_dismissed", reviewId, goalId: review.goalId.toString() }
    );
    return review;
  }

  if (!goal) return review;

  const { suggestion } = review.review;
  const cp = getActiveCheckpoint(goal.path);
  if (!cp) return review;

  if (suggestion.type === "extend" && cp.dueDate) {
    const days = suggestion.extendDays ?? 7;
    const d = new Date(cp.dueDate);
    d.setDate(d.getDate() + days);
    cp.dueDate = d.toISOString();
  }

  if (suggestion.type === "resize" && suggestion.taskId) {
    const task = cp.tasks.find((t: { id: string }) => t.id === suggestion.taskId);
    if (task) task.durationMin = Math.max(10, Math.floor(task.durationMin * 0.7));
  }

  if (suggestion.type === "remove" && suggestion.taskId) {
    cp.tasks = cp.tasks.filter((t: { id: string }) => t.id !== suggestion.taskId);
  }

  if (suggestion.type === "add") {
    cp.tasks.push({
      id: nanoid(),
      title: suggestion.description.slice(0, 80),
      frequency: "daily",
      durationMin: 15,
      isMinimumViable: true,
    });
  }

  goal.pathVersion = (goal.pathVersion ?? 1) + 1;
  goal.markModified("path");
  await goal.save();

  await trackEvent(userId, "weekly_review_accepted", {
    reviewId,
    goalId: goal._id.toString(),
    suggestionType: suggestion.type,
    pathVersion: goal.pathVersion,
  });

  await saveChatMessage(
    userId,
    "assistant",
    `Applied your weekly tweak for "${goalTitle}": ${suggestion.description} (plan v${goal.pathVersion}).`,
    goal._id.toString(),
    {
      type: "weekly_review_accepted",
      reviewId,
      goalId: goal._id.toString(),
      pathVersion: goal.pathVersion,
    }
  );

  return review;
}

export { detectMissedUsers } from "@/lib/recovery/miss-detection";
