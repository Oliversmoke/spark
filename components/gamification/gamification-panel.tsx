"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { levelTitle } from "@/lib/gamification";
import type { StreakState } from "@/types";

const streakStyles: Record<StreakState, string> = {
  active: "border-border-low bg-card",
  "at-risk": "border-border-strong bg-cream/40",
  broken: "border-border-strong bg-bg1",
  recovering: "border-border-low bg-cream/30",
};

const streakCopy: Record<StreakState, string> = {
  active: "On track",
  "at-risk": "Log today to keep your streak",
  broken: "Streak reset — come back today",
  recovering: "Recovery mode",
};

export function StreakBadge({
  current,
  longest,
  state,
  graceDays,
  compact,
}: {
  current: number;
  longest?: number;
  state: StreakState;
  graceDays?: number;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-col gap-1 rounded border px-3 py-2",
        streakStyles[state]
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span aria-hidden>{state === "at-risk" ? "⚠️" : "🔥"}</span>
        <span>
          {current} day streak
          {!compact && longest !== undefined ? (
            <span className="ml-1 font-normal text-muted">· best {longest}</span>
          ) : null}
        </span>
      </div>
      {!compact ? (
        <p className="text-xs text-muted">
          {streakCopy[state]}
          {graceDays !== undefined ? ` · ${graceDays}-day grace` : ""}
        </p>
      ) : null}
    </div>
  );
}

export function XpBar({
  level,
  xpProgress,
  xp,
  xpToNextLevel,
  compact,
}: {
  level: number;
  xpProgress: number;
  xp: number;
  xpToNextLevel: number;
  compact?: boolean;
}) {
  return (
    <Card>
      <CardContent className={cn("pt-5", compact && "py-4")}>
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <div>
            <span className="font-semibold">Level {level}</span>
            <span className="ml-2 text-muted">{levelTitle(level)}</span>
          </div>
          <span className="text-muted">
            {xp} XP · {xpToNextLevel} to next
          </span>
        </div>
        <Progress value={xpProgress} aria-label="XP progress" />
        {!compact ? (
          <p className="mt-2 text-xs text-muted">
            +10 done · +5 partial · +100 checkpoint · +25 recovery restart
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function GamificationPanel({
  level,
  xp,
  xpProgress,
  xpToNextLevel,
  streak,
  compact,
}: {
  level: number;
  xp: number;
  xpProgress: number;
  xpToNextLevel: number;
  streak: {
    current: number;
    longest: number;
    state: StreakState;
    graceDays: number;
  };
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-3", compact ? "grid-cols-1" : "lg:grid-cols-2")}>
      <XpBar
        level={level}
        xp={xp}
        xpProgress={xpProgress}
        xpToNextLevel={xpToNextLevel}
        compact={compact}
      />
      <StreakBadge
        current={streak.current}
        longest={streak.longest}
        state={streak.state}
        graceDays={streak.graceDays}
        compact={compact}
      />
    </div>
  );
}
