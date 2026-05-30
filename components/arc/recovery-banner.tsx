"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecoveryPlanCard } from "@/components/recovery/recovery-plan-card";
import type { RecoveryPlan } from "@/types";

export function RecoveryBanner({
  goalId,
  goalTitle,
  message,
  plan,
  accepted,
  onAccept,
  onAdjust,
  onDismiss,
}: {
  goalId: string;
  goalTitle: string;
  message?: string;
  plan?: RecoveryPlan;
  accepted?: boolean;
  onAccept?: (goalId: string) => void | Promise<void>;
  onAdjust?: (goalId: string, userNote: string) => void | Promise<void>;
  onDismiss?: () => void;
}) {
  const handleAccept = onAccept
    ? async (id: string) => {
        await onAccept(id);
      }
    : undefined;

  const handleAdjust = onAdjust
    ? async (id: string, note: string) => {
        await onAdjust(id, note);
      }
    : undefined;

  return (
    <Card className="mb-4 border-border-low bg-cream/40">
      <CardContent className="space-y-3 py-4">
        {plan ? (
          <RecoveryPlanCard
            plan={plan}
            goalId={goalId}
            goalTitle={goalTitle}
            accepted={accepted}
            onAccept={handleAccept}
            onAdjust={handleAdjust}
            compact
          />
        ) : (
          <>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Recovery mode
              </p>
              <p className="mt-1 font-semibold">{goalTitle}</p>
              {message ? (
                <p className="mt-1 text-sm text-muted">{message}</p>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  You missed a check-in. Let&apos;s get back on track with a lighter plan.
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {onAccept ? (
                <Button size="sm" onClick={() => onAccept(goalId)}>
                  Accept recovery plan
                </Button>
              ) : null}
              <Link href="/chat">
                <Button size="sm" variant="secondary">
                  Talk to coach
                </Button>
              </Link>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border-low pt-3">
          <Link href={`/goals/${goalId}`}>
            <Button size="sm" variant="ghost">
              View plan
            </Button>
          </Link>
          <Link href="/chat">
            <Button size="sm" variant="ghost">
              Chat
            </Button>
          </Link>
          {onDismiss ? (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
