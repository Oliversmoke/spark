import type { LogEntryDTO, ProgressSummary, TodayGoalSummary, TodayTask } from "@/types";

const CACHE_KEY = "comeback-today-view-v1";

export type TodayCachePayload = {
  tasks: TodayTask[];
  goals: TodayGoalSummary[];
  history: LogEntryDTO[];
  stats: Pick<
    ProgressSummary,
    "xp" | "level" | "xpProgress" | "xpToNextLevel" | "streak"
  > | null;
  cachedAt: string;
};

export function saveTodayCache(payload: Omit<TodayCachePayload, "cachedAt">) {
  if (typeof window === "undefined") return;
  try {
    const data: TodayCachePayload = {
      ...payload,
      cachedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable
  }
}

export function loadTodayCache(): TodayCachePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TodayCachePayload;
  } catch {
    return null;
  }
}

export function clearTodayCache() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
}
