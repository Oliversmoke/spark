import { nanoid } from "@/lib/db/ids";
import type { LogStatus, Path, Phase, Checkpoint, Task } from "@/types";

export { nanoid };

export function assignPathIds(path: Omit<Path, never>): Path {
  return {
    ...path,
    phases: path.phases.map((phase) => ({
      ...phase,
      id: phase.id || nanoid(),
      checkpoints: phase.checkpoints.map((cp) => ({
        ...cp,
        id: cp.id || nanoid(),
        completed: cp.completed ?? false,
        dueDate: cp.dueDate ?? computeDueDate(cp.dueInDays),
        tasks: cp.tasks.map((task) => ({
          ...task,
          id: task.id || nanoid(),
        })),
      })),
    })),
  };
}

function computeDueDate(dueInDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dueInDays);
  return d.toISOString();
}

export function startOfWeek(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfDay(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getActiveCheckpoint(path: Path): Checkpoint | null {
  for (const phase of path.phases) {
    for (const cp of phase.checkpoints) {
      if (!cp.completed) return cp;
    }
  }
  return null;
}

export function getActivePhase(path: Path): Phase | null {
  for (const phase of path.phases) {
    if (phase.checkpoints.some((cp) => !cp.completed)) return phase;
  }
  return null;
}

export function isWeeklyTaskDue(
  referenceDate = new Date(),
  weeklyEntry?: { status: LogStatus; loggedAt: Date }
) {
  if (!weeklyEntry) return true;
  if (weeklyEntry.status === "completed" || weeklyEntry.status === "partial") {
    return false;
  }
  if (weeklyEntry.status === "skipped") {
    return (
      startOfDay(weeklyEntry.loggedAt).getTime() === startOfDay(referenceDate).getTime()
    );
  }
  return true;
}

export function getTasksForToday(
  path: Path,
  referenceDate = new Date(),
  weeklyLogStatus = new Map<string, { status: LogStatus; loggedAt: Date }>()
): Task[] {
  const cp = getActiveCheckpoint(path);
  if (!cp) return [];

  return cp.tasks.filter((task) => {
    if (task.frequency === "daily") return true;
    if (task.frequency === "weekly") {
      return isWeeklyTaskDue(referenceDate, weeklyLogStatus.get(task.id));
    }
    return true;
  });
}

export function flattenTasks(path: Path): Array<Task & { checkpointId: string }> {
  const tasks: Array<Task & { checkpointId: string }> = [];
  for (const phase of path.phases) {
    for (const cp of phase.checkpoints) {
      for (const task of cp.tasks) {
        tasks.push({ ...task, checkpointId: cp.id });
      }
    }
  }
  return tasks;
}

export function computeCheckpointProgress(
  checkpoint: Checkpoint,
  completedTaskIds: Set<string>
): number {
  if (checkpoint.tasks.length === 0) return 0;
  const done = checkpoint.tasks.filter((t) => completedTaskIds.has(t.id)).length;
  return Math.round((done / checkpoint.tasks.length) * 100);
}

export function isCheckpointCriteriaMet(
  checkpoint: Checkpoint,
  completedTaskIds: Set<string>
) {
  const progress = computeCheckpointProgress(checkpoint, completedTaskIds);
  return progress >= 100;
}
