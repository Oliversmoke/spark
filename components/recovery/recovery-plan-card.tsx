"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { RecoveryPlan } from "@/types";
import { Check, Loader2, Sparkles } from "lucide-react";

export function RecoveryPlanCard({
  plan,
  goalId,
  goalTitle,
  accepted,
  onAccept,
  onAdjust,
  compact,
  className,
}: {
  plan: RecoveryPlan;
  goalId?: string;
  goalTitle?: string;
  accepted?: boolean;
  onAccept?: (goalId: string) => Promise<void>;
  onAdjust?: (goalId: string, userNote: string) => Promise<void>;
  compact?: boolean;
  className?: string;
}) {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [userNote, setUserNote] = useState("");
  const [loading, setLoading] = useState<"accept" | "adjust" | null>(null);

  async function handleAccept() {
    if (!goalId || !onAccept) return;
    setLoading("accept");
    try {
      await onAccept(goalId);
    } finally {
      setLoading(null);
    }
  }

  async function handleAdjust() {
    if (!goalId || !onAdjust || !userNote.trim()) return;
    setLoading("adjust");
    try {
      await onAdjust(goalId, userNote.trim());
      setAdjustOpen(false);
      setUserNote("");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className={cn(
        "rounded border border-border-low bg-cream/30 p-4 text-sm",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          {goalTitle ? (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Recovery · {goalTitle}
            </p>
          ) : null}

          <p className="leading-relaxed">{plan.empathyMessage}</p>

          {plan.reason ? (
            <p className="text-muted">
              <span className="font-semibold text-foreground">Why this helps: </span>
              {plan.reason}
            </p>
          ) : null}

          <div className="rounded border border-border-low bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Minimum viable day
            </p>
            <p className="mt-1 font-semibold">{plan.minimumViableDay.taskTitle}</p>
            <p className="mt-1 text-xs text-muted">
              {plan.minimumViableDay.durationMin} min · {plan.minimumViableDay.instructions}
            </p>
          </div>

          {!compact && plan.adjustedTasks.length > 0 ? (
            <div>
              <p className="font-semibold">Adjusted tasks</p>
              <ul className="mt-2 space-y-1 text-muted">
                {plan.adjustedTasks.map((task) => (
                  <li key={task.taskId} className="flex gap-2">
                    <span aria-hidden>→</span>
                    <span>{task.newTitle}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!compact &&
          (plan.checkpointExtensionDays > 0 || plan.newDeadline) ? (
            <p className="text-xs text-muted">
              Checkpoint extended
              {plan.checkpointExtensionDays > 0
                ? ` by ${plan.checkpointExtensionDays} day${plan.checkpointExtensionDays === 1 ? "" : "s"}`
                : ""}
              {plan.newDeadline
                ? ` · new target ${new Date(plan.newDeadline).toLocaleDateString()}`
                : ""}
            </p>
          ) : null}

          {plan.optionalQuestion && !adjustOpen ? (
            <p className="italic text-muted">{plan.optionalQuestion}</p>
          ) : null}

          {accepted ? (
            <p className="inline-flex items-center gap-1 font-semibold text-foreground">
              <Check className="h-4 w-4" aria-hidden />
              Plan accepted — log your minimum step today
            </p>
          ) : goalId && (onAccept || onAdjust) ? (
            <div className="space-y-3">
              {adjustOpen ? (
                <div className="space-y-2">
                  <Textarea
                    value={userNote}
                    onChange={(e) => setUserNote(e.target.value)}
                    placeholder="What got in the way? Travel, work, energy…"
                    rows={2}
                    aria-label="Tell the coach what happened"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={handleAdjust}
                      disabled={loading !== null || !userNote.trim()}
                    >
                      {loading === "adjust" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Send adjustment
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAdjustOpen(false)}
                      disabled={loading !== null}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {onAccept ? (
                    <Button size="sm" onClick={handleAccept} disabled={loading !== null}>
                      {loading === "accept" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Accept plan
                    </Button>
                  ) : null}
                  {onAdjust ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setAdjustOpen(true)}
                      disabled={loading !== null}
                    >
                      Adjust plan
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
