"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "Set your goal",
    body: "Describe what you want in your own words, or pick a proven template path.",
    cta: { label: "Browse templates", href: "/goals/new" },
  },
  {
    title: "Log daily tasks",
    body: "Use Today for one-tap logging. Every check-in earns XP and keeps your streak alive.",
    cta: { label: "Open Today", href: "/today" },
  },
  {
    title: "Recover when you miss",
    body: "Life happens. ComeBack.ai builds a lighter catch-up plan — no guilt, just momentum.",
    cta: { label: "Meet your coach", href: "/chat" },
  },
];

export function OnboardingTour({
  onComplete,
}: {
  onComplete: () => void | Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);
  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="presentation"
    >
      <Card
        className="w-full max-w-md border-border-low bg-card shadow-[0_30px_100px_-60px_rgba(0,0,0,0.55)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-body"
      >
        <CardHeader>
          <div className="mb-3 flex gap-2" aria-hidden>
            {steps.map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  index <= step ? "bg-primary" : "bg-border-low"
                )}
              />
            ))}
          </div>
          <CardTitle id="onboarding-title">{current.title}</CardTitle>
          <p id="onboarding-body" className="text-sm text-muted">
            {current.body}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href={current.cta.href}>
            <Button variant="secondary" size="sm" className="w-full sm:w-auto">
              {current.cta.label}
            </Button>
          </Link>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">
              Step {step + 1} of {steps.length}
            </span>
            <div className="flex gap-2">
              {step > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              ) : null}
              <Button
                disabled={completing}
                onClick={async () => {
                  if (!isLast) {
                    setStep(step + 1);
                    return;
                  }
                  setCompleting(true);
                  try {
                    await onComplete();
                  } finally {
                    setCompleting(false);
                  }
                }}
              >
                {completing ? "Finishing…" : isLast ? "Get started" : "Next"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
