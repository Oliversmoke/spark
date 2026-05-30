"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, Minus, SkipForward, Loader2 } from "lucide-react";
import type { LogStatus, TodayGoalSummary, TodayTask } from "@/types";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/arc/empty-state";

interface TaskListProps {
  tasks: TodayTask[];
  goals?: TodayGoalSummary[];
  onLog: (task: TodayTask, status: LogStatus) => Promise<void>;
  loadingTaskId?: string | null;
}

export function TaskList({ tasks, goals = [], onLog, loadingTaskId }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No tasks for today"
        description="Create a goal from a template or describe one with AI, then your daily tasks will show up here."
        actionLabel="Create a goal"
        actionHref="/goals/new"
        iconVariant="clipboard"
      />
    );
  }

  const goalMeta = new Map(goals.map((g) => [g.goalId, g]));
  const byGoal = tasks.reduce<Record<string, TodayTask[]>>((acc, t) => {
    (acc[t.goalId] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(byGoal).map(([goalId, goalTasks]) => {
        const meta = goalMeta.get(goalId);
        const loggedCount = goalTasks.filter((t) => t.loggedToday).length;

        return (
          <Card key={goalId}>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle>{goalTasks[0]?.goalTitle}</CardTitle>
                  <p className="text-xs text-muted">{meta?.checkpointTitle ?? goalTasks[0]?.checkpointTitle}</p>
                </div>
                <Link href={`/goals/${goalId}`}>
                  <Button size="sm" variant="ghost" className="h-8 text-xs">
                    View plan
                  </Button>
                </Link>
              </div>

              {meta ? (
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted">
                    <span>Checkpoint progress</span>
                    <span>{meta.checkpointProgress}%</span>
                  </div>
                  <Progress value={meta.checkpointProgress} aria-label="Checkpoint progress" />
                  <p className="mt-1 text-xs text-muted">{meta.checkpointCriteria}</p>
                  <p className="mt-1 text-xs text-muted">
                    {loggedCount}/{goalTasks.length} tasks logged today
                  </p>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {goalTasks.map((task) => (
                <TaskRow
                  key={task.taskId}
                  task={task}
                  onLog={onLog}
                  loading={loadingTaskId === task.taskId}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function TaskRow({
  task,
  onLog,
  loading,
}: {
  task: TodayTask;
  onLog: (task: TodayTask, status: LogStatus) => Promise<void>;
  loading: boolean;
}) {
  const status = task.loggedToday;
  const isDone = status === "completed";

  return (
    <div
      className={cn(
        "rounded border p-3 transition",
        status === "completed" && "border-border-low bg-cream/50",
        status === "partial" && "border-border-low bg-cream/30",
        status === "skipped" && "border-border-low bg-bg1"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={cn("font-semibold", isDone && "text-muted line-through")}>
            {task.taskTitle}
          </p>
          <p className="text-xs text-muted">
            {task.durationMin} min · {task.frequency}
          </p>
        </div>
        {status ? (
          <span className="rounded border border-border-low bg-card px-2 py-0.5 text-xs capitalize">
            {status}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={loading}
          variant={status === "completed" ? "default" : "secondary"}
          onClick={() => onLog(task, "completed")}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Done
        </Button>
        <Button
          size="sm"
          variant={status === "partial" ? "default" : "secondary"}
          disabled={loading}
          onClick={() => onLog(task, "partial")}
        >
          <Minus className="h-4 w-4" />
          Partial
        </Button>
        <Button
          size="sm"
          variant={status === "skipped" ? "default" : "ghost"}
          disabled={loading}
          onClick={() => onLog(task, "skipped")}
        >
          <SkipForward className="h-4 w-4" />
          Skip
        </Button>
      </div>
    </div>
  );
}
