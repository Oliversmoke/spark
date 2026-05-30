"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/arc/page-header";
import { GamificationPanel } from "@/components/gamification/gamification-panel";
import { BadgeGrid } from "@/components/gamification/badge-grid";
import { WeeklyReviewCard } from "@/components/reviews/weekly-review-card";
import { StandardPageSkeleton } from "@/components/arc/skeleton-ui";
import { InlineAlert } from "@/components/arc/inline-alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { LogEntryDTO, ProgressSummary } from "@/types";
import { levelTitle } from "@/lib/gamification";
import { useGoals } from "@/lib/hooks/use-callback-data";
import { useToast } from "@/components/arc/toast";
import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [history, setHistory] = useState<LogEntryDTO[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { goals } = useGoals();
  const { toast } = useToast();

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const [progressRes, logsRes] = await Promise.all([
        fetch("/api/progress"),
        fetch("/api/logs?days=14"),
      ]);
      const progressData = await progressRes.json();
      const logsData = await logsRes.json();
      if (!progressRes.ok) throw new Error(progressData.error);
      setProgress(progressData.progress);
      setHistory(logsData.logs ?? []);
      if (!selectedGoalId && progressData.progress?.goals?.[0]?.id) {
        setSelectedGoalId(progressData.progress.goals[0].id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load progress");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (goals.length > 0 && !selectedGoalId) {
      setSelectedGoalId(goals[0].id);
    }
  }, [goals, selectedGoalId]);

  async function requestReview() {
    const goalId = selectedGoalId || goals[0]?.id || progress?.goals[0]?.id;
    if (!goalId) {
      setError("Create a goal first to generate a weekly review.");
      return;
    }
    setReviewLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.review) {
        setProgress((p) => (p ? { ...p, weeklyReview: data.review } : p));
        toast({ variant: "success", message: "Weekly review ready — check Chat too." });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleReviewDecision(reviewId: string, accept: boolean) {
    const res = await fetch("/api/ai/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId, accept }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ variant: "error", message: data.error ?? "Could not update review." });
      return;
    }
    setProgress((p) => (p ? { ...p, weeklyReview: undefined } : p));
    toast({
      variant: accept ? "success" : "info",
      message: accept
        ? data.pathVersion
          ? `Plan updated to v${data.pathVersion}.`
          : "Weekly tweak applied."
        : "Keeping your current plan.",
    });
    await load();
  }

  const goalOptions = progress?.goals.length ? progress.goals : goals;

  if (loading) {
    return (
      <>
        <PageHeader label="Stats" title="Progress" />
        <StandardPageSkeleton cards={3} />
      </>
    );
  }

  if (!progress) {
    return (
      <>
        <PageHeader label="Stats" title="Progress" />
        <InlineAlert variant="error">{error ?? "Could not load progress"}</InlineAlert>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          label="Stats"
          title="Progress"
          description={`${levelTitle(progress.level)} · XP, streaks, and badges.`}
        />
        <Button size="sm" variant="ghost" onClick={load} aria-label="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {error ? <InlineAlert variant="error" className="mb-4">{error}</InlineAlert> : null}

      <div className="space-y-4">
        <GamificationPanel
          level={progress.level}
          xp={progress.xp}
          xpProgress={progress.xpProgress}
          xpToNextLevel={progress.xpToNextLevel}
          streak={progress.streak}
        />

        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <p className="text-sm text-muted">
              {progress.badges.length} of 5 earned
            </p>
          </CardHeader>
          <CardContent>
            <BadgeGrid badges={progress.badges} />
          </CardContent>
        </Card>

        {progress.goals.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted">
              No active goals yet.{" "}
              <Link href="/goals/new" className="font-semibold underline">
                Create one
              </Link>
            </CardContent>
          </Card>
        ) : (
          progress.goals.map((g) => (
            <Card key={g.id}>
              <CardHeader>
                <CardTitle>{g.title}</CardTitle>
                <p className="text-xs text-muted">{g.activeCheckpoint}</p>
              </CardHeader>
              <CardContent>
                <Progress value={g.checkpointProgress} />
                <p className="mt-2 text-xs text-muted">
                  {g.checkpointProgress}% to next checkpoint · streak{" "}
                  {g.streakState.replace("-", " ")}
                </p>
                {g.inRecovery ? (
                  <p className="mt-2 text-xs font-semibold">Recovery mode active</p>
                ) : null}
                <Link href={`/goals/${g.id}`}>
                  <Button variant="ghost" className="mt-2 h-auto p-0 text-sm font-semibold">
                    View plan →
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Weekly review</CardTitle>
              <Button size="sm" variant="secondary" onClick={requestReview} disabled={reviewLoading}>
                {reviewLoading ? "Generating…" : "Generate"}
              </Button>
            </div>
            {goalOptions.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {goalOptions.map((g) => (
                  <Button
                    key={g.id}
                    size="sm"
                    variant={selectedGoalId === g.id ? "default" : "ghost"}
                    onClick={() => setSelectedGoalId(g.id)}
                  >
                    {g.title}
                  </Button>
                ))}
              </div>
            ) : null}
          </CardHeader>
          {progress.weeklyReview ? (
            <CardContent>
              <WeeklyReviewCard
                review={progress.weeklyReview}
                onApply={(id) => handleReviewDecision(id, true)}
                onDismiss={(id) => handleReviewDecision(id, false)}
              />
            </CardContent>
          ) : (
            <CardContent className="text-sm text-muted">
              Generate a review to get wins, friction points, and a suggested path tweak based on
              your actual logs this week.
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted">No logs yet — start on Today.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {history.slice(0, 10).map((log) => (
                  <li key={log.id} className="flex items-start justify-between gap-3 text-muted">
                    <span>
                      <span className="font-medium text-foreground">{log.taskTitle}</span>
                      <span className="block text-xs">{log.goalTitle}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs capitalize">
                      {log.status}
                      <span className="mt-0.5 block">
                        {new Date(log.loggedAt).toLocaleDateString()}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
