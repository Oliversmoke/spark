import type { BadgeId, StreakState } from "@/types";

export const XP = {
  TASK_COMPLETE: 10,
  TASK_PARTIAL: 5,
  CHECKPOINT: 100,
  RECOVERY_RESTART: 25,
} as const;

export function xpForLevel(level: number): number {
  return level * level * 50;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) {
    level += 1;
  }
  return level;
}

export function xpProgressInLevel(xp: number): {
  level: number;
  current: number;
  needed: number;
  percent: number;
} {
  const level = levelFromXp(xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const current = xp - currentLevelXp;
  const needed = nextLevelXp - currentLevelXp;
  return {
    level,
    current,
    needed,
    percent: needed > 0 ? Math.round((current / needed) * 100) : 100,
  };
}

export function levelTitle(level: number): string {
  if (level >= 20) return "Legend";
  if (level >= 15) return "Master";
  if (level >= 10) return "Expert";
  if (level >= 5) return "Dedicated";
  if (level >= 3) return "Committed";
  return "Beginner";
}

export type BadgeCheckContext = {
  xp: number;
  level: number;
  badges: string[];
  streakCurrent: number;
  totalLogs: number;
  checkpointsCompleted: number;
  recoveredWithin72h: boolean;
};

export function evaluateBadges(ctx: BadgeCheckContext): BadgeId[] {
  const earned = new Set<string>(ctx.badges);

  if (ctx.totalLogs >= 1) earned.add("first_log");
  if (ctx.streakCurrent >= 7) earned.add("streak_7");
  if (ctx.checkpointsCompleted >= 1) earned.add("first_checkpoint");
  if (ctx.recoveredWithin72h) earned.add("recovery_hero");
  if (ctx.level >= 5) earned.add("level_5");

  return Array.from(earned) as BadgeId[];
}

export function newBadgesEarned(before: string[], after: BadgeId[]): BadgeId[] {
  const prev = new Set(before);
  return after.filter((id) => !prev.has(id));
}

export function startOfDay(referenceDate = new Date()) {
  const d = new Date(referenceDate);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysSinceLastLog(lastLogDate: Date | null, now = new Date()): number {
  if (!lastLogDate) return Number.POSITIVE_INFINITY;
  const last = startOfDay(lastLogDate).getTime();
  const today = startOfDay(now).getTime();
  return Math.round((today - last) / (1000 * 60 * 60 * 24));
}

export function computeStreakState(
  lastLogDate: Date | null,
  graceDays: number,
  inRecovery: boolean
): StreakState {
  if (inRecovery) return "recovering";
  if (!lastLogDate) return "broken";

  const days = daysSinceLastLog(lastLogDate);
  if (days <= 0) return "active";
  if (days <= graceDays) return "at-risk";
  return "broken";
}

export function shouldIncrementStreak(
  lastLogDate: Date | null,
  graceDays: number,
  now = new Date()
): boolean {
  if (!lastLogDate) return true;

  if (lastLogDate.toDateString() === now.toDateString()) {
    return false;
  }

  const days = daysSinceLastLog(lastLogDate, now);
  return days <= graceDays + 1;
}

export function nextStreakCount(
  current: number,
  lastLogDate: Date | null,
  graceDays: number,
  now = new Date()
): number {
  if (!lastLogDate) return 1;
  if (lastLogDate.toDateString() === now.toDateString()) return current;

  const days = daysSinceLastLog(lastLogDate, now);
  if (days > graceDays + 1) return 1;
  if (shouldIncrementStreak(lastLogDate, graceDays, now)) {
    return current + 1;
  }
  return current;
}

export type StreakRecord = {
  current: number;
  longest: number;
  lastLogAt?: Date | null;
  graceDays: number;
  state: StreakState;
};

export function syncStreakRecord(
  streak: StreakRecord,
  inRecovery: boolean
): StreakRecord {
  const previousState = streak.state;
  const nextState = computeStreakState(
    streak.lastLogAt ?? null,
    streak.graceDays ?? 1,
    inRecovery
  );

  let current = streak.current ?? 0;
  if (nextState === "broken" && previousState !== "broken") {
    current = 0;
  }

  const longest = Math.max(streak.longest ?? 0, current);

  return {
    ...streak,
    current,
    longest,
    state: nextState,
    graceDays: streak.graceDays ?? 1,
  };
}

export function applySuccessfulLogToStreak(
  streak: StreakRecord,
  now = new Date()
): StreakRecord {
  const graceDays = streak.graceDays ?? 1;
  const lastLogAt = streak.lastLogAt ?? null;
  const nextCurrent = nextStreakCount(streak.current ?? 0, lastLogAt, graceDays, now);

  return {
    ...streak,
    current: nextCurrent,
    longest: Math.max(streak.longest ?? 0, nextCurrent),
    lastLogAt: now,
    state: "active",
    graceDays,
  };
}

export function xpForLogStatus(status: "completed" | "partial" | "skipped" | "failed") {
  if (status === "completed") return XP.TASK_COMPLETE;
  if (status === "partial") return XP.TASK_PARTIAL;
  return 0;
}
