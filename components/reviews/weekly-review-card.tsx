"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WeeklyReviewDTO } from "@/types";
import { Check, Loader2, Sparkles } from "lucide-react";

const suggestionLabels: Record<WeeklyReviewDTO["suggestion"]["type"], string> = {
  add: "Add task",
  remove: "Remove task",
  resize: "Shorten task",
  extend: "Extend deadline",
};

export function WeeklyReviewCard({
  review,
  onApply,
  onDismiss,
  compact,
  resolved,
  className,
}: {
  review: WeeklyReviewDTO;
  onApply?: (reviewId: string) => Promise<void>;
  onDismiss?: (reviewId: string) => Promise<void>;
  compact?: boolean;
  resolved?: boolean;
  className?: string;
}) {
  const [loading, setLoading] = useState<"apply" | "dismiss" | null>(null);
  const isPending = review.status === "pending" && !resolved;

  async function handleApply() {
    if (!onApply) return;
    setLoading("apply");
    try {
      await onApply(review.id);
    } finally {
      setLoading(null);
    }
  }

  async function handleDismiss() {
    if (!onDismiss) return;
    setLoading("dismiss");
    try {
      await onDismiss(review.id);
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
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
              Weekly review · {review.goalTitle}
            </p>
            {review.weekStats ? (
              <p className="mt-1 text-xs text-muted">
                {review.weekStats.completed} completed · {review.weekStats.partial} partial ·{" "}
                {review.weekStats.skipped} skipped · {review.weekStats.total} logs this week
              </p>
            ) : null}
          </div>

          <div>
            <p className="font-semibold">Wins</p>
            <ul className="mt-1 list-inside list-disc text-muted">
              {review.wins.map((win, i) => (
                <li key={i}>{win}</li>
              ))}
            </ul>
          </div>

          {!compact ? (
            <div>
              <p className="font-semibold">Friction</p>
              <ul className="mt-1 list-inside list-disc text-muted">
                {review.friction.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded border border-border-low bg-card p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Suggested tweak · {suggestionLabels[review.suggestion.type]}
            </p>
            <p className="mt-1">{review.suggestion.description}</p>
            {review.suggestion.type === "extend" && review.suggestion.extendDays ? (
              <p className="mt-1 text-xs text-muted">
                Extends checkpoint by {review.suggestion.extendDays} days
              </p>
            ) : null}
          </div>

          <p className="italic text-muted">{review.encouragement}</p>

          {review.status === "accepted" || resolved === true ? (
            <p className="inline-flex items-center gap-1 font-semibold">
              <Check className="h-4 w-4" aria-hidden />
              Adjustment applied to your plan
            </p>
          ) : review.status === "rejected" ? (
            <p className="text-muted">Dismissed — plan unchanged</p>
          ) : isPending && (onApply || onDismiss) ? (
            <div className="flex flex-wrap gap-2">
              {onApply ? (
                <Button size="sm" onClick={handleApply} disabled={loading !== null}>
                  {loading === "apply" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Apply tweak
                </Button>
              ) : null}
              {onDismiss ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  disabled={loading !== null}
                >
                  {loading === "dismiss" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Keep current plan
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
