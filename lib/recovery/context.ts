import type { IGoal } from "@/lib/db/models";
import { daysSinceLastLog } from "@/lib/gamification";
import { getActiveCheckpoint, getTasksForToday } from "@/lib/path-utils";

export type RecoveryContext = {
  goalTitle: string;
  missedTasks: Array<{ id: string; title: string }>;
  daysSilent: number;
  streakState: string;
  streakCurrent: number;
  nextCheckpoint: string;
  daysRemaining: number;
  userNote?: string;
};

export function buildRecoveryContext(
  goal: IGoal,
  userNote?: string
): RecoveryContext {
  const cp = getActiveCheckpoint(goal.path);
  const tasks = getTasksForToday(goal.path);
  const lastLogAt = goal.streak?.lastLogAt ?? null;
  const daysSilent =
    lastLogAt != null
      ? daysSinceLastLog(lastLogAt)
      : Number.POSITIVE_INFINITY;

  const daysRemaining = cp?.dueDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(cp.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      )
    : 14;

  return {
    goalTitle: goal.title,
    missedTasks: tasks.map((t) => ({ id: t.id, title: t.title })),
    daysSilent: Number.isFinite(daysSilent) ? daysSilent : 7,
    streakState: goal.streak?.state ?? "broken",
    streakCurrent: goal.streak?.current ?? 0,
    nextCheckpoint: cp?.title ?? "Next milestone",
    daysRemaining,
    userNote,
  };
}
