"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/arc/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PathPreview } from "@/components/goals/path-preview";
import { RecoveryPlanCard } from "@/components/recovery/recovery-plan-card";
import { StandardPageSkeleton } from "@/components/arc/skeleton-ui";
import { InlineAlert } from "@/components/arc/inline-alert";
import { useToast } from "@/components/arc/toast";
import type { Path, RecoveryPlan } from "@/types";

export default function GoalPlanPage() {
  const params = useParams();
  const id = params.id as string;
  const { toast } = useToast();
  const [goal, setGoal] = useState<{
    title: string;
    path: Path;
    checkpointProgress: number;
    activeCheckpoint?: { title: string };
    inRecoveryMode?: boolean;
    recoveryPlan?: RecoveryPlan;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/goals/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGoal(data.goal);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load goal");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function triggerRecovery() {
    setError(null);
    const res = await fetch("/api/ai/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId: id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not generate recovery plan");
      return;
    }
    toast({ variant: "success", message: "Recovery plan ready." });
    await load();
  }

  async function acceptRecovery(goalId: string) {
    const res = await fetch("/api/ai/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalId, accept: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      throw new Error(data.error);
    }
    toast({
      variant: "success",
      message: "+25 XP · Plan applied to your tasks.",
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
      setError(data.error);
      throw new Error(data.error);
    }
    toast({ variant: "success", message: "Plan adjusted." });
    await load();
  }

  async function simulateMiss() {
    setSimulating(true);
    setError(null);
    try {
      const res = await fetch("/api/recovery/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ variant: "info", message: data.message });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Simulation failed");
    } finally {
      setSimulating(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader label="Plan" title="Loading…" />
        <StandardPageSkeleton cards={2} />
      </>
    );
  }

  if (!goal) {
    return (
      <>
        <PageHeader label="Plan" title="Goal not found" />
        <InlineAlert variant="error">{error ?? "This goal could not be loaded."}</InlineAlert>
      </>
    );
  }

  return (
    <>
      <PageHeader label="Plan" title={goal.title} />

      {error ? <InlineAlert variant="error" className="mb-4">{error}</InlineAlert> : null}

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Active checkpoint</CardTitle>
            <p className="text-sm text-muted">{goal.activeCheckpoint?.title}</p>
          </CardHeader>
          <CardContent>
            <Progress value={goal.checkpointProgress} />
            <p className="mt-2 text-xs text-muted">{goal.checkpointProgress}% complete</p>
          </CardContent>
        </Card>

        {goal.inRecoveryMode && goal.recoveryPlan ? (
          <RecoveryPlanCard
            plan={goal.recoveryPlan}
            goalId={id}
            goalTitle={goal.title}
            accepted={goal.recoveryPlan.accepted}
            onAccept={acceptRecovery}
            onAdjust={adjustRecovery}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={triggerRecovery}>
              Generate recovery plan
            </Button>
            {process.env.NODE_ENV !== "production" ? (
              <Button variant="ghost" onClick={simulateMiss} disabled={simulating}>
                {simulating ? "Simulating…" : "Simulate 3-day miss (dev)"}
              </Button>
            ) : null}
          </div>
        )}

        <PathPreview path={goal.path} />
      </div>
    </>
  );
}
