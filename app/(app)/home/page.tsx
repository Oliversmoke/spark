"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  MessageCircle,
  Plus,
  TrendingUp,
  Settings,
  Target,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth/client";
import { GamificationPanel } from "@/components/gamification/gamification-panel";
import { StandardPageSkeleton } from "@/components/arc/skeleton-ui";
import { RecoveryBanner } from "@/components/arc/recovery-banner";
import { useGoals } from "@/lib/hooks/use-callback-data";
import type { StreakState } from "@/types";
import { cn } from "@/lib/utils";

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const quickActions = [
  {
    href: "/today",
    label: "Today",
    description: "Log tasks",
    Icon: CalendarCheck,
    accent: "bg-primary/10 text-primary",
  },
  {
    href: "/chat",
    label: "Coach",
    description: "Chat & goals",
    Icon: MessageCircle,
    accent: "bg-primary/10 text-primary",
  },
  {
    href: "/goals/new",
    label: "New goal",
    description: "Start a path",
    Icon: Plus,
    accent: "bg-cream text-foreground",
  },
  {
    href: "/progress",
    label: "Progress",
    description: "XP & badges",
    Icon: TrendingUp,
    accent: "bg-cream text-foreground",
  },
  {
    href: "/goals/new",
    label: "Templates",
    description: "Ready-made paths",
    Icon: Target,
    accent: "bg-cream text-foreground",
  },
  {
    href: "/settings",
    label: "Settings",
    description: "Account & PWA",
    Icon: Settings,
    accent: "bg-cream text-foreground",
  },
] as const;

export default function HomePage() {
  const { user } = useAuth();
  const { recoveringGoal, refresh: refreshGoals } = useGoals();
  const [loading, setLoading] = useState(true);
  const [tasksLeft, setTasksLeft] = useState(0);
  const [stats, setStats] = useState<{
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
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const [todayRes, progressRes] = await Promise.all([
        fetch("/api/tasks/today"),
        fetch("/api/progress"),
      ]);
      const todayData = await todayRes.json();
      const progressData = await progressRes.json();

      if (todayRes.ok) {
        const tasks = todayData.tasks ?? [];
        setTasksLeft(
          tasks.filter((t: { loggedToday?: string }) => !t.loggedToday).length
        );
      }

      if (progressRes.ok && progressData.progress) {
        const p = progressData.progress;
        setStats({
          level: p.level,
          xp: p.xp,
          xpProgress: p.xpProgress,
          xpToNextLevel: p.xpToNextLevel,
          streak: p.streak,
        });
      }
      await refreshGoals();
    } catch {
      /* keep partial UI */
    } finally {
      setLoading(false);
    }
  }, [refreshGoals]);

  useEffect(() => {
    load();
  }, [load]);

  const displayName = user?.name?.trim()?.split(/\s+/)[0] ?? "there";

  if (loading) {
    return <StandardPageSkeleton cards={2} />;
  }

  return (
    <div className="space-y-6 pb-2 animate-[arc-fade_280ms_ease-out]">
      <header className="space-y-1 pt-1">
        <p className="text-sm font-medium text-muted">{timeGreeting()}</p>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Hey, {displayName}
        </h1>
        <p className="text-sm text-muted">What do you want to work on?</p>
      </header>

      {recoveringGoal ? (
        <RecoveryBanner
          goalId={recoveringGoal.id}
          goalTitle={recoveringGoal.title}
          message={recoveringGoal.recoveryPlan?.empathyMessage}
          plan={recoveringGoal.recoveryPlan}
          accepted={recoveringGoal.recoveryPlan?.accepted}
        />
      ) : null}

      {stats ? (
        <GamificationPanel
          level={stats.level}
          xp={stats.xp}
          xpProgress={stats.xpProgress}
          xpToNextLevel={stats.xpToNextLevel}
          streak={stats.streak}
          compact
        />
      ) : null}

      {tasksLeft > 0 ? (
        <Link
          href="/today"
          className="flex items-center justify-between gap-3 rounded border border-primary/25 bg-primary/5 px-4 py-3.5 transition active:opacity-90"
        >
          <div>
            <p className="text-sm font-semibold text-primary">
              {tasksLeft} task{tasksLeft === 1 ? "" : "s"} for today
            </p>
            <p className="mt-0.5 text-xs text-muted">Tap to log progress</p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        </Link>
      ) : null}

      <section aria-labelledby="home-quick-actions">
        <h2
          id="home-quick-actions"
          className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted"
        >
          Quick actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quickActions.map(({ href, label, description, Icon, accent }) => (
            <Link
              key={`${href}-${label}`}
              href={href}
              className={cn(
                "flex flex-col gap-3 rounded border border-border-low bg-card p-4 transition",
                "hover:border-primary/30 hover:bg-cream/30 active:opacity-90"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded",
                  accent
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-sm font-semibold leading-tight">{label}</span>
                <span className="mt-0.5 block text-xs text-muted">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
