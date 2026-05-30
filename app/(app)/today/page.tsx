"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/arc/page-header";
import { TaskList } from "@/components/dashboard/task-list";
import { LogHistory } from "@/components/dashboard/log-history";
import { GamificationPanel } from "@/components/gamification/gamification-panel";
import { RecoveryBanner } from "@/components/arc/recovery-banner";
import { StandardPageSkeleton } from "@/components/arc/skeleton-ui";
import { useToast } from "@/components/arc/toast";
import { useGoals } from "@/lib/hooks/use-callback-data";
import type { LogEntryDTO, LogStatus, ProgressSummary, TodayGoalSummary, TodayTask } from "@/types";
import { OfflineBanner } from "@/components/arc/offline-banner";
import { useOnlineStatus } from "@/components/pwa-register";
import { loadTodayCache, saveTodayCache } from "@/lib/offline/today-cache";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function TodayPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [goals, setGoals] = useState<TodayGoalSummary[]>([]);
  const [history, setHistory] = useState<LogEntryDTO[]>([]);
  const [stats, setStats] = useState<Pick<
    ProgressSummary,
    "xp" | "level" | "xpProgress" | "xpToNextLevel" | "streak"
  > | null>(null);
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [offlineCachedAt, setOfflineCachedAt] = useState<string | null>(null);
  const online = useOnlineStatus();
  const { recoveringGoal, refresh: refreshGoals } = useGoals();

  const load = useCallback(async () => {
    try {
      const [todayRes, progressRes, logsRes] = await Promise.all([
        fetch("/api/tasks/today"),
        fetch("/api/progress"),
        fetch("/api/logs?days=14"),
      ]);
      const todayData = await todayRes.json();
      const progressData = await progressRes.json();
      const logsData = await logsRes.json();

      if (!todayRes.ok) throw new Error(todayData.error);

      setTasks(todayData.tasks ?? []);
      setGoals(todayData.goals ?? []);
      setHistory(logsData.logs ?? []);
      if (progressData.progress) {
        setStats({
          xp: progressData.progress.xp,
          level: progressData.progress.level,
          xpProgress: progressData.progress.xpProgress,
          xpToNextLevel: progressData.progress.xpToNextLevel,
          streak: progressData.progress.streak,
        });
      }
      saveTodayCache({
        tasks: todayData.tasks ?? [],
        goals: todayData.goals ?? [],
        history: logsData.logs ?? [],
        stats: progressData.progress
          ? {
              xp: progressData.progress.xp,
              level: progressData.progress.level,
              xpProgress: progressData.progress.xpProgress,
              xpToNextLevel: progressData.progress.xpToNextLevel,
              streak: progressData.progress.streak,
            }
          : null,
      });
      setOfflineCachedAt(null);
      await refreshGoals();
    } catch (e) {
      const cached = loadTodayCache();
      if (cached) {
        setTasks(cached.tasks);
        setGoals(cached.goals);
        setHistory(cached.history);
        setStats(cached.stats);
        setOfflineCachedAt(cached.cachedAt);
        return;
      }
      toast({
        variant: "error",
        message: e instanceof Error ? e.message : "Failed to load tasks",
      });
    } finally {
      setLoading(false);
      setHistoryLoading(false);
    }
  }, [refreshGoals, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLog(task: TodayTask, status: LogStatus) {
    if (!online) {
      toast({
        variant: "error",
        message: "You're offline. Reconnect to log tasks.",
      });
      return;
    }

    setLoadingTaskId(task.taskId);

    setTasks((current) =>
      current.map((t) =>
        t.taskId === task.taskId ? { ...t, loggedToday: status } : t
      )
    );

    try {
      const res = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalId: task.goalId,
          taskId: task.taskId,
          checkpointId: task.checkpointId,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const [todayRes, progressRes, logsRes] = await Promise.all([
        fetch("/api/tasks/today"),
        fetch("/api/progress"),
        fetch("/api/logs?days=14"),
      ]);
      const todayData = await todayRes.json();
      const progressData = await progressRes.json();
      const logsData = await logsRes.json();

      if (todayRes.ok) {
        setTasks(todayData.tasks ?? []);
        setGoals(todayData.goals ?? []);
      }
      if (progressData.progress) {
        setStats({
          xp: progressData.progress.xp,
          level: progressData.progress.level,
          xpProgress: progressData.progress.xpProgress,
          xpToNextLevel: progressData.progress.xpToNextLevel,
          streak: progressData.progress.streak,
        });
      }
      setHistory(logsData.logs ?? []);

      let message = "Task skipped for today.";
      if (status === "completed") message = `+${data.xpGain ?? 10} XP · Task complete`;
      if (status === "partial") message = `+${data.xpGain ?? 5} XP · Partial saved`;
      if (data.checkpointCompleted) message = `Checkpoint complete! +${data.xpGain} XP total`;
      if (data.levelUp) message += " · Level up!";
      if (data.badgesEarned?.length) {
        message += ` · Badge: ${data.badgesEarned.map((b: { name: string }) => b.name).join(", ")}`;
      }

      toast({
        variant:
          status === "completed" || data.checkpointCompleted || data.levelUp
            ? "success"
            : "info",
        message,
      });
    } catch (e) {
      setTasks((current) =>
        current.map((t) =>
          t.taskId === task.taskId ? { ...t, loggedToday: task.loggedToday } : t
        )
      );
      toast({
        variant: "error",
        message: e instanceof Error ? e.message : "Failed to log task",
      });
    } finally {
      setLoadingTaskId(null);
    }
  }

  async function acceptRecovery(goalId: string) {
    const res = await fetch("/api/ai/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, accept: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ variant: "error", message: data.error ?? "Could not accept plan." });
      return;
    }
    toast({
      variant: "success",
      message: "+25 XP · Recovery plan accepted. Start with your minimum step today.",
    });
    await load();
  }

  async function adjustRecovery(goalId: string, userNote: string) {
    const res = await fetch("/api/ai/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, adjust: true, userNote }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ variant: "error", message: data.error ?? "Could not adjust plan." });
      return;
    }
    toast({ variant: "success", message: "Plan adjusted — check the updated steps." });
    await load();
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          label="Daily"
          title="Today"
          description="Quick-log your tasks. Every check-in earns XP."
        />
        <Button size="sm" variant="ghost" onClick={load} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {stats ? (
        <div className="mt-4">
          <GamificationPanel
            level={stats.level}
            xp={stats.xp}
            xpProgress={stats.xpProgress}
            xpToNextLevel={stats.xpToNextLevel}
            streak={stats.streak}
            compact
          />
        </div>
      ) : null}

      {!online || offlineCachedAt ? (
        <div className="mt-4">
          <OfflineBanner cachedAt={offlineCachedAt ?? undefined} />
        </div>
      ) : null}

      {recoveringGoal ? (
        <div className="mt-4">
          <RecoveryBanner
            goalId={recoveringGoal.id}
            goalTitle={recoveringGoal.title}
            message={recoveringGoal.recoveryPlan?.empathyMessage}
            plan={recoveringGoal.recoveryPlan}
            accepted={recoveringGoal.recoveryPlan?.accepted}
            onAccept={acceptRecovery}
            onAdjust={adjustRecovery}
          />
        </div>
      ) : null}

      <div className="mt-4 space-y-6">
        {loading ? (
          <StandardPageSkeleton cards={2} />
        ) : (
          <TaskList
            tasks={tasks}
            goals={goals}
            onLog={handleLog}
            loadingTaskId={loadingTaskId}
          />
        )}

        <LogHistory logs={history} loading={historyLoading && loading} />
      </div>
    </>
  );
}
