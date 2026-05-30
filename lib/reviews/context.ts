import type { IGoal } from "@/lib/db/models";
import { connectDb } from "@/lib/db";
import { Goal, Log } from "@/lib/db/models";
import {
  computeCheckpointProgress,
  flattenTasks,
  getActiveCheckpoint,
  startOfWeek,
} from "@/lib/path-utils";

export type WeekLogEntry = {
  taskId: string;
  taskTitle: string;
  status: string;
  date: string;
  note?: string;
};

export type WeekStats = {
  completed: number;
  partial: number;
  skipped: number;
  failed: number;
  total: number;
  weekStart: string;
  weekEnd: string;
};

export type WeeklyReviewContext = {
  goal: IGoal;
  weekStart: Date;
  weekEnd: Date;
  logEntries: WeekLogEntry[];
  stats: WeekStats;
  checkpointTitle: string;
  checkpointProgress: number;
  activeTasks: Array<{ id: string; title: string; frequency: string; durationMin: number }>;
};

function resolveTaskTitle(goal: IGoal, taskId: string): string {
  for (const phase of goal.path.phases) {
    for (const cp of phase.checkpoints) {
      const task = cp.tasks.find((t) => t.id === taskId);
      if (task) return task.title ?? taskId;
    }
  }
  return taskId;
}

export function getWeekWindow(reference = new Date()) {
  const weekStart = startOfWeek(reference);
  const weekEnd = new Date(reference);
  weekEnd.setHours(23, 59, 59, 999);
  return { weekStart, weekEnd };
}

export async function buildWeeklyReviewContext(
  userId: string,
  goalId: string,
  reference = new Date()
): Promise<WeeklyReviewContext | null> {
  await connectDb();
  const goal = await Goal.findOne({ _id: goalId, userId, status: "active" });
  if (!goal) return null;

  const { weekStart, weekEnd } = getWeekWindow(reference);

  const logs = await Log.find({
    userId,
    goalId: goal._id,
    loggedAt: { $gte: weekStart, $lte: weekEnd },
  }).sort({ loggedAt: 1 });

  const logEntries: WeekLogEntry[] = logs.map((log) => ({
    taskId: log.taskId,
    taskTitle: resolveTaskTitle(goal, log.taskId),
    status: log.status,
    date: log.loggedAt.toISOString(),
    note: log.note ?? undefined,
  }));

  const stats: WeekStats = {
    completed: logs.filter((l) => l.status === "completed").length,
    partial: logs.filter((l) => l.status === "partial").length,
    skipped: logs.filter((l) => l.status === "skipped").length,
    failed: logs.filter((l) => l.status === "failed").length,
    total: logs.length,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
  };

  const cp = getActiveCheckpoint(goal.path);
  const cpLogs = cp
    ? logs.filter((l) => l.checkpointId === cp.id || !l.checkpointId)
    : logs;
  const checkpointProgress = cp
    ? computeCheckpointProgress(
        cp,
        new Set(
          cpLogs
            .filter((l) => l.status === "completed" || l.status === "partial")
            .map((l) => l.taskId)
        )
      )
    : 0;

  const activeTasks = cp
    ? cp.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        frequency: t.frequency,
        durationMin: t.durationMin,
      }))
    : flattenTasks(goal.path).map((t) => ({
        id: t.id,
        title: t.title,
        frequency: t.frequency,
        durationMin: t.durationMin,
      }));

  return {
    goal,
    weekStart,
    weekEnd,
    logEntries,
    stats,
    checkpointTitle: cp?.title ?? "Current checkpoint",
    checkpointProgress,
    activeTasks,
  };
}
